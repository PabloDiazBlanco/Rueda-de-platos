// ---------- ui/menu/detalle-comida.jsx ----------
// Detalle de una comida del menú (modal): componentes, raciones ajustables, comida completada y
// afinidad de la combinación (me gusta / no me gusta, que crea o cambia reglas).
import React, { useState } from "react";
import { Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { fmt } from "macros";
import { RULE_LEVELS } from "seleccion";
import { mealComponents, mealTotals } from "comida-calculo";
import { uid } from "comun";
import { t } from "i18n";
import { ModalShell } from "../comun/modal.jsx";
import { MacroPill } from "../comun/tarjetas.jsx";
import { ruleItemLabel } from "../catalogo/reglas.jsx";

// Ids de los alimentos que forman la combinación "de sabor" de una comida (proteína, carbo,
// verdura y garbanzos si los lleva) — los mismos que ya evalúa el motor de reglas. La grasa de
// ajuste fino se deja fuera a propósito: no es una elección, es un relleno calórico automático.
function comboItemIds(data, meal) {
  const byName = (name) => (name ? data.ingredients.find((i) => i.name === name) : null);
  const proteinIng = byName(meal.protein);
  const carboIng = byName(meal.carbo);
  const verduraIng = byName(meal.verdura);
  const garbanzosIng = meal.garbanzos ? data.ingredients.find((i) => i.category === "especial") : null;
  const ids = [proteinIng, carboIng, verduraIng, garbanzosIng].filter(Boolean).map((i) => i.id);
  return [...new Set(ids)];
}

// Busca, entre las reglas existentes, una que vincule exactamente este mismo conjunto de
// alimentos (sin importar el orden) — para actualizarla en vez de crear una duplicada.
function findMatchingRule(rules, itemIds) {
  const set = new Set(itemIds);
  return (rules || []).find((r) => r.itemIds.length === set.size && r.itemIds.every((id) => set.has(id))) || null;
}

const NIVELES_GUSTA = [
  { level: "alta", labelKey: "comboAfinidad.bastante" },
  { level: "maxima", labelKey: "comboAfinidad.siempreQueSePueda" },
];

const NIVELES_NOGUSTA = [
  { level: "baja", labelKey: "comboAfinidad.menos" },
  { level: "nula", labelKey: "comboAfinidad.nunca" },
];

function ComboAfinidad({ meal, data, onUpsertRule, idioma }) {
  const [abierto, setAbierto] = useState(null); // null | "gusta" | "nogusta"
  const itemIds = comboItemIds(data, meal);
  if (itemIds.length < 2) return null;

  const existente = findMatchingRule(data.rules, itemIds);
  const nombres = itemIds.map((id) => ruleItemLabel(data.ingredients, id, idioma)).join(" + ");

  function elegir(level) {
    if (existente) onUpsertRule({ ...existente, level });
    else onUpsertRule({ id: uid(), itemIds, level });
  }

  const opciones = abierto === "gusta" ? NIVELES_GUSTA : abierto === "nogusta" ? NIVELES_NOGUSTA : null;

  return (
    <div style={{ marginTop: 12, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
        {t(idioma, "comboAfinidad.pregunta")} <span style={{ color: "var(--ink)" }}>{nombres}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setAbierto(abierto === "gusta" ? null : "gusta")}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            padding: "7px 12px", borderRadius: 8, cursor: "pointer",
            border: abierto === "gusta" ? "1px solid var(--green)" : "1px solid var(--line)",
            background: abierto === "gusta" ? "var(--green-soft)" : "transparent",
            color: "var(--green-dark)",
          }}
        >
          <ThumbsUp size={14} /> {t(idioma, "comboAfinidad.meGusta")}
        </button>
        <button
          onClick={() => setAbierto(abierto === "nogusta" ? null : "nogusta")}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            padding: "7px 12px", borderRadius: 8, cursor: "pointer",
            border: abierto === "nogusta" ? "1px solid var(--rust)" : "1px solid var(--line)",
            background: abierto === "nogusta" ? "var(--rust-soft)" : "transparent",
            color: "var(--rust)",
          }}
        >
          <ThumbsDown size={14} /> {t(idioma, "comboAfinidad.noMeGusta")}
        </button>
      </div>

      {opciones && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {opciones.map((o) => (
            <button
              key={o.level}
              onClick={() => elegir(o.level)}
              style={{
                fontSize: 11.5, fontWeight: existente?.level === o.level ? 700 : 500,
                padding: "6px 11px", borderRadius: 20, cursor: "pointer",
                border: existente?.level === o.level ? "1px solid var(--green-dark)" : "1px solid var(--line)",
                background: existente?.level === o.level ? "var(--green-dark)" : "var(--card)",
                color: existente?.level === o.level ? "#fff" : "var(--ink)",
              }}
            >
              {t(idioma, o.labelKey)}
            </button>
          ))}
        </div>
      )}

      {existente && (
        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
          {t(idioma, "comboAfinidad.guardado", { nivel: RULE_LEVELS[existente.level] ? t(idioma, "ruleLevel." + existente.level) : existente.level })}
        </div>
      )}
    </div>
  );
}

export function MealDetailModal({ meal, data, onUpdateMeal, onUpsertRule, onClose, completadaHoy, onToggleCompletada, idioma }) {
  const components = mealComponents(data, meal);
  const totals = mealTotals(data, meal);

  function setRaciones(slotKey, value) {
    const v = Math.max(0, Math.round(Number(value) * 100) / 100);
    onUpdateMeal(meal.id, { raciones: { ...(meal.raciones || {}), [slotKey]: v } });
  }

  const anyChanged = components.some((c) => c.raciones !== 1);

  return (
    <ModalShell onClose={onClose} title={`${t(idioma, "dia." + meal.day)} · ${t(idioma, "mealType." + meal.mealType)}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {components.map((c) => (
          <div
            key={c.slotKey}
            style={{
              paddingBottom: 11,
              borderBottom: "1px solid var(--line)",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>
                  {c.label}
                  {c.note && !c.sinCalculo && (
                    <span style={{ fontSize: 10.5, color: "var(--mustard-dark)", fontWeight: 700 }}> · {c.note}</span>
                  )}
                </div>
                {!c.sinCalculo && (
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                    {c.macros ? `${fmt(c.macros.gramos)} g` : t(idioma, "mealDetail.sinDatos")}
                  </div>
                )}
              </div>
              {!c.sinCalculo && <RacionesStepper value={c.raciones} onChange={(v) => setRaciones(c.slotKey, v)} />}
            </div>

            {c.macros && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                <MacroPill label="kcal" value={fmt(c.macros.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
                <MacroPill label="P" value={fmt(c.macros.prot)} color="var(--green-dark)" bg="var(--green-soft)" />
                <MacroPill label="G" value={fmt(c.macros.fat)} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
                <MacroPill label="C" value={fmt(c.macros.carb)} color="var(--coffee)" bg="var(--coffee-soft)" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--green-dark)",
          color: "#fff",
          borderRadius: 10,
          padding: "12px 14px",
          marginTop: 14,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.7, marginBottom: 6 }}>
          {t(idioma, "mealDetail.total")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{fmt(totals.kcal)}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>kcal</span>
          <span style={{ fontSize: 12, opacity: 0.9, marginLeft: "auto" }}>
            P {fmt(totals.prot)} · G {fmt(totals.fat)} · C {fmt(totals.carb)}
          </span>
        </div>
      </div>

      <ComboAfinidad meal={meal} data={data} onUpsertRule={onUpsertRule} idioma={idioma} />

      {meal.rulesApplied && meal.rulesApplied.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {meal.rulesApplied.map((r) => {
            const names = r.itemIds.map((id) => ruleItemLabel(data.ingredients, id, idioma)).join(" + ");
            const isNulaForced = r.level === "nula";
            return (
              <div
                key={r.id}
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5,
                  color: isNulaForced ? "var(--rust)" : "var(--ink-soft)",
                }}
              >
                {isNulaForced
                  ? t(idioma, "mealDetail.reglaEvitada", { nombres: names })
                  : t(idioma, "mealDetail.reglaAplicada", { nombres: names, nivel: RULE_LEVELS[r.level] ? t(idioma, "ruleLevel." + r.level) : r.level })}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>
          {t(idioma, "mealDetail.racionBase")}
        </span>
        {anyChanged && (
          <button
            onClick={() => onUpdateMeal(meal.id, { raciones: {} })}
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5,
              border: "1px solid var(--line)", background: "transparent",
              borderRadius: 7, padding: "5px 10px", color: "var(--ink-soft)",
            }}
          >
            {t(idioma, "mealDetail.restablecer")}
          </button>
        )}
      </div>

      <button
        onClick={onToggleCompletada}
        style={{
          width: "100%", marginTop: 14, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700,
          color: completadaHoy ? "#fff" : "var(--green-dark)",
          background: completadaHoy ? "var(--green)" : "var(--green-soft)",
          border: "none", borderRadius: 9, padding: "11px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
        }}
      >
        <Check size={15} /> {completadaHoy ? t(idioma, "mealDetail.completadaHoy") : t(idioma, "mealDetail.marcarCompletada")}
      </button>
    </ModalShell>
  );
}

// Control de raciones: botones -/+ en pasos de 0,1 y campo editable para valores concretos.
function RacionesStepper({ value, onChange }) {
  const btn = {
    width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line)",
    background: "var(--paper)", color: "var(--ink)", fontSize: 15, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <button style={btn} onClick={() => onChange(Math.max(0, value - 0.1))}>−</button>
      <input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        style={{
          width: 52, textAlign: "center", padding: "4px 2px", borderRadius: 6,
          border: "1px solid var(--line)", background: "#fff", color: "var(--ink)",
          fontSize: 13, fontWeight: 700,
        }}
      />
      <button style={btn} onClick={() => onChange(value + 0.1)}>+</button>
    </div>
  );
}
