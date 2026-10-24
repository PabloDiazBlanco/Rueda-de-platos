// ---------- ui/peso/resumen-mensual.jsx ----------
// Resumen mensual (área Cuerpo, pestaña «Resumen»): un mes cualquiera (selector anterior / siguiente) en
// tres apartados separados — Nutrición, Entreno y Peso.
//
// Desde octubre de 2026 es gratis (decisión del 23-oct, local/ideas/gimnasio/03-diseno-modulo-entreno.md,
// §9): los resúmenes por separado son información del propio usuario que se calcula en el móvil, sin coste
// de servidor. Solo el apartado de Peso sigue necesitando premium, porque sus datos salen del seguimiento
// de peso, que lo es. Lo que de verdad aporta valor extra — juntar entreno, comida y peso para
// interpretarlos — son los informes cruzados (ui/cuerpo/informes.jsx), y esos son premium.
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt } from "macros";
import { OBJETIVO_ETAPAS, calcularObjetivosPerfil } from "objetivos";
import { calcularTendenciaPeso } from "peso";
import { calcularResumenMensual, pesoEnMes } from "resumen-mensual";
import { resumenEntrenoMes } from "entreno-calculo";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { PesoLineChart } from "./grafica.jsx";
import { PremiumRequiredNotice } from "../premium/premium.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { nombreMes, textoPeso, duracionTexto, formatoNumero } from "../entreno/comun.jsx";

function sumarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Apartado({ titulo, children }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginBottom: 14, maxWidth: 480 }}>
      <h3 style={{ margin: "0 0 10px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)" }}>{titulo}</h3>
      {children}
    </section>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>{etiqueta}</span>
      <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{valor}</span>
    </div>
  );
}

export function ResumenMensualView({ data, premium, onGoPremium, idioma, entreno }) {
  const hoy = new Date();
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(actual);
  const anterior = sumarMes(mes, -1);

  // Los entrenos se guardan por meses y se leen bajo demanda: este mes y el anterior (para comparar).
  useEffect(() => {
    if (!entreno) return;
    entreno.cargarMes(mes).catch(() => {});
    entreno.cargarMes(anterior).catch(() => {});
  }, [mes]);

  const resumen = calcularResumenMensual(data, mes, hoy);
  const objetivosCalculados = calcularObjetivosPerfil(data.perfil);
  const etapa = objetivosCalculados ? OBJETIVO_ETAPAS[objetivosCalculados.objetivo] : null;
  const pesoDelMes = pesoEnMes(data.pesoTracking, mes);
  const tendenciaDelMes = pesoDelMes ? calcularTendenciaPeso(pesoDelMes.entradas) : null;

  const ent = entreno ? resumenEntrenoMes(entreno.sesionesDeMes(mes), entreno.ejercicioDe, entreno.pesoCorporal, { indice: entreno.indice, mes }) : null;
  const entAnt = entreno ? resumenEntrenoMes(entreno.sesionesDeMes(anterior), entreno.ejercicioDe, entreno.pesoCorporal) : null;
  const flecha = { width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, marginBottom: 6 }}>
        <button onClick={() => setMes(anterior)} aria-label={t(idioma, "entreno.historial.mesAnterior")} style={flecha}><ChevronLeft size={20} /></button>
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{nombreMes(mes, idioma)}</h2>
        <button onClick={() => setMes(sumarMes(mes, 1))} disabled={mes >= actual} aria-label={t(idioma, "entreno.historial.mesSiguiente")} style={{ ...flecha, opacity: mes >= actual ? 0.3 : 1, cursor: mes >= actual ? "default" : "pointer" }}><ChevronRight size={20} /></button>
      </div>

      <Apartado titulo={t(idioma, "cuerpo.resumen.nutricion")}>
        <SectionIntro text={t(idioma, "resumenMensual.intro")} />
        <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 40, color: "var(--green-dark)", lineHeight: 1 }}>{resumen.porcentaje}%</div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 10px" }}>
          {t(idioma, "resumenMensual.completadas", { completadas: resumen.completadas, esperadas: resumen.esperadas })}
        </div>
        {etapa && (
          <Fila
            etiqueta={t(idioma, "resumenMensual.objetivoActual")}
            valor={<>{t(idioma, "objetivoEtapa." + objetivosCalculados.objetivo)}<br />{t(idioma, "resumenMensual.kcalDia", { n: objetivosCalculados.kcal })}</>}
          />
        )}
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>{t(idioma, "resumenMensual.basadoEn", { n: resumen.comidasPorDia })}</div>
      </Apartado>

      {ent && (
        <Apartado titulo={t(idioma, "cuerpo.resumen.entreno")}>
          {ent.sesiones ? (
            <>
              <Fila etiqueta={t(idioma, "cuerpo.resumen.entrenos")} valor={ent.sesiones} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.dias")} valor={ent.dias} />
              <Fila etiqueta={t(idioma, "entreno.sesion.volumen")} valor={textoPeso(ent.volumen, entreno.ajustes, idioma)} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.tiempo")} valor={duracionTexto(ent.duracionSeg, idioma)} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.records")} valor={ent.records} />
              {ent.topMusculos.length > 0 && (
                <Fila etiqueta={t(idioma, "cuerpo.resumen.musculos")} valor={ent.topMusculos.map((m) => t(idioma, "musculo." + m.musculo)).join(", ")} />
              )}
              {entAnt.sesiones > 0 && (
                <div style={{ marginTop: 10, background: "var(--green-soft)", borderRadius: 8, padding: "10px 12px", fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5 }}>
                  {t(idioma, "cuerpo.resumen.comparacion", {
                    // A media frase, el mes va en minúscula (salvo en inglés, que lo escribe siempre con mayúscula).
                    mes: idioma === "en" ? nombreMes(anterior, idioma) : nombreMes(anterior, idioma).toLowerCase(),
                    entrenos: `${ent.sesiones - entAnt.sesiones >= 0 ? "+" : ""}${ent.sesiones - entAnt.sesiones}`,
                    volumen: entAnt.volumen > 0 ? `${ent.volumen >= entAnt.volumen ? "+" : ""}${formatoNumero(((ent.volumen - entAnt.volumen) / entAnt.volumen) * 100, idioma, 0)} %` : "—",
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "cuerpo.resumen.sinEntrenos")}</div>
          )}
        </Apartado>
      )}

      {premium.active ? (
        <Apartado titulo={t(idioma, "cuerpo.resumen.peso")}>
          <Fila
            etiqueta={t(idioma, "resumenMensual.pesoEsteMes")}
            valor={pesoDelMes ? (
              <>
                {fmt(pesoDelMes.inicio)} → {fmt(pesoDelMes.fin)} kg{" "}
                <span style={{ color: "var(--green)" }}>({pesoDelMes.delta > 0 ? "+" : ""}{fmt(pesoDelMes.delta)} kg)</span>
              </>
            ) : t(idioma, "resumenMensual.sinPesadas")}
          />
          {pesoDelMes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
                {t(idioma, "resumenMensual.tendenciaDe", { mes: nombreMes(mes, idioma) })}
              </div>
              <PesoLineChart entradas={pesoDelMes.entradas} tendencia={tendenciaDelMes} idioma={idioma} />
            </div>
          )}
          <div style={{ marginTop: 14, background: "var(--green-soft)", borderRadius: 8, padding: "12px 14px", fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
            {t(idioma, "resumenMensual.hasCompletado", { pct: resumen.porcentaje })}
            {pesoDelMes ? (
              <>{t(idioma, "resumenMensual.yTuPeso")} {pesoDelMes.delta < 0 ? t(idioma, "resumenMensual.pesoBajado") : pesoDelMes.delta > 0 ? t(idioma, "resumenMensual.pesoSubido") : t(idioma, "resumenMensual.pesoMantenido")}
              {pesoDelMes.delta !== 0 ? t(idioma, "resumenMensual.esteMesKg", { kg: fmt(Math.abs(pesoDelMes.delta)) }) : t(idioma, "resumenMensual.esteMes")}</>
            ) : t(idioma, "resumenMensual.esteMes")}
          </div>
        </Apartado>
      ) : (
        <div style={{ maxWidth: 480 }}>
          <PremiumRequiredNotice
            titulo={t(idioma, "premiumNotice.resumen.titulo")}
            texto={t(idioma, "premiumNotice.resumen.texto")}
            onGoPremium={onGoPremium}
            idioma={idioma}
          />
        </div>
      )}
    </>
  );
}
