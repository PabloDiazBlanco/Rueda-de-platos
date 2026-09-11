// ---------- "¿Qué puedo cocinar con lo que tengo?" ----------
// Mismo patrón que analyzeFoodPhoto.js (premium + cuota atómica antes de llamar a Gemini), pero
// con una diferencia de diseño importante: en vez de dejar que Gemini invente ingredientes y
// macros de la nada, se le manda el catálogo de alimentos del propio usuario (id + nombre) y se
// le pide que identifique cuáles de ESOS alimentos concretos reconoce en la foto — así las
// combinaciones que sugiere se pueden guardar directamente como "composicion" de un plato
// cerrado real (ver EditModal en app.jsx), con macros calculadas por composedMacros a partir del
// catálogo, no por la IA. Las especias/condimentos, en cambio, no tienen macros relevantes ni
// existen como alimentos del catálogo — se quedan como texto libre dentro de los pasos, nunca
// como datos estructurados.
//
// Cuota separada de la del lector de fotos (usoCocinar, no usoFotos) — son usos distintos de la
// cuenta premium, no tiene sentido que compartan un único cupo mensual.

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Cuota mensual de sugerencias, aparte de la del lector de fotos. Más baja que las 20 fotos/mes
// porque cada llamada manda el catálogo entero además de la imagen — un poco más cara, y es una
// función más pensada para "de vez en cuando, no sé qué cenar" que para uso diario.
const LIMITE_COCINAR_MES = 10;

// La foto es opcional — se puede usar solo con texto (ver más abajo, en el handler, la
// comprobación de que al menos una de las dos cosas esté presente). Si no hay foto, esta función
// simplemente no se llama y no se añade ninguna parte de imagen al mensaje para Gemini.
function dataUrlAImagePart(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) throw new HttpsError("invalid-argument", "La imagen no tiene un formato reconocible.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function construirPrompt(catalogo, especias, otrosIngredientes, hayFoto) {
  const listaCatalogo = JSON.stringify(catalogo.map((f) => ({ id: f.id, name: f.name })));
  const hayOtros = !!(otrosIngredientes && otrosIngredientes.trim());

  // Cómo se describe la fuente de ingredientes, según qué combinación de foto/texto haya —
  // construido como lista de tareas numeradas dinámicamente, para no tener que llevar la cuenta
  // de los números a mano según qué combinación de datos haya esta vez (con foto, sin foto, con
  // o sin texto adicional...).
  const fuente = hayFoto && hayOtros
    ? "una foto de ingredientes disponibles (nevera, despensa o encimera) y una lista escrita a mano con más ingredientes"
    : hayFoto
    ? "una foto de ingredientes disponibles (nevera, despensa o encimera)"
    : "una lista de ingredientes disponibles, escrita a mano (esta vez sin foto)";

  const tareas = [];
  tareas.push(
    "Identifica cuáles de ESOS alimentos concretos (y solo esos, por su id exacto de la lista) " +
    "reconoces" + (hayFoto && hayOtros ? " en la foto y en el texto" : hayFoto ? " en la foto" : " en el texto") +
    ". Ignora cualquier cosa que veas o se mencione y que no esté en la lista."
  );
  if (hayFoto && hayOtros) {
    tareas.push(
      `El usuario dice tener también esto disponible, escrito a mano (puede que no se vea bien en la ` +
      `foto, o esté en otro sitio): "${otrosIngredientes.trim()}". Trata la foto y este texto como un único ` +
      `conjunto de ingredientes disponibles — si algo aparece en los dos sitios a la vez, cuéntalo solo una vez.`
    );
  } else if (!hayFoto) {
    tareas.push(`Los ingredientes disponibles, tal como los ha escrito el usuario: "${otrosIngredientes.trim()}".`);
  }
  tareas.push(
    "Si reconoces al menos un alimento, sugiere hasta 2 combinaciones de plato distintas, usando " +
    "solo alimentos identificados, con cantidades razonables en gramos."
  );
  tareas.push(
    especias && especias.trim()
      ? `Especias o condimentos que el usuario dice tener disponibles: "${especias.trim()}". Si alguna ` +
        `combina bien con los ingredientes elegidos, menciónala en los pasos — no hace falta usarlas todas.`
      : "El usuario no ha indicado qué especias tiene disponibles — sugiere condimentos habituales " +
        "igualmente si aportan, pero acláralo en los pasos como una sugerencia genérica, no algo que sepas que tiene."
  );

  return (
    `Eres un asistente de cocina. Te paso ${fuente}, y el catálogo de alimentos que el usuario ` +
    "ya tiene fichado en su app, con su id:\n\n" +
    listaCatalogo +
    "\n\nTareas:\n" +
    tareas.map((t, i) => `${i + 1}. ${t}`).join("\n") +
    "\n\nDevuelve ÚNICAMENTE un JSON (sin texto adicional, sin bloques de código) con esta forma exacta:\n" +
    '[{"nombre": string, "composicion": [{"foodId": string, "gramos": number}], "pasos_breves": string}]\n' +
    "Si no reconoces ningún alimento del catálogo, devuelve un array vacío []."
  );
}

async function reservarHuecoDeCuota(uid) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const ref = admin.firestore().doc(`users/${uid}`);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data() || {};

    if (!datos.premium || !datos.premium.active) {
      throw new HttpsError("permission-denied", '"Qué puedo cocinar con lo que tengo" es una función premium.');
    }

    const usoPrevio = datos.usoCocinar && datos.usoCocinar.mes === mesActual ? datos.usoCocinar.contador : 0;
    if (usoPrevio >= LIMITE_COCINAR_MES) {
      throw new HttpsError(
        "resource-exhausted",
        `Has alcanzado el límite de ${LIMITE_COCINAR_MES} sugerencias este mes. Vuelve a intentarlo el mes que viene.`
      );
    }

    tx.set(ref, { usoCocinar: { mes: mesActual, contador: usoPrevio + 1 } }, { merge: true });
  });
}

async function devolverHuecoDeCuota(uid) {
  await admin
    .firestore()
    .doc(`users/${uid}`)
    .update({ "usoCocinar.contador": admin.firestore.FieldValue.increment(-1) })
    .catch((err) => logger.error("No se ha podido devolver el hueco de cuota de suggestMeals tras un fallo", err));
}

exports.suggestMeals = onCall({ secrets: [geminiApiKey], enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión para usar esta función.");
  }

  const uid = request.auth.uid;
  const datos = request.data || {};
  const hayFoto = !!datos.photoDataUrl;
  const hayOtros = !!(datos.otrosIngredientes && datos.otrosIngredientes.trim());
  if (!hayFoto && !hayOtros) {
    throw new HttpsError("invalid-argument", "Manda una foto, escribe qué ingredientes tienes, o ambas cosas.");
  }
  const imagePart = hayFoto ? dataUrlAImagePart(datos.photoDataUrl) : null;
  const catalogo = Array.isArray(datos.catalogo) ? datos.catalogo.filter((f) => f && f.id && f.name) : [];
  if (!catalogo.length) {
    throw new HttpsError("invalid-argument", "Tu catálogo de alimentos está vacío — añade alimentos antes de usar esta función.");
  }

  await reservarHuecoDeCuota(uid);

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  const idsValidos = new Set(catalogo.map((f) => f.id));
  const promptTexto = { text: construirPrompt(catalogo, datos.especias, datos.otrosIngredientes, hayFoto) };
  const contents = imagePart ? [imagePart, promptTexto] : [promptTexto];

  let texto;
  try {
    const respuesta = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: { responseMimeType: "application/json" },
    });
    texto = respuesta.text;
  } catch (err) {
    logger.error("Fallo al contactar con Gemini en suggestMeals", err);
    await devolverHuecoDeCuota(uid);
    throw new HttpsError("unavailable", "No se ha podido contactar con el asistente de cocina. Inténtalo de nuevo.");
  }

  let sugerencias;
  try {
    sugerencias = JSON.parse(texto);
    if (!Array.isArray(sugerencias)) throw new Error("no es un array");
  } catch (err) {
    await devolverHuecoDeCuota(uid);
    throw new HttpsError("internal", "No se ha podido interpretar la respuesta. Inténtalo de nuevo.");
  }

  // No nos fiamos a ciegas de los foodId que devuelve Gemini — se filtra cualquiera que no
  // exista de verdad en el catálogo que mandamos, por si el modelo se equivoca o inventa uno.
  const limpio = sugerencias
    .filter((s) => s && s.nombre && Array.isArray(s.composicion))
    .map((s) => ({
      nombre: String(s.nombre),
      pasos_breves: typeof s.pasos_breves === "string" ? s.pasos_breves : "",
      composicion: s.composicion
        .filter((c) => c && idsValidos.has(c.foodId) && Number(c.gramos) > 0)
        .map((c) => ({ foodId: c.foodId, gramos: Number(c.gramos) })),
    }))
    .filter((s) => s.composicion.length > 0);

  return { sugerencias };
});
