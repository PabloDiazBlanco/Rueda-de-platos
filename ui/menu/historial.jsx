// ---------- ui/menu/historial.jsx ----------
// Historial de ciclos de menú generados (compartido por Menú completo y Menú simple).
import React from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";

export function HistoryPanel({ history, idioma }) {
  if (!history || history.length === 0) return null;
  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "menu.historial.titulo")}</div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        {t(idioma, "menu.historial.explicacion")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((h) => {
          const closed = h.slots.find((s) => s.closedDish);
          const date = new Date(h.generatedAt);
          const dateLabel = date.toLocaleDateString(idioma === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={h.id}
              style={{
                fontFamily: FUENTE_TEXTO,
                fontSize: 12,
                color: "var(--ink-soft)",
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{dateLabel}</span>
              {closed && <span>{t(idioma, "menu.historial.platoCerrado", { nombre: closed.closedDish })}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
