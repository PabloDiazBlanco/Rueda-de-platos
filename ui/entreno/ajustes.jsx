// ---------- ui/entreno/ajustes.jsx ----------
// «Ajustes de entreno» (diseño, §4.9), una pantalla propia del área Entrenamiento para no mezclarla con
// los Ajustes generales. Cada gusto, un interruptor (principio 6): las reseñas muestran preferencias
// opuestas (precargar valores, columna de esfuerzo...), así que nada es obligatorio. Aquí también está la
// salvaguarda del usuario: exportar todos sus entrenos en CSV o JSON, gratis.
import React, { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { t } from "i18n";
import { sesionesACSV } from "entreno-almacen";
import { fechaLocal } from "entreno-calculo";
import { Field, inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { BotonSecundario, Chip, TextoSuave, TituloSeccion, nombreDe, reloj } from "./comun.jsx";

const DESCANSOS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300];

function Interruptor({ etiqueta, ayuda, activo, onCambio }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", cursor: "pointer", fontFamily: FUENTE_TEXTO }}>
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: 14.5 }}>{etiqueta}</span>
        {ayuda && <span style={{ display: "block", fontSize: 12, color: "var(--ink-soft)", marginTop: 2, lineHeight: 1.4 }}>{ayuda}</span>}
      </span>
      <input type="checkbox" role="switch" checked={!!activo} onChange={(e) => onCambio(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--green)", flexShrink: 0 }} />
    </label>
  );
}

function descargar(texto, nombre, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AjustesEntrenoView({ entreno, idioma, navegar }) {
  const a = entreno.ajustes;
  const cambiar = (cambios) => entreno.cambiarAjustes(cambios);
  const [estado, setEstado] = useState("");

  // Todas las sesiones: las de todos los meses del índice más las que aún esperan en la cola.
  async function todasLasSesiones() {
    const docs = await entreno.cargarTodosLosMeses();
    const sesiones = docs.flatMap((d) => d.sesiones || []);
    entreno.cola.forEach((s) => { if (!sesiones.some((x) => x.id === s.id)) sesiones.push(s); });
    return sesiones.sort((x, y) => new Date(x.inicio) - new Date(y.inicio));
  }

  async function exportar(formato) {
    setEstado(t(idioma, "entreno.ajustes.preparando"));
    try {
      const sesiones = await todasLasSesiones();
      const hoy = fechaLocal(Date.now());
      if (formato === "csv") {
        // BOM al principio para que Excel lea bien las tildes.
        descargar("﻿" + sesionesACSV(sesiones, (id) => nombreDe(entreno, id, idioma), idioma), `fooddraft-entrenos-${hoy}.csv`, "text/csv;charset=utf-8");
      } else {
        descargar(JSON.stringify({ exportado: new Date().toISOString(), catalogo: entreno.catalogo, sesiones }, null, 2), `fooddraft-entrenos-${hoy}.json`, "application/json");
      }
      setEstado(t(idioma, "entreno.ajustes.exportado", { n: sesiones.length }));
    } catch (e) {
      setEstado(t(idioma, "entreno.ajustes.errorExportar"));
    }
  }

  async function reconstruir() {
    setEstado(t(idioma, "entreno.ajustes.reconstruyendo"));
    try {
      await entreno.reconstruir();
      setEstado(t(idioma, "entreno.ajustes.reconstruido"));
    } catch (e) {
      setEstado(t(idioma, "entreno.ajustes.errorExportar"));
    }
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 21, color: "var(--green-dark)" }}>{t(idioma, "entreno.ajustes.titulo")}</h2>

      <TituloSeccion>{t(idioma, "entreno.ajustes.unidades")}</TituloSeccion>
      <Field label={t(idioma, "entreno.ajustes.peso")}>
        <div style={{ display: "flex", gap: 6 }}>
          {["kg", "lb"].map((u) => <Chip key={u} activo={a.unidadPeso === u} onClick={() => cambiar({ unidadPeso: u })}>{u}</Chip>)}
        </div>
      </Field>
      <Field label={t(idioma, "entreno.ajustes.distancia")}>
        <div style={{ display: "flex", gap: 6 }}>
          {["km", "mi"].map((u) => <Chip key={u} activo={a.unidadDistancia === u} onClick={() => cambiar({ unidadDistancia: u })}>{u}</Chip>)}
        </div>
      </Field>
      <TextoSuave style={{ fontSize: 12 }}>{t(idioma, "entreno.ajustes.unidadesAyuda")}</TextoSuave>

      <TituloSeccion>{t(idioma, "entreno.ajustes.registro")}</TituloSeccion>
      <Interruptor etiqueta={t(idioma, "entreno.ajustes.precargar")} ayuda={t(idioma, "entreno.ajustes.precargarAyuda")} activo={a.precargar} onCambio={(v) => cambiar({ precargar: v })} />
      <Interruptor etiqueta={t(idioma, "entreno.ajustes.esfuerzo")} ayuda={t(idioma, "entreno.ajustes.esfuerzoAyuda")} activo={a.mostrarEsfuerzo} onCambio={(v) => cambiar({ mostrarEsfuerzo: v })} />
      <Field label={t(idioma, "entreno.ajustes.inicioSemana")}>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Chip activo={a.inicioSemana === 1} onClick={() => cambiar({ inicioSemana: 1 })}>{t(idioma, "entreno.ajustes.lunes")}</Chip>
          <Chip activo={a.inicioSemana === 0} onClick={() => cambiar({ inicioSemana: 0 })}>{t(idioma, "entreno.ajustes.domingo")}</Chip>
        </div>
      </Field>

      <TituloSeccion>{t(idioma, "entreno.sesion.descanso")}</TituloSeccion>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t(idioma, "entreno.ajustes.descansoNormal")}>
          <select value={a.descansoSeg} onChange={(e) => cambiar({ descansoSeg: Number(e.target.value) })} style={{ ...inputStyle, minHeight: 44 }}>
            {DESCANSOS.map((d) => <option key={d} value={d}>{reloj(d)}</option>)}
          </select>
        </Field>
        <Field label={t(idioma, "entreno.ajustes.descansoCalentamiento")}>
          <select value={a.descansoCalentamientoSeg} onChange={(e) => cambiar({ descansoCalentamientoSeg: Number(e.target.value) })} style={{ ...inputStyle, minHeight: 44 }}>
            {DESCANSOS.map((d) => <option key={d} value={d}>{reloj(d)}</option>)}
          </select>
        </Field>
      </div>
      <Interruptor etiqueta={t(idioma, "entreno.ajustes.sonido")} activo={a.sonido} onCambio={(v) => cambiar({ sonido: v })} />
      <Interruptor etiqueta={t(idioma, "entreno.ajustes.vibracion")} ayuda={t(idioma, "entreno.ajustes.vibracionAyuda")} activo={a.vibracion} onCambio={(v) => cambiar({ vibracion: v })} />
      <TextoSuave style={{ fontSize: 12, marginTop: 8 }}>{t(idioma, "entreno.ajustes.avisoAbierta")}</TextoSuave>

      <TituloSeccion>{t(idioma, "entreno.ajustes.tusDatos")}</TituloSeccion>
      <TextoSuave style={{ marginBottom: 10 }}>{t(idioma, "entreno.ajustes.exportarAyuda")}</TextoSuave>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <BotonSecundario onClick={() => exportar("csv")}><Download size={14} /> {t(idioma, "entreno.ajustes.exportarCSV")}</BotonSecundario>
        <BotonSecundario onClick={() => exportar("json")}><Download size={14} /> {t(idioma, "entreno.ajustes.exportarJSON")}</BotonSecundario>
      </div>
      <div style={{ marginTop: 14 }}>
        <BotonSecundario onClick={reconstruir}><RefreshCw size={14} /> {t(idioma, "entreno.ajustes.reconstruir")}</BotonSecundario>
        <TextoSuave style={{ fontSize: 12, marginTop: 4 }}>{t(idioma, "entreno.ajustes.reconstruirAyuda")}</TextoSuave>
      </div>
      {estado && <div role="status"><TextoSuave style={{ marginTop: 12, color: "var(--green-dark)", fontWeight: 600 }}>{estado}</TextoSuave></div>}
    </div>
  );
}
