// ---------- ui/estado/menu.js ----------
// Hook de un ciclo de menú: el menú actual, su semana visible, su historial (para "Deshacer" y para
// no repetir lo último), generar, deshacer, ajustar una comida y marcar la lista de la compra.
// Menú completo y Menú simple usan el mismo hook con su propia configuración (claves de
// almacenamiento y campo de la lista de la compra), así que generar o deshacer en uno nunca toca
// al otro (ver CLAUDE.md, "Menú completo y Menú simple"). Antes eran dos copias casi idénticas del
// mismo código dentro del componente principal de app.jsx.
import { useState, useRef } from "react";
import { uid } from "comun";
import { generateMenu, lastPicksFromHistory } from "menu-generador";
import { fechaISO } from "peso";

export const HISTORY_MAX = 8;

// C11 (25-oct-2026): generar deja de ser instantáneo. El menú se calcula igual que siempre, pero se
// enseña tras una espera al azar de entre 3 y 6 segundos con una animación (ui/menu/generando.jsx), la
// misma en los dos menús. Con «reducir movimiento» en el sistema no hay espera ni animación.
export const ESPERA_GENERAR_MIN_MS = 3000;
export const ESPERA_GENERAR_MAX_MS = 6000;
function prefiereMenosMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}
export const MENU_COMPLETO = {
  claveMenu: "rueda-de-platos:menu-v1",
  claveHistorial: "rueda-de-platos:history-v1",
  campoLista: "listaCompra",
};
// Menú simple (Tanda 3 del rediseño): ciclo y ciclos anteriores independientes de los de arriba —
// las dos pantallas conviven, cada una con su propio "Generar"/"Deshacer", sin pisarse.
export const MENU_SIMPLE = {
  claveMenu: "rueda-de-platos:menu-simple-v1",
  claveHistorial: "rueda-de-platos:history-simple-v1",
  campoLista: "listaCompraSimple",
};

export function useMenu({ claveMenu, claveHistorial, campoLista }, data, setData) {
  const [menu, setMenu] = useState(null);
  const [semana, setSemana] = useState(1);
  const [historial, setHistorial] = useState([]);
  const menuSaveTimer = useRef(null);
  // null | { inicio, duracion } (ms) mientras dura la espera de C11.
  const [generando, setGenerando] = useState(null);
  const temporizadorGenerar = useRef(null);

  async function cargar() {
    try {
      const menuRes = await window.storage.get(claveMenu, false);
      if (menuRes && menuRes.value) setMenu(JSON.parse(menuRes.value));
    } catch (e) {
      // no hay menú generado todavía, no pasa nada
    }
    try {
      const historyRes = await window.storage.get(claveHistorial, false);
      if (historyRes && historyRes.value) setHistorial(JSON.parse(historyRes.value));
    } catch (e) {
      // no hay historial todavía, no pasa nada
    }
  }

  // Pide un menú nuevo: con la espera de C11 o, con «reducir movimiento», al momento. Mientras se espera,
  // un segundo toque no hace nada. El temporizador vive en este hook (en app.jsx), así que si se cambia de
  // pantalla durante la espera el menú se genera igual.
  function generar() {
    if (temporizadorGenerar.current) return;
    if (prefiereMenosMovimiento()) {
      generarYa();
      return;
    }
    const duracion = ESPERA_GENERAR_MIN_MS + Math.random() * (ESPERA_GENERAR_MAX_MS - ESPERA_GENERAR_MIN_MS);
    setGenerando({ inicio: Date.now(), duracion });
    temporizadorGenerar.current = setTimeout(() => {
      temporizadorGenerar.current = null;
      generarYa();
    }, duracion);
  }

  async function generarYa() {
    const avoid = lastPicksFromHistory(historial, data);
    const result = generateMenu(data, avoid);
    setMenu(result);
    setSemana(1);
    setGenerando(null);
    try {
      await window.storage.set(claveMenu, JSON.stringify(result), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    const entry = { id: uid(), generatedAt: new Date().toISOString(), slots: result };
    const newHistory = [entry, ...historial].slice(0, HISTORY_MAX);
    setHistorial(newHistory);
    try {
      await window.storage.set(claveHistorial, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
    // Un menú nuevo es una lista de la compra nueva: se olvidan las marcas de la anterior.
    setData((prev) => ({ ...prev, [campoLista]: { marcados: {}, generadoEn: entry.generatedAt } }));
  }

  // Deshacer: vuelve al ciclo que había antes del último generado. historial[0] es siempre el más
  // reciente (el que se está deshaciendo), así que el destino es historial[1] — y como se quita
  // historial[0] de la lista, repetir "Deshacer" sigue retrocediendo un paso más, hasta donde llegue
  // el historial guardado (hasta HISTORY_MAX ciclos).
  async function deshacer() {
    if (historial.length < 2) return;
    const previous = historial[1];
    setMenu(previous.slots);
    setSemana(1);
    const newHistory = historial.slice(1);
    setHistorial(newHistory);
    try {
      await window.storage.set(claveMenu, JSON.stringify(previous.slots), false);
    } catch (e) {
      // si falla el guardado, el menú sigue visible en pantalla igualmente
    }
    try {
      await window.storage.set(claveHistorial, JSON.stringify(newHistory), false);
    } catch (e) {
      // el historial no es crítico: si falla el guardado, seguimos igualmente
    }
    // Mismo motivo que al generar: la lista de la compra marcada corresponde al menú que se acaba
    // de abandonar, no al que se restaura.
    setData((prev) => ({ ...prev, [campoLista]: { marcados: {}, generadoEn: previous.generatedAt } }));
  }

  function toggleMarcadoCompra(key) {
    setData((prev) => {
      const lc = prev[campoLista] || { marcados: {}, generadoEn: null };
      const marcados = { ...lc.marcados };
      if (marcados[key]) delete marcados[key];
      else marcados[key] = true;
      return { ...prev, [campoLista]: { ...lc, marcados } };
    });
  }

  // Actualiza una comida concreta del menú (por ejemplo, al cambiar las raciones de un componente)
  // y persiste el menú completo. El historial no se toca: guarda cómo se generó originalmente.
  function updateMeal(mealId, patch) {
    setMenu((prev) => {
      if (!prev) return prev;
      const next = prev.map((s) => (s.id === mealId ? { ...s, ...patch } : s));
      if (menuSaveTimer.current) clearTimeout(menuSaveTimer.current);
      menuSaveTimer.current = setTimeout(() => {
        window.storage.set(claveMenu, JSON.stringify(next), false).catch(() => {});
      }, 400);
      return next;
    });
  }

  return { menu, semana, setSemana, historial, cargar, generar, generando, deshacer, toggleMarcadoCompra, updateMeal };
}

// Marca (o desmarca) el tipo de comida indicado como completado HOY — no para el día abstracto
// "semana 1, lunes" del menú generado, que no tiene fecha real. La idea es que se marque en el
// momento en que de verdad comes, no que quede ligado a una casilla del menú que puede cambiar
// si regeneras. Vive en data.comidasCompletadas (persistente, como cualquier otro dato de la
// app), completamente aparte de "menu" — regenerar el menú nunca borra este historial.
// `registro` (B1+B3, 25-oct-2026): lo que se guarda (registroComida en logica/comida-real.js: qué
// comida del menú era, sus macros y lo cambiado); `null` la desmarca. Sin registro, alterna como antes
// (marca `{ hecha: true }` o desmarca).
export function useComidasCompletadas(setData) {
  return function toggleComidaCompletada(mealType, registro) {
    const hoy = fechaISO(new Date());
    setData((prev) => {
      const actual = prev.comidasCompletadas || {};
      const delDia = { ...(actual[hoy] || {}) };
      if (registro === null || (registro === undefined && delDia[mealType])) delete delDia[mealType];
      else delDia[mealType] = registro || { hecha: true };
      return { ...prev, comidasCompletadas: { ...actual, [hoy]: delDia } };
    });
  };
}
