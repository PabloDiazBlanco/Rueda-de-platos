import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, X, Check, Utensils, Wheat, Salad, Package, Sparkles, AlertCircle, CalendarDays, Shuffle, Coffee, Cookie, Apple, Database, Search, Link2, Download, Layers, Camera, User, Droplet, Scale, Ruler, FileText, ThumbsUp, ThumbsDown, Calculator, Menu, Share2, Mail, Settings, TrendingUp, ChevronDown, Lightbulb, Globe, Lock, Activity, PieChart, Undo2, ListChecks } from "lucide-react";
import { getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt } from "macros";
import { weightedPick, allocateCounts, shuffle, clamp, RULE_LEVELS, ruleModifier, pickWithRules, sampleIndicesWithRules } from "seleccion";
import { mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra } from "comida-calculo";
export { calcularListaCompra };
import { PAL_BASE_NIVELES, TIPOS_ENTRENAMIENTO, NIVELES_ACTIVIDAD_LEGACY, OBJETIVO_ETAPAS, REPARTO_COMIDAS, PRESETS_COMIDAS, AVISO_CENA_REPARTO, repartoUniforme, calcularObjetivosPerfil, objetivosPorComida } from "objetivos";
export { calcularObjetivosPerfil };
import { uid, DAYS } from "comun";
import { generateMenu, lastPicksFromHistory } from "menu-generador";
import {
  DIAS_SEMANA_CORTO, DIAS_SUGERIDOS_PESO, PESO_FRECUENCIAS, PESO_DURACIONES, MOTIVOS_CAMBIO_PESO,
  defaultPesoTracking, RANGOS_PROGRESION, fechaISO, formatFechaCorta, descargarDatosJSON,
  esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia,
} from "peso";
export { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia };
import { resumenNutrientesSemana } from "salud-publica";
export { resumenNutrientesSemana };
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
export { calcularResumenMensual, pesoEnMes };
import { t, IDIOMAS_DISPONIBLES, DEFAULT_IDIOMA, leerIdiomaGuardado, guardarIdiomaLocal } from "i18n";

// ---------- Datos iniciales (todo lo acordado hasta ahora) ----------

// ---------- Base de datos de alimentos (macros por 100 g) ----------
// Ids fijos (no aleatorios) para que las migraciones puedan reconocerlos entre versiones.
// "fuente" indica de dónde sale el dato: etiqueta real de producto o valor estándar contrastado.
const FOODS_SEED = [
  // Proteínas
  { id: "f_pechuga_pollo", name: "Pechuga de pollo (cruda)", categoria: "proteinas", kcal: 165, prot: 31, fat: 3.6, carb: 0, sal: 0.1, azucares: 0, fibra: 0, grasaSaturada: 1, fuente: "Estándar" },
  { id: "f_hamb_pollo", name: "Hamburguesa de pollo (Hacendado)", categoria: "proteinas", kcal: 144, prot: 17, fat: 7, carb: 3, fuente: "Etiqueta" },
  { id: "f_picada_pollo", name: "Carne picada de pollo (Hacendado)", categoria: "proteinas", kcal: 124, prot: 16.6, fat: 5.3, carb: 1, fuente: "Etiqueta" },
  { id: "f_picada_mixta", name: "Carne picada ternera/cerdo", categoria: "proteinas", kcal: 163, prot: 17, fat: 9.5, carb: 1, fuente: "Etiqueta (media)" },
  { id: "f_hamb_mixta", name: "Hamburguesa ternera/cerdo (Hacendado)", categoria: "proteinas", kcal: 226, prot: 18, fat: 17, carb: 2, fuente: "Etiqueta" },
  { id: "f_salmon", name: "Salmón (crudo)", categoria: "proteinas", kcal: 144, prot: 20, fat: 12, carb: 0, sal: 0.1, azucares: 0, fibra: 0, fuente: "Estándar" },
  { id: "f_merluza", name: "Merluza / pescada (Hacendado)", categoria: "proteinas", kcal: 82, prot: 18, fat: 1.5, carb: 0.5, sal: 0.24, azucares: 0.5, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_atun", name: "Atún al natural (escurrido)", categoria: "proteinas", kcal: 105, prot: 22.5, fat: 1.2, carb: 0, fuente: "Etiqueta" },
  { id: "f_sardinas", name: "Sardinas en aceite de oliva (escurridas)", categoria: "proteinas", kcal: 207, prot: 24, fat: 14, carb: 0, fuente: "Etiqueta" },
  { id: "f_huevo", name: "Huevo entero (crudo)", categoria: "proteinas", kcal: 140, prot: 12.7, fat: 9.5, carb: 0.3, sal: 0, azucares: 0.27, fibra: 0, grasaSaturada: 2.64, fuente: "Etiqueta" },

  // Embutido / fiambre — antes mezclados con Proteínas; carpeta propia porque se comen de otra
  // forma (acompañamiento/topping) y llevan bastante más sal.
  { id: "f_pavo", name: "Pechuga de pavo fiambre (El Pozo)", categoria: "embutido_fiambre", kcal: 90, prot: 20.3, fat: 1.5, carb: 0, sal: 1.8, azucares: 0, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_jamon", name: "Jamón curado (Navidul)", categoria: "embutido_fiambre", kcal: 212, prot: 30, fat: 10, carb: 0.5, sal: 5, azucares: 0.5, fibra: 0, grasaSaturada: 3.8, fuente: "Etiqueta" },
  { id: "f_lomo", name: "Lomo embuchado (Boadas)", categoria: "embutido_fiambre", kcal: 203, prot: 35, fat: 7, carb: 0.7, sal: 3.5, azucares: 0.7, fibra: 0, grasaSaturada: 2.2, fuente: "Etiqueta" },

  // Carbohidratos (almidones "de plato principal" — pan, cereales y legumbres se separan abajo)
  { id: "f_pasta", name: "Pasta / macarrón (cruda, Hacendado)", categoria: "carbohidratos", kcal: 357, prot: 11, fat: 1.5, carb: 70, sal: 0.1, azucares: 3.5, fibra: 4, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_arroz_basmati", name: "Arroz basmati (crudo, Hacendado)", categoria: "carbohidratos", kcal: 353, prot: 8.06, fat: 1, carb: 78, sal: 0, azucares: 0.17, fibra: 0.92, grasaSaturada: 0.19, fuente: "Etiqueta" },
  { id: "f_patata", name: "Patata (cruda)", categoria: "carbohidratos", kcal: 77, prot: 2, fat: 0.1, carb: 17, sal: 0.01, azucares: 1, fibra: 2, fuente: "Estándar" },
  { id: "f_gnocchi", name: "Gnocchi (fresco, Ifa Eliges)", categoria: "carbohidratos", kcal: 156, prot: 3, fat: 0.5, carb: 30, sal: 0.63, azucares: 0.5, fibra: 1.9, grasaSaturada: 0.1, fuente: "Etiqueta" },

  // Legumbres — antes dentro de Carbohidratos "a la fuerza"
  { id: "f_garbanzos_cocidos", name: "Garbanzos cocidos (bote)", categoria: "legumbres", kcal: 119, prot: 6.5, fat: 2.6, carb: 16, fibra: 5, fuente: "Estándar" },

  // Panes — carpeta propia, no dentro de Carbohidratos
  { id: "f_pan_molde", name: "Pan de molde natural (Hacendado)", categoria: "panes", kcal: 265, prot: 9.1, fat: 3.5, carb: 48, sal: 1.1, azucares: 3.8, fibra: 1.2, grasaSaturada: 0.6, fuente: "Etiqueta" },
  { id: "f_pan_brioche", name: "Pan hamburguesa brioche (Hacendado)", categoria: "panes", kcal: 340, prot: 11, fat: 8, carb: 55, sal: 0.86, azucares: 11, fibra: 2, grasaSaturada: 2.2, fuente: "Etiqueta" },

  // Cereales (de desayuno) — carpeta propia
  { id: "f_cereales_cacao", name: "Cereales de cacao (Hacendado)", categoria: "cereales", kcal: 389, prot: 13, fat: 5, carb: 70, sal: 0.6, azucares: 9, fibra: 9.5, grasaSaturada: 1.5, fuente: "Etiqueta" },

  // Vegetales
  { id: "f_ensalada", name: "Ensalada variada (hoja, tomate, etc.)", categoria: "vegetales", kcal: 25, prot: 1.5, fat: 0.3, carb: 3.5, fibra: 1.5, fuente: "Estándar" },
  { id: "f_tomate", name: "Tomate (crudo)", categoria: "vegetales", kcal: 18, prot: 0.9, fat: 0.2, carb: 3.9, azucares: 2.6, fibra: 1.2, fuente: "Estándar" },
  { id: "f_pimiento", name: "Pimiento (crudo)", categoria: "vegetales", kcal: 27, prot: 1, fat: 0.3, carb: 6, azucares: 4.2, fibra: 2.1, fuente: "Estándar" },
  { id: "f_cebolla", name: "Cebolla (cruda)", categoria: "vegetales", kcal: 40, prot: 1.1, fat: 0.1, carb: 9.3, azucares: 4.2, fibra: 1.7, fuente: "Estándar" },
  { id: "f_pure_verduras", name: "Puré de verduras", categoria: "vegetales", kcal: 55, prot: 1.5, fat: 1.5, carb: 8, fuente: "Estándar" },

  // Frutas — catálogo nuevo, no existía ninguna fruta antes de esta tanda. Selección inicial de
  // las más comunes; se amplía/cambia más adelante sin ningún problema.
  { id: "f_manzana", name: "Manzana (cruda)", categoria: "frutas", kcal: 52, prot: 0.3, fat: 0.2, carb: 14, azucares: 10, fibra: 2.4, fuente: "Estándar" },
  { id: "f_platano", name: "Plátano (crudo)", categoria: "frutas", kcal: 89, prot: 1.1, fat: 0.3, carb: 23, azucares: 12, fibra: 2.6, fuente: "Estándar" },
  { id: "f_naranja", name: "Naranja (cruda)", categoria: "frutas", kcal: 47, prot: 0.9, fat: 0.1, carb: 12, azucares: 9, fibra: 2.4, fuente: "Estándar" },
  { id: "f_pera", name: "Pera (cruda)", categoria: "frutas", kcal: 57, prot: 0.4, fat: 0.1, carb: 15, azucares: 10, fibra: 3.1, fuente: "Estándar" },
  { id: "f_fresas", name: "Fresas (crudas)", categoria: "frutas", kcal: 32, prot: 0.7, fat: 0.3, carb: 7.7, azucares: 4.9, fibra: 2, fuente: "Estándar" },
  { id: "f_uvas", name: "Uvas (crudas)", categoria: "frutas", kcal: 69, prot: 0.7, fat: 0.2, carb: 18, azucares: 16, fibra: 0.9, fuente: "Estándar" },

  // Lácteos (incluye el café con leche: no encaja mejor en ninguna otra carpeta y lleva leche de verdad)
  { id: "f_queso_cottage", name: "Queso cottage (Ifa Eliges)", categoria: "lacteos", kcal: 66, prot: 12, fat: 1.5, carb: 2, sal: 0.6, azucares: 2, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_yogur_prot", name: "Yogur proteínas (Hacendado)", categoria: "lacteos", kcal: 52, prot: 10, fat: 0.3, carb: 3.1, sal: 0.1, azucares: 3.1, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_mozzarella", name: "Queso rallado mozzarella (Ifa Eliges)", categoria: "lacteos", kcal: 285, prot: 21, fat: 21, carb: 0.8, sal: 1, azucares: 0.8, fibra: 0, grasaSaturada: 14, fuente: "Etiqueta" },
  { id: "f_cafe_leche", name: "Café con leche (taza 200 ml)", categoria: "lacteos", kcal: 33, prot: 1.5, fat: 1.2, carb: 2.5, fuente: "Estándar (por 100 ml)" },

  // Grasas — antes mezclado en "Lácteos y otros", sin pintar nada ahí
  { id: "f_aove", name: "Aceite de oliva virgen extra", categoria: "grasas", kcal: 900, prot: 0, fat: 100, carb: 0, sal: 0, azucares: 0, fibra: 0, grasaSaturada: 14, fuente: "Estándar" },

  // Frutos secos — separados de los snacks procesados (antes en el mismo cajón de sastre)
  { id: "f_anacardos", name: "Anacardos naturales sin sal", categoria: "frutos_secos", kcal: 589, prot: 17.5, fat: 45, carb: 31, sal: 0, azucares: 6, fibra: 3.3, grasaSaturada: 8, fuente: "Estándar" },
  { id: "f_pistachos", name: "Pistachos naturales sin sal", categoria: "frutos_secos", kcal: 580, prot: 19, fat: 48, carb: 21, sal: 0, azucares: 8, fibra: 10, grasaSaturada: 6, fuente: "Estándar" },
  { id: "f_cacahuete_polvo", name: "Cacahuete en polvo desgrasado (Eroski)", categoria: "frutos_secos", kcal: 470, prot: 47, fat: 8, carb: 24, sal: 0, azucares: 8.8, fibra: 14, grasaSaturada: 2, fuente: "Etiqueta" },

  // Snacks procesados
  { id: "f_choco85", name: "Chocolate negro 85%", categoria: "snacks_procesados", kcal: 600, prot: 9, fat: 46, carb: 20, azucares: 16, grasaSaturada: 26, fuente: "Estándar" },
  { id: "f_nachos", name: "Nachos (Ifa Eliges)", categoria: "snacks_procesados", kcal: 486, prot: 5.1, fat: 22, carb: 65, azucares: 1.2, fibra: 4.8, grasaSaturada: 2.5, fuente: "Etiqueta" },
  { id: "f_guacamole", name: "Guacamole fresco (Ifa Eliges)", categoria: "snacks_procesados", kcal: 182, prot: 1.8, fat: 16, carb: 8, sal: 1.3, azucares: 1.4, fibra: 3.2, grasaSaturada: 2.4, fuente: "Etiqueta" },
];

// Carpetas de la base de datos de alimentos (distinto de CATEGORY_META más abajo, que clasifica
// reglas de ingrediente, no alimentos crudos). Cada carpeta agrupa foods[] por categoria y da un
// gramaje de partida — por categoría, no por alimento — para cuando el cuestionario de catálogo
// (Tanda 2) construya combinaciones sin pedir una cantidad curada para cada alimento nuevo.
const CATEGORIAS_ALIMENTOS = [
  { key: "proteinas", labelKey: "categoriaAlimento.proteinas", emoji: "🍗", gramosDefecto: 150 },
  { key: "embutido_fiambre", labelKey: "categoriaAlimento.embutidoFiambre", emoji: "🥓", gramosDefecto: 30 },
  { key: "carbohidratos", labelKey: "categoriaAlimento.carbohidratos", emoji: "🍝", gramosDefecto: 80 },
  { key: "panes", labelKey: "categoriaAlimento.panes", emoji: "🍞", gramosDefecto: 60 },
  { key: "cereales", labelKey: "categoriaAlimento.cereales", emoji: "🥣", gramosDefecto: 40 },
  { key: "legumbres", labelKey: "categoriaAlimento.legumbres", emoji: "🫘", gramosDefecto: 150 },
  { key: "vegetales", labelKey: "categoriaAlimento.vegetales", emoji: "🥗", gramosDefecto: 150 },
  { key: "frutas", labelKey: "categoriaAlimento.frutas", emoji: "🍎", gramosDefecto: 150 },
  { key: "lacteos", labelKey: "categoriaAlimento.lacteos", emoji: "🥛", gramosDefecto: 125 },
  { key: "grasas", labelKey: "categoriaAlimento.grasas", emoji: "🫒", gramosDefecto: 10 },
  { key: "frutos_secos", labelKey: "categoriaAlimento.frutosSecos", emoji: "🥜", gramosDefecto: 30 },
  { key: "snacks_procesados", labelKey: "categoriaAlimento.snacksProcesados", emoji: "🍫", gramosDefecto: 30 },
];

// ---------- Cuestionario de catálogo (Bloque 3 del rediseño, Tanda 3) ----------
// Opciones curadas que se ofrecen en el cuestionario de alta, agrupadas por categoría — no es todo
// FOODS_SEED, es un subconjunto de alimentos "típicos" pensado para elegir con un toque, sin tener
// que escribir nada. Los gramos por defecto son los mismos que ya usaba la configuración personal
// de Pablo cuando existía como semilla fija (antes de esta tanda) — valores ya pensados con
// criterio, reaprovechados aquí en vez de inventar otros desde cero.
// nombreEs es el "name" que llevará el ingredient de verdad — en español fijo, igual que el resto
// del modelo de datos (mealType, DAYS...: ver CLAUDE.md, "cambiarlos ahí tocaría el motor"), ya
// que el motor y las reglas de combinación enlazan por nombre. labelKey es solo para mostrar la
// tarjeta traducida en el propio cuestionario, nunca se guarda.
const CUESTIONARIO_PROTEINAS = [
  { foodId: "f_pechuga_pollo", nombreEs: "Pollo", labelKey: "cuestionario.alimento.pollo", gramos: 150 },
  { foodId: "f_salmon", nombreEs: "Salmón", labelKey: "cuestionario.alimento.salmon", gramos: 150 },
  { foodId: "f_merluza", nombreEs: "Merluza", labelKey: "cuestionario.alimento.merluza", gramos: 150 },
  { foodId: "f_atun", nombreEs: "Atún", labelKey: "cuestionario.alimento.atun", gramos: 100 },
  { foodId: "f_sardinas", nombreEs: "Sardinas", labelKey: "cuestionario.alimento.sardinas", gramos: 90 },
  { foodId: "f_huevo", nombreEs: "Huevo", labelKey: "cuestionario.alimento.huevo", gramos: 120 },
  { foodId: "f_jamon", nombreEs: "Jamón", labelKey: "cuestionario.alimento.jamon", gramos: 80 },
  { foodId: "f_picada_mixta", nombreEs: "Carne picada", labelKey: "cuestionario.alimento.carnePicada", gramos: 150 },
];
const CUESTIONARIO_CARBOS = [
  { foodId: "f_pasta", nombreEs: "Pasta", labelKey: "cuestionario.alimento.pasta", gramos: 80 },
  { foodId: "f_arroz_basmati", nombreEs: "Arroz", labelKey: "cuestionario.alimento.arroz", gramos: 80 },
  { foodId: "f_patata", nombreEs: "Patata", labelKey: "cuestionario.alimento.patata", gramos: 250 },
  { foodId: "f_gnocchi", nombreEs: "Gnocchi", labelKey: "cuestionario.alimento.gnocchi", gramos: 200 },
  { foodId: "f_pan_molde", nombreEs: "Pan de molde", labelKey: "cuestionario.alimento.pan", gramos: 80 },
];
const CUESTIONARIO_VERDURAS = [
  { foodId: "f_ensalada", nombreEs: "Ensalada", labelKey: "cuestionario.alimento.ensalada", gramos: 150 },
  { foodId: "f_tomate", nombreEs: "Tomate", labelKey: "cuestionario.alimento.tomate", gramos: 150 },
  { foodId: "f_pimiento", nombreEs: "Pimiento y cebolla", labelKey: "cuestionario.alimento.pimiento", gramos: 150 },
  { foodId: "f_pure_verduras", nombreEs: "Puré de verduras", labelKey: "cuestionario.alimento.pure", gramos: 200 },
];
const CUESTIONARIO_GRASAS = [
  { foodId: "f_aove", nombreEs: "Aceite de oliva", labelKey: "cuestionario.alimento.aove", gramos: 10 },
  { foodId: "f_anacardos", nombreEs: "Frutos secos", labelKey: "cuestionario.alimento.frutosSecos", gramos: 30 },
  { foodId: "f_mozzarella", nombreEs: "Queso", labelKey: "cuestionario.alimento.queso", gramos: 30 },
];
// Exclusiones por gusto (Pantalla 1): cada chip filtra, de todas las listas de arriba a la vez,
// los alimentos que llevan eso — deliberadamente solo las que el catálogo puede filtrar de verdad
// con los datos que tiene hoy (no hay ningún alimento marcado como "picante", por ejemplo, así que
// esa opción no está: prometer un filtro que no filtra nada sería peor que no ofrecerlo).
const EXCLUSIONES_DISPONIBLES = [
  { key: "pescado", labelKey: "cuestionario.exclusion.pescado", foodIds: ["f_salmon", "f_merluza", "f_atun", "f_sardinas"] },
  { key: "frutosSecos", labelKey: "cuestionario.exclusion.frutosSecos", foodIds: ["f_anacardos", "f_pistachos", "f_cacahuete_polvo"] },
  { key: "lacteos", labelKey: "cuestionario.exclusion.lacteos", foodIds: ["f_queso_cottage", "f_yogur_prot", "f_mozzarella"] },
  { key: "cerdo", labelKey: "cuestionario.exclusion.cerdo", foodIds: ["f_jamon", "f_lomo", "f_picada_mixta", "f_hamb_mixta"] },
];

// Datos con los que arranca una cuenta que no tiene nada guardado todavía. Hasta la Tanda 3 del
// rediseño de navegación, esto sembraba también los ingredients/blocks con la configuración
// personal de Pablo (qué proteínas, con qué frecuencia, los bloques de carne roja/pollo
// picado...) — cualquier cuenta nueva heredaba literalmente su dieta. Ahora eso se decide en el
// cuestionario de catálogo del propio alta (ver CatalogoOnboarding) o se deja vacío si el usuario
// prefiere partir de cero y configurarlo él mismo más tarde desde Configuración de comidas — un
// menú sin ingredientes activos simplemente sale vacío, no es un error (ver generateMenu).
// foods (el catálogo nutricional en sí) SÍ se mantiene compartido para todo el mundo, igual que
// antes: es la base de datos de la que tira el cuestionario, y se sigue actualizando sola con
// alimentos nuevos vía migrateData, sin tocar nada de esto.
const initialData = () => {
  return {
    foods: FOODS_SEED.map((f) => ({ ...f })),
    rules: [],
    ingredients: [],
    blocks: [],
    pesoTracking: defaultPesoTracking(),
    listaCompra: { marcados: {}, generadoEn: null },
    listaCompraSimple: { marcados: {}, generadoEn: null },
  };
};

const CATEGORY_META = {
  proteina: { labelKey: "categoria.proteina", icon: Utensils, color: "var(--green)", bg: "var(--green-soft)" },
  carbo: { labelKey: "categoria.carbo", icon: Wheat, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
  verdura: { labelKey: "categoria.verdura", icon: Salad, color: "var(--green)", bg: "var(--green-soft)" },
  grasa: { labelKey: "categoria.grasa", icon: Droplet, color: "var(--olive)", bg: "var(--olive-soft)" },
  desayuno: { labelKey: "mealType.Desayuno", icon: Coffee, color: "var(--coffee)", bg: "var(--coffee-soft)" },
  media_manana: { labelKey: "mealType.Media mañana", icon: Apple, color: "var(--citrus)", bg: "var(--citrus-soft)" },
  merienda: { labelKey: "mealType.Merienda", icon: Cookie, color: "var(--berry)", bg: "var(--berry-soft)" },
  cerrado: { labelKey: "categoria.cerrado", icon: Package, color: "var(--rust)", bg: "var(--rust-soft)" },
  especial: { labelKey: "categoria.especial", icon: Sparkles, color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
};

const STORAGE_KEY = "rueda-de-platos:data-v1";
const MENU_STORAGE_KEY = "rueda-de-platos:menu-v1";
const HISTORY_STORAGE_KEY = "rueda-de-platos:history-v1";
// Menú simple (Tanda 3 del rediseño): ciclo y ciclos anteriores independientes de los de arriba —
// las dos pantallas conviven, cada una con su propio "Generar"/"Deshacer", sin pisarse.
const MENU_SIMPLE_STORAGE_KEY = "rueda-de-platos:menu-simple-v1";
const HISTORY_SIMPLE_STORAGE_KEY = "rueda-de-platos:history-simple-v1";
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

    // Alimentos que ya existían antes de añadir sal/azúcares/fibra/grasa saturada (y, en esta
    // tanda, categoria) al catálogo: se completan solo esos campos nuevos si faltan, sin tocar
    // kcal/proteína/grasa/carbohidratos por si el usuario ya los había editado a mano.
    const seedById = {};
    FOODS_SEED.forEach((f) => { seedById[f.id] = f; });
    const EXTRA_FIELDS = ["sal", "azucares", "fibra", "grasaSaturada", "categoria"];
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
  } else {
    if (!Array.isArray(data.pesoTracking.historial)) {
      // Perfiles que ya tenían seguimiento de peso antes de que el historial fuera permanente.
      data.pesoTracking.historial = [];
      changed = true;
    }
    if (!Array.isArray(data.pesoTracking.pausas)) {
      // Perfiles guardados antes de que existiera el modo pausa del ciclo.
      data.pesoTracking.pausas = [];
      changed = true;
    }
  }

  // Lista de la compra: guarda qué se ha ido marcando, ligado al último menú generado.
  if (!data.listaCompra) {
    data.listaCompra = { marcados: {}, generadoEn: null };
    changed = true;
  }

  // Lista de la compra de Menú simple (Tanda 3 del rediseño): independiente de la de arriba, porque
  // Menú simple genera sus propios ciclos, separados de los de Menú completo — marcar algo comprado
  // en uno no debería afectar al otro.
  if (!data.listaCompraSimple) {
    data.listaCompraSimple = { marcados: {}, generadoEn: null };
    changed = true;
  }

  // Comidas completadas (resumen mensual): registro por fecha real, aparte del menú en sí.
  if (!data.comidasCompletadas) {
    data.comidasCompletadas = {};
    changed = true;
  }

  // Reparto de comidas (Fase 4, reparto de comidas configurable): antes era la constante global
  // REPARTO_COMIDAS; ahora vive en el perfil, para poder tener otros presets (3, 2 o 5 comidas)
  // además del clásico de 4. Perfiles ya existentes migran al reparto de siempre, sin cambiar
  // nada de lo que ya tenían calculado.
  if (data.perfil && data.perfil.repartoComidas === undefined) {
    data.perfil.repartoComidas = { ...REPARTO_COMIDAS };
    data.perfil.presetComidas = "clasico-4";
    changed = true;
  }

  // Idioma de la interfaz (Fase 5, internacionalización): perfiles ya existentes se quedan en
  // español siempre — nunca les cambiamos el idioma solos por detectar el navegador, sería un
  // cambio de comportamiento sorpresa. Los perfiles nuevos ya llegan con su idioma puesto desde
  // el onboarding (ver ProfileOnboarding más abajo), así que este bloque no les toca nada.
  if (data.perfil && data.perfil.idioma === undefined) {
    data.perfil.idioma = DEFAULT_IDIOMA;
    changed = true;
  }

  // Notificaciones push (Fase 6): perfiles ya existentes empiezan desactivados — activarlas pide
  // permiso al navegador, así que nunca puede hacerse sola sin que el usuario lo pulse él mismo.
  if (data.perfil && data.perfil.notificacionesPush === undefined) {
    data.perfil.notificacionesPush = false;
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [menuSimple, setMenuSimple] = useState(null);
  const [menuSimpleWeek, setMenuSimpleWeek] = useState(1);
  const [historySimple, setHistorySimple] = useState([]);
  const [premium, setPremium] = useState({ active: false });
  const saveTimer = useRef(null);

  // Idioma de la interfaz: mientras no haya perfil cargado (o si nunca se completó el onboarding),
  // se usa el que se eligió/detectó en la pantalla de bienvenida (ver Logica/i18n.js); en cuanto
  // hay un perfil real con idioma propio, ese manda. `idiomaFallback` se calcula una sola vez al
  // montar, no en cada render, para no releer localStorage sin necesidad.
  const [idiomaFallback] = useState(() => leerIdiomaGuardado());
  const idioma = (data && data.perfil && data.perfil.idioma) || idiomaFallback;

  // El estado premium vive de verdad en Firestore (users/{uid}.premium, escrito solo por el
  // webhook de Stripe) — aquí solo nos suscribimos a los cambios en vivo, vía el puente que
  // expone auth-bootstrap.jsx. Así, si pagas mientras tienes la app abierta, se desbloquea sola
  // en cuanto el webhook confirma el pago, sin recargar nada.
  useEffect(() => {
    if (typeof window.subscribePremiumStatus !== "function") return;
    const unsub = window.subscribePremiumStatus(setPremium);
    return unsub;
  }, []);

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
      }
      try {
        const menuSimpleRes = await window.storage.get(MENU_SIMPLE_STORAGE_KEY, false);
        if (menuSimpleRes && menuSimpleRes.value) setMenuSimple(JSON.parse(menuSimpleRes.value));
      } catch (e) {
        // no hay menú simple generado todavía, no pasa nada
      }
      try {
        const historySimpleRes = await window.storage.get(HISTORY_SIMPLE_STORAGE_KEY, false);
        if (historySimpleRes && historySimpleRes.value) setHistorySimple(JSON.parse(historySimpleRes.value));
      } catch (e) {
        // no hay historial de menú simple todavía, no pasa nada
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

  // Deshacer: vuelve al ciclo que había antes del último generado. history[0] es siempre el más
  // reciente (el que se está deshaciendo), así que el destino es history[1] — y como se quita
  // history[0] de la lista, repetir "Deshacer" sigue retrocediendo un paso más, hasta donde llegue
  // el historial guardado (hasta HISTORY_MAX ciclos).
  async function handleUndoMenu() {
    if (history.length < 2) return;
    const previous = history[1];
    setMenu(previous.slots);
    setMenuWeek(1);
    const newHistory = history.slice(1);
    setHistory(newHistory);
    try {
      await window.storage.set(MENU_STORAGE_KEY, JSON.stringify(previous.slots), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    try {
      await window.storage.set(HISTORY_STORAGE_KEY, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
    // Mismo motivo que al generar: la lista de la compra marcada corresponde al menú que se acaba
    // de abandonar, no al que se restaura.
    setData((prev) => ({ ...prev, listaCompra: { marcados: {}, generadoEn: previous.generatedAt } }));
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

  // ---------- Menú simple (Tanda 3 del rediseño) ----------
  // Mismo motor de siempre (generateMenu ya separa "qué toca" de "cuánto pesar de cada cosa" —
  // aquí simplemente no se muestra esa segunda parte), pero con su propio ciclo, su propio
  // historial y su propia lista de la compra, independientes de los de Menú completo: las dos
  // pantallas conviven sin pisarse, cada una con su "Generar"/"Deshacer".
  async function handleGenerateMenuSimple() {
    const avoid = lastPicksFromHistory(historySimple, data);
    const result = generateMenu(data, avoid);
    setMenuSimple(result);
    setMenuSimpleWeek(1);
    try {
      await window.storage.set(MENU_SIMPLE_STORAGE_KEY, JSON.stringify(result), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    const entry = { id: uid(), generatedAt: new Date().toISOString(), slots: result };
    const newHistory = [entry, ...historySimple].slice(0, HISTORY_MAX);
    setHistorySimple(newHistory);
    try {
      await window.storage.set(HISTORY_SIMPLE_STORAGE_KEY, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
    setData((prev) => ({ ...prev, listaCompraSimple: { marcados: {}, generadoEn: entry.generatedAt } }));
  }

  async function handleUndoMenuSimple() {
    if (historySimple.length < 2) return;
    const previous = historySimple[1];
    setMenuSimple(previous.slots);
    setMenuSimpleWeek(1);
    const newHistory = historySimple.slice(1);
    setHistorySimple(newHistory);
    try {
      await window.storage.set(MENU_SIMPLE_STORAGE_KEY, JSON.stringify(previous.slots), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    try {
      await window.storage.set(HISTORY_SIMPLE_STORAGE_KEY, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
    setData((prev) => ({ ...prev, listaCompraSimple: { marcados: {}, generadoEn: previous.generatedAt } }));
  }

  function toggleMarcadoCompraSimple(key) {
    setData((prev) => {
      const lc = prev.listaCompraSimple || { marcados: {}, generadoEn: null };
      const marcados = { ...lc.marcados };
      if (marcados[key]) delete marcados[key];
      else marcados[key] = true;
      return { ...prev, listaCompraSimple: { ...lc, marcados } };
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

  // Marca (o desmarca) el tipo de comida indicado como completado HOY — no para el día abstracto
  // "semana 1, lunes" del menú generado, que no tiene fecha real. La idea es que se marque en el
  // momento en que de verdad comes, no que quede ligado a una casilla del menú que puede cambiar
  // si regeneras. Vive en data.comidasCompletadas (persistente, como cualquier otro dato de la
  // app), completamente aparte de "menu" — regenerar el menú nunca borra este historial.
  function toggleComidaCompletada(mealType) {
    const hoy = fechaISO(new Date());
    setData((prev) => {
      const actual = prev.comidasCompletadas || {};
      const delDia = { ...(actual[hoy] || {}) };
      if (delDia[mealType]) delete delDia[mealType];
      else delDia[mealType] = true;
      return { ...prev, comidasCompletadas: { ...actual, [hoy]: delDia } };
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
        <div style={{ padding: 60, textAlign: "center", color: "var(--ink-soft)" }}>{t(idiomaFallback, "loading.cargando")}</div>
      </Shell>
    );
  }

  // Alta en dos tiempos (Tanda 3): primero el asistente de perfil (5 pasos) y, solo si no se saltó,
  // el cuestionario de catálogo (otros 5) — "perfilOnboardingDone" no se marca hasta que el segundo
  // también termina o se salta, así que HistoriaScreen (en auth-bootstrap.jsx, que vigila ese mismo
  // campo para enseñar la pantalla de "por qué existe esta app") sigue apareciendo justo al final
  // de todo, como ya hacía antes de partir esto en dos pantallas. Qué pantalla mostrar se decide
  // con si `data.perfil` ya existe o no — no hace falta ningún campo nuevo para esto: initialData()
  // nunca incluye un "perfil", así que su sola presencia ya significa "el primer asistente terminó".
  if (!data.perfilOnboardingDone) {
    if (!data.perfil) {
      return (
        <Shell>
          <ProfileOnboarding onComplete={guardarPerfilInicial} onSkip={skipPerfil} idioma={idiomaFallback} />
        </Shell>
      );
    }
    return (
      <Shell>
        <CatalogoOnboarding
          idioma={data.perfil.idioma || idiomaFallback}
          repartoComidas={data.perfil.repartoComidas}
          onComplete={completarOnboardingConCatalogo}
          onSkipAll={saltarCatalogoOnboarding}
        />
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

  // Igual que savePerfil, pero sin marcar perfilOnboardingDone: la usa solo el primer asistente
  // (ProfileOnboarding), para poder pasar al cuestionario de catálogo justo después sin que el
  // gate de arriba salte ya a la app completa. Los usos normales de "guardar el perfil" en el resto
  // de la app (Perfil, Actividad diaria, Reparto de comidas, y el propio SettingsView) siguen
  // usando savePerfil, que si ya estaba a true lo deja igual — no hay ningún otro sitio donde este
  // matiz importe.
  function guardarPerfilInicial(perfil) {
    setData((prev) => ({ ...prev, perfil, objetivos: calcularObjetivosPerfil(perfil) || prev.objetivos }));
  }

  // Cierra el alta del todo: guarda lo que haya elegido el cuestionario de catálogo (o nada, si
  // llega vacío porque el usuario no seleccionó ningún alimento) y ya sí marca perfilOnboardingDone.
  function completarOnboardingConCatalogo(ingredients) {
    setData((prev) => ({ ...prev, ingredients, perfilOnboardingDone: true }));
  }

  // "Saltar todo" desde el cuestionario de catálogo: el catálogo se queda tal cual estaba
  // (ingredients/blocks vacíos, de initialData()) — el usuario podrá configurarlo él mismo más
  // adelante desde Configuración de comidas, sin prisa.
  function saltarCatalogoOnboarding() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: true }));
  }

  // Repetir el cuestionario de catálogo desde Ajustes (por si alguien se arrepiente o lo saltó sin
  // querer). Solo toca perfilOnboardingDone, nunca perfil: como data.perfil ya existe, el gate de
  // arriba lleva directo a CatalogoOnboarding, sin pasar otra vez por ProfileOnboarding — y al
  // completarlo o saltarlo se reutilizan completarOnboardingConCatalogo/saltarCatalogoOnboarding
  // de siempre, que ya dejan perfilOnboardingDone a true al terminar.
  function repetirCuestionarioCatalogo() {
    setData((prev) => ({ ...prev, perfilOnboardingDone: false }));
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

  // Pausa el ciclo activo (viaje, enfermedad...) con un motivo opcional en texto libre. Mientras
  // esté pausado, esos días no cuentan para el cierre del ciclo ni disparan el recordatorio.
  function pausarCiclo(motivo) {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      return { ...prev, pesoTracking: { ...pt, pausas: [...(pt.pausas || []), { inicio: hoyISO, fin: null, motivo: motivo || "" }] } };
    });
  }

  // Cierra la pausa abierta: el ciclo retoma la cuenta exactamente donde se quedó.
  function reanudarCiclo() {
    setData((prev) => {
      const pt = prev.pesoTracking || defaultPesoTracking();
      const hoyISO = fechaISO(new Date());
      const pausas = (pt.pausas || []).map((p, i, arr) => (i === arr.length - 1 && p.fin === null ? { ...p, fin: hoyISO } : p));
      return { ...prev, pesoTracking: { ...pt, pausas } };
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

      const hoyISO = fechaISO(new Date());
      // Si quedaba una pausa abierta al cerrar el ciclo, se cierra también aquí para no dejar
      // un hueco sin fecha de fin en el historial.
      const pausasCerradas = (pt.pausas || []).map((p) => (p.fin === null ? { ...p, fin: hoyISO } : p));

      const cicloArchivado = {
        inicio: pt.cicloInicio,
        fin: hoyISO,
        pctSemana: tendencia ? tendencia.pctSemana : null,
        nivel: evaluacion ? evaluacion.nivel : null,
        ajusteKcalAplicado: aplicaKcal ? evaluacion.sugerenciaKcal : 0,
        pesoActualizado: !!aplicaPeso,
        pausas: pausasCerradas,
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
          pausas: [],
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
  const mediaMananaTotal = itemsInCategory("media_manana").reduce((s, i) => s + (i.probabilidad || 0), 0);
  const meriendaTotal = itemsInCategory("merienda").reduce((s, i) => s + (i.probabilidad || 0), 0);

  return (
    <Shell>
      <Header saveState={saveState} idioma={idioma} onOpenMenu={() => setDrawerOpen(true)} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} setTab={setTab} idioma={idioma} premium={premium} />

      <main style={{ padding: "20px 22px 60px" }}>
        {tab === "menus-root" && (
          <BigCardGrid
            onSelect={setTab}
            cards={[
              { key: "menu", label: t(idioma, "drawer.menuCompleto"), desc: t(idioma, "drawer.menuCompleto.desc"), icon: CalendarDays, color: "var(--green)" },
              { key: "menu-simple", label: t(idioma, "drawer.menuSimple"), desc: t(idioma, "drawer.menuSimple.desc"), icon: ListChecks, color: "var(--olive)" },
            ]}
          />
        )}

        {tab === "menu" && (
          <MenuView
            menu={menu}
            onGenerate={handleGenerateMenu}
            onUndo={handleUndoMenu}
            menuWeek={menuWeek}
            setMenuWeek={setMenuWeek}
            history={history}
            data={data}
            onUpdateMeal={updateMeal}
            objetivos={data.objetivos}
            onUpdateObjetivos={updateObjetivos}
            onToggleMarcadoCompra={toggleMarcadoCompra}
            onUpsertRule={upsertRule}
            onToggleComidaCompletada={toggleComidaCompletada}
            idioma={idioma}
          />
        )}

        {tab === "menu-simple" && (
          <MenuSimpleView
            menu={menuSimple}
            onGenerate={handleGenerateMenuSimple}
            onUndo={handleUndoMenuSimple}
            menuWeek={menuSimpleWeek}
            setMenuWeek={setMenuSimpleWeek}
            history={historySimple}
            data={data}
            onToggleMarcadoCompra={toggleMarcadoCompraSimple}
            idioma={idioma}
          />
        )}

        {tab === "config-root" && (
          <BigCardGrid
            onSelect={setTab}
            cards={[
              { key: "macros-root", label: t(idioma, "nav.macros"), desc: t(idioma, "nav.macros.desc"), icon: Utensils, color: "var(--green)" },
              { key: "especiales-root", label: t(idioma, "nav.comidasEspeciales"), desc: t(idioma, "nav.comidasEspeciales.desc"), icon: Package, color: "var(--rust)" },
              { key: "combos", label: t(idioma, "nav.combinaciones"), desc: t(idioma, "nav.combinaciones.desc"), icon: Layers, color: "var(--olive)" },
              { key: "alimentos", label: t(idioma, "nav.alimentos"), desc: t(idioma, "nav.alimentos.desc"), icon: Database, color: "var(--coffee)" },
              { key: "cocinar", label: t(idioma, "nav.queCocino"), desc: premium.active ? t(idioma, "nav.queCocino.descTuyo") : t(idioma, "perfilRoot.funcionPremium"), icon: Camera, color: "var(--rust)" },
              { key: "reparto-comidas", label: t(idioma, "perfilView.repartoComidas.titulo"), desc: t(idioma, "drawer.repartoComidas.desc"), icon: PieChart, color: "var(--mustard-dark)" },
            ]}
          />
        )}

        {tab === "reparto-comidas" && (
          <>
            <BackLink label={t(idioma, "drawer.configuracionComidas")} onClick={() => setTab("config-root")} />
            <RepartoComidasView perfil={data.perfil} onSave={savePerfil} idioma={idioma} />
          </>
        )}

        {tab === "macros-root" && (
          <>
            <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
            <BigCardGrid
              onSelect={setTab}
              cards={MACRO_CATS.map((key) => ({ key, label: t(idioma, CATEGORY_META[key].labelKey), icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
            />
          </>
        )}

        {tab === "especiales-root" && (
          <>
            <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
            <BigCardGrid
              onSelect={setTab}
              cards={ESPECIALES_CATS.map((key) => ({ key, label: t(idioma, CATEGORY_META[key].labelKey), icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
            />
          </>
        )}

        {tab === "proteina" && (
          <>
            <BackLink label={t(idioma, "nav.macros")} onClick={() => setTab("macros-root")} />
            <SectionIntro
              text={t(idioma, "catalogo.proteina.intro")}
            />
            <CardGrid>
              {itemsInCategory("proteina").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "proteina", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
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
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirProteina")} onClick={() => setEditing({ mode: "new", category: "proteina" })} />
            </CardGrid>
          </>
        )}

        {tab === "carbo" && (
          <>
            <BackLink label={t(idioma, "nav.macros")} onClick={() => setTab("macros-root")} />
            <SectionIntro text={t(idioma, "catalogo.carbo.intro")} />
            <ProbabilitySumBadge total={carboTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("carbo").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "carbo", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirCarbohidrato")} onClick={() => setEditing({ mode: "new", category: "carbo" })} />
            </CardGrid>
          </>
        )}

        {tab === "verdura" && (
          <>
            <BackLink label={t(idioma, "nav.macros")} onClick={() => setTab("macros-root")} />
            <SectionIntro text={t(idioma, "catalogo.verdura.intro")} />
            <ProbabilitySumBadge total={verduraTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("verdura").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "verdura", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirVerdura")} onClick={() => setEditing({ mode: "new", category: "verdura" })} />
            </CardGrid>
          </>
        )}

        {tab === "grasa" && (
          <>
            <BackLink label={t(idioma, "nav.macros")} onClick={() => setTab("macros-root")} />
            <SectionIntro text={t(idioma, "catalogo.grasa.intro")} />
            <ProbabilitySumBadge total={grasaTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("grasa").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "grasa", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirGrasa")} onClick={() => setEditing({ mode: "new", category: "grasa" })} />
            </CardGrid>
          </>
        )}

        {tab === "desayuno" && (
          <>
            <BackLink label={t(idioma, "nav.comidasEspeciales")} onClick={() => setTab("especiales-root")} />
            <SectionIntro text={t(idioma, "catalogo.desayuno.intro")} />
            <ProbabilitySumBadge total={desayunoTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("desayuno").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "desayuno", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirDesayuno")} onClick={() => setEditing({ mode: "new", category: "desayuno" })} />
            </CardGrid>
          </>
        )}

        {tab === "media_manana" && (
          <>
            <BackLink label={t(idioma, "nav.comidasEspeciales")} onClick={() => setTab("especiales-root")} />
            <SectionIntro text={t(idioma, "catalogo.mediaManana.intro")} />
            <ProbabilitySumBadge total={mediaMananaTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("media_manana").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "media_manana", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirMediaManana")} onClick={() => setEditing({ mode: "new", category: "media_manana" })} />
            </CardGrid>
          </>
        )}

        {tab === "merienda" && (
          <>
            <BackLink label={t(idioma, "nav.comidasEspeciales")} onClick={() => setTab("especiales-root")} />
            <SectionIntro text={t(idioma, "catalogo.merienda.intro")} />
            <ProbabilitySumBadge total={meriendaTotal} idioma={idioma} />
            <CardGrid>
              {itemsInCategory("merienda").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "merienda", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirMerienda")} onClick={() => setEditing({ mode: "new", category: "merienda" })} />
            </CardGrid>
          </>
        )}

        {tab === "cerrado" && (
          <>
            <BackLink label={t(idioma, "nav.comidasEspeciales")} onClick={() => setTab("especiales-root")} />
            <SectionIntro text={t(idioma, "catalogo.cerrado.intro")} />
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
                  idioma={idioma}
                />
              ))}
            </CardGrid>
          </>
        )}

        {tab === "especial" && (
          <>
            <BackLink label={t(idioma, "nav.comidasEspeciales")} onClick={() => setTab("especiales-root")} />
            <SectionIntro text={t(idioma, "catalogo.especial.intro")} />
            <CardGrid>
              {itemsInCategory("especial").map((ing) => (
                <IngredientCard
                  key={ing.id}
                  ingredient={ing}
                  data={data}
                  onEdit={() => setEditing({ mode: "edit", category: "especial", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  extraNote={t(idioma, "catalogo.especial.extraNote")}
                  idioma={idioma}
                />
              ))}
              <AddCard label={t(idioma, "catalogo.anadirEspecial")} onClick={() => setEditing({ mode: "new", category: "especial" })} />
            </CardGrid>
          </>
        )}

        {tab === "alimentos" && (
          <div>
            <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
          <FoodsView
            foods={data.foods || []}
            ingredients={data.ingredients}
            onEdit={(food) => setEditingFood({ mode: "edit", food })}
            onNew={() => setEditingFood({ mode: "new" })}
            onNewFromPhoto={(photoDataUrl) => setEditingFood({ mode: "new", photo: photoDataUrl })}
            onDelete={(food) => setConfirmDeleteFood(food)}
            idioma={idioma}
          />
          </div>
        )}

        {tab === "cocinar" && (
          <div>
            <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
            {premium.active ? (
              <SuggestMealsView
                data={data}
                onGuardarComoCerrado={(sugerencia) => {
                  const bloqueCerrado = (data.blocks || []).find((b) => b.category === "cerrado");
                  if (!bloqueCerrado) return; // no debería pasar: siempre hay un bloque de cerrados por defecto
                  setEditing({
                    mode: "new",
                    category: "cerrado",
                    blockId: bloqueCerrado.id,
                    ingredient: { name: sugerencia.nombre, composicion: sugerencia.composicion },
                  });
                }}
                idioma={idioma}
              />
            ) : (
              <PremiumRequiredNotice
                titulo={t(idioma, "premiumNotice.cocinar.titulo")}
                texto={t(idioma, "premiumNotice.cocinar.texto")}
                onGoPremium={() => setTab("perfil-premium")}
                idioma={idioma}
              />
            )}
          </div>
        )}

        {tab === "combos" && (
          <div>
            <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
          <RulesView
            rules={data.rules || []}
            ingredients={data.ingredients}
            onEdit={(rule) => setEditingRule({ mode: "edit", rule })}
            onNew={() => setEditingRule({ mode: "new" })}
            onDelete={(rule) => setConfirmDeleteRule(rule)}
            idioma={idioma}
          />
          </div>
        )}

        {/* perfil-datos, perfil-documentos y perfil-premium se llegan directos desde el menú
            lateral (DrawerMenu) — el ☰ del Header, siempre visible, hace de "volver". peso-root sí
            tiene su propia tarjeta intermedia (mismo patrón que config-root con sus categorías):
            agrupa seguimiento de peso, medidas corporales y resumen mensual bajo un único destino
            "Seguimiento de peso" en el menú, con BackLink de vuelta desde cada uno. */}

        {tab === "perfil-datos" && <PerfilView perfil={data.perfil} onSave={savePerfil} idioma={idioma} />}

        {tab === "peso-root" && (
          <BigCardGrid
            onSelect={setTab}
            cards={[
              { key: "perfil-peso", label: t(idioma, "drawer.registroPeso"), desc: premium.active ? t(idioma, "perfilRoot.seguimientoPeso.desc") : t(idioma, "perfilRoot.funcionPremium"), icon: Scale, color: "var(--coffee)" },
              { key: "perfil-medidas", label: t(idioma, "perfilRoot.medidasCorporales"), desc: t(idioma, "perfilRoot.proximamente"), icon: Ruler, color: "var(--berry)" },
              { key: "perfil-resumen", label: t(idioma, "perfilRoot.resumenMensual"), desc: t(idioma, "perfilRoot.resumenMensual.desc"), icon: TrendingUp, color: "var(--olive)" },
            ]}
          />
        )}

        {tab === "perfil-peso" && (
          <>
            <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
            {premium.active ? (
              <PesoView
                perfil={data.perfil}
                pesoTracking={data.pesoTracking || defaultPesoTracking()}
                onAddPeso={addPesoEntrada}
                onUpdateConfig={actualizarConfigPeso}
                onDismissReminder={descartarRecordatorioHoy}
                onCerrarCiclo={cerrarCicloPeso}
                onPausarCiclo={pausarCiclo}
                onReanudarCiclo={reanudarCiclo}
                idioma={idioma}
              />
            ) : (
              <PremiumRequiredNotice
                titulo={t(idioma, "premiumNotice.peso.titulo")}
                texto={t(idioma, "premiumNotice.peso.texto")}
                onGoPremium={() => setTab("perfil-premium")}
                idioma={idioma}
              />
            )}
          </>
        )}

        {tab === "perfil-premium" && <PremiumView premium={premium} idioma={idioma} />}

        {tab === "perfil-resumen" && (
          <>
            <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
            <ResumenMensualView data={data} premium={premium} onGoPremium={() => setTab("perfil-premium")} idioma={idioma} />
          </>
        )}

        {tab === "perfil-medidas" && (
          <>
            <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
            <MedidasPlaceholderView idioma={idioma} />
          </>
        )}

        {tab === "perfil-documentos" && <DocumentosView idioma={idioma} />}

        {tab === "actividad-diaria" && <ActividadDiariaView perfil={data.perfil} onSave={savePerfil} idioma={idioma} />}

        {tab === "ajustes" && <SettingsView perfil={data.perfil} data={data} onSave={savePerfil} onRepetirCuestionario={repetirCuestionarioCatalogo} idioma={idioma} />}

        {tab === "compartir" && <CompartirView idioma={idioma} />}

        {tab === "feedback" && <FeedbackView idioma={idioma} />}
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
          idioma={idioma}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          ingredient={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteIngredient(confirmDelete.id)}
          idioma={idioma}
        />
      )}

      {editingFrequency && (
        <FrequencyModal
          block={editingFrequency}
          onClose={() => setEditingFrequency(null)}
          idioma={idioma}
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
          idioma={idioma}
        />
      )}

      {confirmDeleteFood && (
        <ConfirmFoodDeleteModal
          food={confirmDeleteFood}
          usedBy={data.ingredients.filter((i) => i.foodId === confirmDeleteFood.id)}
          onCancel={() => setConfirmDeleteFood(null)}
          onConfirm={() => deleteFood(confirmDeleteFood.id)}
          idioma={idioma}
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
          idioma={idioma}
        />
      )}

      {confirmDeleteRule && (
        <ConfirmRuleDeleteModal
          rule={confirmDeleteRule}
          ingredients={data.ingredients}
          onCancel={() => setConfirmDeleteRule(null)}
          onConfirm={() => deleteRule(confirmDeleteRule.id)}
          idioma={idioma}
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
// Datos personales (Perfil, en el menú lateral): nombre, sexo, año de nacimiento, altura, peso.
// Antes vivía junto con actividad diaria en un único ProfileFields — se separó para que Perfil y
// la nueva Actividad diaria (ver ActividadDiariaFields, más abajo) puedan ser pantallas distintas
// sin duplicar código; ProfileOnboarding sigue usando las dos juntas, en el mismo orden de
// siempre, así que el alta de un usuario nuevo no cambia todavía (eso es cosa de una tanda futura).
function DatosPersonalesFields({ nombre, setNombre, sexo, setSexo, anioNacimiento, setAnioNacimiento, altura, setAltura, peso, setPeso, idioma }) {
  return (
    <>
      <Field label={t(idioma, "campo.nombre")}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} placeholder={t(idioma, "campo.nombre.placeholder")} />
      </Field>

      <Field label={t(idioma, "campo.sexo")}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["mujer", t(idioma, "campo.sexo.mujer")], ["hombre", t(idioma, "campo.sexo.hombre")]].map(([key, label]) => (
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
        <Field label={t(idioma, "campo.anioNacimiento")}>
          <input type="number" min={1926} max={2012} value={anioNacimiento} onChange={(e) => setAnioNacimiento(e.target.value)} style={inputStyle} placeholder={t(idioma, "campo.anioNacimiento.placeholder")} />
        </Field>
        <Field label={t(idioma, "campo.altura")}>
          <input type="number" min={100} max={230} value={altura} onChange={(e) => setAltura(e.target.value)} style={inputStyle} placeholder="cm" />
        </Field>
        <Field label={t(idioma, "campo.peso")}>
          <input type="number" min={30} max={250} step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} style={inputStyle} placeholder="kg" />
        </Field>
      </div>
    </>
  );
}

// Actividad diaria (destino propio en el menú lateral): tipo de día a día, entrenamientos
// habituales y objetivo — antes vivían dentro de Perfil, junto a los datos personales. sexo,
// anioNacimiento, altura y peso llegan aquí de solo lectura (no se editan en esta pantalla, pero
// hacen falta para el desglose de calorías, que necesita el perfil completo). Ver el porqué de la
// separación en DatosPersonalesFields, justo arriba.
function ActividadDiariaFields({
  palBase, setPalBase, entrenamientos, setEntrenamientos, objetivo, setObjetivo,
  sexo, anioNacimiento, altura, peso, idioma,
}) {
  return (
    <>
      <EstiloVidaFields palBase={palBase} setPalBase={setPalBase} idioma={idioma} />
      <EntrenamientosFields entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos} idioma={idioma} />
      <ObjetivoFields
        objetivo={objetivo} setObjetivo={setObjetivo}
        sexo={sexo} anioNacimiento={anioNacimiento} altura={altura} peso={peso}
        palBase={palBase} entrenamientos={entrenamientos} idioma={idioma}
      />
    </>
  );
}

// Las tres piezas de ActividadDiariaFields, separadas — hacía falta para el asistente de alta por
// pasos (Tanda 3): cada una es su propio paso ahí, mientras que ActividadDiariaView (Tanda 2) las
// sigue mostrando las tres juntas, sin ningún cambio visible.
function EstiloVidaFields({ palBase, setPalBase, idioma }) {
  return (
    <Field label={t(idioma, "campo.tipoDiaADia")}>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: palBase === n.key ? "var(--green-dark)" : "var(--ink)" }}>{t(idioma, "pal." + n.key)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{t(idioma, "pal." + n.key + ".desc")}</div>
          </button>
        ))}
      </div>
    </Field>
  );
}

function EntrenamientosFields({ entrenamientos, setEntrenamientos, idioma }) {
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
    <Field label={t(idioma, "campo.entrenamientos")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {entrenamientos.map((row) => (
          <div key={row.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 9px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={row.tipo}
                onChange={(e) => updateEntrenamiento(row.id, { tipo: e.target.value })}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              >
                {TIPOS_ENTRENAMIENTO.map((tipo) => (
                  <option key={tipo.key} value={tipo.key}>{t(idioma, "entrenamiento." + tipo.key)}</option>
                ))}
              </select>
              <IconBtn onClick={() => removeEntrenamiento(row.id)}><Trash2 size={12} /></IconBtn>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                  {t(idioma, "campo.horasPorSesion")}
                </div>
                <input
                  type="number" min={0} step="0.25" value={row.horas}
                  onChange={(e) => updateEntrenamiento(row.id, { horas: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                  {t(idioma, "campo.vecesPorSemana")}
                </div>
                <input
                  type="number" min={0} max={7} value={row.frecuenciaSemanal}
                  onChange={(e) => updateEntrenamiento(row.id, { frecuenciaSemanal: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
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
        <Plus size={12} /> {t(idioma, "campo.anadirEntrenamiento")}
      </button>
    </Field>
  );
}

// El desglose necesita el perfil completo (sexo/anioNacimiento/altura/peso, de solo lectura aquí
// — ver el comentario de ActividadDiariaFields) más palBase/entrenamientos, que sí se editan en
// los pasos anteriores del mismo formulario o asistente.
function ObjetivoFields({ objetivo, setObjetivo, sexo, anioNacimiento, altura, peso, palBase, entrenamientos, idioma }) {
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const datosCompletos = anioNacimiento && altura && peso;

  return (
    <>
      <Field label={t(idioma, "campo.objetivoActual")}>
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
                <div style={{ fontSize: 13, fontWeight: 700, color: objetivo === key ? "var(--green-dark)" : "var(--ink)" }}>{t(idioma, "objetivoEtapa." + key)}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{t(idioma, "objetivoEtapa." + key + ".desc")}</div>
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
        {t(idioma, "profileFields.formula")}
      </div>

      <button
        onClick={() => setMostrarDesglose(true)}
        disabled={!datosCompletos}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8,
          width: "100%", border: "1px solid var(--line)", background: "#fff", borderRadius: 8,
          padding: "9px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          cursor: datosCompletos ? "pointer" : "default", opacity: datosCompletos ? 1 : 0.5,
        }}
      >
        <Calculator size={13} /> {t(idioma, "profileFields.verDesglose")}
      </button>

      {mostrarDesglose && (
        <DesgloseCaloriasModal
          perfil={{
            sexo,
            anioNacimiento: Number(anioNacimiento),
            altura: Number(altura),
            peso: Number(peso),
            palBase,
            entrenamientos: entrenamientos
              .filter((e) => e.horas && e.frecuenciaSemanal)
              .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
            objetivo,
          }}
          onClose={() => setMostrarDesglose(false)}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Ventana con el desglose paso a paso del cálculo de kcal (BMR → × PAL → + entrenamiento → etapa),
// recalculada en vivo con los valores que haya en el formulario aunque no se hayan guardado
// todavía. Nace de que el BMR puro no se muestra en ningún otro sitio de la app — solo el resultado
// ya multiplicado por el PAL ("kcal día a día") — y eso puede llevar a pensar que hay un error de
// cálculo cuando en realidad todo cuadra, solo que son dos magnitudes distintas.
function DesgloseCaloriasModal({ perfil, onClose, idioma }) {
  const r = calcularObjetivosPerfil(perfil);
  const nivelPal = PAL_BASE_NIVELES.find((n) => n.key === perfil.palBase);
  const etapa = OBJETIVO_ETAPAS[r?.objetivo];

  return (
    <ModalShell title={t(idioma, "desglose.titulo")} onClose={onClose}>
      {!r ? (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "desglose.faltaDatos")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DesgloseFila label={t(idioma, "desglose.bmr")} valor={`${r.bmr} kcal`} />
          <DesgloseFila label={t(idioma, "desglose.palLinea", { pal: nivelPal.pal, nivel: t(idioma, "pal." + nivelPal.key) })} valor={t(idioma, "desglose.kcalDiaADia", { n: r.kcalBase })} />
          {r.kcalEntrenamiento > 0 && (
            <DesgloseFila label={t(idioma, "desglose.entrenamientos")} valor={`${r.kcalEntrenamiento} kcal`} />
          )}
          <DesgloseFila label={t(idioma, "desglose.tdeeMantenimiento")} valor={`${r.kcalMantenimiento} kcal`} fuerte />
          {etapa && r.objetivo !== "mantenimiento" && (
            <DesgloseFila
              label={t(idioma, "desglose.etapaLinea", { etapa: t(idioma, "objetivoEtapa." + r.objetivo), signo: r.ajustePct > 0 ? "+" : "", pct: r.ajustePct })}
              valor={`${r.kcal} kcal`}
              fuerte
            />
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cerrar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function DesgloseFila({ label, valor, fuerte }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline",
        paddingTop: fuerte ? 8 : 0, borderTop: fuerte ? "1px solid var(--line)" : "none",
      }}
    >
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)" }}>{label}</div>
      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, whiteSpace: "nowrap",
          fontWeight: fuerte ? 700 : 600, color: fuerte ? "var(--green-dark)" : "var(--ink)",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

// Asistente de alta por pasos (Bloque 2 del rediseño, Tanda 3): antes era un único formulario
// larguísimo con todos los campos de golpe — ahora son 5 pasos cortos con "Siguiente"/"Atrás",
// mismos campos de siempre y mismo resultado final (un solo onComplete con todo junto, igual que
// antes), solo cambia cómo se rellena. "Saltar" sigue disponible en cualquier paso y abandona el
// asistente entero, como ya hacía antes.
const ONBOARDING_PASOS = ["datos", "estiloVida", "entrenamientos", "objetivo", "reparto"];

function ProfileOnboarding({ onComplete, onSkip, idioma }) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState("mujer");
  const [anioNacimiento, setAnioNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [palBase, setPalBase] = useState("escritorio");
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [objetivo, setObjetivo] = useState("mantenimiento");
  const [presetId, setPresetId] = useState("clasico-4");
  const presetActual = PRESETS_COMIDAS.find((p) => p.id === presetId) || PRESETS_COMIDAS[0];
  const [pesos, setPesos] = useState(() =>
    presetActual.pesosPorDefecto ? { ...presetActual.pesosPorDefecto } : repartoUniforme(presetActual.meals)
  );

  function selectPreset(preset) {
    if (preset.id === presetId) return;
    setPresetId(preset.id);
    setPesos(preset.pesosPorDefecto ? { ...preset.pesosPorDefecto } : repartoUniforme(preset.meals));
  }

  const datosValidos = anioNacimiento && altura && peso;
  const sumaPesos = presetActual.meals.reduce((s, m) => s + (Number(pesos[m]) || 0), 0);
  const repartoValido = sumaPesos === 100;
  const puedeAvanzar = paso === 0 ? datosValidos : paso === 4 ? repartoValido : true;

  function terminar() {
    if (!repartoValido) return;
    const repartoComidas = {};
    presetActual.meals.forEach((m) => { repartoComidas[m] = (Number(pesos[m]) || 0) / 100; });
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
      presetComidas: presetId,
      repartoComidas,
      // El idioma elegido (o detectado) antes de iniciar sesión, en la pantalla de bienvenida —
      // así un perfil nuevo no empieza en español por defecto si ya se había puesto en inglés ahí.
      idioma: leerIdiomaGuardado(),
    });
  }

  function siguiente() {
    if (!puedeAvanzar) return;
    if (paso === ONBOARDING_PASOS.length - 1) terminar();
    else setPaso((p) => p + 1);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🍽️</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, color: "var(--green-dark)", margin: "0 0 6px 0" }}>
          {t(idioma, "onboarding.titulo")}
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          {t(idioma, "onboarding.subtitulo")}
        </p>
      </div>

      <PasosIndicador pasoActual={paso} pasos={ONBOARDING_PASOS} idioma={idioma} labelPrefix="onboarding.paso" />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px" }}>
        {paso === 0 && (
          <DatosPersonalesFields
            nombre={nombre} setNombre={setNombre}
            sexo={sexo} setSexo={setSexo}
            anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
            altura={altura} setAltura={setAltura}
            peso={peso} setPeso={setPeso}
            idioma={idioma}
          />
        )}
        {paso === 1 && <EstiloVidaFields palBase={palBase} setPalBase={setPalBase} idioma={idioma} />}
        {paso === 2 && <EntrenamientosFields entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos} idioma={idioma} />}
        {paso === 3 && (
          <ObjetivoFields
            objetivo={objetivo} setObjetivo={setObjetivo}
            sexo={sexo} anioNacimiento={anioNacimiento} altura={altura} peso={peso}
            palBase={palBase} entrenamientos={entrenamientos} idioma={idioma}
          />
        )}
        {paso === 4 && (
          <RepartoComidasFields
            presetId={presetId} presetActual={presetActual} pesos={pesos} setPesos={setPesos}
            onSelectPreset={selectPreset} sumaPesos={sumaPesos} repartoValido={repartoValido} idioma={idioma}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
                color: "var(--ink)", background: "#fff", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", cursor: "pointer",
              }}
            >
              {t(idioma, "onboarding.atras")}
            </button>
          )}
          <button
            onClick={siguiente}
            disabled={!puedeAvanzar}
            style={{
              flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
              color: "#fff", background: puedeAvanzar ? "var(--green)" : "var(--line)", border: "none",
              borderRadius: 9, padding: "12px", cursor: puedeAvanzar ? "pointer" : "default",
            }}
          >
            {paso === ONBOARDING_PASOS.length - 1 ? t(idioma, "onboarding.guardarContinuar") : t(idioma, "onboarding.siguiente")}
          </button>
        </div>
        <button
          onClick={onSkip}
          style={{
            width: "100%", marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "onboarding.saltar")}
        </button>
      </div>
    </div>
  );
}

// Indicador de progreso reutilizado por los dos asistentes de esta tanda (perfil y cuestionario de
// catálogo): "Paso X de N" más una barra de puntos rellenos hasta el paso actual. `pasos` es el
// array de claves de cada asistente (ONBOARDING_PASOS o el del cuestionario) — así no depende de
// cuál de los dos lo esté usando.
function PasosIndicador({ pasoActual, pasos, idioma, labelPrefix }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 6 }}>
        {pasos.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === pasoActual ? 18 : 6, height: 6, borderRadius: 3,
              background: i <= pasoActual ? "var(--green)" : "var(--line)", transition: "all 0.15s",
            }}
          />
        ))}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)" }}>
        {t(idioma, "onboarding.pasoXdeN", { actual: pasoActual + 1, total: pasos.length })} · {t(idioma, `${labelPrefix}.${pasos[pasoActual]}`)}
      </div>
    </div>
  );
}

// ---------- Cuestionario de catálogo (Bloque 3 del rediseño, Tanda 3) ----------
// Se muestra justo después del asistente de perfil, solo la primera vez y solo si no se saltó el
// asistente de perfil (ver el porqué en RuedaDePlatos, junto a guardarPerfilInicial). Construye
// ingredients a partir de tarjetas elegidas con un toque — nunca hay que escribir nada ni meter un
// número a mano. "Saltar todo" está disponible en cualquier pantalla, no solo en la intro.
// Pasos base, siempre presentes. Los tres pasos de "comida ligera" (desayuno, media mañana,
// merienda — Tanda 2 piloto de desayuno, Tanda 3 extiende el mismo mecanismo a los otros dos) se
// añaden condicionalmente al final, según qué comidas tenga el reparto elegido en el perfil — ver
// pasosCuestionario() más abajo. Un preset como "3 comidas · sin desayuno" no añade el paso
// "desayuno"; uno como "5 comidas · con media mañana" añade también "media_manana".
const CUESTIONARIO_PASOS_BASE = ["exclusiones", "proteinas", "carbohidratos", "verduras", "grasas"];
function pasosCuestionario(repartoComidas) {
  const pasos = [...CUESTIONARIO_PASOS_BASE];
  if (repartoComidas && repartoComidas.Desayuno !== undefined) pasos.push("desayuno");
  if (repartoComidas && repartoComidas["Media mañana"] !== undefined) pasos.push("media_manana");
  if (repartoComidas && repartoComidas.Merienda !== undefined) pasos.push("merienda");
  return pasos;
}
// Frecuencia semanal para proteínas (1/2/3), peso relativo Poco/Normal/Mucho para el resto —
// mismas claves de i18n reutilizadas en las 4 pantallas de selección vía SeleccionAlimentosStep,
// y también por los arquetipos de Desayuno (su "nivel" pesa igual que Poco/Normal/Mucho).
const NIVELES_FRECUENCIA = ["cuestionario.nivel.freq1", "cuestionario.nivel.freq2", "cuestionario.nivel.freq3"];
const NIVELES_PESO = ["cuestionario.nivel.poco", "cuestionario.nivel.normal", "cuestionario.nivel.mucho"];

// Arquetipos de comida ligera (Tanda 2, piloto solo para Desayuno; Tanda 3 reutiliza exactamente
// las mismas 3 plantillas, sin cambiar nada de ellas, también para Media mañana y Merienda — están
// pensadas para "montar un plato" a partir de pan/cereal/lácteo/fruta, algo que no es exclusivo del
// desayuno). Cada una señala qué carpeta(s) de CATEGORIAS_ALIMENTOS abrir para completarla: "grupos"
// con más de un elemento implica una sub-selección guiada, en orden (p.ej. pan, luego
// acompañamiento); un solo grupo con multiSelect implica elegir libremente entre varias carpetas a
// la vez, sin guiar. "nombreEs" es el nombre fijo del ingrediente resultante (en español, como el
// resto del modelo de datos — ver CLAUDE.md), independiente del idioma de la interfaz.
// Deliberadamente compartidas entre las tres comidas por ahora: cuando haga falta diferenciar las
// opciones por comida (pendiente, ver conversación), esto se separará en tres arrays propios.
const ARQUETIPOS_COMIDA_LIGERA = [
  {
    key: "tostadas", nombreEs: "Tostadas", labelKey: "arquetipo.desayuno.tostadas", emoji: "🍞",
    grupos: [
      { categorias: ["panes"], multiSelect: false, labelKey: "arquetipo.grupo.pan" },
      { categorias: ["embutido_fiambre", "lacteos", "grasas", "snacks_procesados"], multiSelect: true, labelKey: "arquetipo.grupo.acompanamiento" },
    ],
  },
  {
    key: "cereales_lacteo", nombreEs: "Cereales con lácteo", labelKey: "arquetipo.desayuno.cerealesLacteo", emoji: "🥣",
    grupos: [
      { categorias: ["cereales"], multiSelect: false, labelKey: "arquetipo.grupo.cereal" },
      { categorias: ["lacteos"], multiSelect: false, labelKey: "arquetipo.grupo.lacteo" },
    ],
  },
  {
    key: "combinado", nombreEs: "Plato combinado", labelKey: "arquetipo.desayuno.combinado", emoji: "🍽️",
    grupos: [
      { categorias: ["proteinas", "embutido_fiambre", "panes", "lacteos", "vegetales", "frutas"], multiSelect: true, labelKey: "arquetipo.grupo.libre" },
    ],
  },
];

// A partir de las respuestas, construye la lista de ingredients que arrancará el catálogo de la
// cuenta nueva. Proteínas -> regla de frecuencia semanal directa (el nivel elegido, 1-3). Carbo/
// verdura/grasa -> regla de probabilidad, normalizando los pesos relativos (1-3) de lo elegido en
// cada categoría para que sumen exactamente 100 (el último ajusta el redondeo, mismo método que
// ya usa RepartoComidasFields con el reparto de comidas).
function construirIngredientesDesdeCuestionario({ frecuencias, pesosCarbo, pesosVerdura, pesosGrasa, comidasLigeras }) {
  const ingredients = [];

  Object.entries(frecuencias).forEach(([foodId, nivel]) => {
    const opt = CUESTIONARIO_PROTEINAS.find((o) => o.foodId === foodId);
    if (!opt) return;
    ingredients.push({
      id: uid(), name: opt.nombreEs, category: "proteina", ruleType: "frecuencia",
      freqCantidad: nivel, freqPeriodo: "semana", active: true, foodId, gramos: opt.gramos,
    });
  });

  function agregarPorProbabilidad(mapaPesos, opciones, category) {
    const entradas = Object.entries(mapaPesos);
    const sumaPesos = entradas.reduce((s, [, w]) => s + w, 0);
    if (sumaPesos <= 0) return;
    let acumulado = 0;
    entradas.forEach(([foodId, w], i) => {
      const opt = opciones.find((o) => o.foodId === foodId);
      if (!opt) return;
      const probabilidad = i === entradas.length - 1 ? 100 - acumulado : Math.round((w / sumaPesos) * 100);
      acumulado += probabilidad;
      ingredients.push({
        id: uid(), name: opt.nombreEs, category, ruleType: "probabilidad",
        probabilidad, active: true, foodId, gramos: opt.gramos,
      });
    });
  }
  agregarPorProbabilidad(pesosCarbo, CUESTIONARIO_CARBOS, "carbo");
  agregarPorProbabilidad(pesosVerdura, CUESTIONARIO_VERDURAS, "verdura");
  agregarPorProbabilidad(pesosGrasa, CUESTIONARIO_GRASAS, "grasa");

  // Comidas ligeras (desayuno: Tanda 2 piloto; media mañana y merienda: Tanda 3, mismo mecanismo):
  // cada arquetipo elegido se convierte en un ingrediente de la categoría correspondiente
  // ("desayuno"/"media_manana"/"merienda") con su propia composición — la misma mecánica que ya usa
  // la app para desayunos y platos cerrados creados a mano (ver EditModal). Los gramos de cada fila
  // de la composición son el valor por defecto de la categoría del alimento (CATEGORIAS_ALIMENTOS),
  // no uno curado a mano por alimento — deliberadamente aproximados, para eso está el aviso en el
  // propio paso. Las tres comidas se resuelven por separado (una selección no afecta a la otra),
  // aunque compartan el mismo catálogo de arquetipos.
  function agregarComidaLigera(seleccion, category) {
    if (!seleccion) return;
    const entradas = Object.entries(seleccion);
    const sumaNiveles = entradas.reduce((s, [, v]) => s + v.nivel, 0);
    if (sumaNiveles <= 0) return;
    let acumulado = 0;
    entradas.forEach(([arqKey, v], i) => {
      const arquetipo = ARQUETIPOS_COMIDA_LIGERA.find((a) => a.key === arqKey);
      if (!arquetipo) return;
      const composicion = [];
      arquetipo.grupos.forEach((grupo, gi) => {
        (v.grupos[gi] || []).forEach((foodId) => {
          const food = FOODS_SEED.find((f) => f.id === foodId);
          const cat = food && CATEGORIAS_ALIMENTOS.find((c) => c.key === food.categoria);
          composicion.push({ id: uid(), foodId, gramos: cat ? cat.gramosDefecto : 50 });
        });
      });
      // Arquetipo marcado pero sin ningún alimento elegido dentro: no genera nada, para no dejar
      // un "plato" vacío sin composición real.
      if (!composicion.length) return;
      const probabilidad = i === entradas.length - 1 ? 100 - acumulado : Math.round((v.nivel / sumaNiveles) * 100);
      acumulado += probabilidad;
      ingredients.push({
        id: uid(), name: arquetipo.nombreEs, category, ruleType: "probabilidad",
        probabilidad, active: true, composicion,
      });
    });
  }
  if (comidasLigeras) {
    agregarComidaLigera(comidasLigeras.desayuno, "desayuno");
    agregarComidaLigera(comidasLigeras.media_manana, "media_manana");
    agregarComidaLigera(comidasLigeras.merienda, "merienda");
  }

  return ingredients;
}

function CatalogoOnboarding({ idioma, repartoComidas, onComplete, onSkipAll }) {
  const [fase, setFase] = useState("intro"); // "intro" | "paso" | "cierre"
  const [paso, setPaso] = useState(0);
  const [exclusiones, setExclusiones] = useState([]);
  const [frecuencias, setFrecuencias] = useState({});
  const [pesosCarbo, setPesosCarbo] = useState({});
  const [pesosVerdura, setPesosVerdura] = useState({});
  const [pesosGrasa, setPesosGrasa] = useState({});
  // Una selección independiente por cada comida ligera (Tanda 3: antes solo existía la de
  // desayuno). Misma forma en las tres: { [arquetipoKey]: { nivel: 1|2|3, grupos: { [índiceDeGrupo]: foodId[] } } }.
  const [desayunoSeleccion, setDesayunoSeleccion] = useState({});
  const [mediaMananaSeleccion, setMediaMananaSeleccion] = useState({});
  const [meriendaSeleccion, setMeriendaSeleccion] = useState({});

  const pasos = pasosCuestionario(repartoComidas);

  function estaExcluido(foodId) {
    return exclusiones.some((key) => EXCLUSIONES_DISPONIBLES.find((e) => e.key === key)?.foodIds.includes(foodId));
  }
  function alternarExclusion(key) {
    setExclusiones((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  function alternarSeleccion(setMapa, foodId, nivelInicial) {
    setMapa((prev) => {
      if (foodId in prev) {
        const resto = { ...prev };
        delete resto[foodId];
        return resto;
      }
      return { ...prev, [foodId]: nivelInicial };
    });
  }
  function ciclarNivel(setMapa, foodId) {
    setMapa((prev) => ({ ...prev, [foodId]: (prev[foodId] % 3) + 1 }));
  }

  // Genéricos: parametrizados por el setState de la comida ligera concreta (desayuno/media
  // mañana/merienda), para no triplicar la misma lógica tres veces (Tanda 3).
  function alternarArquetipoComidaLigera(setMapa, key) {
    setMapa((prev) => {
      if (prev[key]) {
        const { [key]: _omitido, ...resto } = prev;
        return resto;
      }
      return { ...prev, [key]: { nivel: 2, grupos: {} } };
    });
  }
  function ciclarNivelArquetipoComidaLigera(setMapa, key) {
    setMapa((prev) => ({ ...prev, [key]: { ...prev[key], nivel: (prev[key].nivel % 3) + 1 } }));
  }
  function alternarFoodEnGrupoComidaLigera(setMapa, arqKey, grupoIdx, foodId, multiSelect) {
    setMapa((prev) => {
      const arq = prev[arqKey];
      if (!arq) return prev;
      const actual = arq.grupos[grupoIdx] || [];
      const nuevo = multiSelect
        ? (actual.includes(foodId) ? actual.filter((f) => f !== foodId) : [...actual, foodId])
        : (actual.includes(foodId) ? [] : [foodId]);
      return { ...prev, [arqKey]: { ...arq, grupos: { ...arq.grupos, [grupoIdx]: nuevo } } };
    });
  }

  function siguiente() {
    if (paso === pasos.length - 1) setFase("cierre");
    else setPaso((p) => p + 1);
  }
  function confirmarCierre() {
    onComplete(construirIngredientesDesdeCuestionario({
      frecuencias, pesosCarbo, pesosVerdura, pesosGrasa,
      comidasLigeras: { desayuno: desayunoSeleccion, media_manana: mediaMananaSeleccion, merienda: meriendaSeleccion },
    }));
  }

  if (fase === "intro") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🥗</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "var(--green-dark)", margin: "0 0 12px" }}>
          {t(idioma, "cuestionario.intro.titulo")}
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 26px" }}>
          {t(idioma, "cuestionario.intro.texto", { n: pasos.length })}
        </p>
        <button
          onClick={() => setFase("paso")}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "cuestionario.intro.empezar")}
        </button>
        <button
          onClick={onSkipAll}
          style={{
            width: "100%", marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "cuestionario.saltarTodo")}
        </button>
      </div>
    );
  }

  if (fase === "cierre") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>✅</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "var(--green-dark)", margin: "0 0 12px" }}>
          {t(idioma, "cuestionario.cierre.titulo")}
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 26px" }}>
          {t(idioma, "cuestionario.cierre.texto")}
        </p>
        <button
          onClick={confirmarCierre}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "cuestionario.cierre.entrar")}
        </button>
      </div>
    );
  }

  // fase === "paso": Exclusiones (chips simples) + 4 de selección con tarjetas
  // (SeleccionAlimentosStep) + hasta 3 pasos de comida ligera (SeleccionComidaLigeraStep: desayuno
  // desde la Tanda 2, media mañana y merienda desde la Tanda 3), cada uno solo si esa comida está en
  // el reparto elegido. Las exclusiones elegidas en el paso 0 filtran las opciones de todos los
  // pasos siguientes, incluidos los de comida ligera.
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <PasosIndicador pasoActual={paso} pasos={pasos} idioma={idioma} labelPrefix="cuestionario.paso" />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px" }}>
        {paso === 0 && (
          <>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              {t(idioma, "cuestionario.exclusiones.titulo")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {EXCLUSIONES_DISPONIBLES.map((ex) => {
                const activo = exclusiones.includes(ex.key);
                return (
                  <button
                    key={ex.key}
                    onClick={() => alternarExclusion(ex.key)}
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 600,
                      padding: "8px 13px", borderRadius: 20, border: "1px solid var(--line)",
                      background: activo ? "var(--rust-soft)" : "#fff", color: activo ? "var(--rust)" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {t(idioma, ex.labelKey)}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {paso === 1 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.proteinas.titulo"
            opciones={CUESTIONARIO_PROTEINAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={frecuencias}
            nivelLabels={NIVELES_FRECUENCIA}
            onToggle={(foodId) => alternarSeleccion(setFrecuencias, foodId, 1)}
            onCiclarNivel={(foodId) => ciclarNivel(setFrecuencias, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 2 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.carbohidratos.titulo"
            opciones={CUESTIONARIO_CARBOS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosCarbo}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosCarbo, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosCarbo, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 3 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.verduras.titulo"
            opciones={CUESTIONARIO_VERDURAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosVerdura}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosVerdura, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosVerdura, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 4 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.grasas.titulo"
            opciones={CUESTIONARIO_GRASAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosGrasa}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosGrasa, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosGrasa, foodId)}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "desayuno" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.desayuno.titulo"
            seleccion={desayunoSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setDesayunoSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setDesayunoSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setDesayunoSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "media_manana" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.mediaManana.titulo"
            seleccion={mediaMananaSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setMediaMananaSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setMediaMananaSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setMediaMananaSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "merienda" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.merienda.titulo"
            seleccion={meriendaSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setMeriendaSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setMeriendaSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setMeriendaSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
                color: "var(--ink)", background: "#fff", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", cursor: "pointer",
              }}
            >
              {t(idioma, "onboarding.atras")}
            </button>
          )}
          <button
            onClick={siguiente}
            style={{
              flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
              color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
            }}
          >
            {paso === pasos.length - 1 ? t(idioma, "cuestionario.terminar") : t(idioma, "onboarding.siguiente")}
          </button>
        </div>
        <button
          onClick={onSkipAll}
          style={{
            width: "100%", marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "cuestionario.saltarTodo")}
        </button>
      </div>
    </div>
  );
}

// Fila seleccionable con nivel: tocar el nombre activa/desactiva el alimento; con el alimento
// activo aparece un chip aparte a la derecha que, al tocarlo, rota entre los 3 niveles (1/2/3 o
// Poco/Normal/Mucho, según nivelLabels) — nunca hay que escribir un número.
function SeleccionAlimentosStep({ tituloKey, opciones, seleccion, nivelLabels, onToggle, onCiclarNivel, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
        {t(idioma, tituloKey)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {opciones.map((opt) => {
          const nivel = seleccion[opt.foodId];
          const activo = nivel !== undefined;
          return (
            <div key={opt.foodId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => onToggle(opt.foodId)}
                style={{
                  flex: 1, textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: activo ? 700 : 500,
                  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)",
                  background: activo ? "var(--green-soft)" : "#fff", color: activo ? "var(--green-dark)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {t(idioma, opt.labelKey)}
              </button>
              {activo && (
                <button
                  onClick={() => onCiclarNivel(opt.foodId)}
                  style={{
                    flexShrink: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                    padding: "9px 10px", borderRadius: 8, border: "1px solid var(--green)", background: "#fff",
                    color: "var(--green-dark)", cursor: "pointer", minWidth: 60,
                  }}
                >
                  {t(idioma, nivelLabels[nivel - 1])}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Paso de comida ligera del cuestionario (Tanda 2, piloto solo para Desayuno; Tanda 3 reutiliza el
// mismo componente, sin cambios, también para Media mañana y Merienda — solo cambia `tituloKey` y
// qué selección/setState le pasa CatalogoOnboarding): en vez de una lista plana de alimentos,
// tarjetas de "arquetipo" (Tostadas, Cereales con lácteo, Plato combinado) que, al activarse,
// despliegan debajo su propia sub-selección por carpeta de CATEGORIAS_ALIMENTOS — una o dos guiadas
// en orden, o una libre entre varias a la vez.
// Los nombres de los alimentos se muestran tal cual están en la base de datos (en español, ver
// CLAUDE.md) — a diferencia de CUESTIONARIO_PROTEINAS y compañía, estas carpetas no tienen todavía
// una traducción propia por alimento; es una limitación conocida de este piloto, no un olvido.
function SeleccionComidaLigeraStep({ tituloKey, seleccion, onToggleArquetipo, onCiclarNivel, onToggleFood, estaExcluido, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
        {t(idioma, tituloKey)}
      </div>
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 11.5, color: "var(--mustard-dark)", background: "var(--mustard-soft)", borderRadius: 8,
          padding: "9px 11px", marginBottom: 14, lineHeight: 1.5,
        }}
      >
        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t(idioma, "cuestionario.comidaLigera.aviso")}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ARQUETIPOS_COMIDA_LIGERA.map((arq) => {
          const arqSel = seleccion[arq.key];
          const activo = !!arqSel;
          return (
            <div
              key={arq.key}
              style={{
                border: "1px solid var(--line)", borderRadius: 10, padding: "10px 11px",
                background: activo ? "var(--green-soft)" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => onToggleArquetipo(arq.key)}
                  style={{
                    flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8, padding: 0,
                  }}
                >
                  <span style={{ fontSize: 19 }}>{arq.emoji}</span>
                  <span
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5,
                      fontWeight: activo ? 700 : 500, color: activo ? "var(--green-dark)" : "var(--ink)",
                    }}
                  >
                    {t(idioma, arq.labelKey)}
                  </span>
                </button>
                {activo && (
                  <button
                    onClick={() => onCiclarNivel(arq.key)}
                    style={{
                      flexShrink: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                      padding: "8px 10px", borderRadius: 8, border: "1px solid var(--green)", background: "#fff",
                      color: "var(--green-dark)", cursor: "pointer", minWidth: 60,
                    }}
                  >
                    {t(idioma, NIVELES_PESO[arqSel.nivel - 1])}
                  </button>
                )}
              </div>

              {activo && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {arq.grupos.map((grupo, gi) => {
                    const opciones = FOODS_SEED.filter((f) => grupo.categorias.includes(f.categoria) && !estaExcluido(f.id));
                    if (!opciones.length) return null;
                    const elegidos = arqSel.grupos[gi] || [];
                    return (
                      <div key={gi}>
                        <div
                          style={{
                            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, fontWeight: 700,
                            color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
                          }}
                        >
                          {t(idioma, grupo.labelKey)}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {opciones.map((food) => {
                            const marcado = elegidos.includes(food.id);
                            const catFood = CATEGORIAS_ALIMENTOS.find((c) => c.key === food.categoria);
                            return (
                              <button
                                key={food.id}
                                onClick={() => onToggleFood(arq.key, gi, food.id, grupo.multiSelect)}
                                style={{
                                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 600,
                                  padding: "6px 10px", borderRadius: 20, border: "1px solid var(--line)",
                                  background: marcado ? "var(--green-dark)" : "#fff",
                                  color: marcado ? "#fff" : "var(--ink)", cursor: "pointer",
                                }}
                              >
                                {catFood?.emoji} {food.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Pestaña "Perfil": desde la Tanda 2 del rediseño de navegación, solo datos personales — actividad
// diaria (ActividadDiariaView) y reparto de comidas (RepartoComidasView) son destinos propios en
// el menú lateral. idioma llega como prop (lo decide Ajustes, ver SettingsView).
function PerfilView({ perfil, onSave, idioma }) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [sexo, setSexo] = useState(perfil?.sexo ?? "mujer");
  const [anioNacimiento, setAnioNacimiento] = useState(perfil?.anioNacimiento ?? "");
  const [altura, setAltura] = useState(perfil?.altura ?? "");
  const [peso, setPeso] = useState(perfil?.peso ?? "");
  const [saved, setSaved] = useState(false);

  const valid = anioNacimiento && altura && peso;

  function handleSave() {
    if (!valid) return;
    // Se parte de "...perfil" y no de un objeto construido desde cero: onSave sustituye el perfil
    // entero, así que si esta pantalla no incluyera los campos que editan Ajustes, Actividad diaria
    // o Reparto de comidas, guardar aquí los borraría sin querer.
    onSave({
      ...perfil,
      nombre: nombre.trim(),
      sexo,
      anioNacimiento: Number(anioNacimiento),
      altura: Number(altura),
      peso: Number(peso),
    });
    setSaved(true);
  }

  return (
    <>
      <SectionIntro text={t(idioma, "perfilView.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <DatosPersonalesFields
          nombre={nombre} setNombre={setNombre}
          sexo={sexo} setSexo={setSexo}
          anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
          altura={altura} setAltura={setAltura}
          peso={peso} setPeso={setPeso}
          idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          disabled={!valid}
          style={{
            width: "100%", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: valid ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: valid ? "pointer" : "default",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--green-dark)",
              background: "var(--green-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {t(idioma, "perfilView.guardadoOk")}
          </div>
        )}
      </div>
    </>
  );
}

// Actividad diaria: destino propio en el menú lateral desde la Tanda 2 — antes vivía dentro de
// Perfil. Mismo patrón de guardado que el resto de pantallas nacidas de partir Perfil (ver el
// comentario de handleSave en PerfilView, arriba): siempre "...perfil" como base.
function ActividadDiariaView({ perfil, onSave, idioma }) {
  const [palBase, setPalBase] = useState(
    perfil?.palBase ?? (perfil?.actividad ? NIVELES_ACTIVIDAD_LEGACY[perfil.actividad]?.palBaseKey : null) ?? "escritorio"
  );
  const [entrenamientos, setEntrenamientos] = useState(
    (perfil?.entrenamientos || []).map((e) => ({ id: uid(), ...e }))
  );
  const [objetivo, setObjetivo] = useState(perfil?.objetivo ?? "mantenimiento");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave({
      ...perfil,
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
      <SectionIntro text={t(idioma, "actividadDiaria.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <ActividadDiariaFields
          palBase={palBase} setPalBase={setPalBase}
          entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos}
          objetivo={objetivo} setObjetivo={setObjetivo}
          sexo={perfil?.sexo} anioNacimiento={perfil?.anioNacimiento} altura={perfil?.altura} peso={perfil?.peso}
          idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          style={{
            width: "100%", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none",
            borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--green-dark)",
              background: "var(--green-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {t(idioma, "perfilView.guardadoOk")}
          </div>
        )}
      </div>
    </>
  );
}

// Reparto de comidas: destino propio en el menú lateral desde la Tanda 2, dentro de "Configuración
// de comidas" — antes vivía al final de Perfil. Mismo contenido y misma lógica de siempre (Fase 4),
// solo cambia dónde vive.
function RepartoComidasView({ perfil, onSave, idioma }) {
  const [presetId, setPresetId] = useState(perfil?.presetComidas ?? "clasico-4");
  const presetActual = PRESETS_COMIDAS.find((p) => p.id === presetId) || PRESETS_COMIDAS[0];
  const [pesos, setPesos] = useState(() => {
    if (perfil?.repartoComidas) {
      const pct = {};
      Object.keys(perfil.repartoComidas).forEach((m) => { pct[m] = Math.round(perfil.repartoComidas[m] * 100); });
      return pct;
    }
    return presetActual.pesosPorDefecto ? { ...presetActual.pesosPorDefecto } : repartoUniforme(presetActual.meals);
  });
  const [saved, setSaved] = useState(false);

  function selectPreset(preset) {
    if (preset.id === presetId) return;
    setPresetId(preset.id);
    setPesos(preset.pesosPorDefecto ? { ...preset.pesosPorDefecto } : repartoUniforme(preset.meals));
  }

  const sumaPesos = presetActual.meals.reduce((s, m) => s + (Number(pesos[m]) || 0), 0);
  const repartoValido = sumaPesos === 100;

  function handleSave() {
    if (!repartoValido) return;
    const repartoComidas = {};
    presetActual.meals.forEach((m) => { repartoComidas[m] = (Number(pesos[m]) || 0) / 100; });
    onSave({ ...perfil, presetComidas: presetId, repartoComidas });
    setSaved(true);
  }

  return (
    <>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <RepartoComidasFields
          presetId={presetId} presetActual={presetActual} pesos={pesos} setPesos={setPesos}
          onSelectPreset={selectPreset} sumaPesos={sumaPesos} repartoValido={repartoValido} idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          disabled={!repartoValido}
          style={{
            width: "100%", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: repartoValido ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: repartoValido ? "pointer" : "default",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--green-dark)",
              background: "var(--green-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {t(idioma, "perfilView.guardadoOk")}
          </div>
        )}
      </div>
    </>
  );
}

// El contenido en sí de "Reparto de comidas", sin estado propio ni botón de guardar — lo maneja
// quien lo use: RepartoComidasView (guarda al momento) o el asistente de alta por pasos, Tanda 3
// (guarda junto con el resto del perfil al terminar el asistente entero).
function RepartoComidasFields({ presetId, presetActual, pesos, setPesos, onSelectPreset, sumaPesos, repartoValido, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
        {t(idioma, "perfilView.repartoComidas.titulo")}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginBottom: 14, lineHeight: 1.5 }}>
        {t(idioma, "perfilView.repartoComidas.intro")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {PRESETS_COMIDAS.map((preset) => {
          const elegido = preset.id === presetId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              style={{
                textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif",
                padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
                background: elegido ? "var(--green-soft)" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: elegido ? "var(--green-dark)" : "var(--ink)" }}>
                  {t(idioma, "preset." + preset.id + ".label")}
                </span>
                {preset.recomendado && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, color: "var(--mustard-dark)", background: "var(--mustard-soft)",
                      borderRadius: 20, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.3,
                    }}
                  >
                    {t(idioma, "perfilView.recomendado")}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.45 }}>{t(idioma, "preset." + preset.id + ".texto")}</div>
            </button>
          );
        })}
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {t(idioma, "perfilView.pesoDeCadaComida")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {presetActual.meals.map((mealType) => (
          <React.Fragment key={mealType}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink)" }}>
                {t(idioma, "mealType." + mealType)}
              </span>
              <input
                type="number" min={0} max={100} step={1}
                value={pesos[mealType] ?? 0}
                onChange={(e) => setPesos((p) => ({ ...p, [mealType]: e.target.value }))}
                style={{ ...inputStyle, width: 64, textAlign: "right" }}
              />
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)" }}>%</span>
            </div>
            {mealType === "Cena" && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: -2 }}>
                {t(idioma, "avisoCena")}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, marginTop: 12,
          color: repartoValido ? "var(--green-dark)" : "var(--rust)",
        }}
      >
        {t(idioma, "perfilView.suma", { n: sumaPesos })}{!repartoValido && t(idioma, "perfilView.sumaAviso")}
      </div>
    </>
  );
}

// Requiere reautenticación (contraseña, o pop-up de Google si la cuenta usa ese login) antes de
// borrar nada — así window.deleteAccount (auth-bootstrap.jsx) nunca se encuentra a mitad de
// camino con una sesión caducada. Escribir "ELIMINAR" es una segunda confirmación deliberadamente
// más lenta que un simple clic, dado que la acción es irreversible.
function DeleteAccountModal({ onClose, idioma }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const esGoogle = window.authProvider === "google";
  // La palabra de confirmación también se traduce (ELIMINAR/DELETE) — si el aviso le pide a un
  // usuario en inglés que escriba "DELETE", la comprobación tiene que aceptar esa palabra, no la
  // española a la fuerza.
  const palabraConfirmacion = t(idioma, "deleteAccount.palabraConfirmacion");
  const listo = confirmText.trim().toUpperCase() === palabraConfirmacion.toUpperCase() && (esGoogle || password);

  function traducirError(code) {
    const map = {
      "needs-password": "deleteAccount.needsPassword",
      "auth/wrong-password": "deleteAccount.wrongPassword",
      "auth/invalid-credential": "deleteAccount.wrongPassword",
      "auth/popup-closed-by-user": "deleteAccount.popupCerrado",
    };
    return map[code] ? t(idioma, map[code]) : t(idioma, "deleteAccount.errorGenerico");
  }

  async function handleDelete() {
    if (!listo || loading) return;
    setError("");
    setLoading(true);
    try {
      await window.deleteAccount(password);
      // Tras borrar la cuenta, el listener de sesión de auth-bootstrap.jsx detecta el cierre
      // de sesión solo y vuelve a la pantalla de bienvenida — no hace falta hacer nada más aquí.
    } catch (err) {
      setLoading(false);
      setError(traducirError(err.code));
    }
  }

  return (
    <ModalShell onClose={onClose} title={t(idioma, "perfilView.eliminarCuenta.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: "0 0 14px" }}>
        {t(idioma, "deleteAccount.desc")}
      </p>

      {!esGoogle && (
        <input
          type="password"
          placeholder={t(idioma, "deleteAccount.tuContrasena")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
      )}

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
        {t(idioma, "deleteAccount.escribePara", { palabra: palabraConfirmacion })}
      </div>
      <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle} />

      {error && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "var(--rust)", fontSize: 12, marginTop: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "deleteAccount.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleDelete} variant="danger" disabled={!listo || loading}>
          {loading ? t(idioma, "deleteAccount.eliminando") : t(idioma, "perfilView.eliminarCuenta.titulo")}
        </ModalBtn>
      </div>
    </ModalShell>
  );
}

// ---------- Ajustes ----------
// Reúne lo que antes vivía repartido dentro de Perfil (idioma, notificaciones, eliminar cuenta) más
// la descarga de datos que antes vivía en la tarjeta raíz de Perfil. A diferencia de Perfil (que
// tiene su propio botón "Guardar cambios"), aquí cada ajuste se aplica al momento de tocarlo — no
// hay nada que "confirmar" después, igual que ya hacía el interruptor de notificaciones.
// Importante: onSave siempre parte de `{ ...perfil, ... }` en vez de construir un objeto desde
// cero — savePerfil (en el componente raíz) sustituye el perfil entero por lo que se le pase, así
// que si esta pantalla mandara solo el campo que toca, borraría sin querer todo lo demás (nombre,
// reparto de comidas...) que vive en otras pantallas.
function SettingsView({ perfil, data, onSave, onRepetirCuestionario, idioma }) {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showRepetirCuestionario, setShowRepetirCuestionario] = useState(false);
  const [notifEstado, setNotifEstado] = useState(""); // "" | "pidiendo" | "error"
  const [notifError, setNotifError] = useState("");
  const notifPush = perfil?.notificacionesPush ?? false;

  function cambiarIdioma(nuevo) {
    guardarIdiomaLocal(nuevo);
    onSave({ ...perfil, idioma: nuevo });
  }

  async function handleToggleNotificaciones(activar) {
    setNotifError("");
    if (!activar) {
      onSave({ ...perfil, notificacionesPush: false });
      setNotifEstado("");
      if (typeof window.disablePushNotifications === "function") {
        window.disablePushNotifications().catch(() => {});
      }
      return;
    }
    setNotifEstado("pidiendo");
    try {
      await window.requestPushPermission();
      onSave({ ...perfil, notificacionesPush: true });
      setNotifEstado("");
    } catch (err) {
      setNotifEstado("error");
      setNotifError(t(idioma, "perfil.notificaciones.error." + (err.code || "generico")));
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "ajustes.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <Field label={t(idioma, "perfil.idioma.label")}>
          <LanguageDropdown idioma={idioma} onChange={cambiarIdioma} />
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            {t(idioma, "perfil.idioma.ayuda")}
          </div>
        </Field>

        <Field label={t(idioma, "perfil.notificaciones.label")}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: true, labelKey: "perfil.notificaciones.activadas" },
              { value: false, labelKey: "perfil.notificaciones.desactivadas" },
            ].map((op) => (
              <button
                key={String(op.value)}
                onClick={() => handleToggleNotificaciones(op.value)}
                disabled={notifEstado === "pidiendo"}
                style={{
                  flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
                  padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)",
                  background: notifPush === op.value ? "var(--green-dark)" : "#fff",
                  color: notifPush === op.value ? "#fff" : "var(--ink)",
                  cursor: notifEstado === "pidiendo" ? "default" : "pointer",
                }}
              >
                {t(idioma, op.labelKey)}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            {t(idioma, "perfil.notificaciones.ayuda")}
          </div>
          {notifEstado === "pidiendo" && (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
              {t(idioma, "perfil.notificaciones.pidiendoPermiso")}
            </div>
          )}
          {notifEstado === "error" && (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>
              {notifError}
            </div>
          )}
        </Field>

        <button
          onClick={() => descargarDatosJSON(data)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            cursor: "pointer", padding: 0, marginTop: 4,
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
          }}
        >
          <Download size={13} /> {t(idioma, "perfilRoot.descargarDatos")}
        </button>
      </div>

      <div style={{ border: "1px solid var(--mustard-dark)", borderRadius: 12, padding: "16px 18px", marginTop: 24, maxWidth: 480 }}>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--mustard-dark)", marginBottom: 4 }}>
          {t(idioma, "ajustes.repetirCuestionario.titulo")}
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
          {t(idioma, "ajustes.repetirCuestionario.desc")}
        </div>
        <button
          onClick={() => setShowRepetirCuestionario(true)}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700,
            color: "var(--mustard-dark)", background: "var(--mustard-soft)", border: "none", borderRadius: 7,
            padding: "8px 12px", cursor: "pointer",
          }}
        >
          {t(idioma, "ajustes.repetirCuestionario.boton")}
        </button>
      </div>

      <div style={{ border: "1px solid var(--rust)", borderRadius: 12, padding: "16px 18px", marginTop: 16, maxWidth: 480 }}>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--rust)", marginBottom: 4 }}>
          {t(idioma, "perfilView.eliminarCuenta.titulo")}
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
          {t(idioma, "perfilView.eliminarCuenta.desc")}
        </div>
        <button
          onClick={() => setShowDeleteAccount(true)}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700,
            color: "var(--rust)", background: "var(--rust-soft)", border: "none", borderRadius: 7,
            padding: "8px 12px", cursor: "pointer",
          }}
        >
          {t(idioma, "perfilView.eliminarCuenta.boton")}
        </button>
      </div>

      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} idioma={idioma} />}
      {showRepetirCuestionario && (
        <ConfirmRepetirCuestionarioModal
          onCancel={() => setShowRepetirCuestionario(false)}
          onConfirm={() => {
            setShowRepetirCuestionario(false);
            onRepetirCuestionario();
          }}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Confirmación simple (sin reautenticación, a diferencia de eliminar cuenta): repetir el
// cuestionario reemplaza los ingredientes/bloques actuales, pero no es una acción destructiva de
// verdad — no borra cuenta ni datos de peso/menús, y siempre se puede volver a editar a mano desde
// Configuración de comidas después. Por eso un solo paso de confirmación es suficiente.
function ConfirmRepetirCuestionarioModal({ onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "ajustes.repetirCuestionario.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "ajustes.repetirCuestionario.confirmTexto")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "ajustes.repetirCuestionario.confirmar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

// ---------- Compartir ----------
// FoodDraft no está en ninguna tienda de apps todavía (y aunque lo esté, tampoco se puede buscar
// por marca como Instagram) — la única forma de que alguien llegue es que le pasen el enlace.
// El botón de compartir usa la Web Share API nativa del navegador (navigator.share) — nada de
// librerías: abre el panel del propio sistema (WhatsApp, Telegram, correo...). No está disponible
// en todos los navegadores de escritorio, así que se detecta y, si no existe, sencillamente no se
// muestra el botón — el enlace copiable de arriba siempre funciona como alternativa universal.
function CompartirView({ idioma }) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const soportaCompartir = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // Sin permiso de portapapeles (poco común) — no pasa nada, el enlace sigue visible para copiarlo a mano.
    }
  }

  async function compartir() {
    try {
      await navigator.share({ title: "FoodDraft", text: t(idioma, "compartir.mensaje"), url });
    } catch (e) {
      // El usuario cerró el panel de compartir sin elegir nada, o el navegador lo canceló — no es un error que avisar.
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "compartir.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
          <Link2 size={15} color="var(--ink-soft)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </span>
          <button
            onClick={copiarEnlace}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--green-dark)" }}
          >
            {copiado ? t(idioma, "compartir.copiado") : t(idioma, "compartir.copiar")}
          </button>
        </div>

        {soportaCompartir && (
          <button
            onClick={compartir}
            style={{
              width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
              color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "11px 18px", cursor: "pointer",
            }}
          >
            <Share2 size={16} /> {t(idioma, "compartir.compartirApps")}
          </button>
        )}
      </div>
    </>
  );
}

// ---------- Ayuda y comentarios ----------
// Cada categoría abre el cliente de correo del propio dispositivo (mailto:) con el asunto ya
// puesto — deliberadamente así de simple: nada de backend, ni Cloud Function, ni servicio de envío
// de correo de terceros, coherente con que functions/ hoy solo tiene lo justo (Stripe y Gemini).
// El correo también se deja visible en texto plano por si el dispositivo no tiene cliente de correo
// configurado (raro en móvil, no tan raro en escritorio) y el enlace mailto: no hace nada.
const FEEDBACK_CATEGORIAS = [
  { key: "bug", icon: AlertCircle, color: "var(--rust)" },
  { key: "idea", icon: Lightbulb, color: "var(--mustard-dark)" },
  { key: "traduccion", icon: Globe, color: "var(--olive)" },
  { key: "premium", icon: Sparkles, color: "var(--coffee)" },
  { key: "privacidad", icon: Lock, color: "var(--green)" },
  { key: "otro", icon: Mail, color: "var(--ink-soft)" },
];

function FeedbackView({ idioma }) {
  function abrirCorreo(key) {
    const asunto = encodeURIComponent(t(idioma, `feedback.${key}.asunto`));
    const cuerpo = encodeURIComponent(t(idioma, `feedback.${key}.cuerpo`));
    window.location.href = `mailto:draftedfood@gmail.com?subject=${asunto}&body=${cuerpo}`;
  }

  return (
    <>
      <SectionIntro text={t(idioma, "feedback.intro")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
        {FEEDBACK_CATEGORIAS.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => abrirCorreo(cat.key)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "13px 14px", cursor: "pointer",
              }}
            >
              <Icon size={19} color={cat.color} style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                {t(idioma, `feedback.${cat.key}`)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 14, maxWidth: 480 }}>
        {t(idioma, "feedback.correoVisible", { correo: "draftedfood@gmail.com" })}
      </div>
    </>
  );
}

// ---------- Premium ----------

const VENTAJAS_PREMIUM = [
  { icon: Camera, textoKey: "premiumView.ventaja1" },
  { icon: Scale, textoKey: "premiumView.ventaja2" },
  { icon: Sparkles, textoKey: "premiumView.ventaja3" },
  { icon: CalendarDays, textoKey: "premiumView.ventaja4" },
  { icon: ThumbsUp, textoKey: "premiumView.ventaja5" },
];

// ---------- Resumen mensual (f3-11) ----------
// Disponible para todos: la fracción de comidas completadas ya se ve en el plan gratis. Lo que
// cambia con premium es la profundidad — objetivo actual, peso del mes y su gráfica de
// tendencia (el mismo PesoLineChart que ya usa Seguimiento de peso, solo que aquí recibe las
// pesadas ya filtradas a este mes en concreto) — y la frase de cierre que junta todo.
function ResumenMensualView({ data, premium, onGoPremium, idioma }) {
  const hoy = new Date();
  const mesISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const nombreMes = hoy.toLocaleDateString(idioma === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" });

  const resumen = calcularResumenMensual(data, mesISO, hoy);
  const objetivosCalculados = calcularObjetivosPerfil(data.perfil);
  const etapa = objetivosCalculados ? OBJETIVO_ETAPAS[objetivosCalculados.objetivo] : null;
  const pesoDelMes = pesoEnMes(data.pesoTracking, mesISO);
  const tendenciaDelMes = pesoDelMes ? calcularTendenciaPeso(pesoDelMes.entradas) : null;

  return (
    <>
      <SectionIntro text={t(idioma, "resumenMensual.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px", marginBottom: 16, maxWidth: 480, textAlign: premium.active ? "left" : "center" }}>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "capitalize", marginBottom: 4 }}>
            {nombreMes}
          </div>
        )}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 40, color: "var(--green-dark)", lineHeight: 1 }}>
          {resumen.porcentaje}%
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
          {t(idioma, "resumenMensual.completadas", { completadas: resumen.completadas, esperadas: resumen.esperadas })}
        </div>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            {t(idioma, "resumenMensual.basadoEn", { n: resumen.comidasPorDia })}
          </div>
        )}
      </div>

      {premium.active ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px", maxWidth: 480 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "capitalize", marginBottom: 12 }}>
            {nombreMes}
          </div>

          {etapa && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "resumenMensual.objetivoActual")}</span>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>
                {t(idioma, "objetivoEtapa." + objetivosCalculados.objetivo)}<br />{t(idioma, "resumenMensual.kcalDia", { n: objetivosCalculados.kcal })}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "resumenMensual.pesoEsteMes")}</span>
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
              {pesoDelMes ? (
                <>
                  {fmt(pesoDelMes.inicio)} → {fmt(pesoDelMes.fin)} kg{" "}
                  <span style={{ color: "var(--green)" }}>({pesoDelMes.delta > 0 ? "+" : ""}{fmt(pesoDelMes.delta)} kg)</span>
                </>
              ) : (
                t(idioma, "resumenMensual.sinPesadas")
              )}
            </span>
          </div>

          {pesoDelMes && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
                {t(idioma, "resumenMensual.tendenciaDe", { mes: nombreMes })}
              </div>
              <PesoLineChart entradas={pesoDelMes.entradas} tendencia={tendenciaDelMes} />
            </div>
          )}

          <div
            style={{
              marginTop: 16, background: "var(--green-soft)", borderRadius: 8, padding: "12px 14px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink)", lineHeight: 1.5,
            }}
          >
            {t(idioma, "resumenMensual.hasCompletado", { pct: resumen.porcentaje })}
            {pesoDelMes ? (
              <>{t(idioma, "resumenMensual.yTuPeso")} {pesoDelMes.delta < 0 ? t(idioma, "resumenMensual.pesoBajado") : pesoDelMes.delta > 0 ? t(idioma, "resumenMensual.pesoSubido") : t(idioma, "resumenMensual.pesoMantenido")}
              {pesoDelMes.delta !== 0 ? t(idioma, "resumenMensual.esteMesKg", { kg: fmt(Math.abs(pesoDelMes.delta)) }) : t(idioma, "resumenMensual.esteMes")}</>
            ) : (
              t(idioma, "resumenMensual.esteMes")
            )}
          </div>
        </div>
      ) : (
        <PremiumRequiredNotice
          titulo={t(idioma, "premiumNotice.resumen.titulo")}
          texto={t(idioma, "premiumNotice.resumen.texto")}
          onGoPremium={onGoPremium}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Pantalla única para hacerse premium o gestionar la suscripción ya activa — la diferencia entre
// las dos la decide "premium.active", que llega desde Firestore en vivo (ver
// window.subscribePremiumStatus en auth-bootstrap.jsx). El botón redirige entero a Stripe
// (Checkout o el portal de facturación, según el caso) — no hay formulario de tarjeta propio en
// ningún sitio de esta app.
function PremiumView({ premium, idioma }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function irA(crearSesion) {
    setError("");
    setLoading(true);
    try {
      const url = await crearSesion();
      window.location.href = url;
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Sparkles size={30} color="var(--mustard-dark)" style={{ marginBottom: 8 }} />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, color: "var(--green-dark)", margin: "0 0 4px" }}>
          {premium.active ? t(idioma, "premiumView.yaEres") : t(idioma, "premiumView.hazte")}
        </h1>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
            {t(idioma, "premiumView.precio")}
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VENTAJAS_PREMIUM.map(({ icon: Icon, textoKey }) => (
            <div key={textoKey} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon size={16} color="var(--mustard-dark)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>{t(idioma, textoKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--rust)",
            background: "var(--rust-soft)", borderRadius: 8, padding: "9px 12px", marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {premium.active ? (
        <button
          onClick={() => irA(window.createPortalSession)}
          disabled={loading}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "var(--green-dark)", background: "#fff", border: "1px solid var(--line)",
            borderRadius: 9, padding: "12px", cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "premiumView.gestionarSuscripcion")}
        </button>
      ) : (
        <button
          onClick={() => irA(window.createCheckoutSession)}
          disabled={loading}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--mustard-dark)", border: "none",
            borderRadius: 9, padding: "12px", cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "premiumView.suscribirme")}
        </button>
      )}
    </div>
  );
}

// Aviso reutilizable para cualquier sitio de la app que quiera bloquear contenido a quien no sea
// premium — hoy solo lo usa el seguimiento de peso, pero está pensado para poder reutilizarlo
// tal cual con la función de "qué puedo cocinar" en cuanto se construya.
function PremiumRequiredNotice({ titulo, texto, onGoPremium, idioma }) {
  return (
    <div
      style={{
        background: "var(--mustard-soft)", border: "1px dashed var(--mustard-dark)", borderRadius: 12,
        padding: "24px 20px", textAlign: "center", maxWidth: 460,
      }}
    >
      <Sparkles size={26} color="var(--mustard-dark)" style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        {titulo}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>
        {texto}
      </div>
      <button
        onClick={onGoPremium}
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: "#fff", background: "var(--mustard-dark)", border: "none", borderRadius: 8,
          padding: "9px 16px", cursor: "pointer",
        }}
      >
        {t(idioma, "premiumNotice.verPremium")}
      </button>
    </div>
  );
}

// "¿Qué puedo cocinar con lo que tengo?" — manda una foto (más, opcionalmente, las especias que
// tengas) a la Cloud Function, que identifica alimentos de tu propio catálogo en la imagen y
// sugiere combinaciones. Las macros de cada sugerencia se calculan aquí con composedMacros, igual
// que cualquier otro plato de la app — nunca son un número que haya devuelto la IA directamente.
function SuggestMealsView({ data, onGuardarComoCerrado, idioma }) {
  const [photo, setPhoto] = useState(null);
  const [otrosIngredientes, setOtrosIngredientes] = useState("");
  const [especias, setEspecias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sugerencias, setSugerencias] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleAnalizar() {
    if (!photo && !otrosIngredientes.trim()) return;
    setLoading(true);
    setError("");
    setSugerencias(null);
    try {
      const catalogo = (data.foods || []).map((f) => ({ id: f.id, name: f.name }));
      const resultado = await window.suggestMeals({ photoDataUrl: photo, especias, otrosIngredientes, catalogo });
      setSugerencias(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "suggestMeals.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px", marginBottom: 16, maxWidth: 480 }}>
        {photo ? (
          <img src={photo} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12, display: "block" }} />
        ) : null}

        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
            color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 8,
            padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10,
          }}
        >
          <Camera size={14} /> {photo ? t(idioma, "suggestMeals.cambiarFoto") : t(idioma, "suggestMeals.hacerFoto")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
          {photo ? t(idioma, "suggestMeals.otrosIngredientesConFoto") : t(idioma, "suggestMeals.otrosIngredientesSinFoto")}
        </div>
        <input
          value={otrosIngredientes}
          onChange={(e) => setOtrosIngredientes(e.target.value)}
          placeholder={t(idioma, "suggestMeals.placeholderIngredientes")}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
          {t(idioma, "suggestMeals.especias")}
        </div>
        <input
          value={especias}
          onChange={(e) => setEspecias(e.target.value)}
          placeholder={t(idioma, "suggestMeals.placeholderEspecias")}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <button
          onClick={handleAnalizar}
          disabled={(!photo && !otrosIngredientes.trim()) || loading}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: (photo || otrosIngredientes.trim()) && !loading ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: (photo || otrosIngredientes.trim()) && !loading ? "pointer" : "default",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "suggestMeals.queCocino")}
        </button>

        {error && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--rust)",
              background: "var(--rust-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {sugerencias && sugerencias.length === 0 && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "suggestMeals.sinResultados")}
        </div>
      )}

      {sugerencias && sugerencias.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
          {sugerencias.map((s, i) => {
            const macros = composedMacros(data, { composicion: s.composicion });
            return (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, color: "var(--green-dark)", marginBottom: 4 }}>
                  {s.nombre}
                </div>
                {macros && (
                  <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                    {fmt(macros.kcal)} kcal · P {fmt(macros.prot)}g · G {fmt(macros.fat)}g · C {fmt(macros.carb)}g
                  </div>
                )}
                {s.pasos_breves && (
                  <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 12 }}>
                    {s.pasos_breves}
                  </div>
                )}
                <button
                  onClick={() => onGuardarComoCerrado(s)}
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700,
                    color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 7,
                    padding: "8px 12px", cursor: "pointer",
                  }}
                >
                  {t(idioma, "suggestMeals.guardarComoCerrado")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- Seguimiento de peso ----------

function MedidasPlaceholderView({ idioma }) {
  return (
    <div
      style={{
        background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
        padding: "34px 22px", textAlign: "center", maxWidth: 460,
      }}
    >
      <Ruler size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        {t(idioma, "medidas.proximamente")}
      </div>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
        {t(idioma, "medidas.texto")}
      </p>
    </div>
  );
}

// Documentos de apoyo: PDFs que viven como archivos estáticos en la carpeta "PDFs explicativos"
// del propio repositorio (se sirven solos junto al resto de la app, sin ningún sistema de subida).
// Se deja vacío a propósito hasta tener listo el conjunto completo — cuando se rellene, cada entrada
// solo necesita { titulo, descripcion, archivo } con la ruta relativa al PDF.
const DOCUMENTOS_ADJUNTOS = [];

function DocumentosView({ idioma }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text={t(idioma, "documentos.intro")} />

      {DOCUMENTOS_ADJUNTOS.length === 0 ? (
        <div
          style={{
            background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
            padding: "34px 22px", textAlign: "center",
          }}
        >
          <FileText size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            {t(idioma, "documentos.sinDocumentos")}
          </div>
          <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            {t(idioma, "documentos.sinDocumentos.desc")}
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

// DIAS_SEMANA_CORTO (Logica/peso.js) ya viene abreviado en español ("Dom","Lun"...) — para
// traducirlo reusamos las claves "dia.X" (nombre completo) ya existentes: primero se pasa a
// nombre completo con este mapa, se traduce, y se vuelve a recortar a 3 letras.
const DIA_CORTO_A_COMPLETO = {
  Dom: "Domingo", Lun: "Lunes", Mar: "Martes", Mié: "Miércoles", Jue: "Jueves", Vie: "Viernes", Sáb: "Sábado",
};

function RecordatorioPesoModal({ onClose, idioma }) {
  return (
    <ModalShell onClose={onClose} title={t(idioma, "recordatorioPeso.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        {t(idioma, "recordatorioPeso.texto")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={onClose}>{t(idioma, "recordatorioPeso.saltar")}</ModalBtn>
        <ModalBtn variant="solid" onClick={onClose}>{t(idioma, "recordatorioPeso.vale")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function PesoAnomaliaModal({ peso, onCancel, onConfirm, idioma }) {
  const [motivo, setMotivo] = useState("");
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "anomaliaPeso.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        {t(idioma, "anomaliaPeso.texto", { peso })}
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
            {t(idioma, "motivo." + op)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={() => onConfirm(false, "")}>{t(idioma, "anomaliaPeso.esNormal")}</ModalBtn>
        <ModalBtn variant="solid" onClick={() => onConfirm(true, motivo || "Sin especificar")}>{t(idioma, "anomaliaPeso.guardarAtipico")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

// Gráfica de líneas hecha a mano en SVG (mismo criterio que el resto de la app: sin librerías).
// Dibuja todas las pesadas (las atípicas en un color distinto) y la recta de tendencia calculada
// sobre las pesadas normales.
function PesoLineChart({ entradas, tendencia, idioma }) {
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
          {formatFechaCorta(fechaEnX(x), idioma)}
        </text>
      ))}
    </svg>
  );
}

function NivelBadge({ nivel, idioma }) {
  const meta = {
    optimo: { labelKey: "nivel.optimo", color: "var(--green-dark)", bg: "var(--green-soft)" },
    ineficaz: { labelKey: "nivel.ineficaz", color: "var(--coffee)", bg: "var(--coffee-soft)" },
    aviso: { labelKey: "nivel.aviso", color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
    accion: { labelKey: "nivel.accion", color: "var(--rust)", bg: "var(--rust-soft)" },
    "direccion-contraria": { labelKey: "nivel.direccionContraria", color: "var(--rust)", bg: "var(--rust-soft)" },
    insuficiente: { labelKey: "nivel.insuficiente", color: "var(--coffee)", bg: "var(--coffee-soft)" },
    aceptable: { labelKey: "nivel.aceptable", color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
    demasiado: { labelKey: "nivel.demasiado", color: "var(--rust)", bg: "var(--rust-soft)" },
  }[nivel];
  if (!meta) return null;
  return <MacroPill label="" value={t(idioma, meta.labelKey)} color={meta.color} bg={meta.bg} />;
}

// Vista de impresión del seguimiento de peso — mismo patrón que PrintExport para el menú: un bloque
// oculto en pantalla (@media screen) que solo se muestra al imprimir (@media print), para que
// "Guardar como PDF" del propio navegador lo capture sin necesidad de ninguna librería.
function PrintSeguimiento({ entradas, tendencia, titulo, idioma }) {
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
            FoodDraft
          </div>
          <h1 style={{ fontSize: 26, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "printSeguimiento.titulo")}</h1>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {t(idioma, "printSeguimiento.exportadoEl", { titulo, fecha: formatFechaCorta(fechaISO(new Date()), idioma) })}
          </div>
        </div>

        <div style={{ marginTop: 18, maxWidth: 420 }}>
          <PesoLineChart entradas={ordenadas} tendencia={tendencia || null} idioma={idioma} />
        </div>

        {tendencia && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "#1f4d38", fontWeight: 700, marginTop: 8 }}>
            {t(idioma, "printSeguimiento.tendencia", { signo: tendencia.pctSemana > 0 ? "+" : "", pct: tendencia.pctSemana.toFixed(2) })}
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.fecha")}</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.pesoKg")}</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.nota")}</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e) => (
              <tr key={e.id || e.fecha}>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{formatFechaCorta(e.fecha, idioma)}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{e.peso}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf", color: "#a9721f" }}>
                  {e.atipico ? t(idioma, "printSeguimiento.atipica", { detalle: e.motivo ? `: ${t(idioma, "motivo." + e.motivo)}` : "" }) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          {t(idioma, "printSeguimiento.pie")}
        </div>
      </div>
    </div>
  );
}

// Vista de "Seguimiento de peso": mientras el ciclo está abierto, solo se enseña el progreso (cuántas
// pesadas van, cuánto falta) sin cifras ni gráfica — para no fomentar la obsesión con el número del día.
// Al llegar a la duración configurada, se enseña la tendencia real y una sugerencia de ajuste opcional.
function PesoView({ perfil, pesoTracking, onAddPeso, onUpdateConfig, onDismissReminder, onCerrarCiclo, onPausarCiclo, onReanudarCiclo, idioma }) {
  const [pesoInput, setPesoInput] = useState("");
  const [pendienteAnomalia, setPendienteAnomalia] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showProgresion, setShowProgresion] = useState(false);
  const [rangoProgresion, setRangoProgresion] = useState("3m");
  const [aplicarKcalToggle, setAplicarKcalToggle] = useState(false);
  const [actualizarPesoToggle, setActualizarPesoToggle] = useState(true);
  const [printPayload, setPrintPayload] = useState(null);
  const [pausando, setPausando] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState("");

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

  // Mientras el ciclo esté pausado, esos días no cuentan para el cierre (se suman al plazo del
  // ciclo, como si no hubieran pasado) y no se dispara el recordatorio de pesaje.
  const pausas = pesoTracking.pausas || [];
  const pausaActiva = pausas.find((p) => p.fin === null) || null;
  const diasEntre = (isoInicio, isoFin) => Math.round((new Date(isoFin + "T00:00:00") - new Date(isoInicio + "T00:00:00")) / 86400000);
  const totalDiasPausados = pausas.reduce((sum, p) => sum + diasEntre(p.inicio, p.fin || hoyISO), 0);

  const diaSugerido = !pausaActiva && esDiaSugeridoPeso(pesoTracking.vecesSemana, hoy);
  const [recordatorioAbierto, setRecordatorioAbierto] = useState(
    diaSugerido && !yaRegistradoHoy && pesoTracking.recordatorioDescartadoFecha !== hoyISO
  );

  const cicloInicioDate = pesoTracking.cicloInicio ? new Date(pesoTracking.cicloInicio + "T00:00:00") : null;
  const diasTranscurridos = cicloInicioDate ? Math.floor((hoy - cicloInicioDate) / 86400000) : 0;
  const diasCiclo = pesoTracking.duracionSemanas * 7 + totalDiasPausados;
  const cicloListoParaCierre = !!cicloInicioDate && diasTranscurridos >= diasCiclo && entradas.length >= 2;
  const totalEsperado = pesoTracking.duracionSemanas * pesoTracking.vecesSemana;

  function confirmarPausa() {
    onPausarCiclo(motivoPausa.trim());
    setPausando(false);
    setMotivoPausa("");
  }

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
  const evaluacion = tendencia ? evaluarTendencia(tendencia.pctSemana, perfil?.objetivo, idioma) : null;
  const ultimaNormal = [...entradas].reverse().find((e) => !e.atipico);
  const hayCambios = evaluacion && evaluacion.sugerenciaKcal !== 0 && perfil?.objetivo && perfil.objetivo !== "mantenimiento";

  const rangoDias = (RANGOS_PROGRESION.find((r) => r.key === rangoProgresion) || RANGOS_PROGRESION[0]).dias;
  const historialFiltrado = historial.filter((e) => {
    if (rangoDias === Infinity) return true;
    return (hoy - new Date(e.fecha + "T00:00:00")) / 86400000 <= rangoDias;
  });

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text={t(idioma, "pesoView.intro")} />

      {recordatorioAbierto && (
        <RecordatorioPesoModal onClose={() => { setRecordatorioAbierto(false); onDismissReminder(); }} idioma={idioma} />
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
          idioma={idioma}
        />
      )}

      {cicloListoParaCierre ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
            {t(idioma, "pesoView.cicloTerminado", { n: entradas.length })}
          </div>

          {pausas.length > 0 && (
            <div style={{ background: "var(--mustard-soft)", borderRadius: 8, padding: "9px 11px", marginBottom: 12 }}>
              {pausas.map((p, i) => (
                <div key={i} style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--mustard-dark)", lineHeight: 1.5 }}>
                  {t(idioma, "pesoView.pausadoDelAl", {
                    inicio: formatFechaCorta(p.inicio, idioma),
                    fin: formatFechaCorta(p.fin || hoyISO, idioma),
                    detalle: p.motivo ? ` — "${p.motivo}"` : "",
                  })}
                </div>
              ))}
            </div>
          )}

          {tendencia ? (
            <>
              <PesoLineChart entradas={entradas} tendencia={tendencia} idioma={idioma} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--green-dark)" }}>
                  {t(idioma, "pesoView.pctSemana", { signo: tendencia.pctSemana > 0 ? "+" : "", pct: tendencia.pctSemana.toFixed(2) })}
                </span>
                {evaluacion && <NivelBadge nivel={evaluacion.nivel} idioma={idioma} />}
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
                      {t(idioma, "pesoView.actualizarPesoPerfil", { kg: ultimaNormal.peso })}
                    </span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--green-dark)", marginTop: 2 }}>
                      {t(idioma, "pesoView.actualizarPesoExplicacion", { kg: perfil?.peso })}
                    </span>
                  </span>
                </label>
              )}

              {hayCambios && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--mustard-soft)", border: "1px solid var(--mustard)", borderRadius: 9, padding: "11px 13px", marginTop: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={aplicarKcalToggle} onChange={(e) => setAplicarKcalToggle(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--mustard-dark)", fontWeight: 700 }}>
                      {t(idioma, "pesoView.aplicarAjuste", { signo: evaluacion.sugerenciaKcal > 0 ? "+" : "", kcal: evaluacion.sugerenciaKcal })}
                    </span>
                    <span style={{ display: "block", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--mustard-dark)", marginTop: 2 }}>
                      {t(idioma, "pesoView.noCambiaEtapa", { etapa: t(idioma, "objetivoEtapa." + perfil.objetivo) })}
                    </span>
                  </span>
                </label>
              )}

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <ModalBtn
                  variant="solid"
                  onClick={() => onCerrarCiclo({ aplicarKcal: aplicarKcalToggle, actualizarPeso: actualizarPesoToggle })}
                >
                  {t(idioma, "pesoView.cerrarCiclo")}
                </ModalBtn>
                <button
                  onClick={() => exportarSeguimiento(entradas, tendencia, t(idioma, "pesoView.cicloCerradoHoyTitulo"))}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
                  }}
                >
                  {t(idioma, "pesoView.exportarCierre")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                {t(idioma, "pesoView.sinPesadasSuficientes")}
              </p>
              <ModalBtn variant="solid" onClick={() => onCerrarCiclo({ aplicarKcal: false, actualizarPeso: false })}>{t(idioma, "pesoView.empezarSiguienteCiclo")}</ModalBtn>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <Field label={yaRegistradoHoy ? t(idioma, "pesoView.corregirPesoHoy") : t(idioma, "pesoView.pesoDeHoy")}>
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
                {t(idioma, "pesoView.guardar")}
              </button>
            </div>
          </Field>

          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
            {cicloInicioDate ? (
              t(idioma, "pesoView.cicloEnCurso", { n: entradas.length, total: totalEsperado, dias: Math.max(0, diasCiclo - diasTranscurridos) })
            ) : (
              t(idioma, "pesoView.primeraPesada", { n: pesoTracking.duracionSemanas })
            )}
          </div>

          {cicloInicioDate && (
            pausaActiva ? (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, background: "var(--mustard-soft)", borderRadius: 8, padding: "9px 11px", marginTop: 8 }}>
                <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--mustard-dark)", lineHeight: 1.5 }}>
                  {t(idioma, "pesoView.cicloPausadoDesde", {
                    fecha: formatFechaCorta(pausaActiva.inicio, idioma),
                    detalle: pausaActiva.motivo ? ` — "${pausaActiva.motivo}"` : "",
                  })}
                </div>
                <button
                  onClick={onReanudarCiclo}
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                    color: "var(--mustard-dark)", background: "#fff", border: "1px solid var(--mustard)",
                    borderRadius: 7, padding: "5px 10px", flexShrink: 0, cursor: "pointer",
                  }}
                >
                  {t(idioma, "pesoView.reanudar")}
                </button>
              </div>
            ) : pausando ? (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  placeholder={t(idioma, "pesoView.motivoPlaceholder")}
                  style={{ ...inputStyle, flex: "1 1 160px" }}
                />
                <ModalBtn variant="solid" onClick={confirmarPausa}>{t(idioma, "pesoView.pausarCiclo")}</ModalBtn>
                <ModalBtn variant="ghost" onClick={() => { setPausando(false); setMotivoPausa(""); }}>{t(idioma, "pesoView.cancelar")}</ModalBtn>
              </div>
            ) : (
              <button
                onClick={() => setPausando(true)}
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                  color: "var(--ink-soft)", background: "none", border: "none", padding: 0,
                  marginTop: 6, cursor: "pointer",
                }}
              >
                {t(idioma, "pesoView.pausarCicloToggle")}
              </button>
            )
          )}

          {entradas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {entradas.map((e) => (
                <span
                  key={e.id}
                  title={e.atipico ? t(idioma, "pesoView.marcadaAtipica", { detalle: e.motivo ? `: ${t(idioma, "motivo." + e.motivo)}` : "" }) : t(idioma, "pesoView.registrada")}
                  style={{
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 20,
                    color: e.atipico ? "var(--mustard-dark)" : "var(--green-dark)",
                    background: e.atipico ? "var(--mustard-soft)" : "var(--green-soft)",
                  }}
                >
                  {formatFechaCorta(e.fecha, idioma)} {e.atipico ? "⚠" : "✓"}
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
        {showConfig ? t(idioma, "pesoView.ocultarAjustes") : t(idioma, "pesoView.verAjustes")}
      </button>

      {showConfig && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 18px" }}>
          <Field label={t(idioma, "pesoView.vecesPorSemana")}>
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
              {t(idioma, "pesoView.diasSugeridos", {
                lista: (DIAS_SUGERIDOS_PESO[pesoTracking.vecesSemana] || [])
                  .map((d) => t(idioma, "dia." + DIA_CORTO_A_COMPLETO[DIAS_SEMANA_CORTO[d]]).slice(0, 3))
                  .join(", "),
              })}
            </div>
          </Field>
          <Field label={t(idioma, "pesoView.duracionCiclo")}>
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
                  {t(idioma, "pesoView.semanaAbrev", { n: v })}
                </button>
              ))}
            </div>
          </Field>
          {cicloInicioDate && (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              {t(idioma, "pesoView.noCambiarConCicloAbierto")}
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
        {showProgresion ? t(idioma, "pesoView.ocultarProgresion") : t(idioma, "pesoView.verProgresion")}
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
                {t(idioma, "rango." + r.key)}
              </button>
            ))}
          </div>
          {historialFiltrado.length >= 2 ? (
            <>
              <PesoLineChart entradas={historialFiltrado} tendencia={null} idioma={idioma} />
              <button
                onClick={() => exportarSeguimiento(historialFiltrado, null, t(idioma, "rango." + rangoProgresion))}
                style={{
                  marginTop: 10, background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--green-dark)",
                }}
              >
                {t(idioma, "pesoView.exportarRango")}
              </button>
            </>
          ) : (
            <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
              {historial.length === 0
                ? t(idioma, "pesoView.sinCiclosCerrados")
                : t(idioma, "pesoView.sinPesadasEnRango")}
            </p>
          )}
        </div>
      )}

      {printPayload && (
        <PrintSeguimiento entradas={printPayload.entradas} tendencia={printPayload.tendencia} titulo={printPayload.titulo} idioma={idioma} />
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
        "--citrus": "#c2662d",
        "--citrus-soft": "#f5e2d3",
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

function Header({ saveState, idioma, onOpenMenu }) {
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
      {/* Abre el menú lateral (ver DrawerMenu) — sustituye a la barra de pestañas de antes. Vive
          en el propio Header porque este se pinta una sola vez fuera de <main>, así que el botón
          queda accesible desde cualquier pantalla sin tener que repetirlo en cada una. */}
      <button
        onClick={onOpenMenu}
        aria-label={t(idioma, "drawer.abrir")}
        style={{
          position: "absolute", top: 22, left: 22, zIndex: 2,
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
          padding: 7, display: "flex", cursor: "pointer",
        }}
      >
        <Menu size={19} color="#fff" />
      </button>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", position: "relative", paddingLeft: 42 }}>
        <div>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginBottom: 4 }}>
            FoodDraft
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 400, letterSpacing: 0.3 }}>{t(idioma, "header.tuRecetario")}</h1>
        </div>
        <SaveIndicator state={saveState} idioma={idioma} />
      </div>
    </header>
  );
}

function SaveIndicator({ state, idioma }) {
  const label = state === "saving" ? t(idioma, "header.guardando") : state === "saved" ? t(idioma, "header.guardado") : "";
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

// Qué categorías "hoja" pertenecen a cada grupo de la pantalla de Configuración.
// Un único origen de datos: sirve tanto para saber a qué grupo pertenece una categoría
// (para el botón "volver") como para pintar las tarjetas de cada grupo.
const MACRO_CATS = ["proteina", "carbo", "verdura", "grasa"];
const ESPECIALES_CATS = ["desayuno", "media_manana", "merienda", "cerrado", "especial"];

function groupOfCat(cat) {
  if (MACRO_CATS.includes(cat)) return "macros-root";
  if (ESPECIALES_CATS.includes(cat)) return "especiales-root";
  return "config-root";
}

// ---------- Bandera de un idioma, dibujada a mano en SVG ----------
// No se usan los emoji de bandera (🇪🇸, 🇬🇧...) a propósito: catalán, gallego y euskera no tienen
// código de país ISO, así que su emoji de bandera no existe — y aunque se construyera "a mano" con
// las secuencias de subdivisión de Unicode, no son secuencias reconocidas oficialmente (RGI) fuera
// de las de Reino Unido, así que no se pintarían como bandera en la mayoría de sistemas (aparecería
// un icono roto o nada). Dibujarlas en SVG garantiza que se vean igual en cualquier navegador.
// Las banderas autonómicas (Senyera, la de Galicia, la Ikurriña) son las oficiales de cada
// comunidad, no símbolos partidistas — mismo criterio que usan las webs de sus propios gobiernos.
function FlagIcon({ lang, size = 20 }) {
  const w = Math.round(size * 1.5);
  const vb = "0 0 30 20";
  const wrapStyle = { borderRadius: 3, display: "block", flexShrink: 0 };
  if (lang === "es") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }
  if (lang === "en") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#00247D" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="6" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#CF142B" strokeWidth="3" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#CF142B" strokeWidth="3" />
      </svg>
    );
  }
  if (lang === "ca") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#FCDD09" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={(20 / 9) * i} width="30" height={20 / 9} fill="#DA121A" />
        ))}
      </svg>
    );
  }
  if (lang === "gl") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#fff" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#0090C4" strokeWidth="5" />
      </svg>
    );
  }
  if (lang === "eu") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#D52B1E" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="5" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="5" />
      </svg>
    );
  }
  return null;
}

// ---------- Selector de idioma buscable, con banderas (Fase de menú lateral) ----------
// Sustituye a la fila de botones de idioma que había antes en Perfil — con 5 idiomas ya no cabían
// bien en una fila, y esta forma escala sin rediseñar si se añaden más adelante. onChange se llama
// al momento al elegir uno (no hace falta un botón "Guardar" aparte): igual que el interruptor de
// notificaciones, es una preferencia que tiene sentido aplicar en el instante, no en un lote.
function LanguageDropdown({ idioma, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const actual = IDIOMAS_DISPONIBLES.find((i) => i.key === idioma) || IDIOMAS_DISPONIBLES[0];
  const filtrados = IDIOMAS_DISPONIBLES.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()));

  function elegir(key) {
    onChange(key);
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%",
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
          padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)",
          cursor: "pointer",
        }}
      >
        <FlagIcon lang={actual.key} size={17} />
        <span style={{ letterSpacing: 0.3 }}>{actual.key.toUpperCase()}</span>
        <span style={{ flex: 1, textAlign: "left", fontWeight: 500, color: "var(--ink-soft)" }}>{actual.label}</span>
        <ChevronDown size={15} color="var(--ink-soft)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 5,
            background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: 8,
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(idioma, "ajustes.idioma.buscar")}
            style={{ ...inputStyle, marginBottom: 6 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
            {filtrados.map((op) => (
              <button
                key={op.key}
                onClick={() => elegir(op.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, textAlign: "left",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, padding: "8px 8px", borderRadius: 6,
                  border: "none", background: op.key === idioma ? "var(--green-soft)" : "transparent", cursor: "pointer",
                }}
              >
                <FlagIcon lang={op.key} size={16} />
                <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>{op.key.toUpperCase()}</span>
                <span style={{ color: "var(--ink-soft)" }}>{op.label}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", padding: "8px 6px" }}>
                {t(idioma, "ajustes.idioma.sinResultados")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Menú lateral (drawer) ----------
// Sustituye a la antigua TabBar de tres pestañas horizontales. Desde la Tanda 2, dos ítems del
// grupo de arriba llevan sub-opciones (ver "children" más abajo): tocar el texto navega al destino
// "raíz" de ese grupo (la misma tarjeta grande que ya existía, config-root o la nueva peso-root),
// tocar la flecha despliega las sub-opciones ahí mismo, sin navegar — mismo patrón que un menú de
// ajustes con flechas (Configuración > General/Facturación/...), para poder saltar directo a una
// sub-pantalla concreta sin pasar por la tarjeta intermedia. El grupo de abajo (Compartir, Ayuda y
// comentarios, Ajustes, Perfil) no tiene sub-opciones.
function DrawerMenu({ open, onClose, tab, setTab, idioma, premium }) {
  const [expandido, setExpandido] = useState({});

  function ir(destino) {
    setTab(destino);
    onClose();
  }
  function alternarExpandido(key) {
    setExpandido((e) => ({ ...e, [key]: !e[key] }));
  }

  const arriba = [
    {
      key: "menus-root", label: t(idioma, "drawer.menus"), icon: CalendarDays,
      children: [
        { key: "menu", label: t(idioma, "drawer.menuCompleto"), icon: CalendarDays },
        { key: "menu-simple", label: t(idioma, "drawer.menuSimple"), icon: ListChecks },
      ],
    },
    {
      key: "config-root", label: t(idioma, "drawer.configuracionComidas"), icon: Layers,
      children: [
        { key: "macros-root", label: t(idioma, "nav.macros"), icon: Utensils },
        { key: "especiales-root", label: t(idioma, "nav.comidasEspeciales"), icon: Package },
        { key: "combos", label: t(idioma, "nav.combinaciones"), icon: Shuffle },
        { key: "alimentos", label: t(idioma, "nav.alimentos"), icon: Database },
        { key: "cocinar", label: t(idioma, "nav.queCocino"), icon: Camera },
        { key: "reparto-comidas", label: t(idioma, "perfilView.repartoComidas.titulo"), icon: PieChart },
      ],
    },
    {
      key: "peso-root", label: t(idioma, "perfilRoot.seguimientoPeso"), icon: Scale,
      children: [
        { key: "perfil-peso", label: t(idioma, "drawer.registroPeso"), icon: Scale },
        { key: "perfil-medidas", label: t(idioma, "perfilRoot.medidasCorporales"), icon: Ruler },
        { key: "perfil-resumen", label: t(idioma, "perfilRoot.resumenMensual"), icon: TrendingUp },
      ],
    },
    { key: "actividad-diaria", label: t(idioma, "drawer.actividadDiaria"), icon: Activity },
    { key: "perfil-documentos", label: t(idioma, "perfilRoot.documentos"), icon: FileText },
    { key: "perfil-premium", label: premium.active ? t(idioma, "perfilRoot.premium") : t(idioma, "perfilRoot.hazteremium"), icon: Sparkles },
  ];
  const abajo = [
    { key: "compartir", label: t(idioma, "drawer.compartir"), icon: Share2 },
    { key: "feedback", label: t(idioma, "drawer.feedback"), icon: Mail },
    { key: "ajustes", label: t(idioma, "drawer.ajustes"), icon: Settings },
    { key: "perfil-datos", label: t(idioma, "tab.perfil"), icon: User },
  ];

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.4)", zIndex: 40 }}
      />
      <div
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: "min(78vw, 280px)", zIndex: 41,
          background: "var(--paper)", boxShadow: "3px 0 22px rgba(0,0,0,0.22)",
          display: "flex", flexDirection: "column", padding: "18px 12px 16px", boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          aria-label={t(idioma, "drawer.cerrar")}
          style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", padding: 6, marginBottom: 6 }}
        >
          <X size={19} color="var(--ink-soft)" />
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {arriba.map((item) => (
            <React.Fragment key={item.key}>
              <DrawerItem
                item={item}
                active={tab === item.key}
                onClick={() => ir(item.key)}
                expandible={!!item.children}
                expandido={!!expandido[item.key]}
                onToggleExpandir={() => alternarExpandido(item.key)}
                idioma={idioma}
              />
              {item.children && expandido[item.key] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 15, borderLeft: "1.5px solid var(--line)", paddingLeft: 8, marginBottom: 4 }}>
                  {item.children.map((sub) => (
                    <DrawerItem key={sub.key} item={sub} active={tab === sub.key} onClick={() => ir(sub.key)} small />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {abajo.map((item) => (
            <DrawerItem key={item.key} item={item} active={tab === item.key} onClick={() => ir(item.key)} />
          ))}
        </div>
      </div>
    </>
  );
}

function DrawerItem({ item, active, onClick, expandible, expandido, onToggleExpandir, small, idioma }) {
  const Icon = item.icon;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: small ? 9 : 11, textAlign: "left", flex: 1, minWidth: 0,
          padding: small ? "8px 9px" : "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: active ? "var(--green-soft)" : "transparent",
        }}
      >
        <Icon size={small ? 15 : 17} color={active ? "var(--green-dark)" : "var(--ink-soft)"} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: small ? 12.5 : 13.5,
            fontWeight: active ? 700 : 500, color: active ? "var(--green-dark)" : "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </span>
      </button>
      {expandible && (
        <button
          onClick={onToggleExpandir}
          aria-label={t(idioma, expandido ? "drawer.colapsar" : "drawer.expandir")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexShrink: 0 }}
        >
          <ChevronDown
            size={15} color="var(--ink-soft)"
            style={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        </button>
      )}
    </div>
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

function MenuView({ menu, onGenerate, onUndo, menuWeek, setMenuWeek, history, data, onUpdateMeal, objetivos, onUpdateObjetivos, onToggleMarcadoCompra, onUpsertRule, onToggleComidaCompletada, idioma }) {
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
        <SectionIntro text={t(idioma, "menu.intro")} />
        <button
          onClick={() => setEditingObjetivos(true)}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
            color: "var(--green-dark)", background: "var(--green-soft)", border: "none",
            borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          {t(idioma, "menu.verObjetivos")}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
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
          }}
        >
          <Shuffle size={15} />
          {menu ? t(idioma, "menu.generarOtro") : t(idioma, "menu.generarPrimero")}
        </button>
        {history && history.length >= 2 && (
          <button
            onClick={onUndo}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink-soft)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Undo2 size={14} />
            {t(idioma, "menu.deshacer")}
          </button>
        )}
      </div>

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
          {t(idioma, "menu.sinMenuTodavia")}
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
                {t(idioma, "menu.semana", { n: w })}
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
              <Download size={13} /> {t(idioma, "menu.exportarPdf")}
            </button>
            <button
              onClick={() => setShowListaCompra(true)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
                color: "var(--coffee)", background: "var(--coffee-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t(idioma, "menu.listaCompra")}
            </button>
            <button
              onClick={() => setShowStats((s) => !s)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 600,
                color: "var(--ink-soft)", background: "transparent", border: "none",
                padding: "7px 4px", marginLeft: "auto",
              }}
            >
              {showStats ? t(idioma, "menu.ocultarEstadisticas") : t(idioma, "menu.verEstadisticas")}
            </button>
          </div>

          {showStats && <DayStatsPanel data={data} menu={menu} week={menuWeek} objetivos={objetivos} idioma={idioma} />}
          {showStats && <ResumenSaludPublica data={data} menu={menu} week={menuWeek} objetivos={objetivos} idioma={idioma} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "dia." + day)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => {
                      const totales = mealTotals(data, m);
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", width: 68, flexShrink: 0 }}>{t(idioma, "mealType." + m.mealType)}</span>
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
                                {t(idioma, "menu.garbanzos5050")}
                              </span>
                            )}
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          {ajustada && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: 20 }}>
                              {t(idioma, "menu.ajustada")}
                            </span>
                          )}
                          {totales.kcal > 0 && (
                            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>
                              {t(idioma, "menu.kcal", { n: Math.round(totales.kcal) })}
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

      <HistoryPanel history={history} idioma={idioma} />

      <PrintExport data={data} menu={menu} idioma={idioma} />

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          data={data}
          onUpdateMeal={onUpdateMeal}
          onUpsertRule={onUpsertRule}
          onClose={() => setSelectedMealId(null)}
          completadaHoy={!!(((data.comidasCompletadas || {})[fechaISO(new Date())] || {})[selectedMeal.mealType])}
          onToggleCompletada={() => onToggleComidaCompletada(selectedMeal.mealType)}
          idioma={idioma}
        />
      )}

      {editingObjetivos && (
        <ObjetivosModal
          objetivos={objetivos}
          perfil={data.perfil}
          onClose={() => setEditingObjetivos(false)}
          idioma={idioma}
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
          idioma={idioma}
        />
      )}
    </>
  );
}

// Menú simple (Tanda 3 del rediseño): la misma idea de "organizar la semana" que Menú completo,
// pero deliberadamente sin nada de calorías, macros ni gramos — solo el borrador de combinaciones.
// Reutiliza el mismo generateMenu de siempre (la selección de qué toca cada día ya es independiente
// del ajuste de raciones a objetivos, ver Logica/menu-generador.js), así que no hace falta ningún
// motor nuevo: aquí sencillamente no se pide ni se muestra la parte de cantidades. Lleva su propio
// ciclo, su propio historial y su propia lista de la compra, separados de Menú completo — las dos
// pantallas conviven sin pisarse.
function MenuSimpleView({ menu, onGenerate, onUndo, menuWeek, setMenuWeek, history, data, onToggleMarcadoCompra, idioma }) {
  const [showListaCompra, setShowListaCompra] = useState(false);

  return (
    <>
      <SectionIntro text={t(idioma, "menuSimple.intro")} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
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
          }}
        >
          <Shuffle size={15} />
          {menu ? t(idioma, "menu.generarOtro") : t(idioma, "menu.generarPrimero")}
        </button>
        {history && history.length >= 2 && (
          <button
            onClick={onUndo}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink-soft)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Undo2 size={14} />
            {t(idioma, "menu.deshacer")}
          </button>
        )}
      </div>

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
          {t(idioma, "menu.sinMenuTodavia")}
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
                {t(idioma, "menu.semana", { n: w })}
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
              <Download size={13} /> {t(idioma, "menu.exportarPdf")}
            </button>
            <button
              onClick={() => setShowListaCompra(true)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
                color: "var(--coffee)", background: "var(--coffee-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t(idioma, "menu.listaCompra")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "dia." + day)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => {
                      const combinacion = m.closedDish
                        ? m.closedDish
                        : m.item
                        ? m.item
                        : [m.protein, m.carbo, m.verdura, m.garbanzos ? t(idioma, "menuSimple.garbanzos") : null].filter(Boolean).join(" + ") || "—";
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex", alignItems: "baseline", gap: 10,
                            fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "4px 6px",
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", width: 68, flexShrink: 0 }}>
                            {t(idioma, "mealType." + m.mealType)}
                          </span>
                          <span style={{ fontSize: 13, color: m.closedDish ? "var(--rust)" : "var(--ink)", fontWeight: m.closedDish ? 600 : 400 }}>
                            {combinacion}
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

      <HistoryPanel history={history} idioma={idioma} />

      <PrintExport data={data} menu={menu} idioma={idioma} conCantidades={false} />

      {showListaCompra && (
        <ListaCompraModal
          data={data}
          menu={menu}
          menuWeek={menuWeek}
          listaCompra={data.listaCompraSimple || { marcados: {}, generadoEn: null }}
          onToggle={onToggleMarcadoCompra}
          onClose={() => setShowListaCompra(false)}
          idioma={idioma}
          conCantidades={false}
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
function PrintExport({ data, menu, idioma, conCantidades = true }) {
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
            FoodDraft
          </div>
          <h1 style={{ fontSize: 28, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "print.tuMenu")}</h1>
        </div>

        {[1, 2].map((week) => {
          const weekHasMeals = menu.some((s) => s.week === week);
          if (!weekHasMeals) return null;
          return (
            <div key={week} style={{ pageBreakBefore: week === 2 ? "always" : "auto" }}>
              <h2 style={{ fontSize: 18, color: "#1f4d38", borderBottom: "2px solid #d9a441", paddingBottom: 5, marginTop: 22 }}>
                {t(idioma, "menu.semana", { n: week })}
              </h2>
              {DAYS.map((day) => {
                const dayMeals = menu.filter((s) => s.week === week && s.day === day);
                if (!dayMeals.length) return null;
                const totals = conCantidades ? dayTotals(data, menu, week, day) : null;
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
                      <div style={{ fontSize: 15, marginBottom: 6 }}>{t(idioma, "dia." + day)}</div>
                      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayMeals.map((m) => (
                          <div key={m.id} style={{ fontSize: 11, lineHeight: 1.45 }}>
                            <span style={{ fontWeight: 700, color: "#a9721f" }}>{t(idioma, "mealType." + m.mealType)}: </span>
                            <span>{mealExportParts(data, m, { conCantidades }).join(", ") || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {conCantidades && <PrintDonut totals={totals} />}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          {t(idioma, conCantidades ? "print.pie" : "print.pieSimple")}
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
function ListaCompraModal({ data, menu, menuWeek, listaCompra, onToggle, onClose, idioma, conCantidades = true }) {
  const [alcance, setAlcance] = useState(menuWeek || 1);
  const items = calcularListaCompra(data, menu, alcance, { conCantidades });
  const marcados = listaCompra.marcados || {};

  const grupos = {};
  items.forEach((it) => {
    if (!grupos[it.categoria]) grupos[it.categoria] = [];
    grupos[it.categoria].push(it);
  });
  const categoriasOrdenadas = LISTA_COMPRA_ORDEN_CATS.filter((c) => grupos[c]);
  const marcadosCount = items.filter((it) => marcados[it.key]).length;

  return (
    <ModalShell onClose={onClose} title={t(idioma, "listaCompra.titulo")}>
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
            {w === "todo" ? t(idioma, "listaCompra.cicloCompleto") : t(idioma, "menu.semana", { n: w })}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "listaCompra.sinMenu")}
        </p>
      ) : (
        <>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            {t(idioma, "listaCompra.marcados", { marcados: marcadosCount, total: items.length })}
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
                      const kg = conCantidades ? it.gramos / 1000 : 0;
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
                          {conCantidades && (
                            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                              {cantidad}
                            </span>
                          )}
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
        <ModalBtn variant="solid" onClick={onClose}>{t(idioma, "common.cerrar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function DayStatsPanel({ data, menu, week, objetivos, idioma }) {
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
            {t(idioma, "dia." + d).slice(0, 3)}
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
            {t(idioma, "dayStats.pctObjetivo", { pct, kcal: objetivos.kcal })}
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
          {t(idioma, "dayStats.fijaObjetivo")}
        </div>
      )}
    </div>
  );
}

// Media diaria de sal, azúcares y fibra de la semana del menú actual, comparada contra los
// umbrales de la OMS (ver Logica/salud-publica.js). El umbral de azúcar se ajusta a tu objetivo de
// kcal si lo tienes calculado; si no, usa la dieta de referencia de 2000 kcal del propio estudio.
function ResumenSaludPublica({ data, menu, week, objetivos, idioma }) {
  const resumen = resumenNutrientesSemana(data, menu, week, objetivos?.kcal);
  if (!resumen) return null;

  const filas = [
    { key: "sal", label: t(idioma, "saludPublica.sal"), unidad: "g", info: resumen.sal, detalle: t(idioma, "saludPublica.detalleSal", { n: resumen.sal.umbral }) },
    { key: "azucares", label: t(idioma, "saludPublica.azucares"), unidad: "g", info: resumen.azucares, detalle: t(idioma, "saludPublica.detalleAzucares", { optimo: fmt(resumen.azucares.umbralOptimo), maximo: fmt(resumen.azucares.umbralMaximo) }) },
    { key: "fibra", label: t(idioma, "saludPublica.fibra"), unidad: "g", info: resumen.fibra, detalle: t(idioma, "saludPublica.detalleFibra", { n: resumen.fibra.umbral }) },
  ];

  const avisos = ["sal", "azucares", "fibra"].filter((k) => resumen.faltanDatos[k].length > 0);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
        {t(idioma, "saludPublica.titulo")}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 12 }}>
        {t(idioma, "saludPublica.sobreDias", { dias: resumen.dias, plural: resumen.dias === 1 ? "" : "s" })}
        {resumen.azucares.kcalPersonalizada ? t(idioma, "saludPublica.azucarAjustado") : ""}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filas.map((f) => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink)" }}>
                {f.label}: <strong>{fmt(f.info.media)} {f.unidad}/día</strong>
              </div>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>{f.detalle}</div>
            </div>
            <NivelBadge nivel={f.info.nivel} idioma={idioma} />
          </div>
        ))}
      </div>

      {avisos.length > 0 && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--mustard-dark)", marginTop: 12, lineHeight: 1.5 }}>
          {t(idioma, "saludPublica.calculoIncompleto", { lista: avisos.map((k) => t(idioma, "saludPublica." + k + ".nombre")).join(", ") })}
        </div>
      )}
    </div>
  );
}

function ObjetivosModal({ objetivos, perfil, onClose, idioma }) {
  const objetivosCalculados = calcularObjetivosPerfil(perfil);

  return (
    <ModalShell onClose={onClose} title={t(idioma, "objetivosModal.titulo")}>
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
            <span>{t(idioma, "objetivosModal.perfilIncompleto")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-dark)" }}>{objetivosCalculados.kcal}</div>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)" }}>{t(idioma, "objetivosModal.kcalDia")}</div>
            {objetivosCalculados.kcalEntrenamiento > 0 && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                {t(idioma, "objetivosModal.desglose", { base: objetivosCalculados.kcalBase, entrenamiento: objetivosCalculados.kcalEntrenamiento })}
              </div>
            )}
            {objetivosCalculados.objetivo !== "mantenimiento" && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                {t(idioma, "objetivosModal.tdee", {
                  kcal: objetivosCalculados.kcalMantenimiento,
                  etapa: OBJETIVO_ETAPAS[objetivosCalculados.objetivo].label,
                  signo: objetivosCalculados.ajustePct > 0 ? "+" : "",
                  pct: objetivosCalculados.ajustePct,
                })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            <MacroPill label={t(idioma, "objetivosModal.proteina")} value={`${objetivosCalculados.prot}g`} color="var(--green-dark)" bg="var(--green-soft)" />
            <MacroPill label={t(idioma, "objetivosModal.grasa")} value={`${objetivosCalculados.fat}g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
            <MacroPill label={t(idioma, "objetivosModal.carbos")} value={`${objetivosCalculados.carb}g`} color="var(--coffee)" bg="var(--coffee-soft)" />
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
                {t(idioma, "objetivosModal.carbMinAviso", { carbMin: objetivosCalculados.carbMin, fatFloor: objetivosCalculados.fatFloor })}
              </span>
            </div>
          )}

          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {t(idioma, "objetivosModal.repartoPorComida")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {Object.keys(perfil.repartoComidas).map((mealType) => {
              const sub = objetivosPorComida(objetivosCalculados, mealType, perfil.repartoComidas);
              return (
                <div
                  key={mealType}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5,
                    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 11px",
                  }}
                >
                  <span>{t(idioma, "mealType." + mealType)} <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>({Math.round(perfil.repartoComidas[mealType] * 100)}%)</span></span>
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
            {t(idioma, "objetivosModal.formula")}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="solid">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// Ids de los alimentos que forman la combinación "de sabor" de una comida (proteína, carbo,
// verdura y garbanzos si los lleva) — los mismos que ya evalúa el motor de reglas. La grasa de
// ajuste fino se deja fuera a propósito: no es una elección, es un relleno calórico automático.
function comboItemIds(data, meal) {
  const byName = (name) => (name ? data.ingredients.find((i) => i.name === name) : null);
  const proteinIng = byName(meal.protein);
  const carboIng = byName(meal.carbo);
  const verduraIng = byName(meal.verdura);
  const garbanzosIng = meal.garbanzos ? data.ingredients.find((i) => i.category === "especial") : null;
  const ids = [proteinIng, carboIng, verduraIng, garbanzosIng].filter(Boolean).map((i) => i.id);
  return [...new Set(ids)];
}

// Busca, entre las reglas existentes, una que vincule exactamente este mismo conjunto de
// alimentos (sin importar el orden) — para actualizarla en vez de crear una duplicada.
function findMatchingRule(rules, itemIds) {
  const set = new Set(itemIds);
  return (rules || []).find((r) => r.itemIds.length === set.size && r.itemIds.every((id) => set.has(id))) || null;
}

const NIVELES_GUSTA = [
  { level: "alta", labelKey: "comboAfinidad.bastante" },
  { level: "maxima", labelKey: "comboAfinidad.siempreQueSePueda" },
];
const NIVELES_NOGUSTA = [
  { level: "baja", labelKey: "comboAfinidad.menos" },
  { level: "nula", labelKey: "comboAfinidad.nunca" },
];

function ComboAfinidad({ meal, data, onUpsertRule, idioma }) {
  const [abierto, setAbierto] = useState(null); // null | "gusta" | "nogusta"
  const itemIds = comboItemIds(data, meal);
  if (itemIds.length < 2) return null;

  const existente = findMatchingRule(data.rules, itemIds);
  const nombres = itemIds.map((id) => ruleItemLabel(data.ingredients, id, idioma)).join(" + ");

  function elegir(level) {
    if (existente) onUpsertRule({ ...existente, level });
    else onUpsertRule({ id: uid(), itemIds, level });
  }

  const opciones = abierto === "gusta" ? NIVELES_GUSTA : abierto === "nogusta" ? NIVELES_NOGUSTA : null;

  return (
    <div style={{ marginTop: 12, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
        {t(idioma, "comboAfinidad.pregunta")} <span style={{ color: "var(--ink)" }}>{nombres}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setAbierto(abierto === "gusta" ? null : "gusta")}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            padding: "7px 12px", borderRadius: 8, cursor: "pointer",
            border: abierto === "gusta" ? "1px solid var(--green)" : "1px solid var(--line)",
            background: abierto === "gusta" ? "var(--green-soft)" : "transparent",
            color: "var(--green-dark)",
          }}
        >
          <ThumbsUp size={14} /> {t(idioma, "comboAfinidad.meGusta")}
        </button>
        <button
          onClick={() => setAbierto(abierto === "nogusta" ? null : "nogusta")}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            padding: "7px 12px", borderRadius: 8, cursor: "pointer",
            border: abierto === "nogusta" ? "1px solid var(--rust)" : "1px solid var(--line)",
            background: abierto === "nogusta" ? "var(--rust-soft)" : "transparent",
            color: "var(--rust)",
          }}
        >
          <ThumbsDown size={14} /> {t(idioma, "comboAfinidad.noMeGusta")}
        </button>
      </div>

      {opciones && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {opciones.map((o) => (
            <button
              key={o.level}
              onClick={() => elegir(o.level)}
              style={{
                fontSize: 11.5, fontWeight: existente?.level === o.level ? 700 : 500,
                padding: "6px 11px", borderRadius: 20, cursor: "pointer",
                border: existente?.level === o.level ? "1px solid var(--green-dark)" : "1px solid var(--line)",
                background: existente?.level === o.level ? "var(--green-dark)" : "var(--card)",
                color: existente?.level === o.level ? "#fff" : "var(--ink)",
              }}
            >
              {t(idioma, o.labelKey)}
            </button>
          ))}
        </div>
      )}

      {existente && (
        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
          {t(idioma, "comboAfinidad.guardado", { nivel: RULE_LEVELS[existente.level] ? t(idioma, "ruleLevel." + existente.level) : existente.level })}
        </div>
      )}
    </div>
  );
}

function MealDetailModal({ meal, data, onUpdateMeal, onUpsertRule, onClose, completadaHoy, onToggleCompletada, idioma }) {
  const components = mealComponents(data, meal);
  const totals = mealTotals(data, meal);

  function setRaciones(slotKey, value) {
    const v = Math.max(0, Math.round(Number(value) * 100) / 100);
    onUpdateMeal(meal.id, { raciones: { ...(meal.raciones || {}), [slotKey]: v } });
  }

  const anyChanged = components.some((c) => c.raciones !== 1);

  return (
    <ModalShell onClose={onClose} title={`${t(idioma, "dia." + meal.day)} · ${t(idioma, "mealType." + meal.mealType)}`}>
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
                    {c.macros ? `${fmt(c.macros.gramos)} g` : t(idioma, "mealDetail.sinDatos")}
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
          {t(idioma, "mealDetail.total")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{fmt(totals.kcal)}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>kcal</span>
          <span style={{ fontSize: 12, opacity: 0.9, marginLeft: "auto" }}>
            P {fmt(totals.prot)} · G {fmt(totals.fat)} · C {fmt(totals.carb)}
          </span>
        </div>
      </div>

      <ComboAfinidad meal={meal} data={data} onUpsertRule={onUpsertRule} idioma={idioma} />

      {meal.rulesApplied && meal.rulesApplied.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {meal.rulesApplied.map((r) => {
            const names = r.itemIds.map((id) => ruleItemLabel(data.ingredients, id, idioma)).join(" + ");
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
                  ? t(idioma, "mealDetail.reglaEvitada", { nombres: names })
                  : t(idioma, "mealDetail.reglaAplicada", { nombres: names, nivel: RULE_LEVELS[r.level] ? t(idioma, "ruleLevel." + r.level) : r.level })}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>
          {t(idioma, "mealDetail.racionBase")}
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
            {t(idioma, "mealDetail.restablecer")}
          </button>
        )}
      </div>

      <button
        onClick={onToggleCompletada}
        style={{
          width: "100%", marginTop: 14, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: completadaHoy ? "#fff" : "var(--green-dark)",
          background: completadaHoy ? "var(--green)" : "var(--green-soft)",
          border: "none", borderRadius: 9, padding: "11px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
        }}
      >
        <Check size={15} /> {completadaHoy ? t(idioma, "mealDetail.completadaHoy") : t(idioma, "mealDetail.marcarCompletada")}
      </button>
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

function HistoryPanel({ history, idioma }) {
  if (!history || history.length === 0) return null;
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "menu.historial.titulo")}</div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        {t(idioma, "menu.historial.explicacion")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((h) => {
          const closed = h.slots.find((s) => s.closedDish);
          const date = new Date(h.generatedAt);
          const dateLabel = date.toLocaleDateString(idioma === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
              {closed && <span>{t(idioma, "menu.historial.platoCerrado", { nombre: closed.closedDish })}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodsView({ foods, ingredients, onEdit, onNew, onDelete, onNewFromPhoto, idioma }) {
  const [query, setQuery] = useState("");
  // Igual que el menú lateral: cada categoría se expande de forma independiente, varias pueden
  // estar abiertas a la vez (no es un acordeón de "una sola a la vez").
  const [expandido, setExpandido] = useState({});
  const [exportando, setExportando] = useState(false);
  const fileInputRef = useRef(null);

  // Mismo mecanismo que la exportación del menú y del seguimiento de peso: deja el contenido
  // listo en el DOM (oculto en pantalla) y espera a que React lo pinte antes de abrir "Imprimir".
  function exportarCatalogo() {
    setExportando(true);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  const usageCount = (foodId) => ingredients.filter((i) => i.foodId === foodId).length;
  // Alimentos creados antes de la categorización (Tanda 1) o con una categoria que ya no existe
  // caen en "sin categoría" — nunca desaparecen de la lista por una categoria vacía o inválida.
  const bucketKeyFor = (f) => (CATEGORIAS_ALIMENTOS.some((c) => c.key === f.categoria) ? f.categoria : "__sin_categoria");
  const hayAlimentosSinCategoria = foods.some((f) => bucketKeyFor(f) === "__sin_categoria");
  const categorias = [
    ...CATEGORIAS_ALIMENTOS,
    ...(hayAlimentosSinCategoria ? [{ key: "__sin_categoria", labelKey: "categoriaAlimento.sinCategoria", emoji: "🗂️" }] : []),
  ];

  // El buscador filtra a la vez por nombre de categoría (si coincide, se enseña entera) y por
  // nombre de alimento suelto dentro de cada categoría (si no, solo los que coincidan). Sin
  // buscador, se listan las 12/13 categorías completas, colapsadas hasta que se toquen.
  const q = query.trim().toLowerCase();
  const grupos = categorias
    .map((cat) => {
      const todos = foods.filter((f) => bucketKeyFor(f) === cat.key);
      if (!q) return { cat, items: todos, coincide: true };
      const labelCoincide = t(idioma, cat.labelKey).toLowerCase().includes(q);
      const items = labelCoincide ? todos : todos.filter((f) => f.name.toLowerCase().includes(q));
      return { cat, items, coincide: labelCoincide || items.length > 0 };
    })
    .filter((g) => g.coincide);
  const totalVisible = grupos.reduce((s, g) => s + g.items.length, 0);
  // Mientras se busca, las categorías con alguna coincidencia se muestran ya desplegadas, sin
  // depender de lo que el usuario tuviera plegado/desplegado a mano — al borrar el buscador, se
  // vuelve a respetar ese estado manual tal cual estaba.
  const estaAbierta = (key) => (q ? true : !!expandido[key]);
  function alternar(key) {
    setExpandido((e) => ({ ...e, [key]: !e[key] }));
  }

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
      <SectionIntro text={t(idioma, "foodsView.intro")} />

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(idioma, "foodsView.buscar")}
          style={{ ...inputStyle, paddingLeft: 32, width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)",
            border: "none", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Camera size={14} /> {t(idioma, "foodsView.anadirConFoto")}
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
          <Plus size={14} /> {t(idioma, "foodsView.nuevoAlimento")}
        </button>
        <button
          onClick={exportarCatalogo}
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", background: "transparent",
            border: "1px solid var(--line)", borderRadius: 8, padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}
        >
          <Download size={14} /> {t(idioma, "foodsView.exportarCatalogo")}
        </button>
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>
        {t(idioma, "foodsView.deTotal", { n: totalVisible, total: foods.length })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {grupos.map(({ cat, items }) => {
          const abierta = estaAbierta(cat.key);
          return (
            <div key={cat.key}>
              <button
                onClick={() => alternar(cat.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
                  padding: "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: abierta ? "var(--green-soft)" : "transparent",
                  color: abierta ? "var(--green-dark)" : "var(--ink)",
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0 }}>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{t(idioma, cat.labelKey)}</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-soft)" }}>({items.length})</span>
                <ChevronDown size={15} color="var(--ink-soft)" style={{ flexShrink: 0, transform: abierta ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>

              {abierta && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 15, borderLeft: "1.5px solid var(--line)", paddingLeft: 10, marginTop: 6, marginBottom: 6 }}>
                  {items.length === 0 && (
                    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", padding: "4px 2px" }}>
                      {t(idioma, "foodsView.categoriaVacia")}
                    </div>
                  )}
                  {items.map((f) => {
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
                                  {" · "}<Link2 size={9} style={{ verticalAlign: "middle" }} /> {t(idioma, "foodsView.usadoEn", { n: uses })}
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
                            {t(idioma, "foodsView.por100g")}
                          </span>
                        </div>
                        {(f.grasaSaturada !== undefined || f.azucares !== undefined || f.fibra !== undefined || f.sal !== undefined) && (
                          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", marginTop: 6 }}>
                            {[
                              f.grasaSaturada !== undefined && t(idioma, "foodsView.saturada", { n: f.grasaSaturada }),
                              f.azucares !== undefined && t(idioma, "foodsView.azucares", { n: f.azucares }),
                              f.fibra !== undefined && t(idioma, "foodsView.fibra", { n: f.fibra }),
                              f.sal !== undefined && t(idioma, "foodsView.sal", { n: f.sal }),
                            ].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {grupos.length === 0 && (
          <div style={{
            border: "1.5px dashed var(--line)", borderRadius: 10, padding: "26px 16px",
            textAlign: "center", color: "var(--ink-soft)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13,
          }}>
            {t(idioma, "foodsView.sinCoincidencias", { query })}
          </div>
        )}
      </div>

      {exportando && <PrintFoods foods={foods} idioma={idioma} />}
    </>
  );
}

// Ficha imprimible del catálogo de alimentos completo — mismo mecanismo que PrintExport y
// PrintSeguimiento (oculto en pantalla, visible solo al imprimir vía window.print()).
function PrintFoods({ foods, idioma }) {
  const ordenados = [...foods].sort((a, b) => a.name.localeCompare(b.name, "es"));
  return (
    <div id="print-foods">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-foods, #print-foods * { visibility: visible; }
          #print-foods { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-foods { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: "Georgia, 'Times New Roman', serif", color: "#2b2b26" }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            FoodDraft
          </div>
          <h1 style={{ fontSize: 26, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "printFoods.titulo")}</h1>
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "#6b6a5e", marginBottom: 16 }}>
          {t(idioma, "printFoods.resumen", { n: ordenados.length, fecha: formatFechaCorta(fechaISO(new Date()), idioma) })}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5 }}>
          <thead>
            <tr style={{ background: "#1f4d38", color: "#fff" }}>
              {[
                t(idioma, "printFoods.alimento"), "kcal", t(idioma, "printFoods.prot"), t(idioma, "printFoods.grasa"),
                t(idioma, "printFoods.carb"), t(idioma, "printFoods.sal"), t(idioma, "printFoods.azuc"),
                t(idioma, "printFoods.fibra"), t(idioma, "printFoods.sat"), t(idioma, "printFoods.origen"),
              ].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 7px", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((f, i) => (
              <tr key={f.id} style={{ background: i % 2 === 1 ? "#f1ede0" : "transparent", pageBreakInside: "avoid" }}>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{f.name}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.kcal)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.prot)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.fat)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.carb)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.sal)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.azucares)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.fibra)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf" }}>{fmt(f.grasaSaturada)}</td>
                <td style={{ padding: "5px 7px", borderBottom: "1px solid #ddd6bf", fontSize: 9.5, color: "#6b6a5e" }}>{f.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 20 }}>
          {t(idioma, "printFoods.pie")}
        </div>
      </div>
    </div>
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

function FoodEditModal({ state, onClose, onSave, idioma }) {
  const existing = state.food;
  const [name, setName] = useState(existing ? existing.name : "");
  const [categoria, setCategoria] = useState(existing?.categoria || CATEGORIAS_ALIMENTOS[0].key);
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
        t(idioma, "foodEditModal.errorLectura")
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
      categoria,
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
    <ModalShell onClose={onClose} title={state.mode === "new" ? t(idioma, "foodEditModal.nuevoAlimento") : t(idioma, "foodEditModal.editarAlimento")}>
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
                {analyzing ? t(idioma, "foodEditModal.leyendoEtiqueta") : analyzed ? t(idioma, "foodEditModal.volverALeer") : t(idioma, "foodEditModal.leerDeFoto")}
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
                  {t(idioma, "foodEditModal.datosRellenados")}
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
              {t(idioma, "foodEditModal.lecturaNoDisponible")}
            </div>
          )}
        </div>
      )}

      <Field label={t(idioma, "foodEditModal.nombre")}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder={t(idioma, "foodEditModal.nombrePlaceholder")} />
      </Field>

      <Field label={t(idioma, "foodEditModal.categoria")}>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
          {CATEGORIAS_ALIMENTOS.map((c) => (
            <option key={c.key} value={c.key}>{c.emoji} {t(idioma, c.labelKey)}</option>
          ))}
        </select>
      </Field>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginBottom: 8 }}>
        {t(idioma, "foodEditModal.valoresPor100g")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "foodEditModal.calorias")}>
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.proteina")}>
          <input type="number" step="0.1" value={prot} onChange={(e) => setProt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.grasa")}>
          <input type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t(idioma, "foodEditModal.carbohidratos")}>
          <input type="number" step="0.1" value={carb} onChange={(e) => setCarb(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 8px" }}>
        {t(idioma, "foodEditModal.detalleAdicional")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "foodEditModal.saturadas")}>
          <input type="number" step="0.1" value={grasaSaturada} onChange={(e) => setGrasaSaturada(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.azucares")}>
          <input type="number" step="0.1" value={azucares} onChange={(e) => setAzucares(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.fibra")}>
          <input type="number" step="0.1" value={fibra} onChange={(e) => setFibra(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
        <Field label={t(idioma, "foodEditModal.sal")}>
          <input type="number" step="0.01" value={sal} onChange={(e) => setSal(e.target.value)} style={inputStyle} placeholder="—" />
        </Field>
      </div>

      <Field label={t(idioma, "foodEditModal.fuente")}>
        <input value={fuente} onChange={(e) => setFuente(e.target.value)} style={inputStyle} placeholder={t(idioma, "foodEditModal.fuentePlaceholder")} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmFoodDeleteModal({ food, usedBy, onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmFoodDelete.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "confirmFoodDelete.textoPre")}<strong>{food.name}</strong>{t(idioma, "confirmFoodDelete.textoPost")}
      </p>
      {usedBy.length > 0 && (
        <div
          style={{
            background: "var(--rust-soft)", borderLeft: "3px solid var(--rust)", borderRadius: 4,
            padding: "10px 12px", marginTop: 12,
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--rust)",
          }}
        >
          {t(idioma, "confirmFoodDelete.enlazado", { n: usedBy.length, plural: usedBy.length > 1 ? "s" : "", lista: usedBy.map((i) => i.name).join(", ") })}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmFoodDelete.titulo")}</ModalBtn>
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

function ruleItemLabel(ingredients, id, idioma) {
  const ing = ingredients.find((i) => i.id === id);
  return ing ? ing.name : t(idioma, "rulesView.alimentoEliminado");
}

function RulesView({ rules, ingredients, onEdit, onNew, onDelete, idioma }) {
  return (
    <>
      <SectionIntro text={t(idioma, "rulesView.intro")} />

      <button
        onClick={onNew}
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: "#fff", background: "var(--green)", border: "none", borderRadius: 9,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
        }}
      >
        <Plus size={15} /> {t(idioma, "rulesView.nuevaRegla")}
      </button>

      {rules.length === 0 ? (
        <div style={{
          border: "1.5px dashed var(--line)", borderRadius: 12, padding: "34px 18px",
          textAlign: "center", color: "var(--ink-soft)",
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13,
        }}>
          {t(idioma, "rulesView.sinReglas")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((rule) => {
            const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id, idioma));
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
                  {t(idioma, "ruleLevel." + rule.level)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function RuleEditModal({ state, ingredients, onClose, onSave, idioma }) {
  const existing = state.rule;
  const items = ruleSelectableItems(ingredients);
  const [id1, setId1] = useState(existing?.itemIds?.[0] ?? "");
  const [id2, setId2] = useState(existing?.itemIds?.[1] ?? "");
  const [id3, setId3] = useState(existing?.itemIds?.[2] ?? "");
  const [id4, setId4] = useState(existing?.itemIds?.[3] ?? "");
  const [level, setLevel] = useState(existing?.level ?? "alta");

  const chosenIds = [id1, id2, id3, id4].filter(Boolean);
  const valid = id1 && id2 && new Set(chosenIds).size === chosenIds.length;

  function handleSave() {
    if (!valid) return;
    onSave({ id: existing ? existing.id : uid(), itemIds: chosenIds, level });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? t(idioma, "ruleEditModal.nuevaTitulo") : t(idioma, "ruleEditModal.editarTitulo")}>
      <Field label={t(idioma, "ruleEditModal.elemento1")}>
        <select value={id1} onChange={(e) => setId1(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.elige")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento2")}>
        <select value={id2} onChange={(e) => setId2(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.elige")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento3")}>
        <select value={id3} onChange={(e) => setId3(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.ninguno")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento4")}>
        <select value={id4} onChange={(e) => setId4(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.ninguno")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>

      <Field label={t(idioma, "ruleEditModal.nivelAfinidad")}>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
          {Object.keys(RULE_LEVELS).map((key) => (
            <option key={key} value={key}>{t(idioma, "ruleLevel." + key)}</option>
          ))}
        </select>
      </Field>

      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: -4 }}>
        {level === "nula" && t(idioma, "ruleEditModal.explicacionNula")}
        {level === "baja" && t(idioma, "ruleEditModal.explicacionBaja")}
        {level === "alta" && t(idioma, "ruleEditModal.explicacionAlta")}
        {level === "maxima" && t(idioma, "ruleEditModal.explicacionMaxima")}
      </p>

      {!valid && (id1 || id2) && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>
          {t(idioma, "ruleEditModal.eligeAlMenos2")}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmRuleDeleteModal({ rule, ingredients, onCancel, onConfirm, idioma }) {
  const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id, idioma));
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmRuleDelete.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "confirmRuleDelete.textoPre")}<strong>{names.join(" + ")}</strong>{t(idioma, "confirmRuleDelete.textoPost")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmRuleDelete.titulo")}</ModalBtn>
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

function ProbabilitySumBadge({ total, idioma }) {
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
      {t(idioma, "catalogo.sumaActual", { n: total, estado: ok ? t(idioma, "catalogo.correcto") : t(idioma, "catalogo.deberiaSer100") })}
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

function ruleSummary(ing, idioma) {
  if (ing.ruleType === "base") return t(idioma, "catalogo.baseDelMenu");
  if (ing.ruleType === "frecuencia") {
    const periodo = ing.freqPeriodo === "ciclo" ? t(idioma, "catalogo.cada2Semanas") : t(idioma, "catalogo.porSemana");
    return t(idioma, "catalogo.vecesXPeriodo", { n: ing.freqCantidad, periodo });
  }
  if (ing.ruleType === "probabilidad") return t(idioma, "catalogo.probabilidadPct", { n: ing.probabilidad });
  return "";
}

function IngredientCard({ ingredient, data, onEdit, onDelete, extraNote, idioma }) {
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
        {ruleSummary(ingredient, idioma)}
      </div>

      {m ? (
        <div style={{ marginTop: 9 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", marginBottom: 4 }}>
            {t(idioma, "catalogo.unaRacion", { g: m.gramos })}
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
          <AlertCircle size={11} /> {t(idioma, "catalogo.sinEnlazar")}
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

function BlockCard({ block, data, members, onUpdateBlock, onEditMember, onDeleteMember, onAddMember, onEditFrequency, showProbabilities, idioma }) {
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
            {t(idioma, "catalogo.grupoFrecuencia", { n: block.cicloFrecuencia })}
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
          <Plus size={12} /> {t(idioma, "catalogo.anadirAlGrupo")}
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

function EditModal({ state, foods = [], onClose, onSave, idioma }) {
  const { mode, category, blockId } = state;
  const existing = state.ingredient;
  const [name, setName] = useState(existing ? existing.name : "");
  const [ruleType, setRuleType] = useState(existing ? existing.ruleType : (blockId ? "bloque_miembro" : ["carbo", "verdura", "grasa", "desayuno", "media_manana", "merienda"].includes(category) ? "probabilidad" : "frecuencia"));
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
  // Desayuno, media mañana, merienda y platos cerrados son "platos completos": se componen
  // sumando varios alimentos de la base de datos, en vez de enlazar uno solo directamente.
  const usesComposition = category === "desayuno" || category === "media_manana" || category === "merienda" || (isBlockMember && category === "cerrado");
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
    <ModalShell onClose={onClose} title={mode === "new" ? t(idioma, "editModal.tituloNuevo") : t(idioma, "editModal.tituloEditar")}>
      <Field label={t(idioma, "editModal.nombre")}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder={t(idioma, "editModal.nombrePlaceholder")}
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
            <Link2 size={12} /> {t(idioma, "editModal.ingredientesDelPlato")}
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
                      <option value="">{t(idioma, "editModal.elegirAlimento")}</option>
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
            <Plus size={12} /> {t(idioma, "editModal.anadirIngrediente")}
          </button>

          {composicion.length > 0 ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", alignSelf: "center", marginRight: 2 }}>
                {t(idioma, "editModal.totalDelPlato")}
              </span>
              <MacroPill label="kcal" value={fmt(composTotal.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
              <MacroPill label="P" value={`${fmt(composTotal.prot)} g`} color="var(--green-dark)" bg="var(--green-soft)" />
              <MacroPill label="G" value={`${fmt(composTotal.fat)} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
              <MacroPill label="C" value={`${fmt(composTotal.carb)} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
            </div>
          ) : (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              {t(idioma, "editModal.anadeIngrediente")}
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
            <Link2 size={12} /> {t(idioma, "editModal.datosNutricionales")}
          </div>

          <Field label={t(idioma, "editModal.alimentoBaseDatos")}>
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)} style={inputStyle}>
              <option value="">{t(idioma, "editModal.sinEnlazar")}</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t(idioma, "editModal.gramosPorRacion")}>
            <input
              type="number"
              min={0}
              value={gramos}
              onChange={(e) => setGramos(e.target.value)}
              style={inputStyle}
              placeholder={t(idioma, "editModal.gramosPlaceholder")}
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
              {t(idioma, "editModal.enlazaAlimento")}
            </div>
          )}
        </div>
      )}

      <Field label={t(idioma, "editModal.notaCantidad")}>
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={inputStyle}
          placeholder={t(idioma, "editModal.notaCantidadPlaceholder")}
        />
      </Field>

      {!isBlockMember && category === "proteina" && (
        <Field label={t(idioma, "editModal.tipoDeRegla")}>
          <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} style={inputStyle}>
            <option value="frecuencia">{t(idioma, "editModal.frecuenciaFija")}</option>
            <option value="base">{t(idioma, "editModal.baseDelMenuOpcion")}</option>
          </select>
        </Field>
      )}

      {!isBlockMember && ruleType === "frecuencia" && (
        <Field label={t(idioma, "editModal.frecuencia")}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min={1}
              value={freqCantidad}
              onChange={(e) => setFreqCantidad(e.target.value)}
              style={{ ...inputStyle, width: 70 }}
            />
            <select value={freqPeriodo} onChange={(e) => setFreqPeriodo(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="semana">{t(idioma, "catalogo.porSemana")}</option>
              <option value="ciclo">{t(idioma, "catalogo.cada2Semanas")}</option>
            </select>
          </div>
        </Field>
      )}

      {!isBlockMember && ruleType === "probabilidad" && (
        <Field label={t(idioma, "editModal.probabilidadPct")}>
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
        <Field label={t(idioma, "editModal.probabilidadDentroGrupo")}>
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
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({ ingredient, onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmModal.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>
        {t(idioma, "confirmModal.textoPre")}<strong>{ingredient.name}</strong>{t(idioma, "confirmModal.textoPost")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmModal.titulo")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function FrequencyModal({ block, onClose, onSave, idioma }) {
  const [value, setValue] = useState(block.cicloFrecuencia);
  return (
    <ModalShell onClose={onClose} title={t(idioma, "frequencyModal.titulo", { nombre: block.name })}>
      <Field label={t(idioma, "frequencyModal.vecesCada2Semanas")}>
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
        {t(idioma, "frequencyModal.ejemplo")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={() => onSave(Number(value) || 1)} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
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

function ModalBtn({ children, onClick, variant, disabled }) {
  const styles = {
    ghost: { background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)" },
    solid: { background: "var(--green)", color: "#fff", border: "none" },
    danger: { background: "var(--rust)", color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        borderRadius: 8,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
