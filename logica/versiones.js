// ---------- Versiones de lo guardado: que una copia vieja de la app no estropee datos nuevos ----------
// Módulo de lógica pura (sin JSX, sin React, sin Firebase). Auditoría de datos de noviembre de 2026, R12 y el
// primer paso de R13 (punto 16 del plan de trabajo, local/auditoria-2026-11/).
//
// El problema, con la analogía de siempre: un Word antiguo abre un documento hecho con un Word nuevo y, al
// guardar, pierde lo que no entiende. En la app pasaba lo mismo, y sin que nadie pulsara «guardar»: al cargar,
// cada clave pasa por su migración y, si la migración «arregla» algo, el hook la reescribe en ese momento. Una
// migración que encontraba `version: 2` la tomaba por rara, le ponía `version: 1` y la reescribía (las del
// entreno, la despensa, sueño y pasos...), y algunas tiraban además los campos que no conocían. Una copia de la
// app sin actualizar (una pestaña o una PWA que se quedó abierta en segundo plano, o un «volver atrás» del código)
// bastaba para deshacer en la nube lo que hubiera escrito una versión más nueva.
//
// La regla: **una copia de la app nunca escribe encima de datos de una versión mayor que la que conoce**. Si al
// leer cualquier clave de la cuenta encuentra una `version` mayor que la suya, deja de guardar **todo** (no solo
// esa clave: los datos de una cuenta dependen unos de otros, como la despensa del menú confirmado) y la app enseña
// «Actualiza FoodDraft» (ActualizaApp, ui/comun/error-carga.jsx). Leer sigue permitido: leer no estropea nada.
// Bloquear la app entera, y no solo dejar de guardar esa parte, es decisión de Pablo (17-nov-2026): una app que se
// deja usar pero no guarda acaba en «lo apunté y no está», que es peor que un aviso claro.
//
// Dónde se aplica, en dos capas:
// 1. **`protegerVersiones`**, que envuelve window.storage al iniciar sesión (auth-bootstrap.jsx). Es la que manda:
//    todas las lecturas y escrituras de la cuenta pasan por ahí, también las que el entreno hace a mitad de uso
//    (un mes, el índice), así que no depende de que cada hook se acuerde. Además avisa a la app para que enseñe la
//    pantalla de actualizar.
// 2. **Las migraciones** de cada clave (`exigirVersionConocida`): si les llega una versión mayor, se niegan a
//    tocarla y lanzan un error, en vez de rebajarla a la suya. No debería llegarles nunca (la capa 1 corta antes),
//    pero así ninguna migración vuelve a «arreglar» a la baja un documento nuevo, venga de donde venga. Lo que solo
//    vive en el aparato (el período, en localStorage, que no pasa por window.storage) lo comprueba además su
//    pantalla antes de escribir (ui/cuerpo/periodo.jsx).
//
// Lo que esta protección **no** cubre (documentacion/datos.md, «Versiones y copias viejas de la app»): una copia
// vieja que leyó los datos antes de que la nueva los cambiara y los guarda desde la memoria. Ese es el caso de dos
// aparatos que se pisan (R4, punto 15 del plan). Y solo protege en las copias que ya la llevan: por eso tiene que
// pasar un tiempo en producción antes de que se suba ninguna versión.
//
// Cómo se lee una `version`:
// - Solo cuenta un número. Sin `version` (los datos principales de antes de R12; los menús, que hoy son una lista
//   suelta) es la versión 1: lo que la app ha guardado siempre.
// - Una `version` que no es un número ("2", null...) no bloquea: no la escribe ninguna versión de la app, así que
//   solo puede ser un dato dañado, y la migración de esa clave la deja como siempre. El peligro de este módulo no
//   es perder datos, sino lo contrario: un fallo que enseñe «Actualiza» a todo el mundo y deje a todas las cuentas
//   sin app. Por eso la regla es estricta: solo bloquea un número mayor que el que se conoce.
//
// **Subir una versión** (cuando cambie la forma de una clave de manera que una copia anterior la estropearía al
// guardarla; añadir un campo que las copias de antes conservan no lo necesita): cámbiala aquí, en VERSIONES (su
// migración la toma de aquí), con su parche de migración y sus casos en validacion/. Antes, comprueba que esta
// protección lleva al menos una semana en producción. Y un cambio así **no se deshace volviendo al código
// anterior**: esa copia vería la versión nueva y se bloquearía sin tener a qué actualizar. Se arregla hacia
// delante, con otra versión nueva.

// La versión que conoce esta copia de la app, por clave. Todas son la 1: lo que se ha guardado siempre.
export const VERSIONES = Object.freeze({
  datos: 1, //             rueda-de-platos:data-v1 (migrateData, logica/migraciones.js)
  menu: 1, //              menu-v1 y menu-simple-v1, el menú en curso (sin migración: ver leerMenuGuardado)
  historial: 1, //         history-v1 y history-simple-v1, los últimos menús generados (ver leerHistorialGuardado)
  despensa: 1, //          despensa-v1 (migrarDespensa, logica/despensa.js)
  entrenoCatalogo: 1, //   entreno-catalogo-v1 (migrarCatalogo, logica/entreno-almacen.js)
  entrenoIndice: 1, //     entreno-indice-v1 (migrarIndice; `calculo` va aparte y no bloquea: el índice es una caché)
  entrenoBorrador: 1, //   entreno-borrador-v1 (migrarBorrador)
  entrenoMes: 1, //        entreno-AAAA-MM-v1, un documento por mes (migrarMes)
  cuerpoDiario: 1, //      cuerpo-diario-v1 (migrarDiario, logica/cuerpo-diario.js)
  informesFavoritos: 1, // informes-favoritos-v1 (migrarFavoritos)
  periodo: 1, //           solo en el aparato, fooddraft:periodo-v1:<uid> (migrarPeriodo, logica/periodo.js)
});

// Cada clave de la nube con su entrada de VERSIONES. Los nombres no cambian nunca (son los de siempre, con el
// prefijo histórico: ver «Nombre» en CLAUDE.md). Una clave que no está aquí no se comprueba (hoy, solo
// `push-token-v1`, retirada, que ya solo se borra): una clave nueva en la nube tiene que entrar en esta lista, y el
// grupo «Versiones» de validacion/ avisa si en el código aparece una que no está.
const CLAVES = new Map([
  ["rueda-de-platos:data-v1", "datos"],
  ["rueda-de-platos:menu-v1", "menu"],
  ["rueda-de-platos:menu-simple-v1", "menu"],
  ["rueda-de-platos:history-v1", "historial"],
  ["rueda-de-platos:history-simple-v1", "historial"],
  ["rueda-de-platos:despensa-v1", "despensa"],
  ["rueda-de-platos:entreno-catalogo-v1", "entrenoCatalogo"],
  ["rueda-de-platos:entreno-indice-v1", "entrenoIndice"],
  ["rueda-de-platos:entreno-borrador-v1", "entrenoBorrador"],
  ["rueda-de-platos:cuerpo-diario-v1", "cuerpoDiario"],
  ["rueda-de-platos:informes-favoritos-v1", "informesFavoritos"],
]);
// Los meses del entreno se forman con una plantilla (claveMes, logica/entreno-almacen.js).
const MES_ENTRENO = /^rueda-de-platos:entreno-\d{4}-\d{2}-v1$/;

// La versión que esta copia conoce de una clave de la nube, o null si no la comprueba.
export function versionConocida(clave) {
  if (typeof clave !== "string") return null;
  if (CLAVES.has(clave)) return VERSIONES[CLAVES.get(clave)];
  if (MES_ENTRENO.test(clave)) return VERSIONES.entrenoMes;
  return null;
}

// La `version` que lleva lo guardado (ya leído como JSON), o null si no lleva una que sea un número: una lista
// suelta (los menús), un documento sin el campo (data-v1 de antes) o un valor dañado. null cuenta como la 1.
export function versionGuardada(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const v = valor.version;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ¿Lo guardado es de una versión mayor que `conocida`? Solo con un número estrictamente mayor (arriba, por qué).
export function esVersionMayor(valor, conocida) {
  if (typeof conocida !== "number" || !Number.isFinite(conocida)) return false;
  const v = versionGuardada(valor);
  return v !== null && v > conocida;
}

// El error de «datos de una versión más nueva»: lo lanzan la lectura protegida y las migraciones. Lleva
// `versionMayor = true` y lo encontrado (`{ clave, guardada, conocida }`) para quien lo recoja.
export function errorVersionMayor(info) {
  const datos = { clave: (info && info.clave) || null, guardada: info ? info.guardada : null, conocida: info ? info.conocida : null };
  const e = new Error(`Datos guardados por una versión más nueva de la app (${datos.clave}: versión ${datos.guardada}; esta copia conoce la ${datos.conocida}). No se escribe nada.`);
  e.versionMayor = true;
  e.info = datos;
  return e;
}

// Para las migraciones (capa 2): lanza errorVersionMayor si `guardado` es de una versión mayor que `conocida`; si
// no, no hace nada. `clave` solo sirve para el mensaje.
export function exigirVersionConocida(guardado, conocida, clave) {
  if (esVersionMayor(guardado, conocida)) throw errorVersionMayor({ clave, guardada: versionGuardada(guardado), conocida });
}

// Lo que `protegerVersiones` mira en cada lectura: null si se puede seguir, o lo encontrado. Un texto que no es
// JSON se deja pasar tal cual: es un documento ilegible, no de otra versión, y lo decide su hook (como siempre).
export function revisarLectura(clave, texto) {
  const conocida = versionConocida(clave);
  if (conocida === null || typeof texto !== "string") return null;
  let valor;
  try {
    valor = JSON.parse(texto);
  } catch (e) {
    return null;
  }
  if (!esVersionMayor(valor, conocida)) return null;
  return { clave, guardada: versionGuardada(valor), conocida };
}

// El aviso que se manda a la app (window) al encontrar datos de una versión mayor: lo escucha useVersionMayor
// (ui/estado/datos.js), que cambia la app entera por la pantalla de actualizar.
export const EVENTO_VERSION_MAYOR = "fooddraft:version-mayor";

// Capa 1: envuelve un almacén con la forma de window.storage (`get`, `set`, `delete`, que devuelven promesas) y
// devuelve otro igual que, en cuanto una lectura encuentra datos de una versión mayor:
// - esa lectura falla con errorVersionMayor (para su hook es «no se ha podido leer»: no sigue con datos vacíos ni
//   escribe nada, que es justo lo que ya hacían todos ante una lectura fallida);
// - desde ese momento, **toda** escritura y todo borrado fallan, de cualquier clave, también los guardados con
//   retardo que ya estaban programados;
// - se llama una sola vez a `alDetectar(info)`, para que la app enseñe la pantalla de actualizar.
// Las lecturas siguen funcionando. `versionMayor()` dice lo encontrado (o null) y `bloquearPorVersion(info)` bloquea
// desde fuera (lo usa el período, que vive en localStorage y no pasa por aquí). El bloqueo dura lo que dura esta
// sesión: al recargar (con la versión nueva de la app) se vuelve a empezar. Las funciones no usan `this`, así que
// se pueden copiar con `{ ...almacen }` (como hace «Eliminar cuenta» en auth-bootstrap.jsx).
export function protegerVersiones(almacen, alDetectar = () => {}) {
  let bloqueo = null;
  const bloquear = (info) => {
    if (bloqueo) return;
    bloqueo = { clave: (info && info.clave) || null, guardada: info ? info.guardada : null, conocida: info ? info.conocida : null };
    try {
      alDetectar({ ...bloqueo });
    } catch (e) {
      // Quien avisa no puede romper la lectura: el bloqueo ya está puesto.
    }
  };
  return {
    async get(clave, ...resto) {
      const res = await almacen.get(clave, ...resto);
      const info = revisarLectura(clave, res && res.value);
      if (info) {
        bloquear(info);
        throw errorVersionMayor(info);
      }
      return res;
    },
    async set(clave, ...resto) {
      if (bloqueo) throw errorVersionMayor(bloqueo);
      return almacen.set(clave, ...resto);
    },
    async delete(clave, ...resto) {
      if (bloqueo) throw errorVersionMayor(bloqueo);
      return almacen.delete(clave, ...resto);
    },
    versionMayor: () => (bloqueo ? { ...bloqueo } : null),
    bloquearPorVersion: (info) => bloquear(info || {}),
  };
}

// ---------- Los menús, con y sin sobre (R13, primer paso) ----------
// El menú en curso y el historial se han guardado siempre como una **lista suelta** (de huecos, y de
// `{ id, generatedAt, slots }`), y una lista no puede llevar `version`. Para ponérsela hay que meterla en un sobre:
// `{ version: 1, slots: [...] }` el menú y `{ version: 1, lista: [...] }` el historial. Pero la app que tienen hoy
// los móviles no sabría abrir ese sobre (le llegaría un objeto donde espera una lista), así que va en dos pasos:
// 1. (ahora) la app aprende a leer los dos formatos, y sigue guardando la lista suelta de siempre;
// 2. (cuando esto lleve un tiempo en producción, con el primer cambio de forma de los menús) empieza a guardar el
//    sobre. Su `version` será la 1: estas copias ya lo entienden entero, así que no hay por qué bloquearlas.
// Como cuando sale un formato de archivo nuevo: primero todos los programas aprenden a abrirlo, y solo después se
// empieza a guardar en él. Una versión mayor la para antes protegerVersiones; estas funciones solo leen la forma.

// La lista de huecos del menú guardado (ya leído como JSON), o null si no tiene ninguna de las dos formas (se
// ignora, como un menú ilegible: no hay nada que proteger en él).
export function leerMenuGuardado(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor && typeof valor === "object" && Array.isArray(valor.slots)) return valor.slots;
  return null;
}

// La lista del historial guardado, o null si no tiene ninguna de las dos formas.
export function leerHistorialGuardado(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor && typeof valor === "object" && Array.isArray(valor.lista)) return valor.lista;
  return null;
}
