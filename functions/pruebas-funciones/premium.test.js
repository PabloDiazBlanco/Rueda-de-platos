// Pruebas de la decisión del premium (functions/estadoPremium.js): qué se escribe según cómo esté la suscripción en
// Stripe. Sin emulador ni red: `npm run test:premium` desde functions/. Las suscripciones de aquí imitan lo que devuelve
// `stripe.subscriptions.retrieve(id, { expand: ["latest_invoice"] })`, solo con los campos que mira la decisión.

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { estadoPremium, suscripcionDelAviso, AVISOS_ATENDIDOS } = require("../estadoPremium");

const suscripcion = (status, factura) => ({ id: "sub_1", status, customer: "cus_1", latest_invoice: factura });
const primera = (status) => ({ billing_reason: "subscription_create", status });
const renovacion = (status) => ({ billing_reason: "subscription_cycle", status });
const PREMIUM = { activo: true, pendiente: false };
const PENDIENTE = { activo: false, pendiente: true };
const NADA = { activo: false, pendiente: false };

describe("Premium según la suscripción de Stripe", () => {
  it("pago con tarjeta: activa con la primera factura pagada → premium", () => {
    assert.deepEqual(estadoPremium(suscripcion("active", primera("paid"))), PREMIUM);
    assert.deepEqual(estadoPremium(suscripcion("trialing", primera("paid"))), PREMIUM);
  });

  it("domiciliación, primer pago aún sin cobrar → pendiente (Stripe puede dejarla active o incomplete)", () => {
    assert.deepEqual(estadoPremium(suscripcion("active", primera("open"))), PENDIENTE);
    assert.deepEqual(estadoPremium(suscripcion("incomplete", primera("open"))), PENDIENTE);
    assert.deepEqual(estadoPremium(suscripcion("active", primera("draft"))), PENDIENTE);
  });

  it("domiciliación, primer pago fallido: Stripe anula la factura y deja la suscripción active → sin premium", () => {
    assert.deepEqual(estadoPremium(suscripcion("active", primera("void"))), NADA);
    assert.deepEqual(estadoPremium(suscripcion("active", primera("uncollectible"))), NADA);
    assert.deepEqual(estadoPremium(suscripcion("incomplete", primera("void"))), NADA);
  });

  it("renovación todavía cobrándose → sigue siendo premium (no se le quita unos días cada mes)", () => {
    assert.deepEqual(estadoPremium(suscripcion("active", renovacion("open"))), PREMIUM);
    assert.deepEqual(estadoPremium(suscripcion("active", renovacion("paid"))), PREMIUM);
    assert.deepEqual(estadoPremium(suscripcion("active", { billing_reason: "subscription_update", status: "open" })), PREMIUM);
  });

  it("un cobro que falla de verdad o una suscripción terminada → sin premium", () => {
    for (const status of ["past_due", "unpaid", "canceled", "incomplete_expired", "paused", "inventado"]) {
      assert.deepEqual(estadoPremium(suscripcion(status, renovacion("open"))), NADA, status);
      assert.deepEqual(estadoPremium(suscripcion(status, primera("paid"))), NADA, status);
    }
  });

  it("sin factura expandida (solo el id) se decide por el estado, y nunca premium y pendiente a la vez", () => {
    assert.deepEqual(estadoPremium(suscripcion("active", "in_123")), PREMIUM);
    assert.deepEqual(estadoPremium(suscripcion("incomplete", "in_123")), NADA);
    assert.deepEqual(estadoPremium(null), NADA);
    assert.deepEqual(estadoPremium("sub_1"), NADA);
  });
});

describe("De qué suscripción habla cada aviso", () => {
  const aviso = (type, object) => ({ type, data: { object } });

  it("checkout: el id de la suscripción (texto u objeto)", () => {
    assert.equal(suscripcionDelAviso(aviso("checkout.session.completed", { subscription: "sub_1" })), "sub_1");
    assert.equal(suscripcionDelAviso(aviso("checkout.session.async_payment_succeeded", { subscription: { id: "sub_2" } })), "sub_2");
    assert.equal(suscripcionDelAviso(aviso("checkout.session.completed", { subscription: null })), null);
  });

  it("suscripción: su propio id", () => {
    assert.equal(suscripcionDelAviso(aviso("customer.subscription.updated", { id: "sub_3" })), "sub_3");
  });

  it("factura: el id nuevo (parent.subscription_details) y, si no, el antiguo; nada si es un pago suelto", () => {
    assert.equal(suscripcionDelAviso(aviso("invoice.paid", { parent: { subscription_details: { subscription: "sub_4" } } })), "sub_4");
    assert.equal(suscripcionDelAviso(aviso("invoice.payment_failed", { subscription: "sub_5" })), "sub_5");
    assert.equal(suscripcionDelAviso(aviso("invoice.paid", { parent: null })), null);
  });

  it("los avisos atendidos son los siete que hay que marcar en Stripe", () => {
    assert.deepEqual([...AVISOS_ATENDIDOS].sort(), [
      "checkout.session.async_payment_failed", "checkout.session.async_payment_succeeded", "checkout.session.completed",
      "customer.subscription.deleted", "customer.subscription.updated", "invoice.paid", "invoice.payment_failed",
    ]);
  });
});
