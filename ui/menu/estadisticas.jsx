// ---------- ui/menu/estadisticas.jsx ----------
// Estadísticas del menú: panel del día, resumen de sal/azúcares/fibra frente a la OMS y el modal
// de objetivos nutricionales.
import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { fmt } from "macros";
import { dayTotals } from "comida-calculo";
import { OBJETIVO_ETAPAS, calcularObjetivosPerfil, objetivosPorComida } from "objetivos";
import { DAYS } from "comun";
import { resumenNutrientesSemana } from "salud-publica";
import { t } from "i18n";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { MacroPill } from "../comun/tarjetas.jsx";
import { NivelBadge } from "../peso/seguimiento.jsx";

export function DayStatsPanel({ data, menu, week, objetivos, idioma }) {
  const [day, setDay] = useState(DAYS[0]);
  const totals = dayTotals(data, menu, week, day);

  const segments = [
    { key: "prot", kcal: totals.prot * 4, color: "var(--green)" },
    { key: "fat", kcal: totals.fat * 9, color: "var(--mustard)" },
    { key: "carb", kcal: totals.carb * 4, color: "var(--coffee)" },
  ];
  const totalForRing = segments.reduce((s, x) => s + x.kcal, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;

  const pct = objetivos?.kcal ? Math.round((totals.kcal / objetivos.kcal) * 100) : null;
  const pctStyle =
    pct === null ? null :
    pct < 90 ? { bg: "var(--mustard-soft)", fg: "var(--mustard-dark)" } :
    pct > 110 ? { bg: "var(--rust-soft)", fg: "var(--rust)" } :
    { bg: "var(--green-soft)", fg: "var(--green-dark)" };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700,
              padding: "6px 13px", borderRadius: 20, border: "1px solid var(--line)", flexShrink: 0,
              background: d === day ? "var(--green-dark)" : "var(--paper)",
              color: d === day ? "#fff" : "var(--ink)",
            }}
          >
            {t(idioma, "dia." + d).slice(0, 3)}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 12px" }}>
        <svg viewBox="0 0 180 180" width="180" height="180">
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--paper)" strokeWidth="20" />
          {segments.map((s) => {
            const len = (s.kcal / totalForRing) * C;
            const dashoffset = -acc;
            acc += len;
            return (
              <circle
                key={s.key} cx="90" cy="90" r={R} fill="none" stroke={s.color} strokeWidth="20"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={dashoffset}
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 25, fontWeight: 700, color: "var(--green-dark)" }}>{Math.round(totals.kcal)}</div>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>kcal</div>
        </div>
      </div>

      {pct !== null && (
        <div style={{ textAlign: "center", marginBottom: 13 }}>
          <span style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
            padding: "4px 11px", borderRadius: 20, background: pctStyle.bg, color: pctStyle.fg,
          }}>
            {t(idioma, "dayStats.pctObjetivo", { pct, kcal: objetivos.kcal })}
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
        <MacroPill label="P" value={`${fmt(totals.prot)}g`} color="var(--green-dark)" bg="var(--green-soft)" />
        <MacroPill label="G" value={`${fmt(totals.fat)}g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
        <MacroPill label="C" value={`${fmt(totals.carb)}g`} color="var(--coffee)" bg="var(--coffee-soft)" />
      </div>

      {!objetivos?.kcal && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 13, textAlign: "center" }}>
          {t(idioma, "dayStats.fijaObjetivo")}
        </div>
      )}
    </div>
  );
}

// Media diaria de sal, azúcares y fibra de la semana del menú actual, comparada contra los
// umbrales de la OMS (ver logica/salud-publica.js). El umbral de azúcar se ajusta a tu objetivo de
// kcal si lo tienes calculado; si no, usa la dieta de referencia de 2000 kcal del propio estudio.
export function ResumenSaludPublica({ data, menu, week, objetivos, idioma }) {
  const resumen = resumenNutrientesSemana(data, menu, week, objetivos?.kcal);
  if (!resumen) return null;

  const filas = [
    { key: "sal", label: t(idioma, "saludPublica.sal"), unidad: "g", info: resumen.sal, detalle: t(idioma, "saludPublica.detalleSal", { n: resumen.sal.umbral }) },
    { key: "azucares", label: t(idioma, "saludPublica.azucares"), unidad: "g", info: resumen.azucares, detalle: t(idioma, "saludPublica.detalleAzucares", { optimo: fmt(resumen.azucares.umbralOptimo), maximo: fmt(resumen.azucares.umbralMaximo) }) },
    { key: "fibra", label: t(idioma, "saludPublica.fibra"), unidad: "g", info: resumen.fibra, detalle: t(idioma, "saludPublica.detalleFibra", { n: resumen.fibra.umbral }) },
  ];

  const avisos = ["sal", "azucares", "fibra"].filter((k) => resumen.faltanDatos[k].length > 0);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
        {t(idioma, "saludPublica.titulo")}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 12 }}>
        {t(idioma, "saludPublica.sobreDias", { dias: resumen.dias, plural: resumen.dias === 1 ? "" : "s" })}
        {resumen.azucares.kcalPersonalizada ? t(idioma, "saludPublica.azucarAjustado") : ""}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filas.map((f) => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink)" }}>
                {f.label}: <strong>{fmt(f.info.media)} {f.unidad}/día</strong>
              </div>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>{f.detalle}</div>
            </div>
            <NivelBadge nivel={f.info.nivel} idioma={idioma} />
          </div>
        ))}
      </div>

      {avisos.length > 0 && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--mustard-dark)", marginTop: 12, lineHeight: 1.5 }}>
          {t(idioma, "saludPublica.calculoIncompleto", { lista: avisos.map((k) => t(idioma, "saludPublica." + k + ".nombre")).join(", ") })}
        </div>
      )}
    </div>
  );
}

export function ObjetivosModal({ objetivos, perfil, onClose, idioma }) {
  const objetivosCalculados = calcularObjetivosPerfil(perfil);

  return (
    <ModalShell onClose={onClose} title={t(idioma, "objetivosModal.titulo")}>
      {!objetivosCalculados ? (
        <>
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--mustard-dark)",
              background: "var(--mustard-soft)", borderRadius: 8, padding: "12px 14px", display: "flex",
              alignItems: "flex-start", gap: 8, lineHeight: 1.5,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t(idioma, "objetivosModal.perfilIncompleto")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-dark)" }}>{objetivosCalculados.kcal}</div>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)" }}>{t(idioma, "objetivosModal.kcalDia")}</div>
            {objetivosCalculados.kcalEntrenamiento > 0 && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                {t(idioma, "objetivosModal.desglose", { base: objetivosCalculados.kcalBase, entrenamiento: objetivosCalculados.kcalEntrenamiento })}
              </div>
            )}
            {objetivosCalculados.objetivo !== "mantenimiento" && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                {t(idioma, "objetivosModal.tdee", {
                  kcal: objetivosCalculados.kcalMantenimiento,
                  etapa: OBJETIVO_ETAPAS[objetivosCalculados.objetivo].label,
                  signo: objetivosCalculados.ajustePct > 0 ? "+" : "",
                  pct: objetivosCalculados.ajustePct,
                })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            <MacroPill label={t(idioma, "objetivosModal.proteina")} value={`${objetivosCalculados.prot}g`} color="var(--green-dark)" bg="var(--green-soft)" />
            <MacroPill label={t(idioma, "objetivosModal.grasa")} value={`${objetivosCalculados.fat}g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
            <MacroPill label={t(idioma, "objetivosModal.carbos")} value={`${objetivosCalculados.carb}g`} color="var(--coffee)" bg="var(--coffee-soft)" />
          </div>

          {objetivosCalculados.carbMinNotMet && (
            <div
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--mustard-dark)",
                background: "var(--mustard-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 16,
                display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {t(idioma, "objetivosModal.carbMinAviso", { carbMin: objetivosCalculados.carbMin, fatFloor: objetivosCalculados.fatFloor })}
              </span>
            </div>
          )}

          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {t(idioma, "objetivosModal.repartoPorComida")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {Object.keys(perfil.repartoComidas).map((mealType) => {
              const sub = objetivosPorComida(objetivosCalculados, mealType, perfil.repartoComidas);
              return (
                <div
                  key={mealType}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5,
                    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 11px",
                  }}
                >
                  <span>{t(idioma, "mealType." + mealType)} <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>({Math.round(perfil.repartoComidas[mealType] * 100)}%)</span></span>
                  <span style={{ color: "var(--ink-soft)" }}>
                    {sub.kcal} kcal · P{sub.prot} · G{sub.fat} · C{sub.carb}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)",
              background: "var(--paper)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5,
            }}
          >
            {t(idioma, "objetivosModal.formula")}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="solid">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      )}
    </ModalShell>
  );
}
