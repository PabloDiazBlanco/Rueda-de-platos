// ---------- ui/marco/cabecera.jsx ----------
// El marco común de la app: Shell (variables de color, tipografía y estilos de impresión), la
// cabecera y el indicador de guardado.
import React from "react";
import { Check, Menu } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

export function Shell({ children }) {
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
        "--olive": "#7a7a1f",
        "--olive-soft": "#f0eed6",
        "--citrus": "#c2662d",
        "--citrus-soft": "#f5e2d3",
        // Cristal de la barra inferior (ui/marco/barra-inferior.jsx): fondo de tarjeta al 72 % (con
        // desenfoque detrás), borde verde oscuro translúcido y la cápsula de la pestaña activa.
        "--cristal": "rgba(255,253,247,0.72)",
        "--cristal-borde": "rgba(31,77,56,0.14)",
        "--cristal-activo": "rgba(47,107,79,0.14)",
        background: "var(--paper)",
        minHeight: "100%",
        fontFamily: FUENTE_TITULOS,
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

export function Header({ saveState, idioma, onOpenMenu }) {
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
      {/* Abre el menú lateral (ver DrawerMenu) — sustituye a la barra de pestañas de antes. Vive
          en el propio Header porque este se pinta una sola vez fuera de <main>, así que el botón
          queda accesible desde cualquier pantalla sin tener que repetirlo en cada una. */}
      <button
        onClick={onOpenMenu}
        aria-label={t(idioma, "drawer.abrir")}
        style={{
          position: "absolute", top: 22, left: 22, zIndex: 2,
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
          padding: 7, display: "flex", cursor: "pointer",
        }}
      >
        <Menu size={19} color="#fff" />
      </button>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", position: "relative", paddingLeft: 42 }}>
        <div>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginBottom: 4 }}>
            FoodDraft
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 400, letterSpacing: 0.3 }}>{t(idioma, "header.tuRecetario")}</h1>
        </div>
        <SaveIndicator state={saveState} idioma={idioma} />
      </div>
    </header>
  );
}

function SaveIndicator({ state, idioma }) {
  const label = state === "saving" ? t(idioma, "header.guardando") : state === "saved" ? t(idioma, "header.guardado") : "";
  if (!label) return <div style={{ width: 1 }} />;
  return (
    <div
      style={{
        fontFamily: FUENTE_TEXTO,
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
