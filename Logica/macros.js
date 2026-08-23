// ---------- Cálculo de macros ----------
// Módulo de lógica pura (sin JSX): busca alimentos en el catálogo y calcula sus macros
// escalados por gramos/raciones. No depende de React ni de ninguna otra parte de la app.

export function getFood(data, foodId) {
  if (!foodId || !data || !Array.isArray(data.foods)) return null;
  return data.foods.find((f) => f.id === foodId) || null;
}

// Devuelve los macros de un ingrediente para una cantidad concreta de raciones.
// Los valores del catálogo son por 100 g, así que se escalan por (gramos × raciones) / 100.
export function macrosFor(data, ingredient, raciones = 1) {
  const food = getFood(data, ingredient && ingredient.foodId);
  if (!food || !ingredient.gramos) return null;
  const factor = (Number(ingredient.gramos) * Number(raciones || 1)) / 100;
  return {
    kcal: food.kcal * factor,
    prot: food.prot * factor,
    fat: food.fat * factor,
    carb: food.carb * factor,
    gramos: Number(ingredient.gramos) * Number(raciones || 1),
    foodName: food.name,
  };
}

export function emptyMacros() {
  return { kcal: 0, prot: 0, fat: 0, carb: 0 };
}

export function addMacros(a, b) {
  if (!b) return a;
  return { kcal: a.kcal + b.kcal, prot: a.prot + b.prot, fat: a.fat + b.fat, carb: a.carb + b.carb };
}

// Macros de un ingrediente "compuesto" (una receta hecha de varios alimentos, cada uno con sus gramos),
// como un desayuno, una merienda o un plato cerrado. Si el ingrediente no tiene composición
// (formato antiguo: un único alimento enlazado directamente), cae de forma transparente en macrosFor.
export function composedMacros(data, ingredient, raciones = 1) {
  if (ingredient && Array.isArray(ingredient.composicion) && ingredient.composicion.length) {
    let acc = { kcal: 0, prot: 0, fat: 0, carb: 0, gramos: 0 };
    let any = false;
    ingredient.composicion.forEach((item) => {
      const m = macrosFor(data, item, raciones);
      if (m) {
        acc = { kcal: acc.kcal + m.kcal, prot: acc.prot + m.prot, fat: acc.fat + m.fat, carb: acc.carb + m.carb, gramos: acc.gramos + m.gramos };
        any = true;
      }
    });
    return any ? acc : null;
  }
  return macrosFor(data, ingredient, raciones);
}

export const fmt = (n) => (n === null || n === undefined ? "—" : Math.round(n * 10) / 10);
