// ---------- Recordatorio de pesaje: notificación push diaria (Fase 6) ----------
// Primera Cloud Function programada del proyecto (onSchedule) — hasta ahora todas se disparaban
// por petición (el webhook de Stripe, las funciones callable del cliente). Cada día, a la hora
// fijada, revisa qué cuentas tienen activadas las notificaciones push y, de esas, a quién le toca
// hoy pesarse (misma regla que ya usa la app, ver Logica/peso.js → esDiaSugeridoPeso) y todavía no
// lo ha hecho — y les manda el recordatorio por FCM.
//
// Por qué esDiaSugeridoPeso se repite aquí en vez de importarse: Logica/peso.js es un módulo ESM
// pensado para el navegador (usa bare-specifiers como "i18n" que solo resuelve el importmap de
// index.html) y esta carpeta es un proyecto Node CommonJS aparte, sin bundler ni paso de
// transformación entre los dos mundos (ver CLAUDE.md, "no hay build"). Si cambia la regla de días
// sugeridos en Logica/peso.js, hay que replicar el cambio aquí también — son solo dos líneas.
const { onSchedule } = require("firebase-functions/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const STORAGE_KEY = "rueda-de-platos:data-v1";
const PUSH_TOKEN_KEY = "rueda-de-platos:push-token-v1";

// Copia exacta de Logica/peso.js — ver el porqué arriba.
const DIAS_SUGERIDOS_PESO = { 2: [1, 4], 3: [1, 3, 5] };
function esDiaSugeridoPeso(vecesSemana, fecha) {
  const dias = DIAS_SUGERIDOS_PESO[vecesSemana] || DIAS_SUGERIDOS_PESO[3];
  return dias.includes(fecha.getDay());
}
function fechaISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Mensaje del push en el idioma del perfil de cada cuenta. Son solo dos textos fijos y muy
// puntuales — no compensa tirar de todo Logica/i18n.js (pensado para el navegador, con 500+
// claves) por esto.
const TEXTOS_PUSH = {
  es: { titulo: "Toca pesarse", cuerpo: "Hoy es uno de tus días de seguimiento de peso en FoodDraft." },
  en: { titulo: "Time to weigh in", cuerpo: "Today is one of your weigh-in days in FoodDraft." },
  ca: { titulo: "Toca pesar-se", cuerpo: "Avui és un dels teus dies de seguiment de pes a FoodDraft." },
  gl: { titulo: "Toca pesarse", cuerpo: "Hoxe é un dos teus días de seguimento de peso en FoodDraft." },
  eu: { titulo: "Pisatzeko eguna", cuerpo: "Gaur FoodDraft aplikazioko zure pisu-jarraipeneko egunetako bat da." },
};

// Descubre qué cuentas tienen guardado un token de notificaciones. Firestore no deja filtrar una
// collectionGroup por el último tramo del path sin conocer antes el uid de cada una (el id de
// documento en una collectionGroup query se compara como ruta completa, no como el nombre suelto
// "rueda-de-platos:push-token-v1") — así que se recorre toda la colección "keys" de todas las
// cuentas y se filtra aquí, en memoria. Con el volumen de uso de hoy esto es barato (ver la hoja
// de ruta de publicación, Fase 6, apartado de coste); si el proyecto llega a tener muchísimos
// usuarios, convendría mantener un índice propio (por ejemplo, una colección "pushTokens" en la
// raíz que el cliente actualice a la vez que este documento) en vez de este escaneo completo.
async function usuariosConNotificacionesActivas() {
  const snap = await admin.firestore().collectionGroup("keys").get();
  const candidatos = [];
  snap.forEach((doc) => {
    if (doc.id === PUSH_TOKEN_KEY) {
      candidatos.push({ uid: doc.ref.parent.parent.id, token: doc.data().value });
    }
  });
  return candidatos;
}

exports.sendWeighInReminders = onSchedule(
  // Una vez al día. Hora local de España (fija todo el año pese al cambio de horario, a
  // diferencia de fijar una hora en UTC): media mañana, un momento razonable para un recordatorio
  // sin resultar molesto a primera hora.
  { schedule: "0 9 * * *", timeZone: "Europe/Madrid" },
  async () => {
    const hoy = new Date();
    const hoyISO = fechaISO(hoy);
    const candidatos = await usuariosConNotificacionesActivas();

    await Promise.all(
      candidatos.map(async ({ uid, token }) => {
        if (!token) return;

        let datos;
        try {
          const snap = await admin.firestore().doc(`users/${uid}/keys/${STORAGE_KEY}`).get();
          if (!snap.exists) return;
          datos = JSON.parse(snap.data().value);
        } catch (err) {
          logger.error(`No se han podido leer los datos de ${uid} para el recordatorio de pesaje`, err);
          return;
        }

        const pesoTracking = datos.pesoTracking;
        if (!pesoTracking) return;

        // Mientras el ciclo esté pausado (viaje, enfermedad...) no se dispara el recordatorio —
        // mismo criterio que ya aplica la propia app (ver PesoView en app.jsx).
        const pausaActiva = (pesoTracking.pausas || []).some((p) => p.fin === null);
        if (pausaActiva) return;

        if (!esDiaSugeridoPeso(pesoTracking.vecesSemana, hoy)) return;

        const yaRegistradoHoy = (pesoTracking.entradas || []).some((e) => e.fecha === hoyISO);
        if (yaRegistradoHoy) return;

        const idioma = (datos.perfil && datos.perfil.idioma) || "es";
        const { titulo, cuerpo } = TEXTOS_PUSH[idioma] || TEXTOS_PUSH.es;

        try {
          await admin.messaging().send({ token, notification: { title: titulo, body: cuerpo } });
        } catch (err) {
          // El permiso se revocó, se desinstaló la PWA, o el token caducó: se borra para no
          // volver a intentarlo cada día con un token que ya no sirve. Cualquier otro fallo (red,
          // cuota puntual de FCM...) se deja tal cual, para reintentarlo mañana solo.
          if (err.code === "messaging/registration-token-not-registered") {
            await admin.firestore().doc(`users/${uid}/keys/${PUSH_TOKEN_KEY}`).delete().catch(() => {});
          } else {
            logger.error(`No se ha podido enviar el recordatorio de pesaje a ${uid}`, err);
          }
        }
      })
    );
  }
);
