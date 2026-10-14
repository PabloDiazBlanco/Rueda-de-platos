// ---------- ui/peso/resumen-mensual.jsx ----------
// Resumen mensual: comidas completadas (gratis) y peso y objetivo del mes (premium).
import React from "react";
import { fmt } from "macros";
import { OBJETIVO_ETAPAS, calcularObjetivosPerfil } from "objetivos";
import { calcularTendenciaPeso } from "peso";
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { PesoLineChart } from "./grafica.jsx";
import { PremiumRequiredNotice } from "../premium/premium.jsx";

// ---------- Resumen mensual (f3-11) ----------
// Disponible para todos: la fracción de comidas completadas ya se ve en el plan gratis. Lo que
// cambia con premium es la profundidad — objetivo actual, peso del mes y su gráfica de
// tendencia (el mismo PesoLineChart que ya usa Seguimiento de peso, solo que aquí recibe las
// pesadas ya filtradas a este mes en concreto) — y la frase de cierre que junta todo.
export function ResumenMensualView({ data, premium, onGoPremium, idioma }) {
  const hoy = new Date();
  const mesISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const nombreMes = hoy.toLocaleDateString(idioma === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" });

  const resumen = calcularResumenMensual(data, mesISO, hoy);
  const objetivosCalculados = calcularObjetivosPerfil(data.perfil);
  const etapa = objetivosCalculados ? OBJETIVO_ETAPAS[objetivosCalculados.objetivo] : null;
  const pesoDelMes = pesoEnMes(data.pesoTracking, mesISO);
  const tendenciaDelMes = pesoDelMes ? calcularTendenciaPeso(pesoDelMes.entradas) : null;

  return (
    <>
      <SectionIntro text={t(idioma, "resumenMensual.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px", marginBottom: 16, maxWidth: 480, textAlign: premium.active ? "left" : "center" }}>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "capitalize", marginBottom: 4 }}>
            {nombreMes}
          </div>
        )}
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 40, color: "var(--green-dark)", lineHeight: 1 }}>
          {resumen.porcentaje}%
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
          {t(idioma, "resumenMensual.completadas", { completadas: resumen.completadas, esperadas: resumen.esperadas })}
        </div>
        {!premium.active && (
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            {t(idioma, "resumenMensual.basadoEn", { n: resumen.comidasPorDia })}
          </div>
        )}
      </div>

      {premium.active ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px", maxWidth: 480 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "capitalize", marginBottom: 12 }}>
            {nombreMes}
          </div>

          {etapa && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "resumenMensual.objetivoActual")}</span>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>
                {t(idioma, "objetivoEtapa." + objetivosCalculados.objetivo)}<br />{t(idioma, "resumenMensual.kcalDia", { n: objetivosCalculados.kcal })}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "resumenMensual.pesoEsteMes")}</span>
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
              {pesoDelMes ? (
                <>
                  {fmt(pesoDelMes.inicio)} → {fmt(pesoDelMes.fin)} kg{" "}
                  <span style={{ color: "var(--green)" }}>({pesoDelMes.delta > 0 ? "+" : ""}{fmt(pesoDelMes.delta)} kg)</span>
                </>
              ) : (
                t(idioma, "resumenMensual.sinPesadas")
              )}
            </span>
          </div>

          {pesoDelMes && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
                {t(idioma, "resumenMensual.tendenciaDe", { mes: nombreMes })}
              </div>
              <PesoLineChart entradas={pesoDelMes.entradas} tendencia={tendenciaDelMes} />
            </div>
          )}

          <div
            style={{
              marginTop: 16, background: "var(--green-soft)", borderRadius: 8, padding: "12px 14px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink)", lineHeight: 1.5,
            }}
          >
            {t(idioma, "resumenMensual.hasCompletado", { pct: resumen.porcentaje })}
            {pesoDelMes ? (
              <>{t(idioma, "resumenMensual.yTuPeso")} {pesoDelMes.delta < 0 ? t(idioma, "resumenMensual.pesoBajado") : pesoDelMes.delta > 0 ? t(idioma, "resumenMensual.pesoSubido") : t(idioma, "resumenMensual.pesoMantenido")}
              {pesoDelMes.delta !== 0 ? t(idioma, "resumenMensual.esteMesKg", { kg: fmt(Math.abs(pesoDelMes.delta)) }) : t(idioma, "resumenMensual.esteMes")}</>
            ) : (
              t(idioma, "resumenMensual.esteMes")
            )}
          </div>
        </div>
      ) : (
        <PremiumRequiredNotice
          titulo={t(idioma, "premiumNotice.resumen.titulo")}
          texto={t(idioma, "premiumNotice.resumen.texto")}
          onGoPremium={onGoPremium}
          idioma={idioma}
        />
      )}
    </>
  );
}
