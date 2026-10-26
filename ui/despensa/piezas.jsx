// ---------- ui/despensa/piezas.jsx ----------
// Piezas pequeñas que comparten las vistas de la despensa (la de lista, la dibujada y sus modales):
// el icono de cada zona, el emoji o el dibujo propio de cada alimento, cómo se acorta un nombre o se
// escribe una cantidad, y el selector de zona.
import React from "react";
import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { t } from "i18n";
import { CATEGORIAS_ALIMENTOS, FOODS_SEED } from "datos-iniciales";
import { ZONAS } from "despensa";
import { dibujoPropio } from "nevera";
import { FUENTE_TEXTO } from "../estilos.js";
import { IconoAlimento } from "./dibujos.jsx";

export const ICONO_ZONA = { despensa: Archive, nevera: Refrigerator, congelador: Snowflake };

// El emoji propio del alimento (F3) o, si no tiene, el de su carpeta del catálogo.
export const emojiCarpeta = (categoria) => (CATEGORIAS_ALIMENTOS.find((c) => c.key === categoria) || { emoji: "🗂️" }).emoji;
export const emojiDe = (food) => (food && food.emoji) || emojiCarpeta(food && food.categoria);

// Cómo se reconoce un alimento en una fila de texto (la vista de lista, el buscador de «Añadir»): los del
// catálogo base, con su dibujo propio (ui/despensa/alimentos.jsx; cuál lleva dibujo lo decide
// dibujoPropio, logica/nevera.js); los demás, con su emoji o el de su carpeta, como antes. `tamano` es el
// del emoji (px de letra); el dibujo sale algo más grande para que se vea lo mismo, porque un emoji
// llena su caja y el dibujo deja aire alrededor.
export function MarcaAlimento({ food, tamano = 15, apagado = false }) {
  const dibujo = dibujoPropio(food, FOODS_SEED);
  const opacity = apagado ? 0.5 : 1;
  if (dibujo) {
    return (
      <span style={{ display: "inline-flex", flexShrink: 0, opacity, margin: "-3px 0" }}>
        <IconoAlimento dibujo={dibujo} tamano={Math.round(tamano * 1.55)} />
      </span>
    );
  }
  return <span style={{ fontSize: tamano, flexShrink: 0, opacity }}>{emojiDe(food)}</span>;
}

// Nombre sin lo que va entre paréntesis («Pechuga de pollo (cruda)» → «Pechuga de pollo»): en las
// fichas de la nevera hay sitio para dos líneas cortas, y la marca o el «crudo» no ayudan a reconocerlo.
export function nombreCorto(nombre) {
  const corto = String(nombre || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return corto || String(nombre || "");
}

// Igual que la lista de la compra: en kg a partir de 1 kg (con un decimal), en g por debajo.
export function formatoGramos(gramos) {
  const kg = gramos / 1000;
  return kg >= 1 ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(gramos)} g`;
}

// Tres botones, uno por zona, con su icono. Lo usan el modal de añadir y el de editar.
export function SelectorZona({ zona, onChange, idioma }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {ZONAS.map((z) => {
        const Icon = ICONO_ZONA[z];
        return (
          <button
            key={z}
            onClick={() => onChange(z)}
            style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid var(--line)",
              background: zona === z ? "var(--green-dark)" : "#fff", color: zona === z ? "#fff" : "var(--ink)",
              fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <Icon size={15} />
            {t(idioma, "despensa.zona." + z)}
          </button>
        );
      })}
    </div>
  );
}
