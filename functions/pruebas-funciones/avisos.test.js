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
// siguen leyendo todos los buzones como antes (el emulador no exige índices: ese error se simula). Y los datos de
// pesaje en el buzón (tanda B, M2): con ellos, el recordatorio decide sin abrir `data-v1`; sin ellos (buzón de una
// app sin actualizar, o con un dato raro), lo abre como antes; y los dos caminos deciden igual.

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
  // Estos buzones son como los de antes de la tanda B (sin los datos de pesaje): se decide abriendo `data-v1`.
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
    assert.ok(registro.some((r) => r.texto ===
      "Recordatorio de pesaje: 4 candidato(s) con el recordatorio activado (0 decidido(s) con el buzón y 4 abriendo sus datos)"));
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

  // Cambia la lectura de páginas para que las llamadas de `fallos` (la 1.ª, la 2.ª...) fallen con el código de gRPC
  // dado; las demás van al emulador como siempre (pasando por el espía de las páginas). Devuelve cuántas veces se ha
  // pedido una página.
  async function conFallosAlLeer(fallos, accion) {
    const getAntes = Consulta.get;
    let llamadas = 0;
    Consulta.get = async function () {
      llamadas++;
      if (fallos[llamadas]) {
        const err = new Error(`${fallos[llamadas]} error simulado al leer una página`);
        err.code = fallos[llamadas];
        throw err;
      }
      return getAntes.call(this);
    };
    try {
      await accion();
    } finally {
      Consulta.get = getAntes;
    }
    return llamadas;
  }

  it("otro error al leer los buzones no se confunde con el índice ni se reintenta: no hay plan B y queda el error", async () => {
    await ponerBuzon("ana", { descongelar: true, tokens: ["ana-1"] });
    // 7 = PERMISSION_DENIED: la segunda vez daría lo mismo.
    const llamadas = await conFallosAlLeer({ 1: 7 }, () => sendDefrostReminders.run(MIERCOLES));
    assert.equal(llamadas, 1);
    assert.equal(enviados.length, 0);
    assert.equal(registro.filter((r) => r.nivel === "warn").length, 0);
    assert.ok(registro.some((r) => r.nivel === "error" && /no se han podido leer los buzones/.test(r.texto)));
  });

  it("un fallo pasajero al leer una página (4 o 14) se reintenta una vez, tras una pequeña espera, sin repetir a nadie", async () => {
    ESCALA.tamanoPagina = 2;
    ESCALA.esperaReintentoMs = 5;
    for (const uid of ["ana", "bea", "carla"]) await ponerBuzon(uid, { descongelar: true, tokens: [uid + "-1"] });
    // Lecturas: la 1.ª falla (4, DEADLINE_EXCEEDED); la 2.ª es la misma página otra vez (ana, bea); la 3.ª falla (14,
    // UNAVAILABLE); la 4.ª es la segunda página otra vez (carla), más corta: no hace falta pedir otra.
    const llamadas = await conFallosAlLeer({ 1: 4, 3: 14 }, () => sendDefrostReminders.run(MIERCOLES));
    assert.equal(llamadas, 4);
    assert.deepEqual(tokensDe(), ["ana-1", "bea-1", "carla-1"]);
    assert.equal(enviados.length, 3);
    const avisos = registro.filter((r) => r.nivel === "warn");
    assert.equal(avisos.length, 2);
    for (const aviso of avisos) assert.match(aviso.texto, /fallo pasajero al leer una página de buzones; se vuelve a intentar una vez/);
    assert.ok(registro.some((r) => r.texto === "Aviso para descongelar: 3 buzón(es) con el aviso activado"));
    assert.equal(registro.filter((r) => r.nivel === "error").length, 0);
  });

  it("un reintento solo: si la misma página vuelve a fallar, queda el error y no hay plan B", async () => {
    ESCALA.esperaReintentoMs = 5;
    await ponerBuzon("ana", { descongelar: true, tokens: ["ana-1"] });
    const llamadas = await conFallosAlLeer({ 1: 14, 2: 14 }, () => sendDefrostReminders.run(MIERCOLES));
    assert.equal(llamadas, 2);
    assert.equal(enviados.length, 0);
    assert.equal(registro.filter((r) => r.nivel === "warn").length, 1);
    assert.ok(registro.some((r) => r.nivel === "error" && /no se han podido leer los buzones/.test(r.texto)));
  });

  it("si al reintentar lo que falla es el índice, sigue el plan B como siempre", async () => {
    ESCALA.esperaReintentoMs = 5;
    faltaIndice = () => true;
    await ponerBuzon("ana", { descongelar: true, tokens: ["ana-1"] });
    await ponerBuzon("zoe", { pesaje: true, tokens: ["zoe-1"] });
    // La 1.ª lectura falla por algo pasajero; al reintentarla, el espía de las páginas dice que falta el índice; la
    // 3.ª es la primera página sin filtro (ana y zoe, más corta que una página: no hace falta pedir otra).
    const llamadas = await conFallosAlLeer({ 1: 14 }, () => sendDefrostReminders.run(MIERCOLES));
    assert.equal(llamadas, 3);
    assert.deepEqual(tokensDe(), ["ana-1"]);
    assert.ok(registro.some((r) => r.nivel === "warn" && /falta el índice de «descongelar»/.test(r.texto)));
    assert.equal(registro.filter((r) => r.nivel === "error").length, 0);
  });
});

describe("Recordatorio de pesaje con los datos en el buzón (tanda B, M2)", () => {
  // Lo que deja la app de ahora en el buzón (logica/buzon-avisos.js, datosPesajeBuzon), escrito aquí a mano.
  const conPeso = (pesoVecesSemana, pesoPausado, ultimaPesada, cambios = {}) =>
    ({ pesaje: true, pesoVecesSemana, pesoPausado, ultimaPesada, ...cambios });

  it("con los tres datos en el buzón decide sin abrir los datos de nadie", async () => {
    // Le toca (miércoles, 3 por semana, última pesada el lunes): se le avisa aunque su `data-v1` diga otra cosa,
    // porque no se abre.
    await ponerBuzon("ana", conPeso(3, false, "2026-11-02", { idioma: "gl", tokens: ["ana-1", "ana-2"] }));
    await ponerDatos("ana", { perfil: { notificacionesPush: true }, pesoTracking: peso({ pausas: [{ inicio: "2026-11-01", fin: null }] }) });
    // Ya se ha pesado hoy.
    await ponerBuzon("bea", conPeso(3, false, "2026-11-04", { tokens: ["bea-1"] }));
    // Ciclo en pausa.
    await ponerBuzon("carla", conPeso(3, true, "2026-11-02", { tokens: ["carla-1"] }));
    // 2 por semana: el miércoles no le toca.
    await ponerBuzon("dani", conPeso(2, false, null, { tokens: ["dani-1"] }));
    // Recién empezado: sin pesadas en el ciclo.
    await ponerBuzon("gema", conPeso(3, false, null, { tokens: ["gema-1"] }));

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual(enviados.map((m) => m.tokens.join("+")).sort(), ["ana-1+ana-2", "gema-1"]);
    const deAna = enviados.find((m) => m.tokens[0] === "ana-1");
    assert.match(deAna.notification.body, /^Hoxe/);
    // Ni un `data-v1`: solo la búsqueda de los buzones.
    assert.deepEqual(lecturas, ["todas las cuentas: avisos"]);
    const motivos = registro.map((r) => r.texto);
    for (const linea of [
      "bea: ya registrado hoy, se omite (según el buzón)",
      "carla: ciclo de peso en pausa, se omite (según el buzón)",
      "dani: hoy no es día sugerido (vecesSemana=2), se omite (según el buzón)",
      "ana: recordatorio enviado a 2 de 2 aparato(s) (según el buzón)",
      "Recordatorio de pesaje: 5 candidato(s) con el recordatorio activado (5 decidido(s) con el buzón y 0 abriendo sus datos)",
    ]) {
      assert.ok(motivos.includes(linea), `falta en el registro: ${linea}`);
    }
  });

  it("sin los tres datos, o con uno que no tiene la forma esperada, abre data-v1 como antes", async () => {
    // Buzón de antes, sin ninguno: le toca según sus datos.
    await ponerBuzon("hugo", { pesaje: true, tokens: ["hugo-1"] });
    await ponerDatos("hugo", { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    // Una frecuencia que no existe: no se fía del buzón; sus datos dicen que está en pausa.
    await ponerBuzon("ines", conPeso(5, false, null, { tokens: ["ines-1"] }));
    await ponerDatos("ines", { perfil: { notificacionesPush: true }, pesoTracking: peso({ pausas: [{ inicio: "2026-11-01", fin: null }] }) });
    // Solo uno de los tres (las reglas lo permiten): no basta para decidir; sus datos dicen que le toca.
    await ponerBuzon("juan", { pesaje: true, pesoPausado: true, tokens: ["juan-1"] });
    await ponerDatos("juan", { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    // «Sin seguimiento» con el recordatorio activado: la app nueva nunca lo escribe así (siempre hay seguimiento), así
    // que es un buzón a medias (una copia de antes activó el pesaje con `merge` encima de los `null` del pesaje
    // apagado). No se fía de él: sus datos dicen que le toca, y se le avisa (antes se omitía «sin seguimiento»).
    await ponerBuzon("fede", conPeso(null, false, null, { tokens: ["fede-1"] }));
    await ponerDatos("fede", { perfil: { notificacionesPush: true }, pesoTracking: peso() });
    // Una fecha mal escrita: tampoco.
    await ponerBuzon("lola", conPeso(3, false, "4/11/2026", { tokens: ["lola-1"] }));
    await ponerDatos("lola", { perfil: { notificacionesPush: true }, pesoTracking: peso({ entradas: [{ fecha: "2026-11-04", peso: 61 }] }) });
    // Y uno con los tres bien: este no se abre.
    await ponerBuzon("kike", conPeso(3, false, null, { tokens: ["kike-1"] }));
    await ponerDatos("kike", { perfil: { notificacionesPush: true }, pesoTracking: peso() });

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual(enviados.map((m) => m.tokens[0]).sort(), ["fede-1", "hugo-1", "juan-1", "kike-1"]);
    const datosLeidos = lecturas.filter((l) => l.startsWith("users/")).map((l) => l.split("/")[1]).sort();
    assert.deepEqual(datosLeidos, ["fede", "hugo", "ines", "juan", "lola"]);
    const motivos = registro.map((r) => r.texto);
    assert.ok(motivos.includes("ines: ciclo de peso en pausa, se omite (según sus datos)"));
    assert.ok(motivos.includes("lola: ya registrado hoy, se omite (según sus datos)"));
    assert.ok(motivos.includes(
      "Recordatorio de pesaje: 6 candidato(s) con el recordatorio activado (1 decidido(s) con el buzón y 5 abriendo sus datos)"
    ));
  });

  it("el perfil solo se mira por el camino de antes: con los datos en el buzón, manda el buzón", async () => {
    // Por el camino de antes, un perfil con el recordatorio desactivado gana al buzón. Con los datos en el buzón no se
    // abre `data-v1`, así que el buzón es la única fuente (como en el aviso de descongelar): la app lo pone al día al
    // cambiar el interruptor, también sin permiso (F4), y lo borra al quitar los dos avisos.
    await ponerBuzon("eva", { pesaje: true, tokens: ["eva-1"] });
    await ponerDatos("eva", { perfil: { notificacionesPush: false }, pesoTracking: peso() });
    await ponerBuzon("olga", conPeso(3, false, null, { tokens: ["olga-1"] }));
    await ponerDatos("olga", { perfil: { notificacionesPush: false }, pesoTracking: peso() });

    await sendWeighInReminders.run(MIERCOLES);

    assert.deepEqual(enviados.map((m) => m.tokens[0]), ["olga-1"]);
    assert.ok(registro.some((r) => r.texto === "eva: recordatorio de pesaje desactivado en el perfil, se omite"));
  });

  it("los dos caminos deciden igual con el mismo seguimiento, el miércoles y el jueves", async () => {
    // Cada caso es un seguimiento de peso y lo que la app dejaría en el buzón para él (calculado a mano con las
    // reglas de datosPesajeBuzon). «-d» va por `data-v1` (buzón de antes) y «-b» por el buzón. A quién se avisa
    // tiene que ser lo mismo por los dos caminos.
    const casos = {
      normal: [peso(), [3, false, null]],
      pesadoHoy: [peso({ entradas: [{ fecha: "2026-11-02", peso: 70 }, { fecha: "2026-11-04", peso: 69.8 }] }), [3, false, "2026-11-04"]],
      // Pesadas desordenadas: la de hoy no es la última de la lista, pero es la mayor.
      desordenado: [peso({ entradas: [{ fecha: "2026-11-04", peso: 69.8 }, { fecha: "2026-11-02", peso: 70 }] }), [3, false, "2026-11-04"]],
      pesadoAntes: [peso({ entradas: [{ fecha: "2026-11-02", peso: 70 }] }), [3, false, "2026-11-02"]],
      pausado: [peso({ pausas: [{ inicio: "2026-11-01", fin: null }] }), [3, true, null]],
      pausaCerrada: [peso({ pausas: [{ inicio: "2026-10-20", fin: "2026-10-27" }] }), [3, false, null]],
      dosPorSemana: [peso({ vecesSemana: 2 }), [2, false, null]],
      // Sin frecuencia guardada: las dos funciones la toman como 3.
      sinFrecuencia: [{ pausas: [], entradas: [] }, [3, false, null]],
    };
    for (const [nombre, [seguimiento, [veces, pausado, ultima]]] of Object.entries(casos)) {
      await ponerBuzon(`${nombre}-d`, { pesaje: true, tokens: [`${nombre}-d`] });
      await ponerDatos(`${nombre}-d`, { perfil: { notificacionesPush: true }, pesoTracking: seguimiento });
      await ponerBuzon(`${nombre}-b`, conPeso(veces, pausado, ultima, { tokens: [`${nombre}-b`] }));
    }
    const avisados = (sufijo) =>
      enviados.map((m) => m.tokens[0]).filter((t) => t.endsWith(sufijo)).map((t) => t.slice(0, -2)).sort();

    // Miércoles 4: 3 por semana sí (si no se ha pesado hoy ni está en pausa); 2 por semana no.
    await sendWeighInReminders.run(MIERCOLES);
    assert.deepEqual(avisados("-d"), ["normal", "pausaCerrada", "pesadoAntes", "sinFrecuencia"]);
    assert.deepEqual(avisados("-b"), avisados("-d"));

    // Jueves 5: solo 2 por semana (lunes y jueves).
    enviados = [];
    await sendWeighInReminders.run({ scheduleTime: "2026-11-05T08:00:00.000Z" });
    assert.deepEqual(avisados("-d"), ["dosPorSemana"]);
    assert.deepEqual(avisados("-b"), avisados("-d"));
  });
});
