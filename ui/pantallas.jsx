// ---------- ui/pantallas.jsx ----------
// Tabla de pantallas: qué se pinta para cada destino del menú lateral (`tab`). Antes eran ~30
// bloques `{tab === "..." && ...}` seguidos dentro del componente principal de app.jsx; ahora cada
// destino es una entrada de PANTALLAS y el componente principal solo elige cuál pintar. `ctx` lleva
// todo lo que necesitan: los datos, el idioma, premium, la navegación y los hooks de ui/estado/.
import React from "react";
import { Utensils, Package, CalendarDays, Database, Layers, Camera, PieChart, ListChecks } from "lucide-react";
import { t } from "i18n";
import { defaultPesoTracking } from "peso";
import { CATEGORY_META, MACRO_CATS, ESPECIALES_CATS } from "./comun/categorias.js";
import { BigCardGrid, BackLink } from "./comun/tarjetas.jsx";
import { MenuView } from "./menu/menu-completo.jsx";
import { MenuSimpleView } from "./menu/menu-simple.jsx";
import { DespensaView } from "./despensa/despensa.jsx";
import { FoodsView } from "./catalogo/alimentos.jsx";
import { RulesView } from "./catalogo/reglas.jsx";
import { PantallaCategoria, PANTALLAS_CATEGORIA } from "./catalogo/categoria.jsx";
import { PerfilView, ActividadDiariaView } from "./perfil/perfil.jsx";
import { RepartoComidasView } from "./perfil/reparto-comidas.jsx";
import { PesoView } from "./peso/seguimiento.jsx";
import { ResumenMensualView } from "./peso/resumen-mensual.jsx";
import { MedidasPlaceholderView } from "./peso/medidas.jsx";
import { PremiumView, PremiumRequiredNotice } from "./premium/premium.jsx";
import { SuggestMealsView } from "./premium/que-cocino.jsx";
import { SettingsView } from "./ajustes/ajustes.jsx";
import { CompartirView, FeedbackView, DocumentosView } from "./ajustes/compartir.jsx";
import { EntrenarView, ProntoView } from "./entreno/inicio.jsx";
import { EjerciciosView } from "./entreno/ejercicios.jsx";
import { RutinasView } from "./entreno/rutinas.jsx";
import { EditorRutinaView } from "./entreno/editor-rutina.jsx";

const PANTALLAS = {
  "menus-root": ({ idioma, setTab }) => (
    <BigCardGrid
      onSelect={setTab}
      cards={[
        { key: "menu", label: t(idioma, "drawer.menuCompleto"), desc: t(idioma, "drawer.menuCompleto.desc"), icon: CalendarDays, color: "var(--green)" },
        { key: "menu-simple", label: t(idioma, "drawer.menuSimple"), desc: t(idioma, "drawer.menuSimple.desc"), icon: ListChecks, color: "var(--olive)" },
      ]}
    />
  ),

  menu: ({ data, idioma, menuCompleto, perfil, catalogo, toggleComidaCompletada, despensa }) => (
    <MenuView
      menu={menuCompleto.menu}
      onGenerate={menuCompleto.generar}
      onUndo={menuCompleto.deshacer}
      menuWeek={menuCompleto.semana}
      setMenuWeek={menuCompleto.setSemana}
      history={menuCompleto.historial}
      data={data}
      onUpdateMeal={menuCompleto.updateMeal}
      objetivos={data.objetivos}
      onUpdateObjetivos={perfil.updateObjetivos}
      onUpsertRule={catalogo.upsertRule}
      onToggleComidaCompletada={toggleComidaCompletada}
      despensa={despensa}
      idioma={idioma}
    />
  ),

  "menu-simple": ({ data, idioma, menuSimple }) => (
    <MenuSimpleView
      menu={menuSimple.menu}
      onGenerate={menuSimple.generar}
      onUndo={menuSimple.deshacer}
      menuWeek={menuSimple.semana}
      setMenuWeek={menuSimple.setSemana}
      history={menuSimple.historial}
      data={data}
      onToggleMarcadoCompra={menuSimple.toggleMarcadoCompra}
      idioma={idioma}
    />
  ),

  // «¿Qué tengo?»: la despensa. Va directa desde el menú lateral, justo después de Menús. La
  // vitrocerámica de su cocina dibujada lleva a «¿Qué cocino?» (la misma pantalla de siempre).
  despensa: ({ data, idioma, despensa, setTab }) => (
    <DespensaView data={data} despensa={despensa} idioma={idioma} onIrACocinar={() => setTab("cocinar-desde-cocina")} />
  ),

  "config-root": ({ idioma, setTab, premium }) => (
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
  ),

  "reparto-comidas": ({ data, idioma, setTab, perfil }) => (
    <>
      <BackLink label={t(idioma, "drawer.configuracionComidas")} onClick={() => setTab("config-root")} />
      <RepartoComidasView perfil={data.perfil} onSave={perfil.savePerfil} idioma={idioma} />
    </>
  ),

  "macros-root": ({ idioma, setTab }) => (
    <>
      <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
      <BigCardGrid
        onSelect={setTab}
        cards={MACRO_CATS.map((key) => ({ key, label: t(idioma, CATEGORY_META[key].labelKey), icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
      />
    </>
  ),

  "especiales-root": ({ idioma, setTab }) => (
    <>
      <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
      <BigCardGrid
        onSelect={setTab}
        cards={ESPECIALES_CATS.map((key) => ({ key, label: t(idioma, CATEGORY_META[key].labelKey), icon: CATEGORY_META[key].icon, color: CATEGORY_META[key].color }))}
      />
    </>
  ),

  // proteina, carbo, verdura, grasa, desayuno, media_manana, merienda, cerrado, especial: ver
  // PANTALLAS_CATEGORIA (ui/catalogo/categoria.jsx), se añaden a esta tabla más abajo.

  alimentos: ({ data, idioma, setTab, catalogo }) => (
    <div>
      <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
      <FoodsView
        foods={data.foods || []}
        ingredients={data.ingredients}
        onEdit={(food) => catalogo.setEditingFood({ mode: "edit", food })}
        onNew={() => catalogo.setEditingFood({ mode: "new" })}
        onNewFromPhoto={(photoDataUrl) => catalogo.setEditingFood({ mode: "new", photo: photoDataUrl })}
        onDelete={(food) => catalogo.setConfirmDeleteFood(food)}
        idioma={idioma}
      />
    </div>
  ),

  cocinar: (ctx) => <PantallaCocinar {...ctx} volverA="config-root" etiquetaVolver={t(ctx.idioma, "tab.configuracion")} />,

  // La misma pantalla, pero llegando desde la vitrocerámica de la cocina dibujada: el enlace de vuelta
  // lleva a «¿Qué tengo?» en vez de a Configuración. Es un destino aparte (y no un estado de «de dónde
  // vengo») para que la navegación siga siendo solo elegir un `tab`.
  "cocinar-desde-cocina": (ctx) => <PantallaCocinar {...ctx} volverA="despensa" etiquetaVolver={t(ctx.idioma, "drawer.queTengo")} />,

  combos: ({ data, idioma, setTab, catalogo }) => (
    <div>
      <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
      <RulesView
        rules={data.rules || []}
        ingredients={data.ingredients}
        onEdit={(rule) => catalogo.setEditingRule({ mode: "edit", rule })}
        onNew={() => catalogo.setEditingRule({ mode: "new" })}
        onDelete={(rule) => catalogo.setConfirmDeleteRule(rule)}
        idioma={idioma}
      />
    </div>
  ),

  // perfil-datos, perfil-documentos y perfil-premium se llegan directos desde el menú lateral
  // (DrawerMenu) — el ☰ del Header, siempre visible, hace de "volver". El seguimiento de peso, las
  // medidas y el resumen mensual son del área Cuerpo (ui/marco/navegacion.js): su barra inferior hace
  // el papel de la antigua tarjeta intermedia «Seguimiento de peso» (peso-root), que se quitó con la
  // navegación por áreas (octubre de 2026), así que ya no llevan enlace de vuelta.

  "perfil-datos": ({ data, idioma, perfil }) => <PerfilView perfil={data.perfil} onSave={perfil.savePerfil} idioma={idioma} />,

  "perfil-peso": ({ data, idioma, setTab, premium, peso }) => (
    <>
      {premium.active ? (
        <PesoView
          perfil={data.perfil}
          pesoTracking={data.pesoTracking || defaultPesoTracking()}
          onAddPeso={peso.addPesoEntrada}
          onUpdateConfig={peso.actualizarConfigPeso}
          onDismissReminder={peso.descartarRecordatorioHoy}
          onCerrarCiclo={peso.cerrarCicloPeso}
          onPausarCiclo={peso.pausarCiclo}
          onReanudarCiclo={peso.reanudarCiclo}
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
  ),

  "perfil-premium": ({ idioma, premium }) => <PremiumView premium={premium} idioma={idioma} />,

  "perfil-resumen": ({ data, idioma, setTab, premium }) => (
    <ResumenMensualView data={data} premium={premium} onGoPremium={() => setTab("perfil-premium")} idioma={idioma} />
  ),

  "perfil-medidas": ({ idioma }) => <MedidasPlaceholderView idioma={idioma} />,

  "perfil-documentos": ({ idioma }) => <DocumentosView idioma={idioma} />,

  "actividad-diaria": ({ data, idioma, perfil }) => <ActividadDiariaView perfil={data.perfil} onSave={perfil.savePerfil} idioma={idioma} />,

  ajustes: ({ data, idioma, perfil }) => (
    <SettingsView perfil={data.perfil} data={data} onSave={perfil.savePerfil} onRepetirCuestionario={perfil.repetirCuestionarioCatalogo} idioma={idioma} />
  ),

  compartir: ({ idioma }) => <CompartirView idioma={idioma} />,

  feedback: ({ idioma }) => <FeedbackView idioma={idioma} />,

  // ---------- Entrenamiento (octubre de 2026) ----------
  // Las pantallas del área de entreno (ui/entreno/). La sesión en curso no está aquí: es una capa a
  // pantalla completa que pinta app.jsx encima de cualquier pantalla.
  entreno: ({ idioma, entreno, navegar }) => <EntrenarView entreno={entreno} idioma={idioma} navegar={navegar} />,
  "entreno-rutinas": ({ idioma, entreno, navegar }) => <RutinasView entreno={entreno} idioma={idioma} navegar={navegar} />,
  // Editor de una rutina: `params.id` (null = nueva). Se monta de nuevo para cada rutina (key), así no
  // se arrastra la copia que se estaba editando de otra.
  "entreno-rutina": ({ idioma, entreno, navegar, params }) => (
    <EditorRutinaView key={(params && params.id) || "nueva"} entreno={entreno} idioma={idioma} navegar={navegar} params={params} />
  ),
  "entreno-ejercicios": ({ idioma, entreno }) => <EjerciciosView entreno={entreno} idioma={idioma} />,
  "entreno-historial": ({ idioma }) => <ProntoView idioma={idioma} />,
  "entreno-sesion": ({ idioma }) => <ProntoView idioma={idioma} />,
  "entreno-ajustes": ({ idioma }) => <ProntoView idioma={idioma} />,
};

Object.keys(PANTALLAS_CATEGORIA).forEach((categoria) => {
  PANTALLAS[categoria] = ({ data, idioma, setTab, catalogo }) => (
    <PantallaCategoria categoria={categoria} data={data} catalogo={catalogo} setTab={setTab} idioma={idioma} />
  );
});

// Todos los destinos que existen (después de añadir las categorías). Lo usa validacion/ para comprobar
// que ninguno se queda fuera de la navegación por áreas (ui/marco/navegacion.js).
export const DESTINOS = Object.keys(PANTALLAS);

// «¿Qué cocino?»: la pantalla premium de sugerencias (o su aviso para quien no tiene premium), con un
// enlace de vuelta que depende de desde dónde se llega (ver los destinos "cocinar" y
// "cocinar-desde-cocina" en PANTALLAS).
function PantallaCocinar({ data, idioma, setTab, premium, catalogo, volverA, etiquetaVolver }) {
  return (
    <div>
      <BackLink label={etiquetaVolver} onClick={() => setTab(volverA)} />
      {premium.active ? (
        <SuggestMealsView
          data={data}
          onGuardarComoCerrado={(sugerencia) => {
            const bloqueCerrado = (data.blocks || []).find((b) => b.category === "cerrado");
            if (!bloqueCerrado) return; // no debería pasar: siempre hay un bloque de cerrados por defecto
            catalogo.setEditing({
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
  );
}

// Destino desconocido: no se pinta nada (igual que antes, cuando ningún `tab === ...` coincidía).
export function Pantalla({ tab, ctx }) {
  const pintar = PANTALLAS[tab];
  return pintar ? pintar(ctx) : null;
}
