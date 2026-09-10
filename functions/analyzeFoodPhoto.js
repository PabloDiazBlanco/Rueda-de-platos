// ---------- Lector de etiquetas por foto: ahora en el servidor, con cuota mensual real ----------
// Antes esta llamada a Gemini salía directa desde el navegador del usuario (ver el historial de
// auth-bootstrap.jsx) — funcionaba porque solo la usaba una persona. Ahora que puede haber varios
// usuarios y que Gemini ya no es gratis en cuanto el proyecto está en el plan Blaze (ver la hoja
// de ruta de publicación, Fase 2), la llamada tiene que pasar por aquí, donde se puede comprobar
// y limitar el uso ANTES de gastar nada — un límite solo en la interfaz no protege nada, porque
// el cliente podría saltárselo llamando directo a Gemini.
//
// Es una función "callable" (onCall), no un endpoint HTTP a mano: Firebase verifica sola el
// token de sesión de quien llama y nos da su uid ya comprobado en request.auth — no hace falta
// validar nosotros mismos ninguna autenticación.

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Cuántos análisis de foto puede hacer una cuenta premium cada mes. Un solo número aquí — si el
// negocio cambia la cuota más adelante, se toca solo esta línea, no la lógica de la transacción.
const LIMITE_FOTOS_MES = 20;

// Mismo prompt y misma lista de campos que la versión anterior en el cliente — el contrato con
// Gemini no cambia, solo desde dónde se llama.
const FOOD_PHOTO_PROMPT =
  "Eres un asistente que lee etiquetas de información nutricional de productos alimenticios envasados.\n" +
  "Analiza la foto adjunta y devuelve ÚNICAMENTE un JSON (sin texto adicional, sin bloques de código, sin explicaciones) con esta forma exacta:\n" +
  '{"kcal": number|null, "prot": number|null, "fat": number|null, "carb": number|null, "sal": number|null, "azucares": number|null, "fibra": number|null, "grasaSaturada": number|null}\n' +
  "Reglas:\n" +
  "- Todos los valores son por cada 100 g (o 100 ml) de producto, tal como aparezca en la tabla nutricional de la foto.\n" +
  "- \"prot\" = proteínas, \"fat\" = grasas totales, \"carb\" = hidratos de carbono totales, \"grasaSaturada\" = de las cuales saturadas, \"azucares\" = de los cuales azúcares.\n" +
  "- Si la tabla da los valores por ración y no por 100 g, calcula tú el equivalente por 100 g si es posible.\n" +
  "- Si algún dato no aparece con claridad en la foto, o no estás razonablemente seguro de haberlo leído bien, pon null en ese campo. No inventes ni redondees de forma creativa.";

const NUMERIC_FIELDS = ["kcal", "prot", "fat", "carb", "sal", "azucares", "fibra", "grasaSaturada"];

function dataUrlAImagePart(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) throw new HttpsError("invalid-argument", "La imagen no tiene un formato reconocible.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

// Reserva un hueco de la cuota mensual de forma atómica: lee el contador, comprueba que no se ha
// pasado del límite, y lo incrementa — todo dentro de la misma transacción de Firestore. Así, si
// llegan dos peticiones del mismo usuario casi a la vez, no pueden colarse las dos: Firestore
// reintenta sola la transacción que pierde la carrera, en vez de dejar pasar un valor ya viejo.
// Esta es la pieza de toda la Fase 2 que más cuidado pedía tener — ver la hoja de ruta.
async function reservarHuecoDeCuota(uid) {
  const mesActual = new Date().toISOString().slice(0, 7); // "2026-09"
  const ref = admin.firestore().doc(`users/${uid}`);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data() || {};

    if (!datos.premium || !datos.premium.active) {
      throw new HttpsError("permission-denied", "El lector de etiquetas por foto es una función premium.");
    }

    // Si el mes guardado no es el actual, el contador se reinicia a cero aquí mismo — no hace
    // falta ningún proceso aparte que "resetee" contadores al cambiar de mes.
    const usoPrevio = datos.usoFotos && datos.usoFotos.mes === mesActual ? datos.usoFotos.contador : 0;
    if (usoPrevio >= LIMITE_FOTOS_MES) {
      throw new HttpsError(
        "resource-exhausted",
        `Has alcanzado el límite de ${LIMITE_FOTOS_MES} fotos analizadas este mes. Vuelve a intentarlo el mes que viene.`
      );
    }

    tx.set(ref, { usoFotos: { mes: mesActual, contador: usoPrevio + 1 } }, { merge: true });
  });
}

// Best-effort: si Gemini falla después de haber reservado el hueco, se lo devolvemos al usuario
// para no penalizarle por un fallo nuestro o de Gemini. No hace falta que esto sea una
// transacción — como mucho, bajo muchísimos fallos simultáneos, el contador queda un pelín
// impreciso a favor del usuario, nunca en contra ni por encima del límite real (eso ya lo
// garantiza solo la reserva de arriba).
async function devolverHuecoDeCuota(uid) {
  await admin
    .firestore()
    .doc(`users/${uid}`)
    .update({ "usoFotos.contador": admin.firestore.FieldValue.increment(-1) })
    .catch((err) => logger.error("No se ha podido devolver el hueco de cuota tras un fallo de Gemini", err));
}

exports.analyzeFoodPhoto = onCall({ secrets: [geminiApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión para usar esta función.");
  }

  const uid = request.auth.uid;
  // Se valida el formato de la imagen ANTES de reservar cuota — un fallo de formato es un fallo
  // del cliente, no debería costarle un hueco de su cuota mensual a nadie.
  const imagePart = dataUrlAImagePart(request.data && request.data.photoDataUrl);

  await reservarHuecoDeCuota(uid);

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  let texto;
  try {
    const respuesta = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [imagePart, { text: FOOD_PHOTO_PROMPT }],
      config: { responseMimeType: "application/json" },
    });
    texto = respuesta.text;
  } catch (err) {
    logger.error("Fallo al contactar con Gemini", err);
    await devolverHuecoDeCuota(uid);
    throw new HttpsError("unavailable", "No se ha podido contactar con el lector de etiquetas. Inténtalo de nuevo.");
  }

  let parseado;
  try {
    parseado = JSON.parse(texto);
  } catch (err) {
    await devolverHuecoDeCuota(uid);
    throw new HttpsError(
      "internal",
      "La foto no se ha podido interpretar como una tabla nutricional. Prueba con otra imagen más nítida."
    );
  }

  const limpio = {};
  NUMERIC_FIELDS.forEach((campo) => {
    const valor = parseado[campo];
    limpio[campo] = typeof valor === "number" && Number.isFinite(valor) ? valor : null;
  });
  return limpio;
});
