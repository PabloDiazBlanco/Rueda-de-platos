// ---------- ui/entreno/progreso.jsx ----------
// «Progreso» (destino `entreno-progreso`; diseño, §4.8): series por grupo muscular de la semana actual
// en el mapa corporal (ui/comun/mapa-corporal.jsx, desde el 26-oct-2026; antes, 14 barras horizontales),
// con la media de las 4 anteriores al tocar cada músculo, y entrenos y volumen por semana de las últimas 12. Sin «zona recomendada» de series: no se
// pone ninguna cifra objetivo hasta tener una investigación propia que la respalde, como el resto de
// cifras de FoodDraft (diseño, §6.8); solo se enseña lo hecho.
import React from "react";
import { t } from "i18n";
import { seriesPorMusculo, semanaDe, sumarDias, semanasRecientes, fechaLocal } from "entreno-calculo";
import { FUENTE_TEXTO } from "../estilos.js";
import { TextoSuave, TituloSeccion, formatoNumero, textoPeso } from "./comun.jsx";
import { GraficaBarras } from "./graficas.jsx";
import { MapaCorporal } from "../comun/mapa-corporal.jsx";
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

  const semanas = semanasRecientes(sesiones, entreno.ejercicioDe, entreno.pesoCorporal, inicioSemana, hoy, SEMANAS);
  const x = (s) => new Date(s.semana + "T12:00:00").getTime();
  const hayAlgo = semanas.some((s) => s.entrenos);

  if (!listo) return <TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave>;

  return (
    <div>
      <TituloSeccion>{t(idioma, "entreno.progreso.seriesMusculo")}</TituloSeccion>
      <TextoSuave style={{ fontSize: 12, marginBottom: 10 }}>{t(idioma, "entreno.progreso.seriesAyuda")}</TextoSuave>
      {!musculos.length && <TextoSuave>{t(idioma, "entreno.progreso.sinSeries")}</TextoSuave>}
      {/* El reparto por músculo es el mapa corporal (criterio de gráficas, 26-oct-2026: nunca 14 barras). Al
          tocar un músculo se leen sus series de esta semana y la media de las 4 anteriores. */}
      {musculos.length > 0 && (
        <MapaCorporal
          valores={Object.fromEntries(musculos.map((x) => [x.m, x.actual]))}
          perfil={entreno.perfil}
          idioma={idioma}
          etiqueta={t(idioma, "entreno.progreso.seriesMusculo")}
          textoDe={(m) => {
            const x = musculos.find((y) => y.m === m) || { actual: 0, media: 0 };
            return t(idioma, "cuerpo.mapa.seriesYMedia", { n: formatoNumero(x.actual, idioma), media: formatoNumero(x.media, idioma) });
          }}
        />
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
