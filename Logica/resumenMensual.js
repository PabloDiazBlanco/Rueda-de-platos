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
  const comidasPorDia = (data.perfil && data.perfil.comidasPorDia) || 4;
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
