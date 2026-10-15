// ---------- app.jsx: raíz de la interfaz ----------
// Punto de entrada que carga cargador-ui.js (desde auth-bootstrap.jsx en la app y desde
// validacion/index.html en las pruebas). Contiene solo el componente principal, que reúne el estado
// de la app (los hooks de ui/estado/), decide si toca la pantalla de carga, el alta o la app, y
// pinta la pantalla elegida en el menú lateral (ui/pantallas.jsx). Las pantallas y piezas de
// interfaz viven en ui/ y la lógica pura en logica/ (ver CLAUDE.md, "Arquitectura de módulos").
import React, { useState } from "react";
import { calcularListaCompra } from "comida-calculo";
import { calcularObjetivosPerfil } from "objetivos";
import { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia } from "peso";
import { resumenNutrientesSemana } from "salud-publica";
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
import { t } from "i18n";
import { useDatos, usePremium, useCargaInicial } from "./ui/estado/datos.js";
import { useMenu, useComidasCompletadas, MENU_COMPLETO, MENU_SIMPLE } from "./ui/estado/menu.js";
import { useCatalogo } from "./ui/estado/catalogo.js";
import { usePerfil } from "./ui/estado/perfil.js";
import { usePeso } from "./ui/estado/peso.js";
import { useDespensa } from "./ui/estado/despensa.js";
import { Shell, Header } from "./ui/marco/cabecera.jsx";
import { DrawerMenu } from "./ui/marco/menu-lateral.jsx";
import { ProfileOnboarding } from "./ui/onboarding/asistente-perfil.jsx";
import { CatalogoOnboarding } from "./ui/onboarding/cuestionario.jsx";
import { Pantalla } from "./ui/pantallas.jsx";
import { ModalesCatalogo } from "./ui/catalogo/modales.jsx";

// Funciones de logica/ que validacion/tests.js recoge del objeto exportado por este archivo.
export { calcularListaCompra };
export { calcularObjetivosPerfil };
export { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia };
export { resumenNutrientesSemana };
export { calcularResumenMensual, pesoEnMes };

// ---------- Componente principal ----------
export default function RuedaDePlatos() {
  const [tab, setTab] = useState("menu");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Abarca toda la carga inicial (datos, los dos menús y la despensa): mientras dura se enseña
  // "Cargando…" y no se dispara el guardado automático (ver useDatos).
  const [loading, setLoading] = useState(true);

  const premium = usePremium();
  const { data, setData, saveState, idioma, idiomaFallback, cargar: cargarDatos } = useDatos(loading);
  const menuCompleto = useMenu(MENU_COMPLETO, data, setData);
  const menuSimple = useMenu(MENU_SIMPLE, data, setData);
  const toggleComidaCompletada = useComidasCompletadas(setData);
  const despensa = useDespensa(data, menuCompleto.menu);
  const catalogo = useCatalogo(setData, { alBorrarAlimento: despensa.alBorrarAlimento });
  const perfil = usePerfil(setData);
  const peso = usePeso(setData);
  useCargaInicial([cargarDatos, menuCompleto.cargar, menuSimple.cargar, despensa.cargar], () => setLoading(false));

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
          <ProfileOnboarding onComplete={perfil.guardarPerfilInicial} onSkip={perfil.skipPerfil} idioma={idiomaFallback} />
        </Shell>
      );
    }
    return (
      <Shell>
        <CatalogoOnboarding
          idioma={data.perfil.idioma || idiomaFallback}
          repartoComidas={data.perfil.repartoComidas}
          onComplete={perfil.completarOnboardingConCatalogo}
          onSkipAll={perfil.saltarCatalogoOnboarding}
        />
      </Shell>
    );
  }

  const ctx = { data, idioma, premium, setTab, menuCompleto, menuSimple, toggleComidaCompletada, catalogo, perfil, peso, despensa };

  return (
    <Shell>
      <Header saveState={saveState} idioma={idioma} onOpenMenu={() => setDrawerOpen(true)} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} setTab={setTab} idioma={idioma} premium={premium} />

      <main style={{ padding: "20px 22px 60px" }}>
        <Pantalla tab={tab} ctx={ctx} />
      </main>

      <ModalesCatalogo catalogo={catalogo} data={data} idioma={idioma} />
    </Shell>
  );
}
