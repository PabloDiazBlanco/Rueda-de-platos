// ---------- ui/despensa/lista.jsx ----------
// Vista de lista de la despensa: las tres zonas una debajo de otra, con cada entrada editable en su
// misma fila (gramos o «tengo / se acabó», zona y quitar). Es la vista de la Fase A y sigue disponible
// siempre junto a la nevera dibujada (ui/despensa/cocina.jsx): para cambiar muchas cosas seguidas es
// más rápida que ir abriendo puertas. Al final, la lista de limpieza de debajo del fregadero.
import React from "react";
import { Trash2, Check, Droplets } from "lucide-react";
import { getFood } from "macros";
import { t } from "i18n";
import { ZONAS } from "despensa";
import { inputStyle, IconBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { ICONO_ZONA, emojiDe } from "./piezas.jsx";
import { ListaLimpieza } from "./fregadero.jsx";

export function VistaLista({ data, despensa, idioma }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {ZONAS.map((zona) => (
        <ZonaDespensa key={zona} zona={zona} items={despensa.porZona[zona]} data={data} despensa={despensa} idioma={idioma} />
      ))}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Droplets size={16} color="var(--green-dark)" />
          <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {t(idioma, "despensa.fregadero.titulo")}
          </span>
        </div>
        <ListaLimpieza despensa={despensa} idioma={idioma} />
      </div>
    </div>
  );
}

function ZonaDespensa({ zona, items, data, despensa, idioma }) {
  const Icon = ICONO_ZONA[zona];
  const nombreDe = (item) => (getFood(data, item.foodId) || { name: item.foodId }).name;
  const ordenados = [...items].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), "es"));
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length ? 8 : 4 }}>
        <Icon size={16} color="var(--green-dark)" />
        <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t(idioma, "despensa.zona." + zona)}
        </span>
        <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)" }}>({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)" }}>{t(idioma, "despensa.zonaVacia")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ordenados.map((item) => (
            <FilaDespensa key={item.id} item={item} food={getFood(data, item.foodId)} nombre={nombreDe(item)} despensa={despensa} alerta={despensa.alertaDe(item.foodId)} idioma={idioma} />
          ))}
        </div>
      )}
    </div>
  );
}

// Una entrada de la despensa. Los gramos se escriben en un campo que solo guarda al salir de él (o
// con Intro), para poder borrar y teclear un número nuevo sin que se guarde cada pulsación; la
// `key` con los gramos hace que el campo se rehaga si cambian desde fuera (al descontar una comida
// o al tachar la lista de la compra). Si se está acabando (`alerta`: "poco" o "acabado", ver
// alertasStock), la cantidad sale en rojo.
function FilaDespensa({ item, food, nombre, despensa, alerta, idioma }) {
  const conGramos = typeof item.gramos === "number";
  const agotado = conGramos ? item.gramos <= 0 : !item.tengo;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "5px 0", borderTop: "1px solid var(--paper)" }}>
      <span
        style={{
          flex: "1 1 140px", minWidth: 0, display: "flex", alignItems: "center", gap: 7,
          fontFamily: FUENTE_TEXTO, fontSize: 13, color: agotado ? "var(--ink-soft)" : "var(--ink)",
        }}
      >
        <span style={{ fontSize: 15, flexShrink: 0, opacity: agotado ? 0.5 : 1 }}>{emojiDe(food)}</span>
        <span>{nombre}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        {conGramos ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              key={`${item.id}:${item.gramos}`}
              type="number"
              min="0"
              step="10"
              inputMode="numeric"
              defaultValue={item.gramos}
              aria-label={t(idioma, "despensa.cantidad")}
              onBlur={(e) => {
                const g = Math.max(0, Math.round(Number(e.target.value) || 0));
                if (g !== item.gramos) despensa.editar(item.id, { gramos: g });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              style={{ ...inputStyle, width: 70, padding: "5px 6px", textAlign: "right", fontSize: 13, fontWeight: 700, color: alerta ? "var(--rust)" : "var(--ink)" }}
            />
            <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)" }}>g</span>
          </span>
        ) : (
          <button
            onClick={() => despensa.editar(item.id, { tengo: !item.tengo })}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              border: item.tengo ? "1px solid var(--green)" : "1px solid var(--line)",
              background: item.tengo ? "var(--green-soft)" : "transparent",
              color: item.tengo ? "var(--green-dark)" : alerta ? "var(--rust)" : "var(--ink-soft)",
            }}
          >
            {item.tengo && <Check size={12} />}
            {item.tengo ? t(idioma, "despensa.tengo") : t(idioma, "despensa.seAcabo")}
          </button>
        )}
        <select
          value={item.zona}
          aria-label={t(idioma, "despensa.moverA")}
          onChange={(e) => despensa.editar(item.id, { zona: e.target.value })}
          style={{ ...inputStyle, width: "auto", padding: "5px 4px", fontSize: 12 }}
        >
          {ZONAS.map((z) => (
            <option key={z} value={z}>{t(idioma, "despensa.zona." + z)}</option>
          ))}
        </select>
        <IconBtn onClick={() => despensa.quitar(item.id)}>
          <Trash2 size={13} />
        </IconBtn>
      </span>
    </div>
  );
}
