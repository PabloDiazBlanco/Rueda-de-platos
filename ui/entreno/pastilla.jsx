// ---------- ui/entreno/pastilla.jsx ----------
// «● Entreno en curso · Torso · 34:12 ›» (diseño, §3.6): mientras hay una sesión abierta y minimizada,
// esta pastilla queda fija justo encima de la barra inferior (o abajo del todo en las pantallas comunes,
// que no tienen barra), en cualquier área, para volver a la sesión con un toque. Es el equivalente a la
// flecha ˅ de las apps de las capturas: se puede consultar el menú o la despensa sin perder el entreno.
// Capa 31: encima de la barra (30) y debajo del menú lateral (40), los paneles (45) y los modales (50).
import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { t } from "i18n";
import { duracionEfectiva } from "entreno-calculo";
import { FUENTE_TEXTO, FUENTE_MONO } from "../estilos.js";
import { useEscribiendo } from "../marco/barra-inferior.jsx";
import { reloj } from "./comun.jsx";

// Lo que ocupa la pastilla (con su margen): app.jsx lo suma al hueco que <main> deja abajo.
export const ALTO_PASTILLA = 56;

export function PastillaEntreno({ entreno, idioma, hayBarra }) {
  const [ahora, setAhora] = useState(Date.now());
  const escribiendo = useEscribiendo();
  const s = entreno.borrador;
  const visible = !!s && !entreno.sesionVisible;
  useEffect(() => {
    if (!visible) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);
  if (!visible || escribiendo) return null;

  const texto = [t(idioma, "entreno.pastilla.enCurso"), s.nombre].filter(Boolean).join(" · ");
  return (
    <button
      onClick={entreno.mostrarSesion}
      aria-label={`${t(idioma, "entreno.pastilla.volver")}: ${texto}`}
      style={{
        position: "fixed", left: 12, right: 12, maxWidth: 420, margin: "0 auto", zIndex: 31,
        bottom: hayBarra ? "calc(84px + env(safe-area-inset-bottom))" : "calc(12px + env(safe-area-inset-bottom))",
        height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 14px", boxSizing: "border-box",
        borderRadius: 999, border: "none", background: "var(--green-dark)", color: "#fff", cursor: "pointer",
        boxShadow: "0 6px 18px rgba(31,77,56,0.25)", fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
      }}
    >
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mustard)", flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texto}</span>
      <span style={{ fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{reloj(duracionEfectiva(s, ahora))}</span>
      <ChevronRight size={18} />
    </button>
  );
}
