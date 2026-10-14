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

export async function cargarApp({ base = "./", entrada = "app.jsx" } = {}) {
  const raiz = new URL(base, document.baseURI);
  const codigo = new Map();     // ruta -> código ya transformado
  const externos = new Set();   // nombres cortos que hay que traer con import()

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
    try {
      js = Babel.transform(fuente, {
        presets: ["react"],
        plugins: ["transform-modules-commonjs"],
        sourceType: "module",
        filename: ruta,
      }).code;
    } catch (e) {
      throw new Error(`Error de sintaxis en ${ruta}: ${e.message}`);
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
  return requerir("", "./" + entrada);
}

// Archivos de ui/ que se cargaron de verdad en la última llamada a cargarApp (sin app.jsx). Lo usa
// validacion/ para comprobar que ui/archivos.json no se ha quedado atrás.
export function archivosCargados() {
  return cargados.filter((r) => r.startsWith("ui/")).sort();
}
