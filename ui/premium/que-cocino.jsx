// ---------- ui/premium/que-cocino.jsx ----------
// «¿Qué puedo cocinar con lo que tengo?» (premium, Gemini vía Cloud Function).
import React, { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { composedMacros, fmt } from "macros";
import { t } from "i18n";
import { inputStyle } from "../comun/modal.jsx";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// "¿Qué puedo cocinar con lo que tengo?" — manda una foto (más, opcionalmente, las especias que
// tengas) a la Cloud Function, que identifica alimentos de tu propio catálogo en la imagen y
// sugiere combinaciones. Las macros de cada sugerencia se calculan aquí con composedMacros, igual
// que cualquier otro plato de la app — nunca son un número que haya devuelto la IA directamente.
export function SuggestMealsView({ data, onGuardarComoCerrado, idioma }) {
  const [photo, setPhoto] = useState(null);
  const [otrosIngredientes, setOtrosIngredientes] = useState("");
  const [especias, setEspecias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sugerencias, setSugerencias] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleAnalizar() {
    if (!photo && !otrosIngredientes.trim()) return;
    setLoading(true);
    setError("");
    setSugerencias(null);
    try {
      const catalogo = (data.foods || []).map((f) => ({ id: f.id, name: f.name }));
      const resultado = await window.suggestMeals({ photoDataUrl: photo, especias, otrosIngredientes, catalogo });
      setSugerencias(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "suggestMeals.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px", marginBottom: 16, maxWidth: 480 }}>
        {photo ? (
          <img src={photo} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12, display: "block" }} />
        ) : null}

        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            width: "100%", fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
            color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 8,
            padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10,
          }}
        >
          <Camera size={14} /> {photo ? t(idioma, "suggestMeals.cambiarFoto") : t(idioma, "suggestMeals.hacerFoto")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
          {photo ? t(idioma, "suggestMeals.otrosIngredientesConFoto") : t(idioma, "suggestMeals.otrosIngredientesSinFoto")}
        </div>
        <input
          value={otrosIngredientes}
          onChange={(e) => setOtrosIngredientes(e.target.value)}
          placeholder={t(idioma, "suggestMeals.placeholderIngredientes")}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
          {t(idioma, "suggestMeals.especias")}
        </div>
        <input
          value={especias}
          onChange={(e) => setEspecias(e.target.value)}
          placeholder={t(idioma, "suggestMeals.placeholderEspecias")}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <button
          onClick={handleAnalizar}
          disabled={(!photo && !otrosIngredientes.trim()) || loading}
          style={{
            width: "100%", fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
            color: "#fff", background: (photo || otrosIngredientes.trim()) && !loading ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: (photo || otrosIngredientes.trim()) && !loading ? "pointer" : "default",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "suggestMeals.queCocino")}
        </button>

        {error && (
          <div
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--rust)",
              background: "var(--rust-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {sugerencias && sugerencias.length === 0 && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "suggestMeals.sinResultados")}
        </div>
      )}

      {sugerencias && sugerencias.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
          {sugerencias.map((s, i) => {
            const macros = composedMacros(data, { composicion: s.composicion });
            return (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px" }}>
                <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 16, color: "var(--green-dark)", marginBottom: 4 }}>
                  {s.nombre}
                </div>
                {macros && (
                  <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                    {fmt(macros.kcal)} kcal · P {fmt(macros.prot)}g · G {fmt(macros.fat)}g · C {fmt(macros.carb)}g
                  </div>
                )}
                {s.pasos_breves && (
                  <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 12 }}>
                    {s.pasos_breves}
                  </div>
                )}
                <button
                  onClick={() => onGuardarComoCerrado(s)}
                  style={{
                    fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
                    color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 7,
                    padding: "8px 12px", cursor: "pointer",
                  }}
                >
                  {t(idioma, "suggestMeals.guardarComoCerrado")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
