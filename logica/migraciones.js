// ---------- Migraciones de datos guardados ----------
// Módulo de lógica pura (sin JSX, sin React). migrateData se ejecuta sobre cualquier dato cargado
// desde Firestore/localStorage antes de usarlo (ver CLAUDE.md, "Migraciones de datos guardados").
// Es de lo más delicado de la app — protege los datos ya guardados de todas las cuentas — y hasta
// octubre de 2026 vivía dentro de app.jsx sin ningún caso de prueba; ahora tiene los suyos en
// Validacion.
import { FOODS_SEED } from "datos-iniciales";
import { REPARTO_COMIDAS } from "objetivos";
import { defaultPesoTracking } from "peso";
import { DEFAULT_IDIOMA } from "i18n";

// Parchea datos ya guardados que se crearon con una versión anterior del código,
// para que se beneficien de mejoras estructurales sin perder tus ediciones ni tener que rehacer nada a mano.
export function migrateData(rawData) {
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
