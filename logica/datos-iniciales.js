// ---------- Datos iniciales ----------
// Módulo de lógica pura (sin JSX, sin React): el catálogo base de alimentos (FOODS_SEED), las
// carpetas en que se agrupa y los datos con los que arranca una cuenta nueva. Antes vivía al
// principio de app.jsx; se sacó en la reestructuración de octubre de 2026 para que migraciones.js
// y cuestionario.js (y Validacion) puedan usarlo sin depender del archivo de interfaz.
import { defaultPesoTracking } from "peso";

// ---------- Base de datos de alimentos (macros por 100 g) ----------
// Ids fijos (no aleatorios) para que las migraciones puedan reconocerlos entre versiones.
// "fuente" indica de dónde sale el dato: etiqueta real de producto o valor estándar contrastado.
// "emoji" (F3, 25-oct-2026): el dibujo con el que se reconoce en la despensa. Antes cada alimento
// llevaba el de su carpeta y en la despensa «eran todos demasiado parecidos» (todas las proteínas, un
// muslo de pollo); ahora cada uno de la semilla tiene el suyo, elegido para que no se repita ninguno y se
// parezca a lo que es (🧆 los garbanzos, porque el falafel es de garbanzo; 🫘 los anacardos, por su forma
// de riñón; 🫙 el cottage, que viene en tarrina). El usuario puede cambiarlo, o ponérselo a los suyos, al
// editar el alimento; sin emoji se usa el de la carpeta (CATEGORIAS_ALIMENTOS).
export const FOODS_SEED = [
  // Proteínas
  { id: "f_pechuga_pollo", emoji: "🍗", name: "Pechuga de pollo (cruda)", categoria: "proteinas", kcal: 165, prot: 31, fat: 3.6, carb: 0, sal: 0.1, azucares: 0, fibra: 0, grasaSaturada: 1, fuente: "Estándar" },
  { id: "f_hamb_pollo", emoji: "🐔", name: "Hamburguesa de pollo (Hacendado)", categoria: "proteinas", kcal: 144, prot: 17, fat: 7, carb: 3, fuente: "Etiqueta" },
  { id: "f_picada_pollo", emoji: "🐓", name: "Carne picada de pollo (Hacendado)", categoria: "proteinas", kcal: 124, prot: 16.6, fat: 5.3, carb: 1, fuente: "Etiqueta" },
  { id: "f_picada_mixta", emoji: "🥩", name: "Carne picada ternera/cerdo", categoria: "proteinas", kcal: 163, prot: 17, fat: 9.5, carb: 1, fuente: "Etiqueta (media)" },
  { id: "f_hamb_mixta", emoji: "🍔", name: "Hamburguesa ternera/cerdo (Hacendado)", categoria: "proteinas", kcal: 226, prot: 18, fat: 17, carb: 2, fuente: "Etiqueta" },
  { id: "f_salmon", emoji: "🍣", name: "Salmón (crudo)", categoria: "proteinas", kcal: 144, prot: 20, fat: 12, carb: 0, sal: 0.1, azucares: 0, fibra: 0, fuente: "Estándar" },
  { id: "f_merluza", emoji: "🐟", name: "Merluza / pescada (Hacendado)", categoria: "proteinas", kcal: 82, prot: 18, fat: 1.5, carb: 0.5, sal: 0.24, azucares: 0.5, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_atun", emoji: "🥫", name: "Atún al natural (escurrido)", categoria: "proteinas", kcal: 105, prot: 22.5, fat: 1.2, carb: 0, fuente: "Etiqueta" },
  { id: "f_sardinas", emoji: "🐠", name: "Sardinas en aceite de oliva (escurridas)", categoria: "proteinas", kcal: 207, prot: 24, fat: 14, carb: 0, fuente: "Etiqueta" },
  { id: "f_huevo", emoji: "🥚", name: "Huevo entero (crudo)", categoria: "proteinas", kcal: 140, prot: 12.7, fat: 9.5, carb: 0.3, sal: 0, azucares: 0.27, fibra: 0, grasaSaturada: 2.64, fuente: "Etiqueta" },

  // Embutido / fiambre — antes mezclados con Proteínas; carpeta propia porque se comen de otra
  // forma (acompañamiento/topping) y llevan bastante más sal.
  { id: "f_pavo", emoji: "🦃", name: "Pechuga de pavo fiambre (El Pozo)", categoria: "embutido_fiambre", kcal: 90, prot: 20.3, fat: 1.5, carb: 0, sal: 1.8, azucares: 0, fibra: 0, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_jamon", emoji: "🍖", name: "Jamón curado (Navidul)", categoria: "embutido_fiambre", kcal: 212, prot: 30, fat: 10, carb: 0.5, sal: 5, azucares: 0.5, fibra: 0, grasaSaturada: 3.8, fuente: "Etiqueta" },
  { id: "f_lomo", emoji: "🥓", name: "Lomo embuchado (Boadas)", categoria: "embutido_fiambre", kcal: 203, prot: 35, fat: 7, carb: 0.7, sal: 3.5, azucares: 0.7, fibra: 0, grasaSaturada: 2.2, fuente: "Etiqueta" },

  // Carbohidratos (almidones "de plato principal" — pan, cereales y legumbres se separan abajo)
  { id: "f_pasta", emoji: "🍝", name: "Pasta / macarrón (cruda, Hacendado)", categoria: "carbohidratos", kcal: 357, prot: 11, fat: 1.5, carb: 70, sal: 0.1, azucares: 3.5, fibra: 4, grasaSaturada: 0.3, fuente: "Etiqueta" },
  { id: "f_arroz_basmati", emoji: "🍚", name: "Arroz basmati (crudo, Hacendado)", categoria: "carbohidratos", kcal: 353, prot: 8.06, fat: 1, carb: 78, sal: 0, azucares: 0.17, fibra: 0.92, grasaSaturada: 0.19, fuente: "Etiqueta" },
  { id: "f_patata", emoji: "🥔", name: "Patata (cruda)", categoria: "carbohidratos", kcal: 77, prot: 2, fat: 0.1, carb: 17, sal: 0.01, azucares: 1, fibra: 2, fuente: "Estándar" },
  { id: "f_gnocchi", emoji: "🥟", name: "Gnocchi (fresco, Ifa Eliges)", categoria: "carbohidratos", kcal: 156, prot: 3, fat: 0.5, carb: 30, sal: 0.63, azucares: 0.5, fibra: 1.9, grasaSaturada: 0.1, fuente: "Etiqueta" },

  // Legumbres — antes dentro de Carbohidratos "a la fuerza"
  { id: "f_garbanzos_cocidos", emoji: "🧆", name: "Garbanzos cocidos (bote)", categoria: "legumbres", kcal: 119, prot: 6.5, fat: 2.6, carb: 16, fibra: 5, fuente: "Estándar" },

  // Panes — carpeta propia, no dentro de Carbohidratos
  { id: "f_pan_molde", emoji: "🍞", name: "Pan de molde natural (Hacendado)", categoria: "panes", kcal: 265, prot: 9.1, fat: 3.5, carb: 48, sal: 1.1, azucares: 3.8, fibra: 1.2, grasaSaturada: 0.6, fuente: "Etiqueta" },
  { id: "f_pan_brioche", emoji: "🥯", name: "Pan hamburguesa brioche (Hacendado)", categoria: "panes", kcal: 340, prot: 11, fat: 8, carb: 55, sal: 0.86, azucares: 11, fibra: 2, grasaSaturada: 2.2, fuente: "Etiqueta" },

  // Cereales (de desayuno) — carpeta propia
  { id: "f_cereales_cacao", emoji: "🥣", name: "Cereales de cacao (Hacendado)", categoria: "cereales", kcal: 389, prot: 13, fat: 5, carb: 70, sal: 0.6, azucares: 9, fibra: 9.5, grasaSaturada: 1.5, fuente: "Etiqueta" },

  // Vegetales
  { id: "f_ensalada", emoji: "🥗", name: "Ensalada variada (hoja, tomate, etc.)", categoria: "vegetales", kcal: 25, prot: 1.5, fat: 0.3, carb: 3.5, fibra: 1.5, fuente: "Estándar" },
  { id: "f_tomate", emoji: "🍅", name: "Tomate (crudo)", categoria: "vegetales", kcal: 18, prot: 0.9, fat: 0.2, carb: 3.9, azucares: 2.6, fibra: 1.2, fuente: "Estándar" },
  { id: "f_pimiento", emoji: "🫑", name: "Pimiento (crudo)", categoria: "vegetales", kcal: 27, prot: 1, fat: 0.3, carb: 6, azucares: 4.2, fibra: 2.1, fuente: "Estándar" },
  { id: "f_cebolla", emoji: "🧅", name: "Cebolla (cruda)", categoria: "vegetales", kcal: 40, prot: 1.1, fat: 0.1, carb: 9.3, azucares: 4.2, fibra: 1.7, fuente: "Estándar" },
  { id: "f_pure_verduras", emoji: "🥕", name: "Puré de verduras", categoria: "vegetales", kcal: 55, prot: 1.5, fat: 1.5, carb: 8, fuente: "Estándar" },

  // Frutas — catálogo nuevo, no existía ninguna fruta antes de esta tanda. Selección inicial de
  // las más comunes; se amplía/cambia más adelante sin ningún problema.
  { id: "f_manzana", emoji: "🍎", name: "Manzana (cruda)", categoria: "frutas", kcal: 52, prot: 0.3, fat: 0.2, carb: 14, azucares: 10, fibra: 2.4, fuente: "Estándar" },
  { id: "f_platano", emoji: "🍌", name: "Plátano (crudo)", categoria: "frutas", kcal: 89, prot: 1.1, fat: 0.3, carb: 23, azucares: 12, fibra: 2.6, fuente: "Estándar" },
  { id: "f_naranja", emoji: "🍊", name: "Naranja (cruda)", categoria: "frutas", kcal: 47, prot: 0.9, fat: 0.1, carb: 12, azucares: 9, fibra: 2.4, fuente: "Estándar" },
  { id: "f_pera", emoji: "🍐", name: "Pera (cruda)", categoria: "frutas", kcal: 57, prot: 0.4, fat: 0.1, carb: 15, azucares: 10, fibra: 3.1, fuente: "Estándar" },
  { id: "f_fresas", emoji: "🍓", name: "Fresas (crudas)", categoria: "frutas", kcal: 32, prot: 0.7, fat: 0.3, carb: 7.7, azucares: 4.9, fibra: 2, fuente: "Estándar" },
  { id: "f_uvas", emoji: "🍇", name: "Uvas (crudas)", categoria: "frutas", kcal: 69, prot: 0.7, fat: 0.2, carb: 18, azucares: 16, fibra: 0.9, fuente: "Estándar" },

  // Lácteos (incluye el café con leche: no encaja mejor en ninguna otra carpeta y lleva leche de verdad)
  { id: "f_queso_cottage", emoji: "🫙", name: "Queso cottage (Ifa Eliges)", categoria: "lacteos", kcal: 66, prot: 12, fat: 1.5, carb: 2, sal: 0.6, azucares: 2, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_yogur_prot", emoji: "🥛", name: "Yogur proteínas (Hacendado)", categoria: "lacteos", kcal: 52, prot: 10, fat: 0.3, carb: 3.1, sal: 0.1, azucares: 3.1, fibra: 0, grasaSaturada: 0.1, fuente: "Etiqueta" },
  { id: "f_mozzarella", emoji: "🧀", name: "Queso rallado mozzarella (Ifa Eliges)", categoria: "lacteos", kcal: 285, prot: 21, fat: 21, carb: 0.8, sal: 1, azucares: 0.8, fibra: 0, grasaSaturada: 14, fuente: "Etiqueta" },
  { id: "f_cafe_leche", emoji: "☕", name: "Café con leche (taza 200 ml)", categoria: "lacteos", kcal: 33, prot: 1.5, fat: 1.2, carb: 2.5, fuente: "Estándar (por 100 ml)" },

  // Grasas — antes mezclado en "Lácteos y otros", sin pintar nada ahí
  { id: "f_aove", emoji: "🫒", name: "Aceite de oliva virgen extra", categoria: "grasas", kcal: 900, prot: 0, fat: 100, carb: 0, sal: 0, azucares: 0, fibra: 0, grasaSaturada: 14, fuente: "Estándar" },

  // Frutos secos — separados de los snacks procesados (antes en el mismo cajón de sastre)
  { id: "f_anacardos", emoji: "🫘", name: "Anacardos naturales sin sal", categoria: "frutos_secos", kcal: 589, prot: 17.5, fat: 45, carb: 31, sal: 0, azucares: 6, fibra: 3.3, grasaSaturada: 8, fuente: "Estándar" },
  { id: "f_pistachos", emoji: "🌰", name: "Pistachos naturales sin sal", categoria: "frutos_secos", kcal: 580, prot: 19, fat: 48, carb: 21, sal: 0, azucares: 8, fibra: 10, grasaSaturada: 6, fuente: "Estándar" },
  { id: "f_cacahuete_polvo", emoji: "🥜", name: "Cacahuete en polvo desgrasado (Eroski)", categoria: "frutos_secos", kcal: 470, prot: 47, fat: 8, carb: 24, sal: 0, azucares: 8.8, fibra: 14, grasaSaturada: 2, fuente: "Etiqueta" },

  // Snacks procesados
  { id: "f_choco85", emoji: "🍫", name: "Chocolate negro 85%", categoria: "snacks_procesados", kcal: 600, prot: 9, fat: 46, carb: 20, azucares: 16, grasaSaturada: 26, fuente: "Estándar" },
  { id: "f_nachos", emoji: "🌽", name: "Nachos (Ifa Eliges)", categoria: "snacks_procesados", kcal: 486, prot: 5.1, fat: 22, carb: 65, azucares: 1.2, fibra: 4.8, grasaSaturada: 2.5, fuente: "Etiqueta" },
  { id: "f_guacamole", emoji: "🥑", name: "Guacamole fresco (Ifa Eliges)", categoria: "snacks_procesados", kcal: 182, prot: 1.8, fat: 16, carb: 8, sal: 1.3, azucares: 1.4, fibra: 3.2, grasaSaturada: 2.4, fuente: "Etiqueta" },
];

// Carpetas de la base de datos de alimentos (distinto de CATEGORY_META más abajo, que clasifica
// reglas de ingrediente, no alimentos crudos). Cada carpeta agrupa foods[] por categoria y da un
// gramaje de partida — por categoría, no por alimento — para cuando el cuestionario de catálogo
// (Tanda 2) construya combinaciones sin pedir una cantidad curada para cada alimento nuevo.
export const CATEGORIAS_ALIMENTOS = [
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
export const initialData = () => {
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
