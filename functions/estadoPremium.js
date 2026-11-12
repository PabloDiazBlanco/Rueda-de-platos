// ---------- Qué premium le toca a una cuenta, según su suscripción de Stripe ----------
// Decisión pura (sin Stripe ni Firestore), para poder probarla sin red: la usa stripeWebhook.js con la suscripción
// que acaba de pedirle a Stripe, y la prueban pruebas-funciones/premium.test.js (`npm run test:premium`).
//
// Por qué así (auditoría de noviembre de 2026, R9, y decisión de Pablo del 12-nov):
// - Antes el webhook se fiaba del aviso: «checkout terminado» = premium. Con pagos que tardan (domiciliación SEPA y
//   parecidos), Stripe da el checkout por terminado aunque el dinero no haya llegado, y puede no llegar nunca.
// - Stripe no garantiza el orden de los avisos: uno viejo que llegue tarde podía quitarle el premium a quien ya había
//   pagado. Ahora el webhook no lee el estado del aviso: pregunta a Stripe el estado actual de la suscripción y decide
//   con eso (lo que recomienda Stripe: «retrieve the associated subscription and confirm that its status»). Da igual el
//   orden en que lleguen, se escribe siempre la verdad del momento.
// - Con un pago que tarda, Stripe puede dejar la suscripción «active» desde el principio, y si el cobro falla después
//   anula la factura **pero la suscripción sigue activa** (docs.stripe.com/billing/subscriptions/overview). Por eso no
//   basta con mirar el estado de la suscripción: hay que mirar si la **primera factura** está pagada.
//
// La regla:
// - Primera factura pagada (o ya es una renovación) y suscripción `active`/`trialing` → premium.
// - Primera factura aún sin cobrar (`open`/`draft`) → **pendiente**: sin premium todavía, y la app explica que el pago
//   se está procesando. Se activa solo cuando Stripe confirma el cobro (llega otro aviso y se vuelve a decidir).
// - **Renovación** en proceso (la última factura es de un ciclo nuevo) → sigue siendo premium: ya es cliente y ha
//   pagado antes. Si una domiciliación mensual quitara el premium unos días cada mes, sería un castigo absurdo.
// - Un cobro que falla de verdad: primera factura anulada (`void`/`uncollectible`), o la suscripción en `past_due`,
//   `unpaid`, `canceled`, `incomplete_expired` o `paused` → sin premium, como antes.
// No se da premium «mientras tanto» (quitárselo luego a quien creía tenerlo sería peor, decisión de Pablo).

const ESTADOS_CON_ACCESO = ["active", "trialing"];
const FACTURA_SIN_COBRAR = ["open", "draft"];

// `suscripcion`: el objeto Subscription de Stripe recuperado con `expand: ["latest_invoice"]`. Devuelve
// `{ activo, pendiente }` (nunca los dos a la vez).
function estadoPremium(suscripcion) {
  const nada = { activo: false, pendiente: false };
  if (!suscripcion || typeof suscripcion !== "object") return nada;
  const factura = suscripcion.latest_invoice && typeof suscripcion.latest_invoice === "object" ? suscripcion.latest_invoice : null;
  const esPrimeraFactura = !!factura && factura.billing_reason === "subscription_create";
  const primeraSinCobrar = esPrimeraFactura && FACTURA_SIN_COBRAR.includes(factura.status);
  const primeraFallida = esPrimeraFactura && !FACTURA_SIN_COBRAR.includes(factura.status) && factura.status !== "paid";

  if (ESTADOS_CON_ACCESO.includes(suscripcion.status)) {
    if (primeraSinCobrar) return { activo: false, pendiente: true };
    if (primeraFallida) return nada;
    return { activo: true, pendiente: false };
  }
  // `incomplete`: el primer pago aún no se ha completado. Si su factura sigue abierta, se está cobrando.
  if (suscripcion.status === "incomplete" && primeraSinCobrar) return { activo: false, pendiente: true };
  return nada;
}

// La suscripción de la que habla un aviso de Stripe (su id), según el tipo de aviso. `null` si no habla de ninguna
// (un pago suelto, por ejemplo). En las facturas, desde la versión de la API de 2025 el id vive en
// `parent.subscription_details.subscription`; se mira también el campo antiguo por si el aviso llega con otra versión.
function suscripcionDelAviso(evento) {
  const objeto = evento && evento.data && evento.data.object;
  if (!objeto) return null;
  const id = (v) => (typeof v === "string" ? v : v && typeof v === "object" && typeof v.id === "string" ? v.id : null);
  if (evento.type.startsWith("checkout.session.")) return id(objeto.subscription);
  if (evento.type.startsWith("customer.subscription.")) return id(objeto.id);
  if (evento.type.startsWith("invoice.")) {
    return id(objeto.parent && objeto.parent.subscription_details && objeto.parent.subscription_details.subscription) || id(objeto.subscription);
  }
  return null;
}

// Los avisos que el webhook atiende (todos acaban en lo mismo: pedir la suscripción a Stripe y decidir). **Tienen que
// estar marcados en el destino del webhook en el panel de Stripe**; si falta uno, ese caso no llega nunca.
const AVISOS_ATENDIDOS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

module.exports = { estadoPremium, suscripcionDelAviso, AVISOS_ATENDIDOS };
