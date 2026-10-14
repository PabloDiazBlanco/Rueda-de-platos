// ---------- ui/perfil/campos.jsx ----------
// Campos del perfil compartidos entre el asistente de alta y las pantallas de Perfil y Actividad
// diaria (datos personales, estilo de vida, entrenamientos, objetivo y desglose de calorías).
import React, { useState } from "react";
import { Plus, Trash2, Calculator } from "lucide-react";
import { PAL_BASE_NIVELES, TIPOS_ENTRENAMIENTO, OBJETIVO_ETAPAS, calcularObjetivosPerfil } from "objetivos";
import { uid } from "comun";
import { t } from "i18n";
import { ModalShell, Field, inputStyle, ModalBtn, IconBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// Pantalla de bienvenida: se muestra una única vez (o hasta que se rellene o se salte explícitamente).
// A partir de aquí, estos datos solo se tocan desde la pestaña "Perfil".
// Campos del perfil (compartidos entre la pantalla de bienvenida y la pestaña "Perfil" de edición),
// para no mantener dos formularios duplicados con el riesgo de que se desincronicen.
// Datos personales (Perfil, en el menú lateral): nombre, sexo, año de nacimiento, altura, peso.
// Antes vivía junto con actividad diaria en un único ProfileFields — se separó para que Perfil y
// la nueva Actividad diaria (ver ActividadDiariaFields, más abajo) puedan ser pantallas distintas
// sin duplicar código; ProfileOnboarding sigue usando las dos juntas, en el mismo orden de
// siempre, así que el alta de un usuario nuevo no cambia todavía (eso es cosa de una tanda futura).
export function DatosPersonalesFields({ nombre, setNombre, sexo, setSexo, anioNacimiento, setAnioNacimiento, altura, setAltura, peso, setPeso, idioma }) {
  return (
    <>
      <Field label={t(idioma, "campo.nombre")}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} placeholder={t(idioma, "campo.nombre.placeholder")} />
      </Field>

      <Field label={t(idioma, "campo.sexo")}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["mujer", t(idioma, "campo.sexo.mujer")], ["hombre", t(idioma, "campo.sexo.hombre")]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSexo(key)}
              style={{
                flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
                padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)",
                background: sexo === key ? "var(--green-dark)" : "#fff",
                color: sexo === key ? "#fff" : "var(--ink)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "campo.anioNacimiento")}>
          <input type="number" min={1926} max={2012} value={anioNacimiento} onChange={(e) => setAnioNacimiento(e.target.value)} style={inputStyle} placeholder={t(idioma, "campo.anioNacimiento.placeholder")} />
        </Field>
        <Field label={t(idioma, "campo.altura")}>
          <input type="number" min={100} max={230} value={altura} onChange={(e) => setAltura(e.target.value)} style={inputStyle} placeholder="cm" />
        </Field>
        <Field label={t(idioma, "campo.peso")}>
          <input type="number" min={30} max={250} step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} style={inputStyle} placeholder="kg" />
        </Field>
      </div>
    </>
  );
}

// Actividad diaria (destino propio en el menú lateral): tipo de día a día, entrenamientos
// habituales y objetivo — antes vivían dentro de Perfil, junto a los datos personales. sexo,
// anioNacimiento, altura y peso llegan aquí de solo lectura (no se editan en esta pantalla, pero
// hacen falta para el desglose de calorías, que necesita el perfil completo). Ver el porqué de la
// separación en DatosPersonalesFields, justo arriba.
export function ActividadDiariaFields({
  palBase, setPalBase, entrenamientos, setEntrenamientos, objetivo, setObjetivo,
  sexo, anioNacimiento, altura, peso, idioma,
}) {
  return (
    <>
      <EstiloVidaFields palBase={palBase} setPalBase={setPalBase} idioma={idioma} />
      <EntrenamientosFields entrenamientos={entrenamientos} setEntrenamientos={setEntrenamientos} idioma={idioma} />
      <ObjetivoFields
        objetivo={objetivo} setObjetivo={setObjetivo}
        sexo={sexo} anioNacimiento={anioNacimiento} altura={altura} peso={peso}
        palBase={palBase} entrenamientos={entrenamientos} idioma={idioma}
      />
    </>
  );
}

// Las tres piezas de ActividadDiariaFields, separadas — hacía falta para el asistente de alta por
// pasos (Tanda 3): cada una es su propio paso ahí, mientras que ActividadDiariaView (Tanda 2) las
// sigue mostrando las tres juntas, sin ningún cambio visible.
export function EstiloVidaFields({ palBase, setPalBase, idioma }) {
  return (
    <Field label={t(idioma, "campo.tipoDiaADia")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PAL_BASE_NIVELES.map((n) => (
          <button
            key={n.key}
            onClick={() => setPalBase(n.key)}
            style={{
              textAlign: "left", fontFamily: FUENTE_TEXTO,
              padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
              background: palBase === n.key ? "var(--green-soft)" : "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: palBase === n.key ? "var(--green-dark)" : "var(--ink)" }}>{t(idioma, "pal." + n.key)}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{t(idioma, "pal." + n.key + ".desc")}</div>
          </button>
        ))}
      </div>
    </Field>
  );
}

export function EntrenamientosFields({ entrenamientos, setEntrenamientos, idioma }) {
  function addEntrenamiento() {
    setEntrenamientos((rows) => [...rows, { id: uid(), tipo: TIPOS_ENTRENAMIENTO[0].key, horas: 1, frecuenciaSemanal: 1 }]);
  }
  function updateEntrenamiento(id, patch) {
    setEntrenamientos((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeEntrenamiento(id) {
    setEntrenamientos((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <Field label={t(idioma, "campo.entrenamientos")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {entrenamientos.map((row) => (
          <div key={row.id} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 7, padding: "8px 9px" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={row.tipo}
                onChange={(e) => updateEntrenamiento(row.id, { tipo: e.target.value })}
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              >
                {TIPOS_ENTRENAMIENTO.map((tipo) => (
                  <option key={tipo.key} value={tipo.key}>{t(idioma, "entrenamiento." + tipo.key)}</option>
                ))}
              </select>
              <IconBtn onClick={() => removeEntrenamiento(row.id)}><Trash2 size={12} /></IconBtn>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, fontFamily: FUENTE_TEXTO }}>
                  {t(idioma, "campo.horasPorSesion")}
                </div>
                <input
                  type="number" min={0} step="0.25" value={row.horas}
                  onChange={(e) => updateEntrenamiento(row.id, { horas: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, fontFamily: FUENTE_TEXTO }}>
                  {t(idioma, "campo.vecesPorSemana")}
                </div>
                <input
                  type="number" min={0} max={7} value={row.frecuenciaSemanal}
                  onChange={(e) => updateEntrenamiento(row.id, { frecuenciaSemanal: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addEntrenamiento}
        style={{
          display: "flex", alignItems: "center", gap: 6, border: "1px dashed var(--line)",
          background: "transparent", borderRadius: 7, padding: "7px 10px", fontSize: 12.5,
          color: "var(--ink-soft)", fontFamily: FUENTE_TEXTO,
        }}
      >
        <Plus size={12} /> {t(idioma, "campo.anadirEntrenamiento")}
      </button>
    </Field>
  );
}

// El desglose necesita el perfil completo (sexo/anioNacimiento/altura/peso, de solo lectura aquí
// — ver el comentario de ActividadDiariaFields) más palBase/entrenamientos, que sí se editan en
// los pasos anteriores del mismo formulario o asistente.
export function ObjetivoFields({ objetivo, setObjetivo, sexo, anioNacimiento, altura, peso, palBase, entrenamientos, idioma }) {
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const datosCompletos = anioNacimiento && altura && peso;

  return (
    <>
      <Field label={t(idioma, "campo.objetivoActual")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.keys(OBJETIVO_ETAPAS).map((key) => {
            const etapa = OBJETIVO_ETAPAS[key];
            return (
              <button
                key={key}
                onClick={() => setObjetivo(key)}
                style={{
                  textAlign: "left", fontFamily: FUENTE_TEXTO,
                  padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
                  background: objetivo === key ? "var(--green-soft)" : "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: objetivo === key ? "var(--green-dark)" : "var(--ink)" }}>{t(idioma, "objetivoEtapa." + key)}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 1 }}>{t(idioma, "objetivoEtapa." + key + ".desc")}</div>
              </button>
            );
          })}
        </div>
      </Field>

      <div
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)",
          background: "var(--paper)", borderRadius: 8, padding: "10px 12px", marginTop: 4, lineHeight: 1.5,
        }}
      >
        {t(idioma, "profileFields.formula")}
      </div>

      <button
        onClick={() => setMostrarDesglose(true)}
        disabled={!datosCompletos}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8,
          width: "100%", border: "1px solid var(--line)", background: "#fff", borderRadius: 8,
          padding: "9px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
          fontFamily: FUENTE_TEXTO,
          cursor: datosCompletos ? "pointer" : "default", opacity: datosCompletos ? 1 : 0.5,
        }}
      >
        <Calculator size={13} /> {t(idioma, "profileFields.verDesglose")}
      </button>

      {mostrarDesglose && (
        <DesgloseCaloriasModal
          perfil={{
            sexo,
            anioNacimiento: Number(anioNacimiento),
            altura: Number(altura),
            peso: Number(peso),
            palBase,
            entrenamientos: entrenamientos
              .filter((e) => e.horas && e.frecuenciaSemanal)
              .map((e) => ({ tipo: e.tipo, horas: Number(e.horas), frecuenciaSemanal: Number(e.frecuenciaSemanal) })),
            objetivo,
          }}
          onClose={() => setMostrarDesglose(false)}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Ventana con el desglose paso a paso del cálculo de kcal (BMR → × PAL → + entrenamiento → etapa),
// recalculada en vivo con los valores que haya en el formulario aunque no se hayan guardado
// todavía. Nace de que el BMR puro no se muestra en ningún otro sitio de la app — solo el resultado
// ya multiplicado por el PAL ("kcal día a día") — y eso puede llevar a pensar que hay un error de
// cálculo cuando en realidad todo cuadra, solo que son dos magnitudes distintas.
function DesgloseCaloriasModal({ perfil, onClose, idioma }) {
  const r = calcularObjetivosPerfil(perfil);
  const nivelPal = PAL_BASE_NIVELES.find((n) => n.key === perfil.palBase);
  const etapa = OBJETIVO_ETAPAS[r?.objetivo];

  return (
    <ModalShell title={t(idioma, "desglose.titulo")} onClose={onClose}>
      {!r ? (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "desglose.faltaDatos")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DesgloseFila label={t(idioma, "desglose.bmr")} valor={`${r.bmr} kcal`} />
          <DesgloseFila label={t(idioma, "desglose.palLinea", { pal: nivelPal.pal, nivel: t(idioma, "pal." + nivelPal.key) })} valor={t(idioma, "desglose.kcalDiaADia", { n: r.kcalBase })} />
          {r.kcalEntrenamiento > 0 && (
            <DesgloseFila label={t(idioma, "desglose.entrenamientos")} valor={`${r.kcalEntrenamiento} kcal`} />
          )}
          <DesgloseFila label={t(idioma, "desglose.tdeeMantenimiento")} valor={`${r.kcalMantenimiento} kcal`} fuerte />
          {etapa && r.objetivo !== "mantenimiento" && (
            <DesgloseFila
              label={t(idioma, "desglose.etapaLinea", { etapa: t(idioma, "objetivoEtapa." + r.objetivo), signo: r.ajustePct > 0 ? "+" : "", pct: r.ajustePct })}
              valor={`${r.kcal} kcal`}
              fuerte
            />
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cerrar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function DesgloseFila({ label, valor, fuerte }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline",
        paddingTop: fuerte ? 8 : 0, borderTop: fuerte ? "1px solid var(--line)" : "none",
      }}
    >
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)" }}>{label}</div>
      <div
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 13.5, whiteSpace: "nowrap",
          fontWeight: fuerte ? 700 : 600, color: fuerte ? "var(--green-dark)" : "var(--ink)",
        }}
      >
        {valor}
      </div>
    </div>
  );
}
