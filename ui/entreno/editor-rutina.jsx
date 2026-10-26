// ---------- ui/entreno/editor-rutina.jsx ----------
// Editor de una rutina (destino `entreno-rutina`, con `params: { id }`; id null = nueva): nombre,
// ejercicios en orden (añadir con el selector, quitar, subir y bajar), y por ejercicio sus series de
// plantilla (tipo, kilos y repeticiones), su descanso y una nota. Se edita una copia y solo se guarda al
// pulsar «Guardar», para poder salir sin tocar nada.
// El descanso es de cada ejercicio (G3, 25-oct-2026): al añadirlo entra con el de su ficha o el de los
// ajustes, y se cambia con el botón del reloj de su tarjeta (BotonDescanso / HojaDescanso).
// Superseries (G11): entre dos tarjetas, «Superserie con el siguiente» los une (o suma el siguiente al
// grupo); dentro de un grupo, «Separar» saca al ejercicio. Los del grupo llevan una franja mostaza.
// Añadir ejercicios abre el gimnasio dibujado (bloque FitDraft, 26-oct-2026; ui/entreno/mapa-rutina.jsx): la
// rutina se ve como una ruta con sus paradas; desde ahí, «Buscar» abre el selector de siempre.
import React, { useState } from "react";
import { Plus, ArrowUp, ArrowDown, X, Link2, Link2Off } from "lucide-react";
import { t } from "i18n";
import { camposDeTipo, TIPOS_SERIE, LETRA_SERIE } from "entreno-ejercicios";
import { grupoDe, unirSuperserie, separarSuperserie } from "entreno-sesion";
import { Field, inputStyle } from "../comun/modal.jsx";
import { BackLink } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO } from "../estilos.js";
import { BotonPrincipal, BotonTexto, TextoSuave, nombreDe, pesoAPantalla, formatoNumero } from "./comun.jsx";
import { SelectorEjercicio } from "./selector-ejercicio.jsx";
import { COLOR_SERIE, deTexto, unidadTiempo } from "./fila-serie.jsx";
import { BotonDescanso, HojaDescanso } from "./descanso.jsx";
import { CapaMapaRutina } from "./mapa-rutina.jsx";

function rutinaNueva() {
  return { id: null, nombre: "", ejercicios: [] };
}

// Campo de un valor de plantilla (kilos, repeticiones...) con su propio texto mientras se teclea.
function CampoPlantilla({ campo, valor, tipo, ajustes, idioma, onCambio, etiqueta }) {
  const inicial = valor === null || valor === undefined ? "" : campo === "kg" ? formatoNumero(pesoAPantalla(valor, ajustes.unidadPeso), idioma) : campo === "seg" && unidadTiempo(tipo) === "min" ? formatoNumero(valor / 60, idioma) : String(valor);
  const [texto, setTexto] = useState(inicial);
  return (
    <input
      value={texto}
      inputMode={campo === "reps" ? "numeric" : "decimal"}
      aria-label={etiqueta}
      placeholder={etiqueta}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setTexto(e.target.value);
        const v = deTexto(campo, e.target.value, tipo, ajustes);
        if (v !== undefined) onCambio(v);
      }}
      style={{ ...inputStyle, height: 40, textAlign: "center", fontFamily: FUENTE_MONO, fontSize: 15, padding: "0 4px" }}
    />
  );
}

export function EditorRutinaView({ entreno, idioma, navegar, params }) {
  const id = params && params.id;
  const existente = id ? ((entreno.catalogo && entreno.catalogo.rutinas) || []).find((r) => r.id === id) : null;
  const [rutina, setRutina] = useState(() => (existente ? JSON.parse(JSON.stringify(existente)) : rutinaNueva()));
  const [selector, setSelector] = useState(false);
  const [mapa, setMapa] = useState(false);
  const [descanso, setDescanso] = useState(null); // índice del ejercicio cuyo descanso se está eligiendo
  const [error, setError] = useState("");
  const ajustes = entreno.ajustes;

  const cambiarEjercicio = (i, fn) => setRutina((r) => ({ ...r, ejercicios: r.ejercicios.map((re, k) => (k === i ? fn(re) : re)) }));
  const cambiarSerie = (i, j, cambios) => cambiarEjercicio(i, (re) => ({ ...re, series: re.series.map((sr, k) => (k === j ? { ...sr, ...cambios } : sr)) }));
  function mover(i, delta) {
    setRutina((r) => {
      const l = [...r.ejercicios];
      const j = i + delta;
      if (j < 0 || j >= l.length) return r;
      [l[i], l[j]] = [l[j], l[i]];
      return { ...r, ejercicios: l };
    });
  }

  // Cada ejercicio nuevo empieza con lo de la última vez (si lo hay) o con tres series normales.
  function nuevoEjercicio(eid) {
    const anterior = entreno.anteriorDe(eid);
    const series = anterior.length
      ? anterior.map((a) => ({ tipo: a.tipo || "normal", kg: a.kg ?? null, reps: a.reps ?? null, seg: a.seg ?? null, km: a.km ?? null }))
      : [{ tipo: "normal" }, { tipo: "normal" }, { tipo: "normal" }];
    return { ejercicioId: eid, descansoSeg: entreno.descansoInicial(eid), nota: "", series };
  }
  // Desde el mapa, «✓» quita la última vez que sale ese ejercicio en la rutina.
  function quitarUltimo(eid) {
    setRutina((r) => {
      const i = r.ejercicios.map((e) => e.ejercicioId).lastIndexOf(eid);
      return i < 0 ? r : { ...r, ejercicios: r.ejercicios.filter((_, k) => k !== i) };
    });
  }

  function guardar() {
    if (!rutina.nombre.trim()) {
      setError(t(idioma, "entreno.rutinas.nombreObligatorio"));
      return;
    }
    entreno.guardarRutina({ ...rutina, nombre: rutina.nombre.trim(), carpeta: (rutina.carpeta || "").trim() || null });
    navegar("entreno-rutinas");
  }

  return (
    <div>
      <BackLink label={t(idioma, "barra.rutinas")} onClick={() => navegar("entreno-rutinas")} />
      <h2 style={{ fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 21, color: "var(--green-dark)", margin: "0 0 12px" }}>
        {t(idioma, existente ? "entreno.rutinas.editarTitulo" : "entreno.rutinas.nueva")}
      </h2>

      <Field label={t(idioma, "entreno.rutinas.nombre")}>
        <input
          value={rutina.nombre}
          onChange={(e) => { setRutina({ ...rutina, nombre: e.target.value }); setError(""); }}
          placeholder={t(idioma, "entreno.rutinas.nombrePlaceholder")}
          style={{ ...inputStyle, minHeight: 44, fontSize: 16 }}
        />
        {error && <TextoSuave style={{ color: "var(--rust)", marginTop: 4 }}>{error}</TextoSuave>}
      </Field>

      {/* Carpeta (opcional C11): solo agrupa las rutinas en su lista; se elige entre las que ya hay o se
          escribe una nueva. */}
      <Field label={t(idioma, "entreno.rutinas.carpeta")}>
        <input
          value={rutina.carpeta || ""}
          onChange={(e) => setRutina({ ...rutina, carpeta: e.target.value })}
          list="carpetas-rutinas"
          placeholder={t(idioma, "entreno.rutinas.carpetaPlaceholder")}
          style={{ ...inputStyle, minHeight: 44, fontSize: 16 }}
        />
        <datalist id="carpetas-rutinas">
          {[...new Set(((entreno.catalogo && entreno.catalogo.rutinas) || []).map((r) => (r.carpeta || "").trim()).filter(Boolean))].map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>

      {!rutina.ejercicios.length && <TextoSuave style={{ margin: "8px 0 12px" }}>{t(idioma, "entreno.rutinas.anadeEjercicios")}</TextoSuave>}

      {rutina.ejercicios.map((re, i) => {
        const tipo = (entreno.ejercicioDe(re.ejercicioId) || {}).tipo || "peso_reps";
        const campos = camposDeTipo(tipo);
        const grupo = grupoDe(rutina.ejercicios, i);
        const unidoConSiguiente = grupo && i < grupo.fin;
        return (
          <React.Fragment key={i + re.ejercicioId}>
          <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: grupo ? "5px solid var(--mustard)" : "1px solid var(--line)", borderRadius: 10, padding: "8px 10px 10px", marginBottom: 4 }}>
            {grupo && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                <Link2 size={12} /> {t(idioma, "entreno.superserie.etiqueta", { n: grupo.numero })}
                <button onClick={() => setRutina((r) => ({ ...r, ejercicios: separarSuperserie(r.ejercicios, i) }))} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "none", letterSpacing: 0 }}>
                  <Link2Off size={12} /> {t(idioma, "entreno.superserie.separarCorto")}
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <div style={{ flex: 1, minWidth: 0, fontFamily: FUENTE_TEXTO, fontSize: 15, fontWeight: 700, color: "var(--green-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nombreDe(entreno, re.ejercicioId, idioma)}
              </div>
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={t(idioma, "entreno.rutinas.subir")} style={botonIcono(i === 0)}><ArrowUp size={17} /></button>
              <button onClick={() => mover(i, 1)} disabled={i === rutina.ejercicios.length - 1} aria-label={t(idioma, "entreno.rutinas.bajar")} style={botonIcono(i === rutina.ejercicios.length - 1)}><ArrowDown size={17} /></button>
              <button onClick={() => setRutina((r) => ({ ...r, ejercicios: r.ejercicios.filter((_, k) => k !== i) }))} aria-label={t(idioma, "entreno.rutinas.quitar")} style={botonIcono(false)}><X size={17} /></button>
            </div>

            {re.series.map((sr, j) => (
              <div key={j} style={{ display: "grid", gridTemplateColumns: `92px ${campos.map(() => "minmax(0,1fr)").join(" ")} 36px`, gap: 6, alignItems: "center", marginTop: 6 }}>
                <select
                  value={sr.tipo}
                  onChange={(e) => cambiarSerie(i, j, { tipo: e.target.value })}
                  aria-label={t(idioma, "entreno.sesion.tipoSerieTitulo")}
                  style={{ ...inputStyle, height: 40, padding: "0 6px", fontSize: 13, color: COLOR_SERIE[sr.tipo], fontWeight: 700 }}
                >
                  {TIPOS_SERIE.map((ts) => <option key={ts} value={ts}>{(LETRA_SERIE[ts] ? LETRA_SERIE[ts] + " · " : "") + t(idioma, "tipoSerie." + ts)}</option>)}
                </select>
                {campos.map((c) => (
                  <CampoPlantilla
                    key={c}
                    campo={c}
                    valor={sr[c]}
                    tipo={tipo}
                    ajustes={ajustes}
                    idioma={idioma}
                    etiqueta={c === "kg" ? ajustes.unidadPeso : c === "km" ? ajustes.unidadDistancia : c === "seg" ? unidadTiempo(tipo) : "reps"}
                    onCambio={(v) => cambiarSerie(i, j, { [c]: v })}
                  />
                ))}
                <button onClick={() => cambiarEjercicio(i, (x) => ({ ...x, series: x.series.filter((_, k) => k !== j) }))} aria-label={t(idioma, "entreno.sesion.quitarSerie")} style={botonIcono(false)}><X size={15} /></button>
              </div>
            ))}
            <BotonTexto onClick={() => cambiarEjercicio(i, (x) => ({ ...x, series: [...x.series, { ...(x.series[x.series.length - 1] || {}), tipo: "normal" }] }))}>
              <Plus size={14} /> {t(idioma, "entreno.sesion.anadirSerie")}
            </BotonTexto>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, marginTop: 4 }}>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)" }}>
                {t(idioma, "entreno.rutinas.descanso")}
                <div style={{ marginTop: 4 }}>
                  <BotonDescanso segundos={re.descansoSeg ?? entreno.descansoInicial(re.ejercicioId)} onClick={() => setDescanso(i)} idioma={idioma} style={{ minHeight: 40 }} />
                </div>
              </div>
              <label style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)" }}>
                {t(idioma, "entreno.rutinas.nota")}
                <input
                  value={re.nota || ""}
                  onChange={(e) => cambiarEjercicio(i, (x) => ({ ...x, nota: e.target.value }))}
                  placeholder={t(idioma, "entreno.rutinas.notaPlaceholder")}
                  style={{ ...inputStyle, height: 40, marginTop: 4, fontWeight: 400, fontSize: 16 }}
                />
              </label>
            </div>
          </section>
          {/* Entre esta tarjeta y la siguiente: unirlas en superserie (si aún no lo están). */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: unidoConSiguiente ? 4 : 10, minHeight: i < rutina.ejercicios.length - 1 ? 0 : 6 }}>
            {i < rutina.ejercicios.length - 1 && !unidoConSiguiente && (
              <button
                onClick={() => setRutina((r) => ({ ...r, ejercicios: unirSuperserie(r.ejercicios, i) }))}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, color: "var(--mustard-dark)", padding: "4px 8px", minHeight: 32 }}
              >
                <Link2 size={13} /> {t(idioma, "entreno.superserie.unir")}
              </button>
            )}
          </div>
          </React.Fragment>
        );
      })}

      <button
        onClick={() => setMapa(true)}
        style={{ width: "100%", minHeight: 48, margin: "4px 0 18px", borderRadius: 10, border: "1.5px dashed var(--green)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, color: "var(--green-dark)" }}
      >
        <Plus size={16} /> {t(idioma, "entreno.sesion.anadirEjercicio")}
      </button>

      <BotonPrincipal onClick={guardar}>{t(idioma, "common.guardar")}</BotonPrincipal>

      {selector && (
        <SelectorEjercicio
          entreno={entreno}
          idioma={idioma}
          onCerrar={() => setSelector(false)}
          onElegir={(ids) => {
            setRutina((r) => ({ ...r, ejercicios: [...r.ejercicios, ...ids.map(nuevoEjercicio)] }));
            setSelector(false);
          }}
        />
      )}

      {mapa && !selector && (
        <CapaMapaRutina
          entreno={entreno}
          idioma={idioma}
          ejercicioIds={rutina.ejercicios.map((e) => e.ejercicioId)}
          onAnadir={(eid) => setRutina((r) => ({ ...r, ejercicios: [...r.ejercicios, nuevoEjercicio(eid)] }))}
          onQuitar={quitarUltimo}
          onBuscar={() => setSelector(true)}
          onCerrar={() => setMapa(false)}
        />
      )}

      {descanso !== null && rutina.ejercicios[descanso] && (
        <HojaDescanso
          titulo={nombreDe(entreno, rutina.ejercicios[descanso].ejercicioId, idioma)}
          segundos={rutina.ejercicios[descanso].descansoSeg ?? entreno.descansoInicial(rutina.ejercicios[descanso].ejercicioId)}
          ayuda={t(idioma, "entreno.descanso.ayudaRutina")}
          onElegir={(seg) => cambiarEjercicio(descanso, (x) => ({ ...x, descansoSeg: seg }))}
          onCerrar={() => setDescanso(null)}
          idioma={idioma}
        />
      )}
    </div>
  );
}

const botonIcono = (desactivado) => ({
  width: 36, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none",
  cursor: desactivado ? "default" : "pointer", color: "var(--ink-soft)", opacity: desactivado ? 0.35 : 1, flexShrink: 0,
});
