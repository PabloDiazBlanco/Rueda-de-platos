// Pruebas de las dos funciones de notificaciones (sendDefrostReminders y sendWeighInReminders) contra el emulador
// de Firestore, desde que leen el buzón de avisos (auditoría de noviembre de 2026, R8 y R17).
//
// Se ejecutan con `npm run test:avisos` desde `functions/`: `firebase emulators:exec` arranca el emulador de
// Firestore en este ordenador, lanza este archivo con `node --test` y lo apaga al acabar. No toca ningún proyecto
// real (`demo-…` es un identificador que el emulador reserva para pruebas) y no envía ninguna notificación: el
// envío de FCM se sustituye por uno falso que apunta qué se habría mandado y a qué aparatos.
//
// Por qué hacen falta: las funciones no se pueden desplegar en el proyecto de pruebas (plan Spark), así que esta
// es la única forma de comprobarlas antes de producción. Viven fuera del despliegue (`firebase.json` ignora esta
// carpeta), igual que las pruebas de las reglas.
//
// Qué se prueba, además de a quién se avisa y en qué idioma: que las funciones **solo leen lo que necesitan**
// (los buzones y, para el pesaje, los datos de quien lo tiene activado), que ya no buscan el token de antes y que
// los aparatos con el token caducado salen de la lista.

const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const admin = require("firebase-admin");

const ID_PROYECTO = "demo-rueda-de-platos";
// `firebase emulators:exec` pone FIRESTORE_EMULATOR_HOST: así el Admin SDK habla con el emulador y no con la nube.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Estas pruebas se lanzan con `npm run test:avisos` (necesitan el emulador de Firestore).");
}
admin.initializeApp({ projectId: ID_PROYECTO });
const db = admin.firestore();

// ---------- FCM falso ----------
// Las funciones llaman a admin.messaging().sendEachForMulticast; la instancia es siempre la misma, así que basta con
// cambiarle ese método. Los tokens de `tokensMuertos` responden como un aparato que ya no existe.
const mensajeria = admin.messaging();
let enviados = [];
let tokensMuertos = new Set();
mensajeria.sendEachForMulticast = async (mensaje) => {
  enviados.push(JSON.parse(JSON.stringify(mensaje)));
  const responses = mensaje.tokens.map((t) =>
    tokensMuertos.has(t)
      ? { success: false, error: { code: "messaging/registration-token-not-registered" } }
      : { success: true, messageId: "m-" + t }
  );
  const successCount = responses.filter((r) => r.success).length;
  return { responses, successCount, failureCount: responses.length - successCount };
};

// ---------- Qué lee cada función ----------
// Se apunta cada documento suelto que pide (`db.doc`) y cada búsqueda en todas las cuentas (`collectionGroup`).
let lecturas = [];
const docOriginal = db.doc.bind(db);
const grupoOriginal = db.collectionGroup.bind(db);
db.doc = (ruta) => {
  lecturas.push(ruta);
  return docOriginal(ruta);
};
db.collectionGroup = (nombre) => {
  lecturas.push("todas las cuentas: " + nombre);
  return grupoOriginal(nombre);
};

const { sendDefrostReminders } = require("../sendDefrostReminders");
const { sendWeighInReminders } = require("../sendWeighInReminders");

// ---------- Datos de prueba ----------
const HACE_UN_RATO = admin.firestore.Timestamp.fromDate(new Date("2026-11-03T18:00:00Z"));
// Se escriben con docOriginal para que no cuenten como lecturas de las funciones.
const ponerBuzon = (uid, datos, id = "push") =>
  docOriginal(`users/${uid}/avisos/${id}`).set({
    idioma: "es", pesaje: false, descongelar: false, tokens: [], actualizado: HACE_UN_RATO, ...datos,
  });
const ponerDatos = (uid, datos) => docOriginal(`users/${uid}/keys/rueda-de-platos:data-v1`).set({ value: JSON.stringify(datos) });
const ponerTokenDeAntes = (uid, token) => docOriginal(`users/${uid}/keys/rueda-de-platos:push-token-v1`).set({ value: token });
const leerBuzon = async (uid) => (await docOriginal(`users/${uid}/avisos/push`).get()).data();

// Seguimiento de peso como lo guarda la app: 3 veces por semana (lunes, miércoles y viernes), sin pausas ni pesadas.
const peso = (cambios = {}) => ({ vecesSemana: 3, pausas: [], entradas: [], ...cambios });
// Miércoles 4 de noviembre de 2026 a las 9:00 en Madrid (8:00 en UTC): día de pesaje con 3 por semana, no con 2.
const MIERCOLES = { scheduleTime: "2026-11-04T08:00:00.000Z" };

before(() => {
  assert.equal(admin.messaging(), mensajeria, "admin.messaging() tiene que devolver siempre la misma instancia");
  assert.equal(admin.firestore(), db, "admin.firestore() tiene que devolver siempre la misma instancia");
});

beforeEach(async () => {
  // Vacía el emulador entre prueba y prueba.
  const respuesta = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${ID_PROYECTO}/databases/(default)/documents`,
    { method: "DELETE" }
  );
  assert.ok(respuesta.ok, "no se ha podido vaciar el emulador");
  enviados = [];
  lecturas = [];
  tokensMuertos = new Set();
});

describe("Aviso para descongelar", () => {
  it("avisa a todos los aparatos de quien lo tiene activado, en su idioma, sin abrir sus datos", async () => {
    await ponerBuzon("ana", { idioma: "ca", descongelar: true, tokens: ["ana-movil", "ana-portatil"] });
    await ponerDatos("ana", { perfil: { avisoDescongelar: true, idioma: "ca" } });
    await ponerBuzon("bea", { pesaje: true, descongelar: false, tokens: ["bea-movil"] }); // solo pesaje
    await ponerBuzon("carla", { descongelar: true, tokens: [] }); // sesión cerrada en todos sus aparatos
    await ponerTokenDeAntes("eva", "eva-token"); // solo el sistema de antes, sin buzón
    await ponerDatos("eva", { perfil: { avisoDescongelar: true } });

    await sendDefrostReminders.run(MIERCOLES);

    assert.equal(enviados.length, 1);
    assert.deepEqual(enviados[0].tokens, ["ana-movil", "ana-portatil"]);
    assert.equal(enviados[0].notification.title, "Res a descongelar?");
    assert.equal(enviados[0].data.tag, "aviso-descongelar");
    // Solo los buzones: ni los datos de nadie ni la búsqueda de antes en `keys`.
    assert.deepEqual(lecturas, ["todas las cuentas: avisos"]);
  });

  it("quita de la lista los aparatos con el token caducado y no toca la hora de la app", async () => {
    await ponerBuzon("dani", { descongelar: true, tokens: ["dani-viejo", "dani-nuevo"] });
    tokensMuertos.add("dani-viejo");

    await sendDefrostReminders.run(MIERCOLES);

    assert.deepEqual(enviados[0].tokens, ["dani-viejo", "dani-nuevo"]);
    const buzon = await leerBuzon("dani");
    assert.deepEqual(buzon.tokens, ["dani-nuevo"]);
    assert.ok(buzon.actualizado.isEqual(HACE_UN_RATO));
  });

  it("aguanta un buzón raro: idioma desconocido, tokens repetidos o que no son texto, y otros documentos", async () => {
    await ponerBuzon("ines", { idioma: "fr", descongelar: true, tokens: ["i1", 5, "i1", "", null] });
    await ponerBuzon("fede", { descongelar: true, tokens: ["fede-x"] }, "otro"); // no es `push`
    await docOriginal("otra/cosa/avisos/push").set({ descongelar: true, tokens: ["fuera-de-users"] });

    await sendDefrostReminders.run(MIERCOLES);

    assert.equal(enviados.length, 1);
    assert.deepEqual(enviados[0].tokens, ["i1"]);
    assert.equal(enviados[0].notification.title, "¿Algo que descongelar?");
  });

  it("sin buzones no manda nada ni falla", async () => {
    await sendDefrostReminders.run(MIERCOLES);
    assert.equal(enviados.length, 0);
  });
});

describe("Recordatorio de pesaje", () => {
  it("avisa solo a quien le toca hoy, y solo abre los datos de quien lo tiene activado", async () => {
    // Le toca: miércoles, 3 por semana, sin pesarse aún y sin pausa. En gallego, a sus dos aparatos.
    await ponerBuzon("ana", { idioma: "gl", pesaje: true, tokens: ["ana-1", "ana-2"] });
    await ponerDatos("ana", { perfil: { notificacionesPush: true, idioma: "gl" }, pesoTracking: peso() });
    // Ya se ha pesado hoy.
    await ponerBuzon("bea", { pesaje: true, tokens: ["bea-1"] });
    await ponerDatos("bea", { perfil: { notificacionesPush: true }, pesoTracking: peso({ entradas: [{ fecha: "2026-11-04", peso: 70 }] }) });
    // Ciclo en pausa.
    await ponerBuzon("carla", { pesaje: true, tokens: ["carla-1"] });
    await ponerDatos("carla", { perfil: { notificacionesPush: true }, pesoTracking: peso({ pausas: [{ inicio: "2026-11-01", fin: null }] }) });
    // 2 por semana (lunes y jueves): hoy no le toca.
    await ponerBuzon("dani", { pesaje: true, tokens: ["dani-1"] });
    await ponerDatos("dani", { perfil: { notificacionesPush: true }, pesoTracking: peso({ vecesSemana: 2 }) });
    // El buzón dice que sí, pero el perfil dice que no (un aparato que escribió tarde): manda el perfil.
    await ponerBuzon("eva", { pesaje: true, tokens: ["eva-1"] });
    await ponerDatos("eva", { perfil: { notificacionesPush: false }, pesoTracking: peso() });
    // Sin datos guardados.
    await ponerBuzon("fede", { pesaje: true, tokens: ["fede-1"] });
    // Solo el aviso de descongelar: ni se le avisa ni se abren sus datos.
    await ponerBuzon("gema", { descongelar: true, tokens: ["gema-1"] });
    await ponerDatos("gema", { perfil: { notificacionesPush: false }, pesoTracking: peso() });
    // Solo el token de antes, sin buzón: ni se le avisa ni se abren sus datos.
    await ponerTokenDeAntes("hugo", "hugo-token");
    await ponerDatos("hugo", { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    // Recordatorio activado pero sin aparatos (sesión cerrada en todos): no hace falta abrir sus datos.
    await ponerBuzon("ivan", { pesaje: true, tokens: [] });
    await ponerDatos("ivan", { perfil: { notificacionesPush: true }, pesoTracking: peso() });

    await sendWeighInReminders.run(MIERCOLES);

    assert.equal(enviados.length, 1);
    assert.deepEqual(enviados[0].tokens, ["ana-1", "ana-2"]);
    assert.equal(enviados[0].notification.title, "Toca pesarse");
    assert.match(enviados[0].notification.body, /^Hoxe/);
    assert.equal(enviados[0].data, undefined); // sin etiqueta: sw.js usa la del pesaje

    const datosLeidos = lecturas.filter((l) => l.startsWith("users/")).map((l) => l.split("/")[1]).sort();
    assert.deepEqual(datosLeidos, ["ana", "bea", "carla", "dani", "eva", "fede"]);
    assert.deepEqual(lecturas.filter((l) => l.startsWith("todas las cuentas")), ["todas las cuentas: avisos"]);
  });

  it("el día es el de la ejecución programada: el mismo buzón un martes no recibe nada", async () => {
    await ponerBuzon("ana", { pesaje: true, tokens: ["ana-1"] });
    await ponerDatos("ana", { perfil: { notificacionesPush: true }, pesoTracking: peso() });

    await sendWeighInReminders.run({ scheduleTime: "2026-11-03T08:00:00.000Z" }); // martes
    assert.equal(enviados.length, 0);
    await sendWeighInReminders.run({ scheduleTime: "2026-11-06T08:00:00.000Z" }); // viernes
    assert.equal(enviados.length, 1);
  });

  it("también quita los aparatos con el token caducado", async () => {
    await ponerBuzon("ana", { pesaje: true, tokens: ["ana-viejo", "ana-nuevo"] });
    await ponerDatos("ana", { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    tokensMuertos.add("ana-viejo");

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual((await leerBuzon("ana")).tokens, ["ana-nuevo"]);
  });

  it("unos datos ilegibles no tiran la función: se omite esa cuenta y se avisa a las demás", async () => {
    await ponerBuzon("rota", { pesaje: true, tokens: ["rota-1"] });
    await docOriginal("users/rota/keys/rueda-de-platos:data-v1").set({ value: "{esto no es JSON" });
    await ponerBuzon("ana", { pesaje: true, tokens: ["ana-1"] });
    await ponerDatos("ana", { perfil: { notificacionesPush: true }, pesoTracking: peso() });

    await sendWeighInReminders.run(MIERCOLES);

    assert.equal(enviados.length, 1);
    assert.deepEqual(enviados[0].tokens, ["ana-1"]);
  });
});
