// ---------- ui/pantallas.jsx ----------
// Tabla de pantallas: qué se pinta para cada destino del menú lateral (`tab`). Antes eran ~30
// bloques `{tab === "..." && ...}` seguidos dentro del componente principal de app.jsx; ahora cada
// destino es una entrada de PANTALLAS y el componente principal solo elige cuál pintar. `ctx` lleva
// todo lo que necesitan: los datos, el idioma, premium, la navegación y los hooks de ui/estado/.
import React from "react";
import { Utensils, Package, CalendarDays, Database, Layers, Camera, Scale, Ruler, TrendingUp, PieChart, ListChecks } from "lucide-react";
import { t } from "i18n";
import { defaultPesoTracking } from "peso";
import { CATEGORY_META, MACRO_CATS, ESPECIALES_CATS } from "./comun/categorias.js";
import { BigCardGrid, BackLink } from "./comun/tarjetas.jsx";
import { MenuView } from "./menu/menu-completo.jsx";
import { MenuSimpleView } from "./menu/menu-simple.jsx";
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

  menu: ({ data, idioma, menuCompleto, perfil, catalogo, toggleComidaCompletada }) => (
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
      onToggleMarcadoCompra={menuCompleto.toggleMarcadoCompra}
      onUpsertRule={catalogo.upsertRule}
      onToggleComidaCompletada={toggleComidaCompletada}
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

  cocinar: ({ data, idioma, setTab, premium, catalogo }) => (
    <div>
      <BackLink label={t(idioma, "tab.configuracion")} onClick={() => setTab("config-root")} />
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
  ),

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
  // (DrawerMenu) — el ☰ del Header, siempre visible, hace de "volver". peso-root sí tiene su propia
  // tarjeta intermedia (mismo patrón que config-root con sus categorías): agrupa seguimiento de
  // peso, medidas corporales y resumen mensual bajo un único destino "Seguimiento de peso" en el
  // menú, con BackLink de vuelta desde cada uno.

  "perfil-datos": ({ data, idioma, perfil }) => <PerfilView perfil={data.perfil} onSave={perfil.savePerfil} idioma={idioma} />,

  "peso-root": ({ idioma, setTab, premium }) => (
    <BigCardGrid
      onSelect={setTab}
      cards={[
        { key: "perfil-peso", label: t(idioma, "drawer.registroPeso"), desc: premium.active ? t(idioma, "perfilRoot.seguimientoPeso.desc") : t(idioma, "perfilRoot.funcionPremium"), icon: Scale, color: "var(--coffee)" },
        { key: "perfil-medidas", label: t(idioma, "perfilRoot.medidasCorporales"), desc: t(idioma, "perfilRoot.proximamente"), icon: Ruler, color: "var(--berry)" },
        { key: "perfil-resumen", label: t(idioma, "perfilRoot.resumenMensual"), desc: t(idioma, "perfilRoot.resumenMensual.desc"), icon: TrendingUp, color: "var(--olive)" },
      ]}
    />
  ),

  "perfil-peso": ({ data, idioma, setTab, premium, peso }) => (
    <>
      <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
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
    <>
      <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
      <ResumenMensualView data={data} premium={premium} onGoPremium={() => setTab("perfil-premium")} idioma={idioma} />
    </>
  ),

  "perfil-medidas": ({ idioma, setTab }) => (
    <>
      <BackLink label={t(idioma, "perfilRoot.seguimientoPeso")} onClick={() => setTab("peso-root")} />
      <MedidasPlaceholderView idioma={idioma} />
    </>
  ),

  "perfil-documentos": ({ idioma }) => <DocumentosView idioma={idioma} />,

  "actividad-diaria": ({ data, idioma, perfil }) => <ActividadDiariaView perfil={data.perfil} onSave={perfil.savePerfil} idioma={idioma} />,

  ajustes: ({ data, idioma, perfil }) => (
    <SettingsView perfil={data.perfil} data={data} onSave={perfil.savePerfil} onRepetirCuestionario={perfil.repetirCuestionarioCatalogo} idioma={idioma} />
  ),

  compartir: ({ idioma }) => <CompartirView idioma={idioma} />,

  feedback: ({ idioma }) => <FeedbackView idioma={idioma} />,
};

Object.keys(PANTALLAS_CATEGORIA).forEach((categoria) => {
  PANTALLAS[categoria] = ({ data, idioma, setTab, catalogo }) => (
    <PantallaCategoria categoria={categoria} data={data} catalogo={catalogo} setTab={setTab} idioma={idioma} />
  );
});

// Destino desconocido: no se pinta nada (igual que antes, cuando ningún `tab === ...` coincidía).
export function Pantalla({ tab, ctx }) {
  const pintar = PANTALLAS[tab];
  return pintar ? pintar(ctx) : null;
}
