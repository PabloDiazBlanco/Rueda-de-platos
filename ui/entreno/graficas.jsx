// ---------- ui/entreno/graficas.jsx ----------
// Gráficas del entreno en SVG propio, sin librerías (mismo criterio que la del peso, PesoLineChart en
// ui/peso/grafica.jsx): una de líneas y una de barras, genéricas, que usan la ficha de cada ejercicio
// (progreso: 1RM estimado y volumen por sesión), la pantalla de Progreso (entrenos y volumen por semana)
// y los informes de Cuerpo.
//
// Rangos 3 meses · 1 año · Todo, los tres gratis: el «solo los últimos 3 meses» de las capturas es una
// limitación comercial sin coste real (aquí todo se calcula en el móvil).
import React, { useState } from "react";
import { t } from "i18n";
import { mejoresDeEjercicioEnSesion, volumenSerie } from "entreno-calculo";
import { FUENTE_TEXTO } from "../estilos.js";
import { TextoSuave, Chip, fechaCorta, textoPeso, textoDistancia, formatoNumero, reloj } from "./comun.jsx";

const W = 320, H = 170, PAD_L = 38, PAD_R = 8, PAD_TOP = 10, PAD_BOTTOM = 20;

// Escalas comunes: x en milisegundos, y desde 0 o desde un poco por debajo del mínimo.
function escalas(puntos, desdeCero) {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const altoY = Math.max(...ys);
  const bajoY = desdeCero ? 0 : Math.min(...ys);
  const margen = (altoY - bajoY) * 0.1 || Math.max(1, altoY * 0.05);
  const minY = desdeCero ? 0 : Math.max(0, bajoY - margen), maxY = altoY + margen;
  const sx = (x) => PAD_L + ((x - minX) / (maxX - minX || 1)) * (W - PAD_L - PAD_R);
  const sy = (y) => H - PAD_BOTTOM - ((y - minY) / (maxY - minY || 1)) * (H - PAD_TOP - PAD_BOTTOM);
  return { minX, maxX, minY, maxY, sx, sy };
}

function Ejes({ e, formatoY, idioma, etiquetaX }) {
  const yTicks = [e.minY, (e.minY + e.maxY) / 2, e.maxY];
  const xTicks = e.minX === e.maxX ? [e.minX] : [e.minX, (e.minX + e.maxX) / 2, e.maxX];
  return (
    <>
      {yTicks.map((v, i) => (
        <g key={`y${i}`}>
          <line x1={PAD_L} y1={e.sy(v)} x2={W - PAD_R} y2={e.sy(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
          <text x={PAD_L - 5} y={e.sy(v) + 3} textAnchor="end" fontSize="8" fill="var(--ink-soft)" fontFamily={FUENTE_TEXTO}>{formatoY(v)}</text>
        </g>
      ))}
      {xTicks.map((x, i) => (
        <text key={`x${i}`} x={e.sx(x)} y={H - 5} textAnchor={xTicks.length === 1 ? "middle" : i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize="8" fill="var(--ink-soft)" fontFamily={FUENTE_TEXTO}>
          {etiquetaX ? etiquetaX(x) : fechaCorta(x, idioma)}
        </text>
      ))}
    </>
  );
}

// Línea con un punto por valor. `puntos`: [{ x: ms, y }]. `titulo`: lo que lee un lector de pantalla.
export function GraficaLineas({ puntos, formatoY, idioma, titulo, etiquetaX }) {
  if (!puntos.length) return null;
  const e = escalas(puntos, false);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={titulo} style={{ display: "block" }}>
      <Ejes e={e} formatoY={formatoY} idioma={idioma} etiquetaX={etiquetaX} />
      <polyline points={puntos.map((p) => `${e.sx(p.x)},${e.sy(p.y)}`).join(" ")} fill="none" stroke="var(--green)" strokeWidth="2" />
      {puntos.map((p, i) => <circle key={i} cx={e.sx(p.x)} cy={e.sy(p.y)} r="3" fill={p.aproximado ? "var(--card)" : "var(--green-dark)"} stroke="var(--green-dark)" strokeWidth="1.2" />)}
    </svg>
  );
}

// Barras desde cero. `barras`: [{ x: ms, y }] (x ordenadas).
export function GraficaBarras({ barras, formatoY, idioma, titulo, etiquetaX, color = "var(--green)" }) {
  if (!barras.length) return null;
  const e = escalas(barras, true);
  const paso = barras.length > 1 ? (W - PAD_L - PAD_R) / barras.length : 40;
  const ancho = Math.max(2, Math.min(24, paso * 0.6));
  const sxb = (x) => (barras.length > 1 ? e.sx(x) : PAD_L + (W - PAD_L - PAD_R) / 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={titulo} style={{ display: "block" }}>
      <Ejes e={e} formatoY={formatoY} idioma={idioma} etiquetaX={etiquetaX} />
      {barras.map((b, i) => {
        const x = Math.min(Math.max(sxb(b.x) - ancho / 2, PAD_L), W - PAD_R - ancho);
        return <rect key={i} x={x} y={e.sy(b.y)} width={ancho} height={Math.max(0, H - PAD_BOTTOM - e.sy(b.y))} rx="2" fill={color} />;
      })}
    </svg>
  );
}

// Rangos de tiempo de las gráficas (los mismos tres del seguimiento de peso).
export const RANGOS = [{ clave: "3m", dias: 90 }, { clave: "1a", dias: 365 }, { clave: "todo", dias: Infinity }];

export function SelectorRango({ rango, setRango, idioma }) {
  return (
    <div style={{ display: "flex", gap: 6, margin: "4px 0 12px" }}>
      {RANGOS.map((r) => <Chip key={r.clave} activo={rango === r.clave} onClick={() => setRango(r.clave)}>{t(idioma, "rango." + r.clave)}</Chip>)}
    </div>
  );
}

export const enRango = (fecha, rango) => {
  const r = RANGOS.find((x) => x.clave === rango) || RANGOS[2];
  return r.dias === Infinity || Date.now() - new Date(fecha).getTime() <= r.dias * 86400000;
};

// Qué se dibuja según el tipo de ejercicio: la línea, lo mejor de cada sesión (1RM estimado si hay
// kilos y repeticiones; si no, repeticiones, lastre, tiempo o distancia); las barras, el volumen de la
// sesión (o el tiempo total en los de duración).
function metricas(tipo, ajustes, idioma) {
  const kg = (v) => textoPeso(v, ajustes, idioma);
  if (tipo === "peso_reps") return { linea: "e1rm", barras: "volumen", fLinea: kg, fBarras: kg };
  if (tipo === "lastre_reps") return { linea: "pesoMax", barras: "volumen", fLinea: kg, fBarras: kg };
  if (tipo === "reps" || tipo === "asistido_reps") return { linea: "repsSerie", barras: "volumen", fLinea: (v) => formatoNumero(v, idioma, 0), fBarras: kg };
  if (tipo === "duracion") return { linea: "segMax", barras: "tiempo", fLinea: reloj, fBarras: reloj };
  return { linea: "kmMax", barras: "tiempo", fLinea: (v) => textoDistancia(v, ajustes, idioma), fBarras: reloj };
}

export function GraficasEjercicio({ veces, ejercicio, entreno, idioma, listo }) {
  const [rango, setRango] = useState("3m");
  if (!veces.length) return <TextoSuave>{listo ? t(idioma, "entreno.ficha.sinHistorial") : t(idioma, "loading.cargando")}</TextoSuave>;
  const m = metricas(ejercicio.tipo, entreno.ajustes, idioma);
  const elegidas = veces.filter((v) => enRango(v.sesion.inicio, rango)).reverse();
  const linea = [];
  const barras = [];
  elegidas.forEach(({ sesion, ej }) => {
    const x = new Date(sesion.inicio).getTime();
    const mejores = mejoresDeEjercicioEnSesion(ej, ejercicio.tipo, entreno.pesoCorporal);
    if (mejores[m.linea]) linea.push({ x, y: mejores[m.linea] });
    const cuentan = ej.series.filter((s) => s.hecha && s.tipo !== "calentamiento");
    const y = m.barras === "tiempo"
      ? cuentan.reduce((t2, s) => t2 + (Number(s.seg) || 0), 0)
      : cuentan.reduce((t2, s) => t2 + volumenSerie(s, ejercicio.tipo, entreno.pesoCorporal), 0);
    if (y > 0) barras.push({ x, y });
  });
  const titulo = (clave) => <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ink-soft)", margin: "10px 0 4px" }}>{t(idioma, clave)}</div>;
  return (
    <div>
      <SelectorRango rango={rango} setRango={setRango} idioma={idioma} />
      {!elegidas.length && <TextoSuave>{t(idioma, "entreno.graficas.nadaEnRango")}</TextoSuave>}
      {linea.length > 0 && (
        <>
          {titulo("entreno.graficas.linea." + m.linea)}
          <GraficaLineas puntos={linea} formatoY={m.fLinea} idioma={idioma} titulo={t(idioma, "entreno.graficas.linea." + m.linea)} />
          {m.linea === "e1rm" && <TextoSuave style={{ fontSize: 11.5 }}>{t(idioma, "entreno.graficas.e1rmAyuda")}</TextoSuave>}
        </>
      )}
      {barras.length > 0 && (
        <>
          {titulo("entreno.graficas.barras." + m.barras)}
          <GraficaBarras barras={barras} formatoY={m.fBarras} idioma={idioma} titulo={t(idioma, "entreno.graficas.barras." + m.barras)} />
        </>
      )}
    </div>
  );
}
