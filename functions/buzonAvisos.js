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
// ---------- Escala (tanda B, M3) ----------
// Hasta la tanda B se leían todos los buzones de golpe y sin filtro, y se procesaban con un solo `Promise.all`.
// Con pocas cuentas daba igual; con miles, una función se llevaba a memoria todos los buzones y abría a la vez el
// `data-v1` (hasta 1 MiB cada uno) de todas las cuentas con el pesaje activado: se quedaba sin memoria o tiraba
// de FCM y de Firestore con miles de peticiones simultáneas. Ahora:
// - **Solo los buzones con ese aviso activado**: `where("pesaje", "==", true)` o `where("descongelar", "==", true)`.
//   El de descongelar no lee los buzones de quien solo quiere el de pesaje, ni al revés.
// - **Por páginas** (ESCALA.tamanoPagina, unos 300), con cursor: cada página empieza justo después del último
//   documento de la anterior, en el orden de su ruta (`__name__`). En memoria solo hay una página a la vez.
// - **Unas pocas cuentas a la vez** (ESCALA.aLaVez, unas 20): cada página se reparte entre 20 «trabajadores» que
//   van cogiendo la siguiente cuenta en cuanto acaban la suya. Así una cuenta lenta no frena a las otras 19, y
//   nunca hay más de 20 `data-v1` abiertos ni más de 20 envíos a FCM en marcha.
//
// **Índices**: en una consulta sobre todas las cuentas (`collectionGroup`), Firestore exige un índice de campo con
// ámbito «grupo de colecciones» por cada campo filtrado: no los crea solo, como hace en una colección normal. Están
// en `firestore.indexes.json` (`avisos` / `pesaje` y `avisos` / `descongelar`) y se publican aparte
// (`firebase deploy --only firestore:indexes`). El orden por la ruta del documento, que usa la paginación, no pide
// nada más: cada entrada de un índice de un solo campo ya va ordenada por valor y, a igualdad, por la ruta.
//
// **Plan B si falta el índice**: si la consulta filtrada falla porque el índice no existe o aún se está creando
// (`FAILED_PRECONDITION`, código 9 de gRPC), la función no se queda sin avisar a nadie: lo deja en el registro con
// `logger.warn` (con el enlace que da Firestore para crearlo) y sigue leyendo todos los buzones, también por
// páginas, filtrando aquí, como antes de la tanda B. Sigue desde la misma página en la que falló: las dos consultas
// van en el mismo orden (por la ruta del documento), así que nadie se queda sin aviso ni lo recibe dos veces. Esto
// cubre un despliegue en mal orden (las funciones antes que los índices) y los minutos que tarda en crearse un
// índice nuevo. El emulador de Firestore no exige índices, así que las pruebas no notarían que falta uno: el plan B
// se prueba simulando el error (functions/pruebas-funciones/).
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Los cinco idiomas de la app (logica/i18n.js). Las reglas ya solo aceptan estos; si llegara otro, español.
const IDIOMAS = ["es", "en", "ca", "gl", "eu"];

// Tamaños de la escala (arriba). Es un objeto que se puede cambiar, y no dos constantes, para que las pruebas
// los pongan pequeños (páginas de 2, 2 cuentas a la vez) y comprueben la paginación y las tandas con unos pocos
// buzones. En producción no se tocan.
// - 300 por página: un buzón ocupa como mucho unos 41 KB (10 tokens de hasta 4096 caracteres), y en la práctica
//   menos de 2 KB; 300 son unos 600 KB normalmente y nunca más de unos 12 MB. Páginas más grandes apenas ahorran:
//   Firestore cobra por documento leído (más una lectura por cada consulta que no trae nada), no por página.
// - 20 a la vez: con `data-v1` de hasta 1 MiB (que al convertirlo en objeto ocupa varias veces eso), 20 abiertos
//   caben con holgura en los 512 MiB de las funciones programadas; y 20 envíos simultáneos a FCM son pocos para
//   sus cuotas.
const ESCALA = { tamanoPagina: 300, aLaVez: 20 };

// Errores de FCM que significan que el token ya no sirve (permiso revocado, app desinstalada, token renovado por
// el navegador): ese aparato sale de la lista para no volver a intentarlo cada día. Cualquier otro fallo (red,
// cuota puntual de FCM...) se deja como está, para reintentarlo en el siguiente aviso.
const TOKEN_INSERVIBLE = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// Un buzón leído, ya limpio, o `null` si el documento no es un buzón: solo vale `users/{uid}/avisos/push` (cualquier
// otro documento que se llamara igual se ignora). Interruptores como sí/no y tokens sin repetidos ni nada que no sea
// texto. Las reglas ya garantizan la forma; esto es por si acaso, para que un dato raro no tire la función entera.
function limpiarBuzon(doc) {
  const cuenta = doc.ref.parent.parent;
  if (doc.id !== "push" || !cuenta || cuenta.parent.id !== "users") return null;
  const datos = doc.data() || {};
  const tokens = Array.isArray(datos.tokens) ? datos.tokens.filter((t) => typeof t === "string" && t !== "") : [];
  return {
    uid: cuenta.id,
    ref: doc.ref,
    idioma: IDIOMAS.includes(datos.idioma) ? datos.idioma : "es",
    pesaje: datos.pesaje === true,
    descongelar: datos.descongelar === true,
    tokens: [...new Set(tokens)],
  };
}

// ¿Ha fallado la consulta porque falta su índice (o aún se está creando)? Firestore responde FAILED_PRECONDITION:
// el Admin SDK lo da como `code: 9` (el código de gRPC). Se mira también el texto por si una versión futura del SDK
// lo diera con otro formato: confundir otro error con este solo haría leer todos los buzones (lo de antes), nunca
// dejar a nadie sin aviso.
function faltaElIndice(err) {
  if (!err) return false;
  return err.code === 9 || err.code === "failed-precondition" || /FAILED_PRECONDITION/.test(String(err.message || ""));
}

// Hace `tarea(elemento)` con cada elemento de la lista, como mucho `limite` a la vez: cada «trabajador» coge el
// siguiente en cuanto termina el suyo. Un fallo de una tarea se queda en el registro y no para a las demás (cada
// cuenta es independiente: que una tenga los datos rotos no puede dejar sin aviso a las siguientes).
async function aLaVez(lista, limite, tarea) {
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < lista.length) {
      const elemento = lista[siguiente++];
      try {
        await tarea(elemento);
      } catch (err) {
        logger.error(`${elemento && elemento.uid}: fallo inesperado al preparar su aviso`, err);
      }
    }
  };
  const cuantos = Math.max(1, Math.min(limite, lista.length));
  await Promise.all(Array.from({ length: cuantos }, trabajador));
}

// Recorre, página a página, los buzones con el aviso `campo` («pesaje» o «descongelar») activado y al menos un
// aparato, y llama a `tratar(buzon)` con cada uno, como mucho ESCALA.aLaVez a la vez. Devuelve cuántos ha tratado.
// `nombre` es el del aviso en el registro. Lanza si no se puede leer una página (sin contar la falta del índice, que
// tiene su plan B): las cuentas de las páginas anteriores ya han recibido su aviso; las demás no, y queda el error
// en el registro.
async function recorrerBuzones(campo, nombre, tratar) {
  const { FieldPath } = admin.firestore;
  // Una sola búsqueda en todas las cuentas: la filtrada y la de todos (plan B) salen de aquí.
  const grupo = admin.firestore().collectionGroup("avisos");
  let filtrar = true;
  let ultimo = null; // el último documento de la página anterior: la siguiente empieza justo después
  let tratados = 0;
  for (;;) {
    // El orden por la ruta del documento es el que daría Firestore sin pedirlo; se pide para que el cursor sea
    // explícito y el mismo en las dos consultas (la filtrada y la del plan B).
    let consulta = (filtrar ? grupo.where(campo, "==", true) : grupo).orderBy(FieldPath.documentId()).limit(ESCALA.tamanoPagina);
    if (ultimo) consulta = consulta.startAfter(ultimo);
    let pagina;
    try {
      pagina = await consulta.get();
    } catch (err) {
      if (filtrar && faltaElIndice(err)) {
        logger.warn(
          `${nombre}: falta el índice de «${campo}» en los buzones de avisos (o aún se está creando); se leen todos ` +
            "los buzones y se filtran aquí, como antes. Publica los índices: firebase deploy --only firestore:indexes",
          err
        );
        filtrar = false;
        continue; // la misma página, ahora sin filtro
      }
      throw err;
    }
    if (pagina.empty) break;
    ultimo = pagina.docs[pagina.docs.length - 1];
    // También con el filtro de la consulta se vuelve a mirar aquí: en el plan B es el único filtro, y así un dato
    // raro (un `true` que no fuera sí/no) nunca cuela.
    const buzones = pagina.docs.map(limpiarBuzon).filter((b) => b && b[campo] && b.tokens.length > 0);
    tratados += buzones.length;
    await aLaVez(buzones, ESCALA.aLaVez, tratar);
    if (pagina.size < ESCALA.tamanoPagina) break;
  }
  return tratados;
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

module.exports = { ESCALA, recorrerBuzones, enviarAlBuzon };
