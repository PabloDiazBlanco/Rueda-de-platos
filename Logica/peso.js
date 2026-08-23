// ---------- Seguimiento de peso ----------
// Módulo de lógica pura (sin JSX): ciclos de pesadas, detección de cambios atípicos,
// regresión lineal sobre la tendencia y evaluación contra las bandas de referencia.
// No depende de ninguna otra parte de la app.

// Días de la semana sugeridos para pesarse, repartidos para no quedar pegados (evita pesarse varias
// veces seguidas justo después del fin de semana). 0=domingo...6=sábado, como Date.getDay().
export const DIAS_SEMANA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_SUGERIDOS_PESO = { 2: [1, 4], 3: [1, 3, 5] };
export const PESO_FRECUENCIAS = [2, 3];
export const PESO_DURACIONES = [2, 3, 4];

// Si una pesada nueva se aleja más de esto (en %) de la última pesada normal, se pregunta el motivo
// antes de guardarla, para no contaminar la tendencia del ciclo con un pico puntual sin explicación.
const UMBRAL_CAMBIO_RADICAL_PCT = 1.5;

export const MOTIVOS_CAMBIO_PESO = [
  "Enfermedad", "Viaje", "Regla / retención de líquidos", "Comida muy copiosa o salada", "Otro",
];

// Bandas de referencia (Helms et al. 2014 para déficit; literatura de "bulking" citada en Iraki et al.
// 2019 para superávit): por debajo del mínimo, el ritmo no tiene estímulo suficiente; por encima del
// máximo, es un ritmo agresivo con riesgo de perder músculo (déficit) o ganar sobre todo grasa (superávit).
const BANDAS_TENDENCIA_DEFICIT = { ineficaz: 0.25, aviso: 1.0, accion: 1.5 }; // %/semana
const BANDAS_TENDENCIA_SUPERAVIT = { ineficaz: 0.5, aviso: 1.5, accion: 2.0 }; // %/mes

export function defaultPesoTracking() {
  return {
    vecesSemana: 3,
    duracionSemanas: 3,
    cicloInicio: null,
    entradas: [],
    // Registro permanente de todas las pesadas de ciclos ya cerrados — nunca se borra. Se alimenta
    // solo al cerrar un ciclo, así lo que está abierto ahora mismo sigue oculto hasta su revisión.
    historial: [],
    recordatorioDescartadoFecha: null,
    historialCiclos: [],
  };
}

// Rangos para ver la progresión a largo plazo sobre el historial permanente.
export const RANGOS_PROGRESION = [
  { key: "3m", label: "3 meses", dias: 90 },
  { key: "1a", label: "1 año", dias: 365 },
  { key: "todo", label: "Histórico completo", dias: Infinity },
];

export function fechaISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function formatFechaCorta(fechaStr) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

// Descarga una copia de todos los datos guardados (perfil, ingredientes, seguimiento de peso...)
// como un archivo .json — para que nada quede atrapado solo en Firestore. Es una acción puramente
// del navegador (Blob + enlace temporal), no toca ni envía nada a ningún sitio.
export function descargarDatosJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rueda-de-platos-datos-${fechaISO(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function esDiaSugeridoPeso(vecesSemana, fecha = new Date()) {
  const dias = DIAS_SUGERIDOS_PESO[vecesSemana] || DIAS_SUGERIDOS_PESO[3];
  return dias.includes(fecha.getDay());
}

// Compara contra la última pesada "normal" (no atípica) que no sea de hoy — así, si ya te habías
// pesado hoy y corriges el número, no se compara consigo misma.
export function esCambioRadical(pesoNuevo, entradas, hoyISO) {
  const previas = entradas.filter((e) => !e.atipico && e.fecha !== hoyISO);
  if (!previas.length) return false;
  const referencia = previas[previas.length - 1].peso;
  if (!referencia) return false;
  return (Math.abs(pesoNuevo - referencia) / referencia) * 100 >= UMBRAL_CAMBIO_RADICAL_PCT;
}

// Regresión lineal simple (mínimos cuadrados). x = días desde el inicio del ciclo, y = peso.
export function regresionLinealSimple(puntos) {
  const n = puntos.length;
  const sumX = puntos.reduce((s, p) => s + p.x, 0);
  const sumY = puntos.reduce((s, p) => s + p.y, 0);
  const sumXY = puntos.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = puntos.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { pendiente: 0, intercepto: sumY / n };
  const pendiente = (n * sumXY - sumX * sumY) / denom;
  const intercepto = (sumY - pendiente * sumX) / n;
  return { pendiente, intercepto };
}

// Calcula la tendencia real del ciclo a partir de las pesadas no atípicas, con al menos 2 puntos.
// El día 0 es la fecha de la primera pesada del ciclo (aunque esa fuera atípica), para que el eje
// de tiempo del gráfico y de la regresión sea siempre el mismo.
export function calcularTendenciaPeso(entradas) {
  if (!entradas.length) return null;
  const inicio = new Date(entradas[0].fecha + "T00:00:00");
  const puntos = entradas
    .filter((e) => !e.atipico)
    .map((e) => ({
      x: Math.round((new Date(e.fecha + "T00:00:00") - inicio) / 86400000),
      y: e.peso,
    }));
  if (puntos.length < 2) return null;
  const { pendiente, intercepto } = regresionLinealSimple(puntos);
  const pesoMedio = puntos.reduce((s, p) => s + p.y, 0) / puntos.length;
  const pctSemana = pesoMedio ? ((pendiente * 7) / pesoMedio) * 100 : 0;
  return { pctSemana, pendiente, intercepto, pesoMedio, n: puntos.length };
}

// Traduce la tendencia real a un nivel (según las bandas de arriba) y a una sugerencia de ajuste en
// kcal, en pasos de 100-200 kcal (protocolo de Helms et al. 2014). Solo aplica a volumen/definición:
// en mantenimiento no hay una dirección "esperada" contra la que comparar.
export function evaluarTendencia(pctSemana, objetivo) {
  if (objetivo !== "definicion" && objetivo !== "volumen") return null;
  const magnitudSemana = Math.abs(pctSemana);
  const magnitudMes = magnitudSemana * (30 / 7);

  if (objetivo === "definicion") {
    const b = BANDAS_TENDENCIA_DEFICIT;
    if (pctSemana > 0) {
      return { nivel: "direccion-contraria", sugerenciaKcal: -200,
        mensaje: "El peso está subiendo en una etapa de definición. Puede deberse a algo puntual, pero conviene revisar el déficit." };
    }
    if (magnitudSemana < b.ineficaz) {
      return { nivel: "ineficaz", sugerenciaKcal: -100,
        mensaje: `Estás perdiendo muy poco (${magnitudSemana.toFixed(2)}%/semana) — por debajo del ${b.ineficaz}% que se considera un ritmo con estímulo suficiente.` };
    }
    if (magnitudSemana > b.accion) {
      return { nivel: "accion", sugerenciaKcal: 200,
        mensaje: `Estás perdiendo peso muy rápido (${magnitudSemana.toFixed(2)}%/semana) — por encima del ${b.accion}%, con riesgo de perder masa muscular.` };
    }
    if (magnitudSemana > b.aviso) {
      return { nivel: "aviso", sugerenciaKcal: 100,
        mensaje: `Tu ritmo de pérdida (${magnitudSemana.toFixed(2)}%/semana) está en la zona alta, entre el ${b.aviso}% y el ${b.accion}%.` };
    }
    return { nivel: "optimo", sugerenciaKcal: 0,
      mensaje: `Tu ritmo de pérdida (${magnitudSemana.toFixed(2)}%/semana) está dentro del rango recomendado (${b.ineficaz}%-${b.accion}%).` };
  }

  const b = BANDAS_TENDENCIA_SUPERAVIT;
  if (pctSemana < 0) {
    return { nivel: "direccion-contraria", sugerenciaKcal: 200,
      mensaje: "El peso está bajando en una etapa de volumen. Puede deberse a algo puntual, pero conviene revisar el superávit." };
  }
  if (magnitudMes < b.ineficaz) {
    return { nivel: "ineficaz", sugerenciaKcal: 100,
      mensaje: `Estás ganando muy poco (${magnitudMes.toFixed(2)}%/mes) — por debajo del ${b.ineficaz}% que se considera necesario para progresar.` };
  }
  if (magnitudMes > b.accion) {
    return { nivel: "accion", sugerenciaKcal: -200,
      mensaje: `Estás ganando peso muy rápido (${magnitudMes.toFixed(2)}%/mes) — por encima del ${b.accion}%, con riesgo de que sea sobre todo grasa.` };
  }
  if (magnitudMes > b.aviso) {
    return { nivel: "aviso", sugerenciaKcal: -100,
      mensaje: `Tu ritmo de ganancia (${magnitudMes.toFixed(2)}%/mes) está en la zona alta, entre el ${b.aviso}% y el ${b.accion}%.` };
  }
  return { nivel: "optimo", sugerenciaKcal: 0,
    mensaje: `Tu ritmo de ganancia (${magnitudMes.toFixed(2)}%/mes) está dentro del rango recomendado (${b.ineficaz}%-${b.accion}%).` };
}
