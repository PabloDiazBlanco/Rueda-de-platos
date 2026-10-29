// Punto de entrada de las Cloud Functions del proyecto. Cada función vive en su propio archivo
// (mismo criterio que logica/ en la app principal: un archivo, una responsabilidad) — este
// fichero solo inicializa lo compartido por todas y las reexporta.
const admin = require("firebase-admin");
const { setGlobalOptions } = require("firebase-functions");

admin.initializeApp();

// Límite de instancias simultáneas por función: si algo se dispara sin control (un bucle, un
// abuso), esto pone un techo duro al coste antes de que se convierta en un problema de verdad.
// Ver la hoja de ruta de publicación, Fase 2 — control de coste.
setGlobalOptions({ maxInstances: 10 });

exports.stripeWebhook = require("./stripeWebhook").stripeWebhook;
exports.analyzeFoodPhoto = require("./analyzeFoodPhoto").analyzeFoodPhoto;
exports.createCheckoutSession = require("./createCheckoutSession").createCheckoutSession;
exports.createPortalSession = require("./createPortalSession").createPortalSession;
exports.suggestMeals = require("./suggestMeals").suggestMeals;
exports.suggestRecipes = require("./suggestRecipes").suggestRecipes;
exports.sendWeighInReminders = require("./sendWeighInReminders").sendWeighInReminders;
exports.sendDefrostReminders = require("./sendDefrostReminders").sendDefrostReminders;
// Escrita en la Fase 2 del diagnóstico (29-oct-2026): desplegar antes de subir la app que la llama.
exports.deleteAccount = require("./deleteAccount").deleteAccount;
