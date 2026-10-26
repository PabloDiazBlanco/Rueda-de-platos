// ---------- ui/comun/mapa-corporal.jsx ----------
// El mapa corporal (26-oct-2026; maqueta local/ideas/esteticas/v3-07-mapa-corporal.html, camino 1): el
// cuerpo de frente y de espaldas, con cada uno de los 14 grupos musculares pintado con la escala de cinco
// verdes según su valor (series de la semana en Progreso, series previstas en la lista de rutinas, principal
// y secundarios en la ficha de un ejercicio). Hombre o mujer según el sexo del perfil (sin sexo, hombre).
// Es la familia «reparto por músculo» del criterio de gráficas: sustituye a las 14 barras.
//
// Dos tamaños:
// - grande: las dos figuras con su rótulo, la leyenda de la escala y una línea fija debajo donde se escribe
//   el valor del músculo que se toca (el criterio de gráficas: «tocar para leer», nunca un globo flotante);
// - pequeno: una tira de unos 64 px de alto, sin interacción, con la lectura completa en su aria-label.
// Los trazados (MIT, react-native-body-highlighter) están en ./mapa-trazados.js; qué grupo es cada trazo y
// los colores de la escala, en logica/mapa-corporal.js (con sus casos en validacion/).
import React, { useMemo, useState } from "react";
import { t } from "i18n";
import { SLUG_A_GRUPO, ESCALA_MAPA, colorSeries, generoMapa } from "mapa-corporal";
import { TRAZADOS_MIT } from "./mapa-trazados.js";
import { FUENTE_TEXTO } from "../estilos.js";

const PIEL = "#efe9db";
const BORDE = "#ddd5c1";
const PIEL_OSCURA = "#e7e0cf";
const PELO = "#d8d0bd";

// El SVG de las dos figuras, una al lado de otra. Se memoriza por género y valores: son unos 300 trazos.
function Figuras({ genero, valores, seleccionado, onTocar, alto, conRotulos, idioma }) {
  const contenido = useMemo(() => {
    const fig = (lado) => {
      const d = TRAZADOS_MIT[genero][lado];
      const [x0, y0, w, h] = d.viewBox.split(" ").map(Number);
      return { d, x0, y0, w, h };
    };
    const f = fig("frente");
    const e = fig("espalda");
    return { f, e, W: f.w + e.w, H: Math.max(f.h, e.h) };
  }, [genero]);
  const { f, e, W, H } = contenido;
  const pinta = (fg) => (
    <>
      <path d={fg.d.contorno} fill={PIEL} stroke={BORDE} strokeWidth={2} />
      {Object.entries(fg.d.partes).map(([slug, trazos]) => {
        const g = SLUG_A_GRUPO[slug];
        return trazos.map((p, i) => g ? (
          <path
            key={slug + i}
            d={p}
            fill={colorSeries(valores[g] || 0)}
            stroke={seleccionado === g ? "#1f4d38" : "none"}
            strokeWidth={seleccionado === g ? 5 : 0}
            onClick={onTocar ? () => onTocar(g) : undefined}
            style={onTocar ? { cursor: "pointer" } : undefined}
          />
        ) : (
          <path key={slug + i} d={p} fill={slug === "hair" ? PELO : PIEL_OSCURA} />
        ));
      })}
    </>
  );
  const pie = conRotulos ? 70 : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H + pie}`} style={alto ? { height: alto, width: "auto", display: "block" } : { width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      <g transform={`translate(${-f.x0},${-f.y0})`}>{pinta(f)}</g>
      <g transform={`translate(${f.w - e.x0},${-e.y0})`}>{pinta(e)}</g>
      {conRotulos && (
        <>
          <text x={f.w / 2} y={H + 50} fontSize={46} textAnchor="middle" fill="#6b6a5e" fontFamily={FUENTE_TEXTO}>{t(idioma, "cuerpo.mapa.frente")}</text>
          <text x={f.w + e.w / 2} y={H + 50} fontSize={46} textAnchor="middle" fill="#6b6a5e" fontFamily={FUENTE_TEXTO}>{t(idioma, "cuerpo.mapa.espalda")}</text>
        </>
      )}
    </svg>
  );
}

// `valores`: { grupo: número } (series, o 10/5 para principal/secundario en la ficha).
// `textoDe(grupo, valor)`: lo que se escribe en la línea fija al tocar (por defecto «N series»).
// `leyenda`: "series" (la escala 0 · 1-3 · ...) o "ejercicio" (principal / secundario) o null.
export function MapaCorporal({ valores = {}, perfil, idioma, tamano = "grande", textoDe, leyenda = "series", etiqueta }) {
  const [seleccionado, setSeleccionado] = useState(null);
  const genero = generoMapa(perfil);
  const texto = textoDe || ((g, n) => t(idioma, "cuerpo.mapa.series", { n: Math.round((n || 0) * 10) / 10 }));
  const resumen = Object.entries(valores).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
    .map(([g, n]) => `${t(idioma, "musculo." + g)}: ${texto(g, n)}`).join(", ");
  const aria = `${etiqueta || t(idioma, "cuerpo.mapa.titulo")}. ${resumen || t(idioma, "cuerpo.mapa.vacio")}`;

  if (tamano === "pequeno") {
    return (
      <div role="img" aria-label={aria} style={{ display: "inline-block", lineHeight: 0 }}>
        <Figuras genero={genero} valores={valores} alto={64} idioma={idioma} />
      </div>
    );
  }

  return (
    <div>
      <div role="img" aria-label={aria} style={{ maxWidth: 320, margin: "0 auto" }}>
        <Figuras genero={genero} valores={valores} seleccionado={seleccionado} onTocar={(g) => setSeleccionado(g)} conRotulos idioma={idioma} />
      </div>
      {/* La lectura al tocar: una línea fija, siempre en el mismo sitio. */}
      <div aria-live="polite" style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink)", borderTop: "1px dashed var(--line)", paddingTop: 6, marginTop: 6, minHeight: 20 }}>
        {seleccionado
          ? <><b>{t(idioma, "musculo." + seleccionado)}</b>: {valores[seleccionado] || textoDe ? texto(seleccionado, valores[seleccionado] || 0) : t(idioma, "cuerpo.mapa.nada")}</>
          : <span style={{ color: "var(--ink-soft)" }}>{t(idioma, "cuerpo.mapa.tocar")}</span>}
      </div>
      {leyenda === "series" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
          {ESCALA_MAPA.map((e, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: e.color, border: i ? "none" : "1px solid var(--line)" }} />
              {i === 0 ? "0" : e.hasta === Infinity ? `${e.desde}+` : `${e.desde}-${e.hasta}`}
            </span>
          ))}
          <span>{t(idioma, "cuerpo.mapa.seriesLeyenda")}</span>
        </div>
      )}
      {leyenda === "ejercicio" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: colorSeries(10) }} /> {t(idioma, "cuerpo.mapa.principal")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: colorSeries(5) }} /> {t(idioma, "cuerpo.mapa.secundario")}</span>
        </div>
      )}
    </div>
  );
}
