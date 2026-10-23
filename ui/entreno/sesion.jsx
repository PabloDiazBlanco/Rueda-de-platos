// ---------- ui/entreno/sesion.jsx ----------
// El entreno en curso (diseño, §4.2): la pantalla que más importa. No es una pestaña sino una capa a
// pantalla completa (z-index 45, como el interior de la nevera), con su propia barra arriba y sin
// cabecera ni menú, para que un toque sin querer en ☰ no saque a nadie de la sesión. ˅ la minimiza
// (queda la pastilla «Entreno en curso» en cualquier pantalla) y «Terminar» lleva al resumen final.
//
// Reglas de oro de la tabla (las pone en práctica fila-serie.jsx): «anterior» = lo de la última vez,
// serie a serie; ✓ guarda la serie, arranca el descanso y pasa el foco a la siguiente; teclado numérico
// con el campo seleccionado; tocar el número de serie cambia su tipo. Si lo tecleado parece un error de
// dedo («1005» en vez de «100,5»), al marcar pregunta antes (validarSerie).
//
// Mientras la sesión está a la vista: la pantalla no se apaga (Wake Lock, donde exista), el cronómetro y
// el descanso se repintan cada segundo (solo esas piezas, no la tabla) y la pantalla de debajo no se mueve.
import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, MoreVertical, Plus, Timer, Trash2, CloudOff, Check, Pause, Play, ArrowUp, ArrowDown, Repeat, StickyNote, Medal, BookOpen } from "lucide-react";
import { t } from "i18n";
import { camposDeTipo } from "entreno-ejercicios";
import { resumenSesion, duracionEfectiva, validarSerie, recordsEnVivo } from "entreno-calculo";
import { estaPausada } from "entreno-sesion";
import { inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO } from "../estilos.js";
import {
  reloj, duracionTexto, formatoNumero, textoPeso, nombreDe, HojaInferior, OpcionHoja, BotonPrincipal, BotonTexto,
  TextoSuave, pesoAPantalla,
} from "./comun.jsx";
import { FilaSerie, HojaTipoSerie, etiquetasSeries, plantillaColumnas, columnasDe } from "./fila-serie.jsx";
import { BarraDescanso, prepararAudio } from "./descanso.jsx";
import { SelectorEjercicio } from "./selector-ejercicio.jsx";
import { TerminarEntreno, textoRecord } from "./terminar.jsx";

// Pide que la pantalla no se apague mientras la sesión está a la vista, y lo vuelve a pedir al volver a
// la app (el navegador lo suelta solo al ocultarse). Donde no existe la API, no hace nada.
function usePantallaEncendida() {
  useEffect(() => {
    let candado = null;
    async function pedir() {
      try {
        if (navigator.wakeLock && document.visibilityState === "visible") candado = await navigator.wakeLock.request("screen");
      } catch (e) {
        candado = null;
      }
    }
    pedir();
    const alVolver = () => { if (document.visibilityState === "visible") pedir(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      if (candado) candado.release().catch(() => {});
    };
  }, []);
}

// Cronómetro de la barra de arriba y duración del resumen: se repintan solos cada segundo.
function useAhora(intervalo = 1000) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return ahora;
}
function Cronometro({ sesion }) {
  const ahora = useAhora();
  return <span style={{ fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>{reloj(duracionEfectiva(sesion, ahora))}</span>;
}
function DuracionViva({ sesion, idioma }) {
  const ahora = useAhora(15000);
  return <>{duracionTexto(duracionEfectiva(sesion, ahora), idioma)}</>;
}

// Mensaje de cada aviso de validarSerie.
function textoAviso(aviso, serie, ajustes, idioma) {
  if (aviso === "peso_alto") return t(idioma, "entreno.sesion.avisoPesoAlto", { kg: `${formatoNumero(pesoAPantalla(serie.kg, ajustes.unidadPeso), idioma)} ${ajustes.unidadPeso}` });
  if (aviso === "reps_altas") return t(idioma, "entreno.sesion.avisoRepsAltas", { reps: serie.reps });
  if (aviso === "sin_reps") return t(idioma, "entreno.sesion.avisoSinReps");
  return t(idioma, "entreno.sesion.avisoDuracionAlta");
}

export function SesionEnCurso({ entreno, idioma, onGuardado, navegar }) {
  const s = entreno.borrador;
  const ajustes = entreno.ajustes;
  const [plegados, setPlegados] = useState({});
  // false | { modo: "anadir" } | { modo: "sustituir", inst }
  const [selector, setSelector] = useState(false);
  const [nota, setNota] = useState(null); // { inst, texto } mientras se escribe la nota de hoy de un ejercicio
  const [hojaTipo, setHojaTipo] = useState(null); // { inst, serie }
  const [menuEjercicio, setMenuEjercicio] = useState(null); // inst
  const [avisos, setAvisos] = useState({}); // id de serie → [avisos]
  const [terminando, setTerminando] = useState(false);
  const onTerminar = () => setTerminando(true);

  usePantallaEncendida();
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  if (!s) return null;
  const resumen = resumenSesion(s, entreno.ejercicioDe, entreno.pesoCorporal);
  const tipoDe = (id) => (entreno.ejercicioDe(id) || {}).tipo || "peso_reps";
  const todas = s.ejercicios.flatMap((ej) => ej.series);
  const todoHecho = todas.length > 0 && todas.every((x) => x.hecha);

  // Tras marcar una serie, el foco salta a la siguiente sin hacer (de este ejercicio o de los siguientes).
  function enfocarSiguiente(inst, serieId) {
    let pasada = false;
    for (const ej of s.ejercicios) {
      for (const sr of ej.series) {
        if (pasada && !sr.hecha) {
          setTimeout(() => { const el = document.getElementById(`campo-${sr.id}`); if (el) el.focus(); }, 60);
          return;
        }
        if (ej.inst === inst && sr.id === serieId) pasada = true;
      }
    }
  }

  function confirmarSerie(ej, serie) {
    entreno.marcarHecha(ej.inst, serie.id);
    setAvisos((a) => { const { [serie.id]: _, ...resto } = a; return resto; });
    enfocarSiguiente(ej.inst, serie.id);
  }

  function marcar(ej, serie) {
    const v = validarSerie(serie, tipoDe(ej.ejercicioId), { pesoMax: entreno.recordsDe(ej.ejercicioId).pesoMax });
    if (!v.ok) {
      setAvisos((a) => ({ ...a, [serie.id]: v.avisos }));
      return;
    }
    confirmarSerie(ej, serie);
  }

  const estaPlegado = (ej) => plegados[ej.inst] ?? (ej.series.length > 0 && ej.series.every((x) => x.hecha));

  return (
    <div
      onPointerDown={prepararAudio}
      style={{ position: "fixed", inset: 0, zIndex: 45, background: "var(--paper)", display: "flex", flexDirection: "column" }}
      role="dialog"
      aria-modal="true"
      aria-label={t(idioma, "entreno.sesion.titulo")}
    >
      {/* Barra de arriba. Deja libres ~110 px a la derecha: ahí flota «Cerrar sesión» (auth-bootstrap.jsx). */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 110px 8px 8px", minHeight: 56, boxSizing: "border-box", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
        <button onClick={entreno.ocultarSesion} aria-label={t(idioma, "entreno.sesion.minimizar")} title={t(idioma, "entreno.sesion.minimizar")} style={botonIcono}>
          <ChevronDown size={22} />
        </button>
        <Cronometro sesion={s} />
        {/* Pausa (petición repetida en las reseñas): para el cronómetro de duración; el descanso sigue su
            curso, porque es tiempo de reloj. */}
        <button
          onClick={estaPausada(s) ? entreno.reanudar : entreno.pausar}
          aria-label={t(idioma, estaPausada(s) ? "entreno.sesion.reanudar" : "entreno.sesion.pausar")}
          title={t(idioma, estaPausada(s) ? "entreno.sesion.reanudar" : "entreno.sesion.pausar")}
          aria-pressed={estaPausada(s)}
          style={{ ...botonIcono, background: estaPausada(s) ? "var(--mustard-soft)" : "none" }}
        >
          {estaPausada(s) ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <button
          onClick={() => entreno.iniciarDescanso(ajustes.descansoSeg)}
          aria-label={t(idioma, "entreno.sesion.descansoManual")}
          title={t(idioma, "entreno.sesion.descansoManual")}
          style={botonIcono}
        >
          <Timer size={20} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={onTerminar}
          style={{ minHeight: 40, padding: "0 14px", borderRadius: 10, border: "none", background: "var(--green)", color: "#fff", fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {t(idioma, "entreno.sesion.terminar")}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 10px 40px" }}>
          <input
            value={s.nombre}
            onChange={(e) => entreno.renombrarSesion(e.target.value)}
            placeholder={t(idioma, "entreno.comun.sinNombre")}
            aria-label={t(idioma, "entreno.sesion.nombre")}
            style={{ width: "100%", border: "none", background: "transparent", fontFamily: FUENTE_TITULOS, fontSize: 22, color: "var(--green-dark)", padding: "2px 4px" }}
          />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "4px 4px 10px", fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)" }}>
            {estaPausada(s) && <b style={{ color: "var(--mustard-dark)" }}>{t(idioma, "entreno.sesion.enPausa")}</b>}
            <span>{t(idioma, "entreno.sesion.duracion")} <b style={{ color: "var(--ink)" }}><DuracionViva sesion={s} idioma={idioma} /></b></span>
            <span>{t(idioma, "entreno.sesion.volumen")} <b style={{ color: "var(--ink)" }}>{textoPeso(resumen.volumen, ajustes, idioma)}</b></span>
            <span>{t(idioma, "entreno.sesion.series")} <b style={{ color: "var(--ink)" }}>{resumen.series}</b></span>
            {entreno.nube === "pendiente" && (
              <span title={t(idioma, "entreno.comun.pendiente")} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CloudOff size={13} /> {t(idioma, "entreno.sesion.guardadoMovil")}
              </span>
            )}
          </div>

          {!s.ejercicios.length && <TextoSuave style={{ padding: "18px 4px" }}>{t(idioma, "entreno.sesion.vacia")}</TextoSuave>}

          {s.ejercicios.map((ej) => {
            const tipo = tipoDe(ej.ejercicioId);
            const campos = camposDeTipo(tipo);
            const anterior = entreno.anteriorDe(ej.ejercicioId);
            const etiquetas = etiquetasSeries(ej.series);
            const hechas = ej.series.filter((x) => x.hecha).length;
            const plegado = estaPlegado(ej);
            const columnas = plantillaColumnas(campos.length, ajustes.mostrarEsfuerzo);
            const ejercicio = entreno.ejercicioDe(ej.ejercicioId);
            // «Anterior» por clase: el calentamiento con el calentamiento y el resto con el resto, en orden.
            const antCal = anterior.filter((a) => a.tipo === "calentamiento");
            const antResto = anterior.filter((a) => a.tipo !== "calentamiento");
            let iCal = 0, iResto = 0;
            const anteriorDeSerie = ej.series.map((sr) => (sr.tipo === "calentamiento" ? antCal[iCal++] : antResto[iResto++]) || null);
            return (
              <section key={ej.inst} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 4px 4px 6px" }}>
                  <button
                    onClick={() => setPlegados((p) => ({ ...p, [ej.inst]: !plegado }))}
                    aria-expanded={!plegado}
                    style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, minHeight: 44, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0 4px" }}
                  >
                    {plegado ? <ChevronRight size={16} color="var(--ink-soft)" /> : <ChevronDown size={16} color="var(--ink-soft)" />}
                    <span style={{ flex: 1, minWidth: 0, fontFamily: FUENTE_TEXTO, fontSize: 15, fontWeight: 700, color: "var(--green-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nombreDe(entreno, ej.ejercicioId, idioma)}
                    </span>
                    <span style={{ fontFamily: FUENTE_MONO, fontSize: 12.5, color: hechas === ej.series.length && hechas ? "var(--green)" : "var(--ink-soft)", flexShrink: 0 }}>
                      {hechas}/{ej.series.length} {hechas === ej.series.length && hechas > 0 && <Check size={12} style={{ verticalAlign: "-1px" }} />}
                    </span>
                  </button>
                  <button onClick={() => setMenuEjercicio(ej.inst)} aria-label={t(idioma, "entreno.sesion.opcionesEjercicio")} style={botonIcono}>
                    <MoreVertical size={18} />
                  </button>
                </div>

                {!plegado && (
                  <div style={{ padding: "0 6px 8px" }}>
                    {ej.sustituyeA && <TextoSuave style={{ fontSize: 12, padding: "0 6px 2px" }}>{t(idioma, "entreno.sesion.enLugarDe", { nombre: nombreDe(entreno, ej.sustituyeA, idioma) })}</TextoSuave>}
                    {ejercicio && ejercicio.notaFija && <TextoSuave style={{ fontSize: 12, padding: "0 6px 2px" }}>{ejercicio.notaFija}</TextoSuave>}
                    {ej.nota && <TextoSuave style={{ fontSize: 12, fontStyle: "italic", padding: "0 6px 4px" }}>{ej.nota}</TextoSuave>}
                    <div style={{ display: "grid", gridTemplateColumns: columnas, gap: 6, padding: "2px 4px", fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-soft)" }}>
                      <span style={{ textAlign: "center" }}>{t(idioma, "entreno.sesion.serie")}</span>
                      <span>{t(idioma, "entreno.sesion.anterior")}</span>
                      {columnasDe(campos, tipo, ajustes).map((c) => <span key={c} style={{ textAlign: "center" }}>{c}</span>)}
                      {ajustes.mostrarEsfuerzo && <span style={{ textAlign: "center" }}>RIR</span>}
                      <span />
                    </div>
                    {ej.series.map((sr, i) => (
                      <FilaSerie
                        key={sr.id}
                        serie={sr}
                        etiqueta={etiquetas[i]}
                        tipo={tipo}
                        campos={campos}
                        anterior={anteriorDeSerie[i]}
                        ajustes={ajustes}
                        mostrarEsfuerzo={ajustes.mostrarEsfuerzo}
                        idioma={idioma}
                        plantillaColumnas={columnas}
                        onEditar={(valores) => {
                          entreno.editarSerie(ej.inst, sr.id, valores);
                          if (avisos[sr.id]) setAvisos((a) => { const { [sr.id]: _, ...resto } = a; return resto; });
                        }}
                        onMarcar={() => marcar(ej, sr)}
                        onDesmarcar={() => entreno.desmarcar(ej.inst, sr.id)}
                        onAbrirTipo={() => setHojaTipo({ inst: ej.inst, serie: sr })}
                        aviso={!avisos[sr.id] ? (sr.hecha && <AvisoRecord records={recordsEnVivo(ej, sr.id, tipo, entreno.pesoCorporal, entreno.recordsDe(ej.ejercicioId))} ajustes={ajustes} idioma={idioma} />) : (
                          <div role="alert" style={{ margin: "0 6px 6px", padding: "8px 10px", borderRadius: 8, background: "var(--rust-soft)", fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)" }}>
                            {avisos[sr.id].map((a) => <div key={a}>{textoAviso(a, sr, ajustes, idioma)}</div>)}
                            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                              <BotonTexto onClick={() => { setAvisos((a) => { const { [sr.id]: _, ...resto } = a; return resto; }); const el = document.getElementById(`campo-${sr.id}`); if (el) el.focus(); }}>{t(idioma, "entreno.sesion.corregir")}</BotonTexto>
                              <BotonTexto onClick={() => confirmarSerie(ej, sr)}>{t(idioma, "entreno.sesion.esCorrecto")}</BotonTexto>
                            </div>
                          </div>
                        )}
                      />
                    ))}
                    <BotonTexto onClick={() => entreno.anadirSerie(ej.inst)} style={{ marginLeft: 8, minHeight: 40 }}>
                      <Plus size={15} /> {t(idioma, "entreno.sesion.anadirSerie")}
                    </BotonTexto>
                  </div>
                )}
              </section>
            );
          })}

          <button
            onClick={() => setSelector({ modo: "anadir" })}
            style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "1.5px dashed var(--green)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, color: "var(--green-dark)" }}
          >
            <Plus size={16} /> {t(idioma, "entreno.sesion.anadirEjercicio")}
          </button>

          {todoHecho && (
            <div style={{ marginTop: 16 }}>
              <TextoSuave style={{ textAlign: "center", marginBottom: 8 }}>{t(idioma, "entreno.sesion.todoHecho")}</TextoSuave>
              <BotonPrincipal onClick={onTerminar}>{t(idioma, "entreno.sesion.terminar")}</BotonPrincipal>
            </div>
          )}
        </div>
      </div>

      {s.descanso && (
        <BarraDescanso
          key={s.descanso.inicio}
          descanso={s.descanso}
          ajustes={ajustes}
          idioma={idioma}
          onAjustar={entreno.ajustarDescanso}
          onSaltar={entreno.saltarDescanso}
          onTerminado={entreno.saltarDescanso}
        />
      )}

      {selector && (
        <SelectorEjercicio
          entreno={entreno}
          idioma={idioma}
          multiple={selector.modo === "anadir"}
          titulo={selector.modo === "sustituir" ? t(idioma, "entreno.sesion.sustituirTitulo") : undefined}
          onCerrar={() => setSelector(false)}
          onElegir={(ids) => {
            if (selector.modo === "sustituir") entreno.sustituirHoy(selector.inst, ids[0]);
            else entreno.anadirEjercicios(ids);
            setSelector(false);
          }}
        />
      )}

      {nota && (
        <HojaInferior titulo={t(idioma, "entreno.sesion.notaHoy")} onCerrar={() => setNota(null)} idioma={idioma}>
          <textarea
            value={nota.texto}
            onChange={(e) => setNota({ ...nota, texto: e.target.value })}
            rows={3}
            autoFocus
            placeholder={t(idioma, "entreno.sesion.notaPlaceholder")}
            style={{ ...inputStyle, fontSize: 16, fontFamily: FUENTE_TEXTO, resize: "vertical" }}
          />
          <BotonPrincipal onClick={() => { entreno.notaEjercicio(nota.inst, nota.texto.trim()); setNota(null); }} style={{ marginTop: 10 }}>
            {t(idioma, "common.guardar")}
          </BotonPrincipal>
        </HojaInferior>
      )}

      {hojaTipo && (
        <HojaTipoSerie
          serie={hojaTipo.serie}
          idioma={idioma}
          onCerrar={() => setHojaTipo(null)}
          onElegir={(tipo) => { entreno.cambiarTipoSerie(hojaTipo.inst, hojaTipo.serie.id, tipo); setHojaTipo(null); }}
          onQuitar={() => { entreno.quitarSerie(hojaTipo.inst, hojaTipo.serie.id); setHojaTipo(null); }}
        />
      )}

      {terminando && <TerminarEntreno entreno={entreno} idioma={idioma} onVolver={() => setTerminando(false)} onGuardado={onGuardado} />}

      {menuEjercicio && (
        <HojaInferior titulo={nombreDe(entreno, (s.ejercicios.find((e) => e.inst === menuEjercicio) || {}).ejercicioId, idioma)} onCerrar={() => setMenuEjercicio(null)} idioma={idioma}>
          <OpcionHoja icono={Repeat} onClick={() => { setSelector({ modo: "sustituir", inst: menuEjercicio }); setMenuEjercicio(null); }} detalle={t(idioma, "entreno.sesion.sustituirAyuda")}>
            {t(idioma, "entreno.sesion.sustituir")}
          </OpcionHoja>
          {s.ejercicios.findIndex((e) => e.inst === menuEjercicio) > 0 && (
            <OpcionHoja icono={ArrowUp} onClick={() => { const i = s.ejercicios.findIndex((e) => e.inst === menuEjercicio); entreno.reordenar(i, i - 1); setMenuEjercicio(null); }}>
              {t(idioma, "entreno.rutinas.subir")}
            </OpcionHoja>
          )}
          {s.ejercicios.findIndex((e) => e.inst === menuEjercicio) < s.ejercicios.length - 1 && (
            <OpcionHoja icono={ArrowDown} onClick={() => { const i = s.ejercicios.findIndex((e) => e.inst === menuEjercicio); entreno.reordenar(i, i + 1); setMenuEjercicio(null); }}>
              {t(idioma, "entreno.rutinas.bajar")}
            </OpcionHoja>
          )}
          <OpcionHoja icono={BookOpen} onClick={() => { const ej = s.ejercicios.find((e) => e.inst === menuEjercicio); setMenuEjercicio(null); entreno.ocultarSesion(); navegar("entreno-ejercicio", { id: ej.ejercicioId }); }}>
            {t(idioma, "entreno.ficha.verFicha")}
          </OpcionHoja>
          <OpcionHoja icono={StickyNote} onClick={() => { const ej = s.ejercicios.find((e) => e.inst === menuEjercicio); setNota({ inst: menuEjercicio, texto: (ej && ej.nota) || "" }); setMenuEjercicio(null); }}>
            {t(idioma, "entreno.sesion.notaHoy")}
          </OpcionHoja>
          <OpcionHoja icono={Trash2} peligro onClick={() => { entreno.quitarEjercicio(menuEjercicio); setMenuEjercicio(null); }}>
            {t(idioma, "entreno.sesion.quitarEjercicio")}
          </OpcionHoja>
        </HojaInferior>
      )}
    </div>
  );
}

// Récord batido al momento (fase C2): una línea discreta bajo la fila, sin confeti ni ventanas (nada
// interrumpe una sesión).
function AvisoRecord({ records, ajustes, idioma }) {
  if (!records.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px 6px 44px", fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--mustard-dark)", fontWeight: 600 }}>
      <Medal size={14} style={{ flexShrink: 0 }} />
      <span>{records.map((r) => textoRecord(r.clave, r.valor, ajustes, idioma)).join(" · ")}</span>
    </div>
  );
}

const botonIcono = {
  width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
  background: "none", border: "none", borderRadius: 10, cursor: "pointer", color: "var(--ink)",
};
