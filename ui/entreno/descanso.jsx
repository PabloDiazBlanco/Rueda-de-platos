// ---------- ui/entreno/descanso.jsx ----------
// La barra del descanso entre series (abajo, fija, solo mientras corre): −15 · mm:ss · +15 · Saltar,
// con una línea de progreso. El tiempo sale de la marca `descanso.hasta` (no de una cuenta atrás): si el
// móvil se bloquea, el navegador para los temporizadores, pero al volver la cuenta sigue siendo exacta.
//
// Al llegar a cero, una sola vez: un pitido corto con Web Audio (sin archivos de sonido) y una vibración
// donde exista (no en iPhone: Safari no la tiene). Con la app cerrada no puede sonar nada — una web no
// puede programar avisos locales — y así se dice en Ajustes de entreno (diseño, §5.5).
import React, { useState, useEffect } from "react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_MONO } from "../estilos.js";
import { reloj } from "./comun.jsx";

// El contexto de audio se crea con el primer toque dentro de la sesión: los navegadores no dejan sonar
// nada hasta que el usuario ha tocado la página.
let contextoAudio = null;
export function prepararAudio() {
  if (contextoAudio) {
    if (contextoAudio.state === "suspended") contextoAudio.resume().catch(() => {});
    return;
  }
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (Contexto) contextoAudio = new Contexto();
  } catch (e) {
    contextoAudio = null;
  }
}

function pitido() {
  if (!contextoAudio) return;
  try {
    const ahora = contextoAudio.currentTime;
    [0, 0.22].forEach((retraso) => {
      const osc = contextoAudio.createOscillator();
      const vol = contextoAudio.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.0001, ahora + retraso);
      vol.gain.exponentialRampToValueAtTime(0.3, ahora + retraso + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, ahora + retraso + 0.16);
      osc.connect(vol).connect(contextoAudio.destination);
      osc.start(ahora + retraso);
      osc.stop(ahora + retraso + 0.18);
    });
  } catch (e) {
    // sin sonido no pasa nada: el descanso se ve en pantalla igualmente
  }
}

export function avisarFinDescanso(ajustes) {
  if (ajustes.sonido) pitido();
  if (ajustes.vibracion && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate([200, 100, 200]); } catch (e) { /* no disponible */ }
  }
}

// Si se vuelve a la app mucho después de acabar el descanso, no tiene sentido pitar: se cierra en silencio.
const MARGEN_AVISO_MS = 3000;

export function BarraDescanso({ descanso, ajustes, idioma, onAjustar, onSaltar, onTerminado }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const restante = Math.max(0, descanso.hasta - ahora);
  const total = Math.max(1, descanso.hasta - descanso.inicio);

  useEffect(() => {
    if (restante > 0) return;
    if (!descanso.avisado && ahora - descanso.hasta < MARGEN_AVISO_MS) avisarFinDescanso(ajustes);
    onTerminado();
  }, [restante <= 0]);

  const boton = {
    minWidth: 52, height: 44, borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer",
    fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)",
  };
  return (
    <div role="timer" aria-label={t(idioma, "entreno.sesion.descansoRestante", { t: reloj(restante / 1000) })} style={{ borderTop: "1px solid var(--line)", background: "var(--card)" }}>
      <div style={{ height: 3, background: "var(--green-soft)" }}>
        <div style={{ height: 3, width: `${(restante / total) * 100}%`, background: "var(--green)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px calc(8px + env(safe-area-inset-bottom))", maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => onAjustar(-15)} aria-label={t(idioma, "entreno.sesion.menos15")} style={boton}>−15</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--ink-soft)" }}>{t(idioma, "entreno.sesion.descanso")}</div>
          <div style={{ fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 700, color: "var(--green-dark)" }}>{reloj(restante / 1000)}</div>
        </div>
        <button onClick={() => onAjustar(15)} aria-label={t(idioma, "entreno.sesion.mas15")} style={boton}>+15</button>
        <button onClick={onSaltar} style={{ ...boton, background: "var(--green)", color: "#fff", border: "none", padding: "0 14px" }}>{t(idioma, "entreno.sesion.saltar")}</button>
      </div>
    </div>
  );
}
