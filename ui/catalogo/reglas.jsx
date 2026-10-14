// ---------- ui/catalogo/reglas.jsx ----------
// Reglas de combinación (afinidad entre alimentos concretos): lista, edición y borrado.
import React, { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { RULE_LEVELS } from "seleccion";
import { uid } from "comun";
import { t } from "i18n";
import { ModalShell, Field, inputStyle, ModalBtn, IconBtn } from "../comun/modal.jsx";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// Elementos que pueden participar en una regla de combinación: proteínas (incluidos los miembros
// de bloque, como carne picada o hamburguesas), carbos, verduras y el especial (garbanzos).
// Los platos cerrados, desayunos y meriendas quedan fuera porque no se combinan con nada.
function ruleSelectableItems(ingredients) {
  return ingredients.filter((i) => ["proteina", "carbo", "verdura", "grasa", "especial"].includes(i.category));
}

export function ruleItemLabel(ingredients, id, idioma) {
  const ing = ingredients.find((i) => i.id === id);
  return ing ? ing.name : t(idioma, "rulesView.alimentoEliminado");
}

export function RulesView({ rules, ingredients, onEdit, onNew, onDelete, idioma }) {
  return (
    <>
      <SectionIntro text={t(idioma, "rulesView.intro")} />

      <button
        onClick={onNew}
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
          color: "#fff", background: "var(--green)", border: "none", borderRadius: 9,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
        }}
      >
        <Plus size={15} /> {t(idioma, "rulesView.nuevaRegla")}
      </button>

      {rules.length === 0 ? (
        <div style={{
          border: "1.5px dashed var(--line)", borderRadius: 12, padding: "34px 18px",
          textAlign: "center", color: "var(--ink-soft)",
          fontFamily: FUENTE_TEXTO, fontSize: 13,
        }}>
          {t(idioma, "rulesView.sinReglas")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((rule) => {
            const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id, idioma));
            return (
              <div key={rule.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>{names.join(" + ")}</div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <IconBtn onClick={() => onEdit(rule)}><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDelete(rule)}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700,
                    display: "inline-block", padding: "3px 9px", borderRadius: 20, marginTop: 8,
                    background: rule.level === "maxima" ? "var(--green-dark)" : rule.level === "nula" ? "var(--rust-soft)" : rule.level === "alta" ? "var(--green-soft)" : "var(--mustard-soft)",
                    color: rule.level === "maxima" ? "#fff" : rule.level === "nula" ? "var(--rust)" : rule.level === "alta" ? "var(--green-dark)" : "var(--mustard-dark)",
                  }}
                >
                  {t(idioma, "ruleLevel." + rule.level)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function RuleEditModal({ state, ingredients, onClose, onSave, idioma }) {
  const existing = state.rule;
  const items = ruleSelectableItems(ingredients);
  const [id1, setId1] = useState(existing?.itemIds?.[0] ?? "");
  const [id2, setId2] = useState(existing?.itemIds?.[1] ?? "");
  const [id3, setId3] = useState(existing?.itemIds?.[2] ?? "");
  const [id4, setId4] = useState(existing?.itemIds?.[3] ?? "");
  const [level, setLevel] = useState(existing?.level ?? "alta");

  const chosenIds = [id1, id2, id3, id4].filter(Boolean);
  const valid = id1 && id2 && new Set(chosenIds).size === chosenIds.length;

  function handleSave() {
    if (!valid) return;
    onSave({ id: existing ? existing.id : uid(), itemIds: chosenIds, level });
  }

  return (
    <ModalShell onClose={onClose} title={state.mode === "new" ? t(idioma, "ruleEditModal.nuevaTitulo") : t(idioma, "ruleEditModal.editarTitulo")}>
      <Field label={t(idioma, "ruleEditModal.elemento1")}>
        <select value={id1} onChange={(e) => setId1(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.elige")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento2")}>
        <select value={id2} onChange={(e) => setId2(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.elige")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento3")}>
        <select value={id3} onChange={(e) => setId3(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.ninguno")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "ruleEditModal.elemento4")}>
        <select value={id4} onChange={(e) => setId4(e.target.value)} style={inputStyle}>
          <option value="">{t(idioma, "ruleEditModal.ninguno")}</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </Field>

      <Field label={t(idioma, "ruleEditModal.nivelAfinidad")}>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
          {Object.keys(RULE_LEVELS).map((key) => (
            <option key={key} value={key}>{t(idioma, "ruleLevel." + key)}</option>
          ))}
        </select>
      </Field>

      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginTop: -4 }}>
        {level === "nula" && t(idioma, "ruleEditModal.explicacionNula")}
        {level === "baja" && t(idioma, "ruleEditModal.explicacionBaja")}
        {level === "alta" && t(idioma, "ruleEditModal.explicacionAlta")}
        {level === "maxima" && t(idioma, "ruleEditModal.explicacionMaxima")}
      </p>

      {!valid && (id1 || id2) && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>
          {t(idioma, "ruleEditModal.eligeAlMenos2")}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

export function ConfirmRuleDeleteModal({ rule, ingredients, onCancel, onConfirm, idioma }) {
  const names = rule.itemIds.map((id) => ruleItemLabel(ingredients, id, idioma));
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmRuleDelete.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "confirmRuleDelete.textoPre")}<strong>{names.join(" + ")}</strong>{t(idioma, "confirmRuleDelete.textoPost")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmRuleDelete.titulo")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
