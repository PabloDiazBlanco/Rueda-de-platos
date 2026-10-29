// ---------- Eliminar la cuenta de verdad: Stripe, users/{uid} y la cuenta de Auth ----------
// Escrita en la Fase 2 del diagnóstico (29-oct-2026). Como cualquier función que llama la app, se despliega
// (`firebase deploy --only functions`) ANTES de subir la versión de la app que la usa.
//
// Hasta ahora «Eliminar cuenta» lo hacía el cliente: borraba los documentos de users/{uid}/keys y su cuenta
// de Auth, pero no podía tocar el documento padre users/{uid} (es de solo lectura para el cliente: guarda el
// estado premium con el cliente y la suscripción de Stripe, y los contadores de cuota) ni cancelar la
// suscripción, que seguía cobrando a alguien que ya no podía entrar a gestionarla. La política de privacidad
// promete que se borra todo. Esta función lo hace con el Admin SDK, en este orden:
//   1. Comprueba que la sesión es reciente (el cliente reautentica justo antes de llamar).
//   2. Cancela en Stripe todas las suscripciones vivas de su cliente. Si Stripe falla, NO se borra nada y
//      se devuelve el error: mejor que lo intente otra vez que dejar a alguien pagando sin cuenta. El cliente
//      de Stripe no se borra: las facturas tienen que conservarse por ley (ver la política de privacidad).
//   3. Borra users/{uid} entero (el documento padre y su subcolección keys) con recursiveDelete.
//   4. Borra la cuenta de Auth.
//   5. Vuelve a borrar users/{uid}, por si mientras tanto llegó alguna escritura tardía (un guardado
//      automático del cliente, el evento de Stripe de la cancelación). stripeWebhook ya no escribe nada
//      para un usuario que no existe en Auth, así que después de esto no puede volver a aparecer.
// Lo que vive solo en el dispositivo (el período, las copias del entreno) lo limpia el cliente
// (window.deleteAccount, auth-bootstrap.jsx).

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Firebase pide una sesión reciente para borrar una cuenta; aquí se comprueba igual en el servidor.
const SESION_RECIENTE_SEG = 5 * 60;
// Estados de una suscripción de Stripe que todavía pueden cobrar o reactivarse.
const ESTADOS_VIVOS = ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"];

// Stripe responde «resource_missing» cuando el cliente o la suscripción guardados ya no existen en la cuenta de
// Stripe con la que trabaja la función: se borraron en el panel, o se cambió de cuenta de Stripe (el traspaso a
// la cuenta de draftedfood está pendiente). Lo que no existe no puede cobrar, así que no hay nada que cancelar.
// Sin esto, la función devolvía «inténtalo de nuevo» para siempre y esa cuenta no se podía eliminar nunca.
const noExiste = (err) => !!err && err.code === "resource_missing";

async function cancelarSuscripciones(stripe, premium) {
  const canceladas = [];
  const customer = premium && premium.stripeCustomerId;
  if (customer) {
    // Todas las del cliente, no solo la última guardada: si alguna vez hubo dos, ninguna sigue cobrando.
    let lista;
    try {
      lista = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    } catch (err) {
      if (noExiste(err)) return canceladas;
      throw err;
    }
    for (const sub of lista.data) {
      if (ESTADOS_VIVOS.includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id);
        canceladas.push(sub.id);
      }
    }
  } else if (premium && premium.subscriptionId) {
    let sub;
    try {
      sub = await stripe.subscriptions.retrieve(premium.subscriptionId);
    } catch (err) {
      if (noExiste(err)) return canceladas;
      throw err;
    }
    if (ESTADOS_VIVOS.includes(sub.status)) {
      await stripe.subscriptions.cancel(sub.id);
      canceladas.push(sub.id);
    }
  }
  return canceladas;
}

exports.deleteAccount = onCall({ secrets: [stripeSecretKey], enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión para eliminar la cuenta.");
  }
  const uid = request.auth.uid;
  const authTime = Number(request.auth.token && request.auth.token.auth_time) || 0;
  if (Date.now() / 1000 - authTime > SESION_RECIENTE_SEG) {
    throw new HttpsError("failed-precondition", "Por seguridad, vuelve a confirmar tu identidad antes de eliminar la cuenta.");
  }

  const db = admin.firestore();
  const ref = db.doc(`users/${uid}`);
  const datos = (await ref.get()).data() || {};

  // 2. Stripe. Sin suscripción guardada no hay nada que cancelar.
  if (datos.premium && (datos.premium.stripeCustomerId || datos.premium.subscriptionId)) {
    try {
      const canceladas = await cancelarSuscripciones(new Stripe(stripeSecretKey.value()), datos.premium);
      logger.info("Suscripciones canceladas al eliminar la cuenta", { uid, canceladas });
    } catch (err) {
      logger.error("No se ha podido cancelar la suscripción; no se borra nada", { uid, error: err && err.message });
      throw new HttpsError("unavailable", "No se ha podido cancelar tu suscripción. No se ha borrado nada: inténtalo de nuevo.");
    }
  }

  // 3-5. Datos y cuenta.
  await db.recursiveDelete(ref);
  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (!err || err.code !== "auth/user-not-found") throw err;
  }
  await db.recursiveDelete(ref);

  logger.info("Cuenta eliminada", { uid });
  return { ok: true };
});
