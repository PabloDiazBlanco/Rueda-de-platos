// ---------- Motor de generación del menú (paso 3) ----------
// Módulo de lógica pura (sin JSX): a partir de los datos (platos, bloques, reglas, objetivos)
// genera los 28 huecos del ciclo de dos semanas y ajusta las raciones a los objetivos nutricionales.
import { uid, DAYS } from "comun";
import { getFood, composedMacros } from "macros";
import { mealTotals } from "comida-calculo";
import { objetivosPorComida } from "objetivos";
import { weightedPick, allocateCounts, shuffle, clamp, ruleModifier, pickWithRules, sampleIndicesWithRules } from "seleccion";

export function generateMenu(data, avoid = {}) {
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

  // 8. Ajuste de raciones a los objetivos nutricionales (solo si hay un perfil con objetivos calculados).
  // Para cada Comida/Cena normal (proteína + carbo): se calcula cuánto carbohidrato y proteína ya aportan
  // "de fondo" los garbanzos (que no se tocan, se quedan en su ración habitual), y se descuenta esa parte
  // antes de resolver la ración de carbo y de proteína — así no se cuenta dos veces lo que ya aporta el
  // resto del plato. La verdura queda totalmente fuera de este cálculo (ni resta, ni suma, ni cuenta en
  // los totales): se sigue sorteando y mostrando en el menú, pero sin ningún número asociado.
  // La grasa queda como resultado de todo lo anterior, y si se queda corta respecto al objetivo, se añade
  // una grasa de tu pestaña "Grasas" (o aceite de oliva si aún no has añadido ninguna) como ajuste fino visible.
  if (data.objetivos) {
    const aove = data.foods.find((f) => f.id === "f_aove");
    // Opciones de la pestaña "Grasas" (si ya has añadido alguna). Si está vacía, se sigue usando
    // aceite de oliva directamente, como hasta ahora, para que la app no deje de funcionar mientras la rellenas.
    // A cada una se le calcula su "eficiencia": cuántas kcal cuesta cada gramo de grasa que aporta.
    // El aceite (grasa casi pura) cuesta 9 kcal/g de grasa, el mínimo posible — cualquier alimento que
    // además lleve carbohidrato o proteína de por medio cuesta más. Esa eficiencia se usa como peso extra
    // al sortear, para que el motor prefiera de forma natural las opciones "limpias" sin que tengas que
    // curar tú mismo el catálogo (una hamburguesa con muchas verduras, por ejemplo, seguiría pudiendo
    // salir, solo que con menos frecuencia que el aceite).
    const grasas = data.ingredients
      .filter((i) => i.category === "grasa" && i.active !== false && i.foodId)
      .map((g) => {
        const food = getFood(data, g.foodId);
        const kcalPorGramoDeGrasa = food && food.fat > 0 ? food.kcal / food.fat : Infinity;
        const eficiencia = Number.isFinite(kcalPorGramoDeGrasa) ? Math.min(1, 9 / kcalPorGramoDeGrasa) : 0;
        return { ...g, probabilidad: (g.probabilidad || 0) * eficiencia };
      });
    // Tope práctico: por muy bien que cuadre en el papel, nadie quiere 600g de patatas en un plato.
    // Limita la ración final para que ningún componente pase de este peso, sea cual sea su ración base.
    const MAX_GRAMOS_COMPONENTE = 500;
    // Tope de seguridad para el "ajuste fino" de grasa: por bien que rellene el hueco de grasa,
    // no puede aportar más de esto en calorías — así, aunque la única opción disponible sea poco
    // eficiente (mucho chocolate, por ejemplo), el motor prefiere quedarse corto de grasa antes que
    // disparar las calorías de la comida. Es un tope duro, no depende de qué alimento se elija.
    const MAX_KCAL_GRASA_EXTRA = 150;

    // Reparte una grasa (o aceite de respaldo) para completar lo que le falte de grasa a una comida ya resuelta.
    function completarGrasa(s, objetivoComida, decidedIds = []) {
      const actual = mealTotals(data, s);
      const faltaGrasa = objetivoComida.fat - actual.fat;
      if (faltaGrasa <= 1) return;
      if (grasas.length) {
        const elegida = pickWithRules(grasas, "probabilidad", rules, decidedIds);
        const elegidaFood = getFood(data, elegida.foodId);
        if (elegidaFood && elegidaFood.fat > 0 && elegida.gramos) {
          let gramosNecesarios = Math.min(300, Math.round((faltaGrasa / elegidaFood.fat) * 100));
          if (elegidaFood.kcal > 0) {
            const maxGramosPorKcal = (MAX_KCAL_GRASA_EXTRA / elegidaFood.kcal) * 100;
            gramosNecesarios = Math.min(gramosNecesarios, Math.round(maxGramosPorKcal));
          }
          if (gramosNecesarios > 0) {
            s.grasaExtra = { nombre: elegida.name, foodId: elegida.foodId, gramos: gramosNecesarios };
          }
        }
      } else if (aove) {
        const gramosAceite = Math.min(Math.round(faltaGrasa), Math.round((MAX_KCAL_GRASA_EXTRA / aove.kcal) * 100));
        if (gramosAceite > 0) s.aceiteExtra = gramosAceite;
      }
    }

    slots
      .filter((s) => !s.closedDish && !s.item && (s.mealType === "Comida" || s.mealType === "Cena") && s.protein && s.carbo)
      .forEach((s) => {
        const objetivoComida = objetivosPorComida(data.objetivos, s.mealType);
        if (!objetivoComida) return;

        const proteinIng = data.ingredients.find((i) => i.name === s.protein);
        const carboIng = data.ingredients.find((i) => i.name === s.carbo);
        const garbanzosIng = s.garbanzos ? data.ingredients.find((i) => i.category === "especial") : null;
        const proteinFood = proteinIng ? getFood(data, proteinIng.foodId) : null;
        const carboFood = carboIng ? getFood(data, carboIng.foodId) : null;
        const garbanzosFood = garbanzosIng ? getFood(data, garbanzosIng.foodId) : null;
        const baseFactorCarbo = s.garbanzos ? 0.5 : 1;
        const nuevasRaciones = {};

        // Carbohidratos: se descuenta lo que ya aportan los garbanzos a su ración habitual (1).
        // La verdura NO se descuenta: queda fuera del cálculo por completo.
        const carbGarbanzos = garbanzosFood ? (garbanzosFood.carb * (garbanzosIng.gramos || 0) * 0.5) / 100 : 0;
        const carbObjetivoParaCarbo = Math.max(0, objetivoComida.carb - carbGarbanzos);
        if (carboFood && carboIng.gramos && carboFood.carb > 0) {
          const carbPorRacion = (carboFood.carb * carboIng.gramos * baseFactorCarbo) / 100;
          const maxRacionPeso = MAX_GRAMOS_COMPONENTE / carboIng.gramos;
          nuevasRaciones.carbo = clamp(Math.round((carbObjetivoParaCarbo / carbPorRacion) * 10) / 10, 0.3, Math.min(4, maxRacionPeso));
        }

        // Proteína: se descuenta lo que ya aportan garbanzos y el carbo (con su ración ya resuelta arriba).
        const racionCarboResuelta = nuevasRaciones.carbo !== undefined ? nuevasRaciones.carbo : 1;
        const protGarbanzos = garbanzosFood ? (garbanzosFood.prot * (garbanzosIng.gramos || 0) * 0.5) / 100 : 0;
        const protCarbo = carboFood ? (carboFood.prot * (carboIng.gramos || 0) * baseFactorCarbo * racionCarboResuelta) / 100 : 0;
        const protObjetivoParaProteina = Math.max(0, objetivoComida.prot - protGarbanzos - protCarbo);
        if (proteinFood && proteinIng.gramos && proteinFood.prot > 0) {
          const protPorRacion = (proteinFood.prot * proteinIng.gramos) / 100;
          const maxRacionPeso = MAX_GRAMOS_COMPONENTE / proteinIng.gramos;
          nuevasRaciones.protein = clamp(Math.round((protObjetivoParaProteina / protPorRacion) * 10) / 10, 0.3, Math.min(4, maxRacionPeso));
        }

        if (Object.keys(nuevasRaciones).length) {
          s.raciones = { ...(s.raciones || {}), ...nuevasRaciones };
        }

        const decididosGrasa = [idByName[s.protein], idByName[s.carbo], s.garbanzos && garbanzosIng ? garbanzosIng.id : null].filter(Boolean);
        completarGrasa(s, objetivoComida, decididosGrasa);
      });

    // Platos cerrados: se escala la receta entera (todos sus ingredientes juntos, en la misma proporción
    // en la que tú la definiste) para acercarse solo a las kcal objetivo de esa comida — no se persigue
    // cuadrar los 4 macros a la vez, porque eso rompería la proporción de tu receta. La grasa se completa
    // después igual que en el resto de comidas.
    slots
      .filter((s) => s.closedDish && (s.mealType === "Comida" || s.mealType === "Cena"))
      .forEach((s) => {
        const objetivoComida = objetivosPorComida(data.objetivos, s.mealType);
        if (!objetivoComida) return;
        const platoIng = data.ingredients.find((i) => i.name === s.closedDish);
        if (!platoIng) return;
        const base = composedMacros(data, platoIng, 1);
        if (!base || !base.kcal) return;

        const racion = clamp(Math.round((objetivoComida.kcal / base.kcal) * 10) / 10, 0.3, 4);
        s.raciones = { ...(s.raciones || {}), closedDish: racion };

        completarGrasa(s, objetivoComida);
      });
  }

  return slots;
}

// A partir del último ciclo generado, extrae qué se eligió en los grupos de un solo hueco,
// para poder evitar repetirlo exactamente en la siguiente generación.
export function lastPicksFromHistory(history, data) {
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
