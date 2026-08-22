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
// todos los entrenamientos habituales). Mismos valores que el sistema de niveles anterior.
export const NIVELES_MACROS = [
  { min: 0, max: 0, protPerKg: 1.0, fatPerKg: 0.85 },
  { min: 1, max: 2, protPerKg: 1.3, fatPerKg: 0.9 },
  { min: 3, max: 5, protPerKg: 1.7, fatPerKg: 1.0 },
  { min: 6, max: Infinity, protPerKg: 2.0, fatPerKg: 1.25 },
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
export const OBJETIVO_ETAPAS = {
  mantenimiento: { label: "Mantenimiento", desc: "Mantener el peso actual", ajusteKcalPct: 0, protPerKg: null },
  volumen: { label: "Volumen limpio", desc: "Sube de peso progresivamente, minimizando la grasa (+12%)", ajusteKcalPct: 12, protPerKg: 1.8 },
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

// Entrenamientos considerados "intensos" a efectos de proteger el glucógeno: MET ≥ 6 (cubre pesas,
// HIIT, correr, ciclismo, natación y deporte de equipo; deja fuera cardio ligero y yoga/pilates).
export const MET_INTENSO_MIN = 6;

// Gramos/kg de carbohidrato mínimo si hay entrenamiento intenso habitual, escalado por su volumen
// semanal igual que la tabla de proteína/grasa. Sin entrenamiento intenso no se aplica ningún suelo:
// el carbohidrato sigue siendo "lo que sobra" tras proteína y grasa, como hasta ahora.
export const CARB_MIN_NIVELES = [
  { min: 1, max: 2, carbPerKg: 1.5 },
  { min: 3, max: 5, carbPerKg: 1.75 },
  { min: 6, max: Infinity, carbPerKg: 2.0 },
];
export function carbMinPerKgPorSesiones(sesionesIntensasSemana) {
  if (sesionesIntensasSemana <= 0) return null;
  return (CARB_MIN_NIVELES.find((n) => sesionesIntensasSemana >= n.min && sesionesIntensasSemana <= n.max) || CARB_MIN_NIVELES[CARB_MIN_NIVELES.length - 1]).carbPerKg;
}

// Calcula los objetivos diarios a partir del perfil: Mifflin-St Jeor para el BMR, PAL_base para el
// gasto del día a día, y las kcal de los entrenamientos habituales (vía METs) sumadas aparte.
// La proteína usa una tabla de gramos/kg según el volumen semanal de entrenamiento (o el valor fijo
// de la etapa de objetivo). La grasa parte de esa misma tabla, pero puede cederle kcal al
// carbohidrato —sin bajar nunca de su suelo de seguridad— si hay entrenamiento intenso y el
// carbohidrato restante no llega a su mínimo de glucógeno. Devuelve null si el perfil está
// incompleto, nunca calcula "a medias" con huecos.
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
  const sesionesIntensasSemana = entrenamientos.reduce((sum, e) => {
    const tipo = TIPOS_ENTRENAMIENTO.find((t) => t.key === e.tipo);
    if (!tipo || tipo.mets < MET_INTENSO_MIN || !e.frecuenciaSemanal) return sum;
    return sum + (Number(e.frecuenciaSemanal) || 0);
  }, 0);

  const nivelMacros = legacy || nivelMacrosPorSesiones(sesionesSemana);
  const protPerKg = etapa.protPerKg ?? nivelMacros.protPerKg;
  const protG = protPerKg * perfil.peso;

  const fatTargetG = nivelMacros.fatPerKg * perfil.peso;
  const fatFloorG = Math.max(FAT_FLOOR_PER_KG * perfil.peso, (FAT_FLOOR_PCT_KCAL * kcalTotal) / 9);

  const carbMinPerKg = carbMinPerKgPorSesiones(sesionesIntensasSemana);
  const carbMinG = carbMinPerKg !== null ? carbMinPerKg * perfil.peso : null;

  // Reparto "normal": la grasa se queda en su valor de tabla y el carbohidrato es lo que sobra.
  const carbGConFatObjetivo = Math.max(0, kcalTotal - protG * 4 - fatTargetG * 9) / 4;

  let fatG = fatTargetG;
  let carbG = carbGConFatObjetivo;
  let carbMinNotMet = false;

  // Si hay un mínimo de carbohidrato (entrenamiento intenso) y el reparto normal no lo alcanza,
  // se le ceden a la grasa las kcal que hagan falta, pero solo hasta su propio suelo de seguridad.
  if (carbMinG !== null && carbGConFatObjetivo < carbMinG) {
    const kcalFaltantes = (carbMinG - carbGConFatObjetivo) * 4;
    const margenFatG = Math.max(0, fatTargetG - fatFloorG);
    const reduccionFatG = Math.min(margenFatG, kcalFaltantes / 9);
    fatG = fatTargetG - reduccionFatG;
    carbG = carbGConFatObjetivo + (reduccionFatG * 9) / 4;
    carbMinNotMet = carbG + 0.5 < carbMinG;
  }

  return {
    kcal: Math.round(kcalTotal),
    prot: Math.round(protG),
    fat: Math.round(fatG),
    carb: Math.round(carbG),
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

// Cómo se reparte el objetivo diario entre las 4 comidas. Un único origen de datos:
// si el día tiene otro tipo de comida en el futuro, solo hay que tocar aquí.
export const REPARTO_COMIDAS = { Desayuno: 0.20, Comida: 0.35, Merienda: 0.15, Cena: 0.30 };

// Trocea un objetivo diario completo (kcal/prot/fat/carb) en el sub-objetivo de una comida
// concreta, aplicando su porcentaje. Devuelve null si no hay objetivo diario del que partir.
export function objetivosPorComida(objetivosDiarios, mealType) {
  if (!objetivosDiarios) return null;
  const pct = REPARTO_COMIDAS[mealType];
  if (pct === undefined) return null;
  return {
    kcal: Math.round(objetivosDiarios.kcal * pct),
    prot: Math.round(objetivosDiarios.prot * pct),
    fat: Math.round(objetivosDiarios.fat * pct),
    carb: Math.round(objetivosDiarios.carb * pct),
  };
}
