// ---------- «¿Qué cocino?» con dos modos: recetas (E2, 25-oct-2026) ----------
// Desplegada (comprobado con `firebase functions:list` el 29-oct-2026). La usa la pantalla de «¿Qué cocino?»
// (ui/premium/que-cocino.jsx, vía window.suggestRecipes de auth-bootstrap.jsx): **la función y el cliente
// tienen que desplegarse juntos** (primero `firebase deploy --only functions`, después subir la app); si
// se sube la app sin la función, la pantalla dará error al pedir sugerencias. suggestMeals.js se conserva tal
// cual para las copias de la app que aún no se hayan actualizado.
//
// Qué cambia frente a suggestMeals (decisión del usuario, local/ideas/registro-2026-10-25.md, E2):
// - Dos modos. «conLoQueTengo»: con lo que hay en casa —toda la despensa, además de la foto y del texto, como
//   antes— Gemini elige con **sentido gastronómico**: si hay cinco carbohidratos, varias grasas y proteínas,
//   escoge una combinación coherente (una proteína, un acompañamiento, quizá una verdura), no lo mezcla todo,
//   y puede contar con especias y básicos. «restaurante»: parte de lo que hay y propone **comprar** una a tres
//   cosas más elaboradas (una especia concreta, una salsa, un queso...) para un plato «de restaurante».
// - Devuelve **recetas: ingredientes y pasos, sin macros**. Ya no se limita a alimentos del catálogo: lo que
//   haya que comprar, o un básico, puede no estar en él. Cuando un ingrediente sí es del catálogo o de la
//   despensa, la receta trae su `foodId` (validado aquí contra lo que se mandó) y gramos aproximados, para
//   poder guardarla como plato cerrado; las macros, si se guarda, las calcula la app como siempre.
// - Los dos modos **comparten la cuota** de suggestMeals (`usoCocinar`, 10 al mes, premium): son el mismo
//   servicio de «¿qué cocino?» con dos variantes.
// La cuota se reserva antes de llamar a Gemini y se devuelve si falla (mismo patrón que analyzeFoodPhoto.js);
// el modelo, el mismo que en las otras dos funciones (si Google lo retira, hay que cambiarlo en las tres).

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const LIMITE_COCINAR_MES = 10; // el mismo cupo que suggestMeals: lo comparten
const MAX_RECETAS = 3;
const MAX_DESPENSA = 150;

const IDIOMAS = { es: "español", en: "English", ca: "català", gl: "galego", eu: "euskara" };

function dataUrlAImagePart(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) throw new HttpsError("invalid-argument", "La imagen no tiene un formato reconocible.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

const texto = (x, max = 300) => (typeof x === "string" ? x.trim().slice(0, max) : "");

function construirPrompt({ modo, despensa, catalogo, especias, otrosIngredientes, hayFoto, idioma }) {
  const partes = [];
  partes.push(
    "Eres un cocinero con buen criterio gastronómico. Tu trabajo es proponer recetas reales y coherentes, " +
    "como las haría una persona que cocina bien en casa: un plato con sentido (una proteína principal, un " +
    "acompañamiento, quizá una verdura y una salsa o aliño), nunca una mezcla de todo lo disponible. Si hay " +
    "muchos ingredientes del mismo tipo (por ejemplo cinco carbohidratos o varias proteínas), elige los que " +
    "combinen mejor entre sí y deja el resto."
  );
  partes.push(`Responde en ${IDIOMAS[idioma] || IDIOMAS.es} (los nombres de los platos, ingredientes y pasos).`);
  if (despensa.length) {
    partes.push("Lo que el usuario tiene en casa ahora mismo (despensa, nevera y congelador; cantidades aproximadas):\n" +
      JSON.stringify(despensa.map((d) => ({ id: d.id, nombre: d.nombre, cantidad: d.cantidad }))));
  }
  if (hayFoto) partes.push("Además te paso una foto de ingredientes disponibles: cuéntalos también.");
  if (otrosIngredientes) partes.push(`Además, el usuario dice tener: "${otrosIngredientes}".`);
  partes.push(especias
    ? `Especias y condimentos que tiene: "${especias}". Úsalos si encajan; no hace falta usarlos todos.`
    : "Puedes contar con sal, aceite de oliva, pimienta y agua; otras especias, solo como sugerencia opcional.");
  if (catalogo.length) {
    partes.push("Alimentos que el usuario tiene fichados en su app, con su id (para que, si usas uno, pongas su id):\n" +
      JSON.stringify(catalogo.map((f) => ({ id: f.id, nombre: f.nombre }))));
  }
  if (modo === "restaurante") {
    partes.push(
      `Modo «tipo restaurante»: propone hasta ${MAX_RECETAS} platos que partan de lo que hay en casa pero que, ` +
      "comprando entre una y tres cosas más elaboradas (una especia concreta, una salsa, un queso curado, unas " +
      "hierbas frescas...), queden como un plato de restaurante. Marca con \"comprar\": true lo que haya que " +
      "comprar y explica en una frase por qué eleva el plato."
    );
  } else {
    partes.push(
      `Modo «con lo que tengo»: propone hasta ${MAX_RECETAS} platos distintos que se puedan hacer SOLO con lo ` +
      "disponible (más los básicos de arriba). Nada de \"comprar\": true en este modo."
    );
  }
  partes.push(
    "Devuelve ÚNICAMENTE un JSON (sin texto adicional) con esta forma exacta:\n" +
    '[{"nombre": string, "porque": string, "ingredientes": [{"nombre": string, "cantidad": string, ' +
    '"gramos": number | null, "id": string | null, "comprar": boolean}], "pasos": [string]}]\n' +
    "«id»: el id de la despensa o del catálogo si el ingrediente es uno de esos, o null. «gramos»: solo si es " +
    "un ingrediente con cantidad razonable en gramos, o null. «pasos»: frases cortas, en orden. Sin calorías ni " +
    "macros. Si no hay nada con lo que cocinar, devuelve []."
  );
  return partes.join("\n\n");
}

async function reservarHuecoDeCuota(uid) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const ref = admin.firestore().doc(`users/${uid}`);
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const datos = snap.data() || {};
    if (!datos.premium || !datos.premium.active) {
      throw new HttpsError("permission-denied", '"¿Qué cocino?" es una función premium.');
    }
    const usoPrevio = datos.usoCocinar && datos.usoCocinar.mes === mesActual ? datos.usoCocinar.contador : 0;
    if (usoPrevio >= LIMITE_COCINAR_MES) {
      throw new HttpsError("resource-exhausted", `Has alcanzado el límite de ${LIMITE_COCINAR_MES} sugerencias este mes. Vuelve a intentarlo el mes que viene.`);
    }
    tx.set(ref, { usoCocinar: { mes: mesActual, contador: usoPrevio + 1 } }, { merge: true });
  });
}

async function devolverHuecoDeCuota(uid) {
  await admin.firestore().doc(`users/${uid}`)
    .update({ "usoCocinar.contador": admin.firestore.FieldValue.increment(-1) })
    .catch((err) => logger.error("No se ha podido devolver el hueco de cuota de suggestRecipes tras un fallo", err));
}

// Limpia lo que devuelve Gemini: solo campos esperados, textos acotados y `id` solo si existe de verdad en lo
// que se mandó (despensa o catálogo). En el modo «con lo que tengo» no se acepta nada para comprar.
function limpiarRecetas(recetas, idsValidos, modo) {
  if (!Array.isArray(recetas)) return [];
  return recetas
    .filter((r) => r && typeof r.nombre === "string" && Array.isArray(r.ingredientes) && Array.isArray(r.pasos))
    .slice(0, MAX_RECETAS)
    .map((r) => ({
      nombre: texto(r.nombre, 120),
      porque: texto(r.porque, 300),
      ingredientes: r.ingredientes
        .filter((i) => i && typeof i.nombre === "string" && i.nombre.trim())
        .slice(0, 20)
        .map((i) => ({
          nombre: texto(i.nombre, 80),
          cantidad: texto(i.cantidad, 40),
          gramos: Number(i.gramos) > 0 && Number(i.gramos) < 2000 ? Math.round(Number(i.gramos)) : null,
          id: i.id && idsValidos.has(i.id) ? i.id : null,
          comprar: modo === "restaurante" && i.comprar === true,
        })),
      pasos: r.pasos.filter((p) => typeof p === "string" && p.trim()).slice(0, 12).map((p) => texto(p, 400)),
    }))
    .filter((r) => r.nombre && r.ingredientes.length && r.pasos.length);
}

exports.suggestRecipes = onCall({ secrets: [geminiApiKey], enforceAppCheck: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Hay que iniciar sesión para usar esta función.");
  const uid = request.auth.uid;
  const datos = request.data || {};
  const modo = datos.modo === "restaurante" ? "restaurante" : "conLoQueTengo";
  const hayFoto = !!datos.photoDataUrl;
  const otrosIngredientes = texto(datos.otrosIngredientes);
  const especias = texto(datos.especias);
  const despensa = (Array.isArray(datos.despensa) ? datos.despensa : [])
    .filter((d) => d && typeof d.nombre === "string")
    .slice(0, MAX_DESPENSA)
    .map((d) => ({ id: typeof d.id === "string" ? d.id : null, nombre: texto(d.nombre, 80), cantidad: texto(d.cantidad, 30) }));
  const catalogo = (Array.isArray(datos.catalogo) ? datos.catalogo : [])
    .filter((f) => f && f.id && f.name)
    .slice(0, 400)
    .map((f) => ({ id: String(f.id), nombre: texto(f.name, 80) }));
  if (!hayFoto && !otrosIngredientes && !despensa.length) {
    throw new HttpsError("invalid-argument", "Manda una foto, escribe qué ingredientes tienes o incluye tu despensa.");
  }
  const imagePart = hayFoto ? dataUrlAImagePart(datos.photoDataUrl) : null;
  const idsValidos = new Set([...despensa.map((d) => d.id).filter(Boolean), ...catalogo.map((f) => f.id)]);

  await reservarHuecoDeCuota(uid);

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  const prompt = { text: construirPrompt({ modo, despensa, catalogo, especias, otrosIngredientes, hayFoto, idioma: datos.idioma }) };
  let respuesta;
  try {
    const r = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: imagePart ? [imagePart, prompt] : [prompt],
      config: { responseMimeType: "application/json" },
    });
    respuesta = r.text;
  } catch (err) {
    logger.error("Fallo al contactar con Gemini en suggestRecipes", err);
    await devolverHuecoDeCuota(uid);
    throw new HttpsError("unavailable", "No se ha podido contactar con el asistente de cocina. Inténtalo de nuevo.");
  }

  let recetas;
  try {
    recetas = limpiarRecetas(JSON.parse(respuesta), idsValidos, modo);
  } catch (err) {
    await devolverHuecoDeCuota(uid);
    throw new HttpsError("internal", "No se ha podido interpretar la respuesta. Inténtalo de nuevo.");
  }
  return { recetas };
});

// Para probar la limpieza sin Gemini (node -e), sin efecto en el despliegue.
exports._limpiarRecetas = limpiarRecetas;
