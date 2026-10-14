// ---------- app.jsx: raíz de la interfaz ----------
// Punto de entrada que carga cargador-ui.js (desde auth-bootstrap.jsx en la app y desde
// validacion/index.html en las pruebas). Contiene el componente principal, que guarda el estado de
// la app y decide qué pantalla enseñar; las pantallas y piezas de interfaz viven en ui/, y la lógica
// pura en logica/ (ver CLAUDE.md, "Arquitectura de módulos").
import React, { useState, useEffect, useRef } from "react";
import { Utensils, Package, CalendarDays, Database, Layers, Camera, Scale, Ruler, TrendingUp, PieChart, ListChecks } from "lucide-react";
import { calcularListaCompra } from "comida-calculo";
import { calcularObjetivosPerfil } from "objetivos";
import { uid } from "comun";
import { generateMenu, lastPicksFromHistory } from "menu-generador";
import { defaultPesoTracking, fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia } from "peso";
import { resumenNutrientesSemana } from "salud-publica";
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
import { t, leerIdiomaGuardado } from "i18n";
import { initialData } from "datos-iniciales";
import { migrateData } from "migraciones";
import { CATEGORY_META, MACRO_CATS, ESPECIALES_CATS } from "./ui/comun/categorias.js";
import { SectionIntro, ProbabilitySumBadge, CardGrid, AddCard, BigCardGrid, BackLink } from "./ui/comun/tarjetas.jsx";
import { Shell, Header } from "./ui/marco/cabecera.jsx";
import { DrawerMenu } from "./ui/marco/menu-lateral.jsx";
import { MenuView } from "./ui/menu/menu-completo.jsx";
import { MenuSimpleView } from "./ui/menu/menu-simple.jsx";
import { FoodsView, FoodEditModal, ConfirmFoodDeleteModal } from "./ui/catalogo/alimentos.jsx";
import { RulesView, RuleEditModal, ConfirmRuleDeleteModal } from "./ui/catalogo/reglas.jsx";
import { IngredientCard, BlockCard, EditModal, ConfirmModal, FrequencyModal } from "./ui/catalogo/platos.jsx";
import { PerfilView, ActividadDiariaView } from "./ui/perfil/perfil.jsx";
import { RepartoComidasView } from "./ui/perfil/reparto-comidas.jsx";
import { ProfileOnboarding } from "./ui/onboarding/asistente-perfil.jsx";
import { CatalogoOnboarding } from "./ui/onboarding/cuestionario.jsx";
import { PesoView } from "./ui/peso/seguimiento.jsx";
import { ResumenMensualView } from "./ui/peso/resumen-mensual.jsx";
import { MedidasPlaceholderView } from "./ui/peso/medidas.jsx";
import { PremiumView, PremiumRequiredNotice } from "./ui/premium/premium.jsx";
import { SuggestMealsView } from "./ui/premium/que-cocino.jsx";
import { SettingsView } from "./ui/ajustes/ajustes.jsx";
import { CompartirView, FeedbackView, DocumentosView } from "./ui/ajustes/compartir.jsx";

// Funciones de logica/ que validacion/tests.js recoge del objeto exportado por este archivo.
export { calcularListaCompra };
export { calcularObjetivosPerfil };
export { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia };
export { resumenNutrientesSemana };
export { calcularResumenMensual, pesoEnMes };

const STORAGE_KEY = "rueda-de-platos:data-v1";

const MENU_STORAGE_KEY = "rueda-de-platos:menu-v1";

const HISTORY_STORAGE_KEY = "rueda-de-platos:history-v1";

// Menú simple (Tanda 3 del rediseño): ciclo y ciclos anteriores independientes de los de arriba —
// las dos pantallas conviven, cada una con su propio "Generar"/"Deshacer", sin pisarse.
const MENU_SIMPLE_STORAGE_KEY = "rueda-de-platos:menu-simple-v1";

const HISTORY_SIMPLE_STORAGE_KEY = "rueda-de-platos:history-simple-v1";

const HISTORY_MAX = 8;

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
  // se usa el que se eligió/detectó en la pantalla de bienvenida (ver logica/i18n.js); en cuanto
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
