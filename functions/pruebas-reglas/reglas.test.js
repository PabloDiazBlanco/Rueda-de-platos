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
// aquí en vez de dejar sin guardar a todas las cuentas en producción.

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
  getDocs,
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
  "rueda-de-platos:push-token-v1",
];

const DATOS = "rueda-de-platos:data-v1";
const TOKEN = "rueda-de-platos:push-token-v1";

// Un texto como los que guarda la app: JSON serializado, con tildes y eñes (ocupan 2 bytes cada una).
const VALOR_REALISTA = JSON.stringify({
  perfil: { nombre: "Begoña", idioma: "es", peso: 72.5 },
  foods: [{ id: "f1", name: "Ñoquis de calabaza", kcal: 180 }],
  comidasCompletadas: { "2026-11-03": ["Comida", "Cena"] },
});

let entorno;

// Firestore de una persona con sesión iniciada (uid), o sin sesión.
const de = (uid) => entorno.authenticatedContext(uid).firestore();
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
      if (clave === "rueda-de-platos:migrated" || clave.endsWith("-")) continue;
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

  it("guarda el token de notificaciones en texto plano", async () => {
    const ref = doc(de("alicia"), "users", "alicia", "keys", TOKEN);
    await assertSucceeds(setDoc(ref, { value: "fcm-token:APA91bHxyz_-0123456789" }));
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

  it("acepta un documento por mes de entreno", async () => {
    const db = de("alicia");
    for (const mes of ["2026-01", "2026-10", "2026-12", "1998-05", "2031-07"]) {
      const clave = `rueda-de-platos:entreno-${mes}-v1`;
      await assertSucceeds(setDoc(doc(db, "users", "alicia", "keys", clave), { value: "{}" }));
    }
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
  it("el token de notificaciones llega hasta 4096 caracteres", async () => {
    const ref = doc(de("alicia"), "users", "alicia", "keys", TOKEN);
    await assertSucceeds(setDoc(ref, { value: "t".repeat(4096) }));
    await assertFails(setDoc(ref, { value: "t".repeat(4097) }));
  });

  it("el resto llega hasta 1 048 000 caracteres, justo por debajo del tope de Firestore", async () => {
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
