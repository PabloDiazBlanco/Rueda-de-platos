// ---------- ui/comun/tarjetas.jsx ----------
// Piezas de presentación reutilizadas en muchas pantallas: introducciones, rejillas de tarjetas,
// enlaces de vuelta, distintivos de macros y de suma de probabilidades.
import React from "react";
import { Plus, AlertCircle } from "lucide-react";
import { t } from "i18n";

// Rejilla de tarjetas grandes: se reutiliza tanto para el nivel 2 (Macros / Comidas especiales /
// Combinaciones / Alimentos) como para el nivel 3 (las categorías dentro de cada grupo).
export function BigCardGrid({ cards, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={{
              cursor: "pointer", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
              padding: "18px 12px", textAlign: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <Icon size={24} color={c.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13.5, fontWeight: 700, color: c.color }}>{c.label}</div>
            {c.desc && <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>{c.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

export function BackLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14,
        fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
        display: "flex", alignItems: "center", gap: 4,
      }}
    >
      ← {label}
    </button>
  );
}

export function MacroPill({ label, value, color, bg }) {
  return (
    <span
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 11, fontWeight: 700, color, background: bg,
        padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
      }}
    >
      {label} {value}
    </span>
  );
}

export function SectionIntro({ text }) {
  return (
    <p
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 13,
        color: "var(--ink-soft)",
        maxWidth: 640,
        margin: "4px 0 18px 0",
        lineHeight: 1.5,
      }}
    >
      {text}
    </p>
  );
}

export function ProbabilitySumBadge({ total, idioma }) {
  const ok = total === 100;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 12px",
        borderRadius: 20,
        marginBottom: 16,
        background: ok ? "var(--green-soft)" : "var(--rust-soft)",
        color: ok ? "var(--green-dark)" : "var(--rust)",
      }}
    >
      {!ok && <AlertCircle size={13} />}
      {t(idioma, "catalogo.sumaActual", { n: total, estado: ok ? t(idioma, "catalogo.correcto") : t(idioma, "catalogo.deberiaSer100") })}
    </div>
  );
}

export function CardGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

export function AddCard({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1.5px dashed var(--line)",
        background: "transparent",
        borderRadius: 10,
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "var(--ink-soft)",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: 12.5,
        minHeight: 78,
      }}
    >
      <Plus size={18} />
      {label}
    </button>
  );
}
