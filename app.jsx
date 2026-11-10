// ---------- app.jsx: raíz de la interfaz ----------
// Punto de entrada que carga cargador-ui.js (desde auth-bootstrap.jsx en la app y desde
// validacion/index.html en las pruebas). Contiene solo el componente principal, que reúne el estado
// de la app (los hooks de ui/estado/), decide si toca la pantalla de carga, el alta o la app, y
// pinta la pantalla elegida en el menú lateral (ui/pantallas.jsx). Las pantallas y piezas de
// interfaz viven en ui/ y la lógica pura en logica/ (ver CLAUDE.md, "Arquitectura de módulos").
import React, { useState, useEffect } from "react";
import { calcularListaCompra } from "comida-calculo";
import { calcularObjetivosPerfil } from "objetivos";
import { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia } from "peso";
import { resumenNutrientesSemana } from "salud-publica";
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
import { t, guardarIdiomaLocal } from "i18n";
import { datosPesajeBuzon } from "buzon-avisos";
import { anioDeclarado } from "consentimientos";
import { useDatos, usePremium, useCargaInicial } from "./ui/estado/datos.js";
import { useMenu, useComidasCompletadas, MENU_COMPLETO, MENU_SIMPLE } from "./ui/estado/menu.js";
import { useCatalogo } from "./ui/estado/catalogo.js";
import { usePerfil } from "./ui/estado/perfil.js";
import { usePeso } from "./ui/estado/peso.js";
import { useDespensa } from "./ui/estado/despensa.js";
import { useEntreno } from "./ui/estado/entreno.js";
import { useCuerpo } from "./ui/estado/cuerpo.js";
import { Shell, Header } from "./ui/marco/cabecera.jsx";
import { DrawerMenu } from "./ui/marco/menu-lateral.jsx";
import { BarraInferior, RELLENO_BARRA } from "./ui/marco/barra-inferior.jsx";
import { ProfileOnboarding } from "./ui/onboarding/asistente-perfil.jsx";
import { PantallaAntesDeEmpezar } from "./ui/onboarding/antes-de-empezar.jsx";
import { CatalogoOnboarding } from "./ui/onboarding/cuestionario.jsx";
import { BotonCerrarSesionAlta } from "./ui/comun/cerrar-sesion.jsx";
import { ErrorCarga } from "./ui/comun/error-carga.jsx";
import { BackLink } from "./ui/comun/tarjetas.jsx";
import { Pantalla, DESTINOS } from "./ui/pantallas.jsx";
import { AREAS, COMUNES, TITULO_COMUN, areaDe, pestanaDe, areaPorClave } from "./ui/marco/navegacion.js";
import { ModalesCatalogo } from "./ui/catalogo/modales.jsx";
import { SesionEnCurso } from "./ui/entreno/sesion.jsx";
import { PastillaEntreno, ALTO_PASTILLA } from "./ui/entreno/pastilla.jsx";

// Funciones de logica/ que validacion/tests.js recoge del objeto exportado por este archivo.
export { calcularListaCompra };
export { calcularObjetivosPerfil };
export { fechaISO, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia };
export { resumenNutrientesSemana };
export { calcularResumenMensual, pesoEnMes };
// Y la descripción de la navegación por áreas, para el grupo «Navegación por áreas».
export { AREAS, COMUNES, areaDe, pestanaDe, DESTINOS };
// La pantalla «Antes de empezar» (consentimientos y edad mínima): la pinta auth-bootstrap.jsx antes de montar este
// componente, con el mismo módulo de la interfaz que ya ha cargado (cargador-ui.js solo devuelve lo que exporta
// app.jsx). Mientras falte alguna firma, la app no se monta y no lee ni guarda nada.
export { PantallaAntesDeEmpezar };

// ---------- Componente principal ----------
// Última pantalla visitada de cada área ({ fooddraft: "despensa", cuerpo: "perfil-peso", ... }), para que
// al tocar un área en el menú lateral se vuelva adonde se estaba. Es una comodidad del dispositivo (como
// la vista elegida de la despensa), no un dato de la cuenta: va en localStorage y, si falla, no pasa nada.
const CLAVE_ULTIMA_PANTALLA = "fooddraft:ultima-pantalla";
function leerUltimaPantalla() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ULTIMA_PANTALLA) || "{}");
    return guardado && typeof guardado === "object" ? guardado : {};
  } catch (e) {
    return {};
  }
}

export default function RuedaDePlatos() {
  // Destino actual y, opcionalmente, datos para él (la ficha de un ejercicio concreto, la ayuda con un
  // ejercicio ya indicado...). Las pantallas de siempre siguen usando setTab(destino), que es navegar
  // sin datos.
  //
  // `volver` (27-oct-2026): la pantalla desde la que se llegó, cuando quien navega lo pide con
  // `{ volver: true }` (hoy, el gimnasio dibujado de FitDraft al abrir Progreso, Historial, Rutinas o la
  // ficha de un ejercicio). Mientras se siga dentro de la misma pestaña (la lista de rutinas y su editor, por
  // ejemplo), arriba sale «← Gimnasio» para regresar sin buscar la barra inferior; navegar a otra pestaña
  // lo olvida. Basta con un paso, no hace falta una pila entera: solo se vuelve al punto de partida.
  const [nav, setNav] = useState({ tab: "menu", params: null, volver: null });
  const { tab, params } = nav;
  const [ultimaPantalla, setUltimaPantalla] = useState(leerUltimaPantalla);
  function navegar(destino, nuevosParams = null, opciones = {}) {
    setNav((prev) => {
      let volver = null;
      if (opciones.volver) volver = { tab: prev.tab, params: prev.params };
      else if (prev.volver && pestanaDe(destino) && pestanaDe(destino) === pestanaDe(prev.tab)) volver = prev.volver;
      return { tab: destino, params: nuevosParams, volver };
    });
    const area = areaDe(destino);
    if (!area) return;
    setUltimaPantalla((prev) => {
      if (prev[area] === destino) return prev;
      const siguiente = { ...prev, [area]: destino };
      try {
        localStorage.setItem(CLAVE_ULTIMA_PANTALLA, JSON.stringify(siguiente));
      } catch (e) {
        // sin localStorage, el área solo se recuerda mientras la app esté abierta
      }
      return siguiente;
    });
  }
  const setTab = (destino) => navegar(destino);
  // Tocar un área en el menú lateral: a la última pantalla visitada en ella o, si no hay, a su primera
  // pestaña. La recordada solo vale si sigue siendo de esa área: un destino que ya no existe (como
  // `entreno-ajustes`, que pasó a ser una sección de Ajustes) dejaría la pantalla en blanco.
  function irAArea(clave) {
    const a = AREAS.find((x) => x.clave === clave);
    if (!a) return;
    const recordada = ultimaPantalla[clave] && areaDe(ultimaPantalla[clave]) === clave ? ultimaPantalla[clave] : null;
    const destino = recordada || (a.pestanas[0] && a.pestanas[0].destino) || (a.menu[0] && a.menu[0].destino);
    if (destino) navegar(destino);
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Abarca toda la carga inicial (datos, los dos menús, la despensa y el entreno): mientras dura se enseña
  // "Cargando…" y no se dispara el guardado automático (ver useDatos).
  const [loading, setLoading] = useState(true);
  // Si algo de lo guardado no se ha podido leer (sin conexión al abrir), no se sigue con datos vacíos: se
  // enseña «No se han podido cargar tus datos · Reintentar» (ver useCargaInicial y ui/comun/error-carga.jsx).
  // `null` sin error; «conexion» o «ilegible» (se leyó, pero lo guardado no se puede usar) para el texto.
  const [errorCarga, setErrorCarga] = useState(null);

  const premium = usePremium();
  const { data, setData, saveState, idioma, idiomaFallback, cargar: cargarDatos } = useDatos(loading);
  // <html lang> con el idioma de la interfaz (el de index.html es fijo, «es»): lo usan los lectores de pantalla,
  // la partición de palabras y el traductor del navegador.
  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);
  // El idioma del perfil, también en el navegador (`fooddraft:idioma`): las pantallas de antes de abrir la app
  // (bienvenida tras cerrar sesión, verificar el correo, «Antes de empezar») se pintan antes de leer el perfil y solo
  // conocen ese. Antes solo se guardaba al elegirlo en la bienvenida o en Ajustes, así que con el perfil en español y
  // la bienvenida en inglés, «Antes de empezar» salía en inglés (prueba de la etapa 2 de la auditoría). Solo con un
  // perfil leído y con idioma: el de reserva ya es el guardado.
  const idiomaDelPerfil = data && data.perfil && data.perfil.idioma;
  useEffect(() => { if (idiomaDelPerfil) guardarIdiomaLocal(idiomaDelPerfil); }, [idiomaDelPerfil]);
  const menuCompleto = useMenu(MENU_COMPLETO, data, setData);
  const menuSimple = useMenu(MENU_SIMPLE, data, setData);
  const toggleComidaCompletada = useComidasCompletadas(setData);
  const despensa = useDespensa(data, menuCompleto.menu);
  const catalogo = useCatalogo(setData, { alBorrarAlimento: despensa.alBorrarAlimento });
  const perfil = usePerfil(setData);
  const peso = usePeso(setData);
  const entreno = useEntreno(data);
  const cuerpo = useCuerpo();
  const reintentarCarga = useCargaInicial(
    [cargarDatos, menuCompleto.cargar, menuSimple.cargar, despensa.cargar, entreno.cargar, cuerpo.cargar],
    (fallos, { ilegible }) => {
      setErrorCarga(fallos.length === 0 ? null : ilegible ? "ilegible" : "conexion");
      setLoading(false);
    }
  );

  // Buzón de avisos (auditoría de noviembre de 2026, R8): lo que leen las funciones de notificaciones para saber
  // a quién avisar. Se pone al día al abrirse la app y cada vez que cambian el idioma o uno de los dos
  // interruptores de Ajustes (window.sincronizarBuzonAvisos, auth-bootstrap.jsx, que decide qué hacer con
  // logica/buzon-avisos.js). Se llama también con los dos avisos apagados, a propósito: así se repite un borrado
  // del buzón que no llegó (F1), el navegador estrena token tras un cierre de sesión (F2) y se borra el token de
  // antes. Solo con el perfil leído bien de la nube: con un error de carga no se sabe qué quiere la cuenta, y
  // borrar el buzón por un perfil sin leer dejaría sin avisos a todos sus aparatos.
  // Con el recordatorio de pesaje activado, lleva también lo justo del seguimiento de peso (tanda B, M2:
  // datosPesajeBuzon, logica/buzon-avisos.js), para que la función decida sin abrir los datos de la cuenta. Se
  // vigilan esos tres valores sueltos y no `pesoTracking` entero: solo cambian con la primera pesada de un día,
  // al pausar o reanudar, al cambiar la frecuencia y al cerrar el ciclo (no al corregir el peso de hoy, por
  // ejemplo), y con el recordatorio apagado no cambian nunca.
  // En validacion/ no existe el puente con Firebase y no hace nada.
  const perfilListo = !loading && !errorCarga && !!(data && data.perfil);
  const avisoPesaje = !!(data && data.perfil && data.perfil.notificacionesPush);
  const avisoDescongelar = !!(data && data.perfil && data.perfil.avisoDescongelar);
  const { pesoVecesSemana, pesoPausado, ultimaPesada } = datosPesajeBuzon({ pesaje: avisoPesaje, pesoTracking: data && data.pesoTracking });
  useEffect(() => {
    if (!perfilListo || typeof window.sincronizarBuzonAvisos !== "function") return;
    window.sincronizarBuzonAvisos({ idioma, pesaje: avisoPesaje, descongelar: avisoDescongelar, pesoVecesSemana, pesoPausado, ultimaPesada });
  }, [perfilListo, idioma, avisoPesaje, avisoDescongelar, pesoVecesSemana, pesoPausado, ultimaPesada]);

  if (errorCarga) {
    return (
      <Shell>
        {/* Con `loading` el guardado automático no salta: lo recién leído no se reescribe en la nube. */}
        <ErrorCarga idioma={idioma} motivo={errorCarga} onReintentar={() => { setLoading(true); return reintentarCarga(); }} />
      </Shell>
    );
  }

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
  // Las dos llevan arriba a la derecha el botón de cerrar sesión, por si se ha entrado con otra cuenta
  // (fuera del alta, cerrar sesión está en Ajustes).
  if (!data.perfilOnboardingDone) {
    if (!data.perfil) {
      return (
        <Shell>
          <BotonCerrarSesionAlta idioma={idiomaFallback} />
          {/* El año de nacimiento ya se declaró en «Antes de empezar» (window.consentimientos, auth-bootstrap.jsx):
              el asistente lo usa y no lo vuelve a preguntar. */}
          <ProfileOnboarding
            onComplete={perfil.guardarPerfilInicial} onSkip={perfil.skipPerfil} idioma={idiomaFallback}
            anioDeclarado={anioDeclarado(window.consentimientos)}
          />
        </Shell>
      );
    }
    return (
      <Shell>
        <BotonCerrarSesionAlta idioma={data.perfil.idioma || idiomaFallback} />
        <CatalogoOnboarding
          idioma={data.perfil.idioma || idiomaFallback}
          repartoComidas={data.perfil.repartoComidas}
          onComplete={perfil.completarOnboardingConCatalogo}
          onSkipAll={perfil.saltarCatalogoOnboarding}
        />
      </Shell>
    );
  }

  const area = areaDe(tab);
  const hayPastilla = !!entreno.borrador && !entreno.sesionVisible;
  const ctx = { data, idioma, premium, setTab, navegar, params, menuCompleto, menuSimple, toggleComidaCompletada, catalogo, perfil, peso, despensa, entreno, cuerpo };

  return (
    <Shell>
      <Header saveState={saveState} idioma={idioma} titulo={area ? areaPorClave(area).titulo : TITULO_COMUN} rotulo={(area && areaPorClave(area).rotulo) || "FoodDraft"} onOpenMenu={() => setDrawerOpen(true)} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} area={area} setTab={setTab} onIrAArea={irAArea} idioma={idioma} premium={premium} perfil={data.perfil} />

      {/* Con barra inferior (y con la pastilla del entreno en curso), <main> deja libre abajo lo que
          ocupan, para que lo último de cada pantalla no quede escondido detrás. */}
      <main style={{ padding: "20px 22px 60px", paddingBottom: `calc(${area ? RELLENO_BARRA : "60px"} + ${hayPastilla ? ALTO_PASTILLA : 0}px)` }}>
        {nav.volver && <BackLink label={t(idioma, "fitdraft.volverGimnasio")} onClick={() => navegar(nav.volver.tab, nav.volver.params)} />}
        <Pantalla tab={tab} ctx={ctx} />
      </main>

      <BarraInferior area={area} tab={tab} navegar={navegar} idioma={idioma} perfil={data.perfil} />
      <PastillaEntreno entreno={entreno} idioma={idioma} hayBarra={!!area} />

      <ModalesCatalogo catalogo={catalogo} data={data} idioma={idioma} />

      {/* El entreno en curso: una capa a pantalla completa encima de cualquier pantalla (ver
          ui/entreno/sesion.jsx); al minimizarla queda la pastilla. */}
      {entreno.sesionVisible && <SesionEnCurso entreno={entreno} idioma={idioma} navegar={navegar} onGuardado={(s) => (s ? navegar("entreno-sesion", { id: s.id, inicio: s.inicio }) : navegar("entreno"))} />}
    </Shell>
  );
}
