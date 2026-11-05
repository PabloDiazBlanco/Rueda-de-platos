// ---------- Recordatorio de pesaje: notificación push diaria (Fase 6) ----------
// Primera Cloud Function programada del proyecto (onSchedule) — hasta ahora todas se disparaban
// por petición (el webhook de Stripe, las funciones callable del cliente). Cada día, a la hora
// fijada, revisa qué cuentas tienen activadas las notificaciones push y, de esas, a quién le toca
// hoy pesarse (misma regla que ya usa la app, ver logica/peso.js → esDiaSugeridoPeso) y todavía no
// lo ha hecho — y les manda el recordatorio por FCM.
//
// Desde noviembre de 2026 (R8) parte de los buzones de avisos (buzonAvisos.js) en vez de leer todos los
// documentos de todas las cuentas, y avisa a todos los aparatos de la lista, no solo al último (R17). Los datos
// de la cuenta (`data-v1`, donde está el seguimiento de peso) solo se abren de quien tiene el recordatorio
// activado: hace falta saber si hoy le toca, si el ciclo está en pausa y si ya se ha pesado.
//
// Por qué esDiaSugeridoPeso se repite aquí en vez de importarse: logica/peso.js es un módulo ESM
// pensado para el navegador (usa bare-specifiers como "i18n" que solo resuelve el importmap de
// index.html) y esta carpeta es un proyecto Node CommonJS aparte, sin bundler ni paso de
// transformación entre los dos mundos (ver CLAUDE.md, "no hay build"). Si cambia la regla de días
// sugeridos en logica/peso.js, hay que replicar el cambio aquí también — son solo dos líneas.
const { onSchedule } = require("firebase-functions/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { buzonesDeAvisos, enviarAlBuzon } = require("./buzonAvisos");

const STORAGE_KEY = "rueda-de-platos:data-v1";

// Copia exacta de logica/peso.js — ver el porqué arriba.
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

// Mensaje del push en el idioma de cada cuenta (el del buzón, copia de `perfil.idioma`). Son solo dos textos
// fijos y muy puntuales — no compensa tirar de todo logica/i18n.js (pensado para el navegador, con 500+
// claves) por esto.
const TEXTOS_PUSH = {
  es: { titulo: "Toca pesarse", cuerpo: "Hoy es uno de tus días de seguimiento de peso en FoodDraft." },
  en: { titulo: "Time to weigh in", cuerpo: "Today is one of your weigh-in days in FoodDraft." },
  ca: { titulo: "Toca pesar-se", cuerpo: "Avui és un dels teus dies de seguiment de pes a FoodDraft." },
  gl: { titulo: "Toca pesarse", cuerpo: "Hoxe é un dos teus días de seguimento de peso en FoodDraft." },
  eu: { titulo: "Pisatzeko eguna", cuerpo: "Gaur FoodDraft aplikazioko zure pisu-jarraipeneko egunetako bat da." },
};

exports.sendWeighInReminders = onSchedule(
  // Una vez al día. Hora local de España (fija todo el año pese al cambio de horario, a
  // diferencia de fijar una hora en UTC): media mañana, un momento razonable para un recordatorio
  // sin resultar molesto a primera hora.
  { schedule: "0 9 * * *", timeZone: "Europe/Madrid" },
  async (evento) => {
    // El día de la ejecución programada (`scheduleTime`, las 9:00 de Madrid en UTC), no el del reloj: si la
    // ejecución se retrasa o Google la reintenta, sigue contando el día que tocaba. Y permite probar la función
    // con cualquier día (functions/pruebas-funciones/). Las funciones corren en UTC, y las 9:00 de Madrid caen
    // siempre en el mismo día en UTC (8:00 en invierno, 7:00 en verano).
    const hoy = evento && evento.scheduleTime ? new Date(evento.scheduleTime) : new Date();
    const hoyISO = fechaISO(hoy);

    // Registro de diagnóstico (añadido el 20-sep-2026, investigando un recordatorio que no llegó): una línea al
    // día con cuántas cuentas tocan y, por cada una, por qué se le manda o se omite. Se queda a propósito: es
    // lo que permite comprobar en el registro de Google Cloud, sin esperar a que alguien se queje, que la
    // función se ejecuta y decide bien (así se comprobó el 5-nov-2026, antes de R8). No incluye ningún dato de
    // salud: solo el uid y el motivo.
    let buzones;
    try {
      buzones = await buzonesDeAvisos();
    } catch (err) {
      logger.error("Recordatorio de pesaje: no se han podido leer los buzones de avisos", err);
      return;
    }
    const candidatos = buzones.filter((b) => b.pesaje && b.tokens.length > 0);
    logger.info(`Recordatorio de pesaje: ${candidatos.length} candidato(s) con el recordatorio activado`);

    await Promise.all(
      candidatos.map(async (buzon) => {
        const { uid } = buzon;
        let datos;
        try {
          const snap = await admin.firestore().doc(`users/${uid}/keys/${STORAGE_KEY}`).get();
          if (!snap.exists) {
            logger.info(`${uid}: sin documento de datos guardado, se omite`);
            return;
          }
          datos = JSON.parse(snap.data().value);
        } catch (err) {
          logger.error(`No se han podido leer los datos de ${uid} para el recordatorio de pesaje`, err);
          return;
        }

        // El buzón es una copia del perfil que pone al día la app. Si alguna vez no coincidieran (un aparato que
        // escribió tarde), manda el perfil: más vale no avisar que avisar a quien lo ha quitado.
        if (datos.perfil && datos.perfil.notificacionesPush === false) {
          logger.info(`${uid}: recordatorio de pesaje desactivado en el perfil, se omite`);
          return;
        }

        const pesoTracking = datos.pesoTracking;
        if (!pesoTracking) {
          logger.info(`${uid}: sin seguimiento de peso configurado, se omite`);
          return;
        }

        // Mientras el ciclo esté pausado (viaje, enfermedad...) no se dispara el recordatorio —
        // mismo criterio que ya aplica la propia app (ver ui/peso/seguimiento.jsx).
        const pausaActiva = (pesoTracking.pausas || []).some((p) => p.fin === null);
        if (pausaActiva) {
          logger.info(`${uid}: ciclo de peso en pausa, se omite`);
          return;
        }

        if (!esDiaSugeridoPeso(pesoTracking.vecesSemana, hoy)) {
          logger.info(`${uid}: hoy no es día sugerido (vecesSemana=${pesoTracking.vecesSemana}), se omite`);
          return;
        }

        const yaRegistradoHoy = (pesoTracking.entradas || []).some((e) => e.fecha === hoyISO);
        if (yaRegistradoHoy) {
          logger.info(`${uid}: ya registrado hoy, se omite`);
          return;
        }

        const { titulo, cuerpo } = TEXTOS_PUSH[buzon.idioma] || TEXTOS_PUSH.es;
        try {
          // Sin etiqueta: sw.js usa «recordatorio-pesaje» por defecto.
          const { enviados } = await enviarAlBuzon(buzon, { titulo, cuerpo });
          logger.info(`${uid}: recordatorio enviado a ${enviados} de ${buzon.tokens.length} aparato(s)`);
        } catch (err) {
          logger.error(`No se ha podido enviar el recordatorio de pesaje a ${uid}`, err);
        }
      })
    );
  }
);
