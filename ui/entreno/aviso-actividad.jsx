// ---------- ui/entreno/aviso-actividad.jsx ----------
// Aviso de actividad (fase K3; diseño, §8.1): si durante las 3 últimas semanas completas lo registrado
// queda muy por debajo (o muy por encima) de lo declarado en el perfil, una tarjeta lo dice sin culpa y
// ofrece tres salidas: ajustar la actividad, decir que se está de pausa o no avisar durante unas semanas.
// Se ve en «Entrenar» y arriba de «Actividad diaria». Sin push y sin cambiar nada solo: la regla está en
// evaluarAvisoActividad (logica/informes.js), con sus casos en validacion/.
import React, { useEffect } from "react";
import { X, PauseCircle } from "lucide-react";
import { t } from "i18n";
import { sesionesPorSemana, evaluarAvisoActividad, declaradoPorSemana } from "informes";
import { sumarDias, fechaLocal } from "entreno-calculo";
import { FUENTE_TEXTO } from "../estilos.js";
import { BotonTexto, formatoNumero, fechaDia } from "./comun.jsx";

// Cuántos días se silencia el aviso con «No avisar durante unas semanas».
const DIAS_SILENCIO = 28;

export function AvisoActividad({ entreno, data, idioma, navegar, enActividad = false }) {
  const hoy = fechaLocal(Date.now());
  const mesHoy = hoy.slice(0, 7);
  // Las 3 semanas anteriores pueden caer en el mes pasado: se leen los dos.
  const mesAntes = sumarDias(hoy, -28).slice(0, 7);
  useEffect(() => {
    entreno.cargarMes(mesHoy).catch(() => {});
    if (mesAntes !== mesHoy) entreno.cargarMes(mesAntes).catch(() => {});
  }, []);

  if (!entreno.catalogo) return null;
  const aviso = entreno.catalogo.aviso || {};
  const pausa = aviso.pausa && !aviso.pausa.hasta ? aviso.pausa : null;

  // De pausa: una línea para terminarla (la pausa abierta ya impide el aviso).
  if (pausa) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--line)", fontFamily: FUENTE_TEXTO, fontSize: 13 }}>
        <PauseCircle size={16} color="var(--mustard-dark)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{t(idioma, "entreno.aviso.dePausa", { fecha: fechaDia(pausa.desde + "T12:00:00", idioma) })}</span>
        <BotonTexto onClick={() => entreno.cambiarAviso({ pausa: { ...pausa, hasta: hoy } })}>{t(idioma, "entreno.aviso.terminarPausa")}</BotonTexto>
      </div>
    );
  }

  const sesiones = [...entreno.sesionesDeMes(mesAntes), ...(mesAntes !== mesHoy ? entreno.sesionesDeMes(mesHoy) : [])];
  const totalRegistradas = Object.values(entreno.indice.meses || {}).reduce((x, n) => x + n, 0) + entreno.cola.length;
  const declarado = declaradoPorSemana(data && data.perfil);
  const semanas = sesionesPorSemana(sesiones, entreno.ejercicioDe, entreno.ajustes.inicioSemana, hoy, 3);
  const resultado = evaluarAvisoActividad({ declaradoSemana: declarado, semanas, totalRegistradas, hoy, aviso });
  if (!resultado) return null;

  const texto = t(idioma, resultado.tipo === "menos" ? "entreno.aviso.textoMenos" : "entreno.aviso.textoMas", {
    n: formatoNumero(resultado.media, idioma), d: resultado.declarado,
  });
  return (
    <div role="status" style={{ position: "relative", marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "var(--mustard-soft)", border: "1px solid var(--mustard)", fontFamily: FUENTE_TEXTO }}>
      <button
        onClick={() => entreno.cambiarAviso({ descartadoEl: hoy })}
        aria-label={t(idioma, "entreno.aviso.cerrar")}
        style={{ position: "absolute", top: 4, right: 4, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}
      >
        <X size={16} />
      </button>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, paddingRight: 28 }}>{texto}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", marginTop: 6 }}>
        {!enActividad && <BotonTexto onClick={() => navegar("actividad-diaria")}>{t(idioma, "entreno.aviso.ajustar")}</BotonTexto>}
        <BotonTexto onClick={() => entreno.cambiarAviso({ pausa: { desde: hoy, hasta: null } })}>{t(idioma, "entreno.aviso.pausa")}</BotonTexto>
        <BotonTexto onClick={() => entreno.cambiarAviso({ silenciadoHasta: sumarDias(hoy, DIAS_SILENCIO) })}>{t(idioma, "entreno.aviso.silenciar")}</BotonTexto>
      </div>
    </div>
  );
}
