// ---------- Resumen mensual (f3-11) ----------
// Módulo de lógica pura (sin JSX): a partir de las comidas marcadas como completadas y, en la
// versión premium, del seguimiento de peso y los objetivos del perfil, calcula el resumen de un
// mes concreto. No depende de ninguna otra parte de la app salvo el propio dato guardado.

// Cuenta cuántas comidas se han marcado como completadas dentro de un mes concreto
// (comidasCompletadas viene como { "2026-09-15": { Comida: true, Cena: true }, ... }).
export function contarComidasCompletadas(comidasCompletadas, mesISO) {
  let total = 0;
  Object.keys(comidasCompletadas || {}).forEach((fecha) => {
    if (fecha.slice(0, 7) !== mesISO) return;
    total += Object.values(comidasCompletadas[fecha]).filter(Boolean).length;
  });
  return total;
}

// Cuántas comidas "tocaban" ese mes: comidas/día × días transcurridos. Si el mes ya terminó, se
// cuenta contra el mes completo; si es el mes en curso, solo contra los días que ya han pasado —
// así el porcentaje tiene sentido a mitad de mes, no arranca en "0 de 120".
export function comidasEsperadasEnMes(mesISO, comidasPorDia, hoy = new Date()) {
  const [anio, mes] = mesISO.split("-").map(Number);
  const diasDelMes = new Date(anio, mes, 0).getDate();
  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const diasTranscurridos = mesActualISO === mesISO ? hoy.getDate() : diasDelMes;
  return diasTranscurridos * (Number(comidasPorDia) || 4);
}

// Resumen básico (el que se ve en el plan gratis, y la base del premium).
export function calcularResumenMensual(data, mesISO, hoy = new Date()) {
  // Antes era un número suelto (perfil.comidasPorDia) que el usuario ponía a mano; desde que el
  // reparto de comidas es real (Fase 4), se cuenta solo a partir de él, sin pedirlo aparte.
  const comidasPorDia = Object.keys((data.perfil && data.perfil.repartoComidas) || {}).length || 4;
  const completadas = contarComidasCompletadas(data.comidasCompletadas, mesISO);
  const esperadas = comidasEsperadasEnMes(mesISO, comidasPorDia, hoy);
  const porcentaje = esperadas > 0 ? Math.round((completadas / esperadas) * 100) : 0;
  return { mesISO, completadas, esperadas, porcentaje, comidasPorDia };
}

// Pesadas (historial de ciclos ya cerrados + el ciclo abierto actual) que caen dentro del mes
// indicado, con el cambio de peso de la primera a la última pesada de ese periodo. Devuelve null
// si no hay ninguna pesada registrada ese mes — el resumen premium debe saber mostrar que falta
// ese dato, no inventar un cambio de 0.
export function pesoEnMes(pesoTracking, mesISO) {
  const todas = [...((pesoTracking && pesoTracking.historial) || []), ...((pesoTracking && pesoTracking.entradas) || [])]
    .filter((e) => e.fecha.slice(0, 7) === mesISO)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!todas.length) return null;
  const inicio = todas[0].peso;
  const fin = todas[todas.length - 1].peso;
  return { entradas: todas, inicio, fin, delta: Math.round((fin - inicio) * 10) / 10 };
}

// ---------- Cumplimiento de macros (B2, 25-oct-2026) ----------
// Primera versión del resumen de nutrición por macros: de los días del mes en que se marcaron **todas** las
// comidas del reparto, en cuántos se llegó al objetivo de proteína, de carbohidratos y de grasa. Usa las macros
// que guarda cada comida al marcarla desde B1+B3 (`registro.macros`: lo del menú con «Hecha», o lo comido de
// verdad con «Cambié algo»). Por qué así:
// - Un día con alguna comida sin marcar no se puede juzgar (¿no se comió o no se marcó?): no cuenta.
// - Las comidas marcadas antes de B1+B3 (y las migradas, `{ hecha: true }`) no guardan macros: esos días
//   tampoco cuentan, y se dice cuántos son, para que el porcentaje no engañe.
// - «Llegar» es alcanzar al menos el 90 % del objetivo del día (el mismo margen que el «dentro del objetivo»
//   del panel del menú, que marca en verde del 90 al 110 %). Pasarse cuenta como llegar: el resumen dice si
//   se llega, no si se clava. Decisión provisional, a revisar con el usuario.
// La verdura y la fruta quedan para más adelante (la verdura no tiene macros en el menú).
export const UMBRAL_LLEGAR = 0.9;

export function cumplimientoMacrosMes(comidasCompletadas, mesISO, objetivos, comidasDelDia) {
  const tipos = comidasDelDia && comidasDelDia.length ? comidasDelDia : ["Desayuno", "Comida", "Merienda", "Cena"];
  const r = { dias: 0, sinDetalle: 0, incompletos: 0, prot: { llega: 0, pct: null }, carb: { llega: 0, pct: null }, fat: { llega: 0, pct: null } };
  if (!objetivos) return r;
  Object.keys(comidasCompletadas || {}).sort().forEach((fecha) => {
    if (fecha.slice(0, 7) !== mesISO) return;
    const delDia = comidasCompletadas[fecha] || {};
    if (!tipos.every((m) => delDia[m])) { if (Object.values(delDia).some(Boolean)) r.incompletos += 1; return; }
    const registros = tipos.map((m) => delDia[m]);
    if (!registros.every((x) => x && typeof x === "object" && x.macros)) { r.sinDetalle += 1; return; }
    const suma = registros.reduce((acc, x) => ({ prot: acc.prot + (x.macros.prot || 0), carb: acc.carb + (x.macros.carb || 0), fat: acc.fat + (x.macros.fat || 0) }), { prot: 0, carb: 0, fat: 0 });
    r.dias += 1;
    ["prot", "carb", "fat"].forEach((k) => { if (objetivos[k] && suma[k] >= UMBRAL_LLEGAR * objetivos[k]) r[k].llega += 1; });
  });
  if (r.dias) ["prot", "carb", "fat"].forEach((k) => { r[k].pct = Math.round((r[k].llega / r.dias) * 100); });
  return r;
}
