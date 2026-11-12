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
const { estadoPremium, suscripcionDelAviso, AVISOS_ATENDIDOS } = require("./estadoPremium");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Guarda el estado de la suscripción en users/{uid} (el documento padre, no la subcolección
// "keys" donde vive el resto de datos de la app) — así una única regla de seguridad ("nadie
// salvo esta función escribe aquí") basta para proteger el campo entero, sin depender de una
// excepción especial sobre un nombre de clave concreto dentro de "keys".
// `pendiente`: el primer pago se está cobrando (domiciliación y parecidos, ver estadoPremium.js); la app lo explica.
async function guardarEstadoPremium(uid, { activo, pendiente, stripeCustomerId, subscriptionId }) {
  if (!uid) {
    logger.error(
      "Evento de Stripe sin uid de Firebase asociado (falta client_reference_id o " +
        "metadata.firebaseUID) — no se puede vincular a ningún usuario.",
      { stripeCustomerId, subscriptionId }
    );
    return;
  }
  // Una cuenta eliminada (functions/deleteAccount.js) cancela su suscripción y Stripe avisa después con
  // customer.subscription.deleted: escribir aquí recrearía users/{uid} para alguien que ya no existe. Si el
  // usuario no está en Auth, no se escribe nada.
  try {
    await admin.auth().getUser(uid);
  } catch (err) {
    if (err && err.code === "auth/user-not-found") {
      logger.info("Evento de Stripe de una cuenta ya eliminada: no se escribe nada.", { uid, subscriptionId });
      return;
    }
    throw err;
  }
  const ref = admin.firestore().doc(`users/${uid}`);
  const premium = {
    active: activo,
    pendiente: !!pendiente,
    stripeCustomerId,
    subscriptionId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  // Activar, o dejar el pago «pendiente», sí crea el documento: es el primer contacto de la cuenta con Stripe y la app
  // tiene que poder enseñar que el pago se está procesando.
  if (activo || pendiente) {
    await ref.set({ premium }, { merge: true });
    return;
  }
  // Desactivar solo actualiza un documento que ya existe; nunca lo crea. La comprobación de Auth de arriba no
  // basta: deleteAccount cancela la suscripción ANTES de borrar el usuario, así que el aviso de Stripe puede
  // pasar esa comprobación y llegar a escribir justo después de que deleteAccount haya borrado users/{uid},
  // recreándolo con los datos de facturación de alguien que pidió borrarlo todo. `update` falla si el documento
  // no existe, y eso es lo correcto: sin documento, el usuario ya no tiene premium. Un usuario que cancela
  // normalmente sí lo tiene (se creó al activarse la suscripción).
  try {
    await ref.update({ premium });
  } catch (err) {
    if (err && (err.code === 5 || err.code === "not-found")) {
      logger.info("Desactivación de premium sin documento (cuenta eliminada o nunca activada): no se crea.", { uid, subscriptionId });
      return;
    }
    throw err;
  }
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

    // Todos los avisos que importan acaban igual (auditoría de noviembre de 2026, R9): no se lee el estado que trae el
    // aviso, sino que se pide a Stripe la suscripción tal como está AHORA y se decide con ella (estadoPremium.js). Así
    // da igual el orden en que lleguen (Stripe no lo garantiza) o que lleguen repetidos: siempre se escribe lo mismo, la
    // verdad del momento. Y un pago que tarda (domiciliación) no da premium hasta que se cobra la primera factura.
    if (AVISOS_ATENDIDOS.includes(event.type)) {
      const subscriptionId = suscripcionDelAviso(event);
      if (!subscriptionId) {
        logger.info("Aviso de Stripe sin suscripción asociada: no se hace nada.", { tipo: event.type });
      } else {
        // Si Stripe no contesta, la función falla y Stripe reintenta el aviso más tarde (hasta 3 días).
        const suscripcion = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] });
        const { activo, pendiente } = estadoPremium(suscripcion);
        // El uid va pegado a la suscripción (subscription_data.metadata al crear el Checkout); el del checkout, por si
        // una suscripción antigua no lo tuviera.
        const objeto = event.data.object;
        const uid = (suscripcion.metadata && suscripcion.metadata.firebaseUID) ||
          (event.type.startsWith("checkout.session.") ? objeto.client_reference_id : null);
        await guardarEstadoPremium(uid, {
          activo,
          pendiente,
          stripeCustomerId: typeof suscripcion.customer === "string" ? suscripcion.customer : suscripcion.customer && suscripcion.customer.id,
          subscriptionId,
        });
        logger.info("Premium según Stripe.", { tipo: event.type, uid, estado: suscripcion.status, activo, pendiente });
      }
    }
    // El resto de avisos no nos interesan.

    res.status(200).send();
  }
);
