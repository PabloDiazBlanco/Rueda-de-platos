// ---------- ui/entreno/progreso.jsx ----------
// «Progreso» (destino `entreno-progreso`; diseño, §4.8): series por grupo muscular de la semana actual
// en el mapa corporal (ui/comun/mapa-corporal.jsx, desde el 26-oct-2026; antes, 14 barras horizontales),
// con la media de las 4 anteriores al tocar cada músculo, y entrenos y volumen por semana. Sin «zona
// recomendada» de series: no se pone ninguna cifra objetivo hasta tener una investigación propia que la
// respalde, como el resto de cifras de FoodDraft (diseño, §6.8); solo se enseña lo hecho.
//
// Con el **criterio de gráficas** de la parte estética (26-oct-2026, bloque FitDraft; ui/cuerpo/graficas.jsx):
// cada tarjeta responde a una pregunta; un solo selector de rango para las dos de semanas (1 mes · 3 meses ·
// 1 año · Todo); verde lo tuyo y mostaza la referencia (aquí, tu media del rango, nunca un objetivo); tocar una
// barra escribe su valor en la línea fija de debajo, y el botón verde «Gráfica» abre la gráfica entera en una
// hoja. El volumen pasó de oliva a verde: el oliva es la grasa de los macros.
import React, { useState } from "react";
import { t } from "i18n";
import { seriesPorMusculo, semanaDe, sumarDias, semanasRecientes, fechaLocal, pesoAPantalla } from "entreno-calculo";
import { FUENTE_TITULOS } from "../estilos.js";
import { TextoSuave, formatoNumero, HojaInferior } from "./comun.jsx";
import { MapaCorporal } from "../comun/mapa-corporal.jsx";
import { useTodasLasSesiones } from "./ficha.jsx";
import { Linea, Lectura, BotonGrafica, SelectorRango, Pie, etiquetaFecha, etiquetaLarga } from "../cuerpo/graficas.jsx";

// Por defecto, 3 meses (lo más parecido a las 12 semanas de antes).
const RANGO_INICIAL = 13;

function Tarjeta({ pregunta, onGrafica, idioma, children }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ flex: 1, margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 17, color: "var(--green-dark)", lineHeight: 1.25 }}>{pregunta}</h3>
        {onGrafica && <BotonGrafica onClick={onGrafica} idioma={idioma} />}
      </div>
      {children}
    </section>
  );
}

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function ProgresoView({ entreno, idioma }) {
  const { listo, sesiones } = useTodasLasSesiones(entreno);
  const [semanasRango, setSemanasRango] = useState(RANGO_INICIAL);
  const [lecturas, setLecturas] = useState({}); // por tarjeta
  const [hoja, setHoja] = useState(null); // "entrenos" | "volumen"
  const [lecturaHoja, setLecturaHoja] = useState(null);
  const inicioSemana = entreno.ajustes.inicioSemana;
  const hoy = fechaLocal(Date.now());
  const estaSemana = semanaDe(hoy, inicioSemana);

  const actual = seriesPorMusculo(sesiones, entreno.ejercicioDe, estaSemana, sumarDias(estaSemana, 6));
  const previas = seriesPorMusculo(sesiones, entreno.ejercicioDe, sumarDias(estaSemana, -28), sumarDias(estaSemana, -1));
  const musculos = [...new Set([...Object.keys(actual), ...Object.keys(previas)])]
    .map((m) => ({ m, actual: actual[m] || 0, media: (previas[m] || 0) / 4 }))
    .sort((a, b) => b.actual - a.actual || b.media - a.media);

  // «Todo»: desde la semana del primer entreno.
  const primera = sesiones.reduce((min, s) => (!min || s.inicio < min ? s.inicio : min), null);
  const n = Number.isFinite(semanasRango)
    ? semanasRango
    : Math.max(4, primera ? Math.round((new Date(estaSemana + "T12:00:00") - new Date(semanaDe(primera, inicioSemana) + "T12:00:00")) / (7 * 86400000)) + 1 : RANGO_INICIAL);
  const semanas = semanasRecientes(sesiones, entreno.ejercicioDe, entreno.pesoCorporal, inicioSemana, hoy, n);
  const hayAlgo = semanas.some((s) => s.entrenos);
  const unidad = entreno.ajustes.unidadPeso;
  const datos = {
    entrenos: semanas.map((s) => ({ etiqueta: etiquetaFecha(s.semana, idioma, "semana"), larga: etiquetaLarga(s.semana, idioma, "semana"), valor: s.entrenos })),
    volumen: semanas.map((s) => ({ etiqueta: etiquetaFecha(s.semana, idioma, "semana"), larga: etiquetaLarga(s.semana, idioma, "semana"), valor: Math.round(pesoAPantalla(s.volumen, unidad)) })),
  };
  // La referencia en mostaza: la media del rango (de las semanas ya cerradas y la actual).
  const ref = {
    entrenos: media(datos.entrenos.map((d) => d.valor)),
    volumen: media(datos.volumen.map((d) => d.valor)),
  };
  const config = {
    entrenos: { pregunta: t(idioma, "fitdraft.progreso.pEntrenos"), unidad: "", dec: 0, refDec: 1 },
    volumen: { pregunta: t(idioma, "fitdraft.progreso.pVolumen"), unidad, dec: 0, refDec: 0 },
  };
  const leer = (clave) => (texto) => setLecturas((l) => ({ ...l, [clave]: texto }));
  const refTxt = (clave) => t(idioma, "fitdraft.progreso.media", { v: formatoNumero(ref[clave], idioma, config[clave].refDec) + (config[clave].unidad ? " " + config[clave].unidad : "") });

  if (!listo) return <TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave>;

  return (
    <div>
      <Tarjeta pregunta={t(idioma, "fitdraft.progreso.pMusculos")} idioma={idioma}>
        <TextoSuave style={{ fontSize: 12, marginBottom: 10 }}>{t(idioma, "entreno.progreso.seriesAyuda")}</TextoSuave>
        {!musculos.length && <TextoSuave>{t(idioma, "entreno.progreso.sinSeries")}</TextoSuave>}
        {/* El reparto por músculo es el mapa corporal (criterio de gráficas: nunca 14 barras). Al tocar un
            músculo se leen sus series de esta semana y la media de las 4 anteriores. */}
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
      </Tarjeta>

      <SelectorRango semanas={semanasRango} onCambiar={(s) => { setSemanasRango(s); setLecturas({}); }} idioma={idioma} />

      {["entrenos", "volumen"].map((clave) => (
        <Tarjeta key={clave} pregunta={config[clave].pregunta} onGrafica={hayAlgo ? () => { setHoja(clave); setLecturaHoja(null); } : null} idioma={idioma}>
          {hayAlgo ? (
            <>
              <Linea datos={datos[clave]} barras unidad={config[clave].unidad} dec={config[clave].dec} referencia={ref[clave]} refTxt={refTxt(clave)} onLeer={leer(clave)} idioma={idioma} minimo={0} />
              <Lectura texto={lecturas[clave]} idioma={idioma} />
              {clave === "volumen" && <Pie>{t(idioma, "fitdraft.progreso.volumenPie")}</Pie>}
            </>
          ) : <TextoSuave>{t(idioma, "entreno.progreso.sinSeries")}</TextoSuave>}
        </Tarjeta>
      ))}

      {hoja && (
        <HojaInferior titulo={config[hoja].pregunta} onCerrar={() => setHoja(null)} idioma={idioma}>
          <Linea datos={datos[hoja]} barras unidad={config[hoja].unidad} dec={config[hoja].dec} referencia={ref[hoja]} refTxt={refTxt(hoja)} onLeer={setLecturaHoja} idioma={idioma} alto={190} minimo={0} />
          <Lectura texto={lecturaHoja} idioma={idioma} />
        </HojaInferior>
      )}
    </div>
  );
}
