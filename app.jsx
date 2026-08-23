import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, X, Check, Utensils, Wheat, Salad, Package, Sparkles, AlertCircle, CalendarDays, Shuffle, Coffee, Cookie, Database, Search, Link2, Download, Layers, Camera, User, Droplet, Scale, Ruler, FileText } from "lucide-react";
import { getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt } from "macros";
import { weightedPick, allocateCounts, shuffle, clamp, RULE_LEVELS, ruleModifier, pickWithRules, sampleIndicesWithRules } from "seleccion";
import { mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra } from "comida-calculo";
export { calcularListaCompra };
import { PAL_BASE_NIVELES, TIPOS_ENTRENAMIENTO, NIVELES_ACTIVIDAD_LEGACY, OBJETIVO_ETAPAS, REPARTO_COMIDAS, calcularObjetivosPerfil, objetivosPorComida } from "objetivos";
export { calcularObjetivosPerfil };
import { uid, DAYS } from "comun";
import { generateMenu, lastPicksFromHistory } from "menu-generador";
import {
  DIAS_SEMANA_CORTO, DIAS_SUGERIDOS_PESO, PESO_FRECUENCIAS, PESO_DURACIONES, MOTIVOS_CAMBIO_PESO,
  defaultPesoTracking, RANGOS_PROGRESION, fechaISO, formatFechaCorta, descargarDatosJSON,
  esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia,
} from "peso";
export { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia };

// ---------- Datos iniciales (todo lo acordado hasta ahora) ----------

// ---------- Base de datos de alimentos (macros por 100 g) ----------
// Ids fijos (no aleatorios) para que las migraciones puedan reconocerlos entre versiones.
// "fuente" indica de dónde sale el dato: etiqueta real de producto o valor estándar contrastado.
const FOODS_SEED = [
  // Proteínas
  { id: "f_pechuga_pollo", name: "Pechuga de pollo (cruda)", kcal: 165, prot: 31, fat: 3.6, carb: 0, sal: 0.1, azucares: 0, fibra: 0, grasaSaturada: 1, fuente: "Estándar" },
  { id: "f_hamb_pollo", name: "Hamburguesa de pollo (Hacendado)", kcal: 144, prot: 17, fat: 7, carb: 3, fuente: "Etiqueta" },
  { id: "f_picada_pollo", name: "Carne picada de pollo (Hacendado)", kcal: 124, prot: 16.6, fat: 5.3, carb: 1, fuente: "Etiqueta" },
  { id: "f_picada_mixta", name: "Carne picada ternera/cerdo", kcal: 163, prot: 17, fat: 9.5, carb: 1, fuente: "Etiqueta (media)" },
  { id: "f_hamb_mixta", name: "Hamburguesa ternera/cerdo (Hacendado)", kcal: 226, prot: 18, fat: 17, carb: 2, fuente: "Etiqueta" },
  { id: "f_salmon", name: "Salmón (crudo)", kcal: 144, prot: 20, fat: 12, carb: 0, sal: 0.1, azucares: 0, fibra: 0, fuente: "Estándar" },
  { id: "f_merluza", name: "Merluza / pescada (Hacendado)", kcal: 82, prot: 18, fat: 1.5, carb: 0.5, sal: 0.24, azucares: 0.5, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_atun", name: "Atún al natural (escurrido)", kcal: 105, prot: 22.5, fat: 1.2, carb: 0, fuente: "Etiqueta" },
  { id: "f_sardinas", name: "Sardinas en aceite de oliva (escurridas)", kcal: 207, prot: 24, fat: 14, carb: 0, fuente: "Etiqueta" },
  { id: "f_pavo", name: "Pechuga de pavo fiambre (El Pozo)", kcal: 90, prot: 20.3, fat: 1.5, carb: 0, sal: 1.8, azucares: 0, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_jamon", name: "Jamón curado (Navidul)", kcal: 212, prot: 30, fat: 10, carb: 0.5, sal: 5, azucares: 0.5, fibra: 0, grasaSaturada: 3.8, fuente: "Etiqueta" },
  { id: "f_lomo", name: "Lomo embuchado (Boadas)", kcal: 203, prot: 35, fat: 7, carb: 0.7, sal: 3.5, azucares: 0.7, fibra: 0, grasaSaturada: 2.2, fuente: "Etiqueta" },
  { id: "f_huevo", name: "Huevo entero (crudo)", kcal: 140, prot: 12.7, fat: 9.5, carb: 0.3, sal: 0, azucares: 0.27, fibra: 0, grasaSaturada: 2.64, fuente: "Etiqueta" },

  // Carbohidratos
  { id: "f_pasta", name: "Pasta / macarrón (cruda, Hacendado)", kcal: 357, prot: 11, fat: 1.5, carb: 70, sal: 0.1, azucares: 3.5, fibra: 4, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_arroz_basmati", name: "Arroz basmati (crudo, Hacendado)", kcal: 353, prot: 8.06, fat: 1, carb: 78, sal: 0, azucares: 0.17, fibra: 0.92, grasaSaturada: 0.19, fuente: "Etiqueta" },
  { id: "f_patata", name: "Patata (cruda)", kcal: 77, prot: 2, fat: 0.1, carb: 17, sal: 0.01, azucares: 1, fibra: 2, fuente: "Estándar" },
  { id: "f_gnocchi", name: "Gnocchi (fresco, Ifa Eliges)", kcal: 156, prot: 3, fat: 0.5, carb: 30, sal: 0.63, azucares: 0.5, fibra: 1.9, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_garbanzos_cocidos", name: "Garbanzos cocidos (bote)", kcal: 119, prot: 6.5, fat: 2.6, carb: 16, fibra: 5, fuente: "Estándar" },
  { id: "f_pan_molde", name: "Pan de molde natural (Hacendado)", kcal: 265, prot: 9.1, fat: 3.5, carb: 48, sal: 1.1, azucares: 3.8, fibra: 1.2, grasaSaturada: 0.6, fuente: "Etiqueta" },
  { id: "f_pan_brioche", name: "Pan hamburguesa brioche (Hacendado)", kcal: 340, prot: 11, fat: 8, carb: 55, sal: 0.86, azucares: 11, fibra: 2, grasaSaturada: 2.2, fuente: "Etiqueta" },
  { id: "f_cereales_cacao", name: "Cereales de cacao (Hacendado)", kcal: 389, prot: 13, fat: 5, carb: 70, sal: 0.6, azucares: 9, fibra: 9.5, grasaSaturada: 1.5, fuente: "Etiqueta" },

  // Verduras y acompañamientos
  { id: "f_ensalada", name: "Ensalada variada (hoja, tomate, etc.)", kcal: 25, prot: 1.5, fat: 0.3, carb: 3.5, fibra: 1.5, fuente: "Estándar" },
  { id: "f_tomate", name: "Tomate (crudo)", kcal: 18, prot: 0.9, fat: 0.2, carb: 3.9, azucares: 2.6, fibra: 1.2, fuente: "Estándar" },
  { id: "f_pimiento", name: "Pimiento (crudo)", kcal: 27, prot: 1, fat: 0.3, carb: 6, azucares: 4.2, fibra: 2.1, fuente: "Estándar" },
  { id: "f_cebolla", name: "Cebolla (cruda)", kcal: 40, prot: 1.1, fat: 0.1, carb: 9.3, azucares: 4.2, fibra: 1.7, fuente: "Estándar" },
  { id: "f_pure_verduras", name: "Puré de verduras", kcal: 55, prot: 1.5, fat: 1.5, carb: 8, fuente: "Estándar" },

  // Lácteos y otros
  { id: "f_queso_cottage", name: "Queso cottage (Ifa Eliges)", kcal: 66, prot: 12, fat: 1.5, carb: 2, sal: 0.6, azucares: 2, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_yogur_prot", name: "Yogur proteínas (Hacendado)", kcal: 52, prot: 10, fat: 0.3, carb: 3.1, sal: 0.1, azucares: 3.1, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_mozzarella", name: "Queso rallado mozzarella (Ifa Eliges)", kcal: 285, prot: 21, fat: 21, carb: 0.8, sal: 1, azucares: 0.8, fibra: 0, grasaSaturada: 14, fuente: "Etiqueta" },
  { id: "f_aove", name: "Aceite de oliva virgen extra", kcal: 900, prot: 0, fat: 100, carb: 0, sal: 0, azucares: 0, fibra: 0, grasaSaturada: 14, fuente: "Estándar" },
  { id: "f_cafe_leche", name: "Café con leche (taza 200 ml)", kcal: 33, prot: 1.5, fat: 1.2, carb: 2.5, fuente: "Estándar (por 100 ml)" },

  // Frutos secos y snacks
  { id: "f_anacardos", name: "Anacardos naturales sin sal", kcal: 589, prot: 17.5, fat: 45, carb: 31, sal: 0, azucares: 6, fibra: 3.3, grasaSaturada: 8, fuente: "Estándar" },
  { id: "f_pistachos", name: "Pistachos naturales sin sal", kcal: 580, prot: 19, fat: 48, carb: 21, sal: 0, azucares: 8, fibra: 10, grasaSaturada: 6, fuente: "Estándar" },
  { id: "f_cacahuete_polvo", name: "Cacahuete en polvo desgrasado (Eroski)", kcal: 470, prot: 47, fat: 8, carb: 24, sal: 0, azucares: 8.8, fibra: 14, grasaSaturada: 2, fuente: "Etiqueta" },
  { id: "f_choco85", name: "Chocolate negro 85%", kcal: 600, prot: 9, fat: 46, carb: 20, azucares: 16, grasaSaturada: 26, fuente: "Estándar" },
  { id: "f_nachos", name: "Nachos (Ifa Eliges)", kcal: 486, prot: 5.1, fat: 22, carb: 65, azucares: 1.2, fibra: 4.8, grasaSaturada: 2.5, fuente: "Etiqueta" },
  { id: "f_guacamole", name: "Guacamole fresco (Ifa Eliges)", kcal: 182, prot: 1.8, fat: 16, carb: 8, sal: 1.3, azucares: 1.4, fibra: 3.2, grasaSaturada: 2.4, fuente: "Etiqueta" },
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
    pesoTracking: defaultPesoTracking(),
    listaCompra: { marcados: {}, generadoEn: null },
  };
};

const CATEGORY_META = {
  proteina: { label: "Proteínas", icon: Utensils, color: "var(--green)", bg: "var(--green-soft)" },
  carbo: { label: "Carbohidratos", icon: Wheat, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
  verdura: { label: "Verduras", icon: Salad, color: "var(--green)", bg: "var(--green-soft)" },
  grasa: { label: "Grasas", icon: Droplet, color: "var(--olive)", bg: "var(--olive-soft)" },
  desayuno: { label: "Desayuno", icon: Coffee, color: "var(--coffee)", bg: "var(--coffee-soft)" },
  merienda: { label: "Merienda", icon: Cookie, color: "var(--berry)", bg: "var(--berry-soft)" },
  cerrado: { label: "Platos cerrados", icon: Package, color: "var(--rust)", bg: "var(--rust-soft)" },
  especial: { label: "Especiales", icon: Sparkles, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
};

const STORAGE_KEY = "rueda-de-platos:data-v1";
const MENU_STORAGE_KEY = "rueda-de-platos:menu-v1";
const HISTORY_STORAGE_KEY = "rueda-de-platos:history-v1";
const HISTORY_MAX = 8;

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

    // Alimentos que ya existían antes de añadir sal/azúcares/fibra/grasa saturada al catálogo:
    // se completan solo esos campos nuevos si faltan, sin tocar kcal/proteína/grasa/carbohidratos
    // por si el usuario ya los había editado a mano.
    const seedById = {};
    FOODS_SEED.forEach((f) => { seedById[f.id] = f; });
    const EXTRA_FIELDS = ["sal", "azucares", "fibra", "grasaSaturada"];
    data.foods.forEach((food) => {
      const seed = seedById[food.id];
      if (!seed) return;
      EXTRA_FIELDS.forEach((field) => {
        if (food[field] === undefined && seed[field] !== undefined) {
          food[field] = seed[field];
          changed = true;
        }
      });
    });
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

  // Seguimiento de peso: perfiles guardados antes de esta función no tienen este campo.
  if (!data.pesoTracking) {
    data.pesoTracking = defaultPesoTracking();
    changed = true;
  } else if (!Array.isArray(data.pesoTracking.historial)) {
    // Perfiles que ya tenían seguimiento de peso antes de que el historial fuera permanente.
    data.pesoTracking.historial = [];
    changed = true;
  }

  // Lista de la compra: guarda qué se ha ido marcando, ligado al último menú generado.
  if (!data.listaCompra) {
    data.listaCompra = { marcados: {}, generadoEn: null };
    changed = true;
  }

  return { data, changed };
}

// Cálculo de macros (getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt) vive en
// macros.js; el cálculo de comidas (mealComponents, mealTotals, dayTotals, mealExportParts,
// calcularListaCompra) vive en comida-calculo.js. Ambos importados arriba.

// generateMenu y lastPicksFromHistory viven ahora en menu-generador.js (módulo sin JSX,
// importado arriba), junto con las utilidades de sorteo (seleccion.js), el cálculo de
// comidas (comida-calculo.js) y los objetivos nutricionales (objetivos.js).

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
    // Un menú nuevo es una lista de la compra nueva: se olvidan las marcas de la anterior.
    setData((prev) => ({ ...prev, listaCompra: { marcados: {}, generadoEn: entry.generatedAt } }));
  }

  function toggleMarcadoCompra(key) {
    setData((prev) => {
      const lc = prev.listaCompra || { marcados: {}, generadoEn: null };
      const marcados = { ...lc.marcados };
      if (marcados[key]) delete marcados[key];
      else marcados[key] = true;
      return { ...prev, listaCompra: { ...lc, marcados } };
    });
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

  if (!data.perfilOnboardingDone) {
    return (
      <Shell>
        <ProfileOnboarding onComplete={savePerfil} onSkip={skipPerfil} />
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

  // Guarda el perfil (datos personales) y marca que la pantalla de bienvenida ya no debe repetirse,
  // tanto si se rellena como si se salta explícitamente. Al guardar el perfil, se recalculan
  // los objetivos automáticamente a partir de él. Si la etapa (mantenimiento/volumen/definición)
  // cambia respecto a la guardada, se resetea la calibración por peso — estaba pensada para la
  // intensidad de la etapa anterior, no debe arrastrarse a una nueva sin querer.
  function savePerfil(perfil) {
    setData((prev) => {
      const objetivoCambiado = (prev.perfil?.objetivo || "mantenimiento") !== (perfil.objetivo || "mantenimiento");
      const perfilFinal = { ...perfil, calibracionKcal: objetivoCambiado ? 0 : (prev.perfil?.calibracionKcal || 0) };
      const objetivosCalculados = calcularObjetivosPerfil(perfilFinal);
      return {
        ...prev,
        perfil: perfilFinal,
        perfilOnboardingDone: true,
        objetivos: objetivosCalculados || prev.objetivos,
      };
    });
  }
  function skipPerfil() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: true }));
  }

  // ---------- Seguimiento de peso ----------
  // Añade (o corrige, si ya hay una pesada guardada hoy) la pesada del día. Si es la primera del
  // ciclo, arranca el ciclo en la fecha de hoy.
  function addPesoEntrada(peso, atipico, motivo) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      const idx = pt.entradas.findIndex((e) => e.fecha === hoyISO);
      const entrada = { id: idx >= 0 ? pt.entradas[idx].id : uid(), fecha: hoyISO, peso, atipico: !!atipico, motivo: motivo || "" };
      const entradas = idx >= 0 ? pt.entradas.map((e, i) => (i === idx ? entrada : e)) : [...pt.entradas, entrada];
      return {
        ...prev,
        pesoTracking: { ...pt, entradas, cicloInicio: pt.cicloInicio || hoyISO },
      };
    });
  }

  function actualizarConfigPeso(patch) {
    setData((prev) => ({
      ...prev,
      pesoTracking: { ...(prev.pesoTracking || defaultPesoTracking()), ...patch },
    }));
  }

  function descartarRecordatorioHoy() {
    setData((prev) => ({
      ...prev,
      pesoTracking: { ...(prev.pesoTracking || defaultPesoTracking()), recordatorioDescartadoFecha: fechaISO(new Date()) },
    }));
  }

  // Cierra el ciclo actual: calcula la tendencia real; si se decide aplicar el ajuste sugerido, lo
  // suma a la calibración existente (nunca cambia de etapa, solo afina dentro de ella); si se decide
  // actualizar el peso del perfil, se usa la última pesada normal (no atípica) del ciclo. Las pesadas
  // del ciclo pasan al historial permanente (nunca se borran) y se vacía el ciclo activo para el siguiente.
  function cerrarCicloPeso({ aplicarKcal, actualizarPeso }) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const tendencia = calcularTendenciaPeso(pt.entradas);
      const evaluacion = tendencia ? evaluarTendencia(tendencia.pctSemana, prev.perfil?.objetivo) : null;
      const aplicaKcal = aplicarKcal && evaluacion && evaluacion.sugerenciaKcal;

      const ultimaNormal = [...pt.entradas].reverse().find((e) => !e.atipico);
      const aplicaPeso = actualizarPeso && ultimaNormal;

      let perfilNuevo = prev.perfil;
      if (aplicaKcal || aplicaPeso) {
        perfilNuevo = { ...prev.perfil };
        if (aplicaKcal) perfilNuevo.calibracionKcal = (prev.perfil?.calibracionKcal || 0) + evaluacion.sugerenciaKcal;
        if (aplicaPeso) perfilNuevo.peso = ultimaNormal.peso;
      }

      const cicloArchivado = {
        inicio: pt.cicloInicio,
        fin: fechaISO(new Date()),
        pctSemana: tendencia ? tendencia.pctSemana : null,
        nivel: evaluacion ? evaluacion.nivel : null,
        ajusteKcalAplicado: aplicaKcal ? evaluacion.sugerenciaKcal : 0,
        pesoActualizado: !!aplicaPeso,
      };

      // Si el perfil cambió (peso y/o calibración), los objetivos guardados se recalculan ya mismo,
      // igual que al guardar el perfil a mano — si no, el motor de menú y las gráficas seguirían
      // usando el objetivo antiguo hasta la próxima visita a "Datos personales".
      const objetivosNuevos = perfilNuevo !== prev.perfil ? calcularObjetivosPerfil(perfilNuevo) : null;

      return {
        ...prev,
        perfil: perfilNuevo,
        objetivos: objetivosNuevos || prev.objetivos,
        pesoTracking: {
          ...pt,
          entradas: [],
          historial: [...(pt.historial || []), ...pt.entradas],
          cicloInicio: null,
          recordatorioDescartadoFecha: null,
          historialCiclos: [cicloArchivado, ...(pt.historialCiclos || [])].slice(0, 12),
        },
      };
    });
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
  const grasaTotal = itemsInCategory("grasa").reduce((s, i) => s + (i.probabilidad || 0), 0);
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
            onToggleMarcadoCompra={toggleMarcadoCompra}
          />
        )}

        {tab === "config-root" && (
          <BigCardGrid
            onSelect={setTab}
            cards={[
              { key: "macros-root", label: "Macros", desc: "proteína, carbo, verdura, grasa", icon: Utensils, color: "var(--green)" },
              { key: "especiales-root", label: "Comidas especiales", desc: "desayuno, merienda, cerrados", icon: Package, color: "var(--rust)" },
              { key: "combos", label: "Combinaciones", desc: "reglas entre alimentos", icon: Layers, color: "var(--olive)" },
              { key: "alimentos", label: "Alimentos", desc: "catálogo con macros", icon: Database, color: "var(--coffee)" },
            ]}
          />
        )}

        {tab === "macros-root" && (
          <>
            <BackLink label="Configuración" onClick={() => setTab("config-root")} />
            <BigCardGrid
              onSelect={setTab}
              cards={MACRO_CATS.map((key) => ({ key, label: CATEGORY_META[key].label, icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
            />
          </>
        )}

        {tab === "especiales-root" && (
          <>
            <BackLink label="Configuración" onClick={() => setTab("config-root")} />
            <BigCardGrid
              onSelect={setTab}
              cards={ESPECIALES_CATS.map((key) => ({ key, label: CATEGORY_META[key].label, icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
            />
          </>
        )}

        {tab === "proteina" && (
          <>
            <BackLink label="Macros" onClick={() => setTab("macros-root")} />
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
            <BackLink label="Macros" onClick={() => setTab("macros-root")} />
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
            <BackLink label="Macros" onClick={() => setTab("macros-root")} />
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

        {tab === "grasa" && (
          <>
            <BackLink label="Macros" onClick={() => setTab("macros-root")} />
            <SectionIntro text="Opciones de grasa (aceite, aguacate, frutos secos, queso...). Cuando el motor de objetivos necesite completar grasa en una comida, sorteará entre estas por probabilidad — si no añades ninguna, seguirá usando aceite de oliva por defecto." />
            <ProbabilitySumBadge total={grasaTotal} />
            <CardGrid>
              {itemsInCategory("grasa").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "grasa", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              <AddCard label="Añadir grasa" onClick={() => setEditing({ mode: "new", category: "grasa" })} />
            </CardGrid>
          </>
        )}

        {tab === "desayuno" && (
          <>
            <BackLink label="Comidas especiales" onClick={() => setTab("especiales-root")} />
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
            <BackLink label="Comidas especiales" onClick={() => setTab("especiales-root")} />
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
            <BackLink label="Comidas especiales" onClick={() => setTab("especiales-root")} />
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
            <BackLink label="Comidas especiales" onClick={() => setTab("especiales-root")} />
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
          <div>
            <BackLink label="Configuración" onClick={() => setTab("config-root")} />
          <FoodsView
            foods={data.foods || []}
            ingredients={data.ingredients}
            onEdit={(food) => setEditingFood({ mode: "edit", food })}
            onNew={() => setEditingFood({ mode: "new" })}
            onNewFromPhoto={(photoDataUrl) => setEditingFood({ mode: "new", photo: photoDataUrl })}
            onDelete={(food) => setConfirmDeleteFood(food)}
          />
          </div>
        )}

        {tab === "combos" && (
          <div>
            <BackLink label="Configuración" onClick={() => setTab("config-root")} />
          <RulesView
            rules={data.rules || []}
            ingredients={data.ingredients}
            onEdit={(rule) => setEditingRule({ mode: "edit", rule })}
            onNew={() => setEditingRule({ mode: "new" })}
            onDelete={(rule) => setConfirmDeleteRule(rule)}
          />
          </div>
        )}

        {tab === "perfil-root" && (
          <>
            <BigCardGrid
              onSelect={setTab}
              cards={[
                { key: "perfil-datos", label: "Datos personales", desc: "perfil y objetivos", icon: User, color: "var(--green)" },
                { key: "perfil-peso", label: "Seguimiento de peso", desc: "pesadas y tendencia", icon: Scale, color: "var(--coffee)" },
                { key: "perfil-medidas", label: "Medidas corporales", desc: "próximamente", icon: Ruler, color: "var(--berry)" },
                { key: "perfil-documentos", label: "Documentos", desc: "por qué funciona así", icon: FileText, color: "var(--olive)" },
              ]}
            />
            <button
              onClick={() => descargarDatosJSON(data)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                cursor: "pointer", padding: 0, marginTop: 18,
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
              }}
            >
              <Download size={13} /> Descargar una copia de mis datos
            </button>
          </>
        )}

        {tab === "perfil-datos" && (
          <>
            <BackLink label="Perfil" onClick={() => setTab("perfil-root")} />
            <PerfilView perfil={data.perfil} onSave={savePerfil} />
          </>
        )}

        {tab === "perfil-peso" && (
          <>
            <BackLink label="Perfil" onClick={() => setTab("perfil-root")} />
            <PesoView
              perfil={data.perfil}
              pesoTracking={data.pesoTracking || defaultPesoTracking()}
              onAddPeso={addPesoEntrada}
              onUpdateConfig={actualizarConfigPeso}
              onDismissReminder={descartarRecordatorioHoy}
              onCerrarCiclo={cerrarCicloPeso}
            />
          </>
        )}

        {tab === "perfil-medidas" && (
          <>
            <BackLink label="Perfil" onClick={() => setTab("perfil-root")} />
            <MedidasPlaceholderView />
          </>
        )}

        {tab === "perfil-documentos" && (
          <>
            <BackLink label="Perfil" onClick={() => setTab("perfil-root")} />
            <DocumentosView />
          </>
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

// PAL_BASE_NIVELES, TIPOS_ENTRENAMIENTO, OBJETIVO_ETAPAS, REPARTO_COMIDAS, calcularObjetivosPerfil
// y objetivosPorComida viven ahora en objetivos.js (módulo sin JSX, importado arriba).

// Todo el bloque de seguimiento de peso (constantes, defaultPesoTracking, fechaISO,
// formatFechaCorta, descargarDatosJSON, esDiaSugeridoPeso, esCambioRadical,
// regresionLinealSimple, calcularTendenciaPeso, evaluarTendencia) vive ahora en peso.js
// (módulo sin JSX, importado arriba).

// Pantalla de bienvenida: se muestra una única vez (o hasta que se rellene o se salte explícitamente).
// A partir de aquí, estos datos solo se tocan desde la pestaña "Perfil".
// Campos del perfil (compartidos entre la pantalla de bienvenida y la pestaña "Perfil" de edición),
// para no mantener dos formularios duplicados con el riesgo de que se desincronicen.
function ProfileFields({
  nombre, setNombre, sexo, setSexo, anioNacimiento, setAnioNacimiento, altura, setAltura, peso, setPeso,
  palBase, setPalBase, entrenamientos, setEntrenamientos, objetivo, setObjetivo,
}) {
  function addEntrenamiento() {
    setEntrenamientos((rows) => [...rows, { id: uid(), tipo: TIPOS_ENTRENAMIENTO[0].key, horas: 1, frecuenciaSemanal: 1 }]);
  }
  function updateEntrenamiento(id, patch) {
    setEntrenamientos((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeEntrenamiento(id) {
    setEntrenamientos((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <>
      <Field label="Nombre (opcional)">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} placeholder="¿Cómo te llamas?" />
      </Field>

      <Field label="Sexo">
        <div style={{ display: "flex", gap: 8 }}>
          {[["mujer", "Mujer"], ["hombre", "Hombre"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSexo(key)}
              style={{
                flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
                padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)",
                background: sexo === key ? "var(--green-dark)" : "#fff",
                color: sexo === key ? "#fff" : "var(--ink)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="Año de nacimiento">
          <input type="number" min={1926} max={2012} value={anioNacimiento} onChange={(e) => setAnioNacimiento(e.target.value)} style={inputStyle} placeholder="Ej: 1995" />
        </Field>
        <Field label="Altura">
          <input type="number" min={100} max={230} value={altura} onChange={(e) => setAltura(e.target.value)} style={inputStyle} placeholder="cm" />
        </Field>
        <Field label="Peso">
          <input type="number" min={30} max={250} step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} style={inputStyle} placeholder="kg" />
        </Field>
      </div>

      <Field label="Tipo de día a día (sin contar el entrenamiento)">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PAL_BASE_NIVELES.map((n) => (
            <button
              key={n.key}
              onClick={() => setPalBase(n.key)}
              style={{
                textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif",
                padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
                background: palBase === n.key ? "var(--green-soft)" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: palBase === n.key ? "var(--green-dark)" : "var(--ink)" }}>{n.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{n.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Entrenamientos habituales (opcional)">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {entrenamientos.map((row) => (
            <div key={row.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 9px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  value={row.tipo}
                  onChange={(e) => updateEntrenamiento(row.id, { tipo: e.target.value })}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                >
                  {TIPOS_ENTRENAMIENTO.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <IconBtn onClick={() => removeEntrenamiento(row.id)}><Trash2 size={12} /></IconBtn>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  type="number" min={0} step="0.25" value={row.horas}
                  onChange={(e) => updateEntrenamiento(row.id, { horas: e.target.value })}
                  placeholder="Horas/sesión" style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="number" min={0} max={7} value={row.frecuenciaSemanal}
                  onChange={(e) => updateEntrenamiento(row.id, { frecuenciaSemanal: e.target.value })}
                  placeholder="Veces/semana" style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addEntrenamiento}
          style={{
            display: "flex", alignItems: "center", gap: 6, border: "1px dashed var(--line)",
            background: "transparent", borderRadius: 7, padding: "7px 10px", fontSize: 12.5,
            color: "var(--ink-soft)", fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <Plus size={12} /> Añadir entrenamiento
        </button>
      </Field>

      <Field label="Objetivo actual">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.keys(OBJETIVO_ETAPAS).map((key) => {
            const etapa = OBJETIVO_ETAPAS[key];
            return (
              <button
                key={key}
                onClick={() => setObjetivo(key)}
                style={{
                  textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
                  background: objetivo === key ? "var(--green-soft)" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: objetivo === key ? "var(--green-dark)" : "var(--ink)" }}>{etapa.label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{etapa.desc}</div>
              </button>
            );
          })}
        </div>
      </Field>

      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)",
          background: "var(--paper)", borderRadius: 8, padding: "10px 12px", marginTop: 4, lineHeight: 1.5,
        }}
      >
        El cálculo usa la <strong>fórmula de Mifflin-St Jeor</strong> para tu día a día, y suma aparte
        las kcal de tus entrenamientos habituales (vía METs), para no sobreestimar tu gasto si tu día a día
        es sedentario aunque entrenes varios días por semana. Ningún cálculo sin laboratorio es exacto
        al 100% — el objetivo de esta app no es la precisión absoluta, sino ayudarte a tener una relación
        más sana con la comida, sin tener que pensarla desde cero.
      </div>
    </>
  );
}

function ProfileOnboarding({ onComplete, onSkip }) {
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState("mujer");
  const [anioNacimiento, setAnioNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [palBase, setPalBase] = useState("escritorio");
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [objetivo, setObjetivo] = useState("mantenimiento");

  const valid = anioNacimiento && altura && peso;

  function handleSave() {
    if (!valid) return;
    onComplete({
      nombre: nombre.trim(),
      sexo,
      anioNacimiento: Number(anioNacimiento),
      altura: Number(altura),
      peso: Number(peso),
      palBase,
      entrenamientos: entrenamientos
        .filter((e) => e.horas && e.frecuenciaSemanal)
        .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
      objetivo,
    });
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🍽️</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, color: "var(--green-dark)", margin: "0 0 6px 0" }}>
          Antes de empezar
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          Con estos datos, la app puede calcular tus objetivos diarios de calorías y macros. Es completamente opcional.
        </p>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px" }}>
        <ProfileFields
          nombre={nombre} setNombre={setNombre}
          sexo={sexo} setSexo={setSexo}
          anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
          altura={altura} setAltura={setAltura}
          peso={peso} setPeso={setPeso}
          palBase={palBase} setPalBase={setPalBase}
          entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos}
          objetivo={objetivo} setObjetivo={setObjetivo}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          <button
            onClick={handleSave}
            disabled={!valid}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
              color: "#fff", background: valid ? "var(--green)" : "var(--line)", border: "none",
              borderRadius: 9, padding: "12px", cursor: valid ? "pointer" : "default",
            }}
          >
            Guardar y continuar
          </button>
          <button
            onClick={onSkip}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
              background: "transparent", border: "none", padding: "6px",
            }}
          >
            Saltar por ahora (no tendré objetivos calculados)
          </button>
        </div>
      </div>
    </div>
  );
}

// Pestaña "Perfil": mismos campos, pero para editar en cualquier momento (no solo al principio).
// Al guardar, los objetivos se recalculan solos (misma función que en la bienvenida).
function PerfilView({ perfil, onSave }) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [sexo, setSexo] = useState(perfil?.sexo ?? "mujer");
  const [anioNacimiento, setAnioNacimiento] = useState(perfil?.anioNacimiento ?? "");
  const [altura, setAltura] = useState(perfil?.altura ?? "");
  const [peso, setPeso] = useState(perfil?.peso ?? "");
  const [palBase, setPalBase] = useState(
    perfil?.palBase ?? (perfil?.actividad ? NIVELES_ACTIVIDAD_LEGACY[perfil.actividad]?.palBaseKey : null) ?? "escritorio"
  );
  const [entrenamientos, setEntrenamientos] = useState(
    (perfil?.entrenamientos || []).map((e) => ({ id: uid(), ...e }))
  );
  const [objetivo, setObjetivo] = useState(perfil?.objetivo ?? "mantenimiento");
  const [saved, setSaved] = useState(false);

  const valid = anioNacimiento && altura && peso;

  function handleSave() {
    if (!valid) return;
    onSave({
      nombre: nombre.trim(),
      sexo,
      anioNacimiento: Number(anioNacimiento),
      altura: Number(altura),
      peso: Number(peso),
      palBase,
      entrenamientos: entrenamientos
        .filter((e) => e.horas && e.frecuenciaSemanal)
        .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
      objetivo,
    });
    setSaved(true);
  }

  return (
    <>
      <SectionIntro text="Estos datos se usan para calcular tus objetivos diarios de calorías y macros. Cámbialos cuando quieras — se recalculan solos al guardar." />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <ProfileFields
          nombre={nombre} setNombre={setNombre}
          sexo={sexo} setSexo={setSexo}
          anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
          altura={altura} setAltura={setAltura}
          peso={peso} setPeso={setPeso}
          palBase={palBase} setPalBase={setPalBase}
          entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos}
          objetivo={objetivo} setObjetivo={setObjetivo}
        />

        <button
          onClick={handleSave}
          disabled={!valid}
          style={{
            width: "100%", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: valid ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: valid ? "pointer" : "default",
          }}
        >
          Guardar cambios
        </button>

        {saved && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--green-dark)",
              background: "var(--green-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            Perfil actualizado — tus objetivos se han recalculado. Puedes verlos en el botón "Objetivos" de la pestaña Menú.
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Seguimiento de peso ----------

function MedidasPlaceholderView() {
  return (
    <div
      style={{
        background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
        padding: "34px 22px", textAlign: "center", maxWidth: 460,
      }}
    >
      <Ruler size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        Próximamente
      </div>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
        Aquí podrás añadir pliegues cutáneos y medidas corporales (cintura, cadera...) para completar el
        seguimiento más allá del peso en la báscula. Por ahora no es necesario — el seguimiento de peso
        de al lado ya cubre lo esencial.
      </p>
    </div>
  );
}

// Documentos de apoyo: PDFs que viven como archivos estáticos en la carpeta "PDFs explicativos"
// del propio repositorio (se sirven solos junto al resto de la app, sin ningún sistema de subida).
// Se deja vacío a propósito hasta tener listo el conjunto completo — cuando se rellene, cada entrada
// solo necesita { titulo, descripcion, archivo } con la ruta relativa al PDF.
const DOCUMENTOS_ADJUNTOS = [];

function DocumentosView() {
  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text="Aquí se podrán consultar documentos que, sin ser necesarios para que la app funcione, explican cómo funciona por dentro — y buscan dejar claro que decisiones como las fórmulas, los porcentajes o los umbrales no están puestas al azar." />

      {DOCUMENTOS_ADJUNTOS.length === 0 ? (
        <div
          style={{
            background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
            padding: "34px 22px", textAlign: "center",
          }}
        >
          <FileText size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            Todavía no hay documentos añadidos
          </div>
          <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            En cuanto estén listos, aquí aparecerán los documentos que explican y justifican el
            funcionamiento interno de la app.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DOCUMENTOS_ADJUNTOS.map((doc) => (
            <a
              key={doc.archivo}
              href={doc.archivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px",
              }}
            >
              <FileText size={20} color="var(--olive)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                  {doc.titulo}
                </div>
                {doc.descripcion && (
                  <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                    {doc.descripcion}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordatorioPesoModal({ onClose }) {
  return (
    <ModalShell onClose={onClose} title="Hoy toca pesarte">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        Es uno de los días que elegiste para el seguimiento de peso. Puedes registrarlo ahora mismo, justo
        debajo, o saltarte el aviso de hoy si no te viene bien.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={onClose}>Saltar por hoy</ModalBtn>
        <ModalBtn variant="solid" onClick={onClose}>Vale</ModalBtn>
      </div>
    </ModalShell>
  );
}

function PesoAnomaliaModal({ peso, onCancel, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  return (
    <ModalShell onClose={onCancel} title="Cambio bastante grande">
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        {peso} kg se aleja bastante de tu última pesada. ¿Sabes a qué se puede deber? Si marcas un motivo,
        este dato no contará para la tendencia del ciclo — pero se guarda igualmente.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {MOTIVOS_CAMBIO_PESO.map((op) => (
          <button
            key={op}
            onClick={() => setMotivo(op)}
            style={{
              textAlign: "left", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
              background: motivo === op ? "var(--green-soft)" : "#fff",
              color: motivo === op ? "var(--green-dark)" : "var(--ink)",
              fontSize: 12.5, fontFamily: "'Helvetica Neue', Arial, sans-serif", cursor: "pointer",
            }}
          >
            {op}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={() => onConfirm(false, "")}>No, es normal</ModalBtn>
        <ModalBtn variant="solid" onClick={() => onConfirm(true, motivo || "Sin especificar")}>Guardar como atípico</ModalBtn>
      </div>
    </ModalShell>
  );
}

// Gráfica de líneas hecha a mano en SVG (mismo criterio que el resto de la app: sin librerías).
// Dibuja todas las pesadas (las atípicas en un color distinto) y la recta de tendencia calculada
// sobre las pesadas normales.
function PesoLineChart({ entradas, tendencia }) {
  const W = 320, H = 170, PAD_L = 32, PAD_R = 6, PAD_TOP = 10, PAD_BOTTOM = 20;
  const ordenadas = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const inicio = new Date(ordenadas[0].fecha + "T00:00:00");
  const puntos = ordenadas.map((e) => ({
    x: Math.round((new Date(e.fecha + "T00:00:00") - inicio) / 86400000),
    y: e.peso,
    atipico: e.atipico,
  }));
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = 0, maxX = Math.max(1, ...xs);
  const minY = Math.min(...ys) - 0.4, maxY = Math.max(...ys) + 0.4;
  const sx = (x) => PAD_L + ((x - minX) / (maxX - minX || 1)) * (W - PAD_L - PAD_R);
  const sy = (y) => H - PAD_BOTTOM - ((y - minY) / (maxY - minY || 1)) * (H - PAD_TOP - PAD_BOTTOM);

  const pathPuntos = puntos.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");

  // Eje Y: mínimo, medio y máximo del rango visible (en kg).
  const yTicks = [minY, (minY + maxY) / 2, maxY];
  // Eje X: fecha de inicio, mitad y fin del rango representado.
  const xTicks = [minX, Math.round((minX + maxX) / 2), maxX];
  const fechaEnX = (x) => fechaISO(new Date(inicio.getTime() + x * 86400000));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      {yTicks.map((v, i) => (
        <g key={`y${i}`}>
          <line x1={PAD_L} y1={sy(v)} x2={W - PAD_R} y2={sy(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
          <text x={PAD_L - 5} y={sy(v) + 3} textAnchor="end" fontSize="8" fill="var(--ink-soft)" fontFamily="'Helvetica Neue', Arial, sans-serif">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}

      <polyline points={pathPuntos} fill="none" stroke="var(--line)" strokeWidth="1.5" />
      {tendencia && (
        <line
          x1={sx(minX)} y1={sy(tendencia.intercepto + tendencia.pendiente * minX)}
          x2={sx(maxX)} y2={sy(tendencia.intercepto + tendencia.pendiente * maxX)}
          stroke="var(--green)" strokeWidth="2" strokeDasharray="5 4"
        />
      )}
      {puntos.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={p.atipico ? 3.5 : 3}
          fill={p.atipico ? "var(--mustard)" : "var(--green-dark)"}
          stroke="#fff" strokeWidth="1" />
      ))}

      {xTicks.map((x, i) => (
        <text
          key={`x${i}`} x={sx(x)} y={H - 5}
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
          fontSize="8" fill="var(--ink-soft)" fontFamily="'Helvetica Neue', Arial, sans-serif"
        >
          {formatFechaCorta(fechaEnX(x))}
        </text>
      ))}
    </svg>
  );
}

function NivelBadge({ nivel }) {
  const meta = {
    optimo: { label: "Dentro del rango esperado", color: "var(--green-dark)", bg: "var(--green-soft)" },
    ineficaz: { label: "Ritmo demasiado lento", color: "var(--coffee)", bg: "var(--coffee-soft)" },
    aviso: { label: "Zona alta del rango", color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
    accion: { label: "Ritmo excesivo", color: "var(--rust)", bg: "var(--rust-soft)" },
    "direccion-contraria": { label: "Va en dirección contraria al objetivo", color: "var(--rust)", bg: "var(--rust-soft)" },
  }[nivel];
  if (!meta) return null;
  return <MacroPill label="" value={meta.label} color={meta.color} bg={meta.bg} />;
}

// Vista de impresión del seguimiento de peso — mismo patrón que PrintExport para el menú: un bloque
// oculto en pantalla (@media screen) que solo se muestra al imprimir (@media print), para que
// "Guardar como PDF" del propio navegador lo capture sin necesidad de ninguna librería.
function PrintSeguimiento({ entradas, tendencia, titulo }) {
  if (!entradas || entradas.length === 0) return null;
  const ordenadas = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return (
    <div id="print-seguimiento">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-seguimiento, #print-seguimiento * { visibility: visible; }
          #print-seguimiento { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-seguimiento { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: "Georgia, 'Times New Roman', serif", color: "#2b2b26" }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            Rueda de Platos
          </div>
          <h1 style={{ fontSize: 26, color: "#1f4d38", margin: "2px 0 0 0" }}>Seguimiento de peso</h1>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {titulo} · exportado el {formatFechaCorta(fechaISO(new Date()))}
          </div>
        </div>

        <div style={{ marginTop: 18, maxWidth: 420 }}>
          <PesoLineChart entradas={ordenadas} tendencia={tendencia || null} />
        </div>

        {tendencia && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "#1f4d38", fontWeight: 700, marginTop: 8 }}>
            Tendencia: {tendencia.pctSemana > 0 ? "+" : ""}{tendencia.pctSemana.toFixed(2)}%/semana
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>Fecha</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>Peso (kg)</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>Nota</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e) => (
              <tr key={e.id || e.fecha}>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{formatFechaCorta(e.fecha)}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{e.peso}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf", color: "#a9721f" }}>
                  {e.atipico ? `Atípica${e.motivo ? `: ${e.motivo}` : ""}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          Rueda de Platos — documento generado a partir de tu seguimiento de peso
        </div>
      </div>
    </div>
  );
}

// Vista de "Seguimiento de peso": mientras el ciclo está abierto, solo se enseña el progreso (cuántas
// pesadas van, cuánto falta) sin cifras ni gráfica — para no fomentar la obsesión con el número del día.
// Al llegar a la duración configurada, se enseña la tendencia real y una sugerencia de ajuste opcional.
function PesoView({ perfil, pesoTracking, onAddPeso, onUpdateConfig, onDismissReminder, onCerrarCiclo }) {
  const [pesoInput, setPesoInput] = useState("");
  const [pendienteAnomalia, setPendienteAnomalia] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showProgresion, setShowProgresion] = useState(false);
  const [rangoProgresion, setRangoProgresion] = useState("3m");
  const [aplicarKcalToggle, setAplicarKcalToggle] = useState(false);
  const [actualizarPesoToggle, setActualizarPesoToggle] = useState(true);
  const [printPayload, setPrintPayload] = useState(null);

  // Deja el contenido a imprimir listo en el DOM y espera a que React lo pinte (doble
  // requestAnimationFrame) antes de abrir el diálogo de impresión del navegador.
  function exportarSeguimiento(entradasAExportar, tendenciaAExportar, titulo) {
    setPrintPayload({ entradas: entradasAExportar, tendencia: tendenciaAExportar, titulo });
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  const hoy = new Date();
  const hoyISO = fechaISO(hoy);
  const entradas = pesoTracking.entradas || [];
  const historial = pesoTracking.historial || [];
  const yaRegistradoHoy = entradas.some((e) => e.fecha === hoyISO);
  const diaSugerido = esDiaSugeridoPeso(pesoTracking.vecesSemana, hoy);
  const [recordatorioAbierto, setRecordatorioAbierto] = useState(
    diaSugerido && !yaRegistradoHoy && pesoTracking.recordatorioDescartadoFecha !== hoyISO
  );

  const cicloInicioDate = pesoTracking.cicloInicio ? new Date(pesoTracking.cicloInicio + "T00:00:00") : null;
  const diasTranscurridos = cicloInicioDate ? Math.floor((hoy - cicloInicioDate) / 86400000) : 0;
  const diasCiclo = pesoTracking.duracionSemanas * 7;
  const cicloListoParaCierre = !!cicloInicioDate && diasTranscurridos >= diasCiclo && entradas.length >= 2;
  const totalEsperado = pesoTracking.duracionSemanas * pesoTracking.vecesSemana;

  function intentarGuardar() {
    const peso = Number(pesoInput.replace(",", "."));
    if (!peso || peso <= 0) return;
    if (esCambioRadical(peso, entradas, hoyISO)) {
      setPendienteAnomalia({ peso });
      return;
    }
    onAddPeso(peso, false, "");
    setPesoInput("");
  }

  const tendencia = cicloListoParaCierre ? calcularTendenciaPeso(entradas) : null;
  const evaluacion = tendencia ? evaluarTendencia(tendencia.pctSemana, perfil?.objetivo) : null;
  const ultimaNormal = [...entradas].reverse().find((e) => !e.atipico);
  const hayCambios = evaluacion && evaluacion.sugerenciaKcal !== 0 && perfil?.objetivo && perfil.objetivo !== "mantenimiento";

  const rangoDias = (RANGOS_PROGRESION.find((r) => r.key === rangoProgresion) || RANGOS_PROGRESION[0]).dias;
  const historialFiltrado = historial.filter((e) => {
    if (rangoDias === Infinity) return true;
    return (hoy - new Date(e.fecha + "T00:00:00")) / 86400000 <= rangoDias;
  });

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text="Pésate 2-3 veces por semana, repartidas a lo largo de la semana. Mientras el ciclo esté abierto no verás el número evolucionar — solo al cerrarlo, para no obsesionarte con las variaciones del día a día." />

      {recordatorioAbierto && (
        <RecordatorioPesoModal onClose={() => { setRecordatorioAbierto(false); onDismissReminder(); }} />
      )}

      {pendienteAnomalia && (
        <PesoAnomaliaModal
          peso={pendienteAnomalia.peso}
          onCancel={() => setPendienteAnomalia(null)}
          onConfirm={(atipico, motivo) => {
            onAddPeso(pendienteAnomalia.peso, atipico, motivo);
            setPendienteAnomalia(null);
            setPesoInput("");
          }}
        />
      )}

      {cicloListoParaCierre ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
            Ciclo terminado — {entradas.length} pesadas registradas
          </div>
          {tendencia ? (
            <>
              <PesoLineChart entradas={entradas} tendencia={tendencia} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--green-dark)" }}>
                  {tendencia.pctSemana > 0 ? "+" : ""}{tendencia.pctSemana.toFixed(2)}%/semana
                </span>
                {evaluacion && <NivelBadge nivel={evaluacion.nivel} />}
              </div>
              {evaluacion && (
                <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, marginTop: 10 }}>
                  {evaluacion.mensaje}
                </p>
              )}

              {ultimaNormal && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: 9, padding: "11px 13px", marginTop: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={actualizarPesoToggle} onChange={(e) => setActualizarPesoToggle(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--green-dark)", fontWeight: 700 }}>
                      Actualizar mi peso de perfil a {ultimaNormal.peso} kg
                    </span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--green-dark)", marginTop: 2 }}>
                      Ahora mismo tienes registrado {perfil?.peso} kg — esto recalcula tu BMR, proteína y grasa con tu peso real.
                    </span>
                  </span>
                </label>
              )}

              {hayCambios && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--mustard-soft)", border: "1px solid var(--mustard)", borderRadius: 9, padding: "11px 13px", marginTop: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={aplicarKcalToggle} onChange={(e) => setAplicarKcalToggle(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--mustard-dark)", fontWeight: 700 }}>
                      Aplicar ajuste: {evaluacion.sugerenciaKcal > 0 ? "+" : ""}{evaluacion.sugerenciaKcal} kcal/día
                    </span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--mustard-dark)", marginTop: 2 }}>
                      No cambia tu etapa ({OBJETIVO_ETAPAS[perfil.objetivo]?.label}) — solo afina la intensidad dentro de ella.
                    </span>
                  </span>
                </label>
              )}

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <ModalBtn
                  variant="solid"
                  onClick={() => onCerrarCiclo({ aplicarKcal: aplicarKcalToggle, actualizarPeso: actualizarPesoToggle })}
                >
                  Cerrar ciclo y empezar el siguiente
                </ModalBtn>
                <button
                  onClick={() => exportarSeguimiento(entradas, tendencia, "Ciclo cerrado hoy")}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
                  }}
                >
                  📄 Exportar este cierre en PDF
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                No hay pesadas suficientes (sin contar las atípicas) para calcular una tendencia fiable este
                ciclo. Puedes empezar el siguiente cuando quieras.
              </p>
              <ModalBtn variant="solid" onClick={() => onCerrarCiclo({ aplicarKcal: false, actualizarPeso: false })}>Empezar el siguiente ciclo</ModalBtn>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <Field label={yaRegistradoHoy ? "Corregir el peso de hoy" : "Peso de hoy"}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" min={30} max={300} step="0.1" value={pesoInput}
                onChange={(e) => setPesoInput(e.target.value)}
                placeholder="kg" style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={intentarGuardar}
                style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 7, padding: "0 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Helvetica Neue', Arial, sans-serif", cursor: "pointer" }}
              >
                Guardar
              </button>
            </div>
          </Field>

          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
            {cicloInicioDate ? (
              <>
                Ciclo en curso — {entradas.length} de ~{totalEsperado} pesadas registradas, quedan{" "}
                {Math.max(0, diasCiclo - diasTranscurridos)} días para la revisión.
              </>
            ) : (
              <>Tu primera pesada abre el ciclo. Se revisará dentro de {pesoTracking.duracionSemanas} semanas.</>
            )}
          </div>

          {entradas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {entradas.map((e) => (
                <span
                  key={e.id}
                  title={e.atipico ? `Marcada como atípica${e.motivo ? `: ${e.motivo}` : ""}` : "Registrada"}
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 20,
                    color: e.atipico ? "var(--mustard-dark)" : "var(--green-dark)",
                    background: e.atipico ? "var(--mustard-soft)" : "var(--green-soft)",
                  }}
                >
                  {formatFechaCorta(e.fecha)} {e.atipico ? "⚠" : "✓"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowConfig((v) => !v)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
        }}
      >
        {showConfig ? "Ocultar ajustes ▲" : "Ajustes del seguimiento ▼"}
      </button>

      {showConfig && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 18px" }}>
          <Field label="Veces por semana">
            <div style={{ display: "flex", gap: 8 }}>
              {PESO_FRECUENCIAS.map((v) => (
                <button
                  key={v}
                  disabled={!!cicloInicioDate}
                  onClick={() => onUpdateConfig({ vecesSemana: v })}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)",
                    background: pesoTracking.vecesSemana === v ? "var(--green-dark)" : "#fff",
                    color: pesoTracking.vecesSemana === v ? "#fff" : "var(--ink)",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
                    cursor: cicloInicioDate ? "default" : "pointer", opacity: cicloInicioDate ? 0.6 : 1,
                  }}
                >
                  {v}x
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
              Días sugeridos: {(DIAS_SUGERIDOS_PESO[pesoTracking.vecesSemana] || []).map((d) => DIAS_SEMANA_CORTO[d]).join(", ")}
            </div>
          </Field>
          <Field label="Duración del ciclo">
            <div style={{ display: "flex", gap: 8 }}>
              {PESO_DURACIONES.map((v) => (
                <button
                  key={v}
                  disabled={!!cicloInicioDate}
                  onClick={() => onUpdateConfig({ duracionSemanas: v })}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)",
                    background: pesoTracking.duracionSemanas === v ? "var(--green-dark)" : "#fff",
                    color: pesoTracking.duracionSemanas === v ? "#fff" : "var(--ink)",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
                    cursor: cicloInicioDate ? "default" : "pointer", opacity: cicloInicioDate ? 0.6 : 1,
                  }}
                >
                  {v} sem.
                </button>
              ))}
            </div>
          </Field>
          {cicloInicioDate && (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              No se puede cambiar con un ciclo ya abierto — se aplicará al siguiente.
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowProgresion((v) => !v)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10, marginBottom: 10,
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
        }}
      >
        {showProgresion ? "Ocultar progresión ▲" : "Ver progresión ▼"}
      </button>

      {showProgresion && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 18px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {RANGOS_PROGRESION.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangoProgresion(r.key)}
                style={{
                  padding: "6px 12px", borderRadius: 20, border: "1px solid var(--line)",
                  background: rangoProgresion === r.key ? "var(--green-dark)" : "#fff",
                  color: rangoProgresion === r.key ? "#fff" : "var(--ink)",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {historialFiltrado.length >= 2 ? (
            <>
              <PesoLineChart entradas={historialFiltrado} tendencia={null} />
              <button
                onClick={() => exportarSeguimiento(historialFiltrado, null, RANGOS_PROGRESION.find((r) => r.key === rangoProgresion)?.label)}
                style={{
                  marginTop: 10, background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--green-dark)",
                }}
              >
                📄 Exportar este rango en PDF
              </button>
            </>
          ) : (
            <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
              {historial.length === 0
                ? "Aún no tienes ningún ciclo cerrado — la progresión se rellena al terminar tu primer ciclo."
                : "No hay suficientes pesadas en este rango. Prueba con un rango más amplio."}
            </p>
          )}
        </div>
      )}

      {printPayload && (
        <PrintSeguimiento entradas={printPayload.entradas} tendencia={printPayload.tendencia} titulo={printPayload.titulo} />
      )}
    </div>
  );
}

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
        "--olive": "#7a7a1f",
        "--olive-soft": "#f0eed6",
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
const CONFIG_TAB_META = { label: "Configuración", icon: Layers };
const PROFILE_TAB_META = { label: "Perfil", icon: User };

// Qué categorías "hoja" pertenecen a cada grupo de la pantalla de Configuración.
// Un único origen de datos: sirve tanto para saber a qué grupo pertenece una categoría
// (para el botón "volver") como para pintar las tarjetas de cada grupo.
const MACRO_CATS = ["proteina", "carbo", "verdura", "grasa"];
const ESPECIALES_CATS = ["desayuno", "merienda", "cerrado", "especial"];
const CONFIG_LEAF_TABS = [...MACRO_CATS, ...ESPECIALES_CATS, "combos", "alimentos"];
const CONFIG_TABS = ["config-root", "macros-root", "especiales-root", ...CONFIG_LEAF_TABS];
const PERFIL_TABS = ["perfil-root", "perfil-datos", "perfil-peso", "perfil-medidas", "perfil-documentos"];

function groupOfCat(cat) {
  if (MACRO_CATS.includes(cat)) return "macros-root";
  if (ESPECIALES_CATS.includes(cat)) return "especiales-root";
  return "config-root";
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { key: "menu", meta: MENU_TAB_META },
    { key: "config-root", meta: CONFIG_TAB_META },
    { key: "perfil", meta: PROFILE_TAB_META },
  ];
  return (
    <nav
      style={{
        display: "flex",
        background: "var(--green)",
        paddingLeft: 12,
      }}
    >
      {tabs.map(({ key, meta }) => {
        const Icon = meta.icon;
        // "Configuración" y "Perfil" se marcan activas mientras estemos en cualquier pantalla de
        // dentro (nivel 2, nivel 3...), no solo en su tarjeta raíz.
        const active = key === "config-root" ? CONFIG_TABS.includes(tab) : key === "perfil" ? PERFIL_TABS.includes(tab) : tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key === "perfil" ? "perfil-root" : key)}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              border: "none",
              background: active ? "var(--paper)" : "transparent",
              color: active ? "var(--green-dark)" : "rgba(255,255,255,0.85)",
              padding: "12px 18px",
              fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              borderRadius: "10px 10px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              marginTop: active ? 0 : 6,
              transition: "all 0.15s",
              flex: 1,
              justifyContent: "center",
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

// Rejilla de tarjetas grandes: se reutiliza tanto para el nivel 2 (Macros / Comidas especiales /
// Combinaciones / Alimentos) como para el nivel 3 (las categorías dentro de cada grupo).
function BigCardGrid({ cards, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              cursor: "pointer", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
              padding: "18px 12px", textAlign: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <Icon size={24} color={c.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: c.color }}>{c.label}</div>
            {c.desc && <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>{c.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

function BackLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14,
        fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
        display: "flex", alignItems: "center", gap: 4,
      }}
    >
      ← {label}
    </button>
  );
}

function MenuView({ menu, onGenerate, menuWeek, setMenuWeek, history, data, onUpdateMeal, objetivos, onUpdateObjetivos, onToggleMarcadoCompra }) {
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [editingObjetivos, setEditingObjetivos] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showListaCompra, setShowListaCompra] = useState(false);
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
          🎯 Ver objetivos
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
              onClick={() => setShowListaCompra(true)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
                color: "var(--coffee)", background: "var(--coffee-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              🛒 Lista de la compra
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
          perfil={data.perfil}
          onClose={() => setEditingObjetivos(false)}
        />
      )}

      {showListaCompra && (
        <ListaCompraModal
          data={data}
          menu={menu}
          menuWeek={menuWeek}
          listaCompra={data.listaCompra || { marcados: {}, generadoEn: null }}
          onToggle={onToggleMarcadoCompra}
          onClose={() => setShowListaCompra(false)}
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

const LISTA_COMPRA_ORDEN_CATS = [...MACRO_CATS, ...ESPECIALES_CATS];

// Lista de la compra: agrega el menú (una semana o el ciclo completo) por alimento y lo agrupa por
// categoría. Las marcas de "ya lo tengo" se guardan en data.listaCompra y sobreviven a cerrar la
// app — solo se olvidan cuando generas un menú nuevo (ver handleGenerateMenu).
function ListaCompraModal({ data, menu, menuWeek, listaCompra, onToggle, onClose }) {
  const [alcance, setAlcance] = useState(menuWeek || 1);
  const items = calcularListaCompra(data, menu, alcance);
  const marcados = listaCompra.marcados || {};

  const grupos = {};
  items.forEach((it) => {
    if (!grupos[it.categoria]) grupos[it.categoria] = [];
    grupos[it.categoria].push(it);
  });
  const categoriasOrdenadas = LISTA_COMPRA_ORDEN_CATS.filter((c) => grupos[c]);
  const marcadosCount = items.filter((it) => marcados[it.key]).length;

  return (
    <ModalShell onClose={onClose} title="Lista de la compra">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[1, 2, "todo"].map((w) => (
          <button
            key={w}
            onClick={() => setAlcance(w)}
            style={{
              flex: 1, padding: "7px 8px", borderRadius: 8, border: "1px solid var(--line)",
              background: alcance === w ? "var(--green-dark)" : "#fff",
              color: alcance === w ? "#fff" : "var(--ink)",
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
            }}
          >
            {w === "todo" ? "Ciclo completo" : `Semana ${w}`}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
          No hay ningún menú generado todavía.
        </p>
      ) : (
        <>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            {marcadosCount} de {items.length} marcados
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {categoriasOrdenadas.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta?.icon;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {Icon && <Icon size={13} color={meta.color} />}
                    <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: meta?.color || "var(--ink)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {meta?.label || cat}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {grupos[cat].map((it) => {
                      const marcado = !!marcados[it.key];
                      const kg = it.gramos / 1000;
                      const cantidad = kg >= 1 ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(it.gramos)} g`;
                      return (
                        <label
                          key={it.key}
                          style={{
                            display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 7,
                            cursor: "pointer", background: marcado ? "var(--paper)" : "transparent",
                          }}
                        >
                          <input type="checkbox" checked={marcado} onChange={() => onToggle(it.key)} />
                          <span style={{
                            flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13,
                            color: marcado ? "var(--ink-soft)" : "var(--ink)", textDecoration: marcado ? "line-through" : "none",
                          }}>
                            {it.nombre}
                          </span>
                          <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                            {cantidad}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <ModalBtn variant="solid" onClick={onClose}>Cerrar</ModalBtn>
      </div>
    </ModalShell>
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

function ObjetivosModal({ objetivos, perfil, onClose }) {
  const objetivosCalculados = calcularObjetivosPerfil(perfil);

  return (
    <ModalShell onClose={onClose} title="Tus objetivos diarios">
      {!objetivosCalculados ? (
        <>
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--mustard-dark)",
              background: "var(--mustard-soft)", borderRadius: 8, padding: "12px 14px", display: "flex",
              alignItems: "flex-start", gap: 8, lineHeight: 1.5,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Todavía no tienes un perfil completo, así que no se puede calcular ningún objetivo.
              Ve a la pestaña <strong>"Perfil"</strong> y rellena tus datos (año de nacimiento, altura, peso
              y tipo de día a día) para que se calculen solos.
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="ghost">Cerrar</ModalBtn>
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-dark)" }}>{objetivosCalculados.kcal}</div>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)" }}>kcal / día</div>
            {objetivosCalculados.kcalEntrenamiento > 0 && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                {objetivosCalculados.kcalBase} kcal día a día + {objetivosCalculados.kcalEntrenamiento} kcal entrenamiento (media diaria)
              </div>
            )}
            {objetivosCalculados.objetivo !== "mantenimiento" && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                TDEE mantenimiento {objetivosCalculados.kcalMantenimiento} kcal → {OBJETIVO_ETAPAS[objetivosCalculados.objetivo].label}
                {" "}({objetivosCalculados.ajustePct > 0 ? "+" : ""}{objetivosCalculados.ajustePct}%)
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            <MacroPill label="Proteína" value={`${objetivosCalculados.prot}g`} color="var(--green-dark)" bg="var(--green-soft)" />
            <MacroPill label="Grasa" value={`${objetivosCalculados.fat}g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
            <MacroPill label="Carbos" value={`${objetivosCalculados.carb}g`} color="var(--coffee)" bg="var(--coffee-soft)" />
          </div>

          {objetivosCalculados.carbMinNotMet && (
            <div
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--mustard-dark)",
                background: "var(--mustard-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 16,
                display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Con tus entrenamientos intensos habituales, lo ideal sería un mínimo de {objetivosCalculados.carbMin}g
                de carbohidrato, pero con estas kcal y la grasa ya en su suelo de seguridad ({objetivosCalculados.fatFloor}g)
                no se puede llegar sin más margen calórico.
              </span>
            </div>
          )}

          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Reparto por comida
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {Object.keys(REPARTO_COMIDAS).map((mealType) => {
              const sub = objetivosPorComida(objetivosCalculados, mealType);
              return (
                <div
                  key={mealType}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5,
                    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 11px",
                  }}
                >
                  <span>{mealType} <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>({Math.round(REPARTO_COMIDAS[mealType] * 100)}%)</span></span>
                  <span style={{ color: "var(--ink-soft)" }}>
                    {sub.kcal} kcal · P{sub.prot} · G{sub.fat} · C{sub.carb}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)",
              background: "var(--paper)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5,
            }}
          >
            Calculado con la fórmula de <strong>Mifflin-St Jeor</strong> para tu día a día, más las kcal de tus
            entrenamientos habituales sumadas aparte, con un margen de error razonable (ningún cálculo sin
            laboratorio es exacto al 100%). Si algo cambia (peso, entrenamientos...), actualízalo en la pestaña
            <strong> "Perfil"</strong> y se recalculará solo.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="solid">Cerrar</ModalBtn>
          </div>
        </>
      )}
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
                  {c.note && !c.sinCalculo && (
                    <span style={{ fontSize: 10.5, color: "var(--mustard-dark)", fontWeight: 700 }}> · {c.note}</span>
                  )}
                </div>
                {!c.sinCalculo && (
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                    {c.macros ? `${fmt(c.macros.gramos)} g` : "sin datos nutricionales"}
                  </div>
                )}
              </div>
              {!c.sinCalculo && <RacionesStepper value={c.raciones} onChange={(v) => setRaciones(c.slotKey, v)} />}
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

function FoodsView({ foods, ingredients, onEdit, onNew, onDelete, onNewFromPhoto }) {
  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  const usageCount = (foodId) => ingredients.filter((i) => i.foodId === foodId).length;
  const filtered = query.trim()
    ? foods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : foods;

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permite volver a elegir la misma foto si hace falta repetir
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onNewFromPhoto(reader.result);
    reader.readAsDataURL(file);
  }

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
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)",
            border: "none", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Camera size={14} /> Añadir con foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
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
              {(f.grasaSaturada !== undefined || f.azucares !== undefined || f.fibra !== undefined || f.sal !== undefined) && (
                <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", marginTop: 6 }}>
                  {[
                    f.grasaSaturada !== undefined && `saturada ${f.grasaSaturada}g`,
                    f.azucares !== undefined && `azúcares ${f.azucares}g`,
                    f.fibra !== undefined && `fibra ${f.fibra}g`,
                    f.sal !== undefined && `sal ${f.sal}g`,
                  ].filter(Boolean).join(" · ")}
                </div>
              )}
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
  const [grasaSaturada, setGrasaSaturada] = useState(existing?.grasaSaturada ?? "");
  const [azucares, setAzucares] = useState(existing?.azucares ?? "");
  const [fibra, setFibra] = useState(existing?.fibra ?? "");
  const [sal, setSal] = useState(existing?.sal ?? "");
  const [fuente, setFuente] = useState(existing ? existing.fuente || "" : "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  // window.analyzeFoodPhoto solo existe en la versión web (conectada a Firebase AI Logic).
  // Dentro de Claude, esta función no está disponible y se mantiene el aviso de "rellena a mano".
  const canAnalyze = state.photo && typeof window !== "undefined" && typeof window.analyzeFoodPhoto === "function";

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const result = await window.analyzeFoodPhoto(state.photo);
      if (result.kcal !== null && result.kcal !== undefined) setKcal(result.kcal);
      if (result.prot !== null && result.prot !== undefined) setProt(result.prot);
      if (result.fat !== null && result.fat !== undefined) setFat(result.fat);
      if (result.carb !== null && result.carb !== undefined) setCarb(result.carb);
      if (result.grasaSaturada !== null && result.grasaSaturada !== undefined) setGrasaSaturada(result.grasaSaturada);
      if (result.azucares !== null && result.azucares !== undefined) setAzucares(result.azucares);
      if (result.fibra !== null && result.fibra !== undefined) setFibra(result.fibra);
      if (result.sal !== null && result.sal !== undefined) setSal(result.sal);
      if (!fuente) setFuente("Foto (IA) — revisar");
      setAnalyzed(true);
    } catch (err) {
      setAnalyzeError(
        (err && err.message) ||
        "No se ha podido leer la foto. Prueba con otra imagen más nítida, o rellena los datos a mano."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function toNumOrUndefined(v) {
    return v === "" || v === null || v === undefined ? undefined : Number(v);
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: existing ? existing.id : "f_" + uid(),
      name: name.trim(),
      kcal: Number(kcal) || 0,
      prot: Number(prot) || 0,
      fat: Number(fat) || 0,
      carb: Number(carb) || 0,
      grasaSaturada: toNumOrUndefined(grasaSaturada),
      azucares: toNumOrUndefined(azucares),
      fibra: toNumOrUndefined(fibra),
      sal: toNumOrUndefined(sal),
      fuente: fuente.trim() || "Manual",
    });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? "Nuevo alimento" : "Editar alimento"}>
      {state.photo && (
        <div style={{ marginBottom: 14 }}>
          <img
            src={state.photo}
            alt="Foto de la etiqueta"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
          />

          {canAnalyze ? (
            <>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{
                  width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 8, border: "none",
                  background: "var(--green)", color: "#fff", fontWeight: 700, fontSize: 13,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6, cursor: analyzing ? "default" : "pointer",
                  opacity: analyzing ? 0.7 : 1,
                }}
              >
                {analyzing ? "Leyendo la etiqueta…" : analyzed ? "Volver a leer la foto" : "🔍 Leer valores de la foto"}
              </button>
              {analyzeError && (
                <div style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--rust)",
                  background: "var(--rust-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                }}>
                  {analyzeError}
                </div>
              )}
              {analyzed && !analyzeError && (
                <div style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--green-dark)",
                  background: "var(--green-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                }}>
                  Datos rellenados desde la foto — revísalos antes de guardar, la lectura puede fallar.
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--mustard-dark)",
                background: "var(--mustard-soft)", borderRadius: 6, padding: "7px 10px", marginTop: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              La lectura automática de la etiqueta no está disponible aquí — de momento, rellena los datos a mano mirando la foto.
            </div>
          )}
        </div>
      )}

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

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 8px" }}>
        Detalle adicional (opcional)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="De las cuales saturadas (g)">
          <input type="number" step="0.1" value={grasaSaturada} onChange={(e) => setGrasaSaturada(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label="De los cuales azúcares (g)">
          <input type="number" step="0.1" value={azucares} onChange={(e) => setAzucares(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label="Fibra (g)">
          <input type="number" step="0.1" value={fibra} onChange={(e) => setFibra(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label="Sal (g)">
          <input type="number" step="0.01" value={sal} onChange={(e) => setSal(e.target.value)} style={inputStyle} placeholder="—" />
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
  return ingredients.filter((i) => ["proteina", "carbo", "verdura", "grasa", "especial"].includes(i.category));
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
  const [ruleType, setRuleType] = useState(existing ? existing.ruleType : (blockId ? "bloque_miembro" : ["carbo", "verdura", "grasa", "desayuno", "merienda"].includes(category) ? "probabilidad" : "frecuencia"));
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
