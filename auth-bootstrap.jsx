import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { t, IDIOMAS_DISPONIBLES, leerIdiomaGuardado, guardarIdiomaLocal } from "i18n";
import {
  quiereAvisos, tokensConSitio, claveFirmaBuzon, claveTokenDeAntesBorrado, CLAVE_ESTRENAR_TOKEN, estadoDelPermiso,
  planSincronizacion, decidirBuzon, firmaAlQuitarAvisos, decidirAlSalir, camposBuzon,
} from "buzon-avisos";
import { cargarApp } from "cargador-ui";

// Identificadores públicos de los proyectos de Firebase (no son claves secretas, es normal que
// se vean en el código fuente de cualquier web que use Firebase).
// Dos proyectos (auditoría de noviembre de 2026, R24 y D9): la app real usa `rueda-de-platos`, y
// cuando se abre en el ordenador de desarrollo (localhost) usa `rueda-de-platos-dev`, una base
// aparte con cuentas y datos inventados. Así un error mientras se prueba (una migración mal
// escrita, un bucle de escritura, unas reglas nuevas) nunca toca los datos de salud de las
// cuentas reales. Se elige por el nombre del host porque no hay build ni variables de entorno.
// Cualquier host que no sea local cae en producción: así ningún usuario real puede acabar en la
// base de pruebas por un descuido.
const FIREBASE_PRODUCCION = {
  apiKey: "AIzaSyDFTu5zVLHA7KjXiW7tKM1Ufa-vY2L8A_o",
  authDomain: "rueda-de-platos.firebaseapp.com",
  projectId: "rueda-de-platos",
  storageBucket: "rueda-de-platos.firebasestorage.app",
  messagingSenderId: "477523566905",
  appId: "1:477523566905:web:130cdede8cb500cbdac8e8",
};
const FIREBASE_PRUEBAS = {
  apiKey: "AIzaSyDEx-oQAUHgBSHRY-O--OquKYteA4zMcAk",
  authDomain: "rueda-de-platos-dev.firebaseapp.com",
  projectId: "rueda-de-platos-dev",
  storageBucket: "rueda-de-platos-dev.firebasestorage.app",
  messagingSenderId: "233926898265",
  appId: "1:233926898265:web:9e2ba470d45eaca0f7b748",
};
const ES_ENTORNO_LOCAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const firebaseConfig = ES_ENTORNO_LOCAL ? FIREBASE_PRUEBAS : FIREBASE_PRODUCCION;

const firebaseApp = initializeApp(firebaseConfig);

// App Check: añade un "sello" a cada petición para demostrar que viene de verdad de esta web,
// y no de alguien que ha copiado la configuración pública. Debe activarse antes de usar
// cualquier otro servicio de Firebase (Auth, Firestore, AI Logic...).
// Solo en producción: la clave de reCAPTCHA está atada a los dominios reales y en localhost haría
// falta un token de depuración, que es justo lo que se quiere quitar de producción. El proyecto de
// pruebas no exige App Check, así que en local se trabaja sin él.
if (!ES_ENTORNO_LOCAL) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider("6LdZOYItAAAAADUcPXKC-RGNnc_b35H2qxgfGu0f"),
    isTokenAutoRefreshEnabled: true,
  });
}

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);

// ---------- Lectura de etiquetas nutricionales por foto ----------
// La llamada a Gemini en sí ya no vive aquí: vive en functions/analyzeFoodPhoto.js, detrás de una
// Cloud Function que comprueba que la cuenta es premium y aplica la cuota mensual de forma
// atómica ANTES de gastar nada. Un límite comprobado solo en el navegador no protegería nada —
// cualquiera podría saltárselo llamando a Gemini directo, como se hacía antes de tener varios
// usuarios (ver la hoja de ruta de publicación, Fase 2). Aquí solo queda invocar la función y
// traducir sus posibles errores; el resto de la app (app.jsx) sigue llamando a
// window.analyzeFoodPhoto exactamente igual que siempre, sin enterarse del cambio.
// Error de una Cloud Function hacia la interfaz: el mensaje (en español, de la función) como último recurso y,
// sobre todo, el código (`functions/resource-exhausted`...), con el que ui/comun/errores.js elige el texto en
// el idioma de la app. Antes solo pasaba el mensaje y fuera del español se veía en español.
function errorDeFuncion(err, porDefecto) {
  const e = new Error((err && err.message) || porDefecto);
  e.code = err && err.code;
  return e;
}

const analyzeFoodPhotoCallable = httpsCallable(functions, "analyzeFoodPhoto");

window.analyzeFoodPhoto = async function (photoDataUrl) {
  try {
    const respuesta = await analyzeFoodPhotoCallable({ photoDataUrl });
    return respuesta.data;
  } catch (err) {
    throw errorDeFuncion(err, "No se ha podido analizar la foto. Inténtalo de nuevo.");
  }
};

// ---------- Suscripción premium: Checkout y portal de gestión de Stripe ----------
// Ambas funciones devuelven { url } — la app solo tiene que redirigir a esa URL
// (window.location.href = url), Stripe se encarga de todo lo demás (formulario de pago, o el
// portal de cancelación/cambio de tarjeta). Ver createCheckoutSession.js y
// createPortalSession.js para el porqué de cada dato que se manda.
const createCheckoutSessionCallable = httpsCallable(functions, "createCheckoutSession");
const createPortalSessionCallable = httpsCallable(functions, "createPortalSession");

window.createCheckoutSession = async function () {
  try {
    const respuesta = await createCheckoutSessionCallable();
    return respuesta.data.url;
  } catch (err) {
    throw errorDeFuncion(err, "No se ha podido iniciar el pago. Inténtalo de nuevo.");
  }
};

window.createPortalSession = async function () {
  try {
    const respuesta = await createPortalSessionCallable();
    return respuesta.data.url;
  } catch (err) {
    throw errorDeFuncion(err, "No se ha podido abrir la gestión de tu suscripción. Inténtalo de nuevo.");
  }
};

// ---------- "Qué puedo cocinar con lo que tengo" ----------
// Igual que analyzeFoodPhoto: la lógica de verdad (premium, cuota, prompt a Gemini) vive en
// functions/suggestMeals.js. Aquí solo se invoca y se traducen los errores — el catálogo de
// alimentos hay que mandarlo desde app.jsx en cada llamada, porque la función no tiene forma de
// leer el JSON de datos de la app (vive bajo una clave opaca en Firestore que solo entiende
// app.jsx, no la Cloud Function).
const suggestMealsCallable = httpsCallable(functions, "suggestMeals");

window.suggestMeals = async function ({ photoDataUrl, especias, otrosIngredientes, catalogo }) {
  try {
    const respuesta = await suggestMealsCallable({ photoDataUrl, especias, otrosIngredientes, catalogo });
    return respuesta.data.sugerencias;
  } catch (err) {
    throw errorDeFuncion(err, "No se han podido generar sugerencias. Inténtalo de nuevo.");
  }
};

// ---------- «¿Qué cocino?» con dos modos: recetas (E2, 25-oct-2026) ----------
// La pantalla nueva llama a esta (functions/suggestRecipes.js): recetas con ingredientes y pasos, sin macros,
// en modo «con lo que tengo» o «tipo restaurante», con la despensa si el usuario la incluye. Comparte la cuota
// de suggestMeals. Hay que desplegar la función antes de subir la app (ver suggestRecipes.js).
const suggestRecipesCallable = httpsCallable(functions, "suggestRecipes");

window.suggestRecipes = async function ({ modo, photoDataUrl, especias, otrosIngredientes, despensa, catalogo, idioma }) {
  try {
    const respuesta = await suggestRecipesCallable({ modo, photoDataUrl, especias, otrosIngredientes, despensa, catalogo, idioma });
    return respuesta.data.recetas;
  } catch (err) {
    throw errorDeFuncion(err, "No se han podido generar sugerencias. Inténtalo de nuevo.");
  }
};

// ---------- Notificaciones push: recordatorio de pesaje (Fase 6) ----------
// Clave pública VAPID del proyecto de Firebase — no es secreta (viaja en el propio navegador,
// igual que firebaseConfig de arriba), pero hay que generarla a mano una sola vez en la consola
// de Firebase (Configuración del proyecto → Cloud Messaging → pestaña "Web Push certificates" →
// generar par de claves) y pegarla aquí. Sin esto, requestPushPermission falla con un error de
// Firebase al pedir el token — no hay forma de evitar este paso manual desde el código.
const VAPID_PRODUCCION = "BOVHvRG5q0ac0_Cg8w4WzbPUfvifxWw72x5wnb_YLDFNIx_lDUdmZabecAH98YKoQKLaJS2Hy3MplSUNr0rSJz4";
// La del proyecto de pruebas (R8), generada en la misma pantalla de la consola de `rueda-de-platos-dev`: así las
// notificaciones se prueban en localhost con cuentas inventadas. Cada clave solo vale para su proyecto. Vacía,
// en localhost no se ofrecen (como hasta noviembre de 2026).
const VAPID_PRUEBAS = "BIaup8keLN2dx49yMI-hT5HrVG2LeHFsBKpC0HTwt_TRqiH5mg6L3fv0ch2FGD7Nugdxk6cGfDjMGxfE1IORqxI";
const VAPID_PUBLIC_KEY = ES_ENTORNO_LOCAL ? VAPID_PRUEBAS : VAPID_PRODUCCION;

// Token de antes del buzón de avisos (R8, abajo): un único token por cuenta, en la misma colección `keys` que
// el resto de datos. Lo buscaban las funciones de antes leyendo todos los documentos de todas las cuentas; las
// de ahora leen solo el buzón y ya no lo miran. **Retirado**: la app ya no lo escribe y firestore.rules ya no lo
// acepta; solo queda borrarlo, una sola vez por cuenta y aparato (limpiarTokenDeAntes, abajo), en las cuentas que
// aún lo tengan. Borrar sigue permitido (las reglas dejan borrar cualquier clave propia), así que esa limpieza no
// depende de la lista. Una copia vieja de la app que lo escribiera al activar los avisos (un `await setDoc` sin
// proteger) fallaría esa vez y funcionaría al volver a abrirla, ya con esta versión (documentacion/backend.md,
// «Paso del token de antes al buzón»).
const PUSH_TOKEN_KEY = "rueda-de-platos:push-token-v1";

function soportaPushNotifications() {
  return typeof Notification !== "undefined" && "serviceWorker" in navigator && !!VAPID_PUBLIC_KEY;
}

// Situación de este aparato con las notificaciones (logica/buzon-avisos.js, estadoDelPermiso): «concedido»,
// «bloqueado», «sin-pedir» o «sin-soporte». Ajustes la usa para decir si aquí llegan los avisos (F3).
function estadoDeEsteAparato() {
  return estadoDelPermiso({
    soporta: soportaPushNotifications(),
    permiso: typeof Notification !== "undefined" ? Notification.permission : undefined,
  });
}
window.estadoAvisosEsteAparato = estadoDeEsteAparato;

// Pide permiso de notificaciones al navegador y comprueba que FCM da un token para este aparato. No escribe
// nada: el buzón lo escribe sincronizarBuzonAvisos en cuanto el perfil guarda el cambio (aquí aún no se sabe qué
// interruptor se está activando), o el botón «Recibirlos aquí» de Ajustes justo después. Antes también guardaba el
// token de antes; sin esa escritura, activar los avisos sin conexión ya no se queda «pidiendo…».
// Lanza errores con un `.code` reconocible (mismo patrón que window.deleteAccount) para que Ajustes
// (ui/ajustes/ajustes.jsx) pueda traducirlos a un mensaje en el idioma de la interfaz en vez de
// mostrar el texto en español de aquí abajo, que es solo un mensaje de repuesto.
window.requestPushPermission = async function () {
  if (!soportaPushNotifications()) {
    const err = new Error("Este navegador no admite notificaciones push.");
    err.code = "unsupported";
    throw err;
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    const err = new Error("No se ha concedido el permiso de notificaciones.");
    err.code = "permission-denied";
    throw err;
  }

  let token;
  try {
    token = await tokenDeEsteDispositivo();
  } catch (e) {
    const err = new Error("No se ha podido generar el token de notificaciones.");
    err.code = "token-failed";
    throw err;
  }
  if (!token) {
    const err = new Error("No se ha podido generar el token de notificaciones.");
    err.code = "token-failed";
    throw err;
  }
  return token;
};

// getToken necesita el registro del service worker para saber a qué archivo (sw.js, con su manejador
// onBackgroundMessage) asociar los mensajes que lleguen con la app cerrada. Con el permiso ya concedido no
// pregunta nada: devuelve el token de este navegador, o uno nuevo si el navegador lo ha renovado. **Ojo**: con el
// permiso aún sin pedir, getToken lo pide él solo (sale la pregunta del navegador); por eso fuera de
// requestPushPermission solo se llama con el permiso ya concedido.
async function tokenDeEsteDispositivo() {
  const registration = (await window.swRegistrationPromise) || undefined;
  return getToken(getMessaging(firebaseApp), { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration });
}

// Revoca el token de este navegador: FCM lo da por muerto, así que deja de valer en cualquier buzón que aún lo
// tenga (las funciones lo quitan solas en su siguiente envío), y el próximo getToken da uno nuevo. Devuelve si lo
// ha conseguido; sin token vivo que revocar, también.
// - deleteToken no deja decir qué service worker usar: si en esta visita aún no se ha llamado a getToken, intenta
//   registrar el suyo por defecto (`/firebase-messaging-sw.js`, que aquí no existe) y falla. Por eso, con el
//   permiso concedido, primero getToken con el nuestro (con un token reciente no sale ni a la red).
// - Plan B, si FCM no contesta (sin conexión) o no hay permiso: darse de baja de la suscripción push del propio
//   navegador. El token viejo deja de servir igual (ya no hay adónde entregarle nada), y el siguiente getToken, al
//   ver otra suscripción, borra el viejo y pide uno nuevo él solo (comprobado en el SDK 12.17.1).
async function revocarTokenDeEsteNavegador() {
  const registro = await window.swRegistrationPromise;
  if (!registro || !registro.pushManager) return true; // sin service worker no hay notificaciones push
  try {
    const suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) return true;
    if (estadoDeEsteAparato() === "concedido") {
      try {
        await tokenDeEsteDispositivo();
        await deleteToken(getMessaging(firebaseApp));
        return true;
      } catch (e) {
        // sigue con el plan B
      }
    }
    const sigue = await registro.pushManager.getSubscription();
    return sigue ? await sigue.unsubscribe() : true;
  } catch (e) {
    return false;
  }
}

// ---------- Buzón de avisos (auditoría de noviembre de 2026, R8 y R17) ----------
// `users/{uid}/avisos/push`: idioma, los dos interruptores de avisos, la lista de aparatos de la cuenta y lo justo
// del seguimiento de peso (tanda B). Es lo único que leen las funciones de notificaciones para saber a quién avisar
// (antes leían todos los documentos de todas las cuentas). Forma y límites en firestore.rules; las decisiones sin
// Firebase, en logica/buzon-avisos.js: aquí solo se hace lo que se decide allí. Nadie lo ve ni lo toca a mano: lo
// mantiene la app sola.
const refBuzon = (uid) => doc(db, "users", uid, "avisos", "push");

// `localStorage`, siempre con try/catch: sin él (un navegador que lo bloquea) todo sigue funcionando, solo que sin
// lo que se apunta ahí (el buzón se reescribe en cada apertura, el token de antes se intenta borrar cada vez...).
function leerLocal(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (e) {
    return null;
  }
}
function guardarLocal(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch (e) {
    // sin localStorage no queda apuntado: se repetirá la próxima vez, que cuesta una escritura y nada más
  }
}
function borrarLocal(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (e) {
    // nada que borrar
  }
}

// La firma: lo último que este aparato escribió en el buzón de una cuenta (logica/buzon-avisos.js, «La firma»).
// Es una comodidad del dispositivo, como el idioma o las vistas: `localStorage` con prefijo `fooddraft:` y el uid
// al final, así que «Eliminar cuenta» la limpia con el resto (limpiarDispositivoDeLaCuenta).
function leerFirmaBuzon(uid) {
  try {
    return JSON.parse(leerLocal(claveFirmaBuzon(uid)) || "null");
  } catch (e) {
    return null;
  }
}
const guardarFirmaBuzon = (uid, firma) => guardarLocal(claveFirmaBuzon(uid), JSON.stringify(firma));
const borrarFirmaBuzon = (uid) => borrarLocal(claveFirmaBuzon(uid));

// Las operaciones del buzón van en fila, una detrás de otra. Si no, quitar un aviso y enseguida el otro podía
// acabar al revés: el borrado del buzón llegaba antes que la escritura del primer cambio (que aún esperaba el
// token), y el buzón reaparecía con un aviso que ya no se quería.
// `limiteMs` (al cerrar sesión, F2): el turno termina a ese tiempo pase lo que pase, contado desde que se pide y
// no desde que empieza, así que también cubre una tarea anterior que se haya quedado atascada. Hace falta porque
// Firestore guarda las escrituras pendientes de una cuenta hasta que esa misma cuenta vuelve a entrar: si se
// cierra sesión sin conexión, la escritura de la cuenta que sale puede no resolverse nunca, y sin límite todo lo
// que viniera detrás (los avisos de la cuenta siguiente) esperaría hasta recargar la página. Lo que se quede
// atascado no puede tocar después nada de otra sesión: cada tarea lo comprueba antes de escribir (sigueVigente).
let colaBuzon = Promise.resolve();
function enColaBuzon(tarea, { limiteMs } = {}) {
  const resultado = colaBuzon.then(tarea);
  const turno = limiteMs ? Promise.race([resultado, new Promise((resolver) => setTimeout(resolver, limiteMs))]) : resultado;
  colaBuzon = turno.catch(() => {});
  return turno;
}

const esLaCuentaDeAhora = (uid) => !!uid && !!auth.currentUser && auth.currentUser.uid === uid;

// La sesión del buzón: sube cada vez que se entra o se sale (onAuthStateChanged, al final de este archivo) y al
// terminar el turno de cerrar sesión (signOutUser). Cada tarea de la fila apunta la de cuando se pidió y no toca
// nada (ni el buzón ni la firma) si, cuando le llega el turno o antes de cada escritura, ya es otra.
// Comparar solo la cuenta no bastaba: Firestore guarda las escrituras pendientes de una cuenta hasta que esa misma
// cuenta vuelve a entrar. Si se cierra sesión sin conexión con una escritura atascada y, en la misma visita, se
// vuelve a entrar con la misma cuenta, al llegar esa escritura se ejecutaba lo que esperaba detrás (por ejemplo,
// sacar este aparato del buzón al cerrar sesión) dentro de la sesión nueva: podía quitar el token que esta acababa
// de apuntar y dejar el aparato sin avisos hasta la siguiente apertura.
let sesionBuzon = 0;

// «Eliminar cuenta» (window.deleteAccount): el uid de la cuenta que se está borrando. Mientras tanto, y después,
// la fila no escribe nada en su buzón. Sin esto, una tarea que llegara a escribir después de que la función
// deleteAccount borre `users/{uid}` volvería a crear `avisos/push` (el token de sesión sigue valiendo hasta una
// hora), y las funciones seguirían avisando a ese aparato cada día de una cuenta que ya no existe. No se espera a
// la fila antes de borrar: puede estar atascada sin conexión, y entonces no se podría eliminar la cuenta.
let cuentaBorrandose = null;

// ¿Puede una tarea pedida para `uid` en la sesión `sesion` tocar todavía su buzón? Es de la cuenta de ahora, la
// sesión no ha cambiado y la cuenta no se está borrando.
function sigueVigente(uid, sesion) {
  return esLaCuentaDeAhora(uid) && sesion === sesionBuzon && cuentaBorrandose !== uid;
}

// ¿Ha fallado una escritura en el buzón porque no existe? `updateDoc` sobre un documento que no existe suele dar
// `not-found`, pero aquí las reglas lo rechazan antes: miran el documento resultante, y sin buzón solo tiene los
// campos que manda la escritura, así que llega como `permission-denied` (comprobado en el emulador, ver
// functions/pruebas-reglas/). Para no confundirlo con un rechazo de verdad (reglas sin publicar, por ejemplo), se
// mira si el buzón existe: cuesta una lectura, y solo cuando la escritura ha fallado.
async function faltaElBuzon(uid, err) {
  if (err && err.code === "not-found") return true;
  if (!err || err.code !== "permission-denied") return false;
  try {
    return !(await getDoc(refBuzon(uid))).exists();
  } catch (e) {
    return false;
  }
}

// Borra el buzón entero y, solo cuando el servidor lo confirma, la firma de este aparato (F1: si la firma sigue
// ahí, el borrado no llegó y la próxima apertura lo repite). Borrar un buzón que ya no existe no es un error.
// `vigente` (sigueVigente con la cuenta y la sesión de la tarea): si ya no lo es, ni se borra ni se toca la firma.
async function borrarBuzon(uid, vigente) {
  if (!vigente()) return;
  await deleteDoc(refBuzon(uid));
  if (vigente()) borrarFirmaBuzon(uid);
}

// Hace lo que ha decidido decidirBuzon (logica/buzon-avisos.js). La firma se guarda solo cuando el servidor
// confirma la escritura; si algo falla, lanza y se reintenta la próxima vez. Antes de cada escritura (y de guardar
// la firma) se mira `vigente`: una tarea de una sesión que ya terminó, o de una cuenta que se está borrando, se
// para ahí. Sobre todo antes de los `setDoc`, que son los que pueden volver a crear el buzón.
async function aplicarAlBuzon(uid, { accion, firma, quitar }, vigente) {
  if (!vigente()) return;
  if (accion === "borrar") return borrarBuzon(uid, vigente);
  if (accion !== "escribir" && accion !== "actualizarSinToken") return;
  // Idioma, interruptores y datos de pesaje, siempre los seis (logica/buzon-avisos.js, camposBuzon).
  const campos = camposBuzon(firma);

  if (accion === "actualizarSinToken") {
    // F4: `updateDoc` cambia solo estos campos (y la hora, que las reglas exigen en cada escritura): la lista de
    // aparatos se queda como está. Sin buzón, las reglas lo rechazan con `permission-denied` también con los datos
    // de pesaje (falta `tokens`): lo vigila una prueba de las reglas.
    try {
      await updateDoc(refBuzon(uid), { ...campos, actualizado: serverTimestamp() });
    } catch (err) {
      // Sin buzón no hay nada que poner al día: lo creará el primer aparato con permiso que abra la app, con estos
      // mismos valores del perfil. No es un fallo, y la firma se guarda igual para no reintentarlo hasta mañana.
      if (!(await faltaElBuzon(uid, err))) throw err;
    }
    if (vigente()) guardarFirmaBuzon(uid, firma);
    return;
  }

  try {
    // `merge` + `arrayUnion`: añade este aparato sin pisar los de los demás, y crea el buzón si no existe.
    await setDoc(refBuzon(uid), { ...campos, tokens: arrayUnion(firma.token), actualizado: serverTimestamp() }, { merge: true });
  } catch (err) {
    if (!err || err.code !== "permission-denied") throw err;
    // Lo más probable: la lista ya tiene 10 aparatos y las reglas no dejan añadir otro. Se lee y se reescribe
    // entera haciendo sitio (se van los más antiguos, ver tokensConSitio). Si no era eso, esta escritura
    // también falla y queda el aviso en la consola.
    const snap = await getDoc(refBuzon(uid));
    if (!vigente()) return;
    const tokens = tokensConSitio(snap.exists() ? snap.data().tokens : [], firma.token);
    await setDoc(refBuzon(uid), { ...campos, tokens, actualizado: serverTimestamp() });
  }
  // El navegador ha renovado el token: el viejo ya no sirve y sale de la lista ahora, sin esperar a que la
  // función falle al usarlo. Si no sale, no pasa nada: la función lo quitará en cuanto FCM lo dé por muerto.
  if (quitar && vigente()) {
    await updateDoc(refBuzon(uid), { tokens: arrayRemove(quitar), actualizado: serverTimestamp() }).catch(() => {});
  }
  if (vigente()) guardarFirmaBuzon(uid, firma);
}

// Limpieza del token de antes (ver PUSH_TOKEN_KEY): se borra una sola vez por cuenta y aparato, y la marca
// se pone solo cuando el servidor confirma el borrado (borrar un documento que no existe también vale). Un fallo
// se queda en la consola y se reintenta la próxima vez: ya nadie lee ese documento, así que no corre prisa.
async function limpiarTokenDeAntes(uid) {
  try {
    await deleteDoc(doc(db, "users", uid, "keys", PUSH_TOKEN_KEY));
    guardarLocal(claveTokenDeAntesBorrado(uid), "1");
  } catch (err) {
    console.warn("No se ha podido borrar el token de notificaciones de antes:", (err && (err.code || err.message)) || err);
  }
}

// Pone el buzón al día con el perfil: la llama app.jsx al abrirse la app y cada vez que cambian el idioma, uno de
// los dos interruptores (en este aparato o, sincronizado, en otro) o, con el recordatorio de pesaje activado, el
// seguimiento de peso (pesarse, pausar, cambiar la frecuencia); y Ajustes tras «Recibirlos aquí». Los datos de
// pesaje llegan ya preparados con datosPesajeBuzon (logica/buzon-avisos.js): **quien la llame tiene que pasarlos**;
// sin ellos, con el recordatorio activado, el buzón diría «sin seguimiento de peso» y no llegaría. Qué hace lo
// deciden planSincronizacion y decidirBuzon (logica/buzon-avisos.js); en resumen:
// - Si el navegador tiene la marca de estrenar token (se cerró sesión en él), primero lo revoca (F2).
// - Con algún aviso, apunta este aparato si tiene el permiso concedido. Las cuentas que ya tenían avisos antes del
//   buzón lo crean solas la primera vez que se abre la app. Si el navegador renueva el token, el nuevo entra en la
//   lista y el viejo sale.
// - Con algún aviso pero sin permiso (o sin token), pone al día igualmente el idioma y los interruptores, sin
//   tocar la lista (F4).
// - Sin ningún aviso, borra el buzón si este aparato tiene firma: un borrado anterior que no llegó (F1).
// - Una sola vez por cuenta y aparato, borra el token de antes (limpiarTokenDeAntes).
// Nunca lanza: si algo falla (sin conexión, reglas sin publicar...), un aviso en la consola y se reintenta la
// próxima vez (la firma solo se guarda si se ha escrito). Si mientras espera su turno, o a medias, se cierra la
// sesión o se empieza a borrar la cuenta, se para sin tocar nada más (sigueVigente).
window.sincronizarBuzonAvisos = function ({ idioma, pesaje, descongelar, pesoVecesSemana, pesoPausado, ultimaPesada }) {
  const uid = auth.currentUser && auth.currentUser.uid;
  if (!uid) return Promise.resolve();
  const sesion = sesionBuzon;
  const vigente = () => sigueVigente(uid, sesion);
  return enColaBuzon(async () => {
    if (!vigente()) return;
    const quiere = quiereAvisos({ pesaje, descongelar });
    const plan = planSincronizacion({
      quiere,
      puedeRecibir: estadoDeEsteAparato() === "concedido",
      estrenar: leerLocal(CLAVE_ESTRENAR_TOKEN),
      tokenDeAntesBorrado: leerLocal(claveTokenDeAntesBorrado(uid)),
    });

    // F2: si tocaba revocar y no se ha podido (sin conexión), la marca se queda y no se pide token: saldría el de
    // siempre, que podría seguir en el buzón de la cuenta anterior. Esta vez el buzón se pone al día sin token.
    const revocado = plan.revocar ? await revocarTokenDeEsteNavegador() : true;
    // Si la sesión ha cambiado mientras se revocaba (cerrar sesión no espera más de 3 s), no se sigue y la marca se
    // queda: como mucho, la próxima cuenta revoca otra vez, que es lo seguro.
    if (!vigente()) return;
    if (plan.revocar && revocado) borrarLocal(CLAVE_ESTRENAR_TOKEN);
    let token = null;
    if (plan.pedirToken && revocado) {
      try {
        token = await tokenDeEsteDispositivo();
      } catch (err) {
        console.warn("No se ha podido obtener el token de notificaciones:", (err && (err.code || err.message)) || err);
      }
    }

    try {
      const datos = { idioma, pesaje, descongelar, pesoVecesSemana, pesoPausado, ultimaPesada };
      await aplicarAlBuzon(uid, decidirBuzon({ quiere, token, anterior: leerFirmaBuzon(uid), ...datos }), vigente);
    } catch (err) {
      console.warn("No se ha podido poner al día el buzón de avisos:", (err && (err.code || err.message)) || err);
    }

    if (plan.limpiarTokenDeAntes && vigente()) await limpiarTokenDeAntes(uid);
  }).catch((err) => {
    console.warn("No se ha podido poner al día el buzón de avisos:", (err && (err.code || err.message)) || err);
  });
};

// Al cerrar sesión, este aparato sale del buzón de la cuenta (logica/buzon-avisos.js, decidirAlSalir): si después
// entra otra persona con su cuenta en el mismo navegador, no le llegan los avisos de la anterior. Se usa el token
// apuntado en la firma, sin pedírselo a FCM, para no hacer esperar al cierre de sesión. La firma cambia solo
// cuando el servidor lo confirma; si no llega a tiempo (sin conexión), lo arregla la marca de estrenar token que
// pone signOutUser. `sesion` es la de quien cierra la sesión: si la escritura llega tarde (la cuenta vuelve a
// entrar en esta misma visita y Firestore manda entonces lo pendiente), la sesión ya es otra y no se guarda una
// firma vieja encima de la que haya escrito la nueva.
async function quitarEsteAparatoDelBuzon(uid, sesion) {
  if (!sigueVigente(uid, sesion)) return;
  const { quitar, firma } = decidirAlSalir(leerFirmaBuzon(uid));
  if (!quitar) return;
  try {
    await updateDoc(refBuzon(uid), { tokens: arrayRemove(quitar), actualizado: serverTimestamp() });
  } catch (err) {
    if (!(await faltaElBuzon(uid, err))) throw err; // sin buzón, el aparato ya no está en ninguna lista
  }
  if (sigueVigente(uid, sesion)) guardarFirmaBuzon(uid, firma);
}

// Quitar los dos avisos: borra el buzón entero, para que las funciones dejen de mandar nada a esta cuenta en
// ningún aparato (los interruptores son de la cuenta: quitarlos en uno los quita en todos), y revoca el token de
// este navegador. El orden importa (F1):
// - La firma, lo primero y sin esperar a la fila (una que diga «borrar» y nunca esté al día, firmaAlQuitarAvisos):
//   si la app se cierra enseguida, queda apuntado que falta borrar, y la próxima apertura lo hace
//   (sincronizarBuzonAvisos). Solo se quita cuando el servidor confirma el borrado.
// - Después el buzón, que es lo que de verdad consultan las funciones.
// - La revocación, al final: es una llamada a FCM que puede tardar, y si algo se queda a medias, mejor que sea
//   eso. Antes iba la primera y, con la app cerrada a los pocos segundos, el buzón no llegaba a borrarse.
// Si cuando le llega el turno la sesión ya es otra, no hace nada: la firma «borrar» se queda para cuando la cuenta
// vuelva, y el token lo revoca la marca de estrenar token que deja cerrar sesión (revocarlo ahora podría matar el
// que acaba de apuntar la cuenta nueva).
// Nunca lanza: se llama al desmarcar la casilla sin que la interfaz tenga que gestionar un posible error.
window.disablePushNotifications = function () {
  const uid = auth.currentUser && auth.currentUser.uid;
  const sesion = sesionBuzon;
  const vigente = () => sigueVigente(uid, sesion);
  if (uid) guardarFirmaBuzon(uid, firmaAlQuitarAvisos(leerFirmaBuzon(uid)));
  return enColaBuzon(async () => {
    if (!vigente()) return;
    try {
      await borrarBuzon(uid, vigente);
    } catch (err) {
      console.warn("No se ha podido borrar el buzón de avisos (se repetirá al abrir la app):", (err && (err.code || err.message)) || err);
    }
    // Si no había token, o el navegador no coopera al revocarlo, no pasa nada: lo importante era el buzón.
    if (vigente() && soportaPushNotifications()) await revocarTokenDeEsteNavegador();
  }).catch(() => {});
};

// ---------- Almacenamiento respaldado por Firestore, ligado al usuario que ha iniciado sesión ----------
// Misma forma que window.storage (get/set/delete/list), para que el resto de la app
// (app.jsx) funcione exactamente igual sin tener que tocarlo.
function makeFirestoreStorage(uid) {
  return {
    async get(key) {
      const ref = doc(db, "users", uid, "keys", key);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { key, value: snap.data().value, shared: false };
    },
    async set(key, value) {
      const ref = doc(db, "users", uid, "keys", key);
      await setDoc(ref, { value });
      return { key, value, shared: false };
    },
    async delete(key) {
      const ref = doc(db, "users", uid, "keys", key);
      await deleteDoc(ref);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const snaps = await getDocs(collection(db, "users", uid, "keys"));
      const keys = [];
      snaps.forEach((d) => {
        if (!prefix || d.id.startsWith(prefix)) keys.push(d.id);
      });
      return { keys, prefix, shared: false };
    },
  };
}

// ---------- Eliminar cuenta: borra todos los datos y la cuenta de Auth, sin dejar restos ----------
// Firebase exige una sesión "reciente" para operaciones sensibles como borrar una cuenta, así que
// primero se reautentica siempre (con Google vía popup, o con la contraseña que pase quien llama)
// y solo después se borra nada. El borrado de verdad lo hace la Cloud Function deleteAccount
// (functions/deleteAccount.js): cancela la suscripción de Stripe, borra users/{uid} entero (también el
// documento padre, que el cliente no puede tocar) y la cuenta de Auth. Hasta octubre de 2026 lo hacía este
// cliente y se quedaban la suscripción cobrando y users/{uid} con el cliente de Stripe y las cuotas. Si la
// función falla, no se borra nada aquí (sin plan B a medias). Después se limpia lo que esta cuenta guarda solo
// en el dispositivo (el período, las copias del entreno) y se cierra la sesión.
const deleteAccountCallable = httpsCallable(functions, "deleteAccount");

// Claves de `localStorage` de una cuenta (llevan su uid). Las comodidades del dispositivo (idioma, vistas,
// avisos) no son datos de nadie y se quedan.
function limpiarDispositivoDeLaCuenta(uid) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.endsWith(":" + uid) && (k.startsWith("fooddraft:") || k.startsWith("rueda-de-platos:migrated:")))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    // sin localStorage no hay nada que limpiar
  }
}

window.deleteAccount = async function (password) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay ninguna sesión activa.");

  const esGoogle = user.providerData[0]?.providerId === "google.com";
  if (esGoogle) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  } else {
    if (!password) {
      const err = new Error("Introduce tu contraseña para confirmar.");
      err.code = "needs-password";
      throw err;
    }
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  }

  const uid = user.uid;
  // Mientras la función borra, la app no puede escribir nada: un guardado automático pendiente (los datos a
  // los 0,5 s, el borrador del entreno a los 2,5 s...) que llegara después del borrado volvería a crear
  // documentos de una cuenta que ya no existe (el ID token sigue valiendo hasta que caduca). Las lecturas
  // siguen igual. Si la función falla no se ha borrado nada, así que se devuelve el almacén de siempre.
  // Lo mismo para el buzón de avisos, que no pasa por window.storage: la marca `cuentaBorrandose` hace que la fila
  // del buzón no escriba nada más en esta cuenta (sigueVigente), ni lo que ya estaba esperando ni lo que se pida
  // después. Una escritura que ya hubiera salido llega antes que el borrado, y además la función borra dos veces
  // (la segunda, después de borrar la cuenta de Auth, para las escrituras tardías). No se espera a la fila: puede
  // estar atascada sin conexión. Tras borrar, la marca se queda: esa cuenta ya no existe.
  const almacen = window.storage;
  const bloqueado = () => Promise.reject(new Error("Eliminando la cuenta: no se guarda nada"));
  window.storage = { ...almacen, set: bloqueado, delete: bloqueado };
  cuentaBorrandose = uid;
  try {
    await deleteAccountCallable();
  } catch (err) {
    window.storage = almacen;
    cuentaBorrandose = null;
    throw errorDeFuncion(err, "No se ha podido eliminar la cuenta. Inténtalo de nuevo.");
  }
  limpiarDispositivoDeLaCuenta(uid);
  // La cuenta ya no existe en el servidor, pero este navegador aún tiene su sesión: se cierra, y
  // onAuthStateChanged vuelve solo a la bienvenida.
  await signOut(auth).catch(() => {});
};

// ---------- Estado premium, en vivo ----------
// El campo "premium" de users/{uid} solo lo escribe el webhook de Stripe (ver Fase 2 y las
// reglas de Firestore) — el cliente aquí solo LEE, y lo hace con onSnapshot para que la app se
// desbloquee sola en cuanto el webhook confirme el pago, sin que el usuario tenga que recargar
// la página. app.jsx llama a esto una vez al montar y guarda el resultado en su propio estado de
// React (mismo patrón que window.storage: el puente con Firebase vive aquí, app.jsx no sabe nada
// de Firestore). Devuelve la función de "dejar de escuchar" de onSnapshot, para poder limpiarla
// si el componente se desmonta.
window.subscribePremiumStatus = function (callback) {
  const user = auth.currentUser;
  if (!user) {
    callback({ active: false });
    return () => {};
  }
  return onSnapshot(doc(db, "users", user.uid), (snap) => {
    const datos = snap.data() || {};
    callback(datos.premium || { active: false });
  });
};

// ---------- Migración: traer, una sola vez, los datos que ya hubiera en este navegador ----------
// Nunca impide cargar la app: cualquier fallo (sin conexión, localStorage bloqueado...) se queda en un aviso
// de consola. Antes, un getDoc sin conexión lanzaba dentro de onAuthStateChanged y la interfaz no llegaba a
// cargarse. Las marcas `rueda-de-platos:migrated:<uid>` son del dispositivo, no datos: no cuentan ni se copian
// (antes, en un móvil compartido, la marca de otra cuenta acababa como documento en la cuenta nueva).
async function migrateLocalDataIfNeeded(uid) {
  try {
    const localKeys = Object.keys(localStorage).filter(
      (k) => k.startsWith("rueda-de-platos:") && !k.startsWith("rueda-de-platos:migrated:")
    );
    if (!localKeys.length) return;

    const marker = `rueda-de-platos:migrated:${uid}`;
    if (localStorage.getItem(marker)) return; // ya se preguntó antes para esta cuenta en este dispositivo

    let existing;
    try {
      existing = await getDoc(doc(db, "users", uid, "keys", "rueda-de-platos:data-v1"));
    } catch (e) {
      // Sin poder leer la cuenta no se sabe si ya tiene datos: no se pregunta ni se marca; la próxima vez.
      return;
    }
    if (existing.exists()) {
      // Ya hay datos en la cuenta (quizá de otro dispositivo): no pisamos nada sin preguntar.
      localStorage.setItem(marker, "1");
      return;
    }

    const quiere = window.confirm(t(leerIdiomaGuardado(), "migracionLocal.pregunta"));
    if (quiere) {
      for (const key of localKeys) {
        const value = localStorage.getItem(key);
        await setDoc(doc(db, "users", uid, "keys", key), { value });
      }
    }
    localStorage.setItem(marker, "1");
  } catch (e) {
    console.warn("No se ha podido revisar si había datos en este dispositivo:", (e && (e.code || e.message)) || e);
  }
}

// ---------- Cerrar sesión ----------
// Hasta octubre de 2026 aquí se pegaba un botón flotante «Cerrar sesión» fuera de React (arriba a la
// derecha, z-index 9999, en todas las pantallas). Ahora el botón vive dentro de la app, en Ajustes y en
// la pantalla de alta (ui/comun/cerrar-sesion.jsx), con una confirmación; aquí solo queda el puente con
// Firebase. Al cerrarse la sesión, onAuthStateChanged (al final de este archivo) vuelve a la bienvenida.
// Antes, lo de los avisos (F2 de la revisión de noviembre):
// - Lo primero, y siempre, la marca de «estrenar token» (del navegador, sin uid). La próxima vez que cualquier
//   cuenta abra la app aquí con el permiso concedido, este navegador revoca su token y pide uno nuevo
//   (planSincronizacion). Así, si la salida del buzón no llega (sin conexión), el token viejo muere igual y la
//   cuenta que entre después no recibe los avisos de esta. Antes el aparato se quedaba apuntado sin fin: el token
//   seguía vivo porque lo usaba la cuenta nueva, así que las funciones nunca lo daban por muerto. Se pone siempre,
//   no solo si la salida falla, porque el token puede estar en el buzón aunque este aparato no lo sepa (sin firma).
// - Después, este aparato sale del buzón (quitarEsteAparatoDelBuzon), con un máximo de 3 s: sin conexión la
//   escritura no termina, y ni cerrar la sesión ni la fila del buzón pueden quedarse colgados por eso
//   (enColaBuzon, `limiteMs`).
// - Al acabar ese turno (a tiempo o no), la sesión del buzón sube (sesionBuzon): lo que siga pendiente de esta
//   sesión en la fila, también la propia salida si no llegó a empezar, ya no toca nada aunque se resuelva más
//   tarde. Sube aquí y no solo en onAuthStateChanged para que no quede ningún hueco entre el final del turno y el
//   aviso de Firebase de que la sesión se ha cerrado.
window.signOutUser = async function () {
  guardarLocal(CLAVE_ESTRENAR_TOKEN, "1");
  const uid = auth.currentUser && auth.currentUser.uid;
  const sesion = sesionBuzon;
  if (uid) await enColaBuzon(() => quitarEsteAparatoDelBuzon(uid, sesion), { limiteMs: 3000 }).catch(() => {});
  sesionBuzon++;
  return signOut(auth);
};

// ---------- Bandera de un idioma, dibujada a mano en SVG ----------
// Copia exacta de la de app.jsx — no se comparte entre los dos archivos porque no hay ninguna capa
// de componentes UI compartida entre auth-bootstrap.jsx y app.jsx (logica/ es solo lógica sin JSX,
// ver CLAUDE.md), y son cinco SVG pequeños, no compensa montar nada para evitar esta duplicación.
// No se usan emoji de bandera a propósito: catalán, gallego y euskera no tienen código de país
// ISO, así que su emoji de bandera no existe de forma fiable en la mayoría de sistemas.
function FlagIcon({ lang, size = 20 }) {
  const w = Math.round(size * 1.5);
  const vb = "0 0 30 20";
  const wrapStyle = { borderRadius: 3, display: "block", flexShrink: 0 };
  if (lang === "es") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }
  if (lang === "en") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#00247D" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="6" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#CF142B" strokeWidth="3" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#CF142B" strokeWidth="3" />
      </svg>
    );
  }
  if (lang === "ca") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#FCDD09" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={(20 / 9) * i} width="30" height={20 / 9} fill="#DA121A" />
        ))}
      </svg>
    );
  }
  if (lang === "gl") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#fff" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#0090C4" strokeWidth="5" />
      </svg>
    );
  }
  if (lang === "eu") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#D52B1E" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="5" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="5" />
      </svg>
    );
  }
  return null;
}

// ---------- Selector de idioma (bienvenida/login) ----------
// Solo cambia el idioma de estas pantallas de antes de iniciar sesión (y se recuerda en
// localStorage vía guardarIdiomaLocal, ver logica/i18n.js) — una vez dentro de la app con sesión
// iniciada, manda perfil.idioma, elegible también desde Perfil (Ajustes, en el menú lateral).
function IdiomaSwitch({ idioma, onChange }) {
  return (
    <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 5 }}>
      {IDIOMAS_DISPONIBLES.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          aria-label={i.label}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "3px 5px 4px", borderRadius: 8, border: "1.5px solid",
            borderColor: idioma === i.key ? "#1f4d38" : "transparent",
            background: "#fffdf7", cursor: "pointer",
          }}
        >
          <FlagIcon lang={i.key} size={15} />
          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9, fontWeight: 700, color: idioma === i.key ? "#1f4d38" : "#6b6a5e" }}>
            {i.key.toUpperCase()}
          </span>
        </button>
      ))}
    </div>
  );
}

// ---------- Pantalla de login ----------
// ---------- Pantalla de bienvenida (antes del login) ----------
function WelcomeScreen({ onLogin, idioma, onChangeIdioma }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <IdiomaSwitch idioma={idioma} onChange={onChangeIdioma} />
      <div style={{ width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🍽️</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, color: "#1f4d38", marginBottom: 8 }}>FoodDraft</div>
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 15, color: "#6b6a5e", maxWidth: 260, margin: "0 auto", lineHeight: 1.5 }}>
          {t(idioma, "app.eslogan")}
        </div>
        <div style={{ width: 120, height: 120, margin: "1.5rem auto", borderRadius: "50%", border: "6px solid #d9a441", borderTopColor: "#2f6b4f", borderRightColor: "#6b4423" }} />
        <div style={{ marginTop: "2.5rem" }}>
          <button
            onClick={onLogin}
            style={{ background: "none", border: "none", color: "#1f4d38", fontSize: 13, fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            {t(idioma, "welcome.iniciarSesion")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Envuelve el login: primero la bienvenida, y solo al pulsar "Iniciar sesión" aparece el formulario real.
// El idioma elegido aquí (o el recordado de la última vez) se comparte entre ambas pantallas y se
// guarda en localStorage, para que sobreviva a un cierre de sesión y sirva de punto de partida al
// crear una cuenta nueva (ver migrateData/ProfileOnboarding en app.jsx).
function LoggedOutFlow() {
  const [showLogin, setShowLogin] = useState(false);
  const [idioma, setIdioma] = useState(() => leerIdiomaGuardado());
  // <html lang> al día con el idioma elegido (lectores de pantalla, guiones, traductor del navegador): el de
  // index.html es fijo («es»). Dentro de la app lo pone app.jsx.
  // Los correos que manda Firebase (cambiar la contraseña, verificar el email) salen en `auth.languageCode`:
  // con el idioma de esta pantalla le llegan a cada persona en el suyo y no en el de la consola. Si Firebase
  // no tuviera plantilla para alguno, usa la de por defecto del proyecto.
  React.useEffect(() => {
    document.documentElement.lang = idioma;
    auth.languageCode = idioma;
  }, [idioma]);

  function cambiarIdioma(nuevo) {
    setIdioma(nuevo);
    guardarIdiomaLocal(nuevo);
  }

  return showLogin
    ? <LoginScreen idioma={idioma} onChangeIdioma={cambiarIdioma} />
    : <WelcomeScreen onLogin={() => setShowLogin(true)} idioma={idioma} onChangeIdioma={cambiarIdioma} />;
}

// ---------- Pantalla de "por qué existe esta app" (se muestra una sola vez, justo tras completar
// o saltar el perfil por primera vez). No toca nada de app.jsx: vigila los datos guardados desde fuera.
// Textos en los cinco idiomas (`historia.*`), con el idioma del perfil recién creado. ----------
function HistoriaScreen({ onClose, idioma }) {
  // «fatiga de decisión» va en cursiva dentro del primer párrafo: el texto trae el hueco {fatiga}.
  const [antesFatiga, despuesFatiga] = t(idioma, "historia.p1").split("{fatiga}");
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#f1ede0",
        overflowY: "auto", fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "#1f4d38" }}>{t(idioma, "historia.titulo")}</div>
        </div>

        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.7, color: "#2b2b26", margin: "0 0 14px" }}>
          {antesFatiga}<em>{t(idioma, "historia.fatiga")}</em>{despuesFatiga}
        </p>
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 14.5, lineHeight: 1.7, color: "#2b2b26", margin: "0 0 22px" }}>
          {t(idioma, "historia.p2")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 26 }}>
          {[
            ["🔄", "historia.variedad"],
            ["🧠", "historia.decisiones"],
            ["🌱", "historia.obsesion"],
          ].map(([icon, clave]) => [icon, t(idioma, clave + ".titulo"), t(idioma, clave + ".desc")]).map(([icon, title, desc]) => (
            <div key={title} style={{ background: "#fffdf7", border: "1px solid #ddd6bf", borderRadius: 9, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1f4d38" }}>{title}</div>
                <div style={{ fontSize: 11.5, color: "#6b6a5e" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", background: "#2f6b4f", color: "#fff", border: "none", borderRadius: 9, padding: 12, fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
        >
          {t(idioma, "historia.vamos")}
        </button>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#6b6a5e", fontSize: 12, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            {t(idioma, "historia.saltar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Vigila (desde fuera, sin tocar app.jsx) el momento en que se completa o se salta el perfil por primera
// vez, y muestra HistoriaScreen justo entonces. Si el perfil ya estaba resuelto de antes (usuario ya
// conocido), no se muestra nunca — es solo para la primera vez.
function watchForFirstProfileCompletion(uid) {
  const dataDocRef = doc(db, "users", uid, "keys", "rueda-de-platos:data-v1");
  let unsub = null;

  function showOverlay(idioma) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const overlayRoot = ReactDOM.createRoot(container);
    overlayRoot.render(
      <HistoriaScreen
        idioma={idioma}
        onClose={() => {
          overlayRoot.unmount();
          container.remove();
        }}
      />
    );
  }

  // Si la lectura falla (sin conexión al abrir), no se sabe si el usuario es nuevo: no se vigila nada. Antes
  // se tomaba por nuevo, se ponía a escuchar y, al volver la red, enseñaba la pantalla a un usuario de
  // siempre (parte del riesgo D1 del diagnóstico de octubre de 2026). Un usuario nuevo de verdad que abra la
  // app sin conexión solo se pierde esta pantalla de bienvenida.
  getDoc(dataDocRef)
    .catch(() => "error")
    .then((snap) => {
      if (snap === "error") return;
      let yaResuelto = false;
      if (snap && snap.exists()) {
        try {
          yaResuelto = !!JSON.parse(snap.data().value).perfilOnboardingDone;
        } catch (e) {}
      }
      if (yaResuelto) return; // usuario ya conocido: no volver a mostrarla

      unsub = onSnapshot(dataDocRef, (s) => {
        if (!s.exists()) return;
        try {
          const guardado = JSON.parse(s.data().value);
          if (guardado.perfilOnboardingDone) {
            showOverlay((guardado.perfil && guardado.perfil.idioma) || leerIdiomaGuardado());
            if (unsub) unsub();
          }
        } catch (e) {}
      });
    });
}

// Adónde vuelve quien abre el enlace de un correo de Firebase y pulsa «Continuar»: la propia app, en la
// dirección donde esté (GitHub Pages en producción, localhost en desarrollo). Las dos son dominios autorizados
// de su proyecto; si no lo fueran, Firebase rechazaría el envío.
const urlVueltaCorreos = () => new URL("./", location.href).href;

// Los errores de Firebase Authentication, en el idioma de la pantalla (los usan LoginScreen y
// VerificarCorreoScreen). Uno sin traducir sale con su código.
function traducirErrorAuth(idioma, code) {
  const map = {
    "auth/invalid-email": "error.emailInvalido",
    "auth/user-not-found": "error.usuarioNoExiste",
    "auth/wrong-password": "error.passwordIncorrecta",
    "auth/invalid-credential": "error.credencialInvalida",
    "auth/email-already-in-use": "error.emailEnUso",
    "auth/weak-password": "error.passwordDebil",
    "auth/popup-closed-by-user": "error.popupCerrado",
    // Tras varios intentos fallidos (o envíos de correo seguidos) Firebase frena un rato: antes salía el código.
    "auth/too-many-requests": "error.demasiadosIntentos",
    "auth/network-request-failed": "error.sinConexion",
  };
  return map[code] ? t(idioma, map[code]) : t(idioma, "error.generico", { code });
}

function LoginScreen({ idioma, onChangeIdioma }) {
  // login | signup | recuperar («¿Olvidaste tu contraseña?», etapa 1 de la auditoría de noviembre, R15: hasta
  // entonces olvidarla era perder la cuenta y sus datos).
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Clave del aviso (no el texto): así sigue al cambio de idioma.
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(false);

  function cambiarModo(nuevo) {
    setMode(nuevo);
    setError("");
    setAviso("");
  }

  const traducirError = (code) => traducirErrorAuth(idioma, code);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setAviso("");
    setLoading(true);
    try {
      if (mode === "recuperar") {
        try {
          await sendPasswordResetEmail(auth, email.trim(), { url: urlVueltaCorreos() });
        } catch (err) {
          // Que no exista la cuenta se contesta igual que si existe: si no, esta pantalla serviría para
          // averiguar qué correos usan la app (Firebase, con su protección contra la enumeración de correos,
          // ya ni siquiera lo distingue). Los demás errores sí se dicen: email mal escrito, sin red...
          if (err.code !== "auth/user-not-found") throw err;
        }
        setAviso("login.enlaceEnviado");
      } else if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf",
    fontSize: 14, boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif",
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box" }}>
      <IdiomaSwitch idioma={idioma} onChange={onChangeIdioma} />
      <div style={{ background: "#fffdf7", borderRadius: 14, padding: "28px 26px", width: "100%", maxWidth: 340, border: "1px solid #ddd6bf", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🍽️</div>
          <div style={{ fontSize: 20, color: "#1f4d38", fontFamily: "Georgia, 'Times New Roman', serif" }}>FoodDraft</div>
          <div style={{ fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {mode === "login" ? t(idioma, "login.subtituloLogin") : mode === "signup" ? t(idioma, "login.subtituloSignup") : t(idioma, "login.subtituloRecuperar")}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder={t(idioma, "login.email")} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          {mode !== "recuperar" && (
            <input type="password" required placeholder={t(idioma, "login.password")} value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginTop: 10 }} />
          )}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); cambiarModo("recuperar"); }} style={{ color: "#2f6b4f", fontSize: 12 }}>
                {t(idioma, "login.olvidaste")}
              </a>
            </div>
          )}
          {error && <div style={{ color: "#9c4a2b", fontSize: 12, marginTop: 8 }}>{error}</div>}
          {aviso && <div role="status" style={{ color: "#1f4d38", fontSize: 12.5, lineHeight: 1.45, marginTop: 10 }}>{t(idioma, aviso)}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 14, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2f6b4f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {loading
              ? t(idioma, "login.entrando")
              : mode === "login" ? t(idioma, "login.iniciarSesion") : mode === "signup" ? t(idioma, "login.crearCuenta") : t(idioma, "login.enviarEnlace")}
          </button>
        </form>

        {/* Las cuentas de Google no tienen contraseña de la app: al recuperar, el botón sobra. */}
        {mode !== "recuperar" && (
          <button onClick={handleGoogle} disabled={loading} style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf", background: "#fff", color: "#2b2b26", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
            {t(idioma, "login.continuarGoogle")}
          </button>
        )}

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: "#6b6a5e" }}>
          {mode === "login" ? (
            <span>
              {t(idioma, "login.noTienesCuenta")}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); cambiarModo("signup"); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                {t(idioma, "login.creaAqui")}
              </a>
            </span>
          ) : mode === "signup" ? (
            <span>
              {t(idioma, "login.yaTienesCuenta")}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); cambiarModo("login"); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
                {t(idioma, "login.iniciaSesionLink")}
              </a>
            </span>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); cambiarModo("login"); }} style={{ color: "#2f6b4f", fontWeight: 700 }}>
              {t(idioma, "login.volverLogin")}
            </a>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#a5a394" }}>
          <a href="privacidad.html" style={{ color: "#a5a394" }}>{t(idioma, "login.privacidad")}</a>
          {" · "}
          <a href="terminos.html" style={{ color: "#a5a394" }}>{t(idioma, "login.terminos")}</a>
        </div>
      </div>
    </div>
  );
}

// ---------- Verificar el email (etapa 1 de la auditoría de noviembre, R15) ----------
// Una cuenta de correo y contraseña no entra en la app hasta abrir el enlace del correo de verificación:
// verificación estricta, decidida por Pablo el 3-nov-2026 (y las reglas de Firestore exigen lo mismo). Así el
// correo de cada cuenta es real y de esa persona: es por donde se recupera la contraseña y por donde se la
// puede contactar (derechos, una brecha). Las cuentas de Google llegan ya verificadas y no pasan por aquí.
const necesitaVerificar = (user) => !user.emailVerified && user.providerData.some((p) => p.providerId === "password");

// Cuándo se mandó desde este dispositivo el último correo de verificación de una cuenta (ms): para decir «te
// hemos enviado» solo si es verdad y para no dejar reenviar antes de un minuto (los envíos seguidos los frena
// Firebase con «too-many-requests»). Comodidad del dispositivo, con el uid en la clave: se borra con la cuenta
// (limpiarDispositivoDeLaCuenta).
const claveEnvioVerificacion = (uid) => `fooddraft:verificacion-enviada:${uid}`;
const ESPERA_REENVIO_MS = 60 * 1000;
function leerEnvioVerificacion(uid) {
  try {
    return Number(localStorage.getItem(claveEnvioVerificacion(uid))) || 0;
  } catch (e) {
    return 0;
  }
}
async function enviarVerificacion(user) {
  await sendEmailVerification(user, { url: urlVueltaCorreos() });
  try {
    localStorage.setItem(claveEnvioVerificacion(user.uid), String(Date.now()));
  } catch (e) {
    // sin localStorage, la pantalla no recordará el envío: solo cambia el texto
  }
}

function VerificarCorreoScreen({ user, onVerificado }) {
  const [idioma, setIdioma] = useState(() => leerIdiomaGuardado());
  const [enviadoEn, setEnviadoEn] = useState(() => leerEnvioVerificacion(user.uid));
  const [ahora, setAhora] = useState(() => Date.now());
  const [estado, setEstado] = useState(""); // "" | enviando | comprobando
  // { error: bool, clave } o { error: true, code }: se traduce al pintar, para que siga el cambio de idioma.
  const [mensaje, setMensaje] = useState(null);
  const entrado = React.useRef(false);

  React.useEffect(() => {
    document.documentElement.lang = idioma;
    auth.languageCode = idioma;
  }, [idioma]);

  function cambiarIdioma(nuevo) {
    setIdioma(nuevo);
    guardarIdiomaLocal(nuevo);
  }

  async function enviar() {
    setEstado("enviando");
    setMensaje(null);
    try {
      await enviarVerificacion(user);
      setEnviadoEn(Date.now());
      setAhora(Date.now());
      setMensaje({ error: false, clave: "verificar.enviado" });
    } catch (err) {
      setMensaje({ error: true, code: err.code });
    } finally {
      setEstado("");
    }
  }

  // ¿Ya está verificado? `reload` trae el estado de Firebase; el token guardado sigue diciendo «sin verificar»
  // hasta renovarlo, y las reglas de Firestore miran el token (email_verified): por eso se renueva antes de
  // entrar, o la primera lectura de la app fallaría. En silencio (al volver a la pestaña) no enseña nada si aún
  // no lo está.
  async function comprobar(silencioso) {
    if (entrado.current) return;
    if (!silencioso) {
      setEstado("comprobando");
      setMensaje(null);
    }
    try {
      await user.reload();
      const actual = auth.currentUser;
      if (actual && actual.emailVerified && !entrado.current) {
        entrado.current = true;
        await actual.getIdToken(true);
        onVerificado(actual);
        return;
      }
      if (!silencioso) setMensaje({ error: true, clave: "verificar.todaviaNo" });
    } catch (err) {
      if (!silencioso) setMensaje({ error: true, code: err.code });
    } finally {
      if (!silencioso) setEstado("");
    }
  }

  // Una cuenta recién creada recibe el primer correo sola (lo pide esta pantalla y no el formulario de alta, que
  // se desmonta en cuanto Firebase crea la cuenta). Una cuenta de antes de que existiera la verificación no
  // recibe nada hasta que lo pida con el botón: nadie se encuentra un correo que no esperaba.
  React.useEffect(() => {
    const creada = Date.parse(user.metadata && user.metadata.creationTime) || 0;
    if (!leerEnvioVerificacion(user.uid) && Date.now() - creada < 10 * 60 * 1000) enviar();
  }, []);

  // Quien abre el enlace en el mismo móvil vuelve a esta pestaña: se comprueba solo, sin tener que pulsar nada.
  React.useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") comprobar(true);
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, []);

  // Cuenta atrás del reenvío, segundo a segundo mientras dura.
  const restante = Math.max(0, Math.ceil((enviadoEn + ESPERA_REENVIO_MS - ahora) / 1000));
  React.useEffect(() => {
    if (restante <= 0) return undefined;
    const id = setTimeout(() => setAhora(Date.now()), 1000);
    return () => clearTimeout(id);
  }, [ahora, enviadoEn]);

  const ocupado = estado !== "";
  const botonPrincipal = { width: "100%", marginTop: 16, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2f6b4f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const botonSecundario = { width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6bf", background: "#fff", color: "#2b2b26", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
  const textoReenviar = restante > 0 ? t(idioma, "verificar.reenviarEn", { segundos: restante }) : t(idioma, "verificar.reenviar");
  const textoComprobar = estado === "comprobando" ? t(idioma, "verificar.comprobando") : t(idioma, "verificar.yaVerificado");

  // Con un correo ya enviado, lo principal es «Ya lo he verificado»; si aún no se ha enviado ninguno (cuenta de
  // antes), lo principal es pedirlo, pero se puede comprobar igual por si se verificó desde otro dispositivo.
  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", padding: 20, boxSizing: "border-box" }}>
      <IdiomaSwitch idioma={idioma} onChange={cambiarIdioma} />
      <div style={{ background: "#fffdf7", borderRadius: 14, padding: "28px 26px", width: "100%", maxWidth: 360, border: "1px solid #ddd6bf", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>✉️</div>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 20, color: "#1f4d38", fontFamily: "Georgia, 'Times New Roman', serif" }}>{t(idioma, "verificar.titulo")}</h1>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#2b2b26", margin: "0 0 10px" }}>
          {t(idioma, enviadoEn ? "verificar.textoEnviado" : "verificar.textoSinEnviar", { email: user.email })}
        </p>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#6b6a5e", margin: "0 0 6px" }}>{t(idioma, "verificar.porque")}</p>
        {enviadoEn > 0 && <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#6b6a5e", margin: 0 }}>{t(idioma, "verificar.spam")}</p>}

        {mensaje && (
          <div role="status" style={{ color: mensaje.error ? "#9c4a2b" : "#1f4d38", fontSize: 12.5, lineHeight: 1.45, marginTop: 12 }}>
            {mensaje.code ? traducirErrorAuth(idioma, mensaje.code) : t(idioma, mensaje.clave)}
          </div>
        )}

        {enviadoEn ? (
          <>
            <button onClick={() => comprobar(false)} disabled={ocupado} style={botonPrincipal}>{textoComprobar}</button>
            <button onClick={enviar} disabled={ocupado || restante > 0} style={{ ...botonSecundario, opacity: restante > 0 ? 0.6 : 1 }}>
              {estado === "enviando" ? t(idioma, "login.entrando") : textoReenviar}
            </button>
          </>
        ) : (
          <>
            <button onClick={enviar} disabled={ocupado} style={botonPrincipal}>
              {estado === "enviando" ? t(idioma, "login.entrando") : t(idioma, "verificar.enviar")}
            </button>
            <button onClick={() => comprobar(false)} disabled={ocupado} style={botonSecundario}>{textoComprobar}</button>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => signOut(auth)}
            style={{ background: "none", border: "none", color: "#6b6a5e", fontSize: 12.5, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}
          >
            {t(idioma, "verificar.cerrarSesion")}
          </button>
        </div>
      </div>
    </div>
  );
}

// privacidad.html/terminos.html ya tienen su propio selector ES/EN y leen/guardan el idioma con el
// mismo logica/i18n.js (ver su <script type="module">) — no heredan el idioma de esta pantalla vía
// props porque son páginas HTML sueltas, no parte de esta SPA, así que abren siempre con el idioma
// que ya estuviera guardado en localStorage.
function LoadingScreen() {
  const idioma = leerIdiomaGuardado();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1ede0", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#6b6a5e" }}>
      {t(idioma, "loading.cargando")}
    </div>
  );
}

// ---------- Arranque ----------
// Se reutiliza SIEMPRE el mismo "root" de React (login, carga, o la app real),
// para evitar el problema de montar dos raíces distintas sobre el mismo hueco del DOM.
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(LoadingScreen));

// La interfaz (app.jsx y los archivos de ui/) se descarga y se prepara una sola vez, con
// cargador-ui.js, y solo se ejecuta cuando window.storage ya está listo (tras iniciar sesión).
let mainAppModulePromise = null;
function loadMainApp() {
  if (!mainAppModulePromise) {
    mainAppModulePromise = cargarApp({ base: "./" });
  }
  return mainAppModulePromise;
}

async function entrarEnLaApp(user) {
  window.storage = makeFirestoreStorage(user.uid);
  window.authProvider = user.providerData[0]?.providerId === "google.com" ? "google" : "password";
  // Identificador de la cuenta para lo que se guarda solo en el dispositivo y no debe ver otra cuenta que
  // inicie sesión en el mismo móvil (hoy, el período: ui/cuerpo/periodo.jsx).
  window.cuentaId = user.uid;
  await migrateLocalDataIfNeeded(user.uid);
  watchForFirstProfileCompletion(user.uid);
  const mod = await loadMainApp();
  root.render(React.createElement(mod.default));
}

onAuthStateChanged(auth, async (user) => {
  // Se ha entrado o salido: empieza otra sesión del buzón de avisos, y lo que quede en su fila de la anterior ya no
  // toca nada (sesionBuzon, sigueVigente).
  sesionBuzon++;
  if (!user) {
    root.render(React.createElement(LoggedOutFlow));
    return;
  }
  // Sin verificar, ni window.storage ni ninguna lectura: solo la pantalla de verificación. Al verificar no salta
  // onAuthStateChanged (la sesión es la misma), así que la propia pantalla abre la app.
  if (necesitaVerificar(user)) {
    root.render(
      React.createElement(VerificarCorreoScreen, {
        user,
        onVerificado: (verificado) => {
          root.render(React.createElement(LoadingScreen));
          entrarEnLaApp(verificado);
        },
      })
    );
    return;
  }
  await entrarEnLaApp(user);
});
