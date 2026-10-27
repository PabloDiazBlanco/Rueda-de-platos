// ---------- Series del cuerpo: los datos de cada día, las variables y la estadística honesta ----------
// Módulo de lógica pura (sin JSX, sin React) en el que se apoyan los informes cruzados y el constructor del
// área Cuerpo (26-oct-2026; maquetas v3-04 y v3-05 de local/ideas/esteticas/, decisiones en su registro.md).
// Todo es **solo lectura**: nada de aquí cambia objetivos, menús ni rutinas, y nada dice qué hacer.
//
// 1. `construirSerie` junta, día a día, lo que la app ya sabe de verdad:
//    - peso: los pesajes del seguimiento (historial + ciclo abierto), sin los marcados como atípicos;
//    - comida: kcal y macros **solo de los días con todas las comidas marcadas y sus macros guardadas**
//      (las que guarda cada comida desde B1+B3; el mismo criterio que cumplimientoMacrosMes), y el % de
//      comidas marcadas;
//    - entreno: sesiones, volumen, esfuerzo (1-5, el que se apunta al terminar), duración, 1RM estimado de
//      cada ejercicio (Epley, entreno-calculo.js), series por músculo y récords (los que tiene hoy el índice,
//      por la fecha en que se hicieron);
//    - sueño y pasos: el diario del cuerpo (cuerpo-diario.js);
//    - fase del ciclo: del período, **solo si se pasa** (vive en el dispositivo y solo se pasa con perfil de
//      mujer; ver ui/cuerpo/periodo.jsx). Nunca se guarda ni se manda a ninguna parte desde aquí.
//    Un hueco es `null` («sin dato»), nunca un 0 inventado: 0 solo cuando de verdad fue 0 (0 entrenos una
//    semana en la que ya se usaba el registro de entreno, 0 comidas marcadas un día en que ya se marcaban).
//
// 2. `VARIABLES`: las cosas que se pueden cruzar (registro.md: peso y cambio de peso, sueño y su calidad,
//    pasos, fase del ciclo, kcal, proteína, hidratos, grasa, comidas hechas, entrenar o no, entrenos,
//    volumen, esfuerzo, duración, 1RM de un ejercicio, series por músculo y récords). Hambre y energía
//    están **descartadas** (decisión del 26-oct): no existen como variables.
//
// 3. La estadística honesta (decisión del 26-oct): una relación es una **pista**, nunca un hecho. Hacen falta
//    al menos 14 días o 6 semanas con las dos cosas apuntadas; si no, «aún no hay suficiente». Con la
//    correlación de Pearson r: |r| < 0,2 = sin relación a la vista; 0,2-0,4 pista débil; 0,4-0,6 pista;
//    ≥ 0,6 pista clara. La interfaz siempre añade que no dice que una cosa cause la otra.
import { e1rm, cargaSerie, fechaLocal, semanaDe, sumarDias, seriesPorMusculo, volumenSesion, duracionEfectiva } from "entreno-calculo";
import { iniciosDeRegla } from "periodo";

// Como mucho dos años hacia atrás: suficiente para «Todo» y barato de recorrer en el móvil.
export const DIAS_MAXIMOS = 730;
export const MINIMO = { dia: 14, semana: 6 };
// Rangos del selector único del criterio de gráficas (1 mes · 3 meses · 1 año · Todo), en semanas.
export const RANGOS = [
  { clave: "1m", semanas: 4 },
  { clave: "3m", semanas: 13 },
  { clave: "1a", semanas: 52 },
  { clave: "todo", semanas: Infinity },
];
export const FASES = ["regla", "folicular", "ovulacion", "lutea"];
export const MUSCULOS_SERIES = [
  "pecho", "dorsales", "espalda_alta", "hombros", "biceps", "triceps", "antebrazos", "abdomen", "lumbar",
  "gluteos", "cuadriceps", "isquios", "gemelos", "aductores",
];

const ms = (f) => (typeof f === "number" ? f : new Date(f).getTime());
const red = (x, d = 1) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);
const media = (xs) => { const ys = xs.filter((v) => v !== null && v !== undefined && Number.isFinite(v)); return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null; };
function diasEntre(a, b) {
  const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(b) - utc(a)) / 86400000);
}
const cuentaSerie = (s) => !!s && s.hecha && s.tipo !== "calentamiento";

// ---------- Fase del ciclo ----------
// Día del ciclo = días desde el último inicio de regla + 1. Fases como en la maqueta (y en la divulgación
// habitual, sin pretender exactitud): los días marcados como regla son «regla»; luego folicular hasta el
// día 13, ovulación del 14 al 16 y lútea a partir del 17. Si han pasado más de 40 días desde el último
// inicio (se dejó de apuntar), no se sabe: null.
export function faseDelDia(fecha, inicios, reglaSet) {
  let ultimo = null;
  for (const i of inicios) { if (i <= fecha) ultimo = i; else break; }
  const cicloDia = ultimo ? diasEntre(ultimo, fecha) + 1 : null;
  if (reglaSet && reglaSet.has(fecha)) return { fase: "regla", cicloDia };
  if (!ultimo || cicloDia > 40) return { fase: null, cicloDia: null };
  return { fase: cicloDia <= 13 ? "folicular" : cicloDia <= 16 ? "ovulacion" : "lutea", cicloDia };
}

// ---------- La serie de días ----------
// `ctx`: { data, sesiones, ejercicioDe, pesoCorporal, indice, diario, periodo (o null), hoy, inicioSemana }.
// Devuelve { dias: [...], semanas: [...], inicioSemana } (el más antiguo primero; hoy, el último).
export function construirSerie(ctx) {
  const { data = {}, sesiones = [], ejercicioDe = () => null, pesoCorporal = null, indice = null, diario = null, periodo = null, inicioSemana = 1 } = ctx;
  const hoy = typeof ctx.hoy === "string" ? ctx.hoy : fechaLocal(ctx.hoy || Date.now());
  const perfil = data.perfil || {};
  const tipos = Object.keys(perfil.repartoComidas || {}).length ? Object.keys(perfil.repartoComidas) : ["Desayuno", "Comida", "Merienda", "Cena"];

  // Peso: el último pesaje normal de cada día.
  const pesos = {};
  [...((data.pesoTracking && data.pesoTracking.historial) || []), ...((data.pesoTracking && data.pesoTracking.entradas) || [])]
    .filter((e) => e && e.fecha && !e.atipico && Number(e.peso) > 0)
    .forEach((e) => { pesos[e.fecha] = Number(e.peso); });

  // Entreno: las sesiones terminadas, agrupadas por día.
  const porDia = {};
  (sesiones || []).forEach((s) => { if (s && s.inicio) (porDia[fechaLocal(s.inicio)] = porDia[fechaLocal(s.inicio)] || []).push(s); });
  const diasConEntreno = Object.keys(porDia).sort();

  // Récords: los que tiene hoy el índice, por su fecha.
  const records = {};
  Object.values((indice && indice.ejercicios) || {}).forEach((info) => {
    Object.values((info && info.records) || {}).forEach((r) => { if (r && r.fecha) records[r.fecha] = (records[r.fecha] || 0) + 1; });
  });

  const completadas = data.comidasCompletadas || {};
  const fechasComida = Object.keys(completadas).filter((f) => Object.values(completadas[f] || {}).some(Boolean)).sort();
  const dd = (diario && diario.dias) || {};

  // Período (solo si viene): inicios y días de regla.
  const regla = periodo && Array.isArray(periodo.regla) ? periodo.regla : null;
  const inicios = regla ? iniciosDeRegla(regla) : [];
  const reglaSet = regla ? new Set(regla) : null;

  // Desde el dato más antiguo (con un tope de dos años) hasta hoy.
  const primeros = [
    Object.keys(pesos).sort()[0], diasConEntreno[0], fechasComida[0], Object.keys(dd).sort()[0], regla && regla.length ? [...regla].sort()[0] : null,
  ].filter((f) => f && f <= hoy);
  let desde = primeros.length ? primeros.sort()[0] : hoy;
  if (diasEntre(desde, hoy) > DIAS_MAXIMOS) desde = sumarDias(hoy, -DIAS_MAXIMOS);
  // Se empieza en el primer día de su semana, para que la primera semana no quede partida.
  desde = semanaDe(desde, inicioSemana);

  const primerEntreno = diasConEntreno[0] || null;
  const primeraComida = fechasComida[0] || null;
  const dias = [];
  for (let fecha = desde; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
    const d = { fecha, dow: (new Date(fecha + "T12:00:00").getDay() + 6) % 7 };
    d.peso = pesos[fecha] ?? null;

    // Comida
    const delDia = completadas[fecha] || {};
    const marcadas = tipos.filter((m) => delDia[m]).length;
    d.hechas = primeraComida && fecha >= primeraComida ? Math.round((Math.min(marcadas, tipos.length) / tipos.length) * 100) : null;
    const registros = tipos.map((m) => delDia[m]);
    if (registros.every((x) => x && typeof x === "object" && x.macros)) {
      const suma = (k) => registros.reduce((t, x) => t + (Number(x.macros[k]) || 0), 0);
      d.kcal = Math.round(suma("kcal"));
      d.prot = Math.round(suma("prot"));
      d.hidr = Math.round(suma("carb"));
      d.grasa = Math.round(suma("fat"));
    } else d.kcal = d.prot = d.hidr = d.grasa = null;

    // Entreno
    const ses = porDia[fecha] || [];
    const usaEntreno = primerEntreno && fecha >= primerEntreno;
    d.sesiones = usaEntreno ? ses.length : null;
    d.entreno = usaEntreno ? (ses.length ? "con" : "sin") : null;
    d.volumen = usaEntreno ? red(ses.reduce((t, s) => t + volumenSesion(s, ejercicioDe, pesoCorporal), 0) / 1000, 2) : null; // en toneladas
    d.esfuerzo = red(media(ses.map((s) => (Number(s.esfuerzo) >= 1 ? Number(s.esfuerzo) : null))), 1);
    d.duracion = ses.length ? Math.round(ses.reduce((t, s) => t + duracionEfectiva(s, s.fin || s.inicio), 0) / 60) : null;
    d.records = usaEntreno ? records[fecha] || 0 : null;
    d.series = usaEntreno ? seriesPorMusculo(ses, ejercicioDe, null, null) : null;
    d.rm = {};
    ses.forEach((s) => (s.ejercicios || []).forEach((ej) => {
      const e = ejercicioDe(ej.ejercicioId);
      if (e && e.tipo && e.tipo !== "peso_reps") return;
      (ej.series || []).filter(cuentaSerie).forEach((sr) => {
        const v = e1rm(cargaSerie(sr, e && e.pareja), Number(sr.reps), Number(sr.rir)); // ×2 con mancuernas a pares
        if (v && (!d.rm[ej.ejercicioId] || v > d.rm[ej.ejercicioId])) d.rm[ej.ejercicioId] = v;
      });
    }));

    // Sueño y pasos
    const diaDiario = dd[fecha] || {};
    d.sueno = diaDiario.sueno ? diaDiario.sueno.horas : null;
    d.calidad = diaDiario.sueno && diaDiario.sueno.calidad !== null && diaDiario.sueno.calidad !== undefined ? diaDiario.sueno.calidad : null;
    d.pasos = diaDiario.pasos ?? null;

    // Ciclo
    const f = regla ? faseDelDia(fecha, inicios, reglaSet) : { fase: null, cicloDia: null };
    d.fase = f.fase;
    d.cicloDia = f.cicloDia;
    dias.push(d);
  }

  const semanas = [];
  dias.forEach((d, i) => {
    const s = semanaDe(d.fecha, inicioSemana);
    if (!semanas.length || semanas[semanas.length - 1].inicio !== s) semanas.push({ inicio: s, desde: i, dias: [] });
    semanas[semanas.length - 1].dias.push(d);
  });
  return { dias, semanas, inicioSemana, hoy };
}

// ---------- Variables ----------
// agg: cómo se resume una semana (media de los días con dato, suma, máximo o «delta»: la media de esta semana
// menos la de la anterior). `cat`: variable de categorías. `local`: solo en el móvil (el ciclo). `ref`: la
// clave de los objetivos del día que hace de raya mostaza (la referencia del criterio de gráficas).
const BASE = [
  { id: "peso", grupo: "cuerpo", unidad: "kg", dec: 1, agg: "media", dia: (d) => d.peso },
  { id: "dPeso", grupo: "cuerpo", unidad: "kg", dec: 1, agg: "delta", soloSemana: true, dia: (d) => d.peso },
  { id: "sueno", grupo: "cuerpo", unidad: "h", dec: 1, agg: "media", dia: (d) => d.sueno },
  { id: "calidad", grupo: "cuerpo", unidad: "/10", dec: 1, agg: "media", dia: (d) => d.calidad },
  { id: "pasos", grupo: "cuerpo", unidad: "pasos", dec: 0, agg: "media", dia: (d) => d.pasos },
  { id: "fase", grupo: "cuerpo", cat: FASES, local: true, dia: (d) => d.fase },
  { id: "kcal", grupo: "comida", unidad: "kcal", dec: 0, agg: "media", ref: "kcal", dia: (d) => d.kcal },
  { id: "prot", grupo: "comida", unidad: "g", dec: 0, agg: "media", ref: "prot", dia: (d) => d.prot },
  { id: "hidr", grupo: "comida", unidad: "g", dec: 0, agg: "media", ref: "carb", dia: (d) => d.hidr },
  { id: "grasa", grupo: "comida", unidad: "g", dec: 0, agg: "media", ref: "fat", dia: (d) => d.grasa },
  { id: "hechas", grupo: "comida", unidad: "%", dec: 0, agg: "media", dia: (d) => d.hechas },
  { id: "entreno", grupo: "entreno", cat: ["sin", "con"], dia: (d) => d.entreno },
  { id: "sesiones", grupo: "entreno", unidad: "", dec: 0, agg: "suma", soloSemana: true, dia: (d) => d.sesiones },
  { id: "volumen", grupo: "entreno", unidad: "t", dec: 1, agg: "suma", dia: (d) => d.volumen },
  { id: "esfuerzo", grupo: "entreno", unidad: "/5", dec: 1, agg: "media", dia: (d) => d.esfuerzo },
  { id: "duracion", grupo: "entreno", unidad: "min", dec: 0, agg: "media", dia: (d) => d.duracion },
  { id: "records", grupo: "entreno", unidad: "", dec: 0, agg: "suma", soloSemana: true, dia: (d) => d.records },
];
export const VARIABLES = BASE;
const POR_ID = Object.fromEntries(BASE.map((v) => [v.id, v]));

// La definición de una variable, también de las que llevan parámetro: «rm:<ejercicioId>» (1RM estimado de
// ese ejercicio) y «series:<músculo>» (series de ese músculo, el principal 1 y cada secundario 0,5).
export function variable(id) {
  if (POR_ID[id]) return POR_ID[id];
  if (typeof id === "string" && id.startsWith("rm:")) {
    const ej = id.slice(3);
    return { id, grupo: "entreno", unidad: "kg", dec: 1, agg: "max", ejercicio: ej, dia: (d) => (d.rm && d.rm[ej]) || null };
  }
  if (typeof id === "string" && id.startsWith("series:")) {
    const m = id.slice(7);
    return { id, grupo: "entreno", unidad: "series", dec: 0, agg: "suma", soloSemana: true, musculo: m, dia: (d) => (d.series ? d.series[m] || 0 : null) };
  }
  return null;
}
export const esCategorica = (id) => !!(variable(id) && variable(id).cat);

// Ejercicios con 1RM estimado en la serie, del que más días tiene al que menos: [{ id, dias }].
export function ejerciciosConRM(serie) {
  const n = {};
  (serie.dias || []).forEach((d) => Object.keys(d.rm || {}).forEach((id) => { n[id] = (n[id] || 0) + 1; }));
  return Object.entries(n).map(([id, dias]) => ({ id, dias })).sort((a, b) => b.dias - a.dias || a.id.localeCompare(b.id));
}

// ---------- Valores por día o por semana ----------
// [{ fecha, valor, n }] de una variable en el rango (en semanas, contando hacia atrás desde hoy; la semana
// actual cuenta). Por día: los últimos `semanas × 7` días. Las «soloSemana» siempre van por semana.
export function valores(serie, id, periodo = "semana", semanas = Infinity) {
  const v = variable(id);
  if (!v || v.cat) return [];
  const porSemana = periodo === "semana" || v.soloSemana;
  if (!porSemana) {
    const dias = Number.isFinite(semanas) ? serie.dias.slice(-semanas * 7) : serie.dias;
    return dias.map((d) => ({ fecha: d.fecha, valor: v.dia(d) ?? null, n: v.dia(d) === null || v.dia(d) === undefined ? 0 : 1 }));
  }
  const todas = serie.semanas.map((s) => {
    const xs = s.dias.map(v.dia).filter((x) => x !== null && x !== undefined);
    let valor = null;
    if (v.agg === "suma") valor = xs.length ? xs.reduce((a, b) => a + b, 0) : null;
    else if (v.agg === "max") valor = xs.length ? Math.max(...xs) : null;
    else valor = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    return { fecha: s.inicio, valor: valor === null ? null : red(valor, v.dec + 1), n: xs.length };
  });
  if (v.agg === "delta") {
    const conDelta = todas.map((q, k) => ({ fecha: q.fecha, n: q.n, valor: k && q.valor !== null && todas[k - 1].valor !== null ? red(q.valor - todas[k - 1].valor, 2) : null }));
    return Number.isFinite(semanas) ? conDelta.slice(-semanas) : conDelta;
  }
  return Number.isFinite(semanas) ? todas.slice(-semanas) : todas;
}

// ---------- Estadística honesta ----------
export function pearson(p) {
  const n = p.length;
  if (n < 3) return 0;
  const mx = p.reduce((a, q) => a + q[0], 0) / n;
  const my = p.reduce((a, q) => a + q[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  p.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

// { tipo: "poco" | "nada" | "pista", fuerza: null | "debil" | "media" | "clara", n, min, periodo, sube: bool }.
// La interfaz lo pasa a palabras (cuerpo.pista.* en logica/i18n.js).
export function pista(r, n, periodo) {
  const min = MINIMO[periodo] || MINIMO.dia;
  if (n < min) return { tipo: "poco", fuerza: null, n, min, periodo, sube: null };
  const a = Math.abs(r);
  if (a < 0.2) return { tipo: "nada", fuerza: null, n, min, periodo, sube: null };
  return { tipo: "pista", fuerza: a < 0.4 ? "debil" : a < 0.6 ? "media" : "clara", n, min, periodo, sube: r > 0 };
}

// Parejas [x, y, fecha] de los días (o semanas) con las dos cosas apuntadas.
export function parejas(serie, idX, idY, periodo, semanas) {
  const p = periodo === "semana" || (variable(idX) && variable(idX).soloSemana) || (variable(idY) && variable(idY).soloSemana) ? "semana" : "dia";
  const xs = valores(serie, idX, p, semanas);
  const ys = valores(serie, idY, p, semanas);
  const porFecha = Object.fromEntries(ys.map((q) => [q.fecha, q.valor]));
  return xs.filter((q) => q.valor !== null && porFecha[q.fecha] !== null && porFecha[q.fecha] !== undefined).map((q) => [q.valor, porFecha[q.fecha], q.fecha]);
}

export function relacion(serie, idX, idY, periodo, semanas) {
  const p = periodo === "semana" || (variable(idX) && variable(idX).soloSemana) || (variable(idY) && variable(idY).soloSemana) ? "semana" : "dia";
  const pares = parejas(serie, idX, idY, p, semanas);
  const r = pearson(pares);
  return { p: pares, r: red(r, 3), n: pares.length, periodo: p, pista: pista(r, pares.length, p) };
}

// Media de una variable por categoría (días con / sin entreno, fase del ciclo): [{ cat, n, media }].
// Siempre por día. `minimo` por categoría para poder hablar de «media» (por defecto 5).
export function porCategoria(serie, idCat, idY, semanas = Infinity) {
  const c = variable(idCat);
  const y = variable(idY);
  if (!c || !c.cat || !y || y.cat) return [];
  const dias = Number.isFinite(semanas) ? serie.dias.slice(-semanas * 7) : serie.dias;
  return c.cat.map((cat) => {
    const xs = dias.filter((d) => c.dia(d) === cat).map((d) => y.dia(d)).filter((v) => v !== null && v !== undefined);
    return { cat, n: xs.length, media: xs.length ? red(xs.reduce((a, b) => a + b, 0) / xs.length, (y.dec || 0) + 1) : null };
  });
}
export const MINIMO_CATEGORIA = 5;

// Mediana (de los valores con dato).
export function mediana(xs) {
  const ys = xs.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b);
  if (!ys.length) return null;
  const m = Math.floor(ys.length / 2);
  return ys.length % 2 ? ys[m] : (ys[m - 1] + ys[m]) / 2;
}

// La tabla «semanas (o días) con X alto / bajo e Y alto / bajo: media de Z». Alto = por encima o igual que
// la mediana propia. Cada casilla dice cuántos días o semanas tiene detrás; con menos de 3 semanas (o 5
// días) no da media.
export function tablaXYZ(serie, ids, periodo, semanas) {
  const [ix, iy, iz] = ids;
  const p = [ix, iy, iz].some((id) => variable(id) && variable(id).soloSemana) ? "semana" : periodo;
  const dx = valores(serie, ix, p, semanas), dy = valores(serie, iy, p, semanas), dz = valores(serie, iz, p, semanas);
  const mx = mediana(dx.map((q) => q.valor)), my = mediana(dy.map((q) => q.valor));
  const y = Object.fromEntries(dy.map((q) => [q.fecha, q.valor]));
  const z = Object.fromEntries(dz.map((q) => [q.fecha, q.valor]));
  const listas = { aa: [], ab: [], ba: [], bb: [] };
  dx.forEach((q) => {
    if (q.valor === null || y[q.fecha] === null || y[q.fecha] === undefined || z[q.fecha] === null || z[q.fecha] === undefined) return;
    listas[(q.valor >= mx ? "a" : "b") + (y[q.fecha] >= my ? "a" : "b")].push(z[q.fecha]);
  });
  const min = p === "dia" ? 5 : 3;
  const celdas = Object.fromEntries(Object.entries(listas).map(([k, xs]) => [k, { n: xs.length, media: xs.length >= min ? red(xs.reduce((a, b) => a + b, 0) / xs.length, 2) : null }]));
  return { periodo: p, medianaX: mx, medianaY: my, celdas, min };
}

// ---------- El constructor: preguntas con huecos ----------
// Cinco formas de pregunta (registro.md: la interfaz C, «frase con huecos») y, encima, unas 25 preguntas
// hechas por temas que son esas formas con los huecos ya puestos. Cambiar un hueco convierte la pregunta en
// la forma general. Más la «pregunta libre» de 3 o 4 variables. Los textos (con los huecos marcados como
// {v1}, {v2}...) están en logica/i18n.js: cuerpo.cons.forma.* y cuerpo.cons.p.*.
//   tiempo:    una variable a lo largo del tiempo (línea o barras).
//   relacion:  dos variables, una contra otra (nube de puntos) o en el tiempo (apiladas).
//   categoria: una variable según una categoría (barras por categoría). Siempre por día.
//   tabla:     tres variables por semanas (tabla alto / bajo).
//   juntas:    tres variables a la vez, con las cinco vistas.
//   libre:     tres o cuatro variables a la vez, con las cinco vistas.
export const FORMAS = {
  tiempo: { huecos: ["v1"], conPeriodo: true },
  relacion: { huecos: ["v1", "v2"], conPeriodo: true },
  categoria: { huecos: ["v1", "c"], conPeriodo: false },
  tabla: { huecos: ["v1", "v2", "v3"], conPeriodo: false },
  juntas: { huecos: ["v1", "v2", "v3"], conPeriodo: true },
  libre: { huecos: ["v1", "v2", "v3", "v4"], conPeriodo: true, opcionales: ["v4"] },
};
export const TEMAS = ["peso", "comida", "entreno", "sueno", "ciclo"];
// `rm` y `serie` son marcadores: la interfaz los cambia por el ejercicio con más 1RM y por un músculo.
export const PREGUNTAS = [
  // Peso
  { id: "pesoTiempo", tema: "peso", forma: "tiempo", huecos: { v1: "peso" }, periodo: "semana" },
  { id: "pesoKcal", tema: "peso", forma: "relacion", huecos: { v1: "kcal", v2: "dPeso" }, periodo: "semana" },
  { id: "pesoPasos", tema: "peso", forma: "relacion", huecos: { v1: "pasos", v2: "dPeso" }, periodo: "semana" },
  { id: "pesoEntreno", tema: "peso", forma: "categoria", huecos: { v1: "peso", c: "entreno" } },
  { id: "pesoTabla", tema: "peso", forma: "tabla", huecos: { v1: "kcal", v2: "sesiones", v3: "dPeso" } },
  // Comida
  { id: "kcalTiempo", tema: "comida", forma: "tiempo", huecos: { v1: "kcal" }, periodo: "dia" },
  { id: "protTiempo", tema: "comida", forma: "tiempo", huecos: { v1: "prot" }, periodo: "semana" },
  { id: "protEntreno", tema: "comida", forma: "categoria", huecos: { v1: "prot", c: "entreno" } },
  { id: "kcalEntreno", tema: "comida", forma: "categoria", huecos: { v1: "kcal", c: "entreno" } },
  { id: "hechasSesiones", tema: "comida", forma: "relacion", huecos: { v1: "sesiones", v2: "hechas" }, periodo: "semana" },
  // Entreno
  { id: "rmTiempo", tema: "entreno", forma: "tiempo", huecos: { v1: "rm" }, periodo: "semana" },
  { id: "seriesTiempo", tema: "entreno", forma: "tiempo", huecos: { v1: "serie" }, periodo: "semana" },
  { id: "volumenTiempo", tema: "entreno", forma: "tiempo", huecos: { v1: "volumen" }, periodo: "semana" },
  { id: "recordsTiempo", tema: "entreno", forma: "tiempo", huecos: { v1: "records" }, periodo: "semana" },
  { id: "esfuerzoHidr", tema: "entreno", forma: "relacion", huecos: { v1: "hidr", v2: "esfuerzo" }, periodo: "dia" },
  { id: "volumenProt", tema: "entreno", forma: "relacion", huecos: { v1: "prot", v2: "volumen" }, periodo: "semana" },
  // Sueño
  { id: "suenoTiempo", tema: "sueno", forma: "tiempo", huecos: { v1: "sueno" }, periodo: "dia" },
  { id: "suenoKcal", tema: "sueno", forma: "relacion", huecos: { v1: "sueno", v2: "kcal" }, periodo: "dia" },
  { id: "suenoEsfuerzo", tema: "sueno", forma: "relacion", huecos: { v1: "sueno", v2: "esfuerzo" }, periodo: "dia" },
  { id: "suenoEntreno", tema: "sueno", forma: "categoria", huecos: { v1: "sueno", c: "entreno" } },
  { id: "suenoJuntas", tema: "sueno", forma: "juntas", huecos: { v1: "sueno", v2: "kcal", v3: "esfuerzo" }, periodo: "dia" },
  // Ciclo (solo con perfil de mujer)
  { id: "cicloPeso", tema: "ciclo", forma: "categoria", huecos: { v1: "peso", c: "fase" } },
  { id: "cicloKcal", tema: "ciclo", forma: "categoria", huecos: { v1: "kcal", c: "fase" } },
  { id: "cicloSueno", tema: "ciclo", forma: "categoria", huecos: { v1: "sueno", c: "fase" } },
  { id: "cicloEsfuerzo", tema: "ciclo", forma: "categoria", huecos: { v1: "esfuerzo", c: "fase" } },
];
export const PREGUNTA_LIBRE = { id: "libre", tema: null, forma: "libre", huecos: { v1: "sueno", v2: "kcal", v3: "esfuerzo", v4: "" }, periodo: "semana" };

// Cambia los marcadores «rm» y «serie» por lo que haya en la serie: el ejercicio con más días de 1RM y el
// músculo con más series. Sin ninguno, quedan el press de banca y el pecho (la gráfica dirá «sin datos»).
export function completarHuecos(huecos, serie) {
  const h = { ...huecos };
  Object.keys(h).forEach((k) => {
    if (h[k] === "rm") {
      const ej = ejerciciosConRM(serie)[0];
      h[k] = "rm:" + (ej ? ej.id : "ex_press_banca_barra");
    }
    if (h[k] === "serie") {
      const total = {};
      (serie.dias || []).forEach((d) => Object.entries(d.series || {}).forEach(([m, n]) => { total[m] = (total[m] || 0) + n; }));
      const m = Object.entries(total).sort((a, b) => b[1] - a[1])[0];
      h[k] = "series:" + (m ? m[0] : "pecho");
    }
  });
  return h;
}

// Qué se dibuja con un montaje del constructor: { forma, ids (numéricas, en orden), cat, periodo,
// soloSemana (la variable que obliga a ir por semana, si hay) }.
export function resolverMontaje(spec) {
  const forma = FORMAS[spec.forma] ? spec.forma : "libre";
  const ids = FORMAS[forma].huecos.filter((k) => k !== "c").map((k) => (spec.huecos || {})[k]).filter((id) => id && variable(id) && !variable(id).cat);
  const cat = forma === "categoria" ? (spec.huecos || {}).c || null : null;
  let periodo = forma === "tabla" ? "semana" : forma === "categoria" ? "dia" : spec.periodo === "dia" ? "dia" : "semana";
  const obliga = periodo === "dia" ? ids.find((id) => variable(id).soloSemana) || null : null;
  if (obliga) periodo = "semana";
  return { forma, ids, cat, periodo, soloSemana: obliga };
}
