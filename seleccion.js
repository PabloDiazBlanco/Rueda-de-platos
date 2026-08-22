// ---------- Selección aleatoria y reglas de combinación ----------
// Módulo de lógica pura (sin JSX): utilidades de sorteo ponderado que usa el motor de
// generación de menú, más el sistema de reglas de afinidad entre alimentos concretos.
// No depende de ninguna otra parte de la app.

export function weightedPick(items, weightKey) {
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
export function allocateCounts(members, weightKey, totalSlots) {
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

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Limita un número a un rango, para que el ajuste de raciones nunca proponga algo absurdo
// (una ración de 0,01 o de 20, por ejemplo) aunque el objetivo y el alimento no encajen bien.
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// ---------- Reglas de combinación (afinidad entre alimentos concretos) ----------
// Cada regla: { id, itemIds: [id1, id2] o [id1, id2, id3], level: "nula"|"baja"|"alta"|"maxima" }
// Una regla solo se evalúa cuando TODOS sus elementos salvo el que se está eligiendo ya
// están decididos en esa comida — así una regla de 3 (p.ej. Salmón+Arroz+Ensalada) solo
// entra en juego al elegir la verdura, cuando proteína y carbo ya se conocen.
export const RULE_LEVELS = {
  nula: { label: "Nula (nunca)", mult: 0 },
  baja: { label: "Baja", mult: 0.25 },
  alta: { label: "Alta", mult: 4 },
  maxima: { label: "Máxima (forzada)", mult: 1, forced: true },
};

// Para un candidato concreto, mira qué reglas ya evaluables lo afectan y devuelve
// el multiplicador combinado de peso, y si alguna es "máxima" (fuerza ese candidato si es posible).
export function ruleModifier(rules, decidedIds, candidateId) {
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
export function pickWithRules(candidates, weightKey, rules, decidedIds) {
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
export function sampleIndicesWithRules(evaluated, n) {
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
