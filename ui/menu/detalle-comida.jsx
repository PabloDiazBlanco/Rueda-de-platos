// ---------- ui/menu/detalle-comida.jsx ----------
// Detalle de una comida del menú (modal): componentes, raciones ajustables, comida completada y
// afinidad de la combinación (me gusta / no me gusta, que crea o cambia reglas). Desde B1+B3 (25-oct-2026),
// junto a «Hecha» está «Cambié algo» (ui/menu/cambie-algo.jsx), y si la comida se marcó con cambios se
// enseñan sus kcal de verdad junto a las del menú.
import React, { useState } from "react";
import { Check, ThumbsUp, ThumbsDown, Pencil } from "lucide-react";
import { fmt } from "macros";
import { RULE_LEVELS } from "seleccion";
import { mealComponents, mealTotals } from "comida-calculo";
import { uid } from "comun";
import { t } from "i18n";
import { ModalShell } from "../comun/modal.jsx";
import { MacroPill } from "../comun/tarjetas.jsx";
import { ruleItemLabel } from "../catalogo/reglas.jsx";
import { CambieAlgo } from "./cambie-algo.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

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
    <div style={{ marginTop: 12, fontFamily: FUENTE_TEXTO }}>
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

// `avisoDespensa` (opcional): una línea bajo el botón de completada que explica qué pasa con la
// despensa al marcarla (se descuenta, ya se descontó, o no se toca porque el menú no está
// confirmado). La decide quien abre el modal (MenuView), que es quien conoce la despensa.
// `registro`: lo guardado de esta comida si se marcó (ver logica/comida-real.js); `cambiosHoy`: los
// cambios con que se marcó hoy este tipo de comida, para volver a abrir «Cambié algo» con ellos.
// `onGuardarCambios(cambios)`: la marca como hecha con esos cambios.
export function MealDetailModal({ meal, data, onUpdateMeal, onUpsertRule, onClose, completadaHoy, onToggleCompletada, onGuardarCambios, registro, cambiosHoy, avisoDespensa, idioma }) {
  const [cambiando, setCambiando] = useState(false);
  const components = mealComponents(data, meal);
  const totals = mealTotals(data, meal);
  const titulo = `${t(idioma, "dia." + meal.day)} · ${t(idioma, "mealType." + meal.mealType)}`;
  const conCambios = !!(registro && registro.cambios && Object.keys(registro.cambios).length);

  if (cambiando) {
    return (
      <ModalShell onClose={onClose} title={titulo}>
        <CambieAlgo
          data={data}
          meal={meal}
          cambiosIniciales={cambiosHoy}
          onCancelar={() => setCambiando(false)}
          onGuardar={(cambios) => { onGuardarCambios(cambios); setCambiando(false); }}
          idioma={idioma}
        />
      </ModalShell>
    );
  }

  function setRaciones(slotKey, value) {
    const v = Math.max(0, Math.round(Number(value) * 100) / 100);
    onUpdateMeal(meal.id, { raciones: { ...(meal.raciones || {}), [slotKey]: v } });
  }

  const anyChanged = components.some((c) => c.raciones !== 1);

  return (
    <ModalShell onClose={onClose} title={titulo}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {components.map((c) => (
          <div
            key={c.slotKey}
            style={{
              paddingBottom: 11,
              borderBottom: "1px solid var(--line)",
              fontFamily: FUENTE_TEXTO,
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
                <MacroPill label="P" value={fmt(c.macros.prot)} color="var(--macro-prot-texto)" bg="var(--macro-prot-suave)" />
                <MacroPill label="G" value={fmt(c.macros.fat)} color="var(--macro-grasa-texto)" bg="var(--macro-grasa-suave)" />
                <MacroPill label="C" value={fmt(c.macros.carb)} color="var(--macro-carb-texto)" bg="var(--macro-carb-suave)" />
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
          fontFamily: FUENTE_TEXTO,
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
        {/* Si se comió con cambios, lo de verdad (sin tocar el menú: las cifras de arriba siguen siendo
            las planificadas). */}
        {conCambios && (
          <div style={{ fontSize: 12, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            {t(idioma, "mealDetail.comidoReal", { kcal: Math.round(registro.macros.kcal), prot: fmt(registro.macros.prot), fat: fmt(registro.macros.fat), carb: fmt(registro.macros.carb) })}
          </div>
        )}
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
                  fontFamily: FUENTE_TEXTO, fontSize: 10.5,
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
        <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)" }}>
          {t(idioma, "mealDetail.racionBase")}
        </span>
        {anyChanged && (
          <button
            onClick={() => onUpdateMeal(meal.id, { raciones: {} })}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 11.5,
              border: "1px solid var(--line)", background: "transparent",
              borderRadius: 7, padding: "5px 10px", color: "var(--ink-soft)",
            }}
          >
            {t(idioma, "mealDetail.restablecer")}
          </button>
        )}
      </div>

      {/* «Hecha» sigue siendo lo principal (da todo por bueno); al lado, «Cambié algo» para decir qué se
          comió de verdad. */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          onClick={onToggleCompletada}
          style={{
            flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
            color: completadaHoy ? "#fff" : "var(--green-dark)",
            background: completadaHoy ? "var(--green)" : "var(--green-soft)",
            border: "none", borderRadius: 9, padding: "11px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
          }}
        >
          <Check size={15} /> {completadaHoy ? t(idioma, cambiosHoy ? "mealDetail.completadaConCambios" : "mealDetail.completadaHoy") : t(idioma, "mealDetail.marcarCompletada")}
        </button>
        <button
          onClick={() => setCambiando(true)}
          style={{
            flexShrink: 0, fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
            background: "transparent", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 12px",
            display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
          }}
        >
          <Pencil size={13} /> {t(idioma, "cambieAlgo.boton")}
        </button>
      </div>
      {avisoDespensa && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 7, lineHeight: 1.4 }}>
          {avisoDespensa}
        </div>
      )}
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
