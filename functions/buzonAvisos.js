// ---------- Buzón de avisos: lo comparten las dos funciones de notificaciones (auditoría de noviembre, R8 y R17) ----------
// `users/{uid}/avisos/push` guarda, por cuenta, el idioma, los dos interruptores de avisos (`pesaje`,
// `descongelar`) y la lista de aparatos (`tokens`). Lo escribe la app (auth-bootstrap.jsx,
// window.sincronizarBuzonAvisos) al abrirse y al cambiar los avisos o el idioma; su forma y sus límites están en
// firestore.rules.
//
// Por qué existe: hasta noviembre de 2026, sendWeighInReminders y sendDefrostReminders descubrían a quién avisar
// leyendo con `collectionGroup("keys")` **todos los documentos de todas las cuentas** (menús, despensa, cada mes
// de entreno...) dos veces al día y quedándose con el token de notificaciones. El coste crecía con los datos de
// todo el mundo, una sola cuenta con muchos meses de entreno lo encarecía para todas, y se leían datos de salud
// de cuentas que ni siquiera tenían avisos (contra la minimización del RGPD, art. 5.1.c). Ahora leen solo los
// buzones, uno por cuenta con algún aviso activado. Además, cada cuenta tenía un único token: activar los avisos
// en un segundo aparato dejaba sin ellos al primero (R17). Ahora van a todos los de la lista.
//
// No se filtra en la consulta (`where("descongelar", "==", true)`) a propósito: en una `collectionGroup`, Firestore
// exige crear a mano un índice por cada campo filtrado (no los crea solo, como en una colección normal), y eso
// sería otra cosa que desplegar y que olvidar. Los buzones son pocos (solo las cuentas con avisos) y pequeños: se
// leen todos y se filtran aquí.
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Los cinco idiomas de la app (logica/i18n.js). Las reglas ya solo aceptan estos; si llegara otro, español.
const IDIOMAS = ["es", "en", "ca", "gl", "eu"];

// Errores de FCM que significan que el token ya no sirve (permiso revocado, app desinstalada, token renovado por
// el navegador): ese aparato sale de la lista para no volver a intentarlo cada día. Cualquier otro fallo (red,
// cuota puntual de FCM...) se deja como está, para reintentarlo en el siguiente aviso.
const TOKEN_INSERVIBLE = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// Todos los buzones, ya limpios: solo `users/{uid}/avisos/push` (cualquier otro documento que se llamara igual se
// ignora), interruptores como sí/no y tokens sin repetidos ni nada que no sea texto. Las reglas ya garantizan la
// forma; esto es por si acaso, para que un dato raro no tire la función entera.
async function buzonesDeAvisos() {
  const snap = await admin.firestore().collectionGroup("avisos").get();
  const buzones = [];
  snap.forEach((doc) => {
    const cuenta = doc.ref.parent.parent;
    if (doc.id !== "push" || !cuenta || cuenta.parent.id !== "users") return;
    const datos = doc.data() || {};
    const tokens = Array.isArray(datos.tokens) ? datos.tokens.filter((t) => typeof t === "string" && t !== "") : [];
    buzones.push({
      uid: cuenta.id,
      ref: doc.ref,
      idioma: IDIOMAS.includes(datos.idioma) ? datos.idioma : "es",
      pesaje: datos.pesaje === true,
      descongelar: datos.descongelar === true,
      tokens: [...new Set(tokens)],
    });
  });
  return buzones;
}

// Manda un aviso a todos los aparatos de un buzón de una vez (`sendEachForMulticast`: un resultado por token) y
// quita de la lista los que FCM da por muertos. No toca `actualizado`: esa hora es la de la última vez que la
// propia app escribió (sirve para reconocer un buzón abandonado), no la de una limpieza del servidor.
// Devuelve cuántos aparatos lo recibieron y cuántos se quitaron.
async function enviarAlBuzon(buzon, { titulo, cuerpo, etiqueta }) {
  const mensaje = { tokens: buzon.tokens, notification: { title: titulo, body: cuerpo } };
  // `data.tag` le dice a sw.js con qué etiqueta mostrarla, para que un aviso no sustituya al otro.
  if (etiqueta) mensaje.data = { tag: etiqueta };
  const respuesta = await admin.messaging().sendEachForMulticast(mensaje);

  const caducados = [];
  respuesta.responses.forEach((r, i) => {
    if (r.success) return;
    if (r.error && TOKEN_INSERVIBLE.has(r.error.code)) caducados.push(buzon.tokens[i]);
    else logger.error(`${buzon.uid}: no se ha podido enviar a uno de sus aparatos`, r.error);
  });
  if (caducados.length) {
    await buzon.ref
      .update({ tokens: admin.firestore.FieldValue.arrayRemove(...caducados) })
      .then(() => logger.info(`${buzon.uid}: ${caducados.length} aparato(s) con el token caducado, se quitan del buzón`))
      .catch((err) => logger.error(`${buzon.uid}: no se han podido quitar los tokens caducados`, err));
  }
  return { enviados: respuesta.successCount, quitados: caducados.length };
}

module.exports = { buzonesDeAvisos, enviarAlBuzon };
