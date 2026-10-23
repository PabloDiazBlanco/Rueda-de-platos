// ---------- ui/entreno/inicio.jsx ----------
// «Entrenar»: la pantalla de inicio del área de entreno (diseño, §4.1). Empezar un entreno vacío o desde
// una rutina (un toque), seguir uno que quedó a medias y ver los últimos entrenos del mes. Sin avisos de
// pago ni «novedades»: nada se interpone entre abrir la app y empezar a entrenar (principio 3).
import React, { useState } from "react";
import { Plus, ChevronRight, CloudOff, Play, Settings } from "lucide-react";
import { t } from "i18n";
import { resumenSesion } from "entreno-calculo";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import {
  Tarjeta, BotonPrincipal, BotonSecundario, BotonTexto, TituloSeccion, TextoSuave, duracionTexto, fechaCorta,
  textoPeso,
} from "./comun.jsx";

export function EntrenarView({ entreno, idioma, navegar, aviso }) {
  const [confirmar, setConfirmar] = useState(null); // null | { tipo: "descartar" } | { tipo: "reemplazar", rutina }
  const { borrador, catalogo } = entreno;
  const rutinas = (catalogo && catalogo.rutinas) || [];
  const recientes = entreno.sesionesDeMes(entreno.mesActual()).slice(0, 6);

  function empezar(rutina = null) {
    if (borrador) setConfirmar({ tipo: "reemplazar", rutina });
    else entreno.empezar(rutina);
  }

  return (
    <div>
      {aviso}

      {borrador && (
        <Tarjeta style={{ background: "var(--mustard-soft)", borderColor: "var(--mustard)", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{t(idioma, "entreno.inicio.enCurso")}</div>
          <TextoSuave>
            {[borrador.nombre, t(idioma, "entreno.inicio.haceMin", { n: Math.max(0, Math.round((Date.now() - new Date(borrador.inicio)) / 60000)) })].filter(Boolean).join(" · ")}
          </TextoSuave>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <BotonPrincipal onClick={entreno.mostrarSesion} style={{ flex: 1, minHeight: 44, fontSize: 14 }}>
              <Play size={16} /> {t(idioma, "entreno.inicio.continuar")}
            </BotonPrincipal>
            <BotonSecundario peligro onClick={() => setConfirmar({ tipo: "descartar" })}>{t(idioma, "entreno.inicio.descartar")}</BotonSecundario>
          </div>
        </Tarjeta>
      )}

      <BotonPrincipal onClick={() => empezar(null)}>
        <Plus size={18} /> {t(idioma, "entreno.inicio.empezarVacio")}
      </BotonPrincipal>

      <TituloSeccion accion={rutinas.length > 0 && <BotonTexto onClick={() => navegar("entreno-rutinas")}>{t(idioma, "entreno.inicio.verTodas")}</BotonTexto>}>
        {t(idioma, "entreno.inicio.rutinas")}
      </TituloSeccion>
      {rutinas.length ? (
        // Las rutinas, en fila desplazable: tocar una empieza el entreno con ella (dos toques en total).
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, margin: "0 -2px" }}>
          {rutinas.map((r) => (
            <button
              key={r.id}
              onClick={() => empezar(r)}
              aria-label={t(idioma, "entreno.inicio.empezarRutina", { nombre: r.nombre })}
              style={{
                flex: "0 0 auto", minWidth: 130, maxWidth: 180, textAlign: "left", cursor: "pointer",
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px",
              }}
            >
              <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 16, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre}</div>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginTop: 3 }}>
                {t(idioma, r.ejercicios.length === 1 ? "entreno.comun.ejercicio1" : "entreno.comun.ejercicios", { n: r.ejercicios.length })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green)" }}>
                <Play size={12} /> {t(idioma, "entreno.inicio.empezar")}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Tarjeta onClick={() => navegar("entreno-rutina", { id: null })} style={{ borderStyle: "dashed", textAlign: "center", color: "var(--ink-soft)" }}>
          <div style={{ fontSize: 13 }}>{t(idioma, "entreno.inicio.sinRutinas")}</div>
          <div style={{ marginTop: 6, fontWeight: 700, color: "var(--green-dark)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Plus size={14} /> {t(idioma, "entreno.inicio.crearRutina")}
          </div>
        </Tarjeta>
      )}

      <TituloSeccion accion={recientes.length > 0 && <BotonTexto onClick={() => navegar("entreno-historial")}>{t(idioma, "entreno.inicio.verTodas")}</BotonTexto>}>
        {t(idioma, "entreno.inicio.ultimos")}
      </TituloSeccion>
      {entreno.cola.length > 0 && (
        <TextoSuave style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <CloudOff size={14} /> {t(idioma, "entreno.inicio.pendientes", { n: entreno.cola.length })}
        </TextoSuave>
      )}
      {recientes.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recientes.map((s) => <FilaSesion key={s.id} sesion={s} entreno={entreno} idioma={idioma} onClick={() => navegar("entreno-sesion", { id: s.id, inicio: s.inicio })} />)}
        </div>
      ) : (
        <TextoSuave>{t(idioma, "entreno.inicio.sinEntrenos")}</TextoSuave>
      )}

      <div style={{ marginTop: 24 }}>
        <BotonTexto onClick={() => navegar("entreno-ajustes")} color="var(--ink-soft)">
          <Settings size={14} /> {t(idioma, "entreno.ajustes.titulo")}
        </BotonTexto>
      </div>

      {confirmar && (
        <ModalShell
          title={t(idioma, confirmar.tipo === "descartar" ? "entreno.inicio.descartarTitulo" : "entreno.inicio.reemplazarTitulo")}
          onClose={() => setConfirmar(null)}
        >
          <TextoSuave style={{ marginBottom: 16 }}>
            {t(idioma, confirmar.tipo === "descartar" ? "entreno.inicio.descartarTexto" : "entreno.inicio.reemplazarTexto")}
          </TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setConfirmar(null)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn
              variant="danger"
              onClick={() => {
                entreno.descartar();
                if (confirmar.tipo === "reemplazar") entreno.empezar(confirmar.rutina);
                setConfirmar(null);
              }}
            >
              {t(idioma, confirmar.tipo === "descartar" ? "entreno.inicio.descartar" : "entreno.inicio.reemplazar")}
            </ModalBtn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Una sesión en una lista: «Torso · hoy · 52 min · 6.420 kg ›».
export function FilaSesion({ sesion, entreno, idioma, onClick, extra }) {
  const r = resumenSesion(sesion, entreno.ejercicioDe, entreno.pesoCorporal);
  const pendiente = entreno.cola.some((s) => s.id === sesion.id);
  return (
    <Tarjeta onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sesion.nombre || t(idioma, "entreno.comun.sinNombre")}
          {extra}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>
          {[fechaCorta(sesion.inicio, idioma), duracionTexto(r.duracionSeg, idioma), r.volumen > 0 ? textoPeso(r.volumen, entreno.ajustes, idioma) : t(idioma, "entreno.comun.nSeries", { n: r.series })].join(" · ")}
          {pendiente && <span title={t(idioma, "entreno.comun.pendiente")}> · <CloudOff size={11} style={{ verticalAlign: "-1px" }} /></span>}
        </div>
      </div>
      {onClick && <ChevronRight size={16} color="var(--ink-soft)" />}
    </Tarjeta>
  );
}
