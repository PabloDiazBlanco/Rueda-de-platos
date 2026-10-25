// ---------- ui/perfil/perfil.jsx ----------
// Pantallas de Perfil (datos personales) y Actividad diaria.
import React, { useState } from "react";
import { NIVELES_ACTIVIDAD_LEGACY } from "objetivos";
import { uid } from "comun";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { DatosPersonalesFields, ActividadDiariaFields } from "./campos.jsx";
import { MomentoEntrenoFields } from "./preentreno.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// Pestaña "Perfil": desde la Tanda 2 del rediseño de navegación, solo datos personales — actividad
// diaria (ActividadDiariaView) y reparto de comidas (RepartoComidasView) son destinos propios en
// el menú lateral. idioma llega como prop (lo decide Ajustes, ver SettingsView).
export function PerfilView({ perfil, onSave, idioma }) {
  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [sexo, setSexo] = useState(perfil?.sexo ?? "mujer");
  const [anioNacimiento, setAnioNacimiento] = useState(perfil?.anioNacimiento ?? "");
  const [altura, setAltura] = useState(perfil?.altura ?? "");
  const [peso, setPeso] = useState(perfil?.peso ?? "");
  const [saved, setSaved] = useState(false);

  const valid = anioNacimiento && altura && peso;

  function handleSave() {
    if (!valid) return;
    // Se parte de "...perfil" y no de un objeto construido desde cero: onSave sustituye el perfil
    // entero, así que si esta pantalla no incluyera los campos que editan Ajustes, Actividad diaria
    // o Reparto de comidas, guardar aquí los borraría sin querer.
    onSave({
      ...perfil,
      nombre: nombre.trim(),
      sexo,
      anioNacimiento: Number(anioNacimiento),
      altura: Number(altura),
      peso: Number(peso),
    });
    setSaved(true);
  }

  return (
    <>
      <SectionIntro text={t(idioma, "perfilView.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <DatosPersonalesFields
          nombre={nombre} setNombre={setNombre}
          sexo={sexo} setSexo={setSexo}
          anioNacimiento={anioNacimiento} setAnioNacimiento={setAnioNacimiento}
          altura={altura} setAltura={setAltura}
          peso={peso} setPeso={setPeso}
          idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          disabled={!valid}
          style={{
            width: "100%", marginTop: 18, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
            color: "#fff", background: valid ? "var(--green)" : "var(--line)", border: "none",
            borderRadius: 9, padding: "12px", cursor: valid ? "pointer" : "default",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--green-dark)",
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

// Actividad diaria: destino propio en el menú lateral desde la Tanda 2 — antes vivía dentro de
// Perfil. Mismo patrón de guardado que el resto de pantallas nacidas de partir Perfil (ver el
// comentario de handleSave en PerfilView, arriba): siempre "...perfil" como base.
// `aviso` (opcional): el aviso de actividad del módulo de entreno (ui/entreno/aviso-actividad.jsx), que
// llega ya montado desde ui/pantallas.jsx para que este archivo no dependa del entreno.
export function ActividadDiariaView({ perfil, onSave, idioma, aviso }) {
  const [palBase, setPalBase] = useState(
    perfil?.palBase ?? (perfil?.actividad ? NIVELES_ACTIVIDAD_LEGACY[perfil.actividad]?.palBaseKey : null) ?? "escritorio"
  );
  const [entrenamientos, setEntrenamientos] = useState(
    (perfil?.entrenamientos || []).map((e) => ({ id: uid(), ...e }))
  );
  const [objetivo, setObjetivo] = useState(perfil?.objetivo ?? "mantenimiento");
  // D3: cuándo se entrena (para la recomendación de preentreno).
  const [momentoEntreno, setMomentoEntreno] = useState({
    diasEntreno: perfil?.diasEntreno || [], horaEntreno: perfil?.horaEntreno ?? null, entrenoComida: perfil?.entrenoComida ?? null,
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave({
      ...perfil,
      ...momentoEntreno,
      palBase,
      entrenamientos: entrenamientos
        .filter((e) => e.horas && e.frecuenciaSemanal)
        .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
      objetivo,
    });
    setSaved(true);
  }

  return (
    <>
      {aviso && <div style={{ maxWidth: 480 }}>{aviso}</div>}
      <SectionIntro text={t(idioma, "actividadDiaria.intro")} />
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <ActividadDiariaFields
          palBase={palBase} setPalBase={setPalBase}
          entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos}
          objetivo={objetivo} setObjetivo={setObjetivo}
          sexo={perfil?.sexo} anioNacimiento={perfil?.anioNacimiento} altura={perfil?.altura} peso={perfil?.peso}
          idioma={idioma}
        />
        <MomentoEntrenoFields
          valor={{ ...momentoEntreno, repartoComidas: perfil?.repartoComidas }}
          onCambio={(parcial) => { setMomentoEntreno((v) => ({ ...v, ...parcial })); setSaved(false); }}
          comidas={Object.keys(perfil?.repartoComidas || {})}
          idioma={idioma}
        />
      </div>

      <div style={{ maxWidth: 480 }}>
        <button
          onClick={handleSave}
          style={{
            width: "100%", marginTop: 18, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none",
            borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "perfilView.guardarCambios")}
        </button>

        {saved && (
          <div
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--green-dark)",
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
