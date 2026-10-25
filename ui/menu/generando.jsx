// ---------- ui/menu/generando.jsx ----------
// Lo que se ve mientras «se genera» el menú (C11, 25-oct-2026). Generar es instantáneo, pero el usuario
// pidió que no lo pareciera: un menú que aparece de golpe se siente como un sorteo sin pensar, y unos
// segundos de espera con algo que mirar dan la sensación de que la app está trabajando para él. La
// espera (entre 3 y 6 s, al azar) la lleva useMenu (ui/estado/menu.js); aquí solo se pinta, igual en el
// Menú completo y en el Menú simple.
//
// ANIMACIÓN PROVISIONAL: la definitiva está por elegir entre las propuestas de la parte estética
// (local/ideas/esteticas/), y el usuario no quiere el típico círculo girando. Esta es deliberadamente
// sencilla —tres «casillas» que barajan emojis de comida como una tragaperras y se paran de una en una—
// y vive sola en este componente para poder cambiarla sin tocar nada más: recibe `generando`
// ({ inicio, duracion } en ms) y el idioma, y nada más. Con «reducir movimiento» no llega a pintarse:
// useMenu genera al momento.
import React, { useState, useEffect } from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";

const EMOJIS = ["🍗", "🍝", "🥗", "🐟", "🍚", "🥚", "🥔", "🍅", "🥩", "🫑", "🧆", "🥑", "🍞", "🧀"];

export function GenerandoMenu({ generando, idioma }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  const transcurrido = Math.max(0, ahora - generando.inicio);
  const progreso = Math.min(1, transcurrido / generando.duracion);
  const restantes = Math.max(0, Math.ceil((generando.duracion - transcurrido) / 1000));
  // Cada casilla gira a su ritmo y se para en el tramo final: la primera al 60 %, la segunda al 75 % y la
  // última al 90 %. Paradas, enseñan tres emojis distintos (separados 5 puestos en la lista), que cambian
  // de una vez a otra según la hora en que se pidió el menú.
  const base = Math.floor(generando.inicio / 7) % EMOJIS.length;
  const casillas = [0.6, 0.75, 0.9].map((parada, i) => {
    const vuelta = progreso >= parada ? 0 : Math.floor(transcurrido / (110 + 25 * i));
    return EMOJIS[(base + i * 5 + vuelta) % EMOJIS.length];
  });

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "26px 18px 20px",
        textAlign: "center", fontFamily: FUENTE_TEXTO, marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }} aria-hidden="true">
        {casillas.map((e, i) => (
          <div
            key={i}
            style={{
              width: 56, height: 56, borderRadius: 12, background: "var(--paper)", border: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
            }}
          >
            {e}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green-dark)", marginBottom: 4 }}>{t(idioma, "generando.titulo")}</div>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>{t(idioma, "generando.texto")}</div>
      {/* El temporizador: una barra fina y los segundos que faltan, en pequeño. */}
      <div style={{ height: 4, borderRadius: 2, background: "var(--green-soft)", overflow: "hidden", maxWidth: 260, margin: "0 auto" }}>
        <div style={{ height: 4, width: `${progreso * 100}%`, background: "var(--green)" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>{t(idioma, "generando.faltan", { n: restantes })}</div>
    </div>
  );
}
