// ---------- ui/menu/selector-dia.jsx ----------
// «Un solo día a la vez» (Bloque MENÚ de la parte estética, 26-oct-2026): el usuario eligió el fondo
// «mínimo pulido» de las maquetas (local/ideas/esteticas/02-fondo-menu.html, opción E, y
// v2-02-macros.html) con la condición de que el menú enseñe un día cada vez en vez de la semana entera
// apilada: con la semana entera, la gráfica de macros de arriba hablaba de un día y las comidas de
// debajo de siete, y no se veía a qué día se refería cada cosa. Así, los botones de día cambian a la vez
// la gráfica (solo en el Menú completo) y las comidas de debajo. Al abrir, sale hoy.
//
// Lo usan los dos menús (el simple comparte el fondo, sin gráfica): aquí están los botones de día, el
// día de hoy y la tarjeta de un día, que recibe las filas de comida ya pintadas por cada menú (cada uno
// enseña cosas distintas: kcal y etiquetas en el completo, solo la combinación en el simple).
import React from "react";
import { DAYS } from "comun";
import { t } from "i18n";
import { LineaPreentreno } from "../perfil/preentreno.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// El día de la semana de hoy con el nombre del modelo de datos (DAYS empieza en lunes; getDay, en domingo).
export function diaDeHoy(fecha = new Date()) {
  return DAYS[(fecha.getDay() + 6) % 7];
}

// Los siete botones, del ancho de la pantalla. El de hoy lleva un punto mostaza debajo (mostaza = la
// referencia, como en el criterio de gráficas): así se ve dónde está hoy aunque se mire otro día.
export function SelectorDia({ dia, onCambiar, idioma }) {
  const hoy = diaDeHoy();
  return (
    <div role="group" style={{ display: "flex", gap: 4, marginBottom: 12 }}>
      {DAYS.map((d) => {
        const activo = d === dia;
        return (
          <button
            key={d}
            onClick={() => onCambiar(d)}
            aria-pressed={activo}
            aria-label={t(idioma, "dia." + d) + (d === hoy ? ` (${t(idioma, "menu.dia.hoy")})` : "")}
            title={t(idioma, "dia." + d)}
            style={{
              position: "relative", flex: 1, minWidth: 0, padding: "7px 0 8px", borderRadius: 20,
              border: `1px solid ${activo ? "var(--green-dark)" : "var(--line)"}`,
              background: activo ? "var(--green-dark)" : "var(--card)", color: activo ? "#fff" : "var(--ink)",
              fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden",
            }}
          >
            {t(idioma, "menu.diaCorto." + d)}
            {d === hoy && (
              <span
                aria-hidden="true"
                style={{ position: "absolute", left: "50%", bottom: 2, width: 4, height: 4, marginLeft: -2, borderRadius: "50%", background: "var(--mustard)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// La tarjeta del día elegido: su nombre («· hoy» si lo es), la línea de preentreno (D3), las comidas y,
// si se pasa `total` (kcal del día, solo el Menú completo), la fila del total. `key={dia}` en quien la
// pinta hace que la tarjeta entre con un pequeño fundido al cambiar de día (nada con «reducir movimiento»).
export function TarjetaDia({ dia, perfil, total, idioma, children }) {
  const esHoy = dia === diaDeHoy();
  return (
    <div className="menu-dia-aparece" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .menu-dia-aparece { animation: menuDiaAparece 0.3s ease both; }
        }
        @keyframes menuDiaAparece { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>
      <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 15, marginBottom: 8 }}>
        {t(idioma, "dia." + dia)}
        {esHoy && <small style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700, color: "var(--mustard-dark)", marginLeft: 6 }}>{t(idioma, "menu.dia.hoy")}</small>}
      </div>
      <LineaPreentreno perfil={perfil} day={dia} idioma={idioma} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
      {total != null && total > 0 && (
        <div
          style={{
            display: "flex", justifyContent: "space-between", fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)",
            borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8,
          }}
        >
          <span>{t(idioma, "menu.dia.total")}</span>
          <b style={{ color: "var(--ink)" }}>{t(idioma, "menu.kcal", { n: Math.round(total) })}</b>
        </div>
      )}
    </div>
  );
}
