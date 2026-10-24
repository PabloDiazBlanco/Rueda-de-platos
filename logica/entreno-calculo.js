// ---------- Entreno: cálculos ----------
// Módulo de lógica pura (sin JSX, sin React) del módulo de entreno: volumen, 1RM estimado, récords,
// «anterior», series por músculo, validación de lo tecleado, duración con pausas y semanas. No sabe nada
// de cómo se guardan las cosas (eso es logica/entreno-almacen.js) ni de nombres; recibe siempre
// `ejercicioDe(id)` → { tipo, musculo, secundarios } para no depender de la biblioteca.
//
// Formas de los datos (ver la sección «Entrenamiento» de CLAUDE.md):
//   sesión  = { id, inicio, fin, pausas: [{ inicio, fin }], ejercicios: [{ inst, ejercicioId, series }] }
//   serie   = { id, tipo: "normal"|"calentamiento"|"fallo"|"drop", kg, reps, seg, km, rir, hecha }
// Las horas son texto ISO («2026-10-23T17:55:00.000Z») o milisegundos; los kilos y kilómetros se guardan
// siempre en kg y km (las libras y millas son solo de pantalla).
//
// Las series de calentamiento y las no hechas nunca cuentan para volumen, récords ni series por músculo:
// el calentamiento no es trabajo efectivo, y una serie sin marcar es una que no se hizo.

const redondear1 = (x) => Math.round(x * 10) / 10;

function ms(fecha) {
  if (fecha === null || fecha === undefined) return null;
  return typeof fecha === "number" ? fecha : new Date(fecha).getTime();
}

const cuenta = (serie) => !!serie && serie.hecha && serie.tipo !== "calentamiento";

// Fecha local «AAAA-MM-DD» de una hora ISO o en milisegundos. Local y no UTC a propósito: un entreno a
// las 00:30 del día 1 en España es del día 1, aunque en UTC sea aún el día anterior.
export function fechaLocal(fecha) {
  const d = new Date(ms(fecha));
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// ---------- 1RM estimado ----------
// Fórmula de Epley, kg × (1 + r/30), con r = repeticiones + RIR si se anotó (las que «quedaban en la
// recámara»: lo que se habría podido hacer al fallo, que es lo que la fórmula supone). Con r = 1 es el
// propio peso. A partir de unas 12 repeticiones la estimación pierde fiabilidad (todas las fórmulas de
// 1RM se separan mucho entre sí), así que se marca como aproximada. Redondeada a 0,1 kg.
export function e1rm(kg, reps, rir) {
  const r = (Number(reps) || 0) + (Number(rir) || 0);
  if (!kg || kg <= 0 || r <= 0) return null;
  if (r === 1) return redondear1(kg);
  return redondear1(kg * (1 + r / 30));
}

export function e1rmFiable(reps, rir) {
  return (Number(reps) || 0) + (Number(rir) || 0) <= 12;
}

// ---------- Volumen ----------
// kg × repeticiones de las series que cuentan. En los de peso corporal se usa el peso del perfil: sin
// él no se puede saber, así que cuenta 0 (mejor nada que un número inventado). En los asistidos, la
// máquina quita kilos: se mueve el peso corporal menos la ayuda (nunca menos de 0). Los de duración y
// distancia no tienen volumen en kilos.
export function volumenSerie(serie, tipo, pesoCorporal) {
  if (!cuenta(serie)) return 0;
  const kg = Number(serie.kg) || 0;
  const reps = Number(serie.reps) || 0;
  const pc = Number(pesoCorporal) || 0;
  switch (tipo) {
    case "peso_reps": return kg * reps;
    case "reps": return pc * reps;
    case "lastre_reps": return pc ? (pc + kg) * reps : 0;
    case "asistido_reps": return pc ? Math.max(0, pc - kg) * reps : 0;
    default: return 0;
  }
}

function tipoDe(ejercicioDe, id) {
  const e = ejercicioDe(id);
  return (e && e.tipo) || "peso_reps";
}

export function volumenSesion(sesion, ejercicioDe, pesoCorporal) {
  return redondear1((sesion.ejercicios || []).reduce((total, ej) => {
    const tipo = tipoDe(ejercicioDe, ej.ejercicioId);
    return total + (ej.series || []).reduce((s, serie) => s + volumenSerie(serie, tipo, pesoCorporal), 0);
  }, 0));
}

// ---------- Duración ----------
// Segundos entre el inicio y el fin (o `ahora`, si sigue abierta), menos lo que estuvo en pausa. Se
// calcula con las horas y no contando ticks de un temporizador: si el móvil se bloquea, el navegador
// para los temporizadores, pero al volver la cuenta sigue siendo exacta.
export function duracionEfectiva(sesion, ahora) {
  const inicio = ms(sesion.inicio);
  const fin = ms(sesion.fin) ?? ms(ahora) ?? Date.now();
  const pausado = (sesion.pausas || []).reduce((total, p) => {
    const a = Math.max(ms(p.inicio), inicio);
    const b = Math.min(ms(p.fin) ?? fin, fin);
    return total + Math.max(0, b - a);
  }, 0);
  return Math.max(0, Math.floor((fin - inicio - pausado) / 1000));
}

// Resumen de una sesión: duración, volumen, series hechas (sin calentamiento, igual que el volumen) y
// ejercicios con al menos una serie hecha.
export function resumenSesion(sesion, ejercicioDe, pesoCorporal, ahora) {
  const ejercicios = sesion.ejercicios || [];
  return {
    duracionSeg: duracionEfectiva(sesion, ahora),
    volumen: volumenSesion(sesion, ejercicioDe, pesoCorporal),
    series: ejercicios.reduce((n, ej) => n + (ej.series || []).filter(cuenta).length, 0),
    ejercicios: ejercicios.filter((ej) => (ej.series || []).some((s) => s.hecha)).length,
  };
}

// ---------- Récords ----------
// Qué récords tiene cada tipo de ejercicio (decisión del plan, §3):
//   peso_reps: peso máximo, 1RM estimado, mejor serie (mayor kg × reps), mejor volumen de una sesión.
//   reps: más repeticiones en una serie y en una sesión.   lastre_reps: lastre máximo y mejor serie.
//   asistido_reps: más repeticiones en una serie.            duracion: mayor tiempo.
//   distancia_duracion: mayor distancia y mayor tiempo.
export const RECORDS_POR_TIPO = {
  peso_reps: ["pesoMax", "e1rm", "mejorSerie", "volumenSesion"],
  reps: ["repsSerie", "repsSesion"],
  lastre_reps: ["pesoMax", "mejorSerie"],
  asistido_reps: ["repsSerie"],
  duracion: ["segMax"],
  distancia_duracion: ["kmMax", "segMax"],
};

// Lo mejor de un ejercicio dentro de una sesión, solo con los récords de su tipo. Cada valor es un
// número, salvo `mejorSerie`, que es { kg, reps, valor } (valor = kg × reps, lo que se compara).
export function mejoresDeEjercicioEnSesion(ej, tipo, pesoCorporal) {
  const series = (ej.series || []).filter(cuenta);
  const claves = RECORDS_POR_TIPO[tipo] || RECORDS_POR_TIPO.peso_reps;
  const mejores = {};
  if (!series.length) return mejores;
  const max = (f) => Math.max(...series.map((s) => Number(f(s)) || 0));
  claves.forEach((clave) => {
    let valor = null;
    if (clave === "pesoMax") valor = max((s) => s.kg);
    else if (clave === "e1rm") valor = Math.max(0, ...series.map((s) => e1rm(s.kg, s.reps, s.rir) || 0));
    else if (clave === "mejorSerie") {
      const mejor = series.reduce((m, s) => ((Number(s.kg) || 0) * (Number(s.reps) || 0) > m.valor ? { kg: Number(s.kg) || 0, reps: Number(s.reps) || 0, valor: (Number(s.kg) || 0) * (Number(s.reps) || 0) } : m), { kg: 0, reps: 0, valor: 0 });
      valor = mejor.valor > 0 ? mejor : null;
    } else if (clave === "volumenSesion") valor = redondear1(series.reduce((t, s) => t + volumenSerie(s, tipo, pesoCorporal), 0));
    else if (clave === "repsSerie") valor = max((s) => s.reps);
    else if (clave === "repsSesion") valor = series.reduce((t, s) => t + (Number(s.reps) || 0), 0);
    else if (clave === "segMax") valor = max((s) => s.seg);
    else if (clave === "kmMax") valor = max((s) => s.km);
    if (valor !== null && (typeof valor === "object" || valor > 0)) mejores[clave] = valor;
  });
  return mejores;
}

const valorDe = (r) => (r === null || r === undefined ? null : typeof r === "object" ? r.valor : r);

// Récords batidos: los de `mejores` que superan estrictamente al anterior. Sin récord anterior (la
// primera vez que se hace un ejercicio, o un récord que ese tipo no tenía) no se cuenta como batido: en
// la primera sesión todo sería «récord», y un aviso que sale siempre deja de significar algo.
// `recordsPrevios` admite { pesoMax: 60 } o { pesoMax: { valor: 60, fecha, sesionId } } (el del índice).
export function recordsBatidos(recordsPrevios, mejores) {
  const previos = recordsPrevios || {};
  return Object.keys(mejores || {})
    .filter((clave) => {
      const antes = valorDe(previos[clave]);
      const ahora = valorDe(mejores[clave]);
      return antes !== null && ahora !== null && ahora > antes;
    })
    .map((clave) => ({ clave, valor: mejores[clave], anterior: previos[clave] }));
}

// Récords que se miden en una sola serie (los de toda la sesión, volumen y repeticiones totales, se
// ven al terminar).
const CLAVES_DE_SERIE = ["pesoMax", "e1rm", "mejorSerie", "repsSerie", "segMax", "kmMax"];

function maximoRecord(a, b) {
  const va = valorDe(a);
  const vb = valorDe(b);
  if (va === null) return b;
  if (vb === null) return a;
  return vb > va ? b : a;
}

// Récord «en vivo» (fase C2): al marcar una serie, ¿bate algún récord de una serie? Se compara con los
// récords anteriores del índice y con las series hechas que van antes en este mismo ejercicio de la
// sesión (así, dos series iguales seguidas no dan dos avisos: solo la primera). Sin récord anterior no
// hay aviso (ver recordsBatidos).
export function recordsEnVivo(ej, serieId, tipo, pesoCorporal, recordsPrevios) {
  const series = ej.series || [];
  const i = series.findIndex((s) => s.id === serieId);
  if (i < 0 || !cuenta(series[i])) return [];
  const antes = mejoresDeEjercicioEnSesion({ series: series.slice(0, i) }, tipo, pesoCorporal);
  const previos = {};
  CLAVES_DE_SERIE.forEach((clave) => {
    const m = maximoRecord((recordsPrevios || {})[clave], antes[clave]);
    if (m !== undefined && m !== null && (recordsPrevios || {})[clave] !== undefined) previos[clave] = m;
  });
  const mios = mejoresDeEjercicioEnSesion({ series: [series[i]] }, tipo, pesoCorporal);
  const deSerie = Object.fromEntries(Object.entries(mios).filter(([clave]) => CLAVES_DE_SERIE.includes(clave)));
  return recordsBatidos(previos, deSerie);
}

// Medallas del historial: las series de una sesión que tienen hoy algún récord de su ejercicio (según el
// índice, que guarda de qué sesión es cada récord). Se calcula con el índice actual, así que si se corrige
// una sesión antigua las medallas se recolocan solas.
export function seriesConRecord(registro, sesionId, ej, tipo, pesoCorporal) {
  const conRecord = new Set();
  const records = (registro && registro.records) || {};
  CLAVES_DE_SERIE.forEach((clave) => {
    const r = records[clave];
    if (!r || r.sesionId !== sesionId) return;
    const serie = (ej.series || []).filter(cuenta).find((s) => {
      const m = mejoresDeEjercicioEnSesion({ series: [s] }, tipo, pesoCorporal)[clave];
      return valorDe(m) === valorDe(r);
    });
    if (serie) conRecord.add(serie.id);
  });
  return conRecord;
}

// ---------- «Anterior» ----------
// Las series de la última vez que se hizo el ejercicio (las guarda el índice, ver entreno-almacen.js),
// serie a serie. Sin historial, una lista vacía (la primera vez no hay nada que enseñar, y no es error).
export function anteriorDe(indice, ejercicioId) {
  const e = indice && indice.ejercicios && indice.ejercicios[ejercicioId];
  return (e && e.ultima && e.ultima.series) || [];
}

// ---------- Series por músculo ----------
// Series que cuentan, sumadas por grupo muscular entre dos fechas (incluidas; null = sin límite): el
// músculo principal suma 1 por serie y cada secundario 0,5, porque trabaja pero no es el objetivo (es
// la convención más usada en la literatura de volumen por grupo muscular; el plan la deja fijada así). El
// cardio no es un músculo y no suma.
export function seriesPorMusculo(sesiones, ejercicioDe, desde, hasta) {
  const total = {};
  const sumar = (m, n) => { if (m && m !== "cardio") total[m] = (total[m] || 0) + n; };
  (sesiones || []).forEach((s) => {
    const dia = fechaLocal(s.inicio);
    if ((desde && dia < desde) || (hasta && dia > hasta)) return;
    (s.ejercicios || []).forEach((ej) => {
      const e = ejercicioDe(ej.ejercicioId);
      if (!e) return;
      const n = (ej.series || []).filter(cuenta).length;
      if (!n) return;
      sumar(e.musculo, n);
      (e.secundarios || []).forEach((m) => sumar(m, n * 0.5));
    });
  });
  return total;
}

// ---------- Validación de lo tecleado ----------
// Avisa (no bloquea) de lo que parece un error de dedo — queja repetida en las reseñas: un «1005» en vez
// de «100,5» estropea para siempre los récords y las gráficas. Reglas (plan, §3):
// - peso_alto: más de 2,5 veces el máximo histórico del ejercicio; sin histórico, más de 400 kg.
// - reps_altas: más de 100 repeticiones.   sin_reps: 0 repeticiones en un tipo que las lleva.
// - duracion_alta: más de 4 horas.
// `historial` = { pesoMax } (el récord del índice, en número o { valor }).
export function validarSerie(valores, tipo, historial) {
  const avisos = [];
  const kg = Number(valores.kg);
  const maxHistorico = valorDe(historial && historial.pesoMax);
  const llevaKg = ["peso_reps", "lastre_reps", "asistido_reps"].includes(tipo);
  const llevaReps = ["peso_reps", "reps", "lastre_reps", "asistido_reps"].includes(tipo);
  if (llevaKg && kg > 0) {
    if (maxHistorico > 0 ? kg > 2.5 * maxHistorico : kg > 400) avisos.push("peso_alto");
  }
  if (llevaReps && valores.reps !== null && valores.reps !== undefined && valores.reps !== "") {
    const reps = Number(valores.reps);
    if (reps > 100) avisos.push("reps_altas");
    if (reps === 0) avisos.push("sin_reps");
  }
  if (Number(valores.seg) > 4 * 3600) avisos.push("duracion_alta");
  return { ok: avisos.length === 0, avisos };
}

// ---------- Semanas ----------
// Primer día («AAAA-MM-DD») de la semana de una fecha. inicioSemana: 1 = lunes (por defecto en España),
// 0 = domingo. Se trabaja a mediodía para que un cambio de hora no mueva el día.
export function semanaDe(fecha, inicioSemana = 1) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : fechaLocal(fecha);
  const d = new Date(dia + "T12:00:00");
  const retroceso = (d.getDay() - inicioSemana + 7) % 7;
  d.setDate(d.getDate() - retroceso);
  return fechaLocal(d.getTime());
}

// Suma `n` días a una fecha «AAAA-MM-DD».
export function sumarDias(fecha, n) {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() + n);
  return fechaLocal(d.getTime());
}

// Las últimas `n` semanas (la actual incluida, la más antigua primero): cuántos entrenos y cuánto volumen
// hubo en cada una. Lo usa la pantalla de Progreso (fase C6).
export function semanasRecientes(sesiones, ejercicioDe, pesoCorporal, inicioSemana, hoy, n) {
  const actual = semanaDe(hoy, inicioSemana);
  const semanas = Array.from({ length: n }, (_, i) => ({ semana: sumarDias(actual, -7 * (n - 1 - i)), entrenos: 0, volumen: 0 }));
  const porSemana = Object.fromEntries(semanas.map((s) => [s.semana, s]));
  (sesiones || []).forEach((s) => {
    const fila = porSemana[semanaDe(s.inicio, inicioSemana)];
    if (!fila) return;
    fila.entrenos += 1;
    fila.volumen = redondear1(fila.volumen + volumenSesion(s, ejercicioDe, pesoCorporal));
  });
  return semanas;
}

// ---------- Unidades ----------
// Se guarda siempre en kg y km; libras y millas son solo de pantalla (ajuste de Ajustes de entreno), así
// se puede cambiar de unidad en cualquier momento sin tocar nada guardado. Equivalencias exactas por
// definición internacional. Lo que se enseña se redondea (0,1 lb / 0,01 mi); lo que se guarda, a la
// milésima, para que ida y vuelta dé lo mismo que se tecleó.
export const KG_POR_LB = 0.45359237;
export const KM_POR_MI = 1.609344;

const vacio = (v) => v === null || v === undefined || v === "";

export function pesoAPantalla(kg, unidad) {
  if (vacio(kg)) return null;
  const v = unidad === "lb" ? Number(kg) / KG_POR_LB : Number(kg);
  return Math.round(v * 10) / 10;
}
export function pesoDePantalla(valor, unidad) {
  if (vacio(valor)) return null;
  const v = Number(valor);
  return unidad === "lb" ? Math.round(v * KG_POR_LB * 1000) / 1000 : v;
}
export function distanciaAPantalla(km, unidad) {
  if (vacio(km)) return null;
  const v = unidad === "mi" ? Number(km) / KM_POR_MI : Number(km);
  return Math.round(v * 100) / 100;
}
export function distanciaDePantalla(valor, unidad) {
  if (vacio(valor)) return null;
  const v = Number(valor);
  return unidad === "mi" ? Math.round(v * KM_POR_MI * 1000) / 1000 : v;
}

// ---------- Resumen del mes (fase K1) ----------
// Lo del entreno de un mes para el resumen mensual de Cuerpo (gratis): entrenos, días distintos con
// entreno, volumen, tiempo total (descontando pausas), récords conseguidos ese mes que siguen vigentes
// (según el índice, que guarda la fecha de cada récord) y los tres grupos musculares con más series.
// `sesiones` son las del mes; `mes` es «AAAA-MM».
export function resumenEntrenoMes(sesiones, ejercicioDe, pesoCorporal, { indice = null, mes = null } = {}) {
  const lista = sesiones || [];
  const dias = new Set(lista.map((s) => fechaLocal(s.inicio)));
  const volumen = redondear1(lista.reduce((t, s) => t + volumenSesion(s, ejercicioDe, pesoCorporal), 0));
  const duracionSeg = lista.reduce((t, s) => t + duracionEfectiva(s, s.fin || s.inicio), 0);
  let records = 0;
  if (indice && mes) {
    Object.values(indice.ejercicios || {}).forEach((e) => Object.values(e.records || {}).forEach((r) => {
      if (r && r.fecha && r.fecha.slice(0, 7) === mes) records += 1;
    }));
  }
  const porMusculo = seriesPorMusculo(lista, ejercicioDe, null, null);
  const topMusculos = Object.entries(porMusculo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([musculo, series]) => ({ musculo, series }));
  return { sesiones: lista.length, dias: dias.size, volumen, duracionSeg, records, topMusculos };
}
