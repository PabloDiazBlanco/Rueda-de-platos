// ---------- ui/entreno/comun.jsx ----------
// Piezas y formatos que comparten las pantallas del módulo de entreno: números con la coma o el punto
// del idioma, duraciones, fechas cortas, el nombre de un ejercicio, y unos pocos componentes de
// presentación (tarjeta, botones, título de sección) con la estética de FoodDraft: papel y tarjetas con
// borde, sin sombras, una sola acción principal en verde sólido por pantalla (diseño, §7.1).
import React, { useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { t } from "i18n";
import { nombreEjercicio } from "entreno-nombres";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// ---------- Capa a pantalla completa ----------
// Para lo que no cabe en un modal pequeño (elegir entre 80 ejercicios, crear uno, la sesión en curso):
// fija sobre todo, con su barra arriba (volver o cerrar y el título), el contenido desplazable y un pie
// opcional (el botón principal), y la pantalla de debajo inmóvil. `capa`: z-index (45 la sesión, como
// los paneles de la nevera; 50 lo que se abre encima de ella, como los modales). La barra deja libres
// ~110 px a la derecha, donde flota el botón «Cerrar sesión» de auth-bootstrap.jsx.
export function CapaCompleta({ titulo, onCerrar, icono = "cerrar", pie, capa = 50, accionesTitulo, children, idioma }) {
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alPulsar(e) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPulsar);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", alPulsar);
    };
  }, [onCerrar]);
  const Icono = icono === "volver" ? ArrowLeft : X;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      style={{ position: "fixed", inset: 0, zIndex: capa, background: "var(--paper)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 110px 10px 10px", borderBottom: "1px solid var(--line)", background: "var(--paper)", minHeight: 56, boxSizing: "border-box" }}>
        <button
          onClick={onCerrar}
          aria-label={t(idioma, icono === "volver" ? "entreno.comun.volver" : "common.cerrar")}
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", flexShrink: 0 }}
        >
          <Icono size={20} />
        </button>
        <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {titulo}
        </h2>
        {accionesTitulo}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 14px 24px" }}>{children}</div>
      </div>
      {pie && (
        <div style={{ borderTop: "1px solid var(--line)", background: "var(--card)", padding: "10px 14px calc(10px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>{pie}</div>
        </div>
      )}
    </div>
  );
}

const LOCALES = { es: "es-ES", en: "en-GB", ca: "ca-ES", gl: "gl-ES", eu: "eu-ES" };

// No todos los navegadores traen los datos de formato de gallego y euskera (algunos solo incluyen los
// idiomas «grandes»): entonces Intl cae al inglés y saldría «5,842.5 kg» y «16 Oct» en mitad de una
// pantalla en euskera. Si el idioma no está, los números usan el formato español (el mismo separador
// decimal y de miles que el gallego y el euskera) y las fechas, las tablas de abajo.
const soportados = {};
function soportado(locale) {
  if (soportados[locale] === undefined) {
    try {
      soportados[locale] = Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0 && Intl.NumberFormat.supportedLocalesOf([locale]).length > 0;
    } catch (e) {
      soportados[locale] = false;
    }
  }
  return soportados[locale];
}
export const localeDe = (idioma) => {
  const l = LOCALES[idioma] || "es-ES";
  return soportado(l) ? l : "es-ES";
};

// Nombres de meses y días (lunes primero) para cuando el navegador no los tiene (ver arriba).
const MESES = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ca: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
  gl: ["xaneiro", "febreiro", "marzo", "abril", "maio", "xuño", "xullo", "agosto", "setembro", "outubro", "novembro", "decembro"],
  eu: ["urtarrila", "otsaila", "martxoa", "apirila", "maiatza", "ekaina", "uztaila", "abuztua", "iraila", "urria", "azaroa", "abendua"],
};
const MESES_CORTOS = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ca: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."],
  gl: ["xan.", "feb.", "mar.", "abr.", "mai.", "xuñ.", "xul.", "ago.", "set.", "out.", "nov.", "dec."],
  eu: ["urt.", "ots.", "mar.", "api.", "mai.", "eka.", "uzt.", "abu.", "ira.", "urr.", "aza.", "abe."],
};
// Iniciales de los días de la semana, empezando en lunes (para el calendario del historial).
export const DIAS_CORTOS = {
  es: ["L", "M", "X", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
  ca: ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"],
  gl: ["L", "M", "M", "X", "V", "S", "D"],
  eu: ["Al", "Ar", "Az", "Og", "Or", "Lr", "Ig"],
};
const dos = (n) => String(n).padStart(2, "0");

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
  return diaYMes(d, idioma, true);
}

// «24 oct» / «24 de octubre» (en euskera, «urr. 24» / «urriaren 24a»), con Intl si el navegador tiene el
// idioma y con las tablas de arriba si no.
function diaYMes(d, idioma, corto) {
  const l = LOCALES[idioma] || "es-ES";
  if (soportado(l)) return new Intl.DateTimeFormat(l, { day: "numeric", month: corto ? "short" : "long" }).format(d);
  const tabla = (corto ? MESES_CORTOS : MESES)[idioma] || MESES.es;
  const mes = tabla[d.getMonth()];
  if (idioma === "eu") return corto ? `${mes} ${d.getDate()}` : `${mes}ren ${d.getDate()}a`;
  if (idioma === "en") return `${d.getDate()} ${mes}`;
  if (corto) return `${d.getDate()} ${mes}`;
  // En catalán, «d’» delante de vocal (24 d’octubre, 3 d’abril).
  return idioma === "ca" && /^[aeiou]/.test(mes) ? `${d.getDate()} d’${mes}` : `${d.getDate()} de ${mes}`;
}

export function fechaLarga(inicio, idioma) {
  const d = new Date(inicio);
  const l = LOCALES[idioma] || "es-ES";
  if (soportado(l)) return new Intl.DateTimeFormat(l, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
  return `${diaYMes(d, idioma, false)}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// Un día sin hora: «sábado, 24 de octubre» (o «urriaren 24a» sin datos del idioma).
export function fechaDia(fecha, idioma) {
  const d = new Date(fecha);
  const l = LOCALES[idioma] || "es-ES";
  if (soportado(l)) return new Intl.DateTimeFormat(l, { weekday: "long", day: "numeric", month: "long" }).format(d);
  return diaYMes(d, idioma, false);
}

export function nombreMes(mesISO, idioma) {
  const [a, m] = mesISO.split("-").map(Number);
  const l = LOCALES[idioma] || "es-ES";
  let texto;
  if (soportado(l)) texto = new Intl.DateTimeFormat(l, { month: "long", year: "numeric" }).format(new Date(a, m - 1, 15));
  else if (idioma === "eu") texto = `${a}ko ${MESES.eu[m - 1]}`;
  else texto = `${(MESES[idioma] || MESES.es)[m - 1]} ${a}`;
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

// Hoja que sube desde abajo con unas pocas opciones (tipo de serie, menú ⋮ de un ejercicio): se alcanza
// con el pulgar, a diferencia de un menú desplegable arriba. Tocar fuera la cierra.
export function HojaInferior({ titulo, onCerrar, children, idioma }) {
  return (
    <div
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(31,77,56,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "var(--card)", borderRadius: "16px 16px 0 0",
          padding: "8px 14px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)",
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--line)", margin: "4px auto 10px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 17, color: "var(--green-dark)" }}>{titulo}</div>
          <button onClick={onCerrar} aria-label={t(idioma, "common.cerrar")} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Una opción de una hoja inferior: fila grande y fácil de tocar.
export function OpcionHoja({ icono: Icono, children, onClick, peligro, activa, detalle }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 48, padding: "10px 8px",
        background: activa ? "var(--green-soft)" : "none", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left",
        fontFamily: FUENTE_TEXTO, fontSize: 14.5, fontWeight: activa ? 700 : 500, color: peligro ? "var(--rust)" : "var(--ink)",
      }}
    >
      {Icono && <Icono size={18} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>
        {children}
        {detalle && <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: "var(--ink-soft)", marginTop: 2, lineHeight: 1.4 }}>{detalle}</span>}
      </span>
    </button>
  );
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
