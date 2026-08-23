// ---------- Cálculo de comidas ----------
// Módulo de lógica pura (sin JSX): a partir de una comida del menú (o del menú entero),
// calcula sus componentes con macros ya escalados, los totales, y las listas para
// exportar/imprimir o para la lista de la compra. Depende solo de macros.js.
import { getFood, macrosFor, emptyMacros, addMacros, composedMacros } from "macros";

// Devuelve los componentes de una comida del menú, cada uno con su ingrediente, sus raciones
// y sus macros ya escalados. Es la fuente única de la que tiran el detalle de comida y las
// estadísticas del menú, para que nunca puedan discrepar entre sí.
// `slotKey` identifica cada componente dentro de la comida (así se guardan las raciones por separado).
export function mealComponents(data, meal) {
  if (!data || !meal) return [];
  const byName = (name) => (name ? data.ingredients.find((i) => i.name === name) : null);
  const raciones = meal.raciones || {};
  const rowsFor = [];

  // Fila de grasa de ajuste fino, compartida entre el plato cerrado y la comida normal.
  // meal.grasaExtra es el mecanismo actual (elige entre tus opciones de la pestaña "Grasas");
  // meal.aceiteExtra se mantiene por compatibilidad con menús generados antes de que existiera esa pestaña.
  function grasaExtraRow() {
    if (meal.grasaExtra) {
      return {
        slotKey: "grasaExtra",
        label: `${meal.grasaExtra.nombre} (ajuste fino)`,
        ingredient: { foodId: meal.grasaExtra.foodId, gramos: meal.grasaExtra.gramos },
      };
    }
    if (meal.aceiteExtra) {
      const aove = data.foods && data.foods.find((f) => f.id === "f_aove");
      return {
        slotKey: "aceiteExtra",
        label: "Aceite de oliva (ajuste fino)",
        ingredient: aove ? { foodId: aove.id, gramos: meal.aceiteExtra } : null,
      };
    }
    return null;
  }

  if (meal.closedDish) {
    rowsFor.push({ slotKey: "closedDish", label: meal.closedDish, ingredient: byName(meal.closedDish) });
    const gRow = grasaExtraRow();
    if (gRow) rowsFor.push(gRow);
  } else if (meal.item) {
    rowsFor.push({ slotKey: "item", label: meal.item, ingredient: byName(meal.item) });
  } else {
    if (meal.protein) rowsFor.push({ slotKey: "protein", label: meal.protein, ingredient: byName(meal.protein) });
    if (meal.carbo) {
      rowsFor.push({
        slotKey: "carbo",
        label: meal.carbo,
        ingredient: byName(meal.carbo),
        // En los días de garbanzos el carbo va al 50%, así que su ración base es la mitad.
        baseFactor: meal.garbanzos ? 0.5 : 1,
        note: meal.garbanzos ? "mitad" : null,
      });
    }
    if (meal.garbanzos) {
      const g = data.ingredients.find((i) => i.category === "especial");
      if (g) rowsFor.push({ slotKey: "garbanzos", label: g.name, ingredient: g, baseFactor: 0.5, note: "mitad" });
    }
    // La verdura se muestra (para saber qué toca), pero sin ingrediente vinculado a propósito:
    // no cuenta en el cálculo de raciones ni en los totales de macros/kcal de la comida.
    if (meal.verdura) rowsFor.push({ slotKey: "verdura", label: meal.verdura, ingredient: null, sinCalculo: true });

    const gRow = grasaExtraRow();
    if (gRow) rowsFor.push(gRow);
  }

  return rowsFor.map((r) => {
    const base = r.baseFactor === undefined ? 1 : r.baseFactor;
    const userRaciones = raciones[r.slotKey] === undefined ? 1 : Number(raciones[r.slotKey]);
    const efectivas = base * userRaciones;
    const isComposedSlot = r.slotKey === "closedDish" || r.slotKey === "item";
    return {
      ...r,
      raciones: userRaciones,
      macros: r.ingredient ? (isComposedSlot ? composedMacros(data, r.ingredient, efectivas) : macrosFor(data, r.ingredient, efectivas)) : null,
    };
  });
}

// Suma los macros de todos los componentes de una comida.
export function mealTotals(data, meal) {
  return mealComponents(data, meal).reduce((acc, c) => addMacros(acc, c.macros), emptyMacros());
}

// Suma los macros de todas las comidas de un día concreto.
export function dayTotals(data, menu, week, day) {
  if (!menu) return emptyMacros();
  return menu
    .filter((s) => s.week === week && s.day === day)
    .reduce((acc, meal) => addMacros(acc, mealTotals(data, meal)), emptyMacros());
}

// Para exportar/imprimir: convierte una comida en una lista de "nombre (Xg)", pensada para
// cocinar con ella delante. A diferencia de mealComponents, aquí los platos compuestos
// (desayuno/merienda/plato cerrado hechos de varios ingredientes) se abren en sus componentes
// por separado, en vez de mostrar solo el total — es lo que hace falta para saber cuánto pesar
// de cada cosa. Respeta las raciones que el usuario haya ajustado para esa comida.
export function mealExportParts(data, meal) {
  const components = mealComponents(data, meal);
  const parts = [];
  components.forEach((c) => {
    const ing = c.ingredient;
    if (ing && Array.isArray(ing.composicion) && ing.composicion.length) {
      ing.composicion.forEach((item) => {
        const food = getFood(data, item.foodId);
        const gramos = Math.round(Number(item.gramos) * c.raciones);
        parts.push(food ? `${food.name} (${gramos}g)` : `${item.foodId} (${gramos}g)`);
      });
    } else if (c.macros) {
      const suffix = c.note ? ` ${c.note}` : "";
      parts.push(`${c.label}${suffix} (${Math.round(c.macros.gramos)}g)`);
    } else {
      parts.push(c.label);
    }
  });
  return parts;
}

// Agrega, para todo un menú generado (o solo una semana de él), cuántos gramos hacen falta de cada
// alimento — la lista de la compra. Igual que mealExportParts, los platos compuestos (desayuno,
// merienda, cerrados) se abren en sus alimentos reales, porque eso es lo que se compra; se agrupan
// por la categoría del ingrediente al que pertenecen (así el pan/carne/queso de una hamburguesa
// completa caen todos bajo "Platos cerrados", en vez de repartirse por categorías que no tienen).
export function calcularListaCompra(data, menu, weekFilter) {
  if (!menu) return [];
  const slots = menu.filter((s) => weekFilter === "todo" || s.week === weekFilter);
  const totales = {};

  function addItem(key, nombre, categoria, gramos) {
    if (!gramos) return;
    if (!totales[key]) totales[key] = { key, nombre, categoria, gramos: 0 };
    totales[key].gramos += gramos;
  }

  slots.forEach((meal) => {
    mealComponents(data, meal).forEach((c) => {
      const ing = c.ingredient;
      if (!ing) return;
      const categoria = ing.category || (c.slotKey === "grasaExtra" || c.slotKey === "aceiteExtra" ? "grasa" : "especial");
      if (Array.isArray(ing.composicion) && ing.composicion.length) {
        ing.composicion.forEach((item) => {
          const food = getFood(data, item.foodId);
          const gramos = Number(item.gramos) * c.raciones;
          addItem(item.foodId, food ? food.name : item.foodId, categoria, gramos);
        });
      } else if (c.macros) {
        const food = getFood(data, ing.foodId);
        addItem(ing.id || ing.foodId || c.label, food ? food.name : c.label, categoria, c.macros.gramos);
      }
    });
  });

  return Object.values(totales).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
