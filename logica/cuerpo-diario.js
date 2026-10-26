// ---------- Sueño, pasos y favoritos de los informes (área Cuerpo, 26-oct-2026) ----------
// Módulo de lógica pura (sin JSX, sin React) de los datos nuevos del área Cuerpo que piden los informes
// cruzados y el constructor (local/ideas/esteticas/registro.md, «DECISIONES FINALES», bloque CUERPO):
//
// 1. **El diario del cuerpo** (`rueda-de-platos:cuerpo-diario-v1`, lo lleva ui/estado/cuerpo.js): una
//    entrada por día con lo que se apunta a mano y no sale de ninguna otra parte de la app — el sueño
//    (horas y calidad) y los pasos. Sueño y pasos comparten documento porque los dos son «una cifra al día»,
//    los dos son gratis y opcionales, y así una cuenta que los apunta solo escribe un documento. Forma:
//      { version: 1, dias: { "AAAA-MM-DD": { sueno?: { horas, calidad }, pasos? } } }
//    El sueño se guarda con la fecha del día en que uno **se despierta**: «anoche» de hoy es la entrada de
//    hoy. Así la noche queda en el mismo día que la comida y el entreno que vienen después, que es lo que
//    comparan los informes («¿las noches cortas te pasan factura?»).
//    - Horas: de 3 a 11, de cuarto en cuarto (lo que deja el deslizador de la pantalla Sueño).
//    - Calidad: cinco caras que se guardan como 2, 4, 6, 8 y 10 (decisión del 26-oct): la escala de los
//      informes sigue siendo de 1 a 10 por si algún día se apunta con más detalle, pero hoy solo hay cinco
//      niveles.
//    - Pasos: un número entero de 0 a 100.000; vacío = sin dato (no es lo mismo que 0, que es «no anduve»).
//      Nada de interruptor: todo es opcional (decisión del 26-oct).
//
// 2. **Los favoritos de los informes** (`rueda-de-platos:informes-favoritos-v1`): la estrella de un
//    informe predefinido o de uno montado en el constructor. Se guardan en la cuenta (en la nube, como los
//    demás datos) porque son una preferencia del usuario, no del dispositivo. Forma:
//      { version: 1, lista: [{ id, tipo: "pre" | "cons", spec? }] }
//    `spec` (solo los del constructor) es la pregunta montada: { pregunta, huecos, periodo, vista }.
//    No se guarda el título: se vuelve a escribir en el idioma de cada momento.
//
// Ninguno de los dos pasa por migrateData (como la despensa o el entreno, cada clave tiene su migración).

export const VERSION_DIARIO = 1;
export const VERSION_FAVORITOS = 1;

export const SUENO_MIN = 3;
export const SUENO_MAX = 11;
// Las cinco caras de la calidad, de «fatal» a «genial», con lo que guarda cada una.
export const CALIDADES = [2, 4, 6, 8, 10];
export const PASOS_MAX = 100000;

const esFecha = (f) => typeof f === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f);
const numero = (x) => (typeof x === "number" && Number.isFinite(x) ? x : typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x)) ? Number(x) : null);

// Horas al cuarto más cercano, dentro de 3-11.
export function redondearCuarto(horas) {
  const h = numero(horas);
  if (h === null) return null;
  return Math.min(SUENO_MAX, Math.max(SUENO_MIN, Math.round(h * 4) / 4));
}

// Cara (0-4) ↔ calidad guardada (2-10). Una calidad de otra escala (una que no sea par, de un futuro
// apuntado más fino) cae en la cara más cercana.
export function calidadDeCara(cara) {
  return CALIDADES[Math.max(0, Math.min(4, Math.round(Number(cara) || 0)))];
}
export function caraDeCalidad(calidad) {
  const c = numero(calidad);
  if (c === null) return null;
  return Math.max(0, Math.min(4, Math.round((c - 2) / 2)));
}

function limpiarSueno(s) {
  if (!s || typeof s !== "object") return null;
  const horas = redondearCuarto(s.horas);
  if (horas === null) return null;
  const c = numero(s.calidad);
  return { horas, calidad: c === null ? null : Math.max(1, Math.min(10, Math.round(c))) };
}
function limpiarPasos(p) {
  const n = numero(p);
  if (n === null || n < 0) return null;
  return Math.min(PASOS_MAX, Math.round(n));
}

export function diarioVacio() {
  return { version: VERSION_DIARIO, dias: {} };
}

// Completa lo que falte sin perder nada: fuera fechas mal escritas, valores imposibles y días vacíos.
// Devuelve { diario, changed } como migrarDespensa: `changed` dice si hay que volver a guardar.
export function migrarDiario(guardado) {
  if (!guardado || typeof guardado !== "object") return { diario: diarioVacio(), changed: !!guardado };
  const dias = {};
  Object.entries(guardado.dias && typeof guardado.dias === "object" ? guardado.dias : {}).forEach(([fecha, d]) => {
    if (!esFecha(fecha) || !d || typeof d !== "object") return;
    const limpio = {};
    const s = limpiarSueno(d.sueno);
    const p = limpiarPasos(d.pasos);
    if (s) limpio.sueno = s;
    if (p !== null) limpio.pasos = p;
    if (Object.keys(limpio).length) dias[fecha] = limpio;
  });
  const diario = { version: VERSION_DIARIO, dias };
  return { diario, changed: guardado.version !== VERSION_DIARIO || JSON.stringify(dias) !== JSON.stringify(guardado.dias || {}) };
}

function conDia(diario, fecha, cambiar) {
  const dias = { ...(diario.dias || {}) };
  const nuevo = cambiar({ ...(dias[fecha] || {}) });
  if (Object.keys(nuevo).length) dias[fecha] = nuevo;
  else delete dias[fecha];
  return { ...diario, dias };
}

// Apunta (o corrige) la noche que termina en `fecha`.
export function apuntarSueno(diario, fecha, horas, calidad) {
  const s = limpiarSueno({ horas, calidad });
  return conDia(diario, fecha, (d) => {
    if (s) d.sueno = s;
    else delete d.sueno;
    return d;
  });
}
export function quitarSueno(diario, fecha) {
  return conDia(diario, fecha, (d) => { delete d.sueno; return d; });
}

// Pasos de un día; `null` o texto vacío lo borra (vacío = sin dato).
export function apuntarPasos(diario, fecha, pasos) {
  const p = limpiarPasos(pasos);
  return conDia(diario, fecha, (d) => {
    if (p === null) delete d.pasos;
    else d.pasos = p;
    return d;
  });
}

// Lo de la última noche apuntada antes de `fecha` (o el mismo día): es lo que sale ya puesto para apuntar
// «anoche» de un toque. null si nunca se ha apuntado nada.
export function ultimoSueno(diario, fecha) {
  const fechas = Object.keys((diario && diario.dias) || {}).filter((f) => f <= fecha && diario.dias[f].sueno).sort();
  if (!fechas.length) return null;
  const f = fechas[fechas.length - 1];
  return { fecha: f, ...diario.dias[f].sueno };
}

// Los `n` días que acaban en `hasta` (el más antiguo primero), con lo apuntado de cada uno:
// [{ fecha, sueno: { horas, calidad } | null, pasos: número | null }]. Lo usan las barras de «Últimas 7
// noches», «Últimos 30 días» y la semana de pasos.
export function ultimosDias(diario, hasta, n) {
  const d = new Date(hasta + "T12:00:00");
  const dos = (x) => String(x).padStart(2, "0");
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const fecha = `${x.getFullYear()}-${dos(x.getMonth() + 1)}-${dos(x.getDate())}`;
    const dia = ((diario && diario.dias) || {})[fecha] || {};
    lista.push({ fecha, sueno: dia.sueno || null, pasos: dia.pasos ?? null });
  }
  return lista;
}

// Media de una lista ignorando los huecos (null si no hay ningún dato).
export function mediaSinHuecos(valores) {
  const xs = (valores || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// ---------- Favoritos ----------
export function favoritosVacios() {
  return { version: VERSION_FAVORITOS, lista: [] };
}

export function migrarFavoritos(guardado) {
  if (!guardado || typeof guardado !== "object") return { favoritos: favoritosVacios(), changed: !!guardado };
  const vistos = new Set();
  const lista = (Array.isArray(guardado.lista) ? guardado.lista : []).filter((f) => {
    if (!f || typeof f.id !== "string" || !f.id || vistos.has(f.id)) return false;
    if (f.tipo !== "pre" && f.tipo !== "cons") return false;
    if (f.tipo === "cons" && (!f.spec || typeof f.spec !== "object" || typeof f.spec.pregunta !== "string")) return false;
    vistos.add(f.id);
    return true;
  }).map((f) => (f.tipo === "pre" ? { id: f.id, tipo: "pre" } : { id: f.id, tipo: "cons", spec: f.spec }));
  const favoritos = { version: VERSION_FAVORITOS, lista };
  return { favoritos, changed: guardado.version !== VERSION_FAVORITOS || lista.length !== (guardado.lista || []).length };
}

export function tieneFavorito(favoritos, id) {
  return !!(favoritos && favoritos.lista || []).some((f) => f.id === id);
}

// Pone o quita la estrella. Lo nuevo va arriba del todo (es lo que se acaba de marcar).
export function alternarFavorito(favoritos, item) {
  const lista = (favoritos && favoritos.lista) || [];
  if (lista.some((f) => f.id === item.id)) return { ...favoritos, lista: lista.filter((f) => f.id !== item.id) };
  const nuevo = item.tipo === "cons" ? { id: item.id, tipo: "cons", spec: item.spec } : { id: item.id, tipo: "pre" };
  return { ...favoritos, version: VERSION_FAVORITOS, lista: [nuevo, ...lista] };
}

// Identificador estable de una pregunta del constructor (el mismo montaje = la misma estrella).
export function idDeConstructor(spec) {
  const h = spec.huecos || {};
  const huecos = Object.keys(h).sort().map((k) => `${k}=${h[k]}`).join("&");
  return `cons:${spec.pregunta}:${huecos}:${spec.periodo || ""}:${spec.vista || ""}`;
}
