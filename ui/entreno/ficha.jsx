// ---------- ui/entreno/ficha.jsx ----------
// Ficha de un ejercicio (destino `entreno-ejercicio`, `params: { id }`; diseño, §4.6), con cuatro
// pestañas como las de las apps de las capturas: Resumen (músculos, equipo, nota fija, favorito...),
// Historial (cada sesión con sus series, y medalla en la que tiene hoy un récord), Progreso (gráficas de
// 1RM estimado y volumen, ui/entreno/graficas.jsx) y Récords. Todo el historial es gratis: el «últimos 3
// meses» de las capturas es una limitación comercial sin coste real (aquí el cálculo es local).
// Para el historial y el progreso hacen falta todos los meses: se leen al abrir la ficha (son documentos
// pequeños, uno por mes con entrenos).
import React, { useState, useEffect } from "react";
import { Medal, MessageSquareWarning } from "lucide-react";
import { t } from "i18n";
import { nombreEjercicio } from "entreno-nombres";
import { seriesConRecord, RECORDS_POR_TIPO } from "entreno-calculo";
import { BackLink } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO } from "../estilos.js";
import { TextoSuave, Chip, BotonTexto, fechaCorta, fechaLarga } from "./comun.jsx";
import { DatosEjercicio, AjustesDeEjercicio } from "./ejercicios.jsx";
import { textoSerie, textoRecord } from "./terminar.jsx";
import { etiquetasSeries, COLOR_SERIE } from "./fila-serie.jsx";
import { GraficasEjercicio } from "./graficas.jsx";

const PESTANAS = ["resumen", "historial", "progreso", "records"];

// Las veces que se hizo el ejercicio: [{ sesion, ej }], de la más reciente a la más antigua. Si sale dos
// veces en una sesión, cuentan las dos instancias.
export function vecesDeEjercicio(sesiones, id) {
  const veces = [];
  sesiones.forEach((sesion) => (sesion.ejercicios || []).forEach((ej) => {
    if (ej.ejercicioId === id && (ej.series || []).some((s) => s.hecha)) veces.push({ sesion, ej });
  }));
  return veces.sort((a, b) => new Date(b.sesion.inicio) - new Date(a.sesion.inicio));
}

// Todas las sesiones conocidas (todos los meses más la cola), una vez leídos los meses.
export function useTodasLasSesiones(entreno) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let vivo = true;
    entreno.cargarTodosLosMeses().catch(() => {}).finally(() => { if (vivo) setListo(true); });
    return () => { vivo = false; };
  }, []);
  const sesiones = [];
  Object.keys(entreno.meses).forEach((mes) => entreno.sesionesDeMes(mes).forEach((s) => sesiones.push(s)));
  entreno.cola.forEach((s) => { if (!sesiones.some((x) => x.id === s.id)) sesiones.push(s); });
  return { listo, sesiones };
}

export function FichaEjercicioView({ entreno, idioma, navegar, params }) {
  const id = params && params.id;
  const [pestana, setPestana] = useState("resumen");
  const { listo, sesiones } = useTodasLasSesiones(entreno);
  const e = entreno.ejercicioDe(id);
  const volver = <BackLink label={t(idioma, "barra.ejercicios")} onClick={() => navegar("entreno-ejercicios")} />;
  if (!e) return <div>{volver}<TextoSuave>{t(idioma, "entreno.detalle.noEncontrada")}</TextoSuave></div>;

  const veces = vecesDeEjercicio(sesiones, id);
  const registro = (entreno.indice.ejercicios || {})[id];
  const records = (registro && registro.records) || {};

  return (
    <div>
      {volver}
      <h2 style={{ margin: "0 0 10px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 22, color: "var(--green-dark)" }}>{nombreEjercicio(e, idioma)}</h2>
      <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
        {PESTANAS.map((p) => (
          <Chip key={p} role="tab" aria-selected={pestana === p} activo={pestana === p} onClick={() => setPestana(p)}>{t(idioma, "entreno.ficha." + p)}</Chip>
        ))}
      </div>

      {pestana === "resumen" && (
        <div>
          <DatosEjercicio ejercicio={e} idioma={idioma} />
          <TextoSuave style={{ marginBottom: 14 }}>
            {veces.length
              ? `${t(idioma, veces.length === 1 ? "entreno.ficha.unaSesion" : "entreno.ficha.sesiones", { n: veces.length })} · ${t(idioma, "entreno.ficha.ultimaVez", { fecha: fechaCorta(veces[0].sesion.inicio, idioma) })}`
              : listo ? t(idioma, "entreno.ficha.sinHistorial") : t(idioma, "loading.cargando")}
          </TextoSuave>
          <AjustesDeEjercicio entreno={entreno} idioma={idioma} ejercicio={e} onCerrar={() => navegar("entreno-ejercicios")} />
        </div>
      )}

      {pestana === "historial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!veces.length && <TextoSuave>{listo ? t(idioma, "entreno.ficha.sinHistorial") : t(idioma, "loading.cargando")}</TextoSuave>}
          {veces.map(({ sesion, ej }) => {
            const hechas = ej.series.filter((s) => s.hecha);
            const etiquetas = etiquetasSeries(hechas);
            const medallas = seriesConRecord(registro, sesion.id, ej, e.tipo, entreno.pesoCorporal);
            return (
              <button
                key={sesion.id + ej.inst}
                onClick={() => navegar("entreno-sesion", { id: sesion.id, inicio: sesion.inicio })}
                style={{ textAlign: "left", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
              >
                <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 4 }}>{fechaLarga(sesion.inicio, idioma)} · {sesion.nombre}</div>
                {hechas.map((sr, i) => (
                  <div key={sr.id} style={{ display: "flex", gap: 8, fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 13.5, padding: "1px 0" }}>
                    <span style={{ width: 20, fontWeight: 700, color: COLOR_SERIE[sr.tipo] }}>{etiquetas[i]}</span>
                    <span>{textoSerie(sr, e.tipo, entreno.ajustes, idioma)}</span>
                    {medallas.has(sr.id) && <Medal size={13} color="var(--mustard-dark)" aria-label={t(idioma, "entreno.detalle.record")} />}
                  </div>
                ))}
              </button>
            );
          })}
        </div>
      )}

      {pestana === "progreso" && <GraficasEjercicio veces={veces} ejercicio={e} entreno={entreno} idioma={idioma} listo={listo} />}

      {pestana === "records" && (
        <div>
          {!(RECORDS_POR_TIPO[e.tipo] || []).some((c) => records[c]) && <TextoSuave>{t(idioma, "entreno.ficha.sinRecords")}</TextoSuave>}
          {(RECORDS_POR_TIPO[e.tipo] || []).filter((c) => records[c]).map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", fontFamily: FUENTE_TEXTO }}>
              <Medal size={16} color="var(--mustard-dark)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14 }}>{textoRecord(c, records[c], entreno.ajustes, idioma)}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{records[c].fecha ? fechaCorta(records[c].fecha + "T12:00:00", idioma) : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Idea de la segunda app de las capturas: avisar de un dato mal puesto sin tener que explicar «cuál». */}
      <div style={{ marginTop: 24 }}>
        <BotonTexto onClick={() => navegar("feedback", { categoria: "ejercicio", ejercicioId: id })} color="var(--ink-soft)">
          <MessageSquareWarning size={14} /> {t(idioma, "entreno.ficha.datosErroneos")}
        </BotonTexto>
      </div>
    </div>
  );
}
