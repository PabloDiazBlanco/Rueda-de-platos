// ---------- ui/entreno/comun.jsx ----------
// Piezas y formatos que comparten las pantallas del módulo de entreno: números con la coma o el punto
// del idioma, duraciones, fechas cortas, el nombre de un ejercicio, y unos pocos componentes de
// presentación (tarjeta, botones, título de sección) con la estética de FoodDraft: papel y tarjetas con
// borde, sin sombras, una sola acción principal en verde sólido por pantalla (diseño, §7.1).
import React from "react";
import { t } from "i18n";
import { nombreEjercicio } from "entreno-nombres";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

const LOCALES = { es: "es-ES", en: "en-GB", ca: "ca-ES", gl: "gl-ES", eu: "eu-ES" };
export const localeDe = (idioma) => LOCALES[idioma] || "es-ES";

export function prefiereMenosMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

// Número con los separadores del idioma (6.420 / 6,420; 61,3 / 61.3) y como mucho `decimales`.
export function formatoNumero(n, idioma, decimales = 1) {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "";
  return new Intl.NumberFormat(localeDe(idioma), { maximumFractionDigits: decimales }).format(Number(n));
}

// ---------- Unidades ----------
// Se guarda siempre en kg y km; libras y millas son solo de pantalla (ajuste «unidades»). Las
// equivalencias son las exactas por definición internacional.
export const KG_POR_LB = 0.45359237;
export const KM_POR_MI = 1.609344;

// Peso guardado (kg) → número a enseñar en la unidad elegida, redondeado a 0,1.
export function pesoAPantalla(kg, unidad) {
  if (kg === null || kg === undefined || kg === "") return null;
  const v = unidad === "lb" ? Number(kg) / KG_POR_LB : Number(kg);
  return Math.round(v * 10) / 10;
}
// Lo tecleado en la unidad elegida → kg para guardar (sin redondear de más, para que ida y vuelta dé lo mismo).
export function pesoDePantalla(valor, unidad) {
  if (valor === null || valor === undefined || valor === "") return null;
  const v = Number(valor);
  return unidad === "lb" ? Math.round(v * KG_POR_LB * 1000) / 1000 : v;
}
export function distanciaAPantalla(km, unidad) {
  if (km === null || km === undefined || km === "") return null;
  const v = unidad === "mi" ? Number(km) / KM_POR_MI : Number(km);
  return Math.round(v * 100) / 100;
}
export function distanciaDePantalla(valor, unidad) {
  if (valor === null || valor === undefined || valor === "") return null;
  const v = Number(valor);
  return unidad === "mi" ? Math.round(v * KM_POR_MI * 1000) / 1000 : v;
}

// Peso con su unidad, para textos («61,3 kg», «135 lb»).
export function textoPeso(kg, ajustes, idioma) {
  const unidad = (ajustes && ajustes.unidadPeso) || "kg";
  return `${formatoNumero(pesoAPantalla(kg, unidad), idioma)} ${unidad}`;
}
export function textoDistancia(km, ajustes, idioma) {
  const unidad = (ajustes && ajustes.unidadDistancia) || "km";
  return `${formatoNumero(distanciaAPantalla(km, unidad), idioma, 2)} ${unidad}`;
}

// ---------- Tiempo ----------
// Reloj «mm:ss» (o «h:mm:ss» pasada la hora): cronómetro y descanso.
export function reloj(segundos) {
  const s = Math.max(0, Math.round(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

// Duración legible: «52 min», «1 h 05 min».
export function duracionTexto(segundos, idioma) {
  const min = Math.round((segundos || 0) / 60);
  if (min < 60) return t(idioma, "entreno.comun.minutos", { n: min });
  return t(idioma, "entreno.comun.horasMinutos", { h: Math.floor(min / 60), m: String(min % 60).padStart(2, "0") });
}

// Fecha corta de una sesión: «hoy», «ayer» o «21 oct».
export function fechaCorta(inicio, idioma) {
  const d = new Date(inicio);
  const hoy = new Date();
  const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mismoDia(d, hoy)) return t(idioma, "entreno.comun.hoy");
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(d, ayer)) return t(idioma, "entreno.comun.ayer");
  return new Intl.DateTimeFormat(localeDe(idioma), { day: "numeric", month: "short" }).format(d);
}

export function fechaLarga(inicio, idioma) {
  return new Intl.DateTimeFormat(localeDe(idioma), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(inicio));
}

export function nombreMes(mesISO, idioma) {
  const [a, m] = mesISO.split("-").map(Number);
  const texto = new Intl.DateTimeFormat(localeDe(idioma), { month: "long", year: "numeric" }).format(new Date(a, m - 1, 15));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Nombre que ve el usuario de un ejercicio (por id u objeto), con los propios por su nombre.
export function nombreDe(entreno, id, idioma) {
  const e = entreno.ejercicioDe(id);
  return nombreEjercicio(e || id, idioma);
}

// ---------- Presentación ----------
export function Tarjeta({ children, style, onClick, ...resto }) {
  const Etiqueta = onClick ? "button" : "div";
  return (
    <Etiqueta
      onClick={onClick}
      {...resto}
      style={{
        display: "block", width: "100%", textAlign: "left", boxSizing: "border-box",
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px",
        fontFamily: FUENTE_TEXTO, color: "var(--ink)", cursor: onClick ? "pointer" : "default", ...style,
      }}
    >
      {children}
    </Etiqueta>
  );
}

export function BotonPrincipal({ children, onClick, disabled, style, ...resto }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...resto}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 48,
        background: "var(--green)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px",
        fontFamily: FUENTE_TEXTO, fontSize: 15, fontWeight: 700, opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer", ...style,
      }}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({ children, onClick, peligro, style, ...resto }) {
  return (
    <button
      onClick={onClick}
      {...resto}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44,
        background: "transparent", color: peligro ? "var(--rust)" : "var(--green-dark)",
        border: `1px solid ${peligro ? "var(--rust-soft)" : "var(--line)"}`, borderRadius: 10, padding: "9px 14px",
        fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, cursor: "pointer", ...style,
      }}
    >
      {children}
    </button>
  );
}

// Botón solo de texto (acciones terciarias, enlaces dentro de una pantalla).
export function BotonTexto({ children, onClick, color = "var(--green-dark)", style, ...resto }) {
  return (
    <button
      onClick={onClick}
      {...resto}
      style={{
        background: "none", border: "none", padding: "6px 0", cursor: "pointer", display: "inline-flex",
        alignItems: "center", gap: 5, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color, ...style,
      }}
    >
      {children}
    </button>
  );
}

export function TituloSeccion({ children, accion }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "22px 0 10px" }}>
      <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{children}</h2>
      {accion}
    </div>
  );
}

export function TextoSuave({ children, style }) {
  return <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, ...style }}>{children}</div>;
}

// Chip de filtro o de opción (músculo, equipo, unidad...).
export function Chip({ activo, children, onClick, ...resto }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={!!activo}
      {...resto}
      style={{
        flexShrink: 0, minHeight: 34, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
        border: `1px solid ${activo ? "var(--green)" : "var(--line)"}`,
        background: activo ? "var(--green-soft)" : "var(--card)", color: activo ? "var(--green-dark)" : "var(--ink)",
        fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: activo ? 700 : 500, whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
