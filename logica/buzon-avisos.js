// ---------- logica/buzon-avisos.js ----------
// Buzón de avisos (auditoría de noviembre de 2026, R8 y R17): las decisiones, sin tocar Firebase, sobre lo que hace
// la app con `users/{uid}/avisos/push`, el documento que leen las funciones de notificaciones
// (`sendWeighInReminders`, `sendDefrostReminders`) para saber a quién avisar, en qué idioma y a qué aparatos.
// Lo que toca Firebase (pedir el token, escribir, borrar) vive en auth-bootstrap.jsx (`window.sincronizarBuzonAvisos`,
// `window.disablePushNotifications`, `window.signOutUser`) y se limita a hacer lo que se decide aquí. Así lo
// delicado, que es dónde estaban los fallos de la revisión independiente (F1-F4), se prueba en validacion/ sin red.
//
// Por qué existe: antes las funciones descubrían a quién avisar leyendo todos los documentos de todas las
// cuentas dos veces al día (coste que crece con los datos de todo el mundo y datos de salud leídos sin
// necesidad), y cada cuenta guardaba un solo token, así que activar los avisos en un aparato los quitaba sin
// decir nada del anterior. La forma del documento y sus límites están en firestore.rules.
//
// La «firma» (`localStorage`, `fooddraft:buzon-avisos:<uid>`): lo que este aparato dejó escrito la última vez en
// el buzón de una cuenta, `{ token, idioma, pesaje, descongelar, dia }`. `token` es `null` cuando escribió sin token
// (aparato sin permiso de notificaciones, F4). Sirve para tres cosas:
// 1. No reescribir el buzón cada vez que se abre la app: basta con una vez al día o cuando algo cambia.
// 2. Saber qué token quitar de la lista cuando el navegador lo renueva o se cierra la sesión.
// 3. Como «tarea pendiente»: solo se borra cuando el servidor confirma que el buzón se ha borrado. Si sigue ahí sin
//    ningún aviso activado, aquel borrado no llegó y se repite (F1).
import { fechaISO } from "peso";

// El mismo tope que firestore.rules (`datos.tokens.size() <= 10`): un móvil, un ordenador, una tableta y los
// tokens que el navegador renueva entre medias caben de sobra. Si cambia uno, cambia el otro (una prueba de las
// reglas lee este número de aquí).
export const MAX_DISPOSITIVOS = 10;

// ---------- Claves del aparato (`localStorage`) ----------
// Las dos de cada cuenta llevan el uid al final, como el resto de comodidades del dispositivo atadas a una cuenta:
// «Eliminar cuenta» las limpia con las demás (limpiarDispositivoDeLaCuenta, auth-bootstrap.jsx, borra las
// `fooddraft:…:<uid>`). La de estrenar token es del navegador, no de una cuenta: no lleva uid a propósito, porque
// la tiene que leer la cuenta que entre después, sea cual sea.
export const claveFirmaBuzon = (uid) => `fooddraft:buzon-avisos:${uid}`;
// Marca de la limpieza del token de antes (`rueda-de-platos:push-token-v1`): ya borrado en esta cuenta desde este
// aparato. Sin ella se borraría en cada apertura, y borrar cuesta una escritura aunque el documento no exista.
export const claveTokenDeAntesBorrado = (uid) => `fooddraft:push-token-v1-borrado:${uid}`;
// Puesta al cerrar sesión (F2): «este navegador tiene que estrenar token antes de volver a usar los avisos».
export const CLAVE_ESTRENAR_TOKEN = "fooddraft:avisos-estrenar-token";

// ¿Quiere la cuenta algún aviso? Los dos interruptores de Ajustes son de la cuenta (`perfil.notificacionesPush`
// para el pesaje y `perfil.avisoDescongelar`): sin ninguno no hace falta buzón.
export function quiereAvisos({ pesaje, descongelar }) {
  return !!(pesaje || descongelar);
}

// En qué situación está este aparato con las notificaciones, a partir de lo que dice el navegador
// (`Notification.permission`): «concedido» (puede recibirlas), «bloqueado» (el navegador las tiene denegadas: la
// app ya no puede volver a preguntar, solo la persona desde los ajustes del navegador), «sin-pedir» (aún no se ha
// preguntado, o se cerró la pregunta sin contestar) o «sin-soporte» (navegador sin notificaciones push, como Safari
// en el iPhone sin instalar la app). Un valor que el navegador invente en el futuro cuenta como «sin-pedir»: lo
// peor que pasa es ofrecer el botón y que el navegador conteste.
export function estadoDelPermiso({ soporta, permiso }) {
  if (!soporta) return "sin-soporte";
  if (permiso === "granted") return "concedido";
  if (permiso === "denied") return "bloqueado";
  return "sin-pedir";
}

// F3: qué decir en Ajustes sobre este aparato. Los interruptores son de la cuenta, así que en un aparato que nunca
// dio el permiso Ajustes dice «activado» aunque ahí no llegue nada. Antes la única salida era apagar y encender,
// y eso borraba el buzón entero (con un solo aviso activado) y dejaba sin avisos a los demás aparatos.
// - `"recibir"`: hay algún aviso y este aparato aún no ha dado el permiso → «En este aparato no te llegan» con el
//   botón «Recibirlos aquí», que pide el permiso y apunta el aparato sin tocar los interruptores.
// - `"bloqueado"`: el navegador los tiene bloqueados → se explica cómo desbloquearlos (un botón no serviría:
//   el navegador ya no deja preguntar).
// - `null`: sin avisos, con el permiso ya concedido o sin soporte (no hay nada que ofrecer).
export function avisoEsteAparato({ quiere, estado }) {
  if (!quiere) return null;
  if (estado === "sin-pedir") return "recibir";
  if (estado === "bloqueado") return "bloqueado";
  return null;
}

// Lo que este aparato deja escrito en el buzón, con el día (ver «La firma», arriba). Sin token, `null`.
export function firmaBuzon({ token, idioma, pesaje, descongelar }, fecha = new Date()) {
  return { token: token || null, idioma, pesaje: !!pesaje, descongelar: !!descongelar, dia: fechaISO(fecha) };
}

// ¿Hay que escribir? No, si la última escritura de este dispositivo fue hoy y con exactamente lo mismo. Una
// firma vieja con otra forma (o ninguna) obliga a escribir: es lo seguro, cuesta una escritura.
// Por qué una vez al día aunque nada cambie: el buzón puede haber cambiado sin que este aparato lo sepa (otro
// aparato lo borró y lo volvió a crear sin este token, se hizo sitio en una lista llena quitándolo, una función lo
// quitó tras un fallo de FCM...). La reescritura diaria lo vuelve a apuntar. `actualizado` no dice nada de cada
// aparato: es la hora de la última escritura de cualquiera de ellos, de la cuenta entera.
export function buzonAlDia(guardada, nueva) {
  if (!guardada || typeof guardada !== "object") return false;
  return ["token", "idioma", "pesaje", "descongelar", "dia"].every((k) => guardada[k] === nueva[k]);
}

// La lista de aparatos cuando ya no cabe uno más (las reglas rechazan el undécimo): este token al final, sin
// repetidos ni nada que no sea un texto, y de los demás solo los más recientes. La lista se va llenando por el
// final (`arrayUnion` añade detrás), así que los primeros son los más antiguos: lo más probable es que sean
// tokens que el navegador ya renovó y que las funciones aún no han podido quitar.
export function tokensConSitio(tokens, token, maximo = MAX_DISPOSITIVOS) {
  const otros = (Array.isArray(tokens) ? tokens : []).filter((t) => typeof t === "string" && t !== "" && t !== token);
  const caben = Math.max(0, maximo - 1);
  return [...otros.slice(Math.max(0, otros.length - caben)), token];
}

// ---------- Sincronizar: qué se hace al abrir la app y al cambiar un aviso o el idioma ----------
// Primero, lo que no depende del buzón:
// - `revocar` (F2): este navegador tiene la marca de estrenar token y el permiso concedido. El token de siempre
//   puede seguir apuntado en el buzón de la cuenta que cerró sesión sin conexión; revocarlo lo mata para todos los
//   buzones a la vez (FCM lo da por muerto y las funciones lo quitan solas en su siguiente envío). Se hace aunque la
//   cuenta de ahora no quiera avisos: si no, al navegador le seguirían llegando los de la anterior. Sin permiso no
//   hace falta, porque el navegador no enseña nada: la marca espera a que lo haya.
// - `pedirToken`: hay algún aviso y este aparato puede recibirlos. Si tocaba revocar y no se ha podido, no se pide
//   (lo hace quien llama): saldría el mismo token de antes, que podría seguir en el otro buzón.
// - `limpiarTokenDeAntes`: el token de antes de esta cuenta aún no se ha borrado desde este aparato. Va aparte de
//   los avisos: puede haberlo aunque ahora estén apagados.
export function planSincronizacion({ quiere, puedeRecibir, estrenar, tokenDeAntesBorrado }) {
  return {
    revocar: !!(puedeRecibir && estrenar),
    pedirToken: !!(quiere && puedeRecibir),
    limpiarTokenDeAntes: !tokenDeAntesBorrado,
  };
}

// Después, qué hacer con el buzón, con el token ya pedido (o `null` si no se ha podido, o no tocaba):
// - `"borrar"` (F1): ningún aviso activado, pero este aparato tiene firma. O lo escribió y nadie lo ha borrado, o
//   un borrado anterior no llegó a confirmarse (quitar los dos avisos y cerrar la app enseguida): sin esto, el
//   aviso para descongelar seguía llegando cada noche a los demás aparatos, porque su función se fía del buzón y no
//   mira el perfil. Cuesta una escritura, solo en ese caso, y la firma se borra cuando el servidor lo confirma.
// - `"nada"`: ni avisos ni firma, o la firma dice que hoy ya se escribió exactamente esto.
// - `"escribir"`: con token. Se añade a la lista sin pisar los de los demás y se ponen al día idioma e
//   interruptores. `quitar` es el token que este aparato tenía antes si el navegador lo ha renovado: sale ya, sin
//   esperar a que una función falle al usarlo.
// - `"actualizarSinToken"` (F4): hay avisos, pero este aparato no tiene token (sin permiso, sin soporte o FCM no lo
//   ha dado). Lo cambiado desde aquí (apagar uno de los dos, otro idioma) tiene que llegar igual al buzón; si no, los
//   demás aparatos siguen recibiendo lo de antes hasta que se abra la app en uno de ellos. La lista no se toca. La
//   firma, con `token: null`, evita escribir en cada apertura.
export function decidirBuzon({ quiere, token, anterior, idioma, pesaje, descongelar }, fecha = new Date()) {
  if (!quiere) return { accion: anterior != null ? "borrar" : "nada" };
  const firma = firmaBuzon({ token, idioma, pesaje, descongelar }, fecha);
  if (buzonAlDia(anterior, firma)) return { accion: "nada" };
  if (!firma.token) return { accion: "actualizarSinToken", firma };
  const viejo = anterior && typeof anterior === "object" ? anterior.token : null;
  return { accion: "escribir", firma, quitar: typeof viejo === "string" && viejo !== "" && viejo !== firma.token ? viejo : null };
}

// Al quitar los dos avisos (disablePushNotifications, F1): la firma que se queda mientras el servidor no confirma
// el borrado del buzón. Si este aparato ya tenía una, vale esa. Si no (nunca llegó a escribir el buzón, por ejemplo
// porque abrió la app sin conexión), se deja una que solo dice «hay que borrarlo»: así, si el borrado no llega,
// la próxima apertura lo repite (decidirBuzon, «borrar») en vez de esperar a que lo haga otro aparato.
export function firmaAlQuitarAvisos(anterior) {
  return anterior != null && typeof anterior === "object" ? anterior : { token: null, borrar: true };
}

// Al cerrar sesión (signOutUser, F2): qué token sacar de la lista de esta cuenta y qué firma dejar cuando el
// servidor lo confirme. La firma no se borra, se queda sin token: sigue diciendo qué ajustes escribió este aparato
// y conserva su papel de tarea pendiente (F1) por si la cuenta vuelve aquí. Sin token que sacar, no se toca nada.
// Si la salida no llega a confirmarse (sin conexión), la firma se queda como estaba y lo arregla la marca de
// estrenar token, que se pone siempre al cerrar sesión (CLAVE_ESTRENAR_TOKEN, planSincronizacion).
export function decidirAlSalir(firma) {
  const token = firma && typeof firma === "object" ? firma.token : null;
  if (typeof token !== "string" || token === "") return { quitar: null, firma: null };
  return { quitar: token, firma: { ...firma, token: null } };
}
