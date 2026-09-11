// ---------- Crea una sesión del portal de facturación de Stripe ----------
// El portal (cancelar, cambiar de tarjeta, ver facturas) lo aloja Stripe entero — no hace falta
// construir nada de esa interfaz nosotros. Solo hace falta el stripeCustomerId que el webhook ya
// guardó en users/{uid}.premium la primera vez que se activó la suscripción (ver
// stripeWebhook.js), así que si no existe todavía es que esa cuenta nunca ha llegado a pagar.

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const URL_APP = "https://pablodiazblanco.github.io/Rueda-de-platos/";

exports.createPortalSession = onCall({ secrets: [stripeSecretKey], enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión para gestionar tu suscripción.");
  }

  const uid = request.auth.uid;
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  const datos = snap.data() || {};
  const stripeCustomerId = datos.premium && datos.premium.stripeCustomerId;

  if (!stripeCustomerId) {
    throw new HttpsError("failed-precondition", "No se ha encontrado ninguna suscripción asociada a tu cuenta.");
  }

  const stripe = new Stripe(stripeSecretKey.value());
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: URL_APP,
  });

  return { url: session.url };
});
