// ---------- ui/peso/seguimiento.jsx ----------
// Seguimiento de peso (premium): pesadas, ciclos, pausas, avisos y cierre de ciclo.
import React, { useState } from "react";
import { DIAS_SEMANA_CORTO, DIAS_SUGERIDOS_PESO, PESO_FRECUENCIAS, PESO_DURACIONES, MOTIVOS_CAMBIO_PESO, RANGOS_PROGRESION, fechaISO, formatFechaCorta, esDiaSugeridoPeso, esCambioRadical, calcularTendenciaPeso, evaluarTendencia } from "peso";
import { t } from "i18n";
import { ModalShell, Field, inputStyle, ModalBtn } from "../comun/modal.jsx";
import { SectionIntro, MacroPill } from "../comun/tarjetas.jsx";
import { PesoLineChart, PrintSeguimiento } from "./grafica.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// DIAS_SEMANA_CORTO (logica/peso.js) ya viene abreviado en español ("Dom","Lun"...) — para
// traducirlo reusamos las claves "dia.X" (nombre completo) ya existentes: primero se pasa a
// nombre completo con este mapa, se traduce, y se vuelve a recortar a 3 letras.
const DIA_CORTO_A_COMPLETO = {
  Dom: "Domingo", Lun: "Lunes", Mar: "Martes", Mié: "Miércoles", Jue: "Jueves", Vie: "Viernes", Sáb: "Sábado",
};

function RecordatorioPesoModal({ onClose, idioma }) {
  return (
    <ModalShell onClose={onClose} title={t(idioma, "recordatorioPeso.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        {t(idioma, "recordatorioPeso.texto")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={onClose}>{t(idioma, "recordatorioPeso.saltar")}</ModalBtn>
        <ModalBtn variant="solid" onClick={onClose}>{t(idioma, "recordatorioPeso.vale")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

function PesoAnomaliaModal({ peso, onCancel, onConfirm, idioma }) {
  const [motivo, setMotivo] = useState("");
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "anomaliaPeso.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, marginTop: 0 }}>
        {t(idioma, "anomaliaPeso.texto", { peso })}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {MOTIVOS_CAMBIO_PESO.map((op) => (
          <button
            key={op}
            onClick={() => setMotivo(op)}
            style={{
              textAlign: "left", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
              background: motivo === op ? "var(--green-soft)" : "#fff",
              color: motivo === op ? "var(--green-dark)" : "var(--ink)",
              fontSize: 12.5, fontFamily: FUENTE_TEXTO, cursor: "pointer",
            }}
          >
            {t(idioma, "motivo." + op)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ModalBtn variant="ghost" onClick={() => onConfirm(false, "")}>{t(idioma, "anomaliaPeso.esNormal")}</ModalBtn>
        <ModalBtn variant="solid" onClick={() => onConfirm(true, motivo || "Sin especificar")}>{t(idioma, "anomaliaPeso.guardarAtipico")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

export function NivelBadge({ nivel, idioma }) {
  const meta = {
    optimo: { labelKey: "nivel.optimo", color: "var(--green-dark)", bg: "var(--green-soft)" },
    ineficaz: { labelKey: "nivel.ineficaz", color: "var(--coffee)", bg: "var(--coffee-soft)" },
    aviso: { labelKey: "nivel.aviso", color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
    accion: { labelKey: "nivel.accion", color: "var(--rust)", bg: "var(--rust-soft)" },
    "direccion-contraria": { labelKey: "nivel.direccionContraria", color: "var(--rust)", bg: "var(--rust-soft)" },
    insuficiente: { labelKey: "nivel.insuficiente", color: "var(--coffee)", bg: "var(--coffee-soft)" },
    aceptable: { labelKey: "nivel.aceptable", color: "var(--mustard-dark)", bg: "var(--mustard-soft)" },
    demasiado: { labelKey: "nivel.demasiado", color: "var(--rust)", bg: "var(--rust-soft)" },
  }[nivel];
  if (!meta) return null;
  return <MacroPill label="" value={t(idioma, meta.labelKey)} color={meta.color} bg={meta.bg} />;
}

// Vista de "Seguimiento de peso": mientras el ciclo está abierto, solo se enseña el progreso (cuántas
// pesadas van, cuánto falta) sin cifras ni gráfica — para no fomentar la obsesión con el número del día.
// Al llegar a la duración configurada, se enseña la tendencia real y una sugerencia de ajuste opcional.
export function PesoView({ perfil, pesoTracking, onAddPeso, onUpdateConfig, onDismissReminder, onCerrarCiclo, onPausarCiclo, onReanudarCiclo, idioma }) {
  const [pesoInput, setPesoInput] = useState("");
  const [pendienteAnomalia, setPendienteAnomalia] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showProgresion, setShowProgresion] = useState(false);
  const [rangoProgresion, setRangoProgresion] = useState("3m");
  const [aplicarKcalToggle, setAplicarKcalToggle] = useState(false);
  const [actualizarPesoToggle, setActualizarPesoToggle] = useState(true);
  const [printPayload, setPrintPayload] = useState(null);
  const [pausando, setPausando] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState("");

  // Deja el contenido a imprimir listo en el DOM y espera a que React lo pinte (doble
  // requestAnimationFrame) antes de abrir el diálogo de impresión del navegador.
  function exportarSeguimiento(entradasAExportar, tendenciaAExportar, titulo) {
    setPrintPayload({ entradas: entradasAExportar, tendencia: tendenciaAExportar, titulo });
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  const hoy = new Date();
  const hoyISO = fechaISO(hoy);
  const entradas = pesoTracking.entradas || [];
  const historial = pesoTracking.historial || [];
  const yaRegistradoHoy = entradas.some((e) => e.fecha === hoyISO);

  // Mientras el ciclo esté pausado, esos días no cuentan para el cierre (se suman al plazo del
  // ciclo, como si no hubieran pasado) y no se dispara el recordatorio de pesaje.
  const pausas = pesoTracking.pausas || [];
  const pausaActiva = pausas.find((p) => p.fin === null) || null;
  const diasEntre = (isoInicio, isoFin) => Math.round((new Date(isoFin + "T00:00:00") - new Date(isoInicio + "T00:00:00")) / 86400000);
  const totalDiasPausados = pausas.reduce((sum, p) => sum + diasEntre(p.inicio, p.fin || hoyISO), 0);

  const diaSugerido = !pausaActiva && esDiaSugeridoPeso(pesoTracking.vecesSemana, hoy);
  const [recordatorioAbierto, setRecordatorioAbierto] = useState(
    diaSugerido && !yaRegistradoHoy && pesoTracking.recordatorioDescartadoFecha !== hoyISO
  );

  const cicloInicioDate = pesoTracking.cicloInicio ? new Date(pesoTracking.cicloInicio + "T00:00:00") : null;
  const diasTranscurridos = cicloInicioDate ? Math.floor((hoy - cicloInicioDate) / 86400000) : 0;
  const diasCiclo = pesoTracking.duracionSemanas * 7 + totalDiasPausados;
  const cicloListoParaCierre = !!cicloInicioDate && diasTranscurridos >= diasCiclo && entradas.length >= 2;
  const totalEsperado = pesoTracking.duracionSemanas * pesoTracking.vecesSemana;

  function confirmarPausa() {
    onPausarCiclo(motivoPausa.trim());
    setPausando(false);
    setMotivoPausa("");
  }

  function intentarGuardar() {
    const peso = Number(pesoInput.replace(",", "."));
    if (!peso || peso <= 0) return;
    if (esCambioRadical(peso, entradas, hoyISO)) {
      setPendienteAnomalia({ peso });
      return;
    }
    onAddPeso(peso, false, "");
    setPesoInput("");
  }

  const tendencia = cicloListoParaCierre ? calcularTendenciaPeso(entradas) : null;
  const evaluacion = tendencia ? evaluarTendencia(tendencia.pctSemana, perfil?.objetivo, idioma) : null;
  const ultimaNormal = [...entradas].reverse().find((e) => !e.atipico);
  const hayCambios = evaluacion && evaluacion.sugerenciaKcal !== 0 && perfil?.objetivo && perfil.objetivo !== "mantenimiento";

  const rangoDias = (RANGOS_PROGRESION.find((r) => r.key === rangoProgresion) || RANGOS_PROGRESION[0]).dias;
  const historialFiltrado = historial.filter((e) => {
    if (rangoDias === Infinity) return true;
    return (hoy - new Date(e.fecha + "T00:00:00")) / 86400000 <= rangoDias;
  });

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionIntro text={t(idioma, "pesoView.intro")} />

      {recordatorioAbierto && (
        <RecordatorioPesoModal onClose={() => { setRecordatorioAbierto(false); onDismissReminder(); }} idioma={idioma} />
      )}

      {pendienteAnomalia && (
        <PesoAnomaliaModal
          peso={pendienteAnomalia.peso}
          onCancel={() => setPendienteAnomalia(null)}
          onConfirm={(atipico, motivo) => {
            onAddPeso(pendienteAnomalia.peso, atipico, motivo);
            setPendienteAnomalia(null);
            setPesoInput("");
          }}
          idioma={idioma}
        />
      )}

      {cicloListoParaCierre ? (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
            {t(idioma, "pesoView.cicloTerminado", { n: entradas.length })}
          </div>

          {pausas.length > 0 && (
            <div style={{ background: "var(--mustard-soft)", borderRadius: 8, padding: "9px 11px", marginBottom: 12 }}>
              {pausas.map((p, i) => (
                <div key={i} style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--mustard-dark)", lineHeight: 1.5 }}>
                  {t(idioma, "pesoView.pausadoDelAl", {
                    inicio: formatFechaCorta(p.inicio, idioma),
                    fin: formatFechaCorta(p.fin || hoyISO, idioma),
                    detalle: p.motivo ? ` — "${p.motivo}"` : "",
                  })}
                </div>
              ))}
            </div>
          )}

          {tendencia ? (
            <>
              <PesoLineChart entradas={entradas} tendencia={tendencia} idioma={idioma} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 20, fontWeight: 700, color: "var(--green-dark)" }}>
                  {t(idioma, "pesoView.pctSemana", { signo: tendencia.pctSemana > 0 ? "+" : "", pct: tendencia.pctSemana.toFixed(2) })}
                </span>
                {evaluacion && <NivelBadge nivel={evaluacion.nivel} idioma={idioma} />}
              </div>
              {evaluacion && (
                <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, marginTop: 10 }}>
                  {evaluacion.mensaje}
                </p>
              )}

              {ultimaNormal && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: 9, padding: "11px 13px", marginTop: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={actualizarPesoToggle} onChange={(e) => setActualizarPesoToggle(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--green-dark)", fontWeight: 700 }}>
                      {t(idioma, "pesoView.actualizarPesoPerfil", { kg: ultimaNormal.peso })}
                    </span>
                    <span style={{ display: "block", fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--green-dark)", marginTop: 2 }}>
                      {t(idioma, "pesoView.actualizarPesoExplicacion", { kg: perfil?.peso })}
                    </span>
                  </span>
                </label>
              )}

              {hayCambios && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--mustard-soft)", border: "1px solid var(--mustard)", borderRadius: 9, padding: "11px 13px", marginTop: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={aplicarKcalToggle} onChange={(e) => setAplicarKcalToggle(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--mustard-dark)", fontWeight: 700 }}>
                      {t(idioma, "pesoView.aplicarAjuste", { signo: evaluacion.sugerenciaKcal > 0 ? "+" : "", kcal: evaluacion.sugerenciaKcal })}
                    </span>
                    <span style={{ display: "block", fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--mustard-dark)", marginTop: 2 }}>
                      {t(idioma, "pesoView.noCambiaEtapa", { etapa: t(idioma, "objetivoEtapa." + perfil.objetivo) })}
                    </span>
                  </span>
                </label>
              )}

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <ModalBtn
                  variant="solid"
                  onClick={() => onCerrarCiclo({ aplicarKcal: aplicarKcalToggle, actualizarPeso: actualizarPesoToggle })}
                >
                  {t(idioma, "pesoView.cerrarCiclo")}
                </ModalBtn>
                <button
                  onClick={() => exportarSeguimiento(entradas, tendencia, t(idioma, "pesoView.cicloCerradoHoyTitulo"))}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
                  }}
                >
                  {t(idioma, "pesoView.exportarCierre")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                {t(idioma, "pesoView.sinPesadasSuficientes")}
              </p>
              <ModalBtn variant="solid" onClick={() => onCerrarCiclo({ aplicarKcal: false, actualizarPeso: false })}>{t(idioma, "pesoView.empezarSiguienteCiclo")}</ModalBtn>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", marginBottom: 16 }}>
          <Field label={yaRegistradoHoy ? t(idioma, "pesoView.corregirPesoHoy") : t(idioma, "pesoView.pesoDeHoy")}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" min={30} max={300} step="0.1" value={pesoInput}
                onChange={(e) => setPesoInput(e.target.value)}
                placeholder="kg" style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={intentarGuardar}
                style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 7, padding: "0 16px", fontSize: 13, fontWeight: 700, fontFamily: FUENTE_TEXTO, cursor: "pointer" }}
              >
                {t(idioma, "pesoView.guardar")}
              </button>
            </div>
          </Field>

          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
            {cicloInicioDate ? (
              t(idioma, "pesoView.cicloEnCurso", { n: entradas.length, total: totalEsperado, dias: Math.max(0, diasCiclo - diasTranscurridos) })
            ) : (
              t(idioma, "pesoView.primeraPesada", { n: pesoTracking.duracionSemanas })
            )}
          </div>

          {cicloInicioDate && (
            pausaActiva ? (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, background: "var(--mustard-soft)", borderRadius: 8, padding: "9px 11px", marginTop: 8 }}>
                <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--mustard-dark)", lineHeight: 1.5 }}>
                  {t(idioma, "pesoView.cicloPausadoDesde", {
                    fecha: formatFechaCorta(pausaActiva.inicio, idioma),
                    detalle: pausaActiva.motivo ? ` — "${pausaActiva.motivo}"` : "",
                  })}
                </div>
                <button
                  onClick={onReanudarCiclo}
                  style={{
                    fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700,
                    color: "var(--mustard-dark)", background: "#fff", border: "1px solid var(--mustard)",
                    borderRadius: 7, padding: "5px 10px", flexShrink: 0, cursor: "pointer",
                  }}
                >
                  {t(idioma, "pesoView.reanudar")}
                </button>
              </div>
            ) : pausando ? (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input
                  value={motivoPausa}
                  onChange={(e) => setMotivoPausa(e.target.value)}
                  placeholder={t(idioma, "pesoView.motivoPlaceholder")}
                  style={{ ...inputStyle, flex: "1 1 160px" }}
                />
                <ModalBtn variant="solid" onClick={confirmarPausa}>{t(idioma, "pesoView.pausarCiclo")}</ModalBtn>
                <ModalBtn variant="ghost" onClick={() => { setPausando(false); setMotivoPausa(""); }}>{t(idioma, "pesoView.cancelar")}</ModalBtn>
              </div>
            ) : (
              <button
                onClick={() => setPausando(true)}
                style={{
                  fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700,
                  color: "var(--ink-soft)", background: "none", border: "none", padding: 0,
                  marginTop: 6, cursor: "pointer",
                }}
              >
                {t(idioma, "pesoView.pausarCicloToggle")}
              </button>
            )
          )}

          {entradas.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {entradas.map((e) => (
                <span
                  key={e.id}
                  title={e.atipico ? t(idioma, "pesoView.marcadaAtipica", { detalle: e.motivo ? `: ${t(idioma, "motivo." + e.motivo)}` : "" }) : t(idioma, "pesoView.registrada")}
                  style={{
                    fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 20,
                    color: e.atipico ? "var(--mustard-dark)" : "var(--green-dark)",
                    background: e.atipico ? "var(--mustard-soft)" : "var(--green-soft)",
                  }}
                >
                  {formatFechaCorta(e.fecha, idioma)} {e.atipico ? "⚠" : "✓"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowConfig((v) => !v)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
          fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
        }}
      >
        {showConfig ? t(idioma, "pesoView.ocultarAjustes") : t(idioma, "pesoView.verAjustes")}
      </button>

      {showConfig && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 18px" }}>
          <Field label={t(idioma, "pesoView.vecesPorSemana")}>
            <div style={{ display: "flex", gap: 8 }}>
              {PESO_FRECUENCIAS.map((v) => (
                <button
                  key={v}
                  disabled={!!cicloInicioDate}
                  onClick={() => onUpdateConfig({ vecesSemana: v })}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)",
                    background: pesoTracking.vecesSemana === v ? "var(--green-dark)" : "#fff",
                    color: pesoTracking.vecesSemana === v ? "#fff" : "var(--ink)",
                    fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
                    cursor: cicloInicioDate ? "default" : "pointer", opacity: cicloInicioDate ? 0.6 : 1,
                  }}
                >
                  {v}x
                </button>
              ))}
            </div>
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>
              {t(idioma, "pesoView.diasSugeridos", {
                lista: (DIAS_SUGERIDOS_PESO[pesoTracking.vecesSemana] || [])
                  .map((d) => t(idioma, "dia." + DIA_CORTO_A_COMPLETO[DIAS_SEMANA_CORTO[d]]).slice(0, 3))
                  .join(", "),
              })}
            </div>
          </Field>
          <Field label={t(idioma, "pesoView.duracionCiclo")}>
            <div style={{ display: "flex", gap: 8 }}>
              {PESO_DURACIONES.map((v) => (
                <button
                  key={v}
                  disabled={!!cicloInicioDate}
                  onClick={() => onUpdateConfig({ duracionSemanas: v })}
                  style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)",
                    background: pesoTracking.duracionSemanas === v ? "var(--green-dark)" : "#fff",
                    color: pesoTracking.duracionSemanas === v ? "#fff" : "var(--ink)",
                    fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
                    cursor: cicloInicioDate ? "default" : "pointer", opacity: cicloInicioDate ? 0.6 : 1,
                  }}
                >
                  {t(idioma, "pesoView.semanaAbrev", { n: v })}
                </button>
              ))}
            </div>
          </Field>
          {cicloInicioDate && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)" }}>
              {t(idioma, "pesoView.noCambiarConCicloAbierto")}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowProgresion((v) => !v)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 10, marginBottom: 10,
          fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
        }}
      >
        {showProgresion ? t(idioma, "pesoView.ocultarProgresion") : t(idioma, "pesoView.verProgresion")}
      </button>

      {showProgresion && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 18px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {RANGOS_PROGRESION.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangoProgresion(r.key)}
                style={{
                  padding: "6px 12px", borderRadius: 20, border: "1px solid var(--line)",
                  background: rangoProgresion === r.key ? "var(--green-dark)" : "#fff",
                  color: rangoProgresion === r.key ? "#fff" : "var(--ink)",
                  fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
                }}
              >
                {t(idioma, "rango." + r.key)}
              </button>
            ))}
          </div>
          {historialFiltrado.length >= 2 ? (
            <>
              <PesoLineChart entradas={historialFiltrado} tendencia={null} idioma={idioma} />
              <button
                onClick={() => exportarSeguimiento(historialFiltrado, null, t(idioma, "rango." + rangoProgresion))}
                style={{
                  marginTop: 10, background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)",
                }}
              >
                {t(idioma, "pesoView.exportarRango")}
              </button>
            </>
          ) : (
            <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
              {historial.length === 0
                ? t(idioma, "pesoView.sinCiclosCerrados")
                : t(idioma, "pesoView.sinPesadasEnRango")}
            </p>
          )}
        </div>
      )}

      {printPayload && (
        <PrintSeguimiento entradas={printPayload.entradas} tendencia={printPayload.tendencia} titulo={printPayload.titulo} idioma={idioma} />
      )}
    </div>
  );
}
