// Pruebas de las reglas de Firestore (`firestore.rules`, en la raíz) contra el emulador.
//
// Se ejecutan con `npm run test:reglas` desde `functions/`: `firebase emulators:exec` arranca el emulador de
// Firestore en este ordenador, carga las reglas del repositorio, lanza este archivo con `node --test` y lo apaga
// al acabar. No hace falta conexión ni sesión de Firebase, y no toca ningún proyecto real: el identificador
// `demo-…` es de los que el emulador reserva para pruebas y nunca habla con la nube.
//
// Viven en `functions/` porque es el único proyecto Node del repositorio (la app no tiene build ni npm, ver
// CLAUDE.md), pero no son parte de las funciones: `firebase.json` las excluye del despliegue.
//
// Qué se prueba: que cada persona solo lee y escribe lo suyo, que la ficha con el premium es de solo lectura,
// que solo se aceptan las claves que usa la app, con un único campo `value` de texto y de tamaño acotado, y
// que todo lo demás se deniega. Además, una prueba lee el código de la app y comprueba que **cada clave que la
// app guarda en la nube está permitida**: si alguien añade una clave nueva y se olvida de las reglas, falla
// aquí en vez de dejar sin guardar a todas las cuentas en producción. El buzón de avisos (`avisos/push`, R8)
// tiene sus propias pruebas: forma exacta, hasta 10 dispositivos, la hora puesta por el servidor y los
// datos opcionales del seguimiento de peso (tanda B, M2). Las firmas de consentimiento (`consentimientos/`, etapa 2)
// tienen las suyas al final: solo crear, la hora del servidor, 18 años según el año del servidor y la misma edad
// mínima y forma de versión que la app.

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch,
  setLogLevel,
} = require("firebase/firestore");

// Cada escritura denegada a propósito (cuentas ajenas, claves inventadas...) deja un aviso de Firestore en la
// salida; son decenas y taparían un error de verdad. El resultado de cada prueba ya dice si algo falla.
setLogLevel("silent");

const RAIZ = path.join(__dirname, "..", "..");
const ID_PROYECTO = "demo-rueda-de-platos";

// Las mismas que la lista de `firestore.rules`. Se repiten a mano a propósito: si alguien quita una de las
// reglas sin querer, esta prueba lo nota.
const CLAVES_FIJAS = [
  "rueda-de-platos:data-v1",
  "rueda-de-platos:menu-v1",
  "rueda-de-platos:history-v1",
  "rueda-de-platos:menu-simple-v1",
  "rueda-de-platos:history-simple-v1",
  "rueda-de-platos:despensa-v1",
  "rueda-de-platos:entreno-catalogo-v1",
  "rueda-de-platos:entreno-indice-v1",
  "rueda-de-platos:entreno-borrador-v1",
  "rueda-de-platos:cuerpo-diario-v1",
  "rueda-de-platos:informes-favoritos-v1",
];

const DATOS = "rueda-de-platos:data-v1";
// El token de notificaciones de antes del buzón de avisos (R8). Salió de la lista de las reglas: la app ya no lo
// escribe, solo lo borra (una vez por cuenta y aparato), así que su nombre sigue en el código de la app.
const TOKEN_DE_ANTES = "rueda-de-platos:push-token-v1";
// Claves que el código de la app nombra solo para borrarlas: la prueba que lee el código no tiene que exigir que
// las reglas las acepten (al revés: hay una prueba aparte de que ya no se pueden escribir).
const CLAVES_QUE_SOLO_BORRA = [TOKEN_DE_ANTES];

// Un texto como los que guarda la app: JSON serializado, con tildes y eñes (ocupan 2 bytes cada una).
const VALOR_REALISTA = JSON.stringify({
  perfil: { nombre: "Begoña", idioma: "es", peso: 72.5 },
  foods: [{ id: "f1", name: "Ñoquis de calabaza", kcal: 180 }],
  comidasCompletadas: { "2026-11-03": ["Comida", "Cena"] },
});

let entorno;

// Firestore de una persona con sesión iniciada (uid) y el email verificado, que es como llega cualquier cuenta
// a la app (las reglas exigen `email_verified`); de una con correo y contraseña sin verificar; o sin sesión.
const de = (uid) => entorno.authenticatedContext(uid, { email_verified: true }).firestore();
const sinVerificar = (uid) =>
  entorno.authenticatedContext(uid, { email_verified: false, firebase: { sign_in_provider: "password" } }).firestore();
const sinSesion = () => entorno.unauthenticatedContext().firestore();

// Deja preparado un documento saltándose las reglas (como lo dejaría el Admin SDK de las funciones).
async function preparar(ruta, datos) {
  await entorno.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), ...ruta), datos);
  });
}

// Claves que el código de la app escribe en la nube, sacadas de los propios archivos: `ui/`, `logica/`,
// `app.jsx` y `auth-bootstrap.jsx`. Se quedan fuera:
// - `rueda-de-platos:migrated:<uid>`, que es una marca del dispositivo (solo `localStorage`, nunca la nube).
// - Las que la app solo borra (`CLAVES_QUE_SOLO_BORRA`, arriba): el regex no distingue escribir de borrar.
// - Las que se construyen con una plantilla (`entreno-${mesISO}-v1`), que el regex corta en el `${` y quedan
//   acabadas en guion: los meses se prueban aparte.
function clavesDelCodigo() {
  const archivos = [path.join(RAIZ, "app.jsx"), path.join(RAIZ, "auth-bootstrap.jsx")];
  for (const carpeta of ["ui", "logica"]) {
    const pendientes = [path.join(RAIZ, carpeta)];
    while (pendientes.length) {
      const actual = pendientes.pop();
      for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
        const ruta = path.join(actual, entrada.name);
        if (entrada.isDirectory()) pendientes.push(ruta);
        else if (/\.(js|jsx)$/.test(entrada.name)) archivos.push(ruta);
      }
    }
  }
  const claves = new Set();
  for (const archivo of archivos) {
    const texto = fs.readFileSync(archivo, "utf8");
    for (const [clave] of texto.matchAll(/rueda-de-platos:[a-z0-9-]+/g)) {
      if (clave === "rueda-de-platos:migrated" || clave.endsWith("-") || CLAVES_QUE_SOLO_BORRA.includes(clave)) continue;
      claves.add(clave);
    }
  }
  return [...claves].sort();
}

before(async () => {
  entorno = await initializeTestEnvironment({
    projectId: ID_PROYECTO,
    firestore: { rules: fs.readFileSync(path.join(RAIZ, "firestore.rules"), "utf8") },
  });
});

after(async () => {
  if (entorno) await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
});

describe("Cada persona, lo suyo", () => {
  it("guarda, lee, sobrescribe y borra sus propios datos", async () => {
    const db = de("alicia");
    const ref = doc(db, "users", "alicia", "keys", DATOS);
    await assertSucceeds(setDoc(ref, { value: VALOR_REALISTA }));
    const leido = await assertSucceeds(getDoc(ref));
    assert.equal(leido.data().value, VALOR_REALISTA);
    await assertSucceeds(setDoc(ref, { value: "{}" }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("el token de antes (R8) ya no se puede escribir, pero sí leer y borrar el que quede", async () => {
    const ref = doc(de("alicia"), "users", "alicia", "keys", TOKEN_DE_ANTES);
    // Ni crearlo de nuevo (lo que haría una copia vieja de la app al activar los avisos)...
    await assertFails(setDoc(ref, { value: "fcm-token:APA91bHxyz_-0123456789" }));
    // ...ni reescribir uno que ya estaba.
    await preparar(["users", "alicia", "keys", TOKEN_DE_ANTES], { value: "fcm-token:APA91bHxyz_-0123456789" });
    await assertFails(setDoc(ref, { value: "otro-token" }));
    // La limpieza de la app (limpiarTokenDeAntes, auth-bootstrap.jsx) lo borra; sin poder borrarlo se quedaría.
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(deleteDoc(ref));
    // Y borrarlo cuando ya no existe también vale: la app pone su marca de «hecho» solo si el borrado sale bien.
    await assertSucceeds(deleteDoc(ref));
  });

  it("no lee, no escribe y no borra los datos de otra persona", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    const ref = doc(de("bruno"), "users", "alicia", "keys", DATOS);
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { value: "{}" }));
    await assertFails(deleteDoc(ref));
  });

  it("no crea documentos en la cuenta de otra persona", async () => {
    const ref = doc(de("bruno"), "users", "alicia", "keys", "rueda-de-platos:menu-v1");
    await assertFails(setDoc(ref, { value: "{}" }));
  });

  it("sin sesión no se lee ni se escribe nada", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    const ref = doc(sinSesion(), "users", "alicia", "keys", DATOS);
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { value: "{}" }));
    await assertFails(deleteDoc(ref));
  });

  it("no se puede listar la colección de claves, ni siquiera la propia", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    await assertFails(getDocs(collection(de("alicia"), "users", "alicia", "keys")));
    await assertFails(getDocs(collection(de("bruno"), "users", "alicia", "keys")));
  });
});

describe("Email verificado (verificación estricta)", () => {
  it("una cuenta sin verificar no lee, no escribe ni borra sus propios datos", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    const ref = doc(sinVerificar("alicia"), "users", "alicia", "keys", DATOS);
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { value: "{}" }));
    await assertFails(deleteDoc(ref));
    await assertFails(setDoc(doc(sinVerificar("alicia"), "users", "alicia", "keys", "rueda-de-platos:menu-v1"), { value: "{}" }));
  });

  it("una cuenta sin verificar tampoco lee su ficha (premium)", async () => {
    await preparar(["users", "alicia"], { premium: { active: true } });
    await assertFails(getDoc(doc(sinVerificar("alicia"), "users", "alicia")));
  });

  it("un token sin el dato email_verified cuenta como sin verificar", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    const db = entorno.authenticatedContext("alicia").firestore();
    await assertFails(getDoc(doc(db, "users", "alicia", "keys", DATOS)));
  });

  it("una cuenta de Google (llega verificada) lee y escribe lo suyo", async () => {
    const db = entorno.authenticatedContext("bruno", { email_verified: true, firebase: { sign_in_provider: "google.com" } }).firestore();
    const ref = doc(db, "users", "bruno", "keys", DATOS);
    await assertSucceeds(setDoc(ref, { value: VALOR_REALISTA }));
    await assertSucceeds(getDoc(ref));
  });

  it("verificar no da acceso a lo de otra persona", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: VALOR_REALISTA });
    await assertFails(getDoc(doc(de("bruno"), "users", "alicia", "keys", DATOS)));
  });
});

describe("Ficha de la cuenta (premium y cuotas): solo lectura", () => {
  const FICHA = { premium: { active: true, stripeCustomerId: "cus_x" }, usoFotos: { mes: "2026-11", n: 3 } };

  it("la dueña la lee (la app la escucha para enterarse del pago)", async () => {
    await preparar(["users", "alicia"], FICHA);
    const ficha = await assertSucceeds(getDoc(doc(de("alicia"), "users", "alicia")));
    assert.equal(ficha.data().premium.active, true);
  });

  it("también se lee si todavía no existe (cuenta sin premium)", async () => {
    await assertSucceeds(getDoc(doc(de("alicia"), "users", "alicia")));
  });

  it("nadie se hace premium ni toca su cuota desde la app", async () => {
    const ref = doc(de("alicia"), "users", "alicia");
    await assertFails(setDoc(ref, { premium: { active: true } }));
    await preparar(["users", "alicia"], FICHA);
    await assertFails(updateDoc(ref, { "premium.active": true }));
    await assertFails(updateDoc(ref, { usoFotos: { mes: "2026-11", n: 0 } }));
    await assertFails(deleteDoc(ref));
  });

  it("otra persona ni la lee ni la toca", async () => {
    await preparar(["users", "alicia"], FICHA);
    const ref = doc(de("bruno"), "users", "alicia");
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { premium: { active: false } }));
  });

  it("sin sesión tampoco se lee", async () => {
    await preparar(["users", "alicia"], FICHA);
    await assertFails(getDoc(doc(sinSesion(), "users", "alicia")));
  });
});

describe("Solo las claves que usa la app", () => {
  it("acepta cada una de las claves fijas", async () => {
    const db = de("alicia");
    for (const clave of CLAVES_FIJAS) {
      await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
  });

  it("acepta cada clave que el código de la app guarda en la nube", async () => {
    const claves = clavesDelCodigo();
    // Si el regex dejara de encontrar claves (archivos movidos, otro formato), la prueba no probaría nada.
    assert.ok(claves.length >= CLAVES_FIJAS.length, `solo se han encontrado ${claves.length} claves en el código`);
    const db = de("alicia");
    for (const clave of claves) {
      try {
        await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
      } catch (e) {
        throw new Error(`La app usa «${clave}» y las reglas no la permiten: añádela a firestore.rules`, { cause: e });
      }
    }
  });

  it("acepta un documento por mes de entreno, de 1970 a 2099", async () => {
    const db = de("alicia");
    for (const mes of ["2026-01", "2026-10", "2026-12", "1998-05", "2031-07", "1970-01", "2099-12"]) {
      const clave = `rueda-de-platos:entreno-${mes}-v1`;
      await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
  });

  it("rechaza meses de años fuera del rango (sin techo, cabían 120 000 meses por cuenta)", async () => {
    const db = de("alicia");
    // «202-03» es lo que formaría la app con un año 202 (getFullYear no rellena con ceros).
    for (const mes of ["1969-12", "2100-01", "0500-03", "0000-01", "9999-12", "202-03"]) {
      const clave = `rueda-de-platos:entreno-${mes}-v1`;
      await assertFails(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
  });

  it("el rango de años de las reglas es el mismo que el de la app", async () => {
    // La app descarta las fechas fuera de ANIO_MIN_ENTRENO-ANIO_MAX_ENTRENO (logica/entreno-calculo.js); si
    // alguien cambia el rango allí y no aquí (o al revés), una sesión de un año en el borde no se podría subir.
    const texto = fs.readFileSync(path.join(RAIZ, "logica", "entreno-calculo.js"), "utf8");
    const min = Number((texto.match(/ANIO_MIN_ENTRENO\s*=\s*(\d+)/) || [])[1]);
    const max = Number((texto.match(/ANIO_MAX_ENTRENO\s*=\s*(\d+)/) || [])[1]);
    assert.ok(min > 0 && max > min, "no se han encontrado ANIO_MIN_ENTRENO y ANIO_MAX_ENTRENO en la app");
    const db = de("alicia");
    const clave = (anio, mes) => `rueda-de-platos:entreno-${anio}-${mes}-v1`;
    await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave(min, "01")), { value: "{}" }));
    await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave(max, "12")), { value: "{}" }));
    await assertFails(setDoc(doc(db, "users", "alicia", "keys", clave(min - 1, "12")), { value: "{}" }));
    await assertFails(setDoc(doc(db, "users", "alicia", "keys", clave(max + 1, "01")), { value: "{}" }));
  });

  it("rechaza meses imposibles o mal escritos", async () => {
    const db = de("alicia");
    for (const mes of ["2026-13", "2026-00", "2026-1", "26-10", "2026-10-01", "abcd-10"]) {
      const clave = `rueda-de-platos:entreno-${mes}-v1`;
      await assertFails(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
    await assertFails(
      setDoc(doc(db, "users", "alicia", "keys", "rueda-de-platos:entreno-2026-10-v2"), { value: "{}" })
    );
  });

  it("rechaza claves inventadas o parecidas", async () => {
    const db = de("alicia");
    const inventadas = [
      "rueda-de-platos:inventada-v1",
      "rueda-de-platos:data-v2",
      "rueda-de-platos:data-v1x",
      "xrueda-de-platos:data-v1",
      "rueda-de-platos:DATA-V1",
      "data-v1",
      "fooddraft:idioma",
      "rueda-de-platos:migrated:alicia",
    ];
    for (const clave of inventadas) {
      await assertFails(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
  });

  it("deja leer y borrar una clave propia antigua aunque no esté en la lista", async () => {
    await preparar(["users", "alicia", "keys", "rueda-de-platos:antigua"], { value: "{}" });
    const ref = doc(de("alicia"), "users", "alicia", "keys", "rueda-de-platos:antigua");
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(deleteDoc(ref));
  });

  it("no deja reescribir una clave antigua que no está en la lista", async () => {
    await preparar(["users", "alicia", "keys", "rueda-de-platos:antigua"], { value: "{}" });
    const ref = doc(de("alicia"), "users", "alicia", "keys", "rueda-de-platos:antigua");
    await assertFails(setDoc(ref, { value: "{}" }));
  });
});

describe("Forma del documento: un único campo `value` de texto", () => {
  const ref = () => doc(de("alicia"), "users", "alicia", "keys", DATOS);

  it("rechaza un documento sin `value`", async () => {
    await assertFails(setDoc(ref(), {}));
    await assertFails(setDoc(ref(), { valor: "{}" }));
  });

  it("rechaza campos de más", async () => {
    await assertFails(setDoc(ref(), { value: "{}", otro: 1 }));
    await assertFails(setDoc(ref(), { value: "{}", premium: { active: true } }));
  });

  it("rechaza un `value` que no es texto", async () => {
    for (const valor of [5, true, null, { a: 1 }, ["a"]]) {
      await assertFails(setDoc(ref(), { value: valor }));
    }
  });

  it("no deja añadir un campo a un documento que ya existe", async () => {
    await preparar(["users", "alicia", "keys", DATOS], { value: "{}" });
    await assertFails(updateDoc(ref(), { otro: 1 }));
    await assertSucceeds(updateDoc(ref(), { value: VALOR_REALISTA }));
  });
});

describe("Tamaño máximo", () => {
  it("cada clave llega hasta 1 048 000 caracteres, justo por debajo del tope de Firestore", async () => {
    const ref = doc(de("alicia"), "users", "alicia", "keys", DATOS);
    await assertSucceeds(setDoc(ref, { value: "x".repeat(1048000) }));
    await assertFails(setDoc(ref, { value: "x".repeat(1048001) }));
  });

  it("un documento grande de verdad, como un `data-v1` de varios años, se guarda", async () => {
    // ~600 KB con tildes: lo que ocuparía `data-v1` tras unos cuatro años marcando todas las comidas.
    const grande = JSON.stringify({ notas: "Pequeña nota con tildes. ".repeat(24000) });
    const ref = doc(de("alicia"), "users", "alicia", "keys", DATOS);
    await assertSucceeds(setDoc(ref, { value: grande }));
  });
});

describe("Todo lo demás, denegado", () => {
  it("otras colecciones de la raíz", async () => {
    const db = de("alicia");
    await assertFails(setDoc(doc(db, "otra", "x"), { value: "{}" }));
    await assertFails(getDoc(doc(db, "otra", "x")));
    await assertFails(setDoc(doc(db, "alicia", "x"), { value: "{}" }));
  });

  it("otras subcolecciones dentro de la propia cuenta", async () => {
    const db = de("alicia");
    await assertFails(setDoc(doc(db, "users", "alicia", "otra", DATOS), { value: "{}" }));
    await assertFails(getDoc(doc(db, "users", "alicia", "otra", DATOS)));
    await assertFails(
      setDoc(doc(db, "users", "alicia", "keys", DATOS, "dentro", "x"), { value: "{}" })
    );
  });

  it("listar las cuentas", async () => {
    await preparar(["users", "alicia"], { premium: { active: false } });
    await assertFails(getDocs(collection(de("alicia"), "users")));
  });
});

describe("Buzón de avisos (R8): lo que leen las funciones de notificaciones", () => {
  // Dos tokens con la forma de los de FCM (unos 160 caracteres, letras, números, `_`, `-` y `:`).
  const MOVIL = "fcm-movil:APA91b" + "M".repeat(150);
  const ORDENADOR = "fcm-ordenador:APA91b" + "O".repeat(146);

  // Lo que escribe la app: los cinco campos, el token del dispositivo añadido sin pisar los de los demás
  // (`arrayUnion`) y la hora del servidor.
  const buzon = (cambios = {}) => ({
    idioma: "es",
    pesaje: true,
    descongelar: false,
    tokens: arrayUnion(MOVIL),
    actualizado: serverTimestamp(),
    ...cambios,
  });
  const refBuzon = (db, uid = "alicia", id = "push") => doc(db, "users", uid, "avisos", id);
  // Un buzón ya guardado, como lo dejaría la app (o una función con el Admin SDK).
  const prepararBuzon = (uid, datos = {}) =>
    preparar(["users", uid, "avisos", "push"], {
      idioma: "es", pesaje: true, descongelar: false, tokens: [MOVIL], actualizado: Timestamp.now(), ...datos,
    });

  it("lo crea, lo lee, añade otro dispositivo, quita uno y lo borra", async () => {
    const db = de("alicia");
    await assertSucceeds(setDoc(refBuzon(db), buzon(), { merge: true }));
    // Activar los avisos en el ordenador: se suma a la lista, el móvil sigue.
    await assertSucceeds(
      setDoc(refBuzon(db), buzon({ descongelar: true, tokens: arrayUnion(ORDENADOR) }), { merge: true })
    );
    const leido = await assertSucceeds(getDoc(refBuzon(db)));
    assert.deepEqual(leido.data().tokens, [MOVIL, ORDENADOR]);
    assert.equal(leido.data().descongelar, true);
    // Cerrar sesión en el móvil: sale de la lista.
    await assertSucceeds(updateDoc(refBuzon(db), { tokens: arrayRemove(MOVIL), actualizado: serverTimestamp() }));
    // Cambiar el idioma.
    await assertSucceeds(updateDoc(refBuzon(db), { idioma: "eu", actualizado: serverTimestamp() }));
    // Quitar los dos avisos.
    await assertSucceeds(deleteDoc(refBuzon(db)));
  });

  it("la lista puede quedarse vacía (sesión cerrada en todos los aparatos)", async () => {
    await prepararBuzon("alicia");
    await assertSucceeds(
      updateDoc(refBuzon(de("alicia")), { tokens: arrayRemove(MOVIL), actualizado: serverTimestamp() })
    );
  });

  it("no lee, no escribe y no borra el buzón de otra persona", async () => {
    await prepararBuzon("alicia");
    const db = de("bruno");
    await assertFails(getDoc(refBuzon(db)));
    await assertFails(setDoc(refBuzon(db), buzon(), { merge: true }));
    await assertFails(updateDoc(refBuzon(db), { tokens: arrayUnion(ORDENADOR), actualizado: serverTimestamp() }));
    await assertFails(deleteDoc(refBuzon(db)));
  });

  it("sin sesión o sin el email verificado, nada", async () => {
    await prepararBuzon("alicia");
    for (const db of [sinSesion(), sinVerificar("alicia")]) {
      await assertFails(getDoc(refBuzon(db)));
      await assertFails(setDoc(refBuzon(db), buzon(), { merge: true }));
      await assertFails(deleteDoc(refBuzon(db)));
    }
  });

  it("solo existe el documento `push`", async () => {
    const db = de("alicia");
    await assertFails(setDoc(refBuzon(db, "alicia", "otro"), buzon()));
    await assertFails(setDoc(refBuzon(db, "alicia", "Push"), buzon()));
    await assertFails(getDoc(refBuzon(db, "alicia", "otro")));
  });

  it("no se lista: ni la propia subcolección ni los buzones de todas las cuentas", async () => {
    await prepararBuzon("alicia");
    await prepararBuzon("bruno");
    await assertFails(getDocs(collection(de("alicia"), "users", "alicia", "avisos")));
    // Esta consulta es justo la que hacen las funciones con el Admin SDK: desde la app, nunca.
    await assertFails(getDocs(collectionGroup(de("alicia"), "avisos")));
  });

  it("exige los cinco campos y ninguno más", async () => {
    const db = de("alicia");
    for (const campo of ["idioma", "pesaje", "descongelar", "tokens", "actualizado"]) {
      const datos = buzon();
      delete datos[campo];
      await assertFails(setDoc(refBuzon(db), datos));
    }
    await assertFails(setDoc(refBuzon(db), buzon({ otro: 1 })));
    await assertFails(setDoc(refBuzon(db), buzon({ premium: { active: true } })));
    // Con el buzón ya guardado, tampoco se le puede añadir un campo.
    await prepararBuzon("alicia");
    await assertFails(updateDoc(refBuzon(db), { otro: 1, actualizado: serverTimestamp() }));
  });

  it("idioma: solo los cinco de la app", async () => {
    const db = de("alicia");
    for (const idioma of ["es", "en", "ca", "gl", "eu"]) {
      await assertSucceeds(setDoc(refBuzon(db), buzon({ idioma })));
    }
    for (const idioma of ["fr", "ES", "", "español", 1, null]) {
      await assertFails(setDoc(refBuzon(db), buzon({ idioma })));
    }
  });

  it("pesaje y descongelar: sí o no, nada más", async () => {
    const db = de("alicia");
    for (const valor of ["true", 1, null, "sí"]) {
      await assertFails(setDoc(refBuzon(db), buzon({ pesaje: valor })));
      await assertFails(setDoc(refBuzon(db), buzon({ descongelar: valor })));
    }
  });

  it("tokens: una lista de hasta 10", async () => {
    const db = de("alicia");
    const lista = (n) => Array.from({ length: n }, (_, i) => `fcm-${i}:APA91b${"x".repeat(150)}`);
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: [] })));
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: lista(10) })));
    await assertFails(setDoc(refBuzon(db), buzon({ tokens: lista(11) })));
    await assertFails(setDoc(refBuzon(db), buzon({ tokens: MOVIL })));
    await assertFails(setDoc(refBuzon(db), buzon({ tokens: { a: MOVIL } })));
    // Con 10 ya guardados, un undécimo aparato no cabe: la app tiene que hacer sitio antes.
    await prepararBuzon("alicia", { tokens: lista(10) });
    await assertFails(updateDoc(refBuzon(db), { tokens: arrayUnion(ORDENADOR), actualizado: serverTimestamp() }));
  });

  it("el tope de aparatos de las reglas es el mismo que el de la app", async () => {
    // La app hace sitio cuando la lista está llena (logica/buzon-avisos.js, MAX_DISPOSITIVOS): si el tope de
    // allí fuera mayor que el de aquí, sus escrituras fallarían; si fuera menor, echaría aparatos sin necesidad.
    const texto = fs.readFileSync(path.join(RAIZ, "logica", "buzon-avisos.js"), "utf8");
    const tope = Number((texto.match(/MAX_DISPOSITIVOS\s*=\s*(\d+)/) || [])[1]);
    assert.ok(tope > 0, "no se ha encontrado MAX_DISPOSITIVOS en logica/buzon-avisos.js");
    const db = de("alicia");
    const lista = (n) => Array.from({ length: n }, (_, i) => `fcm-${i}:APA91b`);
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: lista(tope) })));
    await assertFails(setDoc(refBuzon(db), buzon({ tokens: lista(tope + 1) })));
  });

  it("cada token: texto de 1 a 4096 caracteres, en cualquier posición de la lista", async () => {
    const db = de("alicia");
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: ["t".repeat(4096)] })));
    // (Una lista dentro de la lista no hace falta probarla: Firestore no admite listas anidadas.)
    for (const malo of ["", "t".repeat(4097), 5, null, true, { a: 1 }]) {
      await assertFails(setDoc(refBuzon(db), buzon({ tokens: [malo] })));
    }
    // Las reglas no tienen bucles y miran cada posición por separado (esTokenValido(tokens, 0) … (tokens, 9)): un
    // token malo se tiene que detectar en cualquiera de ellas, también en las del medio. Si alguien borrara sin
    // querer la comprobación de una posición, solo fallaría la prueba de esa posición; por eso se prueban todas.
    const diezBuenos = Array.from({ length: 10 }, (_, i) => `fcm-${i}:APA91b`);
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: diezBuenos })));
    for (let posicion = 0; posicion < 10; posicion++) {
      for (const malo of ["", 42]) {
        const tokens = diezBuenos.map((t, i) => (i === posicion ? malo : t));
        await assertFails(setDoc(refBuzon(db), buzon({ tokens })));
      }
    }
    // Y en una lista más corta, en una posición del medio (la 2 de 5).
    await assertFails(setDoc(refBuzon(db), buzon({ tokens: ["fcm-a", "fcm-b", "", "fcm-d", "fcm-e"] })));
  });

  it("lo que hace la app al quitar los avisos, cerrar sesión o cambiar algo sin permiso (tanda A)", async () => {
    const db = de("alicia");
    // F4: un aparato sin permiso pone al día el idioma y los interruptores sin tocar la lista.
    await prepararBuzon("alicia", { tokens: [MOVIL, ORDENADOR] });
    await assertSucceeds(
      updateDoc(refBuzon(db), { idioma: "gl", pesaje: true, descongelar: false, actualizado: serverTimestamp() })
    );
    const leido = (await assertSucceeds(getDoc(refBuzon(db)))).data();
    assert.deepEqual(leido.tokens, [MOVIL, ORDENADOR]);
    assert.equal(leido.idioma, "gl");
    // Si no hay buzón, esa escritura no crea nada y falla. Ojo: no con `not-found`, como en `keys`, sino con
    // `permission-denied`, porque las reglas miran antes el documento resultante y sin buzón solo tiene los campos
    // que manda la escritura (faltan `tokens`). Lo mismo al cerrar sesión (solo `tokens` y `actualizado`). Por eso la
    // app, ante ese error, lee el buzón para distinguir «no existe» de un rechazo de verdad (faltaElBuzon,
    // auth-bootstrap.jsx); leer el propio buzón aunque no exista está permitido.
    await assertSucceeds(deleteDoc(refBuzon(db)));
    const sinBuzon = await updateDoc(refBuzon(db), {
      idioma: "gl", pesaje: true, descongelar: false, actualizado: serverTimestamp(),
    }).then(() => null, (e) => e);
    assert.equal(sinBuzon && sinBuzon.code, "permission-denied");
    await assertFails(updateDoc(refBuzon(db), { tokens: arrayRemove(MOVIL), actualizado: serverTimestamp() }));
    const leidoSinBuzon = await assertSucceeds(getDoc(refBuzon(db)));
    assert.equal(leidoSinBuzon.exists(), false);
    // F1: borrar un buzón que ya no existe también vale (se repite al abrir la app si el primer borrado no llegó).
    await assertSucceeds(deleteDoc(refBuzon(db)));
  });

  it("actualizado: la hora del servidor, nunca una puesta por la app", async () => {
    const db = de("alicia");
    await assertFails(setDoc(refBuzon(db), buzon({ actualizado: Timestamp.now() })));
    await assertFails(setDoc(refBuzon(db), buzon({ actualizado: Timestamp.fromDate(new Date("2099-01-01")) })));
    await assertFails(setDoc(refBuzon(db), buzon({ actualizado: "2026-11-05" })));
    // Al actualizar, tampoco vale dejar la hora de la escritura anterior.
    await prepararBuzon("alicia");
    await assertFails(updateDoc(refBuzon(db), { idioma: "en" }));
  });

  // ---------- Tanda B (M2): lo justo del seguimiento de peso, para no abrir `data-v1` cada mañana ----------
  const conPeso = (cambios = {}) => buzon({ pesoVecesSemana: 3, pesoPausado: false, ultimaPesada: "2026-11-06", ...cambios });

  it("datos de pesaje: se aceptan con su tipo y su rango, juntos o sueltos", async () => {
    const db = de("alicia");
    await assertSucceeds(setDoc(refBuzon(db), conPeso()));
    await assertSucceeds(setDoc(refBuzon(db), conPeso({ pesoVecesSemana: 2, pesoPausado: true, ultimaPesada: null })));
    // Sin seguimiento de peso: frecuencia y fecha vacías.
    await assertSucceeds(setDoc(refBuzon(db), conPeso({ pesoVecesSemana: null, ultimaPesada: null })));
    // Cada uno es opcional por separado (la función solo los usa si están los tres; si no, abre `data-v1`).
    await assertSucceeds(setDoc(refBuzon(db), buzon({ pesoPausado: true })));
    await assertSucceeds(setDoc(refBuzon(db), buzon({ ultimaPesada: "2026-01-31" })));
  });

  it("un buzón sin los datos de pesaje sigue valiendo (el de antes, o el que escribe una app sin actualizar)", async () => {
    const db = de("alicia");
    // El de antes, tal cual: se crea, se actualiza y se le añade un aparato.
    await assertSucceeds(setDoc(refBuzon(db), buzon()));
    await assertSucceeds(updateDoc(refBuzon(db), { idioma: "ca", actualizado: serverTimestamp() }));
    // La app nueva le pone los datos de pesaje.
    await assertSucceeds(
      updateDoc(refBuzon(db), { pesoVecesSemana: 2, pesoPausado: false, ultimaPesada: null, actualizado: serverTimestamp() })
    );
    // Y una copia sin actualizar lo reescribe con `merge` sin ellos: vale, y los que había se quedan.
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: arrayUnion(ORDENADOR) }), { merge: true }));
    const leido = (await assertSucceeds(getDoc(refBuzon(db)))).data();
    assert.equal(leido.pesoVecesSemana, 2);
    assert.deepEqual(leido.tokens, [MOVIL, ORDENADOR]);
    // O lo reescribe entero sin ellos (lista llena): también vale, y la función vuelve a abrir `data-v1`.
    await assertSucceeds(setDoc(refBuzon(db), buzon({ tokens: [MOVIL] })));
    assert.equal("pesoVecesSemana" in (await assertSucceeds(getDoc(refBuzon(db)))).data(), false);
  });

  it("pesoVecesSemana: 2, 3 o null, como número entero", async () => {
    const db = de("alicia");
    for (const valor of [1, 4, 0, -3, 2.5, "3", true, [3], { veces: 3 }]) {
      await assertFails(setDoc(refBuzon(db), conPeso({ pesoVecesSemana: valor })));
    }
  });

  it("las frecuencias de las reglas son las de la app (PESO_FRECUENCIAS)", async () => {
    // Si la app ofreciera una frecuencia que las reglas no aceptan, el buzón de quien la eligiera no se podría
    // escribir: ni el recordatorio de pesaje ni el de descongelar, ni sus aparatos. Esta prueba lo nota.
    const texto = fs.readFileSync(path.join(RAIZ, "logica", "peso.js"), "utf8");
    const lista = (texto.match(/PESO_FRECUENCIAS\s*=\s*\[([^\]]*)\]/) || [])[1];
    const frecuencias = (lista || "").split(",").map((n) => Number(n.trim())).filter((n) => n > 0);
    assert.ok(frecuencias.length > 0, "no se ha encontrado PESO_FRECUENCIAS en logica/peso.js");
    const db = de("alicia");
    for (const veces of frecuencias) {
      await assertSucceeds(setDoc(refBuzon(db), conPeso({ pesoVecesSemana: veces })));
    }
  });

  it("pesoPausado: sí o no; si está, nunca null ni otra cosa", async () => {
    const db = de("alicia");
    for (const valor of [null, "sí", "false", 1, 0]) {
      await assertFails(setDoc(refBuzon(db), conPeso({ pesoPausado: valor })));
    }
  });

  it("ultimaPesada: una fecha AAAA-MM-DD o null, nada más", async () => {
    const db = de("alicia");
    for (const valor of ["", "6/11/2026", "2026-11-6", "2026-11-06T09:00", "06-11-2026", "hoy", " 2026-11-06", 20261106, true,
      Timestamp.fromDate(new Date("2026-11-06T09:00:00Z"))]) {
      await assertFails(setDoc(refBuzon(db), conPeso({ ultimaPesada: valor })));
    }
  });

  it("nunca el peso ni nada más del seguimiento: siguen siendo como mucho los ocho campos", async () => {
    const db = de("alicia");
    await assertFails(setDoc(refBuzon(db), conPeso({ peso: 72.5 })));
    await assertFails(setDoc(refBuzon(db), conPeso({ ultimoPeso: 72.5 })));
    await assertFails(setDoc(refBuzon(db), conPeso({ pesoTracking: { vecesSemana: 3 } })));
    await prepararBuzon("alicia", { pesoVecesSemana: 3, pesoPausado: false, ultimaPesada: null });
    await assertFails(updateDoc(refBuzon(db), { peso: 72.5, actualizado: serverTimestamp() }));
  });

  it("F4 con los datos de pesaje: pone al día un buzón que existe y sigue fallando con permission-denied si no existe", async () => {
    // La app, desde un aparato sin permiso, manda ahora también los datos de pesaje (sin tocar la lista). Sin buzón,
    // el documento resultante sigue sin `tokens` y las reglas lo rechazan igual: faltaElBuzon (auth-bootstrap.jsx)
    // depende de que sea `permission-denied`.
    const db = de("alicia");
    const sinToken = { idioma: "es", pesaje: true, descongelar: false, pesoVecesSemana: 3, pesoPausado: true, ultimaPesada: "2026-11-05" };
    await prepararBuzon("alicia", { tokens: [MOVIL, ORDENADOR] });
    await assertSucceeds(updateDoc(refBuzon(db), { ...sinToken, actualizado: serverTimestamp() }));
    const leido = (await assertSucceeds(getDoc(refBuzon(db)))).data();
    assert.deepEqual(leido.tokens, [MOVIL, ORDENADOR]);
    assert.equal(leido.pesoPausado, true);
    await assertSucceeds(deleteDoc(refBuzon(db)));
    const sinBuzon = await updateDoc(refBuzon(db), { ...sinToken, actualizado: serverTimestamp() }).then(() => null, (e) => e);
    assert.equal(sinBuzon && sinBuzon.code, "permission-denied");
  });
});

describe("Consentimientos y edad mínima (etapa 2): un libro de firmas", () => {
  // El año del servidor (`request.time.year()`, en UTC): el emulador usa la hora real de este ordenador. Una pasada
  // justo en el cambio de año podría fallar una vez; no merece complicar las pruebas.
  const ANIO = new Date().getUTCFullYear();
  const V = "2026-11-10";
  const ref = (db, id, uid = "alicia") => doc(db, "users", uid, "consentimientos", id);
  // Lo que escribe la app (logica/consentimientos.js, documentosAFirmar, más la hora del servidor).
  const edad = (cambios = {}) => ({ tipo: "edad", anioNacimiento: ANIO - 30, fecha: serverTimestamp(), ...cambios });
  const firma = (tipo, cambios = {}) => ({ tipo, version: V, fecha: serverTimestamp(), ...cambios });
  const sin = (datos, campo) => {
    const copia = { ...datos };
    delete copia[campo];
    return copia;
  };
  // Lee una constante numérica de logica/consentimientos.js: las reglas llevan los mismos números a mano.
  const constanteDeLaApp = (nombre) => {
    const texto = fs.readFileSync(path.join(RAIZ, "logica", "consentimientos.js"), "utf8");
    return Number((texto.match(new RegExp(`${nombre}\\s*=\\s*(\\d+)`)) || [])[1]);
  };

  it("firma las tres de una vez (en un lote, como la app), las lee y no las puede cambiar ni borrar", async () => {
    const db = de("alicia");
    const lote = writeBatch(db);
    lote.set(ref(db, "edad"), edad());
    lote.set(ref(db, `terminos-${V}`), firma("terminos"));
    lote.set(ref(db, `salud-${V}`), firma("salud"));
    await assertSucceeds(lote.commit());
    const leida = await assertSucceeds(getDoc(ref(db, `salud-${V}`)));
    assert.equal(leida.data().version, V);
    // Ni reescribirla (aunque traiga lo mismo: eso es un `update`), ni retocarla, ni borrarla.
    await assertFails(setDoc(ref(db, `salud-${V}`), firma("salud")));
    await assertFails(updateDoc(ref(db, "edad"), { anioNacimiento: ANIO - 40 }));
    await assertFails(deleteDoc(ref(db, `terminos-${V}`)));
    await assertFails(deleteDoc(ref(db, "edad")));
  });

  it("un lote con una firma mala no guarda ninguna", async () => {
    const db = de("alicia");
    const lote = writeBatch(db);
    lote.set(ref(db, "edad"), edad({ anioNacimiento: ANIO - 10 }));
    lote.set(ref(db, `terminos-${V}`), firma("terminos"));
    await assertFails(lote.commit());
    assert.equal((await assertSucceeds(getDoc(ref(db, `terminos-${V}`)))).exists(), false);
  });

  it("una versión nueva de un texto se firma aparte y la anterior se queda como prueba", async () => {
    await preparar(["users", "alicia", "consentimientos", `terminos-${V}`], { tipo: "terminos", version: V, fecha: Timestamp.now() });
    const db = de("alicia");
    await assertSucceeds(setDoc(ref(db, "terminos-2027-03-01"), firma("terminos", { version: "2027-03-01" })));
    assert.equal((await assertSucceeds(getDoc(ref(db, `terminos-${V}`)))).exists(), true);
  });

  it("no lee ni firma en la cuenta de otra persona", async () => {
    await preparar(["users", "bruno", "consentimientos", "edad"], { tipo: "edad", anioNacimiento: ANIO - 30, fecha: Timestamp.now() });
    const db = de("alicia");
    await assertFails(getDoc(ref(db, "edad", "bruno")));
    await assertFails(setDoc(ref(db, `salud-${V}`, "bruno"), firma("salud")));
    await assertFails(setDoc(ref(db, "edad", "carla"), edad()));
  });

  it("sin sesión o sin el email verificado, nada", async () => {
    for (const db of [sinSesion(), sinVerificar("alicia")]) {
      await assertFails(getDoc(ref(db, "edad")));
      await assertFails(setDoc(ref(db, "edad"), edad()));
      await assertFails(setDoc(ref(db, `salud-${V}`), firma("salud")));
    }
  });

  it("no se lista: la app lee cada firma por su nombre", async () => {
    await preparar(["users", "alicia", "consentimientos", "edad"], { tipo: "edad", anioNacimiento: ANIO - 30, fecha: Timestamp.now() });
    await assertFails(getDocs(collection(de("alicia"), "users", "alicia", "consentimientos")));
    await assertFails(getDocs(collectionGroup(de("alicia"), "consentimientos")));
  });

  it("fecha: la hora del servidor, nunca una puesta por la app", async () => {
    const db = de("alicia");
    for (const fecha of [Timestamp.now(), Timestamp.fromDate(new Date("2020-01-01")), "2026-11-10", null]) {
      await assertFails(setDoc(ref(db, `salud-${V}`), firma("salud", { fecha })));
      await assertFails(setDoc(ref(db, "edad"), edad({ fecha })));
    }
    await assertFails(setDoc(ref(db, `salud-${V}`), sin(firma("salud"), "fecha")));
    await assertFails(setDoc(ref(db, "edad"), sin(edad(), "fecha")));
  });

  it("términos y salud: el tipo, la versión con forma de fecha y el nombre del documento tienen que cuadrar", async () => {
    const db = de("alicia");
    // Nombre que no cuadra con lo que dice dentro.
    await assertFails(setDoc(ref(db, "salud-2026-11-11"), firma("salud")));
    await assertFails(setDoc(ref(db, `salud-${V}`), firma("terminos")));
    await assertFails(setDoc(ref(db, "salud"), firma("salud")));
    // Tipos que no existen (el de estudios llegará con un estudio concreto, D8; la edad no lleva versión).
    for (const tipo of ["estudios", "periodo", "edad", "Salud", ""]) {
      await assertFails(setDoc(ref(db, `${tipo}-${V}`), firma(tipo)));
    }
    // Versiones sin forma de fecha.
    for (const version of ["1", "v2", "2026-11", "10-11-2026", "2026-11-10 ", 20261110, null]) {
      await assertFails(setDoc(ref(db, `salud-${version}`), firma("salud", { version })));
    }
    // Bien escrito, sí.
    await assertSucceeds(setDoc(ref(db, `salud-${V}`), firma("salud")));
  });

  it("términos y salud: exactamente tipo, versión y fecha", async () => {
    const db = de("alicia");
    await assertFails(setDoc(ref(db, `salud-${V}`), firma("salud", { anioNacimiento: 1990 })));
    await assertFails(setDoc(ref(db, `salud-${V}`), firma("salud", { acepta: true })));
    await assertFails(setDoc(ref(db, `salud-${V}`), sin(firma("salud"), "version")));
    await assertFails(setDoc(ref(db, `salud-${V}`), sin(firma("salud"), "tipo")));
  });

  it("edad: 19 años o más vale; 18 justos solo si ha dicho que ya los ha cumplido; menos, nunca", async () => {
    const db = de("alicia");
    const intento = (datos) => setDoc(ref(db, "edad"), edad(datos));
    // Los que tienen que fallar van antes: una vez firmada, la edad ya no se puede reescribir.
    await assertFails(intento({ anioNacimiento: ANIO - 18 }));
    await assertFails(intento({ anioNacimiento: ANIO - 17, cumplidosEsteAnio: true }));
    await assertFails(intento({ anioNacimiento: ANIO - 10 }));
    await assertFails(intento({ anioNacimiento: ANIO + 1 }));
    await assertSucceeds(intento({ anioNacimiento: ANIO - 18, cumplidosEsteAnio: true }));
  });

  it("edad: el año, un número entero; cumplidosEsteAnio, si está, solo un sí; nada más", async () => {
    const db = de("alicia");
    for (const anio of [String(ANIO - 30), ANIO - 30 + 0.5, null, true]) {
      await assertFails(setDoc(ref(db, "edad"), edad({ anioNacimiento: anio })));
    }
    await assertFails(setDoc(ref(db, "edad"), sin(edad(), "anioNacimiento")));
    for (const valor of [false, "sí", 1, null]) {
      await assertFails(setDoc(ref(db, "edad"), edad({ anioNacimiento: ANIO - 18, cumplidosEsteAnio: valor })));
      await assertFails(setDoc(ref(db, "edad"), edad({ anioNacimiento: ANIO - 30, cumplidosEsteAnio: valor })));
    }
    await assertFails(setDoc(ref(db, "edad"), edad({ mes: 5 })));
    await assertFails(setDoc(ref(db, "edad"), edad({ tipo: "salud" })));
    await assertFails(setDoc(ref(db, "edad"), sin(edad(), "tipo")));
    // La edad, solo en el documento `edad`.
    await assertFails(setDoc(ref(db, "edad-2026"), edad()));
    await assertSucceeds(setDoc(ref(db, "edad"), edad()));
  });

  it("la edad mínima y la máxima de las reglas son las de la app (EDAD_MINIMA y EDAD_MAXIMA)", async () => {
    // La app decide con logica/consentimientos.js si alguien puede seguir; si las reglas pidieran otra edad, quien
    // está en el borde vería la pantalla decir que sí y la firma fallar (o al revés). Cada borde, en su propia cuenta:
    // la edad se firma una sola vez.
    const minima = constanteDeLaApp("EDAD_MINIMA");
    const maxima = constanteDeLaApp("EDAD_MAXIMA");
    assert.ok(minima > 0 && maxima > minima, "no se han encontrado EDAD_MINIMA y EDAD_MAXIMA en logica/consentimientos.js");
    const firmaEdad = (uid, datos) => setDoc(ref(de(uid), "edad", uid), edad(datos));
    await assertSucceeds(firmaEdad("u1", { anioNacimiento: ANIO - minima - 1 }));
    await assertSucceeds(firmaEdad("u2", { anioNacimiento: ANIO - minima, cumplidosEsteAnio: true }));
    await assertFails(firmaEdad("u3", { anioNacimiento: ANIO - minima }));
    await assertFails(firmaEdad("u4", { anioNacimiento: ANIO - minima + 1, cumplidosEsteAnio: true }));
    await assertSucceeds(firmaEdad("u5", { anioNacimiento: ANIO - maxima }));
    await assertFails(firmaEdad("u6", { anioNacimiento: ANIO - maxima - 1 }));
  });

  it("la versión vigente de cada texto en la app se puede firmar", async () => {
    // Si alguien sube una versión en la app con otra forma (`v2`, `10/11/2026`...), nadie podría pasar de la pantalla
    // de firma. Esta prueba lo nota antes de publicar.
    const texto = fs.readFileSync(path.join(RAIZ, "logica", "consentimientos.js"), "utf8");
    const bloque = (texto.match(/VERSIONES\s*=\s*\{([^}]*)\}/) || [])[1] || "";
    const terminos = (bloque.match(/terminos:\s*"([^"]+)"/) || [])[1];
    const salud = (bloque.match(/salud:\s*"([^"]+)"/) || [])[1];
    assert.ok(terminos && salud, "no se han encontrado las VERSIONES en logica/consentimientos.js");
    const db = de("alicia");
    await assertSucceeds(setDoc(ref(db, `terminos-${terminos}`), firma("terminos", { version: terminos })));
    await assertSucceeds(setDoc(ref(db, `salud-${salud}`), firma("salud", { version: salud })));
  });
});
