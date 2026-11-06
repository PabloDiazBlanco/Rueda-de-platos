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
// (los buzones y, para el pesaje, los datos de quien lo tiene activado), que ya no buscan el token de antes, que
// los aparatos con el token caducado o inválido salen de la lista y que un fallo pasajero de FCM no saca a nadie.
// Y la escala (tanda B, M3): que piden solo los buzones con su aviso activado, por páginas y sin saltarse ni
// repetir a nadie, que no tratan más de unas pocas cuentas a la vez y que, si falta el índice de la consulta,
// siguen leyendo todos los buzones como antes (el emulador no exige índices: ese error se simula).

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
// cambiarle ese método. Los tokens de `fallosFCM` responden con el error que se les ponga: los dos que significan
// «este aparato ya no existe» (NO_REGISTRADO, INVALIDO) o uno pasajero, que no dice nada del token.
const NO_REGISTRADO = "messaging/registration-token-not-registered";
const INVALIDO = "messaging/invalid-registration-token";
const PASAJERO = "messaging/internal-error";
const mensajeria = admin.messaging();
let enviados = [];
let fallosFCM = new Map();
// Para las tandas: cada envío tarda `retrasoFCM` ms, y se apunta cuántos hay en marcha a la vez como máximo.
let retrasoFCM = 0;
let enVuelo = 0;
let maxEnVuelo = 0;
mensajeria.sendEachForMulticast = async (mensaje) => {
  enviados.push(JSON.parse(JSON.stringify(mensaje)));
  enVuelo++;
  maxEnVuelo = Math.max(maxEnVuelo, enVuelo);
  if (retrasoFCM) await new Promise((resolver) => setTimeout(resolver, retrasoFCM));
  enVuelo--;
  const responses = mensaje.tokens.map((t) =>
    fallosFCM.has(t) ? { success: false, error: { code: fallosFCM.get(t) } } : { success: true, messageId: "m-" + t }
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

// ---------- Las páginas de cada búsqueda en todas las cuentas ----------
// Cada `get()` de una consulta (no de un documento suelto, que va por otro lado) apunta su filtro y cuántos
// documentos ha traído. `_queryOptions` es interno del SDK de Firestore: se usa solo aquí, en las pruebas, para ver
// con qué filtro se ha pedido cada página. `faltaIndice(n)` simula que la n-ésima consulta filtrada falla porque el
// índice no existe (el error que daría Firestore de verdad: el emulador no exige índices).
const Consulta = admin.firestore.Query.prototype;
const getConsultaOriginal = Consulta.get;
let paginas = [];
let faltaIndice = () => false;
let consultasFiltradas = 0;
Consulta.get = async function () {
  const filtro = this._queryOptions.filters.map((f) => `${f.field.formattedName} ${f.op} ${f.value}`).join(" y ") || "sin filtro";
  if (filtro !== "sin filtro" && faltaIndice(++consultasFiltradas)) {
    paginas.push({ filtro, error: "falta el índice" });
    const err = new Error("9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...");
    err.code = 9;
    throw err;
  }
  const resultado = await getConsultaOriginal.call(this);
  paginas.push({ filtro, documentos: resultado.size });
  return resultado;
};

// ---------- El registro ----------
// Lo que las funciones dejan en el registro de Google Cloud, para comprobar el aviso del plan B y las líneas de
// resumen. Se sigue escribiendo en la salida como siempre.
const logger = require("firebase-functions/logger");
let registro = [];
for (const nivel of ["info", "warn", "error"]) {
  const original = logger[nivel].bind(logger);
  logger[nivel] = (texto, ...resto) => {
    registro.push({ nivel, texto: String(texto) });
    return original(texto, ...resto);
  };
}

const { sendDefrostReminders } = require("../sendDefrostReminders");
const { sendWeighInReminders } = require("../sendWeighInReminders");
const { ESCALA } = require("../buzonAvisos");
const ESCALA_DE_SERIE = { ...ESCALA };

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
  fallosFCM = new Map();
  retrasoFCM = 0;
  enVuelo = 0;
  maxEnVuelo = 0;
  paginas = [];
  faltaIndice = () => false;
  consultasFiltradas = 0;
  registro = [];
  Object.assign(ESCALA, ESCALA_DE_SERIE);
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
    fallosFCM.set("dani-viejo", NO_REGISTRADO);

    await sendDefrostReminders.run(MIERCOLES);

    assert.deepEqual(enviados[0].tokens, ["dani-viejo", "dani-nuevo"]);
    const buzon = await leerBuzon("dani");
    assert.deepEqual(buzon.tokens, ["dani-nuevo"]);
    assert.ok(buzon.actualizado.isEqual(HACE_UN_RATO));
  });

  it("también quita un token que FCM da por inválido (el otro código de «este aparato ya no existe»)", async () => {
    await ponerBuzon("dani", { descongelar: true, tokens: ["dani-roto", "dani-bueno"] });
    fallosFCM.set("dani-roto", INVALIDO);

    await sendDefrostReminders.run(MIERCOLES);

    assert.deepEqual((await leerBuzon("dani")).tokens, ["dani-bueno"]);
  });

  it("un fallo pasajero de FCM no quita el token: se vuelve a intentar en el siguiente aviso", async () => {
    // Si un error cualquiera (red, cuota puntual de FCM) quitara el token, un mal momento de FCM dejaría a ese
    // aparato sin avisos hasta que la app volviera a apuntarlo, al día siguiente como pronto.
    await ponerBuzon("dani", { descongelar: true, tokens: ["dani-movil", "dani-portatil", "dani-viejo"] });
    fallosFCM.set("dani-movil", PASAJERO);
    fallosFCM.set("dani-viejo", NO_REGISTRADO);

    await sendDefrostReminders.run(MIERCOLES);

    // El portátil lo recibe, el viejo sale y el móvil se queda para la próxima.
    assert.deepEqual(enviados[0].tokens, ["dani-movil", "dani-portatil", "dani-viejo"]);
    assert.deepEqual((await leerBuzon("dani")).tokens, ["dani-movil", "dani-portatil"]);

    // Al día siguiente FCM ya responde: el móvil lo recibe.
    fallosFCM = new Map();
    enviados = [];
    await sendDefrostReminders.run(MIERCOLES);
    assert.deepEqual(enviados[0].tokens, ["dani-movil", "dani-portatil"]);
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
    fallosFCM.set("ana-viejo", NO_REGISTRADO);

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

describe("Escala (tanda B, M3): solo los buzones con el aviso, por páginas y unas pocas cuentas a la vez", () => {
  const tokensDe = () => enviados.map((m) => m.tokens[0]).sort();

  it("descongelar: pide solo los buzones con ese aviso, página a página, sin saltarse ni repetir a nadie", async () => {
    ESCALA.tamanoPagina = 2;
    for (const uid of ["ana", "bea", "carla", "dani", "eva"]) {
      await ponerBuzon(uid, { descongelar: true, tokens: [uid + "-1"] });
    }
    // Solo el pesaje: la consulta ni siquiera los trae.
    for (const uid of ["berta", "fede", "zoe"]) await ponerBuzon(uid, { pesaje: true, tokens: [uid + "-1"] });

    await sendDefrostReminders.run(MIERCOLES);

    assert.deepEqual(tokensDe(), ["ana-1", "bea-1", "carla-1", "dani-1", "eva-1"]);
    // 5 buzones en páginas de 2: 2 + 2 + 1. La última, más corta, dice que no hay más (no hace falta pedir otra).
    assert.deepEqual(paginas, [
      { filtro: "descongelar EQUAL true", documentos: 2 },
      { filtro: "descongelar EQUAL true", documentos: 2 },
      { filtro: "descongelar EQUAL true", documentos: 1 },
    ]);
    assert.deepEqual(lecturas, ["todas las cuentas: avisos"]);
    assert.ok(registro.some((r) => r.texto === "Aviso para descongelar: 5 buzón(es) con el aviso activado"));
  });

  it("pesaje: igual, con su propio filtro; con un número justo de páginas, la última viene vacía", async () => {
    ESCALA.tamanoPagina = 2;
    for (const uid of ["ana", "bea", "carla", "dani"]) {
      await ponerBuzon(uid, { pesaje: true, tokens: [uid + "-1"] });
      await ponerDatos(uid, { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    }
    await ponerBuzon("eva", { descongelar: true, tokens: ["eva-1"] });
    await ponerDatos("eva", { perfil: { notificacionesPush: false }, pesoTracking: peso() });

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual(tokensDe(), ["ana-1", "bea-1", "carla-1", "dani-1"]);
    assert.deepEqual(paginas, [
      { filtro: "pesaje EQUAL true", documentos: 2 },
      { filtro: "pesaje EQUAL true", documentos: 2 },
      { filtro: "pesaje EQUAL true", documentos: 0 },
    ]);
    // Los datos solo de quien tiene el recordatorio: los de «eva» ni se abren.
    const datosLeidos = lecturas.filter((l) => l.startsWith("users/")).map((l) => l.split("/")[1]).sort();
    assert.deepEqual(datosLeidos, ["ana", "bea", "carla", "dani"]);
    assert.ok(registro.some((r) => r.texto === "Recordatorio de pesaje: 4 candidato(s) con el recordatorio activado"));
  });

  it("como mucho ESCALA.aLaVez cuentas a la vez (antes, todas con un solo Promise.all)", async () => {
    ESCALA.aLaVez = 2;
    retrasoFCM = 20;
    for (const uid of ["ana", "bea", "carla", "dani", "eva"]) {
      await ponerBuzon(uid, { descongelar: true, pesaje: true, tokens: [uid + "-1"] });
      await ponerDatos(uid, { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    }

    await sendDefrostReminders.run(MIERCOLES);
    assert.equal(enviados.length, 5);
    assert.equal(maxEnVuelo, 2);

    enviados = [];
    maxEnVuelo = 0;
    await sendWeighInReminders.run(MIERCOLES);
    assert.equal(enviados.length, 5);
    assert.equal(maxEnVuelo, 2);
  });

  it("plan B: si falta el índice, lee todos los buzones por páginas, filtra aquí y lo deja en el registro", async () => {
    ESCALA.tamanoPagina = 2;
    faltaIndice = () => true;
    for (const uid of ["ana", "bea", "carla"]) await ponerBuzon(uid, { descongelar: true, tokens: [uid + "-1"] });
    for (const uid of ["berta", "zoe"]) await ponerBuzon(uid, { pesaje: true, tokens: [uid + "-1"] });

    await sendDefrostReminders.run(MIERCOLES);

    assert.deepEqual(tokensDe(), ["ana-1", "bea-1", "carla-1"]);
    assert.deepEqual(paginas, [
      { filtro: "descongelar EQUAL true", error: "falta el índice" },
      { filtro: "sin filtro", documentos: 2 },
      { filtro: "sin filtro", documentos: 2 },
      { filtro: "sin filtro", documentos: 1 },
    ]);
    const avisos = registro.filter((r) => r.nivel === "warn");
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].texto, /falta el índice de «descongelar»/);
    assert.ok(registro.some((r) => r.texto === "Aviso para descongelar: 3 buzón(es) con el aviso activado"));
  });

  it("plan B a mitad: sigue sin filtro desde la misma página, sin repetir a nadie ni saltarse a nadie", async () => {
    // Un índice que deja de servir entre una página y la siguiente no debería pasar, pero si pasa no puede mandar
    // dos veces el aviso a las cuentas de las páginas ya tratadas. Las dos consultas van en el orden de la ruta del
    // documento, así que el cursor vale para las dos.
    ESCALA.tamanoPagina = 2;
    faltaIndice = (n) => n === 2; // la primera página filtrada va bien; la segunda, no
    for (const uid of ["ana", "bea", "carla", "dani", "eva"]) {
      await ponerBuzon(uid, { pesaje: true, tokens: [uid + "-1"] });
      await ponerDatos(uid, { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    }
    // Solo descongelar, en medio del orden alfabético: el plan B los lee y los descarta aquí.
    for (const uid of ["berta", "zoe"]) await ponerBuzon(uid, { descongelar: true, tokens: [uid + "-1"] });

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual(tokensDe(), ["ana-1", "bea-1", "carla-1", "dani-1", "eva-1"]);
    assert.equal(enviados.length, 5);
    // ana y bea con filtro; después, desde bea y sin filtro: berta, carla | dani, eva | zoe.
    assert.deepEqual(paginas, [
      { filtro: "pesaje EQUAL true", documentos: 2 },
      { filtro: "pesaje EQUAL true", error: "falta el índice" },
      { filtro: "sin filtro", documentos: 2 },
      { filtro: "sin filtro", documentos: 2 },
      { filtro: "sin filtro", documentos: 1 },
    ]);
  });

  it("otro error al leer los buzones no se confunde con el índice: no hay plan B y queda el error", async () => {
    await ponerBuzon("ana", { descongelar: true, tokens: ["ana-1"] });
    const getAntes = Consulta.get;
    Consulta.get = async function () {
      const err = new Error("14 UNAVAILABLE: sin conexión");
      err.code = 14;
      throw err;
    };
    try {
      await sendDefrostReminders.run(MIERCOLES);
    } finally {
      Consulta.get = getAntes;
    }
    assert.equal(enviados.length, 0);
    assert.equal(registro.filter((r) => r.nivel === "warn").length, 0);
    assert.ok(registro.some((r) => r.nivel === "error" && /no se han podido leer los buzones/.test(r.texto)));
  });
});
