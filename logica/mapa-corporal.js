// ---------- Mapa corporal (26-oct-2026) ----------
// Módulo de lógica pura (sin JSX, sin React) del mapa corporal: qué grupo de FoodDraft es cada trazo del
// dibujo y de qué verde se pinta cada grupo. El dibujo (los trazados) vive en ui/comun/mapa-trazados.js,
// con su aviso de licencia MIT, y el componente en ui/comun/mapa-corporal.jsx. Decidido en
// local/ideas/esteticas/registro.md («DECISIONES FINALES», bloque CUERPO, punto 6; maqueta v3-07, camino 1).
//
// Los trazados de react-native-body-highlighter vienen con sus propios nombres de músculo (en inglés,
// «slugs»). Cada uno cae en uno de los 14 grupos de la biblioteca de ejercicios (GRUPOS_MUSCULARES de
// logica/entreno-ejercicios.js sin el cardio). Dos decisiones de la tabla de la v3-07:
// - oblicuos y abdominales son el mismo grupo, «abdomen» (la biblioteca no los separa);
// - «upper-back» (el dorsal ancho del dibujo) son los «dorsales», y el trapecio es la «espalda alta».
// Los trazos que no son músculo (cabeza, pelo, manos, pies, rodillas, tobillos, cuello, tibiales) no tienen
// grupo: se pintan del color de la piel.
export const SLUG_A_GRUPO = {
  chest: "pecho",
  "upper-back": "dorsales",
  trapezius: "espalda_alta",
  deltoids: "hombros",
  biceps: "biceps",
  triceps: "triceps",
  forearm: "antebrazos",
  abs: "abdomen",
  obliques: "abdomen",
  "lower-back": "lumbar",
  gluteal: "gluteos",
  quadriceps: "cuadriceps",
  hamstring: "isquios",
  calves: "gemelos",
  adductors: "aductores",
};

export const GRUPOS_MAPA = [
  "pecho", "dorsales", "espalda_alta", "hombros", "biceps", "triceps", "antebrazos", "abdomen", "lumbar",
  "gluteos", "cuadriceps", "isquios", "gemelos", "aductores",
];

// La escala de cinco verdes de la v3-07 (series de la semana): 0 · 1-3 · 4-6 · 7-9 · 10 o más. Los colores
// están aquí, y no como variables de Shell, porque son una escala propia del mapa (como el tema de la nevera,
// ui/despensa/tema.js): el gris claro es «sin dato», como en el resto de gráficas.
export const ESCALA_MAPA = [
  { desde: 0, hasta: 0, color: "#e6e2d6" },
  { desde: 1, hasta: 3, color: "#d4e6d8" },
  { desde: 4, hasta: 6, color: "#9fc8ad" },
  { desde: 7, hasta: 9, color: "#5c9e78" },
  { desde: 10, hasta: Infinity, color: "#2f6b4f" },
];

// Nivel de la escala (0-4) de un número de series. Se redondea antes (0,5 series de un secundario cuenta
// como 1, para que un músculo trabajado nunca se quede gris).
export function nivelSeries(n) {
  const x = Number(n) || 0;
  if (x <= 0) return 0;
  const r = Math.max(1, Math.round(x));
  return r <= 3 ? 1 : r <= 6 ? 2 : r <= 9 ? 3 : 4;
}
export const colorSeries = (n) => ESCALA_MAPA[nivelSeries(n)].color;

// Hombre o mujer según el sexo del perfil; sin sexo, hombre (decisión del 26-oct).
export function generoMapa(perfil) {
  return perfil && perfil.sexo === "mujer" ? "mujer" : "hombre";
}

// Series previstas de una rutina por músculo, con la misma regla que el resto del módulo de entreno: cada
// serie (salvo las de calentamiento) cuenta 1 para el músculo principal y 0,5 para cada secundario. El
// cardio no está en el mapa. `ejercicioDe(id)` → { musculo, secundarios }.
export function seriesDeRutina(rutina, ejercicioDe) {
  const total = {};
  const sumar = (m, n) => { if (m && GRUPOS_MAPA.includes(m)) total[m] = (total[m] || 0) + n; };
  ((rutina && rutina.ejercicios) || []).forEach((re) => {
    const e = ejercicioDe(re.ejercicioId);
    if (!e) return;
    const n = (re.series && re.series.length ? re.series : [{ tipo: "normal" }]).filter((s) => (s.tipo || "normal") !== "calentamiento").length;
    if (!n) return;
    sumar(e.musculo, n);
    (e.secundarios || []).forEach((m) => sumar(m, n * 0.5));
  });
  return total;
}

// Lo que pinta la ficha de un ejercicio: el principal en el verde más oscuro y los secundarios en el del
// medio (no son series: es «qué trabaja», así que se usan dos niveles fijos de la escala).
export function valoresDeEjercicio(e) {
  const v = {};
  if (!e) return v;
  (e.secundarios || []).forEach((m) => { if (GRUPOS_MAPA.includes(m)) v[m] = 5; });
  if (GRUPOS_MAPA.includes(e.musculo)) v[e.musculo] = 10;
  return v;
}
