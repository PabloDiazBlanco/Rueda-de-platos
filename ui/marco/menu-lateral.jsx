// ---------- ui/marco/menu-lateral.jsx ----------
// Menú lateral (drawer) con todos los destinos de la app.
import React, { useState } from "react";
import { X, Utensils, Package, Sparkles, CalendarDays, Shuffle, Database, Layers, Camera, User, Scale, Ruler, FileText, Share2, Mail, Settings, TrendingUp, ChevronDown, Activity, PieChart, ListChecks } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";

// ---------- Menú lateral (drawer) ----------
// Sustituye a la antigua TabBar de tres pestañas horizontales. Desde la Tanda 2, dos ítems del
// grupo de arriba llevan sub-opciones (ver "children" más abajo): tocar el texto navega al destino
// "raíz" de ese grupo (la misma tarjeta grande que ya existía, config-root o la nueva peso-root),
// tocar la flecha despliega las sub-opciones ahí mismo, sin navegar — mismo patrón que un menú de
// ajustes con flechas (Configuración > General/Facturación/...), para poder saltar directo a una
// sub-pantalla concreta sin pasar por la tarjeta intermedia. El grupo de abajo (Compartir, Ayuda y
// comentarios, Ajustes, Perfil) no tiene sub-opciones.
export function DrawerMenu({ open, onClose, tab, setTab, idioma, premium }) {
  const [expandido, setExpandido] = useState({});

  function ir(destino) {
    setTab(destino);
    onClose();
  }
  function alternarExpandido(key) {
    setExpandido((e) => ({ ...e, [key]: !e[key] }));
  }

  const arriba = [
    {
      key: "menus-root", label: t(idioma, "drawer.menus"), icon: CalendarDays,
      children: [
        { key: "menu", label: t(idioma, "drawer.menuCompleto"), icon: CalendarDays },
        { key: "menu-simple", label: t(idioma, "drawer.menuSimple"), icon: ListChecks },
      ],
    },
    {
      key: "config-root", label: t(idioma, "drawer.configuracionComidas"), icon: Layers,
      children: [
        { key: "macros-root", label: t(idioma, "nav.macros"), icon: Utensils },
        { key: "especiales-root", label: t(idioma, "nav.comidasEspeciales"), icon: Package },
        { key: "combos", label: t(idioma, "nav.combinaciones"), icon: Shuffle },
        { key: "alimentos", label: t(idioma, "nav.alimentos"), icon: Database },
        { key: "cocinar", label: t(idioma, "nav.queCocino"), icon: Camera },
        { key: "reparto-comidas", label: t(idioma, "perfilView.repartoComidas.titulo"), icon: PieChart },
      ],
    },
    {
      key: "peso-root", label: t(idioma, "perfilRoot.seguimientoPeso"), icon: Scale,
      children: [
        { key: "perfil-peso", label: t(idioma, "drawer.registroPeso"), icon: Scale },
        { key: "perfil-medidas", label: t(idioma, "perfilRoot.medidasCorporales"), icon: Ruler },
        { key: "perfil-resumen", label: t(idioma, "perfilRoot.resumenMensual"), icon: TrendingUp },
      ],
    },
    { key: "actividad-diaria", label: t(idioma, "drawer.actividadDiaria"), icon: Activity },
    { key: "perfil-documentos", label: t(idioma, "perfilRoot.documentos"), icon: FileText },
    { key: "perfil-premium", label: premium.active ? t(idioma, "perfilRoot.premium") : t(idioma, "perfilRoot.hazteremium"), icon: Sparkles },
  ];
  const abajo = [
    { key: "compartir", label: t(idioma, "drawer.compartir"), icon: Share2 },
    { key: "feedback", label: t(idioma, "drawer.feedback"), icon: Mail },
    { key: "ajustes", label: t(idioma, "drawer.ajustes"), icon: Settings },
    { key: "perfil-datos", label: t(idioma, "tab.perfil"), icon: User },
  ];

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,0.4)", zIndex: 40 }}
      />
      <div
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: "min(78vw, 280px)", zIndex: 41,
          background: "var(--paper)", boxShadow: "3px 0 22px rgba(0,0,0,0.22)",
          display: "flex", flexDirection: "column", padding: "18px 12px 16px", boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          aria-label={t(idioma, "drawer.cerrar")}
          style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", padding: 6, marginBottom: 6 }}
        >
          <X size={19} color="var(--ink-soft)" />
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {arriba.map((item) => (
            <React.Fragment key={item.key}>
              <DrawerItem
                item={item}
                active={tab === item.key}
                onClick={() => ir(item.key)}
                expandible={!!item.children}
                expandido={!!expandido[item.key]}
                onToggleExpandir={() => alternarExpandido(item.key)}
                idioma={idioma}
              />
              {item.children && expandido[item.key] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 15, borderLeft: "1.5px solid var(--line)", paddingLeft: 8, marginBottom: 4 }}>
                  {item.children.map((sub) => (
                    <DrawerItem key={sub.key} item={sub} active={tab === sub.key} onClick={() => ir(sub.key)} small />
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {abajo.map((item) => (
            <DrawerItem key={item.key} item={item} active={tab === item.key} onClick={() => ir(item.key)} />
          ))}
        </div>
      </div>
    </>
  );
}

function DrawerItem({ item, active, onClick, expandible, expandido, onToggleExpandir, small, idioma }) {
  const Icon = item.icon;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button
        onClick={onClick}
        style={{
          display: "flex", alignItems: "center", gap: small ? 9 : 11, textAlign: "left", flex: 1, minWidth: 0,
          padding: small ? "8px 9px" : "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: active ? "var(--green-soft)" : "transparent",
        }}
      >
        <Icon size={small ? 15 : 17} color={active ? "var(--green-dark)" : "var(--ink-soft)"} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: small ? 12.5 : 13.5,
            fontWeight: active ? 700 : 500, color: active ? "var(--green-dark)" : "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </span>
      </button>
      {expandible && (
        <button
          onClick={onToggleExpandir}
          aria-label={t(idioma, expandido ? "drawer.colapsar" : "drawer.expandir")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", flexShrink: 0 }}
        >
          <ChevronDown
            size={15} color="var(--ink-soft)"
            style={{ transform: expandido ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        </button>
      )}
    </div>
  );
}
