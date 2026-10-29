// ---------- Entreno: almacén ----------
// Módulo de lógica pura (sin JSX, sin React): cómo se reparten los entrenos en documentos guardados, sus
// versiones y migraciones, el índice, el borrador de la sesión en curso, la cola de envíos pendientes y
// la exportación a CSV. No lee ni escribe nada: eso lo hace el hook (ui/estado/entreno.js) con
// window.storage; aquí solo está lo que se puede probar en validacion/.
//
// Por qué se reparte así (local/ideas/gimnasio/03-diseno-modulo-entreno.md, §5):
// - Cada clave es un documento de Firestore, con un tope de 1 MiB. Un historial de entrenos que crece sin
//   parar no cabe en uno, así que las sesiones terminadas van **por meses** (≈ 2-3 KB por sesión).
// - `window.storage.list()` lee la colección entera del usuario (con su contenido): no sirve para saber qué
//   meses hay. Lo sabe el **índice**, que además guarda por ejercicio la última vez («anterior») y sus
//   récords. El índice es una caché: se puede reconstruir siempre a partir de los meses.
// - La sesión en curso es un **borrador** aparte, que se escribe a cada cambio en este dispositivo
//   (localStorage) y con un pequeño retraso en la nube: un entreno no se pierde nunca (principio 2).
// - Al terminar, la sesión entra en una **cola** local y solo sale de ella cuando la nube confirma: sin
//   conexión en el gimnasio, el entreno queda terminado en el móvil y se sube después.
//
// Como la despensa, estas claves tienen su propia versión y su propia migración: no pasan por migrateData.
import { fechaLocal, mejoresDeEjercicioEnSesion } from "entreno-calculo";

// Todas con el prefijo de siempre (ver la nota sobre el nombre en CLAUDE.md).
export const CLAVE_CATALOGO = "rueda-de-platos:entreno-catalogo-v1";
export const CLAVE_INDICE = "rueda-de-platos:entreno-indice-v1";
export const CLAVE_BORRADOR = "rueda-de-platos:entreno-borrador-v1";
export const claveMes = (mesISO) => `rueda-de-platos:entreno-${mesISO}-v1`;

// Mes («AAAA-MM») de una hora ISO. En hora local, igual que el día de un entreno (ver fechaLocal): uno
// que empieza a las 00:30 del 1 de noviembre en España es de noviembre, aunque en UTC aún sea octubre.
export const mesDe = (fecha) => fechaLocal(fecha).slice(0, 7);

const VERSION = 1;

export const AJUSTES_POR_DEFECTO = {
  unidadPeso: "kg", unidadDistancia: "km", precargar: true, mostrarEsfuerzo: false,
  descansoSeg: 120, descansoCalentamientoSeg: 60, inicioSemana: 1, sonido: true, vibracion: true,
  // G2: el gimnasio habitual, que sale ya puesto al terminar un entreno ("" = ninguno).
  gimnasio: "",
  // FitDraft (parte estética, 26-oct-2026): el mini-mapa del descanso al cerrar un ejercicio, donde el avatar
  // va a la máquina del siguiente. Encendido por defecto; los catálogos de antes lo reciben al migrarse.
  paseoDescanso: true,
};

export function catalogoVacio() {
  return {
    version: VERSION, propios: [], personalizados: {}, rutinas: [],
    ajustes: { ...AJUSTES_POR_DEFECTO },
    // `grupos` (G8): por grupo muscular, el día en que se cerró su aviso de «sin entrenar».
    aviso: { pausa: null, silenciadoHasta: null, descartadoEl: null, grupos: {} },
    // G10: las importaciones hechas ({ lote, app, fecha, sesiones }), para poder deshacer una entera.
    importaciones: [],
  };
}

// ---------- Migraciones ----------
// Todas devuelven { valor, changed } y siguen el patrón de migrateData: completar lo que falte sin pisar
// nunca lo que ya hubiera (un `precargar: false` elegido por el usuario se queda en false).

export function migrarCatalogo(guardado) {
  if (!guardado || typeof guardado !== "object") return { valor: catalogoVacio(), changed: true };
  const base = catalogoVacio();
  let changed = false;
  const valor = { ...guardado };
  ["propios", "rutinas", "importaciones"].forEach((k) => { if (!Array.isArray(valor[k])) { valor[k] = []; changed = true; } });
  if (!valor.personalizados || typeof valor.personalizados !== "object") { valor.personalizados = {}; changed = true; }
  const ajustes = { ...(valor.ajustes || {}) };
  Object.keys(base.ajustes).forEach((k) => { if (ajustes[k] === undefined) { ajustes[k] = base.ajustes[k]; changed = true; } });
  valor.ajustes = ajustes;
  const aviso = { ...(valor.aviso || {}) };
  Object.keys(base.aviso).forEach((k) => { if (aviso[k] === undefined) { aviso[k] = base.aviso[k]; changed = true; } });
  valor.aviso = aviso;
  // G3 (25-oct-2026): cada ejercicio de una rutina lleva su propio descanso, un número. Antes podía ser
  // null («el de siempre»), que seguía al de los ajustes: cambiar el descanso por defecto cambiaba todas
  // las rutinas a la vez. Las rutinas ya creadas conservan el descanso que tenían en ese momento: el
  // propio del ejercicio (personalización de su ficha, o el que lleve un ejercicio propio) o el de los
  // ajustes. Se lee del propio catálogo, sin importar la biblioteca (este módulo solo depende de
  // entreno-calculo).
  const descansoPropio = (id) => {
    const p = valor.personalizados[id];
    if (p && p.descansoSeg !== null && p.descansoSeg !== undefined) return p.descansoSeg;
    const propio = valor.propios.find((e) => e && e.id === id);
    if (propio && propio.descansoSeg !== null && propio.descansoSeg !== undefined) return propio.descansoSeg;
    return null;
  };
  const sinDescanso = (re) => re && (re.descansoSeg === null || re.descansoSeg === undefined);
  let rutinasTocadas = false;
  const rutinas = valor.rutinas.map((r) => {
    if (!r || !Array.isArray(r.ejercicios) || !r.ejercicios.some(sinDescanso)) return r;
    rutinasTocadas = true;
    return { ...r, ejercicios: r.ejercicios.map((re) => (sinDescanso(re) ? { ...re, descansoSeg: descansoPropio(re.ejercicioId) ?? ajustes.descansoSeg } : re)) };
  });
  if (rutinasTocadas) { valor.rutinas = rutinas; changed = true; }
  if (valor.version !== VERSION) { valor.version = VERSION; changed = true; }
  return { valor, changed };
}

const porInicio = (a, b) => new Date(a.inicio) - new Date(b.inicio);

export function migrarMes(guardado, mes) {
  if (!guardado || typeof guardado !== "object") return { valor: { version: VERSION, mes, sesiones: [] }, changed: true };
  let changed = false;
  const valor = { ...guardado };
  if (!Array.isArray(valor.sesiones)) { valor.sesiones = []; changed = true; }
  if (!valor.mes) { valor.mes = mes; changed = true; }
  if (valor.version !== VERSION) { valor.version = VERSION; changed = true; }
  return { valor, changed };
}

// Versión de los cálculos con que se hicieron los récords del índice. Sube cuando cambia cómo se calcula un
// récord, para que los índices guardados se reconstruyan una vez con la regla nueva. 2 (27-oct-2026): ×2 de
// las mancuernas a pares y series unilaterales.
const CALCULO_INDICE = 2;

export function indiceVacio() {
  return { version: VERSION, calculo: CALCULO_INDICE, meses: {}, ejercicios: {}, rutinas: {} };
}

// `reconstruir`: el índice guardado es de antes de que existiera `rutinas` (G4): no se puede completar
// sin releer los meses, así que el hook lo reconstruye entero una vez. Mientras, «anterior» cae a la
// última vez a secas, como hasta ahora.
export function migrarIndice(guardado) {
  if (!guardado || typeof guardado !== "object") return { valor: indiceVacio(), changed: true, reconstruir: false };
  let changed = false;
  let reconstruir = false;
  const valor = { ...guardado };
  if (!valor.meses || typeof valor.meses !== "object") { valor.meses = {}; changed = true; }
  if (!valor.ejercicios || typeof valor.ejercicios !== "object") { valor.ejercicios = {}; changed = true; }
  if (!valor.rutinas || typeof valor.rutinas !== "object") { valor.rutinas = {}; changed = true; reconstruir = true; }
  // Récords calculados con una regla anterior (ver CALCULO_INDICE): se rehacen releyendo los meses.
  if (valor.calculo !== CALCULO_INDICE) { valor.calculo = CALCULO_INDICE; changed = true; reconstruir = true; }
  if (valor.version !== VERSION) { valor.version = VERSION; changed = true; }
  return { valor, changed, reconstruir };
}

// El borrador se guarda como { version, sesion } (sesion null = no hay entreno en curso).
export function migrarBorrador(guardado) {
  if (!guardado || typeof guardado !== "object") return { valor: { version: VERSION, sesion: null }, changed: !!guardado };
  let changed = false;
  const valor = { ...guardado };
  if (valor.sesion === undefined) {
    // Por si algún día se guardó la sesión suelta, sin envoltorio.
    if (valor.id && valor.inicio) return { valor: { version: VERSION, sesion: guardado }, changed: true };
    valor.sesion = null; changed = true;
  }
  if (valor.version !== VERSION) { valor.version = VERSION; changed = true; }
  return { valor, changed };
}

// ---------- Meses ----------
const actualizadoDe = (s) => Number((s && s.actualizado) || 0);

// Añade (o sustituye, si ya estaba con ese id) una sesión. Con el mismo id gana la de `actualizado`
// mayor: así una copia vieja que llegue tarde de la cola no pisa una corrección posterior.
export function anadirSesionAMes(mesDoc, sesion) {
  const sesiones = [...(mesDoc.sesiones || [])];
  const i = sesiones.findIndex((s) => s.id === sesion.id);
  if (i >= 0) {
    if (actualizadoDe(sesiones[i]) > actualizadoDe(sesion)) return mesDoc;
    sesiones[i] = sesion;
  } else sesiones.push(sesion);
  sesiones.sort(porInicio);
  return { ...mesDoc, sesiones };
}

export function quitarSesionDeMes(mesDoc, id) {
  return { ...mesDoc, sesiones: (mesDoc.sesiones || []).filter((s) => s.id !== id) };
}

// Une dos copias del mismo mes (la de la nube y la que se tenía en memoria) por id; gana la de
// `actualizado` mayor.
export function fusionarMeses(a, b) {
  let resultado = { ...(a || b), sesiones: [...((a && a.sesiones) || [])] };
  ((b && b.sesiones) || []).forEach((s) => { resultado = anadirSesionAMes(resultado, s); });
  resultado.sesiones.sort(porInicio);
  return resultado;
}

// ---------- Índice ----------
// Por ejercicio: la última vez que se hizo (sus series hechas, para la columna «anterior» y la precarga),
// sus récords (cada uno con fecha y sesión) y en cuántas sesiones sale; por mes, cuántas sesiones hay; y
// por rutina (G4), los ejercicios de su última sesión con sus series, en orden, para el «anterior»
// equivalente (ver anteriorEquivalente en entreno-calculo.js).

// Las series unilaterales (27-oct-2026) llevan además sus dos lados, para que «anterior» los enseñe.
const copiaSerie = ({ tipo, kg, reps, seg, km, rir, lados, repsIzq, repsDer }) => ({
  tipo, kg: kg ?? null, reps: reps ?? null, seg: seg ?? null, km: km ?? null, rir: rir ?? null,
  ...(lados !== undefined ? { lados, repsIzq: repsIzq ?? null, repsDer: repsDer ?? null } : {}),
});
const valorRecord = (r) => (r === null || r === undefined ? null : typeof r === "object" ? r.valor : r);

// Mete una sesión en el índice (sin tocar el recuento de meses). Los récords se actualizan solo si la
// sesión los supera estrictamente: a igualdad, se queda la fecha de la primera vez.
function anotarSesion(indice, sesion, ejercicioDe, pesoCorporal) {
  const ejercicios = { ...indice.ejercicios };
  const fecha = fechaLocal(sesion.inicio);
  (sesion.ejercicios || []).forEach((ej) => {
    const hechas = (ej.series || []).filter((s) => s.hecha);
    if (!hechas.length) return;
    const previo = ejercicios[ej.ejercicioId] || { ultima: null, records: {}, sesiones: 0 };
    const nuevo = { ...previo, records: { ...previo.records } };
    // Si el mismo ejercicio sale dos veces en la sesión, cuenta una sola sesión.
    const yaContada = previo.ultima && previo.ultima.sesionId === sesion.id;
    if (!yaContada) nuevo.sesiones = (previo.sesiones || 0) + 1;
    if (!previo.ultima || new Date(sesion.inicio) >= new Date(previo.ultima.inicio)) {
      const series = yaContada ? [...previo.ultima.series, ...hechas.map(copiaSerie)] : hechas.map(copiaSerie);
      nuevo.ultima = { sesionId: sesion.id, fecha, inicio: sesion.inicio, series };
    }
    const e = ejercicioDe(ej.ejercicioId);
    const mejores = mejoresDeEjercicioEnSesion(ej, e || "peso_reps", pesoCorporal);
    Object.keys(mejores).forEach((clave) => {
      const m = mejores[clave];
      if (valorRecord(m) > (valorRecord(nuevo.records[clave]) ?? -Infinity)) {
        nuevo.records[clave] = typeof m === "object" ? { ...m, fecha, sesionId: sesion.id } : { valor: m, fecha, sesionId: sesion.id };
      }
    });
    ejercicios[ej.ejercicioId] = nuevo;
  });
  let rutinas = indice.rutinas || {};
  if (sesion.rutinaId) {
    const previa = rutinas[sesion.rutinaId];
    const ejerciciosRutina = (sesion.ejercicios || [])
      .map((ej) => ({ ejercicioId: ej.ejercicioId, series: (ej.series || []).filter((s) => s.hecha).map(copiaSerie) }))
      .filter((e) => e.series.length);
    if (ejerciciosRutina.length && (!previa || new Date(sesion.inicio) >= new Date(previa.inicio))) {
      rutinas = { ...rutinas, [sesion.rutinaId]: { sesionId: sesion.id, fecha, inicio: sesion.inicio, ejercicios: ejerciciosRutina } };
    }
  }
  return { ...indice, ejercicios, rutinas };
}

// Reconstruye el índice entero a partir de los documentos de mes: es lo que se hace al editar o borrar
// una sesión pasada, al importar, o si el índice no cuadra con los meses (ver el hook).
export function reconstruirIndice(mesesDocs, ejercicioDe, pesoCorporal) {
  let indice = indiceVacio();
  const todas = [];
  (mesesDocs || []).forEach((m) => {
    const n = (m.sesiones || []).length;
    if (n) indice.meses[m.mes] = n;
    todas.push(...(m.sesiones || []));
  });
  todas.sort(porInicio).forEach((s) => { indice = anotarSesion(indice, s, ejercicioDe, pesoCorporal); });
  return indice;
}

// Lo mismo que reconstruir con una sesión más, sin releer todos los meses: lo que se hace al terminar un
// entreno. (Una sesión ya presente no debe pasar por aquí: para editar, se reconstruye.)
export function actualizarIndiceConSesion(indice, sesion, ejercicioDe, pesoCorporal) {
  const mes = mesDe(sesion.inicio);
  const conMes = { ...indice, meses: { ...indice.meses, [mes]: (indice.meses[mes] || 0) + 1 } };
  return anotarSesion(conMes, sesion, ejercicioDe, pesoCorporal);
}

// Meses con sesiones, del más antiguo al más reciente.
export const mesesDelIndice = (indice) => Object.keys((indice && indice.meses) || {}).filter((m) => indice.meses[m] > 0).sort();

// Meses que hay que leer para reconstruir el índice: los de todos los índices que se pasan (el de la nube y
// el que hay en memoria), más los sueltos de `extra` (el mes actual, los que acaba de escribir una
// importación), sin repetir y en orden. Los meses solo se conocen por el índice (nunca `storage.list()`), así
// que un mes que se quede fuera de aquí desaparece para siempre del historial: por eso, cuando el índice en
// memoria se construyó sobre uno vacío (la app se abrió sin conexión), hay que unirlo con el de la nube en vez
// de escribirlo tal cual (riesgo D3 del diagnóstico de octubre de 2026).
export function mesesAReconstruir(indices, extra = []) {
  const todos = new Set(extra.filter(Boolean));
  (indices || []).forEach((indice) => mesesDelIndice(indice).forEach((m) => todos.add(m)));
  return [...todos].sort();
}

// ---------- Borrador y cola ----------
// Si hay borrador en este dispositivo y en la nube, gana el que se cambió más tarde (el de otro móvil
// puede ser más nuevo; el de este, más nuevo que lo que llegó a subirse).
export function elegirBorrador(local, nube) {
  if (!local) return nube || null;
  if (!nube) return local;
  return actualizadoDe(nube) > actualizadoDe(local) ? nube : local;
}

export function encolar(cola, sesion) {
  const resto = (cola || []).filter((s) => s.id !== sesion.id);
  return [...resto, sesion];
}

export function quitarDeCola(cola, id) {
  return (cola || []).filter((s) => s.id !== id);
}

// ---------- Copias en el dispositivo, por cuenta ----------
// El borrador y la cola se copian en localStorage para que un entreno no dependa de la red. Hasta octubre de
// 2026 esas claves no llevaban la cuenta: si en el mismo móvil entraba otra persona, veía el entreno a medias
// de la anterior como suyo y la cola se subía a su cuenta (riesgo D7 del diagnóstico). Ahora llevan el
// identificador de la cuenta, como el período (`window.cuentaId`, que pone auth-bootstrap.jsx).
export const LOCAL_BORRADOR_SIN_CUENTA = "fooddraft:entreno-borrador";
export const LOCAL_COLA_SIN_CUENTA = "fooddraft:entreno-pendientes";
export const clavesLocalesEntreno = (cuenta) => ({
  borrador: `${LOCAL_BORRADOR_SIN_CUENTA}:${cuenta}`,
  cola: `${LOCAL_COLA_SIN_CUENTA}:${cuenta}`,
});

// Pasa las copias de antes (sin cuenta) a la cuenta que abra primero la app en ese dispositivo y las quita
// de la clave vieja, para que ninguna otra las herede. No se sabe de quién eran: la primera cuenta que entra
// es, casi siempre, la de quien entrenó. Nunca se pierde nada: si la cuenta ya tenía copia propia (otra
// pestaña con la versión anterior de la app), las colas se juntan por `id` y del borrador gana el más
// reciente. `almacen` es localStorage (o uno falso en las pruebas); devuelve cuántas claves movió.
export function migrarLocalesEntreno(almacen, cuenta) {
  const nuevas = clavesLocalesEntreno(cuenta);
  const leer = (clave) => {
    const v = almacen.getItem(clave);
    if (v === null || v === undefined) return null;
    try { return JSON.parse(v); } catch (e) { return null; }
  };
  let movidas = 0;
  const colaVieja = leer(LOCAL_COLA_SIN_CUENTA);
  if (colaVieja) {
    const cola = (Array.isArray(colaVieja) ? colaVieja : []).reduce((c, s) => encolar(c, s), leer(nuevas.cola) || []);
    almacen.setItem(nuevas.cola, JSON.stringify(cola));
    movidas++;
  }
  const borradorViejo = leer(LOCAL_BORRADOR_SIN_CUENTA);
  if (borradorViejo) {
    almacen.setItem(nuevas.borrador, JSON.stringify(elegirBorrador(leer(nuevas.borrador), borradorViejo)));
    movidas++;
  }
  // Se quitan después de haber escrito las nuevas: si algo fallara a medias, la vieja seguiría ahí.
  if (almacen.getItem(LOCAL_COLA_SIN_CUENTA) !== null) almacen.removeItem(LOCAL_COLA_SIN_CUENTA);
  if (almacen.getItem(LOCAL_BORRADOR_SIN_CUENTA) !== null) almacen.removeItem(LOCAL_BORRADOR_SIN_CUENTA);
  return movidas;
}

// ---------- Exportar ----------
// CSV con una fila por serie, separado por «;» y con coma decimal salvo en inglés: es lo que abre bien
// Excel con la configuración regional española (con «,» de separador, partiría los decimales). Los
// textos con «;», comillas o saltos de línea van entre comillas, con las comillas duplicadas.
export const CABECERA_CSV = "fecha;entreno;ejercicio;ejercicio_id;serie;tipo;kg;reps;segundos;km;rir;nota";

function campoCSV(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function sesionesACSV(sesiones, nombreDe, idioma) {
  const num = (x) => (x === null || x === undefined || x === "" ? "" : idioma === "en" ? String(x) : String(x).replace(".", ","));
  const filas = [CABECERA_CSV];
  [...(sesiones || [])].sort(porInicio).forEach((s) => {
    const d = new Date(s.inicio);
    const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const fecha = `${fechaLocal(s.inicio)} ${hora}`;
    (s.ejercicios || []).forEach((ej) => {
      (ej.series || []).filter((sr) => sr.hecha !== false).forEach((sr, i) => {
        filas.push([
          fecha, s.nombre, nombreDe(ej.ejercicioId), ej.ejercicioId, i + 1, sr.tipo,
          num(sr.kg), num(sr.reps), num(sr.seg), num(sr.km), num(sr.rir), ej.nota,
        ].map(campoCSV).join(";"));
      });
    });
  });
  return filas.join("\n");
}
