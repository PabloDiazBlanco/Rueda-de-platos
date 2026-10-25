// ---------- ui/entreno/historial.jsx ----------
// «Historial» (diseño, §4.7): los entrenos de un mes, con «mes anterior / siguiente» (cada mes se lee
// solo cuando se pide: los entrenos se guardan por meses, ver logica/entreno-almacen.js), y el detalle
// de cada sesión (destino `entreno-sesion`, con `params: { id, inicio }`), que se puede corregir (un peso
// mal puesto, una serie de más), borrar, guardar como rutina o compartir. Corregir o borrar reescribe su
// mes y reconstruye el índice, así los récords y el «anterior» se recalculan solos.
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, ClipboardList, X, Medal } from "lucide-react";
import { t } from "i18n";
import { camposDeTipo } from "entreno-ejercicios";
import { resumenSesion, seriesConRecord, fechaLocal } from "entreno-calculo";
import { mesDe } from "entreno-almacen";
import { Field, inputStyle, ModalShell, ModalBtn } from "../comun/modal.jsx";
import { BackLink } from "../comun/tarjetas.jsx";
import { BotonCompartir } from "../comun/compartir.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO } from "../estilos.js";
import {
  BotonPrincipal, BotonSecundario, BotonTexto, TextoSuave, duracionTexto, textoPeso, nombreDe, nombreMes, fechaLarga,
  formatoNumero, pesoAPantalla, distanciaAPantalla, fechaDia, DIAS_CORTOS, Chip,
} from "./comun.jsx";
import { FilaSesion } from "./inicio.jsx";
import { textoSerie, documentoSesion } from "./terminar.jsx";
import { etiquetasSeries, deTexto, unidadTiempo, COLOR_SERIE } from "./fila-serie.jsx";

function sumarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function HistorialView({ entreno, idioma, navegar }) {
  const actual = entreno.mesActual();
  const [mes, setMes] = useState(actual);
  const [cargando, setCargando] = useState(false);
  const [dia, setDia] = useState(null); // «AAAA-MM-DD» elegido en el calendario, o null (todo el mes)
  // G2: si el mes tiene entrenos en más de un gimnasio, unas fichas para ver solo los de uno.
  const [gimnasio, setGimnasio] = useState(null);

  useEffect(() => {
    let vivo = true;
    setDia(null);
    if (!entreno.meses[mes]) {
      setCargando(true);
      entreno.cargarMes(mes).finally(() => { if (vivo) setCargando(false); });
    }
    return () => { vivo = false; };
  }, [mes]);

  const todasDelMes = entreno.sesionesDeMes(mes);
  const gimnasios = [...new Set(todasDelMes.map((s) => s.gimnasio).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sesiones = gimnasio && gimnasios.includes(gimnasio) ? todasDelMes.filter((s) => s.gimnasio === gimnasio) : todasDelMes;
  const delDia = dia ? sesiones.filter((s) => fechaLocal(s.inicio) === dia) : sesiones;
  const flecha = { width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button onClick={() => setMes(sumarMes(mes, -1))} aria-label={t(idioma, "entreno.historial.mesAnterior")} style={flecha}><ChevronLeft size={20} /></button>
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{nombreMes(mes, idioma)}</h2>
        <button onClick={() => setMes(sumarMes(mes, 1))} disabled={mes >= actual} aria-label={t(idioma, "entreno.historial.mesSiguiente")} style={{ ...flecha, opacity: mes >= actual ? 0.3 : 1, cursor: mes >= actual ? "default" : "pointer" }}><ChevronRight size={20} /></button>
      </div>

      {gimnasios.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 4 }}>
          <Chip activo={!gimnasio || !gimnasios.includes(gimnasio)} onClick={() => setGimnasio(null)}>{t(idioma, "entreno.gimnasio.todos")}</Chip>
          {gimnasios.map((g) => <Chip key={g} activo={gimnasio === g} onClick={() => setGimnasio(gimnasio === g ? null : g)}>{g}</Chip>)}
        </div>
      )}

      <Calendario mes={mes} sesiones={sesiones} inicioSemana={entreno.ajustes.inicioSemana} dia={dia} onDia={(d) => setDia(dia === d ? null : d)} idioma={idioma} />

      <TextoSuave style={{ margin: "10px 0 10px" }}>
        {cargando ? t(idioma, "loading.cargando")
          : dia ? fechaDia(dia + "T12:00:00", idioma)
          : sesiones.length ? t(idioma, sesiones.length === 1 ? "entreno.historial.unEntreno" : "entreno.historial.nEntrenos", { n: sesiones.length })
          : t(idioma, "entreno.historial.vacio")}
      </TextoSuave>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {delDia.map((s) => (
          <FilaSesion key={s.id} sesion={s} entreno={entreno} idioma={idioma} onClick={() => navegar("entreno-sesion", { id: s.id, inicio: s.inicio })} />
        ))}
      </div>
    </div>
  );
}

// Calendario del mes con un punto en cada día entrenado (patrón muy valorado en las reseñas de Strong;
// diseño, §4.7). La semana empieza en lunes o en domingo según los ajustes. Tocar un día con entrenos
// enseña solo los de ese día; tocarlo otra vez vuelve al mes entero.
function Calendario({ mes, sesiones, inicioSemana, dia, onDia, idioma }) {
  const [a, m] = mes.split("-").map(Number);
  const diasMes = new Date(a, m, 0).getDate();
  const primero = new Date(a, m - 1, 1).getDay(); // 0 = domingo
  const hueco = (primero - inicioSemana + 7) % 7;
  const entrenados = new Set(sesiones.map((s) => fechaLocal(s.inicio)));
  const hoy = fechaLocal(Date.now());
  const iniciales = DIAS_CORTOS[idioma] || DIAS_CORTOS.es; // empiezan en lunes
  const cabecera = inicioSemana === 0 ? [iniciales[6], ...iniciales.slice(0, 6)] : iniciales;
  const celdas = [...Array(hueco).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  return (
    <div role="grid" aria-label={nombreMes(mes, idioma)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 6px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 2 }}>
        {cabecera.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {celdas.map((n, i) => {
          if (!n) return <span key={i} />;
          const fecha = `${mes}-${String(n).padStart(2, "0")}`;
          const entrenado = entrenados.has(fecha);
          const elegido = dia === fecha;
          return (
            <button
              key={i}
              onClick={entrenado ? () => onDia(fecha) : undefined}
              disabled={!entrenado}
              aria-pressed={entrenado ? elegido : undefined}
              aria-label={entrenado ? `${n} · ${t(idioma, "entreno.historial.diaEntrenado")}` : String(n)}
              style={{
                height: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                border: "none", borderRadius: 8, background: elegido ? "var(--green-soft)" : "transparent", cursor: entrenado ? "pointer" : "default",
                fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: fecha === hoy ? 700 : 400,
                color: fecha > hoy ? "var(--line)" : fecha === hoy ? "var(--green-dark)" : "var(--ink)",
              }}
            >
              {n}
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: entrenado ? "var(--green)" : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Campo para corregir un valor de una serie pasada.
function CampoCorregir({ campo, valor, tipo, ajustes, idioma, onCambio, etiqueta }) {
  const inicial = valor === null || valor === undefined ? "" : campo === "kg" ? formatoNumero(pesoAPantalla(valor, ajustes.unidadPeso), idioma)
    : campo === "km" ? formatoNumero(distanciaAPantalla(valor, ajustes.unidadDistancia), idioma, 2)
    : campo === "seg" && unidadTiempo(tipo) === "min" ? formatoNumero(valor / 60, idioma, 2) : String(valor);
  const [texto, setTexto] = useState(inicial);
  return (
    <input
      value={texto}
      aria-label={etiqueta}
      inputMode={campo === "reps" ? "numeric" : "decimal"}
      onFocus={(e) => e.target.select()}
      onChange={(e) => { setTexto(e.target.value); const v = deTexto(campo, e.target.value, tipo, ajustes); if (v !== undefined) onCambio(v); }}
      style={{ ...inputStyle, height: 40, textAlign: "center", fontFamily: FUENTE_MONO, fontSize: 15, padding: "0 4px" }}
    />
  );
}

export function DetalleSesionView({ entreno, idioma, navegar, params, onAbrirEjercicio }) {
  const id = params && params.id;
  const mes = params && params.inicio ? mesDe(params.inicio) : entreno.mesActual();
  const [cargado, setCargado] = useState(!!entreno.meses[mes]);
  const [editando, setEditando] = useState(null); // copia de la sesión mientras se corrige
  const [borrar, setBorrar] = useState(false);
  const [comoRutina, setComoRutina] = useState(null); // nombre de la rutina nueva
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!entreno.meses[mes]) entreno.cargarMes(mes).finally(() => setCargado(true));
  }, [mes]);

  const sesion = entreno.sesionesDeMes(mes).find((s) => s.id === id);
  const volver = <BackLink label={t(idioma, "barra.historial")} onClick={() => navegar("entreno-historial")} />;
  if (!sesion) {
    return <div>{volver}<TextoSuave>{cargado ? t(idioma, "entreno.detalle.noEncontrada") : t(idioma, "loading.cargando")}</TextoSuave></div>;
  }
  const pendiente = entreno.cola.some((s) => s.id === sesion.id);
  const vista = editando || sesion;
  const r = resumenSesion(vista, entreno.ejercicioDe, entreno.pesoCorporal);
  const ajustes = entreno.ajustes;

  const cambiarSerie = (inst, serieId, cambios) => setEditando((s) => ({ ...s, ejercicios: s.ejercicios.map((ej) => (ej.inst === inst ? { ...ej, series: ej.series.map((sr) => (sr.id === serieId ? { ...sr, ...cambios } : sr)) } : ej)) }));
  const quitarSerie = (inst, serieId) => setEditando((s) => ({
    ...s,
    ejercicios: s.ejercicios.map((ej) => (ej.inst === inst ? { ...ej, series: ej.series.filter((sr) => sr.id !== serieId) } : ej)).filter((ej) => ej.series.length),
  }));

  async function guardarCambios() {
    setGuardando(true);
    try {
      await entreno.guardarSesionPasada(editando);
      setEditando(null);
    } catch (e) {
      setAviso(t(idioma, "entreno.detalle.sinConexion"));
    }
    setGuardando(false);
  }

  return (
    <div>
      {volver}
      {editando ? (
        <input
          value={editando.nombre}
          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
          aria-label={t(idioma, "entreno.sesion.nombre")}
          style={{ ...inputStyle, fontFamily: FUENTE_TITULOS, fontSize: 20, minHeight: 44 }}
        />
      ) : (
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 22, color: "var(--green-dark)" }}>{sesion.nombre || t(idioma, "entreno.comun.sinNombre")}</h2>
      )}
      <TextoSuave style={{ marginTop: 4 }}>{[fechaLarga(sesion.inicio, idioma), sesion.gimnasio].filter(Boolean).join(" · ")}</TextoSuave>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 4px", fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>
        <span>{t(idioma, "entreno.sesion.duracion")} <b style={{ color: "var(--ink)" }}>{duracionTexto(r.duracionSeg, idioma)}</b></span>
        <span>{t(idioma, "entreno.sesion.volumen")} <b style={{ color: "var(--ink)" }}>{textoPeso(r.volumen, ajustes, idioma)}</b></span>
        <span>{t(idioma, "entreno.sesion.series")} <b style={{ color: "var(--ink)" }}>{r.series}</b></span>
        {sesion.esfuerzo && <span>{t(idioma, "entreno.detalle.esfuerzo", { n: sesion.esfuerzo })}</span>}
      </div>
      {sesion.nota && !editando && <TextoSuave style={{ fontStyle: "italic", margin: "6px 0" }}>{sesion.nota}</TextoSuave>}
      {pendiente && <TextoSuave style={{ margin: "6px 0" }}>{t(idioma, "entreno.detalle.pendiente")}</TextoSuave>}

      {vista.ejercicios.map((ej) => {
        const tipo = (entreno.ejercicioDe(ej.ejercicioId) || {}).tipo || "peso_reps";
        const campos = camposDeTipo(tipo);
        const etiquetas = etiquetasSeries(ej.series);
        // Medalla junto a las series que tienen hoy un récord de su ejercicio (fase C2).
        const conMedalla = editando ? new Set() : seriesConRecord((entreno.indice.ejercicios || {})[ej.ejercicioId], sesion.id, ej, tipo, entreno.pesoCorporal);
        return (
          <section key={ej.inst} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginTop: 10 }}>
            <button
              onClick={onAbrirEjercicio ? () => onAbrirEjercicio(ej.ejercicioId) : undefined}
              disabled={!onAbrirEjercicio}
              style={{ background: "none", border: "none", padding: 0, cursor: onAbrirEjercicio ? "pointer" : "default", textAlign: "left", fontFamily: FUENTE_TEXTO, fontSize: 15, fontWeight: 700, color: "var(--green-dark)" }}
            >
              {nombreDe(entreno, ej.ejercicioId, idioma)}
            </button>
            {ej.nota && <TextoSuave style={{ fontSize: 12 }}>{ej.nota}</TextoSuave>}
            {ej.series.map((sr, i) => (
              <div key={sr.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: i ? "1px solid var(--line)" : "none", marginTop: i ? 0 : 6 }}>
                <span style={{ width: 22, fontFamily: FUENTE_MONO, fontWeight: 700, color: COLOR_SERIE[sr.tipo] }}>{etiquetas[i]}</span>
                {editando ? (
                  <>
                    {campos.map((c) => (
                      <CampoCorregir key={c} campo={c} valor={sr[c]} tipo={tipo} ajustes={ajustes} idioma={idioma} etiqueta={`${c} · ${etiquetas[i]}`} onCambio={(v) => cambiarSerie(ej.inst, sr.id, { [c]: v })} />
                    ))}
                    <button onClick={() => quitarSerie(ej.inst, sr.id)} aria-label={t(idioma, "entreno.sesion.quitarSerie")} style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--rust)" }}><X size={16} /></button>
                  </>
                ) : (
                  <span style={{ flex: 1, fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
                    {textoSerie(sr, tipo, ajustes, idioma)}
                    {conMedalla.has(sr.id) && <Medal size={13} color="var(--mustard-dark)" style={{ marginLeft: 6, verticalAlign: "-2px" }} aria-label={t(idioma, "entreno.detalle.record")} />}
                  </span>
                )}
              </div>
            ))}
          </section>
        );
      })}

      {aviso && <TextoSuave style={{ color: "var(--rust)", marginTop: 10 }}>{aviso}</TextoSuave>}

      {editando ? (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <BotonSecundario onClick={() => setEditando(null)} style={{ flex: 1 }}>{t(idioma, "common.cancelar")}</BotonSecundario>
          <BotonPrincipal onClick={guardarCambios} disabled={guardando} style={{ flex: 2 }}>{t(idioma, "entreno.detalle.guardarCambios")}</BotonPrincipal>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!pendiente && <BotonSecundario onClick={() => setEditando(JSON.parse(JSON.stringify(sesion)))}><Pencil size={14} /> {t(idioma, "entreno.detalle.editar")}</BotonSecundario>}
            <BotonSecundario onClick={() => setComoRutina(sesion.nombre || "")}><ClipboardList size={14} /> {t(idioma, "entreno.detalle.comoRutina")}</BotonSecundario>
            <BotonCompartir construirDocumento={() => documentoSesion(sesion, entreno, idioma)} nombreArchivo="entreno" idioma={idioma} />
          </div>
          {!pendiente && (
            <BotonTexto onClick={() => setBorrar(true)} color="var(--rust)"><Trash2 size={14} /> {t(idioma, "entreno.detalle.borrar")}</BotonTexto>
          )}
        </div>
      )}

      {borrar && (
        <ModalShell title={t(idioma, "entreno.detalle.borrarTitulo")} onClose={() => setBorrar(false)}>
          <TextoSuave style={{ marginBottom: 16 }}>{t(idioma, "entreno.detalle.borrarTexto")}</TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setBorrar(false)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn
              variant="danger"
              onClick={async () => {
                setBorrar(false);
                try {
                  await entreno.borrarSesionPasada(sesion);
                  navegar("entreno-historial");
                } catch (e) {
                  setAviso(t(idioma, "entreno.detalle.sinConexion"));
                }
              }}
            >
              {t(idioma, "entreno.rutinas.borrar")}
            </ModalBtn>
          </div>
        </ModalShell>
      )}

      {comoRutina !== null && (
        <ModalShell title={t(idioma, "entreno.detalle.comoRutina")} onClose={() => setComoRutina(null)}>
          <Field label={t(idioma, "entreno.rutinas.nombre")}>
            <input value={comoRutina} onChange={(e) => setComoRutina(e.target.value)} autoFocus style={{ ...inputStyle, minHeight: 44, fontSize: 16 }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setComoRutina(null)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn
              variant="solid"
              disabled={!comoRutina.trim()}
              onClick={() => {
                const rid = entreno.rutinaDesdeSesion(sesion, comoRutina.trim());
                setComoRutina(null);
                navegar("entreno-rutina", { id: rid });
              }}
            >
              {t(idioma, "common.guardar")}
            </ModalBtn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
