// ---------- Aviso para descongelar: notificación push cada noche (C8, 25-oct-2026) ----------
// Gratis. Cada noche a las 21:30 (hora de España), a quien lo tenga activado en Ajustes («Aviso para
// descongelar», `perfil.avisoDescongelar`), un recordatorio genérico: «revisa las comidas de mañana por si
// tienes que descongelar algo o comprar». Decisión del usuario: **no hace falta leer el menú** (no se sabe qué
// día del ciclo se come cada cosa, y un aviso genérico basta).
//
// Desde noviembre de 2026 (R8) solo lee los buzones de avisos (buzonAvisos.js): el buzón ya trae el interruptor,
// el idioma y los aparatos, así que esta función **no abre ningún dato de la cuenta**. Antes leía todos los
// documentos de todas las cuentas y, de cada una con token, sus datos completos para mirar el perfil. Desde la
// tanda B (M3) pide solo los buzones con este aviso activado, por páginas, y avisa a unas pocas cuentas a la vez
// (recorrerBuzones, en buzonAvisos.js, con el porqué y el plan B si falta el índice).
const { onSchedule } = require("firebase-functions/scheduler");
const logger = require("firebase-functions/logger");
const { recorrerBuzones, enviarAlBuzon } = require("./buzonAvisos");

// Textos en el idioma del buzón (como en sendWeighInReminders.js: dos frases fijas no justifican cargar
// logica/i18n.js, que es un módulo del navegador).
const TEXTOS_PUSH = {
  es: { titulo: "¿Algo que descongelar?", cuerpo: "Revisa las comidas de mañana por si tienes que descongelar algo o comprar." },
  en: { titulo: "Anything to defrost?", cuerpo: "Check tomorrow’s meals in case you need to defrost something or buy anything." },
  ca: { titulo: "Res a descongelar?", cuerpo: "Revisa els àpats de demà per si has de descongelar alguna cosa o comprar." },
  gl: { titulo: "Algo que desconxelar?", cuerpo: "Revisa as comidas de mañá por se tes que desconxelar algo ou mercar." },
  eu: { titulo: "Zerbait desizozteko?", cuerpo: "Begiratu biharko otorduak, zerbait desizoztu edo erosi behar baduzu ere." },
};

exports.sendDefrostReminders = onSchedule(
  {
    // 21:30 en España todo el año (dentro de la franja de 21 a 22 h acordada): la noche antes, con margen
    // para sacar algo del congelador antes de dormir.
    schedule: "30 21 * * *",
    timeZone: "Europe/Madrid",
    // Más margen que el de serie (60 s y 256 MiB) para cuando haya muchas cuentas (tanda B, M3): con 20 envíos a
    // la vez y cada uno de unas décimas de segundo, en 9 minutos caben decenas de miles de buzones. Con muy pocas
    // cuentas termina en un par de segundos y no cuesta más: se paga el tiempo que corre, no el tope. Firebase pone
    // también ese tope como plazo del trabajo de Cloud Scheduler que la lanza (si no, la daría por fallida a los
    // 3 minutos aunque siguiera bien). La memoria, la misma que el recordatorio de pesaje, por simetría: esta
    // función solo tiene una página de buzones en memoria y le sobraría con menos.
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    let avisados;
    try {
      avisados = await recorrerBuzones("descongelar", "Aviso para descongelar", async (buzon) => {
        const { titulo, cuerpo } = TEXTOS_PUSH[buzon.idioma] || TEXTOS_PUSH.es;
        try {
          const { enviados } = await enviarAlBuzon(buzon, { titulo, cuerpo, etiqueta: "aviso-descongelar" });
          logger.info(`${buzon.uid}: aviso para descongelar enviado a ${enviados} de ${buzon.tokens.length} aparato(s)`);
        } catch (err) {
          logger.error(`Aviso para descongelar: no se ha podido enviar a ${buzon.uid}`, err);
        }
      });
    } catch (err) {
      logger.error("Aviso para descongelar: no se han podido leer los buzones de avisos", err);
      return;
    }
    // Una línea al día con cuántas cuentas tocaban, como en el recordatorio de pesaje: así se ve en el registro de
    // Google Cloud que la función se ha ejecutado aunque no haya nadie a quien avisar. Va al final porque, con las
    // páginas, el total no se sabe hasta leer la última.
    logger.info(`Aviso para descongelar: ${avisados} buzón(es) con el aviso activado`);
  }
);
