// ---------- ui/catalogo/platos.jsx ----------
// Configuración de comidas: tarjetas de ingredientes y bloques, y los modales para crearlos,
// editarlos, borrarlos o cambiar su frecuencia.
import React, { useState } from "react";
import { Plus, Trash2, Pencil, AlertCircle, Link2 } from "lucide-react";
import { composedMacros, fmt } from "macros";
import { uid } from "comun";
import { t } from "i18n";
import { CATEGORY_META } from "../comun/categorias.js";
import { ModalShell, Field, inputStyle, ModalBtn, IconBtn } from "../comun/modal.jsx";
import { MacroPill } from "../comun/tarjetas.jsx";

function ruleSummary(ing, idioma) {
  if (ing.ruleType === "base") return t(idioma, "catalogo.baseDelMenu");
  if (ing.ruleType === "frecuencia") {
    const periodo = ing.freqPeriodo === "ciclo" ? t(idioma, "catalogo.cada2Semanas") : t(idioma, "catalogo.porSemana");
    return t(idioma, "catalogo.vecesXPeriodo", { n: ing.freqCantidad, periodo });
  }
  if (ing.ruleType === "probabilidad") return t(idioma, "catalogo.probabilidadPct", { n: ing.probabilidad });
  return "";
}

export function IngredientCard({ ingredient, data, onEdit, onDelete, extraNote, idioma }) {
  const meta = CATEGORY_META[ingredient.category];
  const m = data ? composedMacros(data, ingredient, 1) : null;
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 14px 12px",
        position: "relative",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 15, lineHeight: 1.3 }}>
          {ingredient.name}
          {ingredient.cantidad && (
            <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, color: "var(--ink-soft)", display: "block", marginTop: 2 }}>
              {ingredient.cantidad}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={onEdit}><Pencil size={13} /></IconBtn>
          <IconBtn onClick={onDelete}><Trash2 size={13} /></IconBtn>
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 11.5,
          fontWeight: 700,
          color: meta.color,
          background: meta.bg,
          display: "inline-block",
          padding: "3px 9px",
          borderRadius: 20,
          marginTop: 10,
        }}
      >
        {ruleSummary(ingredient, idioma)}
      </div>

      {m ? (
        <div style={{ marginTop: 9 }}>
          <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: "var(--ink-soft)", marginBottom: 4 }}>
            {t(idioma, "catalogo.unaRacion", { g: m.gramos })}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <MacroPill label="kcal" value={fmt(m.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
            <MacroPill label="P" value={fmt(m.prot)} color="var(--green-dark)" bg="var(--green-soft)" />
            <MacroPill label="G" value={fmt(m.fat)} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
            <MacroPill label="C" value={fmt(m.carb)} color="var(--coffee)" bg="var(--coffee-soft)" />
          </div>
        </div>
      ) : (
        <div style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5,
          color: "var(--ink-soft)", marginTop: 9, display: "flex", alignItems: "center", gap: 4,
        }}>
          <AlertCircle size={11} /> {t(idioma, "catalogo.sinEnlazar")}
        </div>
      )}

      {extraNote && (
        <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
          {extraNote}
        </div>
      )}
    </div>
  );
}

export function BlockCard({ block, data, members, onUpdateBlock, onEditMember, onDeleteMember, onAddMember, onEditFrequency, showProbabilities, idioma }) {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        background: "var(--card)",
        border: "1.5px dashed var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 15 }}>{block.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--mustard-dark)",
              background: "var(--mustard-soft)",
              padding: "3px 9px",
              borderRadius: 20,
            }}
          >
            {t(idioma, "catalogo.grupoFrecuencia", { n: block.cicloFrecuencia })}
          </div>
          {!block.weeklyPattern && onEditFrequency && (
            <IconBtn onClick={() => onEditFrequency(block)}><Pencil size={11} /></IconBtn>
          )}
        </div>
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", margin: "8px 0 12px 0" }}>
        {block.distribucion}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 13,
            }}
          >
            <span>{m.name}</span>
            {(() => {
              const mm = data ? composedMacros(data, m, 1) : null;
              return mm ? (
                <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)" }}>
                  {mm.gramos} g · {fmt(mm.kcal)} kcal
                </span>
              ) : null;
            })()}
            {showProbabilities && (
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--mustard-dark)", fontWeight: 700 }}>
                {m.probabilidad}%
              </span>
            )}
            <IconBtn onClick={() => onEditMember(m)}><Pencil size={11} /></IconBtn>
            <IconBtn onClick={() => onDeleteMember(m)}><Trash2 size={11} /></IconBtn>
          </div>
        ))}
        <button
          onClick={onAddMember}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px dashed var(--line)",
            background: "transparent",
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <Plus size={12} /> {t(idioma, "catalogo.anadirAlGrupo")}
        </button>
      </div>
    </div>
  );
}

export function EditModal({ state, foods = [], onClose, onSave, idioma }) {
  const { mode, category, blockId } = state;
  const existing = state.ingredient;
  const [name, setName] = useState(existing ? existing.name : "");
  const [ruleType, setRuleType] = useState(existing ? existing.ruleType : (blockId ? "bloque_miembro" : ["carbo", "verdura", "grasa", "desayuno", "media_manana", "merienda"].includes(category) ? "probabilidad" : "frecuencia"));
  const [freqCantidad, setFreqCantidad] = useState(existing?.freqCantidad ?? 1);
  const [freqPeriodo, setFreqPeriodo] = useState(existing?.freqPeriodo ?? "semana");
  const [probabilidad, setProbabilidad] = useState(existing?.probabilidad ?? 25);
  const [cantidad, setCantidad] = useState(existing?.cantidad ?? "");
  const [foodId, setFoodId] = useState(existing?.foodId ?? "");
  const [gramos, setGramos] = useState(existing?.gramos ?? "");
  const [composicion, setComposicion] = useState(
    existing?.composicion ? existing.composicion.map((c) => ({ ...c })) : []
  );

  const isBlockMember = category === "cerrado" || !!blockId;
  // Desayuno, media mañana, merienda y platos cerrados son "platos completos": se componen
  // sumando varios alimentos de la base de datos, en vez de enlazar uno solo directamente.
  const usesComposition = category === "desayuno" || category === "media_manana" || category === "merienda" || (isBlockMember && category === "cerrado");
  const selectedFood = foods.find((f) => f.id === foodId) || null;

  function addComposRow() {
    setComposicion((rows) => [...rows, { id: uid(), foodId: "", gramos: "" }]);
  }
  function updateComposRow(id, patch) {
    setComposicion((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeComposRow(id) {
    setComposicion((rows) => rows.filter((r) => r.id !== id));
  }
  const composTotal = composicion.reduce((acc, row) => {
    const f = foods.find((ff) => ff.id === row.foodId);
    if (!f || !row.gramos) return acc;
    const factor = Number(row.gramos) / 100;
    return { kcal: acc.kcal + f.kcal * factor, prot: acc.prot + f.prot * factor, fat: acc.fat + f.fat * factor, carb: acc.carb + f.carb * factor };
  }, { kcal: 0, prot: 0, fat: 0, carb: 0 });

  // Vista previa en vivo de los macros de una ración, para comprobar que los gramos cuadran
  // antes de guardar, sin tener que ir al menú a verificarlo.
  const preview = selectedFood && gramos
    ? {
        kcal: (selectedFood.kcal * Number(gramos)) / 100,
        prot: (selectedFood.prot * Number(gramos)) / 100,
        fat: (selectedFood.fat * Number(gramos)) / 100,
        carb: (selectedFood.carb * Number(gramos)) / 100,
      }
    : null;

  function handleSave() {
    if (!name.trim()) return;
    const ing = {
      id: existing ? existing.id : uid(),
      name: name.trim(),
      category,
      ruleType: isBlockMember ? "bloque_miembro" : ruleType,
      active: true,
      cantidad: cantidad.trim() || undefined,
      ...(usesComposition
        ? { composicion: composicion.filter((c) => c.foodId && c.gramos).map((c) => ({ id: c.id, foodId: c.foodId, gramos: Number(c.gramos) })) }
        : { foodId: foodId || undefined, gramos: gramos ? Number(gramos) : undefined }),
      ...(existing?.peso !== undefined ? { peso: existing.peso } : {}),
      ...(blockId ? { blockId } : existing?.blockId ? { blockId: existing.blockId } : {}),
    };
    if (!isBlockMember && ruleType === "frecuencia") {
      ing.freqCantidad = Number(freqCantidad);
      ing.freqPeriodo = freqPeriodo;
    }
    if ((!isBlockMember && ruleType === "probabilidad") || (isBlockMember && category === "cerrado")) {
      ing.probabilidad = Number(probabilidad);
    }
    onSave(ing);
  }

  return (
    <ModalShell onClose={onClose} title={mode === "new" ? t(idioma, "editModal.tituloNuevo") : t(idioma, "editModal.tituloEditar")}>
      <Field label={t(idioma, "editModal.nombre")}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder={t(idioma, "editModal.nombrePlaceholder")}
        />
      </Field>

      {usesComposition ? (
        <div
          style={{
            background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
            padding: "11px 12px", marginBottom: 12,
          }}
        >
          <div style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700,
            color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5,
            marginBottom: 9, display: "flex", alignItems: "center", gap: 5,
          }}>
            <Link2 size={12} /> {t(idioma, "editModal.ingredientesDelPlato")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {composicion.map((row) => {
              const f = foods.find((ff) => ff.id === row.foodId);
              const rowKcal = f && row.gramos ? fmt((f.kcal * Number(row.gramos)) / 100) : null;
              return (
                <div key={row.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 9px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      value={row.foodId}
                      onChange={(e) => updateComposRow(row.id, { foodId: e.target.value })}
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    >
                      <option value="">{t(idioma, "editModal.elegirAlimento")}</option>
                      {foods.map((ff) => (
                        <option key={ff.id} value={ff.id}>{ff.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={row.gramos}
                      onChange={(e) => updateComposRow(row.id, { gramos: e.target.value })}
                      placeholder="g"
                      style={{ ...inputStyle, width: 62, flexShrink: 0 }}
                    />
                    <IconBtn onClick={() => removeComposRow(row.id)}><Trash2 size={12} /></IconBtn>
                  </div>
                  {rowKcal !== null && (
                    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 5 }}>
                      {rowKcal} kcal
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addComposRow}
            style={{
              display: "flex", alignItems: "center", gap: 6, border: "1px dashed var(--line)",
              background: "transparent", borderRadius: 7, padding: "7px 10px", fontSize: 12.5,
              color: "var(--ink-soft)", fontFamily: "'Helvetica Neue', Arial, sans-serif", marginBottom: 10,
            }}
          >
            <Plus size={12} /> {t(idioma, "editModal.anadirIngrediente")}
          </button>

          {composicion.length > 0 ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", alignSelf: "center", marginRight: 2 }}>
                {t(idioma, "editModal.totalDelPlato")}
              </span>
              <MacroPill label="kcal" value={fmt(composTotal.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
              <MacroPill label="P" value={`${fmt(composTotal.prot)} g`} color="var(--green-dark)" bg="var(--green-soft)" />
              <MacroPill label="G" value={`${fmt(composTotal.fat)} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
              <MacroPill label="C" value={`${fmt(composTotal.carb)} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
            </div>
          ) : (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              {t(idioma, "editModal.anadeIngrediente")}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
            padding: "11px 12px", marginBottom: 12,
          }}
        >
          <div style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700,
            color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5,
            marginBottom: 8, display: "flex", alignItems: "center", gap: 5,
          }}>
            <Link2 size={12} /> {t(idioma, "editModal.datosNutricionales")}
          </div>

          <Field label={t(idioma, "editModal.alimentoBaseDatos")}>
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)} style={inputStyle}>
              <option value="">{t(idioma, "editModal.sinEnlazar")}</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>

          <Field label={t(idioma, "editModal.gramosPorRacion")}>
            <input
              type="number"
              min={0}
              value={gramos}
              onChange={(e) => setGramos(e.target.value)}
              style={inputStyle}
              placeholder={t(idioma, "editModal.gramosPlaceholder")}
            />
          </Field>

          {preview ? (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
              <MacroPill label="kcal" value={fmt(preview.kcal)} color="var(--rust)" bg="var(--rust-soft)" />
              <MacroPill label="P" value={`${fmt(preview.prot)} g`} color="var(--green-dark)" bg="var(--green-soft)" />
              <MacroPill label="G" value={`${fmt(preview.fat)} g`} color="var(--mustard-dark)" bg="var(--mustard-soft)" />
              <MacroPill label="C" value={`${fmt(preview.carb)} g`} color="var(--coffee)" bg="var(--coffee-soft)" />
            </div>
          ) : (
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: "var(--ink-soft)" }}>
              {t(idioma, "editModal.enlazaAlimento")}
            </div>
          )}
        </div>
      )}

      <Field label={t(idioma, "editModal.notaCantidad")}>
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={inputStyle}
          placeholder={t(idioma, "editModal.notaCantidadPlaceholder")}
        />
      </Field>

      {!isBlockMember && category === "proteina" && (
        <Field label={t(idioma, "editModal.tipoDeRegla")}>
          <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} style={inputStyle}>
            <option value="frecuencia">{t(idioma, "editModal.frecuenciaFija")}</option>
            <option value="base">{t(idioma, "editModal.baseDelMenuOpcion")}</option>
          </select>
        </Field>
      )}

      {!isBlockMember && ruleType === "frecuencia" && (
        <Field label={t(idioma, "editModal.frecuencia")}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              min={1}
              value={freqCantidad}
              onChange={(e) => setFreqCantidad(e.target.value)}
              style={{ ...inputStyle, width: 70 }}
            />
            <select value={freqPeriodo} onChange={(e) => setFreqPeriodo(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="semana">{t(idioma, "catalogo.porSemana")}</option>
              <option value="ciclo">{t(idioma, "catalogo.cada2Semanas")}</option>
            </select>
          </div>
        </Field>
      )}

      {!isBlockMember && ruleType === "probabilidad" && (
        <Field label={t(idioma, "editModal.probabilidadPct")}>
          <input
            type="number"
            min={0}
            max={100}
            value={probabilidad}
            onChange={(e) => setProbabilidad(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      {isBlockMember && category === "cerrado" && (
        <Field label={t(idioma, "editModal.probabilidadDentroGrupo")}>
          <input
            type="number"
            min={0}
            max={100}
            value={probabilidad}
            onChange={(e) => setProbabilidad(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleSave} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

export function ConfirmModal({ ingredient, onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "confirmModal.titulo")}>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)" }}>
        {t(idioma, "confirmModal.textoPre")}<strong>{ingredient.name}</strong>{t(idioma, "confirmModal.textoPost")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "confirmModal.titulo")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

export function FrequencyModal({ block, onClose, onSave, idioma }) {
  const [value, setValue] = useState(block.cicloFrecuencia);
  return (
    <ModalShell onClose={onClose} title={t(idioma, "frequencyModal.titulo", { nombre: block.name })}>
      <Field label={t(idioma, "frequencyModal.vecesCada2Semanas")}>
        <input
          type="number"
          min={1}
          max={28}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginTop: -4 }}>
        {t(idioma, "frequencyModal.ejemplo")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={() => onSave(Number(value) || 1)} variant="solid">{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
