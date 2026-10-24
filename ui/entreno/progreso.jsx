// ---------- ui/entreno/progreso.jsx ----------
// «Progreso» (destino `entreno-progreso`; diseño, §4.8): series por grupo muscular de la semana actual
// frente a la media de las 4 anteriores (barras horizontales: la versión legible del «radar» de otras
// apps), y entrenos y volumen por semana de las últimas 12. Sin «zona recomendada» de series: no se
// pone ninguna cifra objetivo hasta tener una investigación propia que la respalde, como el resto de
// cifras de FoodDraft (diseño, §6.8); solo se enseña lo hecho.
import React from "react";
import { t } from "i18n";
import { seriesPorMusculo, semanaDe, sumarDias, semanasRecientes, fechaLocal } from "entreno-calculo";
import { FUENTE_TEXTO } from "../estilos.js";
import { TextoSuave, TituloSeccion, formatoNumero, textoPeso } from "./comun.jsx";
import { GraficaBarras } from "./graficas.jsx";
import { useTodasLasSesiones } from "./ficha.jsx";

const SEMANAS = 12;

export function ProgresoView({ entreno, idioma }) {
  const { listo, sesiones } = useTodasLasSesiones(entreno);
  const inicioSemana = entreno.ajustes.inicioSemana;
  const hoy = fechaLocal(Date.now());
  const estaSemana = semanaDe(hoy, inicioSemana);

  const actual = seriesPorMusculo(sesiones, entreno.ejercicioDe, estaSemana, sumarDias(estaSemana, 6));
  const previas = seriesPorMusculo(sesiones, entreno.ejercicioDe, sumarDias(estaSemana, -28), sumarDias(estaSemana, -1));
  const musculos = [...new Set([...Object.keys(actual), ...Object.keys(previas)])]
    .map((m) => ({ m, actual: actual[m] || 0, media: (previas[m] || 0) / 4 }))
    .sort((a, b) => b.actual - a.actual || b.media - a.media);
  const maximo = Math.max(1, ...musculos.map((x) => Math.max(x.actual, x.media)));

  const semanas = semanasRecientes(sesiones, entreno.ejercicioDe, entreno.pesoCorporal, inicioSemana, hoy, SEMANAS);
  const x = (s) => new Date(s.semana + "T12:00:00").getTime();
  const hayAlgo = semanas.some((s) => s.entrenos);

  if (!listo) return <TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave>;

  return (
    <div>
      <TituloSeccion>{t(idioma, "entreno.progreso.seriesMusculo")}</TituloSeccion>
      <TextoSuave style={{ fontSize: 12, marginBottom: 10 }}>{t(idioma, "entreno.progreso.seriesAyuda")}</TextoSuave>
      {!musculos.length && <TextoSuave>{t(idioma, "entreno.progreso.sinSeries")}</TextoSuave>}
      <div role="list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {musculos.map(({ m, actual: a, media }) => (
          <div key={m} role="listitem" aria-label={t(idioma, "entreno.progreso.filaMusculo", { musculo: t(idioma, "musculo." + m), n: formatoNumero(a, idioma), media: formatoNumero(media, idioma) })}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FUENTE_TEXTO, fontSize: 13, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{t(idioma, "musculo." + m)}</span>
              <span style={{ color: "var(--ink-soft)" }}>
                <b style={{ color: "var(--ink)" }}>{formatoNumero(a, idioma)}</b> · {t(idioma, "entreno.progreso.media", { n: formatoNumero(media, idioma) })}
              </span>
            </div>
            {/* Barra llena: esta semana. Marca vertical: la media de las 4 anteriores. */}
            <div style={{ position: "relative", height: 10, borderRadius: 5, background: "var(--green-soft)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(a / maximo) * 100}%`, borderRadius: 5, background: "var(--green)" }} />
              {media > 0 && <div style={{ position: "absolute", top: -3, bottom: -3, width: 2, left: `calc(${(media / maximo) * 100}% - 1px)`, background: "var(--mustard-dark)" }} />}
            </div>
          </div>
        ))}
      </div>
      {musculos.length > 0 && (
        <TextoSuave style={{ fontSize: 11.5, marginTop: 8 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--green)", verticalAlign: "-1px" }} /> {t(idioma, "entreno.progreso.leyendaSemana")}
          {"  "}
          <span style={{ display: "inline-block", width: 2, height: 10, background: "var(--mustard-dark)", verticalAlign: "-1px", marginLeft: 8 }} /> {t(idioma, "entreno.progreso.leyendaMedia")}
        </TextoSuave>
      )}

      <TituloSeccion>{t(idioma, "entreno.progreso.entrenosSemana")}</TituloSeccion>
      {hayAlgo ? (
        <GraficaBarras barras={semanas.map((s) => ({ x: x(s), y: s.entrenos }))} formatoY={(v) => formatoNumero(v, idioma, 0)} idioma={idioma} titulo={t(idioma, "entreno.progreso.entrenosSemana")} />
      ) : <TextoSuave>{t(idioma, "entreno.progreso.sinSeries")}</TextoSuave>}

      <TituloSeccion>{t(idioma, "entreno.progreso.volumenSemana")}</TituloSeccion>
      {hayAlgo && (
        <GraficaBarras barras={semanas.map((s) => ({ x: x(s), y: s.volumen }))} formatoY={(v) => textoPeso(v, entreno.ajustes, idioma)} idioma={idioma} titulo={t(idioma, "entreno.progreso.volumenSemana")} color="var(--olive)" />
      )}
    </div>
  );
}
