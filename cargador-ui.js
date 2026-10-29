// ---------- Cargador de la interfaz (app.jsx + ui/) ----------
// Módulo sin JSX: lo importan auth-bootstrap.jsx (la app real) y validacion/index.html (las
// pruebas), así que las dos cargan la interfaz exactamente igual, nunca con una copia.
//
// Por qué existe: el importmap decide dónde buscar un archivo, pero no lo transforma, y un .jsx
// necesita pasar por Babel antes de que el navegador lo ejecute. Hasta octubre de 2026 eso obligaba
// a tener toda la interfaz en un único app.jsx (ver CLAUDE.md, "Cómo se carga la interfaz"). Este
// cargador lo resuelve sin build: descarga app.jsx y todos los archivos de ui/, los pasa por Babel
// convirtiendo sus import/export en un registro propio (plugin "transform-modules-commonjs", que
// ya trae Babel Standalone) y los enlaza entre sí en el navegador. Los componentes se escriben con
// import/export normales; nada de esto se nota al escribirlos.
//
// Reglas de resolución:
//  - Rutas relativas ("./ui/...", "../comun/modal.jsx"): archivos de la interfaz, relativos al que
//    los importa. Se descargan, se transforman y se ejecutan una sola vez cada uno.
//  - Nombres cortos ("react", "lucide-react", "i18n", "macros"...): se resuelven con el importmap
//    de la página mediante import() dinámico, igual que antes.
//
// ui/archivos.json es la lista de archivos de ui/: el cargador la usa para pedirlos todos en
// paralelo (en vez de ir descubriéndolos por niveles) y sw.js para guardarlos para el modo sin
// conexión. Si falta alguno en la lista, el cargador lo descarga igualmente al descubrirlo — la app
// no se rompe — pero no quedaría disponible sin conexión: validacion/ lo detecta (caso "Carga de la
// interfaz").

let cargados = []; // rutas efectivamente cargadas en la última carga (para validacion/)

// ---------- Caché del código ya transformado (IndexedDB) ----------
// Babel transforma toda la interfaz en cada arranque: 1,1-1,5 s de CPU en escritorio y varias veces más en
// un móvil (medido en el diagnóstico de octubre de 2026, local/diagnostico-2026-10/04-rendimiento.md § 5).
// Aquí se guarda el resultado de cada archivo entre visitas, con una clave que cambia en cuanto cambia
// cualquier cosa que influya en él: la versión de Babel, las opciones de abajo y el contenido exacto del
// archivo (su SHA-256). Lo importante:
//  - La fuente se sigue pidiendo SIEMPRE (con no-cache, así que suele ser un 304 barato). La caché solo
//    recuerda transformar(fuente); nunca decide qué versión de un archivo se usa, así que tras un despliegue
//    no puede mezclar archivos viejos con nuevos.
//  - Si algo falla (sin IndexedDB, sin crypto.subtle fuera de https/localhost, cuota llena, navegación
//    privada...), se transforma como siempre. Solo se guarda después de que la interfaz se haya ejecutado
//    sin errores, así que un resultado roto no llega a guardarse.
//  - IndexedDB y no localStorage: el código transformado pesa ~1,4 MB y localStorage (≈5 MB por origen) lo
//    comparten el entreno y el período; llenarlo los rompería.
const OPCIONES_BABEL = { presets: ["react"], plugins: ["transform-modules-commonjs"], sourceType: "module" };
// Súbelo si cambian OPCIONES_BABEL o lo que se hace con el resultado: invalida todo lo guardado.
const VERSION_OPCIONES = 1;
const BASE_DATOS = "fooddraft-codigo-transformado";

function abrirAlmacen() {
  return new Promise((ok) => {
    let req;
    try {
      req = indexedDB.open(BASE_DATOS, 1);
    } catch (e) {
      ok(null);
      return;
    }
    req.onupgradeneeded = () => req.result.createObjectStore("codigo", { keyPath: "ruta" });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ok(null);
    req.onblocked = () => ok(null);
  });
}

function leerTodo(db) {
  if (!db) return Promise.resolve(new Map());
  return new Promise((ok) => {
    try {
      const r = db.transaction("codigo").objectStore("codigo").getAll();
      r.onsuccess = () => ok(new Map(r.result.map((e) => [e.ruta, e])));
      r.onerror = () => ok(new Map());
    } catch (e) {
      ok(new Map());
    }
  });
}

// En segundo plano (nadie lo espera). `vivas`: si se pasa, se quitan las rutas guardadas que ya no existen.
function guardarTransformados(db, nuevos, vivas) {
  try {
    const tx = db.transaction("codigo", "readwrite");
    const almacen = tx.objectStore("codigo");
    nuevos.forEach((e) => almacen.put(e));
    if (vivas) {
      const r = almacen.getAllKeys();
      r.onsuccess = () => r.result.forEach((ruta) => { if (!vivas.has(ruta)) almacen.delete(ruta); });
    }
    tx.oncomplete = tx.onerror = tx.onabort = () => db.close();
  } catch (e) {
    try { db.close(); } catch (e2) { /* nada */ }
  }
}

async function huella(texto) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}

// Rutas relativas a la raíz de la app ("ui/menu/menu-completo.jsx"), sin "./" ni "..".
function resolver(desde, especificador) {
  const base = desde.includes("/") ? desde.slice(0, desde.lastIndexOf("/") + 1) : "";
  const partes = (base + especificador).split("/");
  const salida = [];
  for (const p of partes) {
    if (p === "" || p === ".") continue;
    if (p === "..") salida.pop();
    else salida.push(p);
  }
  return salida.join("/");
}
const esRelativo = (e) => e.startsWith("./") || e.startsWith("../");

// Babel transforma "import X from 'react'" en require("react") + una ayuda que, si el módulo no
// lleva la marca __esModule, envuelve el módulo entero como si fuera su "default". Los módulos
// nativos (namespaces de import()) no la llevan, así que se les añade para que el default import
// reciba el export default de verdad y no el namespace completo.
function comoModuloBabel(ns) {
  return { __esModule: true, ...ns };
}

// `cacheTransformado: false` transforma siempre (lo usa validacion/, para probar siempre la transformación
// real).
export async function cargarApp({ base = "./", entrada = "app.jsx", cacheTransformado = true } = {}) {
  const raiz = new URL(base, document.baseURI);
  const codigo = new Map();     // ruta -> código ya transformado
  const externos = new Set();   // nombres cortos que hay que traer con import()

  // Caché del código transformado: solo con crypto.subtle (https o localhost) y Babel cargado.
  const conCache = cacheTransformado && typeof indexedDB !== "undefined" && !!(globalThis.crypto && crypto.subtle) && !!globalThis.Babel;
  const db = conCache ? await abrirAlmacen() : null;
  const guardados = await leerTodo(db);
  const prefijoClave = `babel-${globalThis.Babel && Babel.version}|opciones-${VERSION_OPCIONES}|`;
  const nuevos = [];

  async function descargar(ruta) {
    if (codigo.has(ruta)) return;
    codigo.set(ruta, null); // reservado, para no pedirlo dos veces en paralelo
    // cache: "no-cache" = el navegador puede usar su copia, pero solo tras confirmar con el servidor
    // que no ha cambiado (respuesta 304, muy barata). Con la interfaz repartida en muchos archivos,
    // fiarse a ciegas de la caché HTTP (GitHub Pages la permite 10 minutos) podría mezclar archivos
    // nuevos con otros viejos justo después de un despliegue. Con el service worker activo da igual:
    // él ya pide siempre la versión de red (ver sw.js).
    const resp = await fetch(new URL(ruta, raiz), { cache: "no-cache" });
    if (!resp.ok) throw new Error(`No se ha podido cargar ${ruta} (HTTP ${resp.status})`);
    const fuente = await resp.text();
    let js;
    let clave = null;
    if (db) {
      try {
        clave = prefijoClave + (await huella(fuente));
      } catch (e) {
        clave = null;
      }
    }
    const guardado = clave && guardados.get(ruta);
    if (guardado && guardado.clave === clave) {
      js = guardado.js;
    } else {
      try {
        js = Babel.transform(fuente, { ...OPCIONES_BABEL, filename: ruta }).code;
      } catch (e) {
        throw new Error(`Error de sintaxis en ${ruta}: ${e.message}`);
      }
      if (clave) nuevos.push({ ruta, clave, js });
    }
    // sourceURL: en las herramientas del navegador cada archivo aparece con su nombre real.
    codigo.set(ruta, js + `\n//# sourceURL=${new URL(ruta, raiz).href}`);
    const pendientes = [];
    for (const [, , esp] of js.matchAll(/require\((["'])([^"']+)\1\)/g)) {
      if (esRelativo(esp)) pendientes.push(descargar(resolver(ruta, esp)));
      else externos.add(esp);
    }
    await Promise.all(pendientes);
  }

  // 1) La lista conocida, en paralelo con la entrada; 2) lo que se descubra por el camino.
  let lista = [];
  try {
    const r = await fetch(new URL("ui/archivos.json", raiz), { cache: "no-cache" });
    if (r.ok) lista = await r.json();
  } catch (e) {
    // Sin la lista se cargan igual, descubriéndolos a partir de los import de cada archivo.
  }
  await Promise.all([entrada, ...lista].map(descargar));

  // 3) Módulos externos (React, lucide, logica/...) con el importmap de la página.
  const modulosExternos = new Map();
  await Promise.all([...externos].map(async (esp) => {
    modulosExternos.set(esp, comoModuloBabel(await import(esp)));
  }));

  // 4) Ejecución bajo demanda, cada archivo una sola vez. Los ciclos entre archivos no son un
  // problema mientras nadie use un componente ajeno al cargarse (solo al pintarse), que es el caso
  // de toda la interfaz: Babel accede a lo importado en el momento de usarlo, no al importarlo.
  const ejecutados = new Map();
  cargados = [];
  function requerir(desde, esp) {
    if (!esRelativo(esp)) {
      if (!modulosExternos.has(esp)) throw new Error(`Módulo externo no cargado: ${esp} (importado desde ${desde})`);
      return modulosExternos.get(esp);
    }
    const ruta = resolver(desde, esp);
    if (ejecutados.has(ruta)) return ejecutados.get(ruta).exports;
    const fuente = codigo.get(ruta);
    if (!fuente) throw new Error(`Archivo no encontrado: ${ruta} (importado desde ${desde})`);
    const modulo = { exports: {} };
    ejecutados.set(ruta, modulo);
    cargados.push(ruta);
    // eslint-disable-next-line no-new-func
    new Function("require", "module", "exports", fuente)((e) => requerir(ruta, e), modulo, modulo.exports);
    return modulo.exports;
  }
  const resultado = requerir("", "./" + entrada); // si lanza, no se guarda nada
  // Solo una carga completa de la app (con la lista) sabe qué rutas ya no existen y puede quitarlas.
  if (db) guardarTransformados(db, nuevos, entrada === "app.jsx" && lista.length ? new Set(codigo.keys()) : null);
  return resultado;
}

// Archivos de ui/ que se cargaron de verdad en la última llamada a cargarApp (sin app.jsx). Lo usa
// validacion/ para comprobar que ui/archivos.json no se ha quedado atrás.
export function archivosCargados() {
  return cargados.filter((r) => r.startsWith("ui/")).sort();
}
