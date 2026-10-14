// ---------- ui/comun/idioma.jsx ----------
// Selector de idioma de la interfaz, con banderas dibujadas en SVG.
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { t, IDIOMAS_DISPONIBLES } from "i18n";
import { inputStyle } from "./modal.jsx";

// ---------- Bandera de un idioma, dibujada a mano en SVG ----------
// No se usan los emoji de bandera (🇪🇸, 🇬🇧...) a propósito: catalán, gallego y euskera no tienen
// código de país ISO, así que su emoji de bandera no existe — y aunque se construyera "a mano" con
// las secuencias de subdivisión de Unicode, no son secuencias reconocidas oficialmente (RGI) fuera
// de las de Reino Unido, así que no se pintarían como bandera en la mayoría de sistemas (aparecería
// un icono roto o nada). Dibujarlas en SVG garantiza que se vean igual en cualquier navegador.
// Las banderas autonómicas (Senyera, la de Galicia, la Ikurriña) son las oficiales de cada
// comunidad, no símbolos partidistas — mismo criterio que usan las webs de sus propios gobiernos.
function FlagIcon({ lang, size = 20 }) {
  const w = Math.round(size * 1.5);
  const vb = "0 0 30 20";
  const wrapStyle = { borderRadius: 3, display: "block", flexShrink: 0 };
  if (lang === "es") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    );
  }
  if (lang === "en") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#00247D" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#CF142B" strokeWidth="1.8" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="6" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#CF142B" strokeWidth="3" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#CF142B" strokeWidth="3" />
      </svg>
    );
  }
  if (lang === "ca") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#FCDD09" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={(20 / 9) * i} width="30" height={20 / 9} fill="#DA121A" />
        ))}
      </svg>
    );
  }
  if (lang === "gl") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#fff" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#0090C4" strokeWidth="5" />
      </svg>
    );
  }
  if (lang === "eu") {
    return (
      <svg width={w} height={size} viewBox={vb} style={wrapStyle}>
        <rect width="30" height="20" fill="#D52B1E" />
        <line x1="0" y1="0" x2="30" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="30" y1="0" x2="0" y2="20" stroke="#009B48" strokeWidth="4.5" />
        <line x1="15" y1="0" x2="15" y2="20" stroke="#fff" strokeWidth="5" />
        <line x1="0" y1="10" x2="30" y2="10" stroke="#fff" strokeWidth="5" />
      </svg>
    );
  }
  return null;
}

// ---------- Selector de idioma buscable, con banderas (Fase de menú lateral) ----------
// Sustituye a la fila de botones de idioma que había antes en Perfil — con 5 idiomas ya no cabían
// bien en una fila, y esta forma escala sin rediseñar si se añaden más adelante. onChange se llama
// al momento al elegir uno (no hace falta un botón "Guardar" aparte): igual que el interruptor de
// notificaciones, es una preferencia que tiene sentido aplicar en el instante, no en un lote.
export function LanguageDropdown({ idioma, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const actual = IDIOMAS_DISPONIBLES.find((i) => i.key === idioma) || IDIOMAS_DISPONIBLES[0];
  const filtrados = IDIOMAS_DISPONIBLES.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()));

  function elegir(key) {
    onChange(key);
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%",
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700,
          padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)",
          cursor: "pointer",
        }}
      >
        <FlagIcon lang={actual.key} size={17} />
        <span style={{ letterSpacing: 0.3 }}>{actual.key.toUpperCase()}</span>
        <span style={{ flex: 1, textAlign: "left", fontWeight: 500, color: "var(--ink-soft)" }}>{actual.label}</span>
        <ChevronDown size={15} color="var(--ink-soft)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 5,
            background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: 8,
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(idioma, "ajustes.idioma.buscar")}
            style={{ ...inputStyle, marginBottom: 6 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
            {filtrados.map((op) => (
              <button
                key={op.key}
                onClick={() => elegir(op.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, textAlign: "left",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, padding: "8px 8px", borderRadius: 6,
                  border: "none", background: op.key === idioma ? "var(--green-soft)" : "transparent", cursor: "pointer",
                }}
              >
                <FlagIcon lang={op.key} size={16} />
                <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>{op.key.toUpperCase()}</span>
                <span style={{ color: "var(--ink-soft)" }}>{op.label}</span>
              </button>
            ))}
            {filtrados.length === 0 && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)", padding: "8px 6px" }}>
                {t(idioma, "ajustes.idioma.sinResultados")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
