// ---------- logica/buzon-avisos.js ----------
// Buzón de avisos (auditoría de noviembre de 2026, R8 y R17): las decisiones, sin tocar Firebase, sobre qué
// escribe la app en `users/{uid}/avisos/push`, el documento que leen las funciones de notificaciones
// (`sendWeighInReminders`, `sendDefrostReminders`) para saber a quién avisar, en qué idioma y a qué aparatos.
// La escritura en sí vive en auth-bootstrap.jsx (`window.sincronizarBuzonAvisos`); aquí solo lo que se puede
// probar en validacion/ sin red.
//
// Por qué existe: antes las funciones descubrían a quién avisar leyendo todos los documentos de todas las
// cuentas dos veces al día (coste que crece con los datos de todo el mundo y datos de salud leídos sin
// necesidad), y cada cuenta guardaba un solo token, así que activar los avisos en un aparato los quitaba sin
// decir nada del anterior. La forma del documento y sus límites están en firestore.rules.
import { fechaISO } from "peso";

// El mismo tope que firestore.rules (`datos.tokens.size() <= 10`): un móvil, un ordenador, una tableta y los
// tokens que el navegador renueva entre medias caben de sobra. Si cambia uno, cambia el otro.
export const MAX_DISPOSITIVOS = 10;

// ¿Quiere la cuenta algún aviso? Los dos interruptores de Ajustes son de la cuenta (`perfil.notificacionesPush`
// para el pesaje y `perfil.avisoDescongelar`): sin ninguno no hace falta buzón.
export function quiereAvisos({ pesaje, descongelar }) {
  return !!(pesaje || descongelar);
}

// Lo que este dispositivo dejó escrito en el buzón la última vez, con el día. Se guarda en `localStorage`
// para no reescribir el buzón cada vez que se abre la app: basta con una vez al día (así el buzón dice que el
// aparato sigue vivo) o cuando algo cambia (otro token porque el navegador lo ha renovado, otro idioma, otro
// interruptor).
export function firmaBuzon({ token, idioma, pesaje, descongelar }, fecha = new Date()) {
  return { token, idioma, pesaje: !!pesaje, descongelar: !!descongelar, dia: fechaISO(fecha) };
}

// ¿Hay que escribir? No, si la última escritura de este dispositivo fue hoy y con exactamente lo mismo. Una
// firma vieja con otra forma (o ninguna) obliga a escribir: es lo seguro, cuesta una escritura.
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
