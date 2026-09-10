// ---------- Webhook de Stripe: activa/desactiva el premium según lo que pase con la suscripción ----------
// Es la única pieza del sistema que puede escribir el campo "premium" de un usuario en Firestore
// — el cliente (app.jsx) tiene acceso de solo lectura a ese documento por las reglas de
// seguridad (ver la hoja de ruta, Fase 2, f2-5), precisamente para que nadie pueda dárselo a sí
// mismo desde la consola del navegador. Esta función firma con Stripe, escribe en Firestore, y
// nada más — no calcula precios ni decide qué es premium, eso vive en Stripe y en la app.
//
// Convenio con el resto del sistema (importante si tocas la creación del Checkout Session en la
// Fase 3 — "el muro de pago en la app"): TODA sesión de checkout debe crearse con:
//   - client_reference_id: <uid de Firebase>
//   - subscription_data: { metadata: { firebaseUID: <uid de Firebase> } }
// El primer dato identifica al usuario en el evento inicial (checkout.session.completed); el
// segundo queda pegado a la propia suscripción y es lo único disponible en los eventos
// posteriores (customer.subscription.updated/deleted), que no llevan client_reference_id. Sin
// esto, un evento no se puede vincular a ningún usuario y se descarta — Stripe no sabe nada de
// uids de Firebase por sí solo, hay que decírselo nosotros en el momento de crear la suscripción.

const { onRequest } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Guarda el estado de la suscripción en users/{uid} (el documento padre, no la subcolección
// "keys" donde vive el resto de datos de la app) — así una única regla de seguridad ("nadie
// salvo esta función escribe aquí") basta para proteger el campo entero, sin depender de una
// excepción especial sobre un nombre de clave concreto dentro de "keys".
async function guardarEstadoPremium(uid, { activo, stripeCustomerId, subscriptionId }) {
  if (!uid) {
    logger.error(
      "Evento de Stripe sin uid de Firebase asociado (falta client_reference_id o " +
        "metadata.firebaseUID) — no se puede vincular a ningún usuario.",
      { stripeCustomerId, subscriptionId }
    );
    return;
  }
  await admin
    .firestore()
    .doc(`users/${uid}`)
    .set(
      {
        premium: {
          active: activo,
          stripeCustomerId,
          subscriptionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
}

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value());

    // La firma se verifica sobre el cuerpo "crudo" de la petición, tal cual llegó — no sobre
    // req.body ya parseado a objeto (Stripe firma los bytes exactos que envía; si se verificara
    // sobre el JSON re-serializado, cualquier diferencia mínima de formato haría fallar la
    // comprobación). Firebase Functions conserva ese cuerpo crudo en req.rawBody aunque también
    // parsee el JSON, específicamente para casos como este.
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.error("Firma de webhook de Stripe inválida", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await guardarEstadoPremium(session.client_reference_id, {
          activo: true,
          stripeCustomerId: session.customer,
          subscriptionId: session.subscription,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        // "active" y "trialing" cuentan como premium activo; cualquier otro estado (past_due,
        // canceled, unpaid...) se trata como inactivo de inmediato — más estricto que esperar al
        // evento "deleted", para no dejar acceso premium a una suscripción con el pago fallido.
        const activo = subscription.status === "active" || subscription.status === "trialing";
        await guardarEstadoPremium(subscription.metadata && subscription.metadata.firebaseUID, {
          activo,
          stripeCustomerId: subscription.customer,
          subscriptionId: subscription.id,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await guardarEstadoPremium(subscription.metadata && subscription.metadata.firebaseUID, {
          activo: false,
          stripeCustomerId: subscription.customer,
          subscriptionId: subscription.id,
        });
        break;
      }

      default:
        // El resto de eventos no nos interesan — llegan porque el endpoint está suscrito a
        // todos por defecto, pero no hace falta registrar nada por ellos.
        break;
    }

    res.status(200).send();
  }
);
