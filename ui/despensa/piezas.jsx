// ---------- ui/despensa/piezas.jsx ----------
// Piezas pequeñas que comparten las vistas de la despensa (la de lista, la dibujada y sus modales):
// el icono de cada zona, el emoji de cada carpeta del catálogo, cómo se acorta un nombre o se escribe
// una cantidad, y el selector de zona.
import React from "react";
import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { t } from "i18n";
import { CATEGORIAS_ALIMENTOS } from "datos-iniciales";
import { ZONAS } from "despensa";
import { FUENTE_TEXTO } from "../estilos.js";

export const ICONO_ZONA = { despensa: Archive, nevera: Refrigerator, congelador: Snowflake };

export const emojiDe = (food) => (CATEGORIAS_ALIMENTOS.find((c) => c.key === (food && food.categoria)) || { emoji: "🗂️" }).emoji;

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
