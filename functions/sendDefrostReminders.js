// ---------- Aviso para descongelar: notificación push cada noche (C8, 25-oct-2026) ----------
// Gratis. Cada noche a las 21:30 (hora de España), a quien lo tenga activado en Ajustes («Aviso para
// descongelar», `perfil.avisoDescongelar`), un recordatorio genérico: «revisa las comidas de mañana por si
// tienes que descongelar algo o comprar». Decisión del usuario: **no hace falta leer el menú** (no se sabe qué
// día del ciclo se come cada cosa, y un aviso genérico basta), así que esta función solo lee el perfil.
//
// Desplegada (comprobado con `firebase functions:list` el 29-oct-2026).
//
// Sigue el patrón de sendWeighInReminders.js (mismo token de FCM, mismas reglas de seguridad). La búsqueda
// de cuentas con token se repite aquí en vez de compartirse para no tocar esa función, que ya está desplegada
// y funcionando; si se cambia en una, cámbiala en la otra.
const { onSchedule } = require("firebase-functions/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

const STORAGE_KEY = "rueda-de-platos:data-v1";
const PUSH_TOKEN_KEY = "rueda-de-platos:push-token-v1";

// Textos en el idioma del perfil (como en sendWeighInReminders.js: dos frases fijas no justifican cargar
// logica/i18n.js, que es un módulo del navegador).
const TEXTOS_PUSH = {
  es: { titulo: "¿Algo que descongelar?", cuerpo: "Revisa las comidas de mañana por si tienes que descongelar algo o comprar." },
  en: { titulo: "Anything to defrost?", cuerpo: "Check tomorrow’s meals in case you need to defrost something or buy anything." },
  ca: { titulo: "Res a descongelar?", cuerpo: "Revisa els àpats de demà per si has de descongelar alguna cosa o comprar." },
  gl: { titulo: "Algo que desconxelar?", cuerpo: "Revisa as comidas de mañá por se tes que desconxelar algo ou mercar." },
  eu: { titulo: "Zerbait desizozteko?", cuerpo: "Begiratu biharko otorduak, zerbait desizoztu edo erosi behar baduzu ere." },
};

// Mismo recorrido que sendWeighInReminders.js (ver allí el porqué de leer toda la colectionGroup «keys»).
async function usuariosConToken() {
  const snap = await admin.firestore().collectionGroup("keys").get();
  const candidatos = [];
  snap.forEach((doc) => {
    if (doc.id === PUSH_TOKEN_KEY) candidatos.push({ uid: doc.ref.parent.parent.id, token: doc.data().value });
  });
  return candidatos;
}

exports.sendDefrostReminders = onSchedule(
  // 21:30 en España todo el año (dentro de la franja de 21 a 22 h acordada): la noche antes, con margen
  // para sacar algo del congelador antes de dormir.
  { schedule: "30 21 * * *", timeZone: "Europe/Madrid" },
  async () => {
    let candidatos;
    try {
      candidatos = await usuariosConToken();
    } catch (err) {
      logger.error("Aviso para descongelar: no se ha podido listar las cuentas con notificaciones", err);
      return;
    }

    await Promise.all(
      candidatos.map(async ({ uid, token }) => {
        if (!token) return;
        let perfil;
        try {
          const snap = await admin.firestore().doc(`users/${uid}/keys/${STORAGE_KEY}`).get();
          if (!snap.exists) return;
          perfil = (JSON.parse(snap.data().value) || {}).perfil;
        } catch (err) {
          logger.error(`Aviso para descongelar: no se han podido leer los datos de ${uid}`, err);
          return;
        }
        // Solo a quien lo ha activado: el token de notificaciones puede estar por el recordatorio de pesaje.
        if (!perfil || perfil.avisoDescongelar !== true) return;

        const { titulo, cuerpo } = TEXTOS_PUSH[perfil.idioma] || TEXTOS_PUSH.es;
        try {
          // `data.tag` le dice a sw.js con qué etiqueta mostrarla, para que no sustituya a la del pesaje.
          await admin.messaging().send({ token, notification: { title: titulo, body: cuerpo }, data: { tag: "aviso-descongelar" } });
          logger.info(`${uid}: aviso para descongelar enviado`);
        } catch (err) {
          if (err.code === "messaging/registration-token-not-registered") {
            await admin.firestore().doc(`users/${uid}/keys/${PUSH_TOKEN_KEY}`).delete().catch(() => {});
            logger.info(`${uid}: token caducado o no registrado, se borra`);
          } else {
            logger.error(`Aviso para descongelar: no se ha podido enviar a ${uid}`, err);
          }
        }
      })
    );
  }
);
