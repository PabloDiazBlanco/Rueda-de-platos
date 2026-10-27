// ---------- ui/entreno/editar-ejercicio.jsx ----------
// Crear (o editar) un ejercicio propio «en 10 segundos» (diseño, §4.5): nombre, qué se anota, músculo
// principal, secundarios y equipo. Resuelve «no puedo poner mis propias máquinas». Antes de crear,
// avisa si ya hay uno que se llama casi igual (posibleDuplicado): la queja de las reseñas de Lyfta era
// una biblioteca llena de duplicados. Es solo un aviso: se puede crear igualmente.
import React, { useState } from "react";
import { t } from "i18n";
import { TIPOS_EJERCICIO, GRUPOS_MUSCULARES, EQUIPOS, posibleDuplicado } from "entreno-ejercicios";
import { nombreEjercicio } from "entreno-nombres";
import { Field, inputStyle, ModalShell, ModalBtn } from "../comun/modal.jsx";
import { CapaCompleta, BotonPrincipal, Chip, TextoSuave } from "./comun.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

export function EditarEjercicio({ entreno, idioma, ejercicio = null, nombreInicial = "", onGuardado, onUsarExistente, onCancelar }) {
  const [nombre, setNombre] = useState(ejercicio ? ejercicio.nombre : nombreInicial);
  const [tipo, setTipo] = useState(ejercicio ? ejercicio.tipo : "peso_reps");
  const [musculo, setMusculo] = useState(ejercicio ? ejercicio.musculo : "pecho");
  const [secundarios, setSecundarios] = useState(ejercicio ? ejercicio.secundarios || [] : []);
  const [equipo, setEquipo] = useState(ejercicio ? ejercicio.equipo : "maquina");
  // ×2 y unilateral (27-oct-2026), como los de la biblioteca: ver «Mancuernas a pares» en entreno-calculo.js.
  const [pareja, setPareja] = useState(!!(ejercicio && ejercicio.pareja));
  const [unilateral, setUnilateral] = useState(!!(ejercicio && ejercicio.unilateral));
  const llevaReps = ["peso_reps", "reps", "lastre_reps", "asistido_reps"].includes(tipo);
  const [duplicado, setDuplicado] = useState(null);
  const [error, setError] = useState("");

  function guardar(forzar = false) {
    const limpio = nombre.trim();
    if (!limpio) {
      setError(t(idioma, "entreno.ejercicios.nombreObligatorio"));
      return;
    }
    const datos = {
      nombre: limpio, tipo, musculo, secundarios: secundarios.filter((m) => m !== musculo), equipo,
      pareja: tipo === "peso_reps" && equipo === "mancuernas" && pareja, unilateral: llevaReps && unilateral,
    };
    if (ejercicio) {
      entreno.editarPropio(ejercicio.id, datos);
      onGuardado(ejercicio.id);
      return;
    }
    if (!forzar) {
      const parecido = posibleDuplicado(limpio, entreno.lista, (e) => nombreEjercicio(e, idioma));
      if (parecido) {
        setDuplicado(parecido);
        return;
      }
    }
    onGuardado(entreno.crearPropio(datos));
  }

  function alternarSecundario(m) {
    setSecundarios((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  }

  return (
    <CapaCompleta
      titulo={t(idioma, ejercicio ? "entreno.ejercicios.editarTitulo" : "entreno.ejercicios.nuevoTitulo")}
      onCerrar={onCancelar}
      icono="volver"
      idioma={idioma}
      pie={<BotonPrincipal onClick={() => guardar(false)}>{t(idioma, "common.guardar")}</BotonPrincipal>}
    >
      <Field label={t(idioma, "entreno.ejercicios.nombre")}>
        <input
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(""); }}
          placeholder={t(idioma, "entreno.ejercicios.nombrePlaceholder")}
          autoFocus={!nombre}
          style={{ ...inputStyle, minHeight: 44, fontSize: 16 }}
        />
        {error && <TextoSuave style={{ color: "var(--rust)", marginTop: 4 }}>{error}</TextoSuave>}
      </Field>
      <Field label={t(idioma, "entreno.ejercicios.tipo")}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
          {TIPOS_EJERCICIO.map((x) => <option key={x} value={x}>{t(idioma, "tipoEjercicio." + x)}</option>)}
        </select>
      </Field>
      <Field label={t(idioma, "entreno.ejercicios.musculo")}>
        <select value={musculo} onChange={(e) => setMusculo(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
          {GRUPOS_MUSCULARES.map((m) => <option key={m} value={m}>{t(idioma, "musculo." + m)}</option>)}
        </select>
      </Field>
      {musculo !== "cardio" && (
        <Field label={t(idioma, "entreno.ejercicios.secundarios")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GRUPOS_MUSCULARES.filter((m) => m !== "cardio" && m !== musculo).map((m) => (
              <Chip key={m} activo={secundarios.includes(m)} onClick={() => alternarSecundario(m)}>{t(idioma, "musculo." + m)}</Chip>
            ))}
          </div>
        </Field>
      )}
      <Field label={t(idioma, "entreno.ejercicios.equipo")}>
        <select value={equipo} onChange={(e) => setEquipo(e.target.value)} style={{ ...inputStyle, minHeight: 44 }}>
          {EQUIPOS.map((q) => <option key={q} value={q}>{t(idioma, "equipo." + q)}</option>)}
        </select>
      </Field>
      {tipo === "peso_reps" && equipo === "mancuernas" && (
        <Casilla marcada={pareja} onCambio={setPareja} texto={t(idioma, "entreno.ejercicios.pareja")} ayuda={t(idioma, "entreno.ejercicios.parejaAyuda")} />
      )}
      {llevaReps && (
        <Casilla marcada={unilateral} onCambio={setUnilateral} texto={t(idioma, "entreno.ejercicios.unilateral")} ayuda={t(idioma, "entreno.ejercicios.unilateralAyuda")} />
      )}

      {duplicado && (
        <ModalShell title={t(idioma, "entreno.ejercicios.duplicadoTitulo")} onClose={() => setDuplicado(null)}>
          <TextoSuave style={{ marginBottom: 16 }}>
            {t(idioma, "entreno.ejercicios.duplicadoTexto", { nombre: nombreEjercicio(duplicado, idioma) })}
          </TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <ModalBtn variant="ghost" onClick={() => { setDuplicado(null); guardar(true); }}>{t(idioma, "entreno.ejercicios.crearIgual")}</ModalBtn>
            {onUsarExistente && <ModalBtn variant="solid" onClick={() => onUsarExistente(duplicado.id)}>{t(idioma, "entreno.ejercicios.usarEse")}</ModalBtn>}
          </div>
        </ModalShell>
      )}
    </CapaCompleta>
  );
}

// Casilla con su explicación debajo (lo del ×2 y lo unilateral).
function Casilla({ marcada, onCambio, texto, ayuda }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "4px 0 14px", cursor: "pointer" }}>
      <input type="checkbox" checked={marcada} onChange={(e) => onCambio(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: "var(--green)", flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{texto}</div>
        <TextoSuave style={{ fontSize: 12.5, marginTop: 2 }}>{ayuda}</TextoSuave>
      </div>
    </label>
  );
}
