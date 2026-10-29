// ---------- Cuestionario de catálogo (lógica) ----------
// Módulo de lógica pura (sin JSX, sin React): las opciones del cuestionario de alta, sus pasos y
// la función que convierte las respuestas en los ingredients iniciales de la cuenta. La pantalla
// (CatalogoOnboarding y sus pasos) sigue en la capa de interfaz; aquí solo queda lo que se puede
// probar sin pintar nada (ver los casos de Validacion).
import { uid } from "comun";
import { FOODS_SEED, CATEGORIAS_ALIMENTOS } from "datos-iniciales";

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
export const CUESTIONARIO_PROTEINAS = [
  { foodId: "f_pechuga_pollo", nombreEs: "Pollo", labelKey: "cuestionario.alimento.pollo", gramos: 150 },
  { foodId: "f_salmon", nombreEs: "Salmón", labelKey: "cuestionario.alimento.salmon", gramos: 150 },
  { foodId: "f_merluza", nombreEs: "Merluza", labelKey: "cuestionario.alimento.merluza", gramos: 150 },
  { foodId: "f_atun", nombreEs: "Atún", labelKey: "cuestionario.alimento.atun", gramos: 100 },
  { foodId: "f_sardinas", nombreEs: "Sardinas", labelKey: "cuestionario.alimento.sardinas", gramos: 90 },
  { foodId: "f_huevo", nombreEs: "Huevo", labelKey: "cuestionario.alimento.huevo", gramos: 120 },
  { foodId: "f_jamon", nombreEs: "Jamón", labelKey: "cuestionario.alimento.jamon", gramos: 80 },
  { foodId: "f_picada_mixta", nombreEs: "Carne picada", labelKey: "cuestionario.alimento.carnePicada", gramos: 150 },
];

export const CUESTIONARIO_CARBOS = [
  { foodId: "f_pasta", nombreEs: "Pasta", labelKey: "cuestionario.alimento.pasta", gramos: 80 },
  { foodId: "f_arroz_basmati", nombreEs: "Arroz", labelKey: "cuestionario.alimento.arroz", gramos: 80 },
  { foodId: "f_patata", nombreEs: "Patata", labelKey: "cuestionario.alimento.patata", gramos: 250 },
  { foodId: "f_gnocchi", nombreEs: "Gnocchi", labelKey: "cuestionario.alimento.gnocchi", gramos: 200 },
  { foodId: "f_pan_molde", nombreEs: "Pan de molde", labelKey: "cuestionario.alimento.pan", gramos: 80 },
];

export const CUESTIONARIO_VERDURAS = [
  { foodId: "f_ensalada", nombreEs: "Ensalada", labelKey: "cuestionario.alimento.ensalada", gramos: 150 },
  { foodId: "f_tomate", nombreEs: "Tomate", labelKey: "cuestionario.alimento.tomate", gramos: 150 },
  { foodId: "f_pimiento", nombreEs: "Pimiento y cebolla", labelKey: "cuestionario.alimento.pimiento", gramos: 150 },
  { foodId: "f_pure_verduras", nombreEs: "Puré de verduras", labelKey: "cuestionario.alimento.pure", gramos: 200 },
];

export const CUESTIONARIO_GRASAS = [
  { foodId: "f_aove", nombreEs: "Aceite de oliva", labelKey: "cuestionario.alimento.aove", gramos: 10 },
  { foodId: "f_anacardos", nombreEs: "Frutos secos", labelKey: "cuestionario.alimento.frutosSecos", gramos: 30 },
  { foodId: "f_mozzarella", nombreEs: "Queso", labelKey: "cuestionario.alimento.queso", gramos: 30 },
];

// Exclusiones por gusto (Pantalla 1): cada chip filtra, de todas las listas de arriba a la vez,
// los alimentos que llevan eso — deliberadamente solo las que el catálogo puede filtrar de verdad
// con los datos que tiene hoy (no hay ningún alimento marcado como "picante", por ejemplo, así que
// esa opción no está: prometer un filtro que no filtra nada sería peor que no ofrecerlo).
export const EXCLUSIONES_DISPONIBLES = [
  { key: "pescado", labelKey: "cuestionario.exclusion.pescado", foodIds: ["f_salmon", "f_merluza", "f_atun", "f_sardinas"] },
  { key: "frutosSecos", labelKey: "cuestionario.exclusion.frutosSecos", foodIds: ["f_anacardos", "f_pistachos", "f_cacahuete_polvo"] },
  { key: "lacteos", labelKey: "cuestionario.exclusion.lacteos", foodIds: ["f_queso_cottage", "f_yogur_prot", "f_mozzarella"] },
  { key: "cerdo", labelKey: "cuestionario.exclusion.cerdo", foodIds: ["f_jamon", "f_lomo", "f_picada_mixta", "f_hamb_mixta"] },
];

// Pasos base, siempre presentes. Los tres pasos de "comida ligera" (desayuno, media mañana,
// merienda — Tanda 2 piloto de desayuno, Tanda 3 extiende el mismo mecanismo a los otros dos) se
// añaden condicionalmente al final, según qué comidas tenga el reparto elegido en el perfil — ver
// pasosCuestionario() más abajo. Un preset como "3 comidas · sin desayuno" no añade el paso
// "desayuno"; uno como "5 comidas · con media mañana" añade también "media_manana".
export const CUESTIONARIO_PASOS_BASE = ["exclusiones", "proteinas", "carbohidratos", "verduras", "grasas"];

export function pasosCuestionario(repartoComidas) {
  const pasos = [...CUESTIONARIO_PASOS_BASE];
  if (repartoComidas && repartoComidas.Desayuno !== undefined) pasos.push("desayuno");
  if (repartoComidas && repartoComidas["Media mañana"] !== undefined) pasos.push("media_manana");
  if (repartoComidas && repartoComidas.Merienda !== undefined) pasos.push("merienda");
  return pasos;
}

// Frecuencia semanal para proteínas (1/2/3), peso relativo Poco/Normal/Mucho para el resto —
// mismas claves de i18n reutilizadas en las 4 pantallas de selección vía SeleccionAlimentosStep,
// y también por los arquetipos de Desayuno (su "nivel" pesa igual que Poco/Normal/Mucho).
// A9 (25-oct-2026): las proteínas ya no rotan 1 → 2 → 3 → 1 (se volvía a 1 sin querer al pasar de 3): llevan
// botones − y + con tope en las comidas principales de la semana (huecosProteinaSemana). NIVELES_FRECUENCIA
// se conserva por si otra pantalla lo usa.
export const NIVELES_FRECUENCIA = ["cuestionario.nivel.freq1", "cuestionario.nivel.freq2", "cuestionario.nivel.freq3"];

// Cuántos huecos de proteína hay a la semana: el motor (logica/menu-generador.js) solo sortea proteína en
// Comida y Cena, así que son 7 por cada una que haya en el reparto (14 con las dos). Es el tope del + de la
// frecuencia y la cuenta que se enseña («5 de 14 comidas; el resto, con el predeterminado»).
export function huecosProteinaSemana(repartoComidas) {
  const r = repartoComidas || { Comida: 1, Cena: 1 };
  return ["Comida", "Cena"].filter((m) => r[m] !== undefined).length * 7;
}

// La proteína recomendada como predeterminada (A9): el pollo, la más versátil y barata de la lista.
export const PROTEINA_PREDETERMINADA_RECOMENDADA = "f_pechuga_pollo";

export const NIVELES_PESO = ["cuestionario.nivel.poco", "cuestionario.nivel.normal", "cuestionario.nivel.mucho"];

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
export const ARQUETIPOS_COMIDA_LIGERA = [
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
// cuenta nueva. Proteínas -> regla de frecuencia semanal directa (las veces elegidas). Carbo/
// verdura/grasa -> regla de probabilidad, normalizando los pesos relativos (1-3) de lo elegido en
// cada categoría para que sumen exactamente 100 (el último ajusta el redondeo, mismo método que
// ya usa RepartoComidasFields con el reparto de comidas).
// `predeterminado` (A9, opcional): el foodId de una de las proteínas elegidas, que pasa a ser la «base»
// del motor (`ruleType: "base"`): rellena todos los huecos de proteína que no cubren las frecuencias de
// las demás (si de 14 comidas las frecuencias cubren 5, las otras 9 son de ella). Su frecuencia no cuenta.
// Arquetipos de una comida ligera que están marcados pero sin ningún alimento elegido dentro (sus claves,
// en el orden del catálogo). Es el bug conocido del cuestionario: la tarjeta parece «elegida» al tocarla y
// es fácil no ver que hay que escoger también el pan o el acompañamiento, así que se avanzaba y esa comida
// quedaba vacía en todos los menús sin ningún aviso. La pantalla no deja avanzar mientras haya alguno.
export function arquetiposSinAlimentos(seleccion) {
  if (!seleccion) return [];
  // Solo cuentan los grupos que tiene el arquetipo, igual que al construir los ingredientes.
  return ARQUETIPOS_COMIDA_LIGERA
    .filter((a) => seleccion[a.key] && !a.grupos.some((_, gi) => ((seleccion[a.key].grupos || {})[gi] || []).length))
    .map((a) => a.key);
}

export function construirIngredientesDesdeCuestionario({ frecuencias, pesosCarbo, pesosVerdura, pesosGrasa, comidasLigeras, predeterminado = null }) {
  const ingredients = [];

  Object.entries(frecuencias).forEach(([foodId, nivel]) => {
    const opt = CUESTIONARIO_PROTEINAS.find((o) => o.foodId === foodId);
    if (!opt) return;
    if (foodId === predeterminado) {
      ingredients.push({ id: uid(), name: opt.nombreEs, category: "proteina", ruleType: "base", active: true, foodId, gramos: opt.gramos });
      return;
    }
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
    // Primero, los arquetipos que tienen algo dentro. Uno marcado pero sin ningún alimento elegido no
    // genera nada (para no dejar un "plato" vacío sin composición real) y tampoco cuenta en el reparto:
    // antes sí contaba, y si era el último, al que le toca cerrar el 100 %, los demás se quedaban sin
    // sumar 100 (el catálogo enseñaba, por ejemplo, «50 %»). La pantalla del cuestionario ya no deja
    // avanzar así (arquetiposSinAlimentos), pero la lógica no depende de ello.
    const llenos = [];
    Object.entries(seleccion).forEach(([arqKey, v]) => {
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
      if (composicion.length) llenos.push({ arquetipo, nivel: v.nivel, composicion });
    });
    const sumaNiveles = llenos.reduce((s, e) => s + e.nivel, 0);
    if (sumaNiveles <= 0) return;
    let acumulado = 0;
    llenos.forEach(({ arquetipo, nivel, composicion }, i) => {
      const probabilidad = i === llenos.length - 1 ? 100 - acumulado : Math.round((nivel / sumaNiveles) * 100);
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
