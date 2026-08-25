// ---------- Umbrales de salud pública (OMS): sal, azúcares y fibra ----------
// Módulo de lógica pura (sin JSX): a diferencia de objetivos.js (que calcula metas a partir de TU
// perfil), este módulo compara tu media semanal contra referencias de población general publicadas
// por la OMS — no se personalizan por perfil, salvo el umbral de azúcar, que si tienes un objetivo
// de kcal calculado se ajusta a él en vez de usar la dieta de referencia de 2000 kcal del estudio.
//
// Fuente: resumen elaborado a partir de la ficha de datos de la OMS "Alimentación saludable"
// (26 de enero de 2026) — ver Estudios de apoyo de la aplicación/Sal, azucar y fibra/.
// Cifras citadas tal cual en ese resumen:
//   - Fibra: adultos, al menos 25 g/día (mínimo, sin techo indicado).
//   - Azúcares libres: no superar el 10% de las kcal diarias (~50 g/12 cucharillas a 2000 kcal);
//     reducir al 5% o menos aporta beneficios adicionales.
//   - Sal: menos de 5 g/día (menos de 2 g de sodio).
import { DAYS } from "comun";
import { dayTotals, mealComponents } from "comida-calculo";
import { getFood } from "macros";

const UMBRAL_FIBRA_MIN_G = 25;
const UMBRAL_SAL_MAX_G = 5;
const AZUCAR_PCT_OPTIMO = 0.05;
const AZUCAR_PCT_MAXIMO = 0.10;
const KCAL_REFERENCIA_OMS = 2000; // dieta de referencia del propio estudio, si no hay objetivo de perfil

// Ids de los alimentos realmente usados en una semana del menú (desglosando platos compuestos en
// sus ingredientes reales) — mismo recorrido que ya usa calcularListaCompra.
function alimentosUsadosEnSemana(data, menu, week) {
  const ids = new Set();
  DAYS.forEach((day) => {
    menu
      .filter((s) => s.week === week && s.day === day)
      .forEach((meal) => {
        mealComponents(data, meal).forEach((c) => {
          const ing = c.ingredient;
          if (!ing) return;
          if (Array.isArray(ing.composicion) && ing.composicion.length) {
            ing.composicion.forEach((item) => { if (item.foodId) ids.add(item.foodId); });
          } else if (ing.foodId) {
            ids.add(ing.foodId);
          }
        });
      });
  });
  return ids;
}

// Qué alimentos de los usados esta semana no tienen sal/azúcares/fibra rellenados en el catálogo —
// para avisar de que el total podría estar por debajo del real, en vez de sumar en silencio como si
// faltase fuera cero.
function alimentosSinDato(data, menu, week) {
  const ids = alimentosUsadosEnSemana(data, menu, week);
  const faltantes = { sal: [], azucares: [], fibra: [] };
  ids.forEach((id) => {
    const food = getFood(data, id);
    if (!food) return;
    if (food.sal === undefined) faltantes.sal.push(food.name);
    if (food.azucares === undefined) faltantes.azucares.push(food.name);
    if (food.fibra === undefined) faltantes.fibra.push(food.name);
  });
  return faltantes;
}

// Media diaria de sal/azúcares/fibra de una semana del menú, con su nivel según los umbrales de
// arriba. `kcalObjetivoDiario` es opcional — si no se pasa, el umbral de azúcar usa la referencia
// de 2000 kcal del propio estudio.
export function resumenNutrientesSemana(data, menu, week, kcalObjetivoDiario) {
  if (!menu) return null;
  const diasConComida = DAYS.filter((day) => menu.some((s) => s.week === week && s.day === day));
  if (!diasConComida.length) return null;

  const totales = diasConComida.reduce(
    (acc, day) => {
      const t = dayTotals(data, menu, week, day);
      return { sal: acc.sal + (t.sal || 0), azucares: acc.azucares + (t.azucares || 0), fibra: acc.fibra + (t.fibra || 0) };
    },
    { sal: 0, azucares: 0, fibra: 0 }
  );

  const n = diasConComida.length;
  const mediaSal = totales.sal / n;
  const mediaAzucares = totales.azucares / n;
  const mediaFibra = totales.fibra / n;

  const kcalRef = kcalObjetivoDiario || KCAL_REFERENCIA_OMS;
  const azucarOptimoG = (kcalRef * AZUCAR_PCT_OPTIMO) / 4;
  const azucarMaximoG = (kcalRef * AZUCAR_PCT_MAXIMO) / 4;

  return {
    dias: n,
    sal: { media: mediaSal, nivel: mediaSal < UMBRAL_SAL_MAX_G ? "optimo" : "demasiado", umbral: UMBRAL_SAL_MAX_G },
    fibra: { media: mediaFibra, nivel: mediaFibra >= UMBRAL_FIBRA_MIN_G ? "optimo" : "insuficiente", umbral: UMBRAL_FIBRA_MIN_G },
    azucares: {
      media: mediaAzucares,
      nivel: mediaAzucares <= azucarOptimoG ? "optimo" : mediaAzucares <= azucarMaximoG ? "aceptable" : "demasiado",
      umbralOptimo: azucarOptimoG,
      umbralMaximo: azucarMaximoG,
      kcalUsada: kcalRef,
      kcalPersonalizada: !!kcalObjetivoDiario,
    },
    faltanDatos: alimentosSinDato(data, menu, week),
  };
}
