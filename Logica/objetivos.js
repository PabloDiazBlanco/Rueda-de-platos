// ---------- Objetivos nutricionales ----------
// Módulo de lógica pura (sin JSX): a partir del perfil (edad, peso, altura, actividad,
// entrenamientos, etapa) calcula los objetivos diarios de kcal y macros, y los reparte
// entre las comidas del día. No depende de ninguna otra parte de la app.

// PAL_base: el gasto de tu día a día SIN contar el entrenamiento (trabajo, movimiento habitual,
// tiempo libre). Valores intermedios de los rangos del informe FAO/OMS/UNU (2001). El entrenamiento
// se calcula aparte (ver TIPOS_ENTRENAMIENTO) para no sobreestimar a quien tiene un día a día sedentario
// pero entrena varios días por semana.
export const PAL_BASE_NIVELES = [
  { key: "escritorio", label: "Trabajo / estudios de escritorio", desc: "Te pasas la mayor parte del día sentado", pal: 1.25 },
  { key: "de_pie", label: "De pie, moviéndote bastante", desc: "Trabajo activo, caminas o estás de pie buena parte del día", pal: 1.45 },
  { key: "exigente", label: "Físicamente exigente", desc: "Trabajo manual o muy activo la mayor parte del día", pal: 1.65 },
];

// METs (equivalentes metabólicos) de los tipos de entrenamiento más habituales, según el
// Compendium of Physical Activities. Kcal de una sesión = MET × peso(kg) × horas.
export const TIPOS_ENTRENAMIENTO = [
  { key: "pesas", label: "Pesas / fuerza", mets: 6 },
  { key: "cardio_ligero", label: "Cardio ligero (caminar rápido, bici suave)", mets: 4 },
  { key: "correr", label: "Correr a ritmo medio", mets: 9 },
  { key: "ciclismo", label: "Ciclismo moderado", mets: 8 },
  { key: "natacion", label: "Natación", mets: 8 },
  { key: "deporte_equipo", label: "Deporte de equipo / pádel / tenis", mets: 7 },
  { key: "hiit", label: "HIIT / alta intensidad", mets: 8 },
  { key: "yoga_pilates", label: "Yoga / pilates", mets: 3 },
];

// Gramos/kg de proteína y grasa según el volumen semanal de entrenamiento (suma de sesiones de
// todos los entrenamientos habituales).
// Proteína recalibrada el 18/09/2026: los tramos de 3-5 y 6-7 sesiones comparten ahora 1,6 g/kg en
// vez de escalar hasta 2,0. Tres meta-análisis independientes (Morton et al. 2018, BJSM; Tagawa et
// al. 2021, Nutrition Reviews; Nunes et al. 2022, J Cachexia Sarcopenia Muscle — los tres archivados
// en Estudios de apoyo de la aplicación/g-kg proteina/) convergen en que el punto de rendimientos
// decrecientes para maximizar la síntesis de proteína muscular está en ~1,6 g/kg/día,
// independientemente de cuánto se entrene por encima de ese umbral — por eso los dos tramos altos
// comparten valor en vez de seguir subiendo. Ver Evidencia científica, sección 4.
export const NIVELES_MACROS = [
  { min: 0, max: 0, protPerKg: 1.0, fatPerKg: 0.85 },
  { min: 1, max: 2, protPerKg: 1.3, fatPerKg: 0.9 },
  { min: 3, max: 5, protPerKg: 1.6, fatPerKg: 1.0 },
  { min: 6, max: Infinity, protPerKg: 1.6, fatPerKg: 1.25 },
];
export function nivelMacrosPorSesiones(sesionesSemana) {
  return NIVELES_MACROS.find((n) => sesionesSemana >= n.min && sesionesSemana <= n.max) || NIVELES_MACROS[0];
}

// Compatibilidad con perfiles guardados antes de separar día a día y entrenamiento: si el perfil
// todavía tiene el antiguo selector único "actividad" y no se ha vuelto a guardar con el formulario
// nuevo, se traduce a un PAL_base equivalente (sin entrenamientos registrados) manteniendo los
// mismos gramos/kg de proteína y grasa que tenía asignados, para no alterar sus objetivos ya calculados.
export const NIVELES_ACTIVIDAD_LEGACY = {
  sedentario: { palBaseKey: "escritorio", protPerKg: 1.0, fatPerKg: 0.85 },
  ligero: { palBaseKey: "escritorio", protPerKg: 1.3, fatPerKg: 0.9 },
  moderado: { palBaseKey: "de_pie", protPerKg: 1.7, fatPerKg: 1.0 },
  alto: { palBaseKey: "exigente", protPerKg: 2.0, fatPerKg: 1.25 },
};

// Etapa de objetivo (opcional): aplica un ajuste de kcal sobre el TDEE de mantenimiento y, en
// volumen/definición, sustituye la proteína g/kg de la tabla por volumen de entrenamiento por un
// valor propio de la etapa (pensado para proteger masa muscular en déficit, o dar margen amplio
// en superávit sin necesidad de forzar la proteína). La grasa y el reparto de comidas no cambian.
// Volumen recalibrado el 18/09/2026 (1,8 → 1,6 g/kg): "maximizar la ganancia de músculo" es
// exactamente la pregunta que estudian Morton/Tagawa/Nunes (ver NIVELES_MACROS más arriba) — el
// superávit calórico no cambia esa meseta, así que volumen comparte ahora el mismo valor que el
// tramo alto de mantenimiento. Definición se queda igual: la pregunta en déficit es distinta
// ("frenar la pérdida de músculo", no "maximizarla") y ahí la evidencia (Iraki 2019, Hector &
// Phillips 2018, y la actualización 2025 de Refalo/Trexler/Helms) no muestra la misma meseta.
export const OBJETIVO_ETAPAS = {
  mantenimiento: { label: "Mantenimiento", desc: "Mantener el peso actual", ajusteKcalPct: 0, protPerKg: null },
  volumen: { label: "Volumen limpio", desc: "Sube de peso progresivamente, minimizando la grasa (+12%)", ajusteKcalPct: 12, protPerKg: 1.6 },
  definicion: { label: "Definición conservadora", desc: "Baja de peso a ritmo lento y seguro (−15%)", ajusteKcalPct: -15, protPerKg: 2.2 },
};

// Límites de seguridad: no se vigila el lado "suave" (un déficit más pequeño de lo calculado, o un
// superávit más pequeño, no hacen daño), pero sí el lado de riesgo de cada etapa — que el déficit se
// pase de agresivo, o que el superávit se dispare y sea sobre todo grasa. Se aplican sobre el propio
// porcentaje (no sobre las kcal), para ser igual de estrictos sea cual sea el TDEE de cada persona.
// Con los valores actuales de OBJETIVO_ETAPAS estos límites no llegan a activarse; están pensados
// como red de seguridad para si en el futuro se añaden etapas más agresivas.
export const LIMITE_DEFICIT_PCT = 17;
export const LIMITE_SUPERAVIT_PCT = 15;

// Suelo de grasa (salud hormonal): nunca por debajo del mayor de estos dos criterios, aunque la
// etapa de definición sea muy estricta. Por debajo de esto hay riesgo real de fatiga crónica,
// problemas hormonales (testosterona/estrógenos) o pérdida del ciclo menstrual en mujeres.
export const FAT_FLOOR_PER_KG = 0.6;
export const FAT_FLOOR_PCT_KCAL = 0.20;

// Suelo de carbohidrato mínimo si hay entrenamiento habitual. Recalibrado el 19/09/2026: hasta
// entonces escalaba por NÚMERO de sesiones/semana (con un filtro de MET mínimo aparte, ver historial
// git) — eso mezclaba "cuántos días entrenas" con "cuánto entrenas de verdad": alguien haciendo yoga
// 7 días/semana (MET 3, sesiones cortas) caía en el mismo tramo que alguien levantando pesas fuerte
// 6 días — cosas muy distintas tratadas igual, y además ignoraba la duración (una caminata de 30 min
// y una sesión de pesas de 2h contaban igual, "1 sesión").
//
// Ahora escala por CARGA de entrenamiento: kcal de entrenamiento por kg de peso al día
// (kcalEntrenamiento / peso, ya calculado más abajo para el TDEE — no es una fórmula nueva, se
// reutiliza). Al dividir por peso, "MET × peso × horas ÷ peso" se cancela y queda simplemente
// "MET × horas" de cada sesión — así que cada tipo de entrenamiento ya pesa según su intensidad
// real dentro del propio cálculo, sin necesitar un filtro de MET mínimo aparte (por eso desaparece
// la antigua constante MET_INTENSO_MIN). Y al normalizar por peso, dos personas con el mismo
// entrenamiento relativo caen en el mismo tramo aunque pesen distinto.
//
// Los cortes de carga (1,5 y 3,5 kcal/kg/día) equivalen a 630 y 1.470 MET-minutos/semana — la misma
// unidad con la que la OMS traza la frontera entre actividad "moderada" y "muy activa" en sus guías
// de actividad física (500-1.000 MET-min/semana como referencia de actividad con beneficios claros
// de salud). No es una cifra de un estudio de nutrición deportiva — es el mismo tipo de decisión de
// ingeniería razonada que ya se documenta en LIMITE_DEFICIT_PCT/LIMITE_SUPERAVIT_PCT.
export const CARGA_ENTRENAMIENTO_NIVELES = [
  { max: 1.5, carbPerKg: 2.5 },
  { max: 3.5, carbPerKg: 3.5 },
  { max: Infinity, carbPerKg: 4.0 }, // recalibrado 19/09/2026, 4,5→4,0: probado contra diez
  // perfiles sintéticos (peso/sexo/patrón de entrenamiento muy distintos), 4,5 fallaba en 3 de 10
  // incluso en mantenimiento (no solo en déficit) — peso alto + carga "alta" no extrema. 4,0 sí
  // se cumplió en los diez. Ver Evidencia científica, sección 5.
];

// En definición (déficit calórico) el suelo deja de escalar por carga de entrenamiento y pasa a un
// valor plano. La evidencia general de entrenamiento (Kerksick 2017, Amawi 2024 — la que respalda
// CARGA_ENTRENAMIENTO_NIVELES) no tiene en cuenta el déficit; la evidencia específica de restricción
// calórica (Helms, Aragon & Fitschen 2014; Roberts, Helms, Trexler & Fitschen 2020; Ruiz-Castellano
// et al. 2021 — ver Estudios de apoyo de la aplicación/g-kg carbohidrato/) trata el carbohidrato en
// déficit como variable residual del presupuesto calórico, no como objetivo de rendimiento, y da un
// rango de referencia de 2-5 g/kg para la fase de pérdida de grasa — sin que ningún ensayo controlado
// haya demostrado experimentalmente un umbral exacto (ver Evidencia científica, sección 5). Se fija
// 2,6 g/kg: parte baja-media de ese rango, por debajo incluso del suelo de Amawi para intensidad
// baja, pensado para activarse con relativa facilidad sin dejar de ser alcanzable para la mayoría de
// perfiles reales en déficit.
export const CARB_MIN_DEFICIT_PER_KG = 2.6;

export function carbMinPerKgPorCarga(sesionesSemana, kcalEntrenamientoPorKgDia, objetivoKey) {
  if (sesionesSemana <= 0) return null;
  if (objetivoKey === "definicion") return CARB_MIN_DEFICIT_PER_KG;
  return (CARGA_ENTRENAMIENTO_NIVELES.find((n) => kcalEntrenamientoPorKgDia <= n.max) || CARGA_ENTRENAMIENTO_NIVELES[CARGA_ENTRENAMIENTO_NIVELES.length - 1]).carbPerKg;
}

// Calcula los objetivos diarios a partir del perfil: Mifflin-St Jeor para el BMR, PAL_base para el
// gasto del día a día, y las kcal de los entrenamientos habituales (vía METs) sumadas aparte.
// La proteína usa una tabla de gramos/kg según el volumen semanal de entrenamiento (o el valor fijo
// de la etapa de objetivo). La grasa nunca baja de su suelo de seguridad, y puede cederle kcal al
// carbohidrato si hay entrenamiento habitual y el carbohidrato restante no llega a su mínimo — en
// mantenimiento/volumen ese mínimo escala con la carga de entrenamiento, en definición es un valor
// plano y más conservador (ver carbMinPerKgPorCarga más arriba, con el porqué de la diferencia).
// Devuelve null si el perfil está incompleto, nunca calcula "a medias" con huecos.
export function calcularObjetivosPerfil(perfil) {
  if (!perfil || !perfil.anioNacimiento || !perfil.altura || !perfil.peso) return null;

  const legacy = !perfil.palBase && perfil.actividad ? NIVELES_ACTIVIDAD_LEGACY[perfil.actividad] : null;
  const nivelPal = PAL_BASE_NIVELES.find((n) => n.key === (perfil.palBase || legacy?.palBaseKey));
  if (!nivelPal) return null;

  const entrenamientos = perfil.entrenamientos || [];
  const edad = new Date().getFullYear() - perfil.anioNacimiento;
  const bmr = 10 * perfil.peso + 6.25 * perfil.altura - 5 * edad + (perfil.sexo === "hombre" ? 5 : -161);

  const kcalBase = bmr * nivelPal.pal;
  const kcalEntrenamiento = entrenamientos.reduce((sum, e) => {
    const tipo = TIPOS_ENTRENAMIENTO.find((t) => t.key === e.tipo);
    if (!tipo || !e.horas || !e.frecuenciaSemanal) return sum;
    return sum + (tipo.mets * perfil.peso * e.horas * e.frecuenciaSemanal) / 7;
  }, 0);
  const kcalMantenimiento = kcalBase + kcalEntrenamiento;

  const objetivoKey = OBJETIVO_ETAPAS[perfil.objetivo] ? perfil.objetivo : "mantenimiento";
  const etapa = OBJETIVO_ETAPAS[objetivoKey];
  const ajustePct = etapa.ajusteKcalPct < 0
    ? Math.max(etapa.ajusteKcalPct, -LIMITE_DEFICIT_PCT)
    : Math.min(etapa.ajusteKcalPct, LIMITE_SUPERAVIT_PCT);

  // Calibración por seguimiento de peso (opcional): un ajuste fino en kcal, en pasos de 100-200 kcal
  // (protocolo de Helms et al. 2014), que la persona aprueba explícitamente al cerrar un ciclo de
  // pesadas — nunca cambia de etapa, solo afina la intensidad dentro de la misma. Se vuelve a pasar
  // por el mismo techo de seguridad que el ajuste base, para que la suma de ambos tampoco lo traspase.
  const calibracionKcal = perfil.calibracionKcal || 0;
  const kcalConEtapa = kcalMantenimiento * (1 + ajustePct / 100);
  const pctCombinado = ((kcalConEtapa + calibracionKcal) / kcalMantenimiento - 1) * 100;
  const pctCombinadoClamped = pctCombinado < 0
    ? Math.max(pctCombinado, -LIMITE_DEFICIT_PCT)
    : Math.min(pctCombinado, LIMITE_SUPERAVIT_PCT);
  const kcalTotal = kcalMantenimiento * (1 + pctCombinadoClamped / 100);

  const sesionesSemana = entrenamientos.reduce((sum, e) => sum + (Number(e.frecuenciaSemanal) || 0), 0);
  // Carga de entrenamiento normalizada por peso, para el suelo de carbohidrato (ver
  // carbMinPerKgPorCarga más arriba) — reutiliza kcalEntrenamiento, no es un cálculo nuevo.
  const kcalEntrenamientoPorKgDia = kcalEntrenamiento / perfil.peso;

  const nivelMacros = legacy || nivelMacrosPorSesiones(sesionesSemana);
  const protPerKg = etapa.protPerKg ?? nivelMacros.protPerKg;
  const protG = protPerKg * perfil.peso;

  const fatTargetG = nivelMacros.fatPerKg * perfil.peso;
  const fatFloorG = Math.max(FAT_FLOOR_PER_KG * perfil.peso, (FAT_FLOOR_PCT_KCAL * kcalTotal) / 9);
  // El objetivo de grasa nunca puede nacer por debajo de su propio suelo — antes esto solo se
  // corregía como efecto secundario de cederle kcal al carbohidrato (más abajo), así que si no hacía
  // falta ese ajuste (p. ej. sin entrenamiento) el suelo podía traspasarse en silencio.
  const fatObjetivoG = Math.max(fatTargetG, fatFloorG);

  const carbMinPerKg = carbMinPerKgPorCarga(sesionesSemana, kcalEntrenamientoPorKgDia, objetivoKey);
  const carbMinG = carbMinPerKg !== null ? carbMinPerKg * perfil.peso : null;

  // Reparto "normal": la grasa se queda en su valor de tabla (o su suelo, si el de tabla ya estaba
  // por debajo) y el carbohidrato es lo que sobra.
  const carbGConFatObjetivo = Math.max(0, kcalTotal - protG * 4 - fatObjetivoG * 9) / 4;

  let fatG = fatObjetivoG;
  let carbG = carbGConFatObjetivo;
  let carbMinNotMet = false;

  // Si hay un mínimo de carbohidrato (entrenamiento habitual) y el reparto normal no lo alcanza,
  // se le ceden a la grasa las kcal que hagan falta, pero solo hasta su propio suelo de seguridad.
  if (carbMinG !== null && carbGConFatObjetivo < carbMinG) {
    const kcalFaltantes = (carbMinG - carbGConFatObjetivo) * 4;
    const margenFatG = Math.max(0, fatObjetivoG - fatFloorG);
    const reduccionFatG = Math.min(margenFatG, kcalFaltantes / 9);
    fatG = fatObjetivoG - reduccionFatG;
    carbG = carbGConFatObjetivo + (reduccionFatG * 9) / 4;
    carbMinNotMet = carbG + 0.5 < carbMinG;
  }

  return {
    kcal: Math.round(kcalTotal),
    prot: Math.round(protG),
    fat: Math.round(fatG),
    carb: Math.round(carbG),
    bmr: Math.round(bmr),
    kcalBase: Math.round(kcalBase),
    kcalEntrenamiento: Math.round(kcalEntrenamiento),
    kcalMantenimiento: Math.round(kcalMantenimiento),
    objetivo: objetivoKey,
    ajustePct: Math.round(pctCombinadoClamped * 10) / 10,
    calibracionKcal,
    fatFloor: Math.round(fatFloorG),
    carbMin: carbMinG !== null ? Math.round(carbMinG) : null,
    carbMinNotMet,
  };
}

// Reparto de comidas por defecto (clásico de 4): el que ha usado siempre la app, y al que
// migran los perfiles guardados que todavía no tienen un reparto propio (ver migrateData en
// app.jsx). Desde que el reparto pasó a vivir en perfil.repartoComidas, esta constante ya no se
// usa para calcular nada — solo como valor de partida al migrar o al crear un perfil nuevo.
export const REPARTO_COMIDAS = { Desayuno: 0.20, Comida: 0.35, Merienda: 0.15, Cena: 0.30 };

// Presets fijos de reparto de comidas (Fase 4, reparto de comidas configurable), para elegir en
// Perfil. Comida y Cena están presentes en todos — nunca se pueden quitar. Cada preset define solo
// de qué comidas se compone; los pesos (%) dentro de él los pone el usuario libremente, siempre que
// sumen 100% (salvo el clásico, que mantiene el reparto de siempre como punto de partida — el resto
// no tiene un peso "recomendado", por diseño). Los textos son educativos, con la evidencia que los
// respalda resumida en la memoria del proyecto (estudios en
// "Estudios de apoyo de la aplicación/Split de comidas/").
export const PRESETS_COMIDAS = [
  {
    id: "clasico-4",
    label: "Clásico · 4 comidas",
    recomendado: true,
    meals: ["Desayuno", "Comida", "Merienda", "Cena"],
    pesosPorDefecto: { Desayuno: 20, Comida: 35, Merienda: 15, Cena: 30 },
    texto: "El reparto con más respaldo en la ciencia de la crononutrición: concentra la energía en la primera mitad del día.",
  },
  {
    id: "sin-merienda-3",
    label: "3 comidas · sin merienda",
    meals: ["Desayuno", "Comida", "Cena"],
    texto: "Desayuno, comida y cena, sin nada entre horas — el patrón de toda la vida, con una comida menos que el clásico pero manteniendo una estructura clara a lo largo del día.",
  },
  {
    id: "sin-desayuno-3",
    label: "3 comidas · sin desayuno",
    meals: ["Comida", "Merienda", "Cena"],
    texto: "Saltarse el desayuno de forma habitual se ha relacionado en algunos estudios con más grasa acumulada en el hígado — no es motivo de alarma, pero conviene saberlo si lo haces todos los días.",
  },
  {
    id: "intermitente-2",
    label: "2 comidas · comida y cena",
    meals: ["Comida", "Cena"],
    texto: "Ayuno intermitente: menos comidas, pero más grandes. Cuantas menos comidas haces, más fácil es acabar picoteando entre horas si no te sacian bien — vigila bien las raciones. Además, la evidencia respalda más la versión con la comida desplazada temprano en el día que tarde.",
  },
  {
    id: "cinco-5",
    label: "5 comidas · con media mañana",
    meals: ["Desayuno", "Media mañana", "Comida", "Merienda", "Cena"],
    texto: "Comidas más pequeñas y repartidas, para quien prefiere no pasar muchas horas seguidas sin comer. No es de los patrones con más evidencia detrás, pero es una forma habitual y válida de organizar el día.",
  },
];

// Aviso fijo (no bloqueante) bajo el peso de la Cena en la pantalla de reparto de comidas, igual
// en los cuatro presets — ver Pimenta 2015, Kim/Kim/Lee/Park 2025 y Ren et al. 2025 en la carpeta
// de estudios de apoyo mencionada arriba.
export const AVISO_CENA_REPARTO = "Cenas copiosas o muy tardías se asocian a peor control de azúcar, peor descanso y más riesgo de grasa en el hígado. Si puedes, que la cena no sea ni la más pesada ni la más tardía del día.";

// Reparto uniforme (sin recomendación implícita) entre las comidas de un preset, como punto de
// partida al elegirlo por primera vez — el usuario lo ajusta después a su gusto.
export function repartoUniforme(meals) {
  const base = Math.floor(100 / meals.length);
  const resto = 100 - base * meals.length;
  const pesos = {};
  meals.forEach((m, i) => { pesos[m] = base + (i < resto ? 1 : 0); });
  return pesos;
}

// Trocea un objetivo diario completo (kcal/prot/fat/carb) en el sub-objetivo de una comida
// concreta, aplicando su porcentaje dentro del reparto de comidas de ese perfil (2 a 5 comidas,
// pesos libres siempre que sumen 100%). Devuelve null si no hay objetivo diario del que partir,
// o si esa comida no existe en el reparto.
export function objetivosPorComida(objetivosDiarios, mealType, repartoComidas) {
  if (!objetivosDiarios) return null;
  const pct = repartoComidas[mealType];
  if (pct === undefined) return null;
  return {
    kcal: Math.round(objetivosDiarios.kcal * pct),
    prot: Math.round(objetivosDiarios.prot * pct),
    fat: Math.round(objetivosDiarios.fat * pct),
    carb: Math.round(objetivosDiarios.carb * pct),
  };
}
