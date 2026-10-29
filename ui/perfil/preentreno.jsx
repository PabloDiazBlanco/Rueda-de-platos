// ---------- ui/perfil/preentreno.jsx ----------
// Preentreno, versión mínima (D3, 25-oct-2026): cuándo se entrena (días, mañana / tarde / noche y antes o
// después de qué comida) y, según eso, una **recomendación** transparente sobre comer algo antes. No toca el
// reparto de macros ni ninguna fórmula: solo informa (la regla está en recomendacionPreentreno,
// logica/objetivos.js, con sus casos en validacion/). Se pregunta al final del asistente de alta (paso del
// reparto, porque depende de qué comidas hay) y se edita en «Actividad diaria»; en los días de entreno, el
// menú enseña una línea corta.
import React from "react";
import { Dumbbell } from "lucide-react";
import { t } from "i18n";
import { DAYS } from "comun";
import { FRANJAS_ENTRENO, recomendacionPreentreno } from "objetivos";
import { Field, inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

const chip = (activo) => ({
  fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, padding: "7px 10px", minHeight: 36, borderRadius: 8,
  border: "1px solid var(--line)", background: activo ? "var(--green-dark)" : "#fff", color: activo ? "#fff" : "var(--ink)", cursor: "pointer",
});

// `valor` = { diasEntreno, horaEntreno, entrenoComida } y `onCambio(parcial)`; `comidas`: las del reparto.
export function MomentoEntrenoFields({ valor, onCambio, comidas, idioma }) {
  const dias = valor.diasEntreno || [];
  const ec = valor.entrenoComida;
  const valorSelect = ec ? `${ec.momento}|${ec.comida}` : "";
  return (
    <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)" }}>
        <Dumbbell size={15} /> {t(idioma, "preentreno.titulo")}
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", margin: "2px 0 10px", lineHeight: 1.4 }}>{t(idioma, "preentreno.ayuda")}</div>

      <Field label={t(idioma, "preentreno.dias")}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {DAYS.map((d) => {
            const activo = dias.includes(d);
            return (
              <button
                key={d}
                onClick={() => onCambio({ diasEntreno: activo ? dias.filter((x) => x !== d) : DAYS.filter((x) => x === d || dias.includes(x)) })}
                aria-pressed={activo}
                aria-label={t(idioma, "dia." + d)}
                style={{ ...chip(activo), minWidth: 40 }}
              >
                {t(idioma, "menu.diaCorto." + d)}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={t(idioma, "preentreno.franja")}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[...FRANJAS_ENTRENO, null].map((f) => (
            <button key={String(f)} onClick={() => onCambio({ horaEntreno: f })} aria-pressed={valor.horaEntreno === f} style={chip((valor.horaEntreno ?? null) === f)}>
              {t(idioma, "preentreno.franja." + (f || "varia"))}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t(idioma, "preentreno.respecto")}>
        <select
          value={valorSelect}
          onChange={(e) => {
            const [momento, comida] = e.target.value.split("|");
            onCambio({ entrenoComida: e.target.value ? { momento, comida } : null });
          }}
          style={{ ...inputStyle, minHeight: 40 }}
        >
          <option value="">{t(idioma, "preentreno.noSe")}</option>
          {comidas.map((c) => <option key={"a" + c} value={`antes|${c}`}>{t(idioma, "preentreno.antesDe", { comida: t(idioma, "mealType." + c) })}</option>)}
          {comidas.map((c) => <option key={"d" + c} value={`despues|${c}`}>{t(idioma, "preentreno.despuesDe", { comida: t(idioma, "mealType." + c) })}</option>)}
        </select>
      </Field>

      <AvisoPreentreno perfil={valor} idioma={idioma} />
    </div>
  );
}

// La recomendación completa (en el asistente y en Actividad diaria), o nada si no hay respuesta.
export function AvisoPreentreno({ perfil, idioma }) {
  const r = recomendacionPreentreno(perfil);
  if (!r) return null;
  return (
    <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink)", background: "var(--green-soft)", borderRadius: 8, padding: "10px 12px" }}>
      {t(idioma, "preentreno.recomendacion." + r.tipo, { comida: r.comida ? t(idioma, "mealType." + r.comida) : "" })}
      {r.tipo !== "noHace" && !(perfil.diasEntreno || []).length && (
        <div style={{ marginTop: 6, color: "var(--ink-soft)", fontSize: 11.5 }}>{t(idioma, "preentreno.sinDias")}</div>
      )}
    </div>
  );
}

// La línea corta del día del menú en que se entrena (Menú completo y simple). Nada si ese día no se entrena
// o si no hay respuesta.
export function LineaPreentreno({ perfil, day, idioma }) {
  if (!perfil || !(perfil.diasEntreno || []).includes(day)) return null;
  const r = recomendacionPreentreno(perfil);
  if (!r) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 11.5, lineHeight: 1.4, color: "var(--green-dark)", background: "var(--green-soft)", borderRadius: 7, padding: "5px 8px", marginBottom: 8 }}>
      <Dumbbell size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{t(idioma, "preentreno.linea." + r.tipo, { comida: r.comida ? t(idioma, "mealType." + r.comida) : "" })}</span>
    </div>
  );
}
