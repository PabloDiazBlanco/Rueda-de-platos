// ---------- ui/premium/que-cocino.jsx ----------
// «¿Qué cocino?» (premium, Gemini vía Cloud Function). Desde E2 (25-oct-2026) tiene dos modos:
// - «Con lo que tengo»: con lo que hay en casa —la despensa entera, si se quiere, además de la foto y del
//   texto de siempre—, Gemini propone recetas con sentido gastronómico (una combinación coherente, no todo
//   mezclado), con especias y básicos.
// - «Tipo restaurante»: parte de lo que hay y sugiere comprar una a tres cosas más elaboradas (una especia
//   concreta, una salsa...) para un plato de restaurante; lo que hay que comprar sale marcado.
// Devuelve **recetas con ingredientes y pasos, sin macros** (la regla de antes —solo alimentos del catálogo y
// macros con composedMacros— cambió con E2: ver CLAUDE.md, «Servicios de IA»). Si una receta usa alimentos
// del catálogo con gramos, se puede guardar como plato cerrado, y entonces sus macros las calcula la app, como
// siempre. Los dos modos comparten la cuota mensual (10, premium). La función es functions/suggestRecipes.js,
// a través de window.suggestRecipes (auth-bootstrap.jsx).
import React, { useState, useRef } from "react";
import { Camera, ShoppingBag, ChefHat, Sparkles } from "lucide-react";
import { getFood } from "macros";
import { resumenDespensaParaIA } from "despensa";
import { t } from "i18n";
import { mensajeErrorFuncion } from "../comun/errores.js";
import { inputStyle } from "../comun/modal.jsx";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { PensandoCocina, esperaMinimaPensando } from "./cocinando.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

export function SuggestMealsView({ data, despensa, onGuardarComoCerrado, idioma }) {
  const [modo, setModo] = useState("conLoQueTengo");
  const [usarDespensa, setUsarDespensa] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [otrosIngredientes, setOtrosIngredientes] = useState("");
  const [especias, setEspecias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recetas, setRecetas] = useState(null);
  const fileInputRef = useRef(null);

  // Lo que hay en casa, en una línea por alimento («Arroz · 800 g», «Tomate · sí»).
  const enCasa = resumenDespensaParaIA(despensa && despensa.despensa, data.foods);
  const mandaDespensa = usarDespensa && enCasa.length > 0;
  const puedePedir = !!photo || !!otrosIngredientes.trim() || mandaDespensa;

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function pedir() {
    if (!puedePedir || loading) return;
    setLoading(true);
    setError("");
    setRecetas(null);
    // Mientras piensa se ve la escena de la cocina (PensandoCocina), con una espera mínima para que no
    // aparezca y desaparezca de golpe si Gemini contesta muy rápido; si tarda más, no se añade nada.
    const hasta = Date.now() + esperaMinimaPensando();
    const esperarMinimo = () => new Promise((listo) => setTimeout(listo, Math.max(0, hasta - Date.now())));
    try {
      const catalogo = (data.foods || []).map((f) => ({ id: f.id, name: f.name }));
      const r = await window.suggestRecipes({
        modo, photoDataUrl: photo, especias, otrosIngredientes, catalogo, idioma,
        despensa: mandaDespensa ? enCasa : [],
      });
      await esperarMinimo();
      setRecetas(r);
    } catch (err) {
      await esperarMinimo();
      setError(mensajeErrorFuncion(err, idioma, "cocinar"));
    } finally {
      setLoading(false);
    }
  }

  // Lo que se puede guardar como plato cerrado: los ingredientes que son alimentos del catálogo y traen gramos.
  const composicionDe = (receta) => receta.ingredientes
    .filter((i) => i.id && i.gramos && getFood(data, i.id))
    .map((i) => ({ foodId: i.id, gramos: i.gramos }));

  const botonModo = (clave, Icono, etiqueta) => (
    <button
      onClick={() => { setModo(clave); setRecetas(null); }}
      aria-pressed={modo === clave}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
        padding: "9px 10px", borderRadius: 20, border: "1px solid var(--line)", cursor: "pointer",
        background: modo === clave ? "var(--green-dark)" : "var(--card)", color: modo === clave ? "#fff" : "var(--ink)",
      }}
    >
      <Icono size={14} /> {etiqueta}
    </button>
  );

  return (
    <>
      <SectionIntro text={t(idioma, "queCocino.intro")} />

      <div role="group" style={{ display: "flex", gap: 8, maxWidth: 480, marginBottom: 8 }}>
        {botonModo("conLoQueTengo", ChefHat, t(idioma, "queCocino.modo.conLoQueTengo"))}
        {botonModo("restaurante", Sparkles, t(idioma, "queCocino.modo.restaurante"))}
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", maxWidth: 480, marginBottom: 12, lineHeight: 1.45 }}>
        {t(idioma, modo === "restaurante" ? "queCocino.modo.restauranteAyuda" : "queCocino.modo.conLoQueTengoAyuda")}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px", marginBottom: 16, maxWidth: 480 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: FUENTE_TEXTO, fontSize: 13, marginBottom: 12, cursor: enCasa.length ? "pointer" : "default", opacity: enCasa.length ? 1 : 0.6 }}>
          <input type="checkbox" checked={mandaDespensa} disabled={!enCasa.length} onChange={(e) => setUsarDespensa(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--green)", marginTop: 1 }} />
          <span>
            {enCasa.length ? t(idioma, "queCocino.usarDespensa", { n: enCasa.length }) : t(idioma, "queCocino.despensaVacia")}
            {mandaDespensa && <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{enCasa.slice(0, 8).map((x) => x.nombre).join(", ")}{enCasa.length > 8 ? "…" : ""}</span>}
          </span>
        </label>

        {photo ? <img src={photo} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12, display: "block" }} /> : null}
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
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>{t(idioma, "queCocino.otros")}</div>
        <input value={otrosIngredientes} onChange={(e) => setOtrosIngredientes(e.target.value)} placeholder={t(idioma, "suggestMeals.placeholderIngredientes")} style={{ ...inputStyle, marginBottom: 12, fontSize: 16 }} />

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>{t(idioma, "suggestMeals.especias")}</div>
        <input value={especias} onChange={(e) => setEspecias(e.target.value)} placeholder={t(idioma, "suggestMeals.placeholderEspecias")} style={{ ...inputStyle, marginBottom: 12, fontSize: 16 }} />

        <button
          onClick={pedir}
          disabled={!puedePedir || loading}
          style={{
            width: "100%", fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, color: "#fff",
            background: puedePedir && !loading ? "var(--green)" : "var(--line)", border: "none", borderRadius: 9, padding: "12px",
            cursor: puedePedir && !loading ? "pointer" : "default",
          }}
        >
          {loading ? t(idioma, "premiumView.unMomento") : t(idioma, "suggestMeals.queCocino")}
        </button>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.45 }}>{t(idioma, "queCocino.cuotaYPrivacidad")}</div>

        {error && (
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--rust)", background: "var(--rust-soft)", borderRadius: 8, padding: "9px 12px", marginTop: 10 }}>{error}</div>
        )}
      </div>

      {loading && <PensandoCocina idioma={idioma} />}

      {recetas && recetas.length === 0 && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", maxWidth: 480 }}>{t(idioma, "queCocino.sinResultados")}</div>
      )}

      {recetas && recetas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
          {recetas.map((r, i) => {
            const composicion = composicionDe(r);
            return (
              <article key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px" }}>
                <h3 style={{ fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 17, color: "var(--green-dark)", margin: "0 0 4px" }}>{r.nombre}</h3>
                {r.porque && <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.45 }}>{r.porque}</div>}
                <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 4 }}>{t(idioma, "queCocino.ingredientes")}</div>
                <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontFamily: FUENTE_TEXTO, fontSize: 13.5, lineHeight: 1.6 }}>
                  {r.ingredientes.map((ing, k) => (
                    <li key={k}>
                      {ing.nombre}{ing.cantidad ? <span style={{ color: "var(--ink-soft)" }}> · {ing.cantidad}</span> : null}
                      {ing.comprar && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "var(--mustard-dark)", background: "var(--mustard-soft)", padding: "1px 7px", borderRadius: 20 }}>
                          <ShoppingBag size={10} /> {t(idioma, "queCocino.comprar")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 4 }}>{t(idioma, "queCocino.pasos")}</div>
                <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontFamily: FUENTE_TEXTO, fontSize: 13.5, lineHeight: 1.55 }}>
                  {r.pasos.map((p, k) => <li key={k} style={{ marginBottom: 3 }}>{p}</li>)}
                </ol>
                {composicion.length > 0 && (
                  <button
                    onClick={() => onGuardarComoCerrado({ nombre: r.nombre, composicion })}
                    style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}
                  >
                    {t(idioma, "suggestMeals.guardarComoCerrado")}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
