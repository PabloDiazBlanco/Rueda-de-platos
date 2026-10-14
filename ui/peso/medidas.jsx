// ---------- ui/peso/medidas.jsx ----------
// Medidas corporales (pantalla pendiente; hoy solo el aviso de «próximamente»).
import React from "react";
import { Ruler } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";

// ---------- Seguimiento de peso ----------

export function MedidasPlaceholderView({ idioma }) {
  return (
    <div
      style={{
        background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12,
        padding: "34px 22px", textAlign: "center", maxWidth: 460,
      }}
    >
      <Ruler size={26} color="var(--ink-soft)" style={{ marginBottom: 10 }} />
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
        {t(idioma, "medidas.proximamente")}
      </div>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
        {t(idioma, "medidas.texto")}
      </p>
    </div>
  );
}
