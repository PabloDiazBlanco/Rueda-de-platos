// ---------- ui/marco/menu-lateral.jsx ----------
// Menú lateral (drawer): la puerta de entrada a cualquier función de la app.
import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";
import { AREAS, COMUNES } from "./navegacion.js";

// ---------- Menú lateral (drawer) ----------
// Desde la navegación por áreas (octubre de 2026) lo que lista sale de ui/marco/navegacion.js: arriba,
// cada área (FoodDraft, Entrenamiento, Cuerpo) con todas sus funciones; abajo, lo común (Compartir,
// Ayuda, Documentos, Premium, Ajustes, Perfil). Tocar el nombre de un área lleva a la última pantalla
// que se visitó en ella (`onIrAArea`, lo resuelve app.jsx); tocar la flecha despliega sus funciones ahí
// mismo, sin navegar — mismo patrón que tenía el menú desde la Tanda 2 con Configuración y Peso. El área
// en la que se está sale resaltada y desplegada al abrir el menú, para que nunca haya dudas de dónde
// se está.
export function DrawerMenu({ open, onClose, tab, area, setTab, onIrAArea, idioma, premium }) {
  // Lo que el usuario ha desplegado o plegado a mano; si no ha tocado un área, se despliega sola la
  // actual.
  const [expandido, setExpandido] = useState({});

  function ir(destino) {
    setTab(destino);
    onClose();
  }
  function irAArea(clave) {
    onIrAArea(clave);
    onClose();
  }
  function alternarExpandido(clave, abierto) {
    setExpandido((e) => ({ ...e, [clave]: !abierto }));
  }

  if (!open) return null;

  // Un área sin ninguna pantalla todavía (p. ej. Entrenamiento antes de tener las suyas) no se lista.
  const areas = AREAS.filter((a) => a.pestanas.length || a.menu.length);

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
          {areas.map((a) => {
            const abierto = expandido[a.clave] ?? a.clave === area;
            return (
              <React.Fragment key={a.clave}>
                <DrawerItem
                  icono={a.icono}
                  label={t(idioma, a.etiqueta)}
                  resaltado={a.clave === area}
                  onClick={() => irAArea(a.clave)}
                  expandible={a.menu.length > 0}
                  expandido={abierto}
                  onToggleExpandir={() => alternarExpandido(a.clave, abierto)}
                  idioma={idioma}
                />
                {a.menu.length > 0 && abierto && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 15, borderLeft: "1.5px solid var(--line)", paddingLeft: 8, marginBottom: 4 }}>
                    {a.menu.map((m) => (
                      <DrawerItem
                        key={m.destino}
                        icono={m.icono}
                        label={t(idioma, m.etiqueta)}
                        actual={tab === m.destino}
                        onClick={() => ir(m.destino)}
                        small
                      />
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {COMUNES.map((c) => (
            <DrawerItem
              key={c.destino}
              icono={c.icono}
              color={c.color}
              label={t(idioma, premium.active && c.etiquetaPremium ? c.etiquetaPremium : c.etiqueta)}
              resaltado={tab === c.destino}
              actual={tab === c.destino}
              onClick={() => ir(c.destino)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// `resaltado`: fondo verde suave (el área en la que se está, o la pantalla común abierta). `actual`:
// texto en negrita (la pantalla abierta ahora mismo). `color`: color propio del icono (Premium, en
// mostaza, para que no parezca una función más).
function DrawerItem({ icono: Icon, label, color, resaltado, actual, onClick, expandible, expandido, onToggleExpandir, small, idioma }) {
  const verde = resaltado || actual;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button
        onClick={onClick}
        aria-current={actual ? "page" : undefined}
        style={{
          display: "flex", alignItems: "center", gap: small ? 9 : 11, textAlign: "left", flex: 1, minWidth: 0,
          padding: small ? "8px 9px" : "10px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: resaltado ? "var(--green-soft)" : "transparent",
        }}
      >
        <Icon size={small ? 15 : 17} color={color || (verde ? "var(--green-dark)" : "var(--ink-soft)")} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: small ? 12.5 : 13.5,
            fontWeight: actual || (resaltado && !small) ? 700 : 500, color: verde ? "var(--green-dark)" : "var(--ink)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </button>
      {expandible && (
        <button
          onClick={onToggleExpandir}
          aria-label={t(idioma, expandido ? "drawer.colapsar" : "drawer.expandir")}
          aria-expanded={expandido}
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
