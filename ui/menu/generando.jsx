// ---------- ui/menu/generando.jsx ----------
// Lo que se ve mientras «se genera» el menú (C11, 25-oct-2026). Generar es instantáneo, pero el usuario
// pidió que no lo pareciera: un menú que aparece de golpe se siente como un sorteo sin pensar, y unos
// segundos de espera con algo que mirar dan la sensación de que la app está trabajando para él. La
// espera (entre 3 y 6 s, al azar) la lleva useMenu (ui/estado/menu.js); aquí solo se pinta, igual en el
// Menú completo y en el Menú simple.
//
// LA CADENA DE TUPPERS (Bloque MENÚ de la parte estética, 26-oct-2026; opción A de
// local/ideas/esteticas/01-animacion-menu.html, elegida «sin cambios»): siete tuppers en la encimera de la
// cocina retro de la despensa, uno por día con su nombre en la tapa; un cucharón los recorre de izquierda a
// derecha, en cada uno caen el hidrato, la proteína y la verdura, y se cierra la tapa con un pequeño rebote.
// Es literal —«preparar la semana»— y enlaza con la despensa (la misma encimera y los mismos azulejos: los
// colores salen del tema de la nevera, ui/despensa/tema.js, que solo se importa). Debajo, una frase de cocina
// que cambia a lo largo de la espera (se reparten a partes iguales), los segundos que faltan y una barra fina.
//
// Todo el reparto en el tiempo va en fracciones de la duración (`--t`): el tupper i empieza a llenarse en
// 0,04 + 0,1·i y se cierra 0,085 después, así que la escena dura lo que dure la espera, sea de 3 o de 6 s. Las
// caídas y las tapas son animaciones CSS (con un desfase negativo si el componente se monta un poco después
// de pedir el menú, para que vayan con el reloj de useMenu); el cucharón lo mueve JS en cada fotograma.
//
// Recibe `generando` ({ inicio, duracion } en ms) y el idioma, y nada más. Con «reducir movimiento» no llega a
// pintarse: useMenu genera al momento.
import React, { useState, useEffect, useRef } from "react";
import { DAYS } from "comun";
import { t } from "i18n";
import { temaNevera } from "../despensa/tema.js";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Colores de la ilustración (como los de la comida dibujada de la despensa, no variables de tema).
const TAPAS = ["#7fb24f", "#e9b64a", "#6aa6d9"];
const TUPPER = { cuerpo: "#eef7fa", borde: "#a9cbd8", ventana: "#dff0f6", cortina: "#e8a7a0" };
const COMIDA = {
  pollo: "#d99a5b", polloRaya: "#b5733a",
  arroz: "#f4efe2", arrozGrano: "#e2dccb",
  brocoliTallo: "#8cc06a", brocoli: "#4f9a4f", brocoliClaro: "#5aa35a",
};
const N_FRASES = 4;
const TUPPER_X = (i) => 13 + i * 46;
const INICIO_TUPPER = (i) => 0.04 + i * 0.1;

// Las tres piezas de comida, con su origen en el centro (las mismas que la maqueta).
function Arroz({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-9,4 Q0,-10 9,4 Z" fill={COMIDA.arroz} stroke={COMIDA.arrozGrano} strokeWidth="0.8" />
      <circle cx="-3" cy="0" r="0.9" fill={COMIDA.arrozGrano} /><circle cx="2" cy="-2" r="0.9" fill={COMIDA.arrozGrano} /><circle cx="4" cy="2" r="0.9" fill={COMIDA.arrozGrano} />
    </g>
  );
}
function Pollo({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse rx="8" ry="5" fill={COMIDA.pollo} />
      <path d="M-5,-1 L-1,-3 M-3,2 L2,-1 M1,3 L5,0" stroke={COMIDA.polloRaya} strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}
function Brocoli({ x, y }) {
  return (
    <g transform={`translate(${x},${y}) scale(0.9)`}>
      <rect x="-1.5" y="0" width="3" height="5" rx="1" fill={COMIDA.brocoliTallo} />
      <circle cx="-3.5" cy="-1" r="3.4" fill={COMIDA.brocoli} /><circle cx="3.5" cy="-1" r="3.4" fill={COMIDA.brocoli} />
      <circle cx="0" cy="-3.5" r="3.6" fill={COMIDA.brocoliClaro} />
    </g>
  );
}

export function GenerandoMenu({ generando, idioma }) {
  const tema = temaNevera();
  const [ahora, setAhora] = useState(Date.now());
  const cucharon = useRef(null);
  // Cuánto llevaba ya la espera al montarse: las animaciones CSS se adelantan eso para ir con el reloj.
  const desfase = useRef(Math.max(0, Date.now() - generando.inicio) / 1000);

  // Frase, segundos y barra: basta con repintar unas pocas veces por segundo.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // El cucharón, en cada fotograma: va de tupper en tupper mientras se llenan, con un balanceo que lo
  // inclina al servir y un pequeño salto entre uno y otro, y se va cuando se cierra el último.
  useEffect(() => {
    let id = 0;
    function paso() {
      const el = cucharon.current;
      if (el) {
        const p = (Date.now() - generando.inicio) / generando.duracion;
        if (p >= 0.82) {
          el.setAttribute("opacity", "0");
        } else {
          const pos = Math.max(0, Math.min(6, (p - 0.04) / 0.1));
          const x = TUPPER_X(0) + 20 + pos * 46;
          const y = 96 - Math.abs(Math.sin(pos * Math.PI)) * 6;
          el.setAttribute("opacity", "1");
          el.setAttribute("transform", `translate(${x},${y}) rotate(${Math.sin(pos * Math.PI * 2) * 10})`);
        }
      }
      id = requestAnimationFrame(paso);
    }
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [generando.inicio, generando.duracion]);

  const transcurrido = Math.max(0, ahora - generando.inicio);
  const progreso = Math.min(1, transcurrido / generando.duracion);
  const restantes = Math.max(0, Math.ceil((generando.duracion - transcurrido) / 1000));
  const frase = t(idioma, "menu.generando.frase" + (Math.min(N_FRASES - 1, Math.floor(progreso * N_FRASES)) + 1));
  const vars = { "--t": `${generando.duracion / 1000}s`, "--desfase": `${desfase.current}s` };

  return (
    <div
      role="status"
      style={{ position: "relative", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}
    >
      <style>{`
        .tup-cae, .tup-tapa { transform-box: fill-box; transform-origin: center; opacity: 0; }
        .tup-cae { animation: tupCaer calc(var(--t) * 0.07) cubic-bezier(.3,1.5,.6,1) calc(var(--t) * var(--a) - var(--desfase)) both; }
        .tup-tapa { animation: tupTapar calc(var(--t) * 0.08) cubic-bezier(.3,1.4,.6,1) calc(var(--t) * var(--a) - var(--desfase)) both; }
        @keyframes tupCaer { from { transform: translateY(-38px) rotate(-20deg); opacity: 0; } 25% { opacity: 1; } to { transform: none; opacity: 1; } }
        @keyframes tupTapar { from { transform: translateY(-34px) rotate(-12deg); opacity: 0; } 30% { opacity: 1; } to { transform: none; opacity: 1; } }
      `}</style>
      {/* Para los lectores de pantalla, una sola frase; lo que cambia cada segundo va oculto. */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        {t(idioma, "generando.titulo")}
      </span>

      <svg viewBox="0 0 340 210" width="100%" style={{ display: "block", ...vars }} aria-hidden="true">
        <defs>
          <pattern id="tup-azulejos" width="18" height="13.6" patternUnits="userSpaceOnUse">
            <rect width="18" height="13.6" fill={tema.azulejo} />
            <rect width="18" height="1.2" fill={tema.juntas} />
            <rect width="1.2" height="13.6" fill={tema.juntas} />
          </pattern>
        </defs>
        {/* la pared, los azulejos, la encimera y los muebles de debajo (sin nada que tocar) */}
        <rect width="340" height="210" fill={tema.pared} />
        <rect y="58" width="340" height="88" fill="url(#tup-azulejos)" />
        <rect y="146" width="340" height="14" fill={tema.encimera} />
        <rect y="146" width="340" height="2" fill="#fff" opacity="0.5" />
        <rect y="160" width="340" height="7" fill={tema.encimeraCanto} />
        <rect y="167" width="340" height="43" fill={tema.mueble} />
        {[8, 118, 228].map((x) => (
          <g key={x}>
            <rect x={x} y="174" width="104" height="40" rx="6" fill="none" stroke={tema.muebleOscuro} strokeWidth="2" />
            <rect x={x + 88} y="180" width="10" height="4" rx="2" fill={tema.metalClaro} />
          </g>
        ))}
        {/* la ventana con su cortinilla, para que la pared no quede vacía */}
        <rect x="128" y="8" width="84" height="42" rx="6" fill={TUPPER.ventana} stroke={tema.madera} strokeWidth="4" />
        <path d="M128,12 Q150,24 170,12 Q190,24 212,12 L212,8 L128,8 Z" fill={TUPPER.cortina} />
        <rect x="168" y="10" width="3" height="40" fill={tema.madera} />

        {/* los siete tuppers, uno por día */}
        {DAYS.map((dia, i) => {
          const a = INICIO_TUPPER(i);
          const tapa = TAPAS[i % TAPAS.length];
          return (
            <g key={dia} transform={`translate(${TUPPER_X(i)},120)`}>
              <ellipse cx="20" cy="27" rx="19" ry="2.5" fill="#000" opacity="0.08" />
              <path d="M2,0 L38,0 L36,24 Q36,26 34,26 L6,26 Q4,26 4,24 Z" fill={TUPPER.cuerpo} stroke={TUPPER.borde} strokeWidth="1.2" />
              <g className="tup-cae" style={{ "--a": a }}><Arroz x={12} y={19} /></g>
              <g className="tup-cae" style={{ "--a": a + 0.025 }}><Pollo x={28} y={19} /></g>
              <g className="tup-cae" style={{ "--a": a + 0.05 }}><Brocoli x={20} y={13} /></g>
              <rect x="6" y="4" width="3" height="17" rx="1.5" fill="#fff" opacity="0.65" />
              <g className="tup-tapa" style={{ "--a": a + 0.085 }}>
                <rect x="-1" y="-6" width="42" height="7" rx="3" fill={tapa} />
                <rect x="15" y="-8.5" width="10" height="3" rx="1.5" fill={tapa} />
                <text x="20" y="-0.6" fontSize="5.6" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily={FUENTE_TEXTO}>
                  {t(idioma, "menu.diaCorto." + dia)}
                </text>
              </g>
            </g>
          );
        })}

        {/* el cucharón (lo mueve el efecto de arriba) */}
        <g ref={cucharon} transform="translate(33,92)" opacity="0">
          <path d="M0,0 L22,-34" stroke={tema.metal} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M-9,-2 Q0,12 9,-2 Z" fill={tema.metalClaro} stroke={tema.metal} strokeWidth="1.2" />
        </g>
      </svg>

      {/* El temporizador: una barra fina y, debajo, la frase y los segundos que faltan. */}
      <div aria-hidden="true">
        <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden", margin: "0 14px" }}>
          <div style={{ height: 4, width: `${progreso * 100}%`, background: "var(--green)", borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 10px", minHeight: 40 }}>
          <span style={{ flex: 1, fontFamily: FUENTE_TITULOS, fontSize: 14.5, fontStyle: "italic", color: "var(--green-dark)" }}>{frase}</span>
          <span
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", background: "var(--paper)",
              borderRadius: 20, padding: "3px 9px", fontVariantNumeric: "tabular-nums",
            }}
          >
            {t(idioma, "menu.generando.segundos", { n: restantes })}
          </span>
        </div>
      </div>
    </div>
  );
}
