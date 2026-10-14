// ---------- ui/onboarding/asistente-perfil.jsx ----------
// Asistente de alta de perfil (5 pasos) y su indicador de progreso, que también usa el cuestionario.
import React, { useState } from "react";
import { PRESETS_COMIDAS, repartoUniforme } from "objetivos";
import { t, leerIdiomaGuardado } from "i18n";
import { DatosPersonalesFields, EstiloVidaFields, EntrenamientosFields, ObjetivoFields } from "../perfil/campos.jsx";
import { RepartoComidasFields } from "../perfil/reparto-comidas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Asistente de alta por pasos (Bloque 2 del rediseño, Tanda 3): antes era un único formulario
// larguísimo con todos los campos de golpe — ahora son 5 pasos cortos con "Siguiente"/"Atrás",
// mismos campos de siempre y mismo resultado final (un solo onComplete con todo junto, igual que
// antes), solo cambia cómo se rellena. "Saltar" sigue disponible en cualquier paso y abandona el
// asistente entero, como ya hacía antes.
const ONBOARDING_PASOS = ["datos", "estiloVida", "entrenamientos", "objetivo", "reparto"];

export function ProfileOnboarding({ onComplete, onSkip, idioma }) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState("mujer");
  const [anioNacimiento, setAnioNacimiento] = useState("");
  const [altura, setAltura] = useState("");
  const [peso, setPeso] = useState("");
  const [palBase, setPalBase] = useState("escritorio");
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [objetivo, setObjetivo] = useState("mantenimiento");
  const [presetId, setPresetId] = useState("clasico-4");
  const presetActual = PRESETS_COMIDAS.find((p) => p.id === presetId) || PRESETS_COMIDAS[0];
  const [pesos, setPesos] = useState(() =>
    presetActual.pesosPorDefecto ? { ...presetActual.pesosPorDefecto } : repartoUniforme(presetActual.meals)
  );

  function selectPreset(preset) {
    if (preset.id === presetId) return;
    setPresetId(preset.id);
    setPesos(preset.pesosPorDefecto ? { ...preset.pesosPorDefecto } : repartoUniforme(preset.meals));
  }

  const datosValidos = anioNacimiento && altura && peso;
  const sumaPesos = presetActual.meals.reduce((s, m) => s + (Number(pesos[m]) || 0), 0);
  const repartoValido = sumaPesos === 100;
  const puedeAvanzar = paso === 0 ? datosValidos : paso === 4 ? repartoValido : true;

  function terminar() {
    if (!repartoValido) return;
    const repartoComidas = {};
    presetActual.meals.forEach((m) => { repartoComidas[m] = (Number(pesos[m]) || 0) / 100; });
    onComplete({
      nombre: nombre.trim(),
      sexo,
      anioNacimiento: Number(anioNacimiento),
      altura: Number(altura),
      peso: Number(peso),
      palBase,
      entrenamientos: entrenamientos
        .filter((e) => e.horas && e.frecuenciaSemanal)
        .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
      objetivo,
      presetComidas: presetId,
      repartoComidas,
      // El idioma elegido (o detectado) antes de iniciar sesión, en la pantalla de bienvenida —
      // así un perfil nuevo no empieza en español por defecto si ya se había puesto en inglés ahí.
      idioma: leerIdiomaGuardado(),
    });
  }

  function siguiente() {
    if (!puedeAvanzar) return;
    if (paso === ONBOARDING_PASOS.length - 1) terminar();
    else setPaso((p) => p + 1);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🍽️</div>
        <h1 style={{ fontFamily: FUENTE_TITULOS, fontSize: 24, color: "var(--green-dark)", margin: "0 0 6px 0" }}>
          {t(idioma, "onboarding.titulo")}
        </h1>
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          {t(idioma, "onboarding.subtitulo")}
        </p>
      </div>

      <PasosIndicador pasoActual={paso} pasos={ONBOARDING_PASOS} idioma={idioma} labelPrefix="onboarding.paso" />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px" }}>
        {paso === 0 && (
          <DatosPersonalesFields
            nombre={nombre} setNombre={setNombre}
            sexo={sexo} setSexo={setSexo}
            anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
            altura={altura} setAltura={setAltura}
            peso={peso} setPeso={setPeso}
            idioma={idioma}
          />
        )}
        {paso === 1 && <EstiloVidaFields palBase={palBase} setPalBase={setPalBase} idioma={idioma} />}
        {paso === 2 && <EntrenamientosFields entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos} idioma={idioma} />}
        {paso === 3 && (
          <ObjetivoFields
            objetivo={objetivo} setObjetivo={setObjetivo}
            sexo={sexo} anioNacimiento={anioNacimiento} altura={altura} peso={peso}
            palBase={palBase} entrenamientos={entrenamientos} idioma={idioma}
          />
        )}
        {paso === 4 && (
          <RepartoComidasFields
            presetId={presetId} presetActual={presetActual} pesos={pesos} setPesos={setPesos}
            onSelectPreset={selectPreset} sumaPesos={sumaPesos} repartoValido={repartoValido} idioma={idioma}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
                color: "var(--ink)", background: "#fff", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", cursor: "pointer",
              }}
            >
              {t(idioma, "onboarding.atras")}
            </button>
          )}
          <button
            onClick={siguiente}
            disabled={!puedeAvanzar}
            style={{
              flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
              color: "#fff", background: puedeAvanzar ? "var(--green)" : "var(--line)", border: "none",
              borderRadius: 9, padding: "12px", cursor: puedeAvanzar ? "pointer" : "default",
            }}
          >
            {paso === ONBOARDING_PASOS.length - 1 ? t(idioma, "onboarding.guardarContinuar") : t(idioma, "onboarding.siguiente")}
          </button>
        </div>
        <button
          onClick={onSkip}
          style={{
            width: "100%", marginTop: 8, fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "onboarding.saltar")}
        </button>
      </div>
    </div>
  );
}

// Indicador de progreso reutilizado por los dos asistentes de esta tanda (perfil y cuestionario de
// catálogo): "Paso X de N" más una barra de puntos rellenos hasta el paso actual. `pasos` es el
// array de claves de cada asistente (ONBOARDING_PASOS o el del cuestionario) — así no depende de
// cuál de los dos lo esté usando.
export function PasosIndicador({ pasoActual, pasos, idioma, labelPrefix }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 6 }}>
        {pasos.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === pasoActual ? 18 : 6, height: 6, borderRadius: 3,
              background: i <= pasoActual ? "var(--green)" : "var(--line)", transition: "all 0.15s",
            }}
          />
        ))}
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)" }}>
        {t(idioma, "onboarding.pasoXdeN", { actual: pasoActual + 1, total: pasos.length })} · {t(idioma, `${labelPrefix}.${pasos[pasoActual]}`)}
      </div>
    </div>
  );
}
