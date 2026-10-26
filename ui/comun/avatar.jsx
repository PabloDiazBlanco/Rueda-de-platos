// ---------- ui/comun/avatar.jsx ----------
// El avatar chibi de FitDraft (parte estética, 26-oct-2026; maqueta v3-03, estilo A): cabeza grande,
// camiseta verde, manos y zapatillas. Hay dos, mujer y hombre, que se distinguen solo por el pelo (coleta con
// goma mostaza o corto): los otros cuatro estilos de la maqueta se descartaron. Piel en un beis neutro, el
// mismo para los dos. Se elige en el asistente de alta y se cambia en Ajustes (`perfil.avatar`, con su parche
// en migrateData: por defecto, el del sexo del perfil).
//
// También el monitor del gimnasio, que está siempre en la oficina sentado en su silla (las piernas las tapa
// la mesa): gorra mostaza y silbato.
//
// Todo se dibuja con los pies en (0, 0), en unidades del plano del gimnasio (unas 40 de alto). Las piernas
// llevan `data-pierna` para que el mapa las mueva al andar sin pasar por React (ui/entreno/gimnasio.jsx).
import React from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";
import { TEMA_GIMNASIO } from "../entreno/gimnasio-tema.js";

// El avatar de un perfil: el elegido o, si no hay (un perfil que aún no ha pasado por migrateData), el de su
// sexo.
export function avatarDePerfil(perfil) {
  if (perfil && (perfil.avatar === "mujer" || perfil.avatar === "hombre")) return perfil.avatar;
  return perfil && perfil.sexo === "mujer" ? "mujer" : "hombre";
}

export function AvatarChibi({ genero = "mujer" }) {
  const C = TEMA_GIMNASIO;
  const mujer = genero === "mujer";
  return (
    <>
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#000" opacity="0.15" />
      <g data-pierna="a">
        <rect x="-5.6" y="-10" width="4.6" height="9" rx="2" fill={C.pantalon} />
        <rect x="-6.4" y="-2.6" width="6" height="3.4" rx="1.7" fill={C.crema} />
      </g>
      <g data-pierna="b">
        <rect x="1" y="-10" width="4.6" height="9" rx="2" fill={C.pantalon} />
        <rect x="0.4" y="-2.6" width="6" height="3.4" rx="1.7" fill={C.crema} />
      </g>
      <g data-cuerpo="">
        <rect x="-7.5" y="-22" width="15" height="14" rx="6" fill={C.cojin} />
        <rect x="-10.2" y="-20" width="4.2" height="10" rx="2.1" fill={C.cojin} />
        <rect x="6" y="-20" width="4.2" height="10" rx="2.1" fill={C.cojin} />
        <circle cx="-8.1" cy="-9.5" r="2.3" fill={C.piel} />
        <circle cx="8.1" cy="-9.5" r="2.3" fill={C.piel} />
        <path d="M-3.5,-22 Q0,-18.5 3.5,-22" stroke={C.menta} strokeWidth="1.4" fill="none" />
        <circle cx="0" cy="-30" r="8.6" fill={C.piel} />
        <circle cx="-3.1" cy="-29.4" r="1.15" fill={C.tinta} />
        <circle cx="3.1" cy="-29.4" r="1.15" fill={C.tinta} />
        <path d="M-2.2,-25.6 Q0,-24 2.2,-25.6" stroke={C.tinta} strokeWidth="1" fill="none" strokeLinecap="round" />
        <circle cx="-5.4" cy="-26.8" r="1.4" fill={C.mofletes} opacity="0.55" />
        <circle cx="5.4" cy="-26.8" r="1.4" fill={C.mofletes} opacity="0.55" />
        {mujer ? (
          <>
            <path d="M-8.8,-30 Q-9.6,-39.6 0,-39.8 Q9.6,-39.6 8.8,-30 Q8,-35 3,-35.2 Q-1,-33.2 -5,-35 Q-8,-34 -8.8,-30 Z" fill={C.pelo} />
            <path d="M7.4,-35 Q15,-34 13.4,-25 Q12.4,-21 9.6,-22.6 Q11.4,-28 7.6,-30.6 Z" fill={C.pelo} />
            <rect x="6.6" y="-35.4" width="3" height="4" rx="1.4" fill={C.mostaza} />
          </>
        ) : (
          <path d="M-8.8,-30.5 Q-9.4,-39.6 0,-39.8 Q9.4,-39.6 8.8,-30.5 Q7,-34.8 1,-34.6 Q-5,-34.8 -8.8,-30.5 Z" fill={C.pelo} />
        )}
      </g>
    </>
  );
}

// El monitor, sentado. Con `saluda`, el brazo levantado (el mapa lo mueve un poco al hablar).
export function Monitor({ saluda = false }) {
  const C = TEMA_GIMNASIO;
  return (
    <>
      <rect x="-7.5" y="-22" width="15" height="14" rx="6" fill={C.cojinOsc} />
      <rect x="-10.2" y="-20" width="4.2" height="10" rx="2.1" fill={C.cojinOsc} />
      <circle cx="-8.1" cy="-9.5" r="2.3" fill={C.piel} />
      {saluda ? (
        // El brazo se mueve con la animación fdSaluda (ui/entreno/gimnasio-dibujo.jsx); el mapa solo lo
        // levanta si no hay que reducir el movimiento.
        <g data-saluda="" style={{ transformBox: "fill-box", transformOrigin: "30% 100%", animation: "fdSaluda 0.4s ease-in-out 6 alternate" }}>
          <rect x="7" y="-32" width="4.4" height="14" rx="2.2" fill={C.cojinOsc} />
          <circle cx="9.2" cy="-33" r="2.4" fill={C.piel} />
        </g>
      ) : (
        <>
          <rect x="6" y="-20" width="4.2" height="10" rx="2.1" fill={C.cojinOsc} />
          <circle cx="8.1" cy="-9.5" r="2.3" fill={C.piel} />
        </>
      )}
      <line x1="0" y1="-21" x2="2" y2="-14" stroke={C.mostaza} strokeWidth="0.8" />
      <circle cx="2.3" cy="-13.4" r="1.6" fill={C.metal} />
      <circle cx="0" cy="-30" r="8.6" fill={C.piel} />
      <circle cx="-3.1" cy="-29.4" r="1.15" fill={C.tinta} />
      <circle cx="3.1" cy="-29.4" r="1.15" fill={C.tinta} />
      <path d="M-2.4,-25.8 Q0,-23.6 2.4,-25.8" stroke={C.tinta} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M-9.2,-31 Q-9,-40.5 0,-40.5 Q9,-40.5 9.2,-31 Z" fill={C.mostaza} />
      <rect x="-1" y="-40.5" width="2" height="2" rx="1" fill={C.mostaza} />
      <path d="M2,-31.4 Q10,-32 14,-29.6 Q9,-28.6 2,-29.6 Z" fill={C.mostazaOsc} />
    </>
  );
}

// Elegir avatar (asistente de alta y Ajustes): los dos, uno al lado del otro, con su nombre debajo.
export function ElegirAvatar({ valor, onCambio, idioma }) {
  return (
    <div role="radiogroup" aria-label={t(idioma, "fitdraft.avatar.titulo")} style={{ display: "flex", gap: 10 }}>
      {["mujer", "hombre"].map((g) => {
        const activo = valor === g;
        return (
          <button
            key={g}
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(g)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 6px 8px",
              borderRadius: 12, cursor: "pointer", border: `2px solid ${activo ? "var(--green)" : "var(--line)"}`,
              background: activo ? "var(--green-soft)" : "var(--card)",
            }}
          >
            <svg viewBox="-16 -44 32 48" width="58" height="87" aria-hidden="true">
              <AvatarChibi genero={g} />
            </svg>
            <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: activo ? 700 : 500, color: activo ? "var(--green-dark)" : "var(--ink)" }}>
              {t(idioma, "fitdraft.avatar." + g)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
