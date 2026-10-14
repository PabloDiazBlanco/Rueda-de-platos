// ---------- ui/perfil/reparto-comidas.jsx ----------
// Pantalla y campos del reparto de comidas (presets de 2 a 5 comidas y su peso en kcal).
import React, { useState } from "react";
import { PRESETS_COMIDAS, repartoUniforme } from "objetivos";
import { t } from "i18n";
import { inputStyle } from "../comun/modal.jsx";

// Reparto de comidas: destino propio en el menú lateral desde la Tanda 2, dentro de "Configuración
// de comidas" — antes vivía al final de Perfil. Mismo contenido y misma lógica de siempre (Fase 4),
// solo cambia dónde vive.
export function RepartoComidasView({ perfil, onSave, idioma }) {
  const [presetId, setPresetId] = useState(perfil?.presetComidas ?? "clasico-4");
  const presetActual = PRESETS_COMIDAS.find((p) => p.id === presetId) || PRESETS_COMIDAS[0];
  const [pesos, setPesos] = useState(() => {
    if (perfil?.repartoComidas) {
      const pct = {};
      Object.keys(perfil.repartoComidas).forEach((m) => { pct[m] = Math.round(perfil.repartoComidas[m] * 100); });
      return pct;
    }
    return presetActual.pesosPorDefecto ? { ...presetActual.pesosPorDefecto } : repartoUniforme(presetActual.meals);
  });
  const [saved, setSaved] = useState(false);

  function selectPreset(preset) {
    if (preset.id === presetId) return;
    setPresetId(preset.id);
    setPesos(preset.pesosPorDefecto ? { ...preset.pesosPorDefecto } : repartoUniforme(preset.meals));
  }

  const sumaPesos = presetActual.meals.reduce((s, m) => s + (Number(pesos[m]) || 0), 0);
  const repartoValido = sumaPesos === 100;

  function handleSave() {
    if (!repartoValido) return;
    const repartoComidas = {};
    presetActual.meals.forEach((m) => { repartoComidas[m] = (Number(pesos[m]) || 0) / 100; });
    onSave({ ...perfil, presetComidas: presetId, repartoComidas });
    setSaved(true);
  }

  return (
    <>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <RepartoComidasFields
          presetId={presetId} presetActual={presetActual} pesos={pesos} setPesos={setPesos}
          onSelectPreset={selectPreset} sumaPesos={sumaPesos} repartoValido={repartoValido} idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          disabled={!repartoValido}
          style={{
            width: "100%", marginTop: 18, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: repartoValido ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: repartoValido ? "pointer" : "default",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--green-dark)",
              background: "var(--green-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {t(idioma, "perfilView.guardadoOk")}
          </div>
        )}
      </div>
    </>
  );
}

// El contenido en sí de "Reparto de comidas", sin estado propio ni botón de guardar — lo maneja
// quien lo use: RepartoComidasView (guarda al momento) o el asistente de alta por pasos, Tanda 3
// (guarda junto con el resto del perfil al terminar el asistente entero).
export function RepartoComidasFields({ presetId, presetActual, pesos, setPesos, onSelectPreset, sumaPesos, repartoValido, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
        {t(idioma, "perfilView.repartoComidas.titulo")}
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)", marginBottom: 14, lineHeight: 1.5 }}>
        {t(idioma, "perfilView.repartoComidas.intro")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {PRESETS_COMIDAS.map((preset) => {
          const elegido = preset.id === presetId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              style={{
                textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif",
                padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
                background: elegido ? "var(--green-soft)" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: elegido ? "var(--green-dark)" : "var(--ink)" }}>
                  {t(idioma, "preset." + preset.id + ".label")}
                </span>
                {preset.recomendado && (
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700, color: "var(--mustard-dark)", background: "var(--mustard-soft)",
                      borderRadius: 20, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.3,
                    }}
                  >
                    {t(idioma, "perfilView.recomendado")}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.45 }}>{t(idioma, "preset." + preset.id + ".texto")}</div>
            </button>
          );
        })}
      </div>

      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {t(idioma, "perfilView.pesoDeCadaComida")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {presetActual.meals.map((mealType) => (
          <React.Fragment key={mealType}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "var(--ink)" }}>
                {t(idioma, "mealType." + mealType)}
              </span>
              <input
                type="number" min={0} max={100} step={1}
                value={pesos[mealType] ?? 0}
                onChange={(e) => setPesos((p) => ({ ...p, [mealType]: e.target.value }))}
                style={{ ...inputStyle, width: 64, textAlign: "right" }}
              />
              <span style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, color: "var(--ink-soft)" }}>%</span>
            </div>
            {mealType === "Cena" && (
              <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: -2 }}>
                {t(idioma, "avisoCena")}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 700, marginTop: 12,
          color: repartoValido ? "var(--green-dark)" : "var(--rust)",
        }}
      >
        {t(idioma, "perfilView.suma", { n: sumaPesos })}{!repartoValido && t(idioma, "perfilView.sumaAviso")}
      </div>
    </>
  );
}
