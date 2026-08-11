import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Plus, Trash2, Pencil, X, Check, Utensils, Wheat, Salad, Package, Sparkles, AlertCircle, CalendarDays, Shuffle, Coffee, Cookie, Database, Search, Link2, Download, Layers } from "lucide-react";

// ---------- Datos iniciales (todo lo acordado hasta ahora) ----------

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Base de datos de alimentos (macros por 100 g) ----------
// Ids fijos (no aleatorios) para que las migraciones puedan reconocerlos entre versiones.
// "fuente" indica de dónde sale el dato: etiqueta real de producto o valor estándar contrastado.
const FOODS_SEED = [
  // Proteínas
  { id: "f_pechuga_pollo", name: "Pechuga de pollo (cruda)", kcal: 165, prot: 31, fat: 3.6, carb: 0, fuente: "Estándar" },
  { id: "f_hamb_pollo", name: "Hamburguesa de pollo (Hacendado)", kcal: 144, prot: 17, fat: 7, carb: 3, fuente: "Etiqueta" },
  { id: "f_picada_pollo", name: "Carne picada de pollo (Hacendado)", kcal: 124, prot: 16.6, fat: 5.3, carb: 1, fuente: "Etiqueta" },
  { id: "f_picada_mixta", name: "Carne picada ternera/cerdo", kcal: 163, prot: 17, fat: 9.5, carb: 1, fuente: "Etiqueta (media)" },
  { id: "f_hamb_mixta", name: "Hamburguesa ternera/cerdo (Hacendado)", kcal: 226, prot: 18, fat: 17, carb: 2, fuente: "Etiqueta" },
  { id: "f_salmon", name: "Salmón (crudo)", kcal: 144, prot: 20, fat: 12, carb: 0, fuente: "Estándar" },
  { id: "f_merluza", name: "Merluza / pescada (Hacendado)", kcal: 82, prot: 18, fat: 1.5, carb: 0.5, fuente: "Etiqueta" },
  { id: "f_atun", name: "Atún al natural (escurrido)", kcal: 105, prot: 22.5, fat: 1.2, carb: 0, fuente: "Etiqueta" },
  { id: "f_sardinas", name: "Sardinas en aceite de oliva (escurridas)", kcal: 207, prot: 24, fat: 14, carb: 0, fuente: "Etiqueta" },
  { id: "f_pavo", name: "Pechuga de pavo fiambre (El Pozo)", kcal: 90, prot: 20.3, fat: 1.5, carb: 0, fuente: "Etiqueta" },
  { id: "f_jamon", name: "Jamón curado (Navidul)", kcal: 212, prot: 30, fat: 10, carb: 0.5, fuente: "Etiqueta" },
  { id: "f_lomo", name: "Lomo embuchado (Boadas)", kcal: 203, prot: 35, fat: 7, carb: 0.7, fuente: "Etiqueta" },
  { id: "f_huevo", name: "Huevo entero (crudo)", kcal: 140, prot: 12.7, fat: 9.5, carb: 0.3, fuente: "Etiqueta" },

  // Carbohidratos
  { id: "f_pasta", name: "Pasta / macarrón (cruda, Hacendado)", kcal: 357, prot: 11, fat: 1.5, carb: 70, fuente: "Etiqueta" },
  { id: "f_arroz_basmati", name: "Arroz basmati (crudo, Hacendado)", kcal: 353, prot: 8.06, fat: 1, carb: 78, fuente: "Etiqueta" },
  { id: "f_patata", name: "Patata (cruda)", kcal: 77, prot: 2, fat: 0.1, carb: 17, fuente: "Estándar" },
  { id: "f_gnocchi", name: "Gnocchi (fresco, Ifa Eliges)", kcal: 156, prot: 3, fat: 0.5, carb: 30, fuente: "Etiqueta" },
  { id: "f_garbanzos_cocidos", name: "Garbanzos cocidos (bote)", kcal: 119, prot: 6.5, fat: 2.6, carb: 16, fuente: "Estándar" },
  { id: "f_pan_molde", name: "Pan de molde natural (Hacendado)", kcal: 265, prot: 9.1, fat: 3.5, carb: 48, fuente: "Etiqueta" },
  { id: "f_pan_brioche", name: "Pan hamburguesa brioche (Hacendado)", kcal: 340, prot: 11, fat: 8, carb: 55, fuente: "Etiqueta" },
  { id: "f_cereales_cacao", name: "Cereales de cacao (Hacendado)", kcal: 389, prot: 13, fat: 5, carb: 70, fuente: "Etiqueta" },

  // Verduras y acompañamientos
  { id: "f_ensalada", name: "Ensalada variada (hoja, tomate, etc.)", kcal: 25, prot: 1.5, fat: 0.3, carb: 3.5, fuente: "Estándar" },
  { id: "f_tomate", name: "Tomate (crudo)", kcal: 18, prot: 0.9, fat: 0.2, carb: 3.9, fuente: "Estándar" },
  { id: "f_pimiento", name: "Pimiento (crudo)", kcal: 27, prot: 1, fat: 0.3, carb: 6, fuente: "Estándar" },
  { id: "f_cebolla", name: "Cebolla (cruda)", kcal: 40, prot: 1.1, fat: 0.1, carb: 9.3, fuente: "Estándar" },
  { id: "f_pure_verduras", name: "Puré de verduras", kcal: 55, prot: 1.5, fat: 1.5, carb: 8, fuente: "Estándar" },

  // Lácteos y otros
  { id: "f_queso_cottage", name: "Queso cottage (Ifa Eliges)", kcal: 66, prot: 12, fat: 1.5, carb: 2, fuente: "Etiqueta" },
  { id: "f_yogur_prot", name: "Yogur proteínas (Hacendado)", kcal: 52, prot: 10, fat: 0.3, carb: 3.1, fuente: "Etiqueta" },
  { id: "f_mozzarella", name: "Queso rallado mozzarella (Ifa Eliges)", kcal: 285, prot: 21, fat: 21, carb: 0.8, fuente: "Etiqueta" },
  { id: "f_aove", name: "Aceite de oliva virgen extra", kcal: 900, prot: 0, fat: 100, carb: 0, fuente: "Estándar" },
  { id: "f_cafe_leche", name: "Café con leche (taza 200 ml)", kcal: 33, prot: 1.5, fat: 1.2, carb: 2.5, fuente: "Estándar (por 100 ml)" },

  // Frutos secos y snacks
  { id: "f_anacardos", name: "Anacardos naturales sin sal", kcal: 589, prot: 17.5, fat: 45, carb: 31, fuente: "Estándar" },
  { id: "f_pistachos", name: "Pistachos naturales sin sal", kcal: 580, prot: 19, fat: 48, carb: 21, fuente: "Estándar" },
  { id: "f_cacahuete_polvo", name: "Cacahuete en polvo desgrasado (Eroski)", kcal: 470, prot: 47, fat: 8, carb: 24, fuente: "Etiqueta" },
  { id: "f_choco85", name: "Chocolate negro 85%", kcal: 600, prot: 9, fat: 46, carb: 20, fuente: "Estándar" },
  { id: "f_nachos", name: "Nachos (Ifa Eliges)", kcal: 486, prot: 5.1, fat: 22, carb: 65, fuente: "Etiqueta" },
  { id: "f_guacamole", name: "Guacamole fresco (Ifa Eliges)", kcal: 182, prot: 1.8, fat: 16, carb: 8, fuente: "Etiqueta" },
];

const initialData = () => {
  const salmonId = uid(), merluzaId = uid(), atunId = uid(), sardinasId = uid(), polloId = uid();
  const carnePicadaCerdoId = uid(), hamburguesaTerneraId = uid();
  const carnePicadaPolloId = uid(), hamburguesaPolloId = uid();
  const pastaId = uid(), arrozId = uid(), gnocchiId = uid(), patatasId = uid();
  const ensCompletaId = uid(), ensTomateId = uid(), pimientoId = uid(), pureId = uid();
  const garbanzosId = uid();
  const hamburguesaCompletaId = uid(), nachosId = uid(), huevosRotosId = uid();

  const bloqueCarneRojaId = uid();
  const bloquePolloPicadoId = uid();
  const bloqueCerradosId = uid();

  return {
    foods: FOODS_SEED.map((f) => ({ ...f })),
    rules: [],
    ingredients: [
      // Proteínas — frecuencia fija individual
      { id: salmonId, name: "Salmón", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "semana", active: true, foodId: "f_salmon", gramos: 150 },
      { id: merluzaId, name: "Merluza", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "semana", active: true, foodId: "f_merluza", gramos: 150 },
      { id: atunId, name: "Atún", category: "proteina", ruleType: "frecuencia", freqCantidad: 2, freqPeriodo: "semana", active: true, foodId: "f_atun", gramos: 100 },
      { id: sardinasId, name: "Sardinas", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "ciclo", active: true, foodId: "f_sardinas", gramos: 90 },
      { id: polloId, name: "Pollo (carne)", category: "proteina", ruleType: "base", active: true, foodId: "f_pechuga_pollo", gramos: 150 },

      // Miembros del bloque carne roja
      { id: carnePicadaCerdoId, name: "Carne picada de cerdo/vacuno", category: "proteina", ruleType: "bloque_miembro", blockId: bloqueCarneRojaId, peso: 1, active: true, foodId: "f_picada_mixta", gramos: 150 },
      { id: hamburguesaTerneraId, name: "Hamburguesa de ternera/cerdo", category: "proteina", ruleType: "bloque_miembro", blockId: bloqueCarneRojaId, peso: 1, active: true, foodId: "f_hamb_mixta", gramos: 150 },

      // Miembros del bloque pollo picado / hamburguesa pollo (peso = reparto dentro del bloque)
      { id: carnePicadaPolloId, name: "Carne picada de pollo", category: "proteina", ruleType: "bloque_miembro", blockId: bloquePolloPicadoId, peso: 3, active: true, foodId: "f_picada_pollo", gramos: 150 },
      { id: hamburguesaPolloId, name: "Hamburguesa de pollo", category: "proteina", ruleType: "bloque_miembro", blockId: bloquePolloPicadoId, peso: 1, active: true, foodId: "f_hamb_pollo", gramos: 150 },

      // Carbos — probabilidad
      { id: pastaId, name: "Pasta", category: "carbo", ruleType: "probabilidad", probabilidad: 35, active: true, foodId: "f_pasta", gramos: 80 },
      { id: arrozId, name: "Arroz", category: "carbo", ruleType: "probabilidad", probabilidad: 35, active: true, foodId: "f_arroz_basmati", gramos: 80 },
      { id: gnocchiId, name: "Gnocchi", category: "carbo", ruleType: "probabilidad", probabilidad: 20, active: true, foodId: "f_gnocchi", gramos: 200 },
      { id: patatasId, name: "Patatas", category: "carbo", ruleType: "probabilidad", probabilidad: 10, active: true, foodId: "f_patata", gramos: 250 },

      // Verduras / acompañamientos — probabilidad
      { id: ensCompletaId, name: "Ensalada completa", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true, foodId: "f_ensalada", gramos: 150 },
      { id: ensTomateId, name: "Ensalada de tomate", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true, foodId: "f_tomate", gramos: 150 },
      { id: pimientoId, name: "Pimiento y cebolla sofritos", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true, foodId: "f_pimiento", gramos: 150 },
      { id: pureId, name: "Purés variados", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true, foodId: "f_pure_verduras", gramos: 200 },

      // Especial — garbanzos (ahora 2x/semana, garantizado una vez por semana como mínimo, ver motor)
      { id: garbanzosId, name: "Garbanzos", category: "especial", ruleType: "frecuencia", freqCantidad: 2, freqPeriodo: "semana", active: true, foodId: "f_garbanzos_cocidos", gramos: 120 },

      // Miembros del bloque platos cerrados
      { id: hamburguesaCompletaId, name: "Hamburguesa completa con pan", category: "cerrado", ruleType: "bloque_miembro", blockId: bloqueCerradosId, probabilidad: 33, active: true },
      { id: nachosId, name: "Nachos con carne, guacamole y queso", category: "cerrado", ruleType: "bloque_miembro", blockId: bloqueCerradosId, probabilidad: 33, active: true },
      { id: huevosRotosId, name: "Huevos rotos", category: "cerrado", ruleType: "bloque_miembro", blockId: bloqueCerradosId, probabilidad: 34, active: true },
    ],
    blocks: [
      {
        id: bloqueCarneRojaId,
        name: "Carne roja (picada / hamburguesa)",
        category: "proteina",
        cicloFrecuencia: 1,
        distribucion: "Se sortea al 50% cuál de los dos miembros aparece ese día.",
      },
      {
        id: bloquePolloPicadoId,
        name: "Pollo picado / hamburguesa de pollo",
        category: "proteina",
        cicloFrecuencia: 4,
        distribucion: "Cada ciclo, una semana (al azar) lleva 2x carne picada de pollo, y la otra semana lleva 1x carne picada + 1x hamburguesa de pollo.",
        weeklyPattern: [{ counts: [2, 0] }, { counts: [1, 1] }],
      },
      {
        id: bloqueCerradosId,
        name: "Platos cerrados",
        category: "cerrado",
        cicloFrecuencia: 1,
        distribucion: "Ocupa la comida entera (sin carbo ni verdura). Se sortea cuál de los platos toca por probabilidad.",
      },
    ],
  };
};

const CATEGORY_META = {
  proteina: { label: "Proteínas", icon: Utensils, color: "var(--green)", bg: "var(--green-soft)" },
  carbo: { label: "Carbohidratos", icon: Wheat, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
  verdura: { label: "Verduras", icon: Salad, color: "var(--green)", bg: "var(--green-soft)" },
  desayuno: { label: "Desayuno", icon: Coffee, color: "var(--coffee)", bg: "var(--coffee-soft)" },
  merienda: { label: "Merienda", icon: Cookie, color: "var(--berry)", bg: "var(--berry-soft)" },
  cerrado: { label: "Platos cerrados", icon: Package, color: "var(--rust)", bg: "var(--rust-soft)" },
  especial: { label: "Especiales", icon: Sparkles, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
};

const STORAGE_KEY = "rueda-de-platos:data-v1";
const MENU_STORAGE_KEY = "rueda-de-platos:menu-v1";
const HISTORY_STORAGE_KEY = "rueda-de-platos:history-v1";
const HISTORY_MAX = 8;
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Parchea datos ya guardados que se crearon con una versión anterior del código,
// para que se beneficien de mejoras estructurales sin perder tus ediciones ni tener que rehacer nada a mano.
function migrateData(rawData) {
  let changed = false;
  const data = {
    ...rawData,
    blocks: (rawData.blocks || []).map((b) => ({ ...b })),
    ingredients: (rawData.ingredients || []).map((i) => ({ ...i })),
  };

  const polloBlock = data.blocks.find((b) => b.name === "Pollo picado / hamburguesa de pollo");
  if (polloBlock && !polloBlock.weeklyPattern) {
    polloBlock.weeklyPattern = [{ counts: [2, 0] }, { counts: [1, 1] }];
    polloBlock.distribucion = "Cada ciclo, una semana (al azar) lleva 2x carne picada de pollo, y la otra semana lleva 1x carne picada + 1x hamburguesa de pollo.";
    changed = true;
  }

  // Base de datos de alimentos: se añade si no existía, y se completan los alimentos nuevos
  // del catálogo sin pisar los que el usuario haya editado o creado por su cuenta.
  if (!Array.isArray(data.foods)) {
    data.foods = FOODS_SEED.map((f) => ({ ...f }));
    changed = true;
  } else {
    const existingIds = new Set(data.foods.map((f) => f.id));
    const missing = FOODS_SEED.filter((f) => !existingIds.has(f.id));
    if (missing.length) {
      data.foods = [...data.foods, ...missing.map((f) => ({ ...f }))];
      changed = true;
    }
  }

  // Vínculo automático por nombre para ingredientes creados antes de existir la base de datos.
  const AUTO_LINK = {
    "Salmón": ["f_salmon", 150], "Merluza": ["f_merluza", 150], "Atún": ["f_atun", 100],
    "Sardinas": ["f_sardinas", 90], "Pollo (carne)": ["f_pechuga_pollo", 150],
    "Carne picada de cerdo/vacuno": ["f_picada_mixta", 150], "Hamburguesa de ternera/cerdo": ["f_hamb_mixta", 150],
    "Carne picada de pollo": ["f_picada_pollo", 150], "Hamburguesa de pollo": ["f_hamb_pollo", 150],
    "Pasta": ["f_pasta", 80], "Arroz": ["f_arroz_basmati", 80], "Gnocchi": ["f_gnocchi", 200], "Patatas": ["f_patata", 250],
    "Ensalada completa": ["f_ensalada", 150], "Ensalada de tomate": ["f_tomate", 150],
    "Pimiento y cebolla sofritos": ["f_pimiento", 150], "Purés variados": ["f_pure_verduras", 200],
    "Garbanzos": ["f_garbanzos_cocidos", 120],
  };
  data.ingredients.forEach((ing) => {
    if (!ing.foodId && AUTO_LINK[ing.name]) {
      const [foodId, gramos] = AUTO_LINK[ing.name];
      ing.foodId = foodId;
      ing.gramos = gramos;
      changed = true;
    }
  });

  if (!Array.isArray(data.rules)) {
    data.rules = [];
    changed = true;
  }

  return { data, changed };
}

// ---------- Cálculo de macros ----------

function getFood(data, foodId) {
  if (!foodId || !data || !Array.isArray(data.foods)) return null;
  return data.foods.find((f) => f.id === foodId) || null;
}

// Devuelve los macros de un ingrediente para una cantidad concreta de raciones.
// Los valores del catálogo son por 100 g, así que se escalan por (gramos × raciones) / 100.
function macrosFor(data, ingredient, raciones = 1) {
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

function emptyMacros() {
  return { kcal: 0, prot: 0, fat: 0, carb: 0 };
}

function addMacros(a, b) {
  if (!b) return a;
  return { kcal: a.kcal + b.kcal, prot: a.prot + b.prot, fat: a.fat + b.fat, carb: a.carb + b.carb };
}

// Macros de un ingrediente "compuesto" (una receta hecha de varios alimentos, cada uno con sus gramos),
// como un desayuno, una merienda o un plato cerrado. Si el ingrediente no tiene composición
// (formato antiguo: un único alimento enlazado directamente), cae de forma transparente en macrosFor.
function composedMacros(data, ingredient, raciones = 1) {
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

const fmt = (n) => (n === null || n === undefined ? "—" : Math.round(n * 10) / 10);

// Devuelve los componentes de una comida del menú, cada uno con su ingrediente, sus raciones
// y sus macros ya escalados. Es la fuente única de la que tiran el detalle de comida y las
// estadísticas del menú, para que nunca puedan discrepar entre sí.
// `slotKey` identifica cada componente dentro de la comida (así se guardan las raciones por separado).
function mealComponents(data, meal) {
  if (!data || !meal) return [];
  const byName = (name) => (name ? data.ingredients.find((i) => i.name === name) : null);
  const raciones = meal.raciones || {};
  const rowsFor = [];

  if (meal.closedDish) {
    rowsFor.push({ slotKey: "closedDish", label: meal.closedDish, ingredient: byName(meal.closedDish) });
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
    if (meal.verdura) rowsFor.push({ slotKey: "verdura", label: meal.verdura, ingredient: byName(meal.verdura) });
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
function mealTotals(data, meal) {
  return mealComponents(data, meal).reduce((acc, c) => addMacros(acc, c.macros), emptyMacros());
}

// Suma los macros de todas las comidas de un día concreto.
function dayTotals(data, menu, week, day) {
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
function mealExportParts(data, meal) {
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

// ---------- Motor de generación del menú (paso 3) ----------

function weightedPick(items, weightKey) {
  const total = items.reduce((s, i) => s + (Number(i[weightKey]) || 0), 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (const it of items) {
    r -= Number(it[weightKey]) || 0;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// Reparte "totalSlots" huecos entre miembros según su peso relativo (método del resto mayor)
function allocateCounts(members, weightKey, totalSlots) {
  const totalWeight = members.reduce((s, m) => s + (Number(m[weightKey]) || 1), 0) || 1;
  const raw = members.map((m) => ((Number(m[weightKey]) || 1) / totalWeight) * totalSlots);
  const floors = raw.map(Math.floor);
  let allocated = floors.reduce((a, b) => a + b, 0);
  let remainder = totalSlots - allocated;
  const fracOrder = raw.map((r, i) => ({ i, frac: r - floors[i] })).sort((a, b) => b.frac - a.frac);
  const counts = [...floors];
  for (let k = 0; k < remainder; k++) counts[fracOrder[k % fracOrder.length].i]++;
  return members.map((m, i) => ({ member: m, count: counts[i] }));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Reglas de combinación (afinidad entre alimentos concretos) ----------
// Cada regla: { id, itemIds: [id1, id2] o [id1, id2, id3], level: "nula"|"baja"|"alta"|"maxima" }
// Una regla solo se evalúa cuando TODOS sus elementos salvo el que se está eligiendo ya
// están decididos en esa comida — así una regla de 3 (p.ej. Salmón+Arroz+Ensalada) solo
// entra en juego al elegir la verdura, cuando proteína y carbo ya se conocen.
const RULE_LEVELS = {
  nula: { label: "Nula (nunca)", mult: 0 },
  baja: { label: "Baja", mult: 0.25 },
  alta: { label: "Alta", mult: 4 },
  maxima: { label: "Máxima (forzada)", mult: 1, forced: true },
};

// Para un candidato concreto, mira qué reglas ya evaluables lo afectan y devuelve
// el multiplicador combinado de peso, y si alguna es "máxima" (fuerza ese candidato si es posible).
function ruleModifier(rules, decidedIds, candidateId) {
  let mult = 1;
  let forced = false;
  (rules || []).forEach((rule) => {
    if (!rule.itemIds.includes(candidateId)) return;
    const others = rule.itemIds.filter((id) => id !== candidateId);
    if (!others.every((id) => decidedIds.includes(id))) return; // regla aún no evaluable
    const meta = RULE_LEVELS[rule.level];
    if (!meta) return;
    if (meta.forced) forced = true;
    else mult *= meta.mult;
  });
  return { mult, forced };
}

// Elige UN candidato (carbo o verdura) respetando las reglas ya evaluables.
// Si las reglas dejan la comida sin ninguna opción válida, se relajan como último recurso
// para no romper la generación (en vez de bloquearse sin poder elegir nada).
function pickWithRules(candidates, weightKey, rules, decidedIds) {
  const evaluated = candidates.map((c) => ({ item: c, ...ruleModifier(rules, decidedIds, c.id) }));
  let pool = evaluated.filter((e) => e.forced);
  if (!pool.length) pool = evaluated.filter((e) => e.mult > 0);
  if (!pool.length) pool = evaluated; // último recurso: ignorar las reglas
  const weightOf = (e) => (e.item[weightKey] || 0) * (e.forced ? 1 : e.mult);
  const total = pool.reduce((s, e) => s + weightOf(e), 0);
  if (total <= 0) return pool[Math.floor(Math.random() * pool.length)].item;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= weightOf(e);
    if (r <= 0) return e.item;
  }
  return pool[pool.length - 1].item;
}

// Igual que pickWithRules, pero elige VARIOS huecos a la vez sin repetir (para decidir
// qué comidas concretas llevan garbanzos, según la proteína que le haya tocado a cada una).
function sampleIndicesWithRules(evaluated, n) {
  let pool = evaluated.filter((e) => e.forced);
  let used = new Set(pool.map((e) => e.idx));
  if (pool.length < n) {
    pool = [...pool, ...evaluated.filter((e) => !used.has(e.idx) && e.mult > 0)];
  }
  used = new Set(pool.map((e) => e.idx));
  if (pool.length < n) {
    pool = [...pool, ...evaluated.filter((e) => !used.has(e.idx))]; // último recurso
  }
  const chosen = [];
  let remaining = [...pool];
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const weights = remaining.map((e) => (e.mult > 0 ? e.mult : 0.0001));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let pick = 0;
    for (; pick < weights.length - 1; pick++) {
      r -= weights[pick];
      if (r <= 0) break;
    }
    chosen.push(remaining[pick]);
    remaining.splice(pick, 1);
  }
  return chosen;
}

function generateMenu(data, avoid = {}) {
  // Mapa nombre -> id, para poder evaluar las reglas de combinación (que se guardan por id)
  // contra los valores del menú (que se guardan por nombre, por legibilidad).
  const idByName = {};
  data.ingredients.forEach((i) => { idByName[i.name] = i.id; });
  const rules = data.rules || [];

  // 28 huecos: 2 semanas x 7 días x (Comida, Cena)
  const slots = [];
  for (let week = 1; week <= 2; week++) {
    for (let d = 0; d < 7; d++) {
      for (const mealType of ["Desayuno", "Comida", "Merienda", "Cena"]) {
        slots.push({ id: uid(), week, day: DAYS[d], mealType, protein: null, closedDish: null, carbo: null, verdura: null, garbanzos: false, item: null });
      }
    }
  }

  // El sorteo de proteína/carbo/verdura/garbanzos/platos cerrados solo aplica a Comida y Cena.
  // Desayuno y Merienda se sortean aparte, de forma independiente, más abajo.
  let pool = slots.map((_, idx) => idx).filter((idx) => slots[idx].mealType === "Comida" || slots[idx].mealType === "Cena");
  function takeRandomIndices(n) {
    const chosen = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const r = Math.floor(Math.random() * pool.length);
      chosen.push(pool[r]);
      pool.splice(r, 1);
    }
    return chosen;
  }
  // Igual que takeRandomIndices, pero restringido a los huecos de una semana concreta del pool.
  // Así se garantiza que una frecuencia "por semana" caiga de verdad cada semana, sin solapes.
  function takeRandomIndicesInWeek(week, n) {
    const weekPool = pool.filter((idx) => slots[idx].week === week);
    const chosen = [];
    const copy = [...weekPool];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const r = Math.floor(Math.random() * copy.length);
      chosen.push(copy[r]);
      copy.splice(r, 1);
    }
    pool = pool.filter((p) => !chosen.includes(p));
    return chosen;
  }
  // Reparte "n" huecos entre las dos semanas lo más igualado posible (mitad y mitad si n es par),
  // para que una frecuencia como "2 cada 2 semanas" no pueda caer, por azar, dos veces en la misma semana.
  function takeRandomIndicesEvenly(n) {
    const half1 = Math.floor(n / 2);
    const half2 = n - half1;
    const order = Math.random() < 0.5 ? [half1, half2] : [half2, half1];
    const chosen = [];
    for (let week = 1; week <= 2; week++) {
      chosen.push(...takeRandomIndicesInWeek(week, order[week - 1]));
    }
    return chosen;
  }

  // 1. Grupo de platos cerrados (reparto equilibrado por semana; evita repetir el mismo plato
  // que la última vez, y evita repetir el mismo plato dos veces dentro del mismo ciclo si hay alternativas)
  const closedBlock = data.blocks.find((b) => b.category === "cerrado");
  if (closedBlock) {
    const members = data.ingredients.filter((i) => i.blockId === closedBlock.id && i.active !== false);
    const idxs = takeRandomIndicesEvenly(closedBlock.cicloFrecuencia);
    const usedThisCycle = [];
    idxs.forEach((idx) => {
      if (!members.length) return;
      const exclude = avoid.closedDish ? [...usedThisCycle, avoid.closedDish] : [...usedThisCycle];
      const candidates = members.filter((m) => !exclude.includes(m.name));
      const pick = weightedPick(candidates.length ? candidates : members, "probabilidad");
      slots[idx].closedDish = pick.name;
      usedThisCycle.push(pick.name);
    });
  }

  // 2. Bloques de proteína (carne roja, pollo picado/hamburguesa)
  data.blocks
    .filter((b) => b.category === "proteina")
    .forEach((block) => {
      const members = data.ingredients.filter((i) => i.blockId === block.id && i.active !== false);
      if (!members.length) return;

      if (block.weeklyPattern && block.weeklyPattern.length === 2 && members.length === block.weeklyPattern[0].counts.length) {
        // Patrón semanal explícito: se sortea qué semana lleva cada patrón, para variar entre generaciones,
        // pero siempre respetando la forma exacta descrita (p.ej. 2+0 una semana, 1+1 la otra).
        const patterns = Math.random() < 0.5 ? block.weeklyPattern : [block.weeklyPattern[1], block.weeklyPattern[0]];
        for (let week = 1; week <= 2; week++) {
          const pattern = patterns[week - 1];
          let nameList = [];
          members.forEach((m, i) => { for (let c = 0; c < (pattern.counts[i] || 0); c++) nameList.push(m.name); });
          nameList = shuffle(nameList);
          const idxs = takeRandomIndicesInWeek(week, nameList.length);
          idxs.forEach((idx, i) => { slots[idx].protein = nameList[i]; });
        }
      } else if (block.cicloFrecuencia === 1) {
        // Un único hueco: sorteo por peso real (evitando repetir el mismo miembro que la última vez, si hay alternativa),
        // en vez de un reparto proporcional que con 1 solo hueco siempre caía en el mismo miembro.
        const candidates = avoid.blockLastPick && avoid.blockLastPick[block.id] && members.length > 1
          ? members.filter((m) => m.name !== avoid.blockLastPick[block.id])
          : members;
        const chosen = weightedPick(candidates.length ? candidates : members, "peso");
        const idxs = takeRandomIndices(1);
        idxs.forEach((idx) => { slots[idx].protein = chosen.name; });
      } else {
        // Varios huecos sin patrón semanal explícito: reparto equilibrado por semana (mitad y mitad si es par),
        // y dentro de cada semana, sorteo por peso.
        const idxs = takeRandomIndicesEvenly(block.cicloFrecuencia);
        idxs.forEach((idx) => {
          const chosen = weightedPick(members, "peso");
          slots[idx].protein = chosen.name;
        });
      }
    });

  // 3. Proteínas individuales de frecuencia fija (si es "por semana", se reparte semana a semana para evitar solapes)
  data.ingredients
    .filter((i) => i.category === "proteina" && i.ruleType === "frecuencia" && i.active !== false)
    .forEach((p) => {
      if (p.freqPeriodo === "semana") {
        for (let week = 1; week <= 2; week++) {
          const idxs = takeRandomIndicesInWeek(week, p.freqCantidad);
          idxs.forEach((idx) => { slots[idx].protein = p.name; });
        }
      } else {
        const idxs = takeRandomIndices(p.freqCantidad);
        idxs.forEach((idx) => { slots[idx].protein = p.name; });
      }
    });

  // 4. Lo que sobra -> proteína base (pollo)
  const base = data.ingredients.find((i) => i.category === "proteina" && i.ruleType === "base");
  pool.forEach((idx) => { if (!slots[idx].closedDish) slots[idx].protein = base ? base.name : "Pollo"; });

  // 5. Garbanzos: se superponen sobre Comida/Cena no cerradas, sin ocupar hueco de proteína.
  // Si su frecuencia es "por semana", se garantiza el reparto en cada semana por separado (sin solapes ni huecos vacíos).
  // Qué comidas concretas les toca se decide con reglas de combinación (p.ej. "nunca con Sardinas"),
  // no por puro azar: cada candidata pesa según su proteína ya asignada.
  const garbanzos = data.ingredients.find((i) => i.category === "especial" && i.active !== false);
  const mainMealIdx = (idx) => (slots[idx].mealType === "Comida" || slots[idx].mealType === "Cena") && !slots[idx].closedDish;
  function evaluateGarbanzosCandidates(idxs) {
    return idxs.map((idx) => {
      const proteinId = idByName[slots[idx].protein];
      const { mult, forced } = ruleModifier(rules, proteinId ? [proteinId] : [], garbanzos.id);
      return { idx, mult, forced };
    });
  }
  if (garbanzos) {
    if (garbanzos.freqPeriodo === "semana") {
      for (let week = 1; week <= 2; week++) {
        const idxs = slots.map((_, idx) => idx).filter((idx) => slots[idx].week === week && mainMealIdx(idx));
        sampleIndicesWithRules(evaluateGarbanzosCandidates(idxs), garbanzos.freqCantidad).forEach((e) => { slots[e.idx].garbanzos = true; });
      }
    } else {
      const idxs = slots.map((_, idx) => idx).filter((idx) => mainMealIdx(idx));
      sampleIndicesWithRules(evaluateGarbanzosCandidates(idxs), garbanzos.freqCantidad).forEach((e) => { slots[e.idx].garbanzos = true; });
    }
  }

  // 6. Carbo y verdura por sorteo en cada Comida/Cena no cerrada, respetando las reglas de
  // combinación ya evaluables en cada paso (proteína+garbanzos al elegir el carbo;
  // proteína+carbo+garbanzos al elegir la verdura).
  const carbos = data.ingredients.filter((i) => i.category === "carbo" && i.active !== false);
  const verduras = data.ingredients.filter((i) => i.category === "verdura" && i.active !== false);
  slots
    .filter((s) => s.mealType === "Comida" || s.mealType === "Cena")
    .forEach((s) => {
      if (s.closedDish) return;
      const proteinId = idByName[s.protein];
      const decidedForCarbo = [proteinId, ...(s.garbanzos && garbanzos ? [garbanzos.id] : [])].filter(Boolean);
      if (carbos.length) s.carbo = pickWithRules(carbos, "probabilidad", rules, decidedForCarbo).name;

      const carboId = idByName[s.carbo];
      const decidedForVerdura = [proteinId, carboId, ...(s.garbanzos && garbanzos ? [garbanzos.id] : [])].filter(Boolean);
      if (verduras.length) s.verdura = pickWithRules(verduras, "probabilidad", rules, decidedForVerdura).name;
    });

  // Marca, para cada comida ya decidida, qué reglas de combinación coinciden con lo que ha salido
  // (tanto si la regla "ayudó" a que saliera así, como si una regla "nula" no se pudo evitar por
  // falta de alternativas). Es solo informativo, para poder avisar en el detalle de la comida.
  slots.forEach((s) => {
    if (s.closedDish || (s.mealType !== "Comida" && s.mealType !== "Cena")) return;
    const present = new Set();
    [s.protein, s.carbo, s.verdura].forEach((name) => { const id = idByName[name]; if (id) present.add(id); });
    if (s.garbanzos && garbanzos) present.add(garbanzos.id);
    const matched = rules.filter((r) => r.itemIds.every((id) => present.has(id)));
    if (matched.length) s.rulesApplied = matched.map((r) => ({ id: r.id, itemIds: r.itemIds, level: r.level }));
  });

  // 7. Desayuno y Merienda: reparto EXACTO según las probabilidades, no un sorteo independiente por comida.
  // Con solo 14 comidas de cada tipo por ciclo, un sorteo puro se aleja demasiado del porcentaje real
  // (como lanzar una moneda 14 veces no siempre da 7 y 7). En vez de eso, se calculan cuántas veces
  // le toca a cada opción sobre el total de 14 (método del resto mayor, igual que en los bloques de proteína),
  // y luego se mezcla el orden al azar entre los 14 días del ciclo.
  function assignByExactProportion(items, mealTypeLabel) {
    const targetSlots = slots.filter((s) => s.mealType === mealTypeLabel);
    if (!items.length || !targetSlots.length) return;
    const allocation = allocateCounts(items, "probabilidad", targetSlots.length);
    let nameList = [];
    allocation.forEach((a) => { for (let c = 0; c < a.count; c++) nameList.push(a.member.name); });
    nameList = shuffle(nameList);
    targetSlots.forEach((s, i) => { s.item = nameList[i]; });
  }

  const desayunos = data.ingredients.filter((i) => i.category === "desayuno" && i.active !== false);
  const meriendas = data.ingredients.filter((i) => i.category === "merienda" && i.active !== false);
  assignByExactProportion(desayunos, "Desayuno");
  assignByExactProportion(meriendas, "Merienda");

  return slots;
}

// A partir del último ciclo generado, extrae qué se eligió en los grupos de un solo hueco,
// para poder evitar repetirlo exactamente en la siguiente generación.
function lastPicksFromHistory(history, data) {
  const avoid = { blockLastPick: {} };
  const lastCycle = history && history[0];
  if (!lastCycle || !lastCycle.slots) return avoid;

  const closedSlot = lastCycle.slots.find((s) => s.closedDish);
  if (closedSlot) avoid.closedDish = closedSlot.closedDish;

  data.blocks
    .filter((b) => b.category === "proteina" && b.cicloFrecuencia === 1 && !b.weeklyPattern)
    .forEach((block) => {
      const memberNames = data.ingredients.filter((i) => i.blockId === block.id).map((i) => i.name);
      const lastSlot = lastCycle.slots.find((s) => memberNames.includes(s.protein));
      if (lastSlot) avoid.blockLastPick[block.id] = lastSlot.protein;
    });

  return avoid;
}

// ---------- Componente principal ----------

export default function RuedaDePlatos() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("menu");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [editing, setEditing] = useState(null); // { mode: 'new'|'edit', category, ingredient }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingFrequency, setEditingFrequency] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [confirmDeleteFood, setConfirmDeleteFood] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [confirmDeleteRule, setConfirmDeleteRule] = useState(null);
  const [menu, setMenu] = useState(null);
  const [menuWeek, setMenuWeek] = useState(1);
  const [history, setHistory] = useState([]);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          const { data: migrated, changed } = migrateData(parsed);
          setData(migrated);
          if (changed) {
            window.storage.set(STORAGE_KEY, JSON.stringify(migrated), false).catch(() => {});
          }
        } else {
          setData(initialData());
        }
      } catch (e) {
        setData(initialData());
      }
      try {
        const menuRes = await window.storage.get(MENU_STORAGE_KEY, false);
        if (menuRes && menuRes.value) setMenu(JSON.parse(menuRes.value));
      } catch (e) {
        // no hay menú generado todavía, no pasa nada
      }
      try {
        const historyRes = await window.storage.get(HISTORY_STORAGE_KEY, false);
        if (historyRes && historyRes.value) setHistory(JSON.parse(historyRes.value));
      } catch (e) {
        // no hay historial todavía, no pasa nada
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleGenerateMenu() {
    const avoid = lastPicksFromHistory(history, data);
    const result = generateMenu(data, avoid);
    setMenu(result);
    setMenuWeek(1);
    try {
      await window.storage.set(MENU_STORAGE_KEY, JSON.stringify(result), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    const entry = { id: uid(), generatedAt: new Date().toISOString(), slots: result };
    const newHistory = [entry, ...history].slice(0, HISTORY_MAX);
    setHistory(newHistory);
    try {
      await window.storage.set(HISTORY_STORAGE_KEY, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
  }

  // Actualiza una comida concreta del menú (por ejemplo, al cambiar las raciones de un componente)
  // y persiste el menú completo. El historial no se toca: guarda cómo se generó originalmente.
  const menuSaveTimer = useRef(null);
  function updateMeal(mealId, patch) {
    setMenu((prev) => {
      if (!prev) return prev;
      const next = prev.map((s) => (s.id === mealId ? { ...s, ...patch } : s));
      if (menuSaveTimer.current) clearTimeout(menuSaveTimer.current);
      menuSaveTimer.current = setTimeout(() => {
        window.storage.set(MENU_STORAGE_KEY, JSON.stringify(next), false).catch(() => {});
      }, 400);
      return next;
    });
  }

  useEffect(() => {
    if (!data || loading) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
        setSaveState("saved");
      } catch (e) {
        setSaveState("idle");
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [data]);

  if (loading || !data) {
    return (
      <Shell>
        <div style={{ padding: 60, textAlign: "center", color: "var(--ink-soft)" }}>Cargando tu recetario…</div>
      </Shell>
    );
  }

  const itemsInCategory = (cat) => data.ingredients.filter((i) => i.category === cat && i.ruleType !== "bloque_miembro");
  const blocksInCategory = (cat) => data.blocks.filter((b) => b.category === cat);
  const membersOfBlock = (blockId) => data.ingredients.filter((i) => i.blockId === blockId);

  function upsertIngredient(ingredient) {
    setData((prev) => {
      const exists = prev.ingredients.some((i) => i.id === ingredient.id);
      return {
        ...prev,
        ingredients: exists
          ? prev.ingredients.map((i) => (i.id === ingredient.id ? ingredient : i))
          : [...prev.ingredients, ingredient],
      };
    });
  }

  function deleteIngredient(id) {
    setData((prev) => ({ ...prev, ingredients: prev.ingredients.filter((i) => i.id !== id) }));
    setConfirmDelete(null);
  }

  function updateObjetivos(objetivos) {
    setData((prev) => ({ ...prev, objetivos }));
  }

  function upsertFood(food) {
    setData((prev) => {
      const foods = prev.foods || [];
      const exists = foods.some((f) => f.id === food.id);
      return { ...prev, foods: exists ? foods.map((f) => (f.id === food.id ? food : f)) : [...foods, food] };
    });
  }

  // Al borrar un alimento, se desvincula de cualquier ingrediente que lo usara,
  // para no dejar referencias rotas que darían macros incorrectos silenciosamente.
  function deleteFood(id) {
    setData((prev) => ({
      ...prev,
      foods: (prev.foods || []).filter((f) => f.id !== id),
      ingredients: prev.ingredients.map((i) => (i.foodId === id ? { ...i, foodId: undefined } : i)),
    }));
    setConfirmDeleteFood(null);
  }

  function upsertRule(rule) {
    setData((prev) => {
      const rules = prev.rules || [];
      const exists = rules.some((r) => r.id === rule.id);
      return { ...prev, rules: exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule] };
    });
  }

  function deleteRule(id) {
    setData((prev) => ({ ...prev, rules: (prev.rules || []).filter((r) => r.id !== id) }));
    setConfirmDeleteRule(null);
  }

  function updateBlock(blockId, patch) {
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  }

  const carboTotal = itemsInCategory("carbo").reduce((s, i) => s + (i.probabilidad || 0), 0);
  const verduraTotal = itemsInCategory("verdura").reduce((s, i) => s + (i.probabilidad || 0), 0);
  const desayunoTotal = itemsInCategory("desayuno").reduce((s, i) => s + (i.probabilidad || 0), 0);
  const meriendaTotal = itemsInCategory("merienda").reduce((s, i) => s + (i.probabilidad || 0), 0);

  return (
    <Shell>
      <Header saveState={saveState} />
      <TabBar tab={tab} setTab={setTab} />

      <main style={{ padding: "20px 22px 60px" }}>
        {tab === "menu" && (
          <MenuView
            menu={menu}
            onGenerate={handleGenerateMenu}
            menuWeek={menuWeek}
            setMenuWeek={setMenuWeek}
            history={history}
            data={data}
            onUpdateMeal={updateMeal}
            objetivos={data.objetivos}
            onUpdateObjetivos={updateObjetivos}
          />
        )}

        {tab === "proteina" && (
          <>
            <SectionIntro
              text="Cada proteína especial ocupa un número fijo de comidas por semana o por ciclo de 2 semanas. El pollo no tiene regla propia: rellena todo lo que sobra, así que es la base natural del menú."
            />
            <CardGrid>
              {itemsInCategory("proteina").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "proteina", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              {blocksInCategory("proteina").map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  data={data}
                  members={membersOfBlock(block.id)}
                  onUpdateBlock={(patch) => updateBlock(block.id, patch)}
                  onEditMember={(m) => setEditing({ mode: "edit", category: "proteina", ingredient: m, blockId: block.id })}
                  onDeleteMember={(m) => setConfirmDelete(m)}
                  onAddMember={() => setEditing({ mode: "new", category: "proteina", blockId: block.id })}
                  onEditFrequency={(b) => setEditingFrequency(b)}
                />
              ))}
              <AddCard label="Añadir proteína" onClick={() => setEditing({ mode: "new", category: "proteina" })} />
            </CardGrid>
          </>
        )}

        {tab === "carbo" && (
          <>
            <SectionIntro text="Se sortean por probabilidad en cada comida que no sea un plato cerrado. Los porcentajes deberían sumar 100%." />
            <ProbabilitySumBadge total={carboTotal} />
            <CardGrid>
              {itemsInCategory("carbo").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "carbo", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              <AddCard label="Añadir carbohidrato" onClick={() => setEditing({ mode: "new", category: "carbo" })} />
            </CardGrid>
          </>
        )}

        {tab === "verdura" && (
          <>
            <SectionIntro text="Se sortean por probabilidad, igual que los carbohidratos. Los porcentajes deberían sumar 100%." />
            <ProbabilitySumBadge total={verduraTotal} />
            <CardGrid>
              {itemsInCategory("verdura").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "verdura", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              <AddCard label="Añadir verdura / acompañamiento" onClick={() => setEditing({ mode: "new", category: "verdura" })} />
            </CardGrid>
          </>
        )}

        {tab === "desayuno" && (
          <>
            <SectionIntro text="Opciones completas de desayuno, sin combinar con nada más. Cada 2 semanas (14 desayunos) se reparte exactamente según estos porcentajes, mezclando el orden al azar. Los porcentajes deberían sumar 100%." />
            <ProbabilitySumBadge total={desayunoTotal} />
            <CardGrid>
              {itemsInCategory("desayuno").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "desayuno", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              <AddCard label="Añadir desayuno" onClick={() => setEditing({ mode: "new", category: "desayuno" })} />
            </CardGrid>
          </>
        )}

        {tab === "merienda" && (
          <>
            <SectionIntro text="Opciones completas de merienda, sin combinar con nada más. Cada 2 semanas (14 meriendas) se reparte exactamente según estos porcentajes, mezclando el orden al azar. Los porcentajes deberían sumar 100%." />
            <ProbabilitySumBadge total={meriendaTotal} />
            <CardGrid>
              {itemsInCategory("merienda").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "merienda", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              <AddCard label="Añadir merienda" onClick={() => setEditing({ mode: "new", category: "merienda" })} />
            </CardGrid>
          </>
        )}

        {tab === "cerrado" && (
          <>
            <SectionIntro text="Van enteros, sin combinar con carbo ni verdura. El grupo entero aparece con la frecuencia del bloque; dentro, se sortea cuál plato toca." />
            <CardGrid>
              {blocksInCategory("cerrado").map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  data={data}
                  members={membersOfBlock(block.id)}
                  onUpdateBlock={(patch) => updateBlock(block.id, patch)}
                  onEditMember={(m) => setEditing({ mode: "edit", category: "cerrado", ingredient: m, blockId: block.id })}
                  onDeleteMember={(m) => setConfirmDelete(m)}
                  onAddMember={() => setEditing({ mode: "new", category: "cerrado", blockId: block.id })}
                  onEditFrequency={(b) => setEditingFrequency(b)}
                  showProbabilities
                />
              ))}
            </CardGrid>
          </>
        )}

        {tab === "especial" && (
          <>
            <SectionIntro text="No compiten por un hueco de proteína: se superponen sobre la comida que toque ese día." />
            <CardGrid>
              {itemsInCategory("especial").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "especial", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  extraNote="Modificador: mezcla 50/50 con el carbo del día"
                />
              ))}
              <AddCard label="Añadir especial" onClick={() => setEditing({ mode: "new", category: "especial" })} />
            </CardGrid>
          </>
        )}

        {tab === "alimentos" && (
          <FoodsView
            foods={data.foods || []}
            ingredients={data.ingredients}
            onEdit={(food) => setEditingFood({ mode: "edit", food })}
            onNew={() => setEditingFood({ mode: "new" })}
            onDelete={(food) => setConfirmDeleteFood(food)}
          />
        )}

        {tab === "combos" && (
          <RulesView
            rules={data.rules || []}
            ingredients={data.ingredients}
            onEdit={(rule) => setEditingRule({ mode: "edit", rule })}
            onNew={() => setEditingRule({ mode: "new" })}
            onDelete={(rule) => setConfirmDeleteRule(rule)}
          />
        )}
      </main>

      {editing && (
        <EditModal
          state={editing}
          foods={data.foods || []}
          onClose={() => setEditing(null)}
          onSave={(ing) => {
            upsertIngredient(ing);
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          ingredient={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteIngredient(confirmDelete.id)}
        />
      )}

      {editingFrequency && (
        <FrequencyModal
          block={editingFrequency}
          onClose={() => setEditingFrequency(null)}
          onSave={(n) => {
            updateBlock(editingFrequency.id, { cicloFrecuencia: n });
            setEditingFrequency(null);
          }}
        />
      )}

      {editingFood && (
        <FoodEditModal
          state={editingFood}
          onClose={() => setEditingFood(null)}
          onSave={(food) => {
            upsertFood(food);
            setEditingFood(null);
          }}
        />
      )}

      {confirmDeleteFood && (
        <ConfirmFoodDeleteModal
          food={confirmDeleteFood}
          usedBy={data.ingredients.filter((i) => i.foodId === confirmDeleteFood.id)}
          onCancel={() => setConfirmDeleteFood(null)}
          onConfirm={() => deleteFood(confirmDeleteFood.id)}
        />
      )}

      {editingRule && (
        <RuleEditModal
          state={editingRule}
          ingredients={data.ingredients}
          onClose={() => setEditingRule(null)}
          onSave={(rule) => {
            upsertRule(rule);
            setEditingRule(null);
          }}
        />
      )}

      {confirmDeleteRule && (
        <ConfirmRuleDeleteModal
          rule={confirmDeleteRule}
          ingredients={data.ingredients}
          onCancel={() => setConfirmDeleteRule(null)}
          onConfirm={() => deleteRule(confirmDeleteRule.id)}
        />
      )}
    </Shell>
  );
}

// ---------- Piezas de UI ----------

function Shell({ children }) {
  return (
    <div
      style={{
        "--paper": "#f1ede0",
        "--card": "#fffdf7",
        "--ink": "#2b2b26",
        "--ink-soft": "#6b6a5e",
        "--line": "#ddd6bf",
        "--green": "#2f6b4f",
        "--green-dark": "#1f4d38",
        "--green-soft": "#e6efe6",
        "--mustard": "#d9a441",
        "--mustard-dark": "#a9721f",
        "--mustard-soft": "#f7ecd6",
        "--rust": "#9c4a2b",
        "--rust-soft": "#f3e2d8",
        "--coffee": "#6b4423",
        "--coffee-soft": "#efe3d6",
        "--berry": "#8a3b5e",
        "--berry-soft": "#f3e0ea",
        background: "var(--paper)",
        minHeight: "100%",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "var(--ink)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        input, select { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; }
        ::selection { background: var(--mustard); color: white; }
        @media (max-width: 480px) {
          main { padding-left: 14px !important; padding-right: 14px !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

function Header({ saveState }) {
  return (
    <header
      style={{
        background: "var(--green-dark)",
        color: "#fff",
        padding: "22px 22px 26px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
        }}
      />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", position: "relative" }}>
        <div>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginBottom: 4 }}>
            Rueda de Platos
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 400, letterSpacing: 0.3 }}>Tu recetario</h1>
        </div>
        <SaveIndicator state={saveState} />
      </div>
    </header>
  );
}

function SaveIndicator({ state }) {
  const label = state === "saving" ? "Guardando…" : state === "saved" ? "Guardado" : "";
  if (!label) return <div style={{ width: 1 }} />;
  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 11,
        opacity: 0.75,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {state === "saved" && <Check size={12} />}
      {label}
    </div>
  );
}

const MENU_TAB_META = { label: "Menú", icon: CalendarDays };
const FOODS_TAB_META = { label: "Alimentos", icon: Database };
const RULES_TAB_META = { label: "Combinaciones", icon: Layers };
const SPECIAL_TABS = { menu: MENU_TAB_META, alimentos: FOODS_TAB_META, combos: RULES_TAB_META };

function TabBar({ tab, setTab }) {
  const tabs = ["menu", "proteina", "carbo", "verdura", "desayuno", "merienda", "cerrado", "especial", "combos", "alimentos"];
  return (
    <nav
      style={{
        display: "flex",
        background: "var(--green)",
        paddingLeft: 12,
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const meta = SPECIAL_TABS[t] || CATEGORY_META[t];
        const Icon = meta.icon;
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              border: "none",
              background: active ? "var(--paper)" : "transparent",
              color: active ? "var(--green-dark)" : "rgba(255,255,255,0.85)",
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              borderRadius: "10px 10px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              marginTop: active ? 0 : 6,
              transition: "all 0.15s",
            }}
          >
            <Icon size={14} />
            {meta.label}
          </button>
        );
      })}
    </nav>
  );
}

function MenuView({ menu, onGenerate, menuWeek, setMenuWeek, history, data, onUpdateMeal, objetivos, onUpdateObjetivos }) {
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [editingObjetivos, setEditingObjetivos] = useState(false);
  const [showStats, setShowStats] = useState(true);
  // Se busca la comida por id en cada render en vez de guardar una copia en el estado:
  // así, al cambiar las raciones, el modal refleja el valor nuevo inmediatamente.
  const selectedMeal = selectedMealId && menu ? menu.find((s) => s.id === selectedMealId) : null;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <SectionIntro text="Genera un ciclo de 2 semanas respetando todas las frecuencias, bloques y probabilidades definidos. Cada vez que pulses el botón, se sortea un menú nuevo." />
        <button
          onClick={() => setEditingObjetivos(true)}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
            color: "var(--green-dark)", background: "var(--green-soft)", border: "none",
            borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          🎯 {objetivos ? "Editar objetivos" : "Fijar objetivos diarios"}
        </button>
      </div>
      <button
        onClick={onGenerate}
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 13.5,
          fontWeight: 700,
          color: "#fff",
          background: "var(--green)",
          border: "none",
          borderRadius: 9,
          padding: "11px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 18,
        }}
      >
        <Shuffle size={15} />
        {menu ? "Generar otro menú" : "Generar menú (2 semanas)"}
      </button>

      {!menu && (
        <div
          style={{
            border: "1.5px dashed var(--line)",
            borderRadius: 12,
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ink-soft)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 13,
          }}
        >
          Todavía no has generado ningún menú. Pulsa el botón de arriba para crear el primero.
        </div>
      )}

      {menu && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2].map((w) => (
              <button
                key={w}
                onClick={() => setMenuWeek(w)}
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "7px 14px",
                  borderRadius: 20,
                  border: "1px solid var(--line)",
                  background: menuWeek === w ? "var(--green-dark)" : "var(--card)",
                  color: menuWeek === w ? "#fff" : "var(--ink)",
                }}
              >
                Semana {w}
              </button>
            ))}
            <button
              onClick={() => window.print()}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
                color: "var(--green-dark)", background: "var(--green-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Download size={13} /> Exportar PDF
            </button>
            <button
              onClick={() => setShowStats((s) => !s)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 600,
                color: "var(--ink-soft)", background: "transparent", border: "none",
                padding: "7px 4px", marginLeft: "auto",
              }}
            >
              {showStats ? "Ocultar estadísticas ▲" : "Ver estadísticas ▼"}
            </button>
          </div>

          {showStats && <DayStatsPanel data={data} menu={menu} week={menuWeek} objetivos={objetivos} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => {
                      const t = mealTotals(data, m);
                      const ajustada = m.raciones && Object.values(m.raciones).some((v) => Number(v) !== 1);
                      return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMealId(m.id)}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          fontFamily: "'Helvetica Neue', Arial, sans-serif",
                          cursor: "pointer",
                          padding: "4px 6px",
                          marginLeft: -6,
                          marginRight: -6,
                          borderRadius: 7,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", width: 68, flexShrink: 0 }}>{m.mealType}</span>
                        {m.closedDish ? (
                          <span style={{ fontSize: 13, color: "var(--rust)", fontWeight: 600 }}>{m.closedDish}</span>
                        ) : m.item ? (
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.item}</span>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {m.protein} + {m.carbo} + {m.verdura}
                            {m.garbanzos && (
                              <span
                                style={{
                                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: "var(--mustard-dark)",
                                  background: "var(--mustard-soft)",
                                  padding: "2px 7px",
                                  borderRadius: 20,
                                }}
                              >
                                +garbanzos 50/50
                              </span>
                            )}
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          {ajustada && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: 20 }}>
                              ajustada
                            </span>
                          )}
                          {t.kcal > 0 && (
                            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>
                              {Math.round(t.kcal)} kcal
                            </span>
                          )}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <HistoryPanel history={history} />

      <PrintExport data={data} menu={menu} />

      {selectedMeal && (
        <MealDetailModal meal={selectedMeal} data={data} onUpdateMeal={onUpdateMeal} onClose={() => setSelectedMealId(null)} />
      )}

      {editingObjetivos && (
        <ObjetivosModal
          objetivos={objetivos}
          onClose={() => setEditingObjetivos(false)}
          onSave={(obj) => {
            onUpdateObjetivos(obj);
            setEditingObjetivos(false);
          }}
        />
      )}
    </>
  );
}

// Barras de calorías por día de la semana seleccionada, más el desglose de macros de cada día.
// Todo se recalcula en cada render a partir de menu+data, así que si cambias una ración
// (o el propio menú), se actualiza solo, sin ningún paso extra.
// Rueda de macros del día seleccionado, con pestañas para cambiar de día sin repetir 7 gráficas iguales.
// El reparto de la rueda es por aporte calórico real (proteína y carbohidratos = 4 kcal/g, grasa = 9 kcal/g),
// así que el tamaño de cada porción refleja su peso energético de verdad, no solo los gramos.
// ---------- Exportación a PDF (vía "Imprimir" del navegador) ----------
// No usa ninguna librería externa: se renderiza siempre en el DOM (oculto en pantalla),
// y una hoja de estilos "@media print" oculta el resto de la app y muestra solo esto
// cuando el usuario pulsa "Exportar PDF" (que solo llama a window.print()).
// Así funciona igual de bien en Claude y en la versión web, sin nada que se pueda romper.
function PrintExport({ data, menu }) {
  if (!menu) return null;
  return (
    <div id="print-export">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-export, #print-export * { visibility: visible; }
          #print-export { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-export { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: "Georgia, 'Times New Roman', serif", color: "#2b2b26" }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            Rueda de Platos
          </div>
          <h1 style={{ fontSize: 28, color: "#1f4d38", margin: "2px 0 0 0" }}>Tu menú</h1>
        </div>

        {[1, 2].map((week) => {
          const weekHasMeals = menu.some((s) => s.week === week);
          if (!weekHasMeals) return null;
          return (
            <div key={week} style={{ pageBreakBefore: week === 2 ? "always" : "auto" }}>
              <h2 style={{ fontSize: 18, color: "#1f4d38", borderBottom: "2px solid #d9a441", paddingBottom: 5, marginTop: 22 }}>
                Semana {week}
              </h2>
              {DAYS.map((day) => {
                const dayMeals = menu.filter((s) => s.week === week && s.day === day);
                if (!dayMeals.length) return null;
                const totals = dayTotals(data, menu, week, day);
                return (
                  <div
                    key={day}
                    style={{
                      display: "flex", gap: 16, alignItems: "center", marginTop: 12,
                      border: "1px solid #ddd6bf", borderRadius: 8, padding: "10px 14px",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, marginBottom: 6 }}>{day}</div>
                      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayMeals.map((m) => (
                          <div key={m.id} style={{ fontSize: 11, lineHeight: 1.45 }}>
                            <span style={{ fontWeight: 700, color: "#a9721f" }}>{m.mealType}: </span>
                            <span>{mealExportParts(data, m).join(", ") || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <PrintDonut totals={totals} />
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          Rueda de Platos — exportado para cocinar con las cantidades a mano
        </div>
      </div>
    </div>
  );
}

// Rueda de macros estática (sin pestañas, sin estado) para el documento impreso.
function PrintDonut({ totals }) {
  const segments = [
    { kcal: totals.prot * 4, color: "#2f6b4f" },
    { kcal: totals.fat * 9, color: "#d9a441" },
    { kcal: totals.carb * 4, color: "#6b4423" },
  ];
  const total = segments.reduce((s, x) => s + x.kcal, 0) || 1;
  const R = 34;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ flexShrink: 0, width: 100, textAlign: "center" }}>
      <svg viewBox="0 0 90 90" width="90" height="90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="#f1ede0" strokeWidth="11" />
        {segments.map((s, i) => {
          const len = (s.kcal / total) * C;
          const dashoffset = -acc;
          acc += len;
          return (
            <circle
              key={i} cx="45" cy="45" r={R} fill="none" stroke={s.color} strokeWidth="11"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={dashoffset}
              transform="rotate(-90 45 45)"
            />
          );
        })}
        <text x="45" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f4d38" fontFamily="'Helvetica Neue', Arial, sans-serif">
          {Math.round(totals.kcal)}
        </text>
        <text x="45" y="56" textAnchor="middle" fontSize="8" fill="#6b6a5e" fontFamily="'Helvetica Neue', Arial, sans-serif">
          kcal
        </text>
      </svg>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 8.5, display: "flex", justifyContent: "center", gap: 4, marginTop: 2 }}>
        <span style={{ color: "#1f4d38" }}>P{fmt(totals.prot)}</span>
        <span style={{ color: "#a9721f" }}>G{fmt(totals.fat)}</span>
        <span style={{ color: "#6b4423" }}>C{fmt(totals.carb)}</span>
      </div>
    </div>
  );
}

function DayStatsPanel({ data, menu, week, objetivos }) {
  const [day, setDay] = useState(DAYS[0]);
  const totals = dayTotals(data, menu, week, day);

  const segments = [
    { key: "prot", kcal: totals.prot * 4, color: "var(--green)" },
    { key: "fat", kcal: totals.fat * 9, color: "var(--mustard)" },
    { key: "carb", kcal: totals.carb * 4, color: "var(--coffee)" },
  ];
  const totalForRing = segments.reduce((s, x) => s + x.kcal, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;

  const pct = objetivos?.kcal ? Math.round((totals.kcal / objetivos.kcal) * 100) : null;
  const pctStyle =
    pct === null ? null :
    pct < 90 ? { bg: "var(--mustard-soft)", fg: "var(--mustard-dark)" } :
    pct > 110 ? { bg: "var(--rust-soft)", fg: "var(--rust)" } :
    { bg: "var(--green-soft)", fg: "var(--green-dark)" };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
              padding: "6px 13px", borderRadius: 20, border: "1px solid var(--line)", flexShrink: 0,
              background: d === day ? "var(--green-dark)" : "var(--paper)",
              color: d === day ? "#fff" : "var(--ink)",
            }}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 12px" }}>
        <svg viewBox="0 0 180 180" width="180" height="180">
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--paper)" strokeWidth="20" />
          {segments.map((s) => {
            const len = (s.kcal / totalForRing) * C;
            const dashoffset = -acc;
            acc += len;
            return (
              <circle
                key={s.key} cx="90" cy="90" r={R} fill="none" stroke={s.color} strokeWidth="20"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={dashoffset}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 25, fontWeight: 700, color: "var(--green-dark)" }}>{Math.round(totals.kcal)}</div>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>kcal</div>
        </div>
      </div>

      {pct !== null && (
        <div style={{ textAlign: "center", marginBottom: 13 }}>
          <span style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
            padding: "4px 11px", borderRadius: 20, background: pctStyle.bg, color: pctStyle.fg,
          }}>
            {pct}% del objetivo ({objetivos.kcal} kcal)
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
        <MacroPill label="P" value={`${fmt(totals.prot)}g`} color="var(--green-dark)" bg="var(--green-soft)" />
        <MacroPill label="G" value={`${fmt(totals.fat)}g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
        <MacroPill label="C" value={`${fmt(totals.carb)}g`} color="var(--coffee)" bg="var(--coffee-soft)" />
      </div>

      {!objetivos?.kcal && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 13, textAlign: "center" }}>
          Fija un objetivo diario (botón de arriba) para ver el % de cumplimiento de este día.
        </div>
      )}
    </div>
  );
}

function ObjetivosModal({ objetivos, onClose, onSave }) {
  const [kcal, setKcal] = useState(objetivos?.kcal ?? "");
  const [prot, setProt] = useState(objetivos?.prot ?? "");
  const [fat, setFat] = useState(objetivos?.fat ?? "");
  const [carb, setCarb] = useState(objetivos?.carb ?? "");

  function handleSave() {
    const obj = {
      kcal: kcal === "" ? undefined : Number(kcal),
      prot: prot === "" ? undefined : Number(prot),
      fat: fat === "" ? undefined : Number(fat),
      carb: carb === "" ? undefined : Number(carb),
    };
    onSave(obj);
  }

  return (
    <ModalShell onClose={onClose} title="Objetivos diarios">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginTop: 0 }}>
        Opcional. Se usan solo como referencia visual en las estadísticas del menú — puedes dejar en blanco lo que no te interese controlar.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Calorías (kcal/día)">
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} placeholder="Ej: 2200" />
        </Field>
        <Field label="Proteína (g/día)">
          <input type="number" value={prot} onChange={(e) => setProt(e.target.value)} style={inputStyle} placeholder="Ej: 150" />
        </Field>
        <Field label="Grasa (g/día)">
          <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} placeholder="Ej: 70" />
        </Field>
        <Field label="Carbohidratos (g/día)">
          <input type="number" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} placeholder="Ej: 220" />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">Guardar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function MealDetailModal({ meal, data, onUpdateMeal, onClose }) {
  const components = mealComponents(data, meal);
  const totals = mealTotals(data, meal);

  function setRaciones(slotKey, value) {
    const v = Math.max(0, Math.round(Number(value) * 100) / 100);
    onUpdateMeal(meal.id, { raciones: { ...(meal.raciones || {}), [slotKey]: v } });
  }

  const anyChanged = components.some((c) => c.raciones !== 1);

  return (
    <ModalShell onClose={onClose} title={`${meal.day} · ${meal.mealType}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {components.map((c) => (
          <div
            key={c.slotKey}
            style={{
              paddingBottom: 11,
              borderBottom: "1px solid var(--line)",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>
                  {c.label}
                  {c.note && (
                    <span style={{ fontSize: 10.5, color: "var(--mustard-dark)", fontWeight: 700 }}> · {c.note}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                  {c.macros ? `${fmt(c.macros.gramos)} g` : "sin datos nutricionales"}
                </div>
              </div>
              <RacionesStepper value={c.raciones} onChange={(v) => setRaciones(c.slotKey, v)} />
            </div>

            {c.macros && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                <MacroPill label="kcal" value={fmt(c.macros.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
                <MacroPill label="P" value={fmt(c.macros.prot)} color="var(--green-dark)" bg="var(--green-soft)" />
                <MacroPill label="G" value={fmt(c.macros.fat)} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
                <MacroPill label="C" value={fmt(c.macros.carb)} color="var(--coffee)" bg="var(--coffee-soft)" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--green-dark)",
          color: "#fff",
          borderRadius: 10,
          padding: "12px 14px",
          marginTop: 14,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.7, marginBottom: 6 }}>
          Total de la comida
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{fmt(totals.kcal)}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>kcal</span>
          <span style={{ fontSize: 12, opacity: 0.9, marginLeft: "auto" }}>
            P {fmt(totals.prot)} · G {fmt(totals.fat)} · C {fmt(totals.carb)}
          </span>
        </div>
      </div>

      {meal.rulesApplied && meal.rulesApplied.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {meal.rulesApplied.map((r) => {
            const names = r.itemIds.map((id) => ruleItemLabel(data.ingredients, id)).join(" + ");
            const isNulaForced = r.level === "nula";
            return (
              <div
                key={r.id}
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5,
                  color: isNulaForced ? "var(--rust)" : "var(--ink-soft)",
                }}
              >
                {isNulaForced
                  ? `⚠ No se pudo evitar la combinación "${names}" (regla: nunca) por falta de alternativas ese día.`
                  : `⚙ Regla aplicada: ${names} (${(RULE_LEVELS[r.level] || {}).label || r.level})`}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>
          1 ración = la cantidad base del ingrediente
        </span>
        {anyChanged && (
          <button
            onClick={() => onUpdateMeal(meal.id, { raciones: {} })}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5,
              border: "1px solid var(--line)", background: "transparent",
              borderRadius: 7, padding: "5px 10px", color: "var(--ink-soft)",
            }}
          >
            Restablecer
          </button>
        )}
      </div>
    </ModalShell>
  );
}

// Control de raciones: botones -/+ en pasos de 0,1 y campo editable para valores concretos.
function RacionesStepper({ value, onChange }) {
  const btn = {
    width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
    background: "var(--paper)", color: "var(--ink)", fontSize: 15, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <button style={btn} onClick={() => onChange(Math.max(0, value - 0.1))}>−</button>
      <input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        style={{
          width: 52, textAlign: "center", padding: "4px 2px", borderRadius: 6,
          border: "1px solid var(--line)", background: "#fff", color: "var(--ink)",
          fontSize: 13, fontWeight: 700,
        }}
      />
      <button style={btn} onClick={() => onChange(value + 0.1)}>+</button>
    </div>
  );
}

function HistoryPanel({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontSize: 15, marginBottom: 8 }}>Ciclos anteriores</div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        La app usa el último ciclo para evitar repetir de inmediato el mismo plato cerrado o la misma elección en los grupos de un solo hueco.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((h) => {
          const closed = h.slots.find((s) => s.closedDish);
          const date = new Date(h.generatedAt);
          const dateLabel = date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={h.id}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: 12,
                color: "var(--ink-soft)",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{dateLabel}</span>
              {closed && <span>Plato cerrado: {closed.closedDish}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodsView({ foods, ingredients, onEdit, onNew, onDelete }) {
  const [query, setQuery] = useState("");

  const usageCount = (foodId) => ingredients.filter((i) => i.foodId === foodId).length;
  const filtered = query.trim()
    ? foods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : foods;

  return (
    <>
      <SectionIntro text="Catálogo central de alimentos con sus valores por 100 g. Los ingredientes del menú se enlazan aquí, así que al corregir un valor se actualiza en todos los sitios donde se use." />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento…"
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <button
          onClick={onNew}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Plus size={14} /> Nuevo alimento
        </button>
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>
        {filtered.length} de {foods.length} alimentos
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((f) => {
          const uses = usageCount(f.id);
          return (
            <div
              key={f.id}
              style={{
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
                padding: "11px 13px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, lineHeight: 1.3 }}>{f.name}</div>
                  <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 3 }}>
                    {f.fuente}
                    {uses > 0 && (
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>
                        {" · "}<Link2 size={9} style={{ verticalAlign: "middle" }} /> usado en {uses}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <IconBtn onClick={() => onEdit(f)}><Pencil size={13} /></IconBtn>
                  <IconBtn onClick={() => onDelete(f)}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                <MacroPill label="kcal" value={f.kcal} color="var(--rust)" bg="var(--rust-soft)" />
                <MacroPill label="P" value={`${f.prot} g`} color="var(--green-dark)" bg="var(--green-soft)" />
                <MacroPill label="G" value={`${f.fat} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
                <MacroPill label="C" value={`${f.carb} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
                <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", alignSelf: "center" }}>
                  por 100 g
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{
            border: "1.5px dashed var(--line)", borderRadius: 10, padding: "26px 16px",
            textAlign: "center", color: "var(--ink-soft)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13,
          }}>
            No hay ningún alimento que coincida con “{query}”.
          </div>
        )}
      </div>
    </>
  );
}

function MacroPill({ label, value, color, bg }) {
  return (
    <span
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 11, fontWeight: 700, color, background: bg,
        padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
      }}
    >
      {label} {value}
    </span>
  );
}

function FoodEditModal({ state, onClose, onSave }) {
  const existing = state.food;
  const [name, setName] = useState(existing ? existing.name : "");
  const [kcal, setKcal] = useState(existing ? existing.kcal : "");
  const [prot, setProt] = useState(existing ? existing.prot : "");
  const [fat, setFat] = useState(existing ? existing.fat : "");
  const [carb, setCarb] = useState(existing ? existing.carb : "");
  const [fuente, setFuente] = useState(existing ? existing.fuente || "" : "");

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: existing ? existing.id : "f_" + uid(),
      name: name.trim(),
      kcal: Number(kcal) || 0,
      prot: Number(prot) || 0,
      fat: Number(fat) || 0,
      carb: Number(carb) || 0,
      fuente: fuente.trim() || "Manual",
    });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? "Nuevo alimento" : "Editar alimento"}>
      <Field label="Nombre">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Ej: Pechuga de pollo (cruda)" />
      </Field>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginBottom: 8 }}>
        Valores por cada 100 g de producto (tal como aparecen en la etiqueta).
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Calorías (kcal)">
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Proteína (g)">
          <input type="number" step="0.1" value={prot} onChange={(e) => setProt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Grasa (g)">
          <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Carbohidratos (g)">
          <input type="number" step="0.1" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <Field label="Fuente (opcional)">
        <input value={fuente} onChange={(e) => setFuente(e.target.value)} style={inputStyle} placeholder="Ej: Etiqueta Hacendado" />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">Guardar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmFoodDeleteModal({ food, usedBy, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} title="Eliminar alimento">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        ¿Seguro que quieres eliminar <strong>{food.name}</strong> del catálogo?
      </p>
      {usedBy.length > 0 && (
        <div
          style={{
            background: "var(--rust-soft)", borderLeft: "3px solid var(--rust)", borderRadius: 4,
            padding: "10px 12px", marginTop: 12,
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--rust)",
          }}
        >
          Está enlazado a {usedBy.length} ingrediente{usedBy.length > 1 ? "s" : ""} ({usedBy.map((i) => i.name).join(", ")}).
          Si lo borras, esos ingredientes se quedarán sin macros hasta que los enlaces a otro alimento.
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">Eliminar</ModalBtn>
      </div>
    </ModalShell>
  );
}

// Elementos que pueden participar en una regla de combinación: proteínas (incluidos los miembros
// de bloque, como carne picada o hamburguesas), carbos, verduras y el especial (garbanzos).
// Los platos cerrados, desayunos y meriendas quedan fuera porque no se combinan con nada.
function ruleSelectableItems(ingredients) {
  return ingredients.filter((i) => ["proteina", "carbo", "verdura", "especial"].includes(i.category));
}

function ruleItemLabel(ingredients, id) {
  const ing = ingredients.find((i) => i.id === id);
  return ing ? ing.name : "(alimento eliminado)";
}

function RulesView({ rules, ingredients, onEdit, onNew, onDelete }) {
  return (
    <>
      <SectionIntro text="Reglas de afinidad entre alimentos concretos: haz menos o más probable (o directamente imposible u obligatoria) una combinación de proteína, carbo, verdura o garbanzos dentro de una misma comida." />

      <button
        onClick={onNew}
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: "#fff", background: "var(--green)", border: "none", borderRadius: 9,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
        }}
      >
        <Plus size={15} /> Nueva regla
      </button>

      {rules.length === 0 ? (
        <div style={{
          border: "1.5px dashed var(--line)", borderRadius: 12, padding: "34px 18px",
          textAlign: "center", color: "var(--ink-soft)",
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13,
        }}>
          Todavía no has creado ninguna regla. Las combinaciones se sortean con total libertad hasta que añadas la primera.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((rule) => {
            const meta = RULE_LEVELS[rule.level] || {};
            const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id));
            return (
              <div key={rule.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{names.join(" + ")}</div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <IconBtn onClick={() => onEdit(rule)}><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDelete(rule)}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700,
                    display: "inline-block", padding: "3px 9px", borderRadius: 20, marginTop: 8,
                    background: rule.level === "maxima" ? "var(--green-dark)" : rule.level === "nula" ? "var(--rust-soft)" : rule.level === "alta" ? "var(--green-soft)" : "var(--mustard-soft)",
                    color: rule.level === "maxima" ? "#fff" : rule.level === "nula" ? "var(--rust)" : rule.level === "alta" ? "var(--green-dark)" : "var(--mustard-dark)",
                  }}
                >
                  {meta.label || rule.level}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function RuleEditModal({ state, ingredients, onClose, onSave }) {
  const existing = state.rule;
  const items = ruleSelectableItems(ingredients);
  const [id1, setId1] = useState(existing?.itemIds?.[0] ?? "");
  const [id2, setId2] = useState(existing?.itemIds?.[1] ?? "");
  const [id3, setId3] = useState(existing?.itemIds?.[2] ?? "");
  const [level, setLevel] = useState(existing?.level ?? "alta");

  const chosenIds = [id1, id2, id3].filter(Boolean);
  const valid = id1 && id2 && id1 !== id2 && id2 !== id3 && id1 !== id3;

  function handleSave() {
    if (!valid) return;
    onSave({ id: existing ? existing.id : uid(), itemIds: chosenIds, level });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? "Nueva regla de combinación" : "Editar regla"}>
      <Field label="Elemento 1">
        <select value={id1} onChange={(e) => setId1(e.target.value)} style={inputStyle}>
          <option value="">— Elige —</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Elemento 2">
        <select value={id2} onChange={(e) => setId2(e.target.value)} style={inputStyle}>
          <option value="">— Elige —</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label="Elemento 3 (opcional)">
        <select value={id3} onChange={(e) => setId3(e.target.value)} style={inputStyle}>
          <option value="">— Ninguno —</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>

      <Field label="Nivel de afinidad">
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
          {Object.entries(RULE_LEVELS).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </Field>

      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: -4 }}>
        {level === "nula" && "Esta combinación no podrá salir nunca, salvo que algún día no quede ninguna otra opción posible."}
        {level === "baja" && "Esta combinación seguirá pudiendo salir, pero con mucha menos frecuencia de lo normal."}
        {level === "alta" && "Esta combinación tendrá muchas más probabilidades de salir de lo normal."}
        {level === "maxima" && "Si es posible, el motor intentará que esta combinación se dé siempre que se den sus elementos."}
      </p>

      {!valid && (id1 || id2) && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>
          Elige al menos 2 elementos distintos entre sí.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">Guardar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmRuleDeleteModal({ rule, ingredients, onCancel, onConfirm }) {
  const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id));
  return (
    <ModalShell onClose={onCancel} title="Eliminar regla">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        ¿Seguro que quieres eliminar la regla <strong>{names.join(" + ")}</strong>?
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">Eliminar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function SectionIntro({ text }) {
  return (
    <p
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 13,
        color: "var(--ink-soft)",
        maxWidth: 640,
        margin: "4px 0 18px 0",
        lineHeight: 1.5,
      }}
    >
      {text}
    </p>
  );
}

function ProbabilitySumBadge({ total }) {
  const ok = total === 100;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 12px",
        borderRadius: 20,
        marginBottom: 16,
        background: ok ? "var(--green-soft)" : "var(--rust-soft)",
        color: ok ? "var(--green-dark)" : "var(--rust)",
      }}
    >
      {!ok && <AlertCircle size={13} />}
      Suma actual: {total}% {ok ? "· correcto" : "· debería ser 100%"}
    </div>
  );
}

function CardGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function ruleSummary(ing) {
  if (ing.ruleType === "base") return "Base del menú";
  if (ing.ruleType === "frecuencia") {
    const periodo = ing.freqPeriodo === "ciclo" ? "cada 2 semanas" : "por semana";
    return `${ing.freqCantidad}× ${periodo}`;
  }
  if (ing.ruleType === "probabilidad") return `${ing.probabilidad}% de probabilidad`;
  return "";
}

function IngredientCard({ ingredient, data, onEdit, onDelete, extraNote }) {
  const meta = CATEGORY_META[ingredient.category];
  const m = data ? composedMacros(data, ingredient, 1) : null;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 14px 12px",
        position: "relative",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 15, lineHeight: 1.3 }}>
          {ingredient.name}
          {ingredient.cantidad && (
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", display: "block", marginTop: 2 }}>
              {ingredient.cantidad}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={onEdit}><Pencil size={13} /></IconBtn>
          <IconBtn onClick={onDelete}><Trash2 size={13} /></IconBtn>
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 11.5,
          fontWeight: 700,
          color: meta.color,
          background: meta.bg,
          display: "inline-block",
          padding: "3px 9px",
          borderRadius: 20,
          marginTop: 10,
        }}
      >
        {ruleSummary(ingredient)}
      </div>

      {m ? (
        <div style={{ marginTop: 9 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", marginBottom: 4 }}>
            1 ración = {m.gramos} g
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <MacroPill label="kcal" value={fmt(m.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
            <MacroPill label="P" value={fmt(m.prot)} color="var(--green-dark)" bg="var(--green-soft)" />
            <MacroPill label="G" value={fmt(m.fat)} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
            <MacroPill label="C" value={fmt(m.carb)} color="var(--coffee)" bg="var(--coffee-soft)" />
          </div>
        </div>
      ) : (
        <div style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5,
          color: "var(--ink-soft)", marginTop: 9, display: "flex", alignItems: "center", gap: 4,
        }}>
          <AlertCircle size={11} /> Sin enlazar a la base de datos
        </div>
      )}

      {extraNote && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
          {extraNote}
        </div>
      )}
    </div>
  );
}

function BlockCard({ block, data, members, onUpdateBlock, onEditMember, onDeleteMember, onAddMember, onEditFrequency, showProbabilities }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        background: "var(--card)",
        border: "1.5px dashed var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 15 }}>{block.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--mustard-dark)",
              background: "var(--mustard-soft)",
              padding: "3px 9px",
              borderRadius: 20,
            }}
          >
            Grupo · {block.cicloFrecuencia}× cada 2 semanas
          </div>
          {!block.weeklyPattern && onEditFrequency && (
            <IconBtn onClick={() => onEditFrequency(block)}><Pencil size={11} /></IconBtn>
          )}
        </div>
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", margin: "8px 0 12px 0" }}>
        {block.distribucion}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 13,
            }}
          >
            <span>{m.name}</span>
            {(() => {
              const mm = data ? composedMacros(data, m, 1) : null;
              return mm ? (
                <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>
                  {mm.gramos} g · {fmt(mm.kcal)} kcal
                </span>
              ) : null;
            })()}
            {showProbabilities && (
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--mustard-dark)", fontWeight: 700 }}>
                {m.probabilidad}%
              </span>
            )}
            <IconBtn onClick={() => onEditMember(m)}><Pencil size={11} /></IconBtn>
            <IconBtn onClick={() => onDeleteMember(m)}><Trash2 size={11} /></IconBtn>
          </div>
        ))}
        <button
          onClick={onAddMember}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px dashed var(--line)",
            background: "transparent",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <Plus size={12} /> Añadir al grupo
        </button>
      </div>
    </div>
  );
}

function AddCard({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1.5px dashed var(--line)",
        background: "transparent",
        borderRadius: 10,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "var(--ink-soft)",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 12.5,
        minHeight: 78,
      }}
    >
      <Plus size={18} />
      {label}
    </button>
  );
}

function IconBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: "var(--paper)",
        borderRadius: 7,
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-soft)",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function EditModal({ state, foods = [], onClose, onSave }) {
  const { mode, category, blockId } = state;
  const existing = state.ingredient;
  const [name, setName] = useState(existing ? existing.name : "");
  const [ruleType, setRuleType] = useState(existing ? existing.ruleType : (blockId ? "bloque_miembro" : ["carbo", "verdura", "desayuno", "merienda"].includes(category) ? "probabilidad" : "frecuencia"));
  const [freqCantidad, setFreqCantidad] = useState(existing?.freqCantidad ?? 1);
  const [freqPeriodo, setFreqPeriodo] = useState(existing?.freqPeriodo ?? "semana");
  const [probabilidad, setProbabilidad] = useState(existing?.probabilidad ?? 25);
  const [cantidad, setCantidad] = useState(existing?.cantidad ?? "");
  const [foodId, setFoodId] = useState(existing?.foodId ?? "");
  const [gramos, setGramos] = useState(existing?.gramos ?? "");
  const [composicion, setComposicion] = useState(
    existing?.composicion ? existing.composicion.map((c) => ({ ...c })) : []
  );

  const isBlockMember = category === "cerrado" || !!blockId;
  // Desayuno, merienda y platos cerrados son "platos completos": se componen sumando
  // varios alimentos de la base de datos, en vez de enlazar uno solo directamente.
  const usesComposition = category === "desayuno" || category === "merienda" || (isBlockMember && category === "cerrado");
  const selectedFood = foods.find((f) => f.id === foodId) || null;

  function addComposRow() {
    setComposicion((rows) => [...rows, { id: uid(), foodId: "", gramos: "" }]);
  }
  function updateComposRow(id, patch) {
    setComposicion((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeComposRow(id) {
    setComposicion((rows) => rows.filter((r) => r.id !== id));
  }
  const composTotal = composicion.reduce((acc, row) => {
    const f = foods.find((ff) => ff.id === row.foodId);
    if (!f || !row.gramos) return acc;
    const factor = Number(row.gramos) / 100;
    return { kcal: acc.kcal + f.kcal * factor, prot: acc.prot + f.prot * factor, fat: acc.fat + f.fat * factor, carb: acc.carb + f.carb * factor };
  }, { kcal: 0, prot: 0, fat: 0, carb: 0 });

  // Vista previa en vivo de los macros de una ración, para comprobar que los gramos cuadran
  // antes de guardar, sin tener que ir al menú a verificarlo.
  const preview = selectedFood && gramos
    ? {
        kcal: (selectedFood.kcal * Number(gramos)) / 100,
        prot: (selectedFood.prot * Number(gramos)) / 100,
        fat: (selectedFood.fat * Number(gramos)) / 100,
        carb: (selectedFood.carb * Number(gramos)) / 100,
      }
    : null;

  function handleSave() {
    if (!name.trim()) return;
    const ing = {
      id: existing ? existing.id : uid(),
      name: name.trim(),
      category,
      ruleType: isBlockMember ? "bloque_miembro" : ruleType,
      active: true,
      cantidad: cantidad.trim() || undefined,
      ...(usesComposition
        ? { composicion: composicion.filter((c) => c.foodId && c.gramos).map((c) => ({ id: c.id, foodId: c.foodId, gramos: Number(c.gramos) })) }
        : { foodId: foodId || undefined, gramos: gramos ? Number(gramos) : undefined }),
      ...(existing?.peso !== undefined ? { peso: existing.peso } : {}),
      ...(blockId ? { blockId } : existing?.blockId ? { blockId: existing.blockId } : {}),
    };
    if (!isBlockMember && ruleType === "frecuencia") {
      ing.freqCantidad = Number(freqCantidad);
      ing.freqPeriodo = freqPeriodo;
    }
    if ((!isBlockMember && ruleType === "probabilidad") || (isBlockMember && category === "cerrado")) {
      ing.probabilidad = Number(probabilidad);
    }
    onSave(ing);
  }

  return (
    <ModalShell onClose={onClose} title={mode === "new" ? "Añadir" : "Editar"}>
      <Field label="Nombre">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder="Ej: Salmón"
        />
      </Field>

      {usesComposition ? (
        <div
          style={{
            background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
            padding: "11px 12px", marginBottom: 12,
          }}
        >
          <div style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700,
            color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5,
            marginBottom: 9, display: "flex", alignItems: "center", gap: 5,
          }}>
            <Link2 size={12} /> Ingredientes de este plato
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {composicion.map((row) => {
              const f = foods.find((ff) => ff.id === row.foodId);
              const rowKcal = f && row.gramos ? fmt((f.kcal * Number(row.gramos)) / 100) : null;
              return (
                <div key={row.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 9px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      value={row.foodId}
                      onChange={(e) => updateComposRow(row.id, { foodId: e.target.value })}
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    >
                      <option value="">— Elige un alimento —</option>
                      {foods.map((ff) => (
                        <option key={ff.id} value={ff.id}>{ff.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={row.gramos}
                      onChange={(e) => updateComposRow(row.id, { gramos: e.target.value })}
                      placeholder="g"
                      style={{ ...inputStyle, width: 62, flexShrink: 0 }}
                    />
                    <IconBtn onClick={() => removeComposRow(row.id)}><Trash2 size={12} /></IconBtn>
                  </div>
                  {rowKcal !== null && (
                    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 5 }}>
                      {rowKcal} kcal
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addComposRow}
            style={{
              display: "flex", alignItems: "center", gap: 6, border: "1px dashed var(--line)",
              background: "transparent", borderRadius: 7, padding: "7px 10px", fontSize: 12.5,
              color: "var(--ink-soft)", fontFamily: "'Helvetica Neue', Arial, sans-serif", marginBottom: 10,
            }}
          >
            <Plus size={12} /> Añadir ingrediente
          </button>

          {composicion.length > 0 ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", alignSelf: "center", marginRight: 2 }}>
                Total del plato:
              </span>
              <MacroPill label="kcal" value={fmt(composTotal.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
              <MacroPill label="P" value={`${fmt(composTotal.prot)} g`} color="var(--green-dark)" bg="var(--green-soft)" />
              <MacroPill label="G" value={`${fmt(composTotal.fat)} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
              <MacroPill label="C" value={`${fmt(composTotal.carb)} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
            </div>
          ) : (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              Añade al menos un ingrediente para calcular los macros de este plato.
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
            padding: "11px 12px", marginBottom: 12,
          }}
        >
          <div style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700,
            color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5,
            marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
          }}>
            <Link2 size={12} /> Datos nutricionales
          </div>

          <Field label="Alimento de la base de datos">
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)} style={inputStyle}>
              <option value="">— Sin enlazar —</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Gramos por ración (1.0)">
            <input
              type="number"
              min={0}
              value={gramos}
              onChange={(e) => setGramos(e.target.value)}
              style={inputStyle}
              placeholder="Ej: 150"
            />
          </Field>

          {preview ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
              <MacroPill label="kcal" value={fmt(preview.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
              <MacroPill label="P" value={`${fmt(preview.prot)} g`} color="var(--green-dark)" bg="var(--green-soft)" />
              <MacroPill label="G" value={`${fmt(preview.fat)} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
              <MacroPill label="C" value={`${fmt(preview.carb)} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
            </div>
          ) : (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              Enlaza un alimento y pon los gramos para ver los macros de una ración.
            </div>
          )}
        </div>
      )}

      <Field label="Nota de cantidad (opcional)">
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={inputStyle}
          placeholder='Ej: 2 filetes, 1 taza…'
        />
      </Field>

      {!isBlockMember && category === "proteina" && (
        <Field label="Tipo de regla">
          <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} style={inputStyle}>
            <option value="frecuencia">Frecuencia fija</option>
            <option value="base">Base del menú (sin frecuencia, relleno)</option>
          </select>
        </Field>
      )}

      {!isBlockMember && ruleType === "frecuencia" && (
        <Field label="Frecuencia">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min={1}
              value={freqCantidad}
              onChange={(e) => setFreqCantidad(e.target.value)}
              style={{ ...inputStyle, width: 70 }}
            />
            <select value={freqPeriodo} onChange={(e) => setFreqPeriodo(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="semana">por semana</option>
              <option value="ciclo">cada 2 semanas</option>
            </select>
          </div>
        </Field>
      )}

      {!isBlockMember && ruleType === "probabilidad" && (
        <Field label="Probabilidad (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={probabilidad}
            onChange={(e) => setProbabilidad(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      {isBlockMember && category === "cerrado" && (
        <Field label="Probabilidad dentro del grupo (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={probabilidad}
            onChange={(e) => setProbabilidad(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onClose} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">Guardar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ ingredient, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} title="Eliminar">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>
        ¿Seguro que quieres eliminar <strong>{ingredient.name}</strong>? Dejará de aparecer en los menús generados.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onCancel} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">Eliminar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function FrequencyModal({ block, onClose, onSave }) {
  const [value, setValue] = useState(block.cicloFrecuencia);
  return (
    <ModalShell onClose={onClose} title={`Frecuencia de "${block.name}"`}>
      <Field label="Veces cada 2 semanas (ciclo)">
        <input
          type="number"
          min={1}
          max={28}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginTop: -4 }}>
        Ej: para que aparezca 1 vez por semana, pon 2 (2 veces cada 2 semanas). Con un número par, se garantiza mitad en cada semana, nunca las dos juntas.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onClose} variant="ghost">Cancelar</ModalBtn>
        <ModalBtn onClick={() => onSave(Number(value) || 1)} variant="solid">Guardar</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, title }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(31,77,56,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)",
          borderRadius: 14,
          padding: "20px 22px 22px",
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 17 }}>{title}</div>
          <IconBtn onClick={onClose}><X size={14} /></IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 7,
  border: "1px solid var(--line)",
  fontSize: 13.5,
  background: "#fff",
  color: "var(--ink)",
};

function ModalBtn({ children, onClick, variant }) {
  const styles = {
    ghost: { background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)" },
    solid: { background: "var(--green)", color: "#fff", border: "none" },
    danger: { background: "var(--rust)", color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        borderRadius: 8,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RuedaDePlatos />);
