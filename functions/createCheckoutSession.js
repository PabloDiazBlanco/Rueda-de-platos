// ---------- Crea una sesión de Stripe Checkout para suscribirse a Premium ----------
// El cliente nunca ve ni maneja la clave secreta de Stripe — esta función la usa por él y le
// devuelve solo la URL a la que redirigir para pagar. client_reference_id y
// subscription_data.metadata son el convenio documentado en stripeWebhook.js: sin esto, el
// webhook no podría saber a qué usuario de Firebase pertenece la suscripción cuando lleguen los
// eventos de checkout.session.completed / customer.subscription.updated|deleted.

const { onCall, HttpsError } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const Stripe = require("stripe");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Price ID del producto "Premium" en Stripe (Product catalogue → Premium → Pricing). No es un
// dato sensible — es público en el propio Checkout de todas formas — así que vive aquí como
// constante normal, no como secreto. Si algún día cambia el precio (se crea un Price nuevo en
// Stripe, ver la conversación sobre precios no editables), solo hay que actualizar esta línea.
const PREMIUM_PRICE_ID = "price_1UDp7pCMHxsh90BIwwOSRcjD";

// Misma URL para éxito y cancelación: no hay rutas distintas en esta app (todo vive en una sola
// página), y el desbloqueo real no depende de esta URL — depende del webhook, que actualiza
// Firestore, que la app está escuchando en vivo (ver window.subscribePremiumStatus).
const URL_APP = "https://pablodiazblanco.github.io/Rueda-de-platos/";

exports.createCheckoutSession = onCall({ secrets: [stripeSecretKey], enforceAppCheck: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión para hacerse premium.");
  }

  const uid = request.auth.uid;
  const stripe = new Stripe(stripeSecretKey.value());

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
    client_reference_id: uid,
    subscription_data: { metadata: { firebaseUID: uid } },
    customer_email: request.auth.token.email || undefined,
    success_url: URL_APP,
    cancel_url: URL_APP,
  });

  return { url: session.url };
});
