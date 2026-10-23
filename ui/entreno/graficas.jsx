// ---------- ui/entreno/graficas.jsx ----------
// Progreso de un ejercicio en la ficha. Primera versión: el 1RM estimado y el volumen de cada sesión en
// una lista (las gráficas llegan en la fase C4).
import React from "react";
import { t } from "i18n";
import { mejoresDeEjercicioEnSesion } from "entreno-calculo";
import { FUENTE_TEXTO, FUENTE_MONO } from "../estilos.js";
import { TextoSuave, fechaCorta, textoPeso } from "./comun.jsx";

export function GraficasEjercicio({ veces, ejercicio, entreno, idioma, listo }) {
  if (!veces.length) return <TextoSuave>{listo ? t(idioma, "entreno.ficha.sinHistorial") : t(idioma, "loading.cargando")}</TextoSuave>;
  return (
    <div>
      {veces.map(({ sesion, ej }) => {
        const m = mejoresDeEjercicioEnSesion(ej, ejercicio.tipo, entreno.pesoCorporal);
        return (
          <div key={sesion.id + ej.inst} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line)", fontFamily: FUENTE_TEXTO, fontSize: 13 }}>
            <span style={{ width: 70, color: "var(--ink-soft)" }}>{fechaCorta(sesion.inicio, idioma)}</span>
            <span style={{ flex: 1, fontFamily: FUENTE_MONO }}>{m.e1rm ? textoPeso(m.e1rm, entreno.ajustes, idioma) : "—"}</span>
            <span style={{ fontFamily: FUENTE_MONO }}>{m.volumenSesion ? textoPeso(m.volumenSesion, entreno.ajustes, idioma) : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
