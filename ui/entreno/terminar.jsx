// ---------- ui/entreno/terminar.jsx ----------
// «Terminar entreno» (diseño, §4.3): el resumen antes de guardar. Nombre, duración, volumen, series y
// ejercicios; «¿cómo de duro fue?» (1-5, opcional); nota privada; fecha y hora (por si se apunta después);
// los récords batidos en una línea discreta, sin confeti; y, si venía de una rutina y hoy cambió su
// estructura, la opción de pasar esos cambios a la rutina. Sin foto, ni descripción pública, ni
// visibilidad: lo que se quitó de las apps de las capturas. Compartir reutiliza BotonCompartir (texto o
// imagen), que una reseña de Strong pedía justo para «copiar el resumen a Strava».
import React, { useState, useMemo } from "react";
import { Medal } from "lucide-react";
import { t } from "i18n";
import { camposDeTipo } from "entreno-ejercicios";
import { resumenSesion, mejoresDeEjercicioEnSesion, recordsBatidos } from "entreno-calculo";
import { terminarSesion, cambiosEstructurales } from "entreno-sesion";
import { Field, inputStyle, ModalShell, ModalBtn } from "../comun/modal.jsx";
import { BotonCompartir } from "../comun/compartir.jsx";
import { FUENTE_TEXTO, FUENTE_MONO } from "../estilos.js";
import {
  CapaCompleta, BotonPrincipal, BotonSecundario, TextoSuave, duracionTexto, textoPeso, textoDistancia, nombreDe,
  formatoNumero, pesoAPantalla, reloj, fechaLarga,
} from "./comun.jsx";
import { etiquetasSeries } from "./fila-serie.jsx";

// «AAAA-MM-DDTHH:MM» en hora local (lo que entiende <input type="datetime-local">) y vuelta a ISO.
function aLocal(iso) {
  const d = new Date(iso);
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// Una serie en texto corto, según el tipo de ejercicio: «62,5 kg × 8», «× 12», «45 s», «3 km · 20 min».
export function textoSerie(sr, tipo, ajustes, idioma) {
  const partes = [];
  camposDeTipo(tipo).forEach((c) => {
    const v = sr[c];
    if (v === null || v === undefined) return;
    if (c === "kg") partes.push(`${tipo === "lastre_reps" ? "+" : tipo === "asistido_reps" ? "−" : ""}${formatoNumero(pesoAPantalla(v, ajustes.unidadPeso), idioma)} ${ajustes.unidadPeso}`);
    else if (c === "reps") partes.push(`× ${v}`);
    else if (c === "km") partes.push(textoDistancia(v, ajustes, idioma));
    else if (c === "seg") partes.push(tipo === "duracion" ? `${v} s` : reloj(v));
  });
  return partes.join(" ") + (sr.rir !== null && sr.rir !== undefined ? ` · RIR ${sr.rir}` : "");
}

// Texto de un récord: «1RM estimado 84,6 kg», «Mejor serie 62,5 kg × 8»...
export function textoRecord(clave, valor, ajustes, idioma) {
  const v = valor && typeof valor === "object" && clave !== "mejorSerie" ? valor.valor : valor;
  let cifra;
  if (clave === "mejorSerie") cifra = `${formatoNumero(pesoAPantalla(valor.kg, ajustes.unidadPeso), idioma)} ${ajustes.unidadPeso} × ${valor.reps}`;
  else if (clave === "pesoMax" || clave === "e1rm" || clave === "volumenSesion") cifra = textoPeso(v, ajustes, idioma);
  else if (clave === "segMax") cifra = reloj(v);
  else if (clave === "kmMax") cifra = textoDistancia(v, ajustes, idioma);
  else cifra = String(v);
  return `${t(idioma, "entreno.record." + clave)} ${cifra}`;
}

// Récords que bate una sesión (contra los del índice, antes de guardarla).
export function recordsDeSesion(sesion, entreno) {
  const lista = [];
  sesion.ejercicios.forEach((ej) => {
    const e = entreno.ejercicioDe(ej.ejercicioId);
    const mejores = mejoresDeEjercicioEnSesion(ej, (e && e.tipo) || "peso_reps", entreno.pesoCorporal);
    recordsBatidos(entreno.recordsDe(ej.ejercicioId), mejores).forEach((r) => lista.push({ ...r, ejercicioId: ej.ejercicioId }));
  });
  return lista;
}

// El «documento» para compartir una sesión (ver ui/comun/compartir.jsx): título, fecha y totales, y un
// apartado por ejercicio con sus series.
export function documentoSesion(sesion, entreno, idioma) {
  const r = resumenSesion(sesion, entreno.ejercicioDe, entreno.pesoCorporal);
  const ajustes = entreno.ajustes;
  return {
    titulo: sesion.nombre || t(idioma, "entreno.comun.sinNombre"),
    subtitulo: [fechaLarga(sesion.inicio, idioma), duracionTexto(r.duracionSeg, idioma), r.volumen > 0 ? textoPeso(r.volumen, ajustes, idioma) : null].filter(Boolean).join(" · "),
    secciones: sesion.ejercicios.map((ej) => {
      const tipo = (entreno.ejercicioDe(ej.ejercicioId) || {}).tipo || "peso_reps";
      const hechas = ej.series.filter((sr) => sr.hecha);
      const etiquetas = etiquetasSeries(hechas);
      return {
        titulo: nombreDe(entreno, ej.ejercicioId, idioma),
        lineas: hechas.map((sr, i) => ({ etiqueta: etiquetas[i], texto: textoSerie(sr, tipo, ajustes, idioma) })),
      };
    }),
  };
}

export function TerminarEntreno({ entreno, idioma, onVolver, onGuardado }) {
  const s = entreno.borrador;
  const [nombre, setNombre] = useState(s.nombre || "");
  const [esfuerzo, setEsfuerzo] = useState(s.esfuerzo || null);
  const [nota, setNota] = useState(s.nota || "");
  const [inicio, setInicio] = useState(aLocal(s.inicio));
  const [descartar, setDescartar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const rutina = s.rutinaId ? ((entreno.catalogo && entreno.catalogo.rutinas) || []).find((r) => r.id === s.rutinaId) : null;

  // Solo se cambia la hora si el usuario toca el campo: el campo no tiene segundos, y redondear sin que
  // nadie lo pida movería la sesión hasta un minuto.
  const inicioISO = useMemo(() => {
    if (inicio === aLocal(s.inicio)) return s.inicio;
    const d = new Date(inicio);
    return Number.isNaN(d.getTime()) ? s.inicio : d.toISOString();
  }, [inicio]);
  // Cómo quedaría guardada: sin las series sin hacer ni los ejercicios vacíos.
  const final = terminarSesion(s, Date.now(), { nombre, esfuerzo, nota, inicio: inicioISO });
  const resumen = resumenSesion(final, entreno.ejercicioDe, entreno.pesoCorporal);
  const records = recordsDeSesion(final, entreno);
  const hayCambios = !!rutina && cambiosEstructurales(final, rutina);
  const [actualizarRutina, setActualizarRutina] = useState(false);
  const vacia = !final.ejercicios.length;

  async function guardar() {
    setGuardando(true);
    const guardada = await entreno.terminar({ nombre, esfuerzo, nota, inicio: inicioISO }, { actualizarRutina: hayCambios && actualizarRutina });
    if (onGuardado) onGuardado(guardada);
  }

  const dato = (etiqueta, valor) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-soft)" }}>{etiqueta}</div>
      <div style={{ fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 17, fontWeight: 700, marginTop: 2 }}>{valor}</div>
    </div>
  );

  return (
    <CapaCompleta
      titulo={t(idioma, "entreno.terminar.titulo")}
      onCerrar={onVolver}
      icono="volver"
      idioma={idioma}
      pie={<BotonPrincipal onClick={guardar} disabled={vacia || guardando}>{t(idioma, "entreno.terminar.guardar")}</BotonPrincipal>}
    >
      <Field label={t(idioma, "entreno.terminar.nombre")}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t(idioma, "entreno.comun.sinNombre")} style={{ ...inputStyle, minHeight: 44, fontSize: 16 }} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {dato(t(idioma, "entreno.sesion.duracion"), duracionTexto(resumen.duracionSeg, idioma))}
        {dato(t(idioma, "entreno.sesion.volumen"), textoPeso(resumen.volumen, entreno.ajustes, idioma))}
        {dato(t(idioma, "entreno.sesion.series"), resumen.series)}
        {dato(t(idioma, "entreno.terminar.ejercicios"), resumen.ejercicios)}
      </div>

      {vacia && <TextoSuave style={{ color: "var(--rust)", marginBottom: 12 }}>{t(idioma, "entreno.terminar.vacio")}</TextoSuave>}

      {records.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {records.map((r) => (
            <div key={r.ejercicioId + r.clave} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)", padding: "2px 0" }}>
              <Medal size={15} color="var(--mustard-dark)" style={{ flexShrink: 0 }} />
              <span><b>{nombreDe(entreno, r.ejercicioId, idioma)}</b>: {textoRecord(r.clave, r.valor, entreno.ajustes, idioma)}</span>
            </div>
          ))}
        </div>
      )}

      <Field label={t(idioma, "entreno.terminar.duro")}>
        <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label={t(idioma, "entreno.terminar.duro")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={esfuerzo === n}
              onClick={() => setEsfuerzo(esfuerzo === n ? null : n)}
              style={{
                flex: 1, minHeight: 44, borderRadius: 10, cursor: "pointer", fontFamily: FUENTE_MONO, fontSize: 16, fontWeight: 700,
                border: `1px solid ${esfuerzo === n ? "var(--green)" : "var(--line)"}`, background: esfuerzo === n ? "var(--green-soft)" : "var(--card)",
                color: esfuerzo === n ? "var(--green-dark)" : "var(--ink)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <TextoSuave style={{ fontSize: 11.5, marginTop: 4 }}>{t(idioma, "entreno.terminar.duroAyuda")}</TextoSuave>
      </Field>

      <Field label={t(idioma, "entreno.terminar.nota")}>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder={t(idioma, "entreno.terminar.notaPlaceholder")} style={{ ...inputStyle, fontSize: 16, resize: "vertical", fontFamily: FUENTE_TEXTO }} />
      </Field>

      <Field label={t(idioma, "entreno.terminar.fecha")}>
        <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} style={{ ...inputStyle, minHeight: 44, fontSize: 16 }} />
      </Field>

      {hayCambios && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 14, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer", fontFamily: FUENTE_TEXTO }}>
          <input type="checkbox" checked={actualizarRutina} onChange={(e) => setActualizarRutina(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1 }} />
          <span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{t(idioma, "entreno.terminar.actualizarRutina", { nombre: rutina.nombre })}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{t(idioma, "entreno.terminar.actualizarRutinaAyuda")}</span>
          </span>
        </label>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        {!vacia && <BotonCompartir construirDocumento={() => documentoSesion(final, entreno, idioma)} nombreArchivo="entreno" idioma={idioma} />}
        <BotonSecundario peligro onClick={() => setDescartar(true)}>{t(idioma, "entreno.terminar.descartar")}</BotonSecundario>
      </div>

      {descartar && (
        <ModalShell title={t(idioma, "entreno.inicio.descartarTitulo")} onClose={() => setDescartar(false)}>
          <TextoSuave style={{ marginBottom: 16 }}>{t(idioma, "entreno.inicio.descartarTexto")}</TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setDescartar(false)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn variant="danger" onClick={() => { setDescartar(false); entreno.descartar(); }}>{t(idioma, "entreno.inicio.descartar")}</ModalBtn>
          </div>
        </ModalShell>
      )}
    </CapaCompleta>
  );
}
