import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { Plus, Trash2, Pencil, X, Check, Utensils, Wheat, Salad, Package, Sparkles, AlertCircle, CalendarDays, Shuffle, Coffee, Cookie } from "lucide-react";

// ---------- Datos iniciales (todo lo acordado hasta ahora) ----------

const uid = () => Math.random().toString(36).slice(2, 10);

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
    ingredients: [
      // Proteínas — frecuencia fija individual
      { id: salmonId, name: "Salmón", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "semana", active: true },
      { id: merluzaId, name: "Merluza", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "semana", active: true },
      { id: atunId, name: "Atún", category: "proteina", ruleType: "frecuencia", freqCantidad: 2, freqPeriodo: "semana", active: true },
      { id: sardinasId, name: "Sardinas", category: "proteina", ruleType: "frecuencia", freqCantidad: 1, freqPeriodo: "ciclo", active: true },
      { id: polloId, name: "Pollo (carne)", category: "proteina", ruleType: "base", active: true },

      // Miembros del bloque carne roja
      { id: carnePicadaCerdoId, name: "Carne picada de cerdo/vacuno", category: "proteina", ruleType: "bloque_miembro", blockId: bloqueCarneRojaId, peso: 1, active: true },
      { id: hamburguesaTerneraId, name: "Hamburguesa de ternera/cerdo", category: "proteina", ruleType: "bloque_miembro", blockId: bloqueCarneRojaId, peso: 1, active: true },

      // Miembros del bloque pollo picado / hamburguesa pollo (peso = reparto dentro del bloque)
      { id: carnePicadaPolloId, name: "Carne picada de pollo", category: "proteina", ruleType: "bloque_miembro", blockId: bloquePolloPicadoId, peso: 3, active: true },
      { id: hamburguesaPolloId, name: "Hamburguesa de pollo", category: "proteina", ruleType: "bloque_miembro", blockId: bloquePolloPicadoId, peso: 1, active: true },

      // Carbos — probabilidad
      { id: pastaId, name: "Pasta", category: "carbo", ruleType: "probabilidad", probabilidad: 35, active: true },
      { id: arrozId, name: "Arroz", category: "carbo", ruleType: "probabilidad", probabilidad: 35, active: true },
      { id: gnocchiId, name: "Gnocchi", category: "carbo", ruleType: "probabilidad", probabilidad: 20, active: true },
      { id: patatasId, name: "Patatas", category: "carbo", ruleType: "probabilidad", probabilidad: 10, active: true },

      // Verduras / acompañamientos — probabilidad
      { id: ensCompletaId, name: "Ensalada completa", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true },
      { id: ensTomateId, name: "Ensalada de tomate", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true },
      { id: pimientoId, name: "Pimiento y cebolla sofritos", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true },
      { id: pureId, name: "Purés variados", category: "verdura", ruleType: "probabilidad", probabilidad: 25, active: true },

      // Especial — garbanzos (ahora 2x/semana, garantizado una vez por semana como mínimo, ver motor)
      { id: garbanzosId, name: "Garbanzos", category: "especial", ruleType: "frecuencia", freqCantidad: 2, freqPeriodo: "semana", active: true },

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
  const data = { ...rawData, blocks: (rawData.blocks || []).map((b) => ({ ...b })) };

  const polloBlock = data.blocks.find((b) => b.name === "Pollo picado / hamburguesa de pollo");
  if (polloBlock && !polloBlock.weeklyPattern) {
    polloBlock.weeklyPattern = [{ counts: [2, 0] }, { counts: [1, 1] }];
    polloBlock.distribucion = "Cada ciclo, una semana (al azar) lleva 2x carne picada de pollo, y la otra semana lleva 1x carne picada + 1x hamburguesa de pollo.";
    changed = true;
  }

  return { data, changed };
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

function generateMenu(data, avoid = {}) {
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
  const garbanzos = data.ingredients.find((i) => i.category === "especial" && i.active !== false);
  const mainMealIdx = (idx) => (slots[idx].mealType === "Comida" || slots[idx].mealType === "Cena") && !slots[idx].closedDish;
  if (garbanzos) {
    if (garbanzos.freqPeriodo === "semana") {
      for (let week = 1; week <= 2; week++) {
        const candidates = shuffle(slots.map((_, idx) => idx).filter((idx) => slots[idx].week === week && mainMealIdx(idx)));
        candidates.slice(0, garbanzos.freqCantidad).forEach((idx) => { slots[idx].garbanzos = true; });
      }
    } else {
      const candidates = shuffle(slots.map((_, idx) => idx).filter((idx) => mainMealIdx(idx)));
      candidates.slice(0, garbanzos.freqCantidad).forEach((idx) => { slots[idx].garbanzos = true; });
    }
  }

  // 6. Carbo y verdura por sorteo en cada Comida/Cena no cerrada
  const carbos = data.ingredients.filter((i) => i.category === "carbo" && i.active !== false);
  const verduras = data.ingredients.filter((i) => i.category === "verdura" && i.active !== false);
  slots
    .filter((s) => s.mealType === "Comida" || s.mealType === "Cena")
    .forEach((s) => {
      if (s.closedDish) return;
      if (carbos.length) s.carbo = weightedPick(carbos, "probabilidad").name;
      if (verduras.length) s.verdura = weightedPick(verduras, "probabilidad").name;
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
          <MenuView menu={menu} onGenerate={handleGenerateMenu} menuWeek={menuWeek} setMenuWeek={setMenuWeek} history={history} data={data} />
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
                  onEdit={() => setEditing({ mode: "edit", category: "proteina", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                />
              ))}
              {blocksInCategory("proteina").map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
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
                  onEdit={() => setEditing({ mode: "edit", category: "especial", ingredient: ing })}
                  onDelete={() => setConfirmDelete(ing)}
                  extraNote="Modificador: mezcla 50/50 con el carbo del día"
                />
              ))}
              <AddCard label="Añadir especial" onClick={() => setEditing({ mode: "new", category: "especial" })} />
            </CardGrid>
          </>
        )}
      </main>

      {editing && (
        <EditModal
          state={editing}
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

function TabBar({ tab, setTab }) {
  const tabs = ["menu", "proteina", "carbo", "verdura", "desayuno", "merienda", "cerrado", "especial"];
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
        const meta = t === "menu" ? MENU_TAB_META : CATEGORY_META[t];
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

function MenuView({ menu, onGenerate, menuWeek, setMenuWeek, history, data }) {
  const [selectedMeal, setSelectedMeal] = useState(null);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <SectionIntro text="Genera un ciclo de 2 semanas respetando todas las frecuencias, bloques y probabilidades definidos. Cada vez que pulses el botón, se sortea un menú nuevo." />
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
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeal({ ...m, day })}
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <HistoryPanel history={history} />

      {selectedMeal && (
        <MealDetailModal meal={selectedMeal} data={data} onClose={() => setSelectedMeal(null)} />
      )}
    </>
  );
}

// Busca un ingrediente por nombre en cualquier categoría, para poder mostrar su cantidad
// en el detalle de una comida (el menú generado solo guarda nombres, no ids).
function findIngredientByName(data, name) {
  if (!name || !data) return null;
  return data.ingredients.find((i) => i.name === name) || null;
}

function MealDetailModal({ meal, data, onClose }) {
  const rows = [];
  if (meal.closedDish) {
    const ing = findIngredientByName(data, meal.closedDish);
    rows.push({ label: meal.closedDish, cantidad: ing?.cantidad });
  } else if (meal.item) {
    const ing = findIngredientByName(data, meal.item);
    rows.push({ label: meal.item, cantidad: ing?.cantidad });
  } else {
    const proteinIng = findIngredientByName(data, meal.protein);
    rows.push({ label: meal.protein, cantidad: proteinIng?.cantidad });
    const carboIng = findIngredientByName(data, meal.carbo);
    rows.push({ label: meal.garbanzos ? `${meal.carbo} (mitad)` : meal.carbo, cantidad: carboIng?.cantidad });
    if (meal.garbanzos) {
      const garbanzosIng = data.ingredients.find((i) => i.category === "especial");
      rows.push({ label: garbanzosIng ? `${garbanzosIng.name} (mitad)` : "Garbanzos (mitad)", cantidad: garbanzosIng?.cantidad });
    }
    const verduraIng = findIngredientByName(data, meal.verdura);
    rows.push({ label: meal.verdura, cantidad: verduraIng?.cantidad });
  }

  return (
    <ModalShell onClose={onClose} title={`${meal.day} · ${meal.mealType}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 13.5,
              paddingBottom: 8,
              borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span style={{ color: "var(--ink)" }}>{r.label}</span>
            <span style={{ color: r.cantidad ? "var(--green-dark)" : "var(--ink-soft)", fontWeight: r.cantidad ? 700 : 400 }}>
              {r.cantidad || "sin cantidad definida"}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 14, marginBottom: 0 }}>
        Las cantidades se editan en la ficha de cada ingrediente (pestañas de arriba).
      </p>
    </ModalShell>
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

function IngredientCard({ ingredient, onEdit, onDelete, extraNote }) {
  const meta = CATEGORY_META[ingredient.category];
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
      {extraNote && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
          {extraNote}
        </div>
      )}
    </div>
  );
}

function BlockCard({ block, members, onUpdateBlock, onEditMember, onDeleteMember, onAddMember, onEditFrequency, showProbabilities }) {
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
            <span>{m.name}{m.cantidad ? ` · ${m.cantidad}` : ""}</span>
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

function EditModal({ state, onClose, onSave }) {
  const { mode, category, blockId } = state;
  const existing = state.ingredient;
  const [name, setName] = useState(existing ? existing.name : "");
  const [ruleType, setRuleType] = useState(existing ? existing.ruleType : (blockId ? "bloque_miembro" : ["carbo", "verdura", "desayuno", "merienda"].includes(category) ? "probabilidad" : "frecuencia"));
  const [freqCantidad, setFreqCantidad] = useState(existing?.freqCantidad ?? 1);
  const [freqPeriodo, setFreqPeriodo] = useState(existing?.freqPeriodo ?? "semana");
  const [probabilidad, setProbabilidad] = useState(existing?.probabilidad ?? 25);
  const [cantidad, setCantidad] = useState(existing?.cantidad ?? "");

  const isBlockMember = category === "cerrado" || !!blockId;

  function handleSave() {
    if (!name.trim()) return;
    const ing = {
      id: existing ? existing.id : uid(),
      name: name.trim(),
      category,
      ruleType: isBlockMember ? "bloque_miembro" : ruleType,
      active: true,
      cantidad: cantidad.trim() || undefined,
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

      <Field label="Cantidad (opcional)">
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={inputStyle}
          placeholder='Ej: 150g, 2 filetes, 1 taza...'
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
