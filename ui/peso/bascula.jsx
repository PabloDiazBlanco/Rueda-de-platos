// ---------- ui/peso/bascula.jsx ----------
// La báscula del registro de peso (26-oct-2026; maqueta local/ideas/esteticas/v3-08-bascula.html, opción A):
// una báscula rectangular vista desde arriba, con un pie y luego el otro subiéndose, y en el borde de
// delante una ventana horizontal donde **una cinta de rayas corre bajo una línea roja fija**, con una lupa
// encima en la que se escribe el peso (es el campo de verdad: teclado numérico y coma decimal). Al escribir,
// la cinta se va a ese número con un pequeño rebote, como un muelle. La ventana es algo menos de un tercio
// más estrecha que en la maqueta (decisión del 26-oct; el cuerpo de la báscula no cambia).
//
// Al abrir, la animación de subirse (1,3 s; se salta tocando la báscula). Sin nada escrito, la cinta
// descansa en el peso del perfil: es el que ya se ve en Perfil, no el pesaje del día, así que no rompe la
// regla de no enseñar cifras mientras el ciclo está abierto (ui/peso/seguimiento.jsx). Con «reducir
// movimiento», los pies ya están encima y la cinta salta al número sin rebote. Solo dibujo: guardar sigue
// siendo el botón de siempre.
import React, { useState, useEffect, useRef } from "react";
import { t } from "i18n";
import { prefiereMenosMovimiento } from "../entreno/comun.jsx";

const KG_MIN = 40, KG_MAX = 140;
const SERIF = "Georgia, serif";
const SANS = "Helvetica Neue, Arial, sans-serif";
// La ventana (unidades del dibujo de 300 × 360): 112 de ancho frente a los 156 de la maqueta.
const V = { x: 94, y: 48, w: 112, h: 40, cx: 150, ancho: 140, PX: 10 };
// La lupa donde se escribe: un poco más grande que en la maqueta para que quepa un texto de 16 px (con
// menos, el iPhone hace zoom al tocar el campo).
const LUPA = { r: 23, cy: V.y - 18 };

export const kgDeTexto = (v) => {
  const k = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(k) && k > 0 ? Math.max(KG_MIN, Math.min(KG_MAX, k)) : null;
};

function Pierna({ cx, lado }) {
  const f = (x) => cx + x * lado;
  return (
    <>
      <path d={`M${f(-13)},256 Q${f(-19)},232 ${f(-19)},210 Q${f(-19)},188 ${f(-9)},180 Q${f(2)},173 ${f(12)},176 Q${f(20)},180 ${f(20)},196 Q${f(21)},218 ${f(15)},240 Q${f(12)},254 ${f(10)},258 Z`} fill="#fffdf7" stroke="#d9d3c3" strokeWidth={1.5} />
      <path d={`M${f(-11)},186 Q${f(-7)},180 ${f(-2)},180 M${f(1)},179 Q${f(6)},176 ${f(10)},178 M${f(12)},179 Q${f(16)},180 ${f(18)},185`} stroke="#d9d3c3" strokeWidth={1.1} fill="none" />
      <path d={`M${f(-15)},232 L${f(15)},232 L${f(16)},244 L${f(-16)},244 Z`} fill="#fffdf7" stroke="#d9d3c3" strokeWidth={1} />
      <rect x={cx - 16} y={236} width={32} height={4} fill="#d9a441" />
      <path d={`M${f(-18)},242 L${f(18)},242 L${f(34)},362 L${f(-36)},362 Z`} fill="#2c4a3e" />
      <path d={`M${f(10)},242 L${f(18)},242 L${f(34)},362 L${f(20)},362 Z`} fill="#24403a" />
      <path d={`M${f(-18)},242 L${f(18)},242 L${f(19)},250 L${f(-19)},250 Z`} fill="#24403a" />
      <path d={`M${f(-2)},254 L${f(-4)},362`} stroke="#3a5c4e" strokeWidth={1.4} />
    </>
  );
}

// Las rayas de la cinta (de 40 a 140 kg, cada medio kilo), dibujadas una sola vez.
const RAYAS = [];
for (let k = KG_MIN * 2; k <= KG_MAX * 2; k++) {
  const kg = k / 2, x = (kg - KG_MIN) * V.PX, entero = k % 2 === 0, cinco = kg % 5 === 0;
  RAYAS.push(<line key={"r" + k} x1={x} y1={V.y + V.h} x2={x} y2={V.y + V.h - (cinco ? 14 : entero ? 9 : 5)} stroke="#2b2b26" strokeWidth={cinco ? 1.4 : 0.8} />);
  if (cinco) RAYAS.push(<text key={"t" + k} x={x} y={V.y + 15} fontSize={10} textAnchor="middle" fill="#2b2b26" fontFamily={SANS} fontWeight={700}>{kg}</text>);
}

// `valor`: el texto del campo; `onCambiar(texto)`; `pesoPerfil`: donde descansa la cinta sin nada escrito.
export function Bascula({ valor, onCambiar, onEnter, pesoPerfil, idioma, etiqueta }) {
  const quieto = prefiereMenosMovimiento();
  const [fase, setFase] = useState(quieto ? "subido" : "sube"); // "sube" (animación) → "subido"
  const temporizador = useRef(null);
  useEffect(() => {
    if (quieto) return;
    temporizador.current = setTimeout(() => setFase("subido"), 1300);
    return () => clearTimeout(temporizador.current);
  }, []);
  const saltar = () => { if (fase === "sube") { clearTimeout(temporizador.current); setFase("subido"); } };

  // Mientras se suben los pies, la cinta espera en el principio; luego va al número (o al del perfil).
  const kg = fase === "sube" ? KG_MIN : (kgDeTexto(valor) ?? kgDeTexto(pesoPerfil) ?? KG_MIN);
  const desplazamiento = V.cx - (kg - KG_MIN) * V.PX;

  return (
    <div onClick={saltar} style={{ position: "relative", maxWidth: 280, margin: "0 auto" }} className={`bascula ${fase}${quieto ? " quieta" : ""}`}>
      <style>{`
        .bascula .pierna { transform-box: fill-box; }
        .bascula.sube .pierna-izq { animation: bascula-paso 0.5s cubic-bezier(.3,1.25,.5,1) 0.1s both; }
        .bascula.sube .pierna-der { animation: bascula-paso 0.5s cubic-bezier(.3,1.25,.5,1) 0.55s both; }
        @keyframes bascula-paso { from { transform: translateY(90px) scale(1.22); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
        .bascula .cuerpo-bascula { transform-box: fill-box; transform-origin: 50% 50%; }
        .bascula.sube .cuerpo-bascula { animation: bascula-hunde 0.3s ease 1s both; }
        @keyframes bascula-hunde { 0%, 100% { transform: none; } 45% { transform: scale(0.985); } }
        .bascula .cinta { transition: transform 1s cubic-bezier(.3,1.5,.45,1); }
        .bascula.quieta .cinta { transition: none; }
        .bascula .campo-peso::placeholder { color: #b7b2a2; }
        .bascula .campo-peso:focus { box-shadow: inset 0 -2px 0 var(--mustard); }
      `}</style>
      <svg viewBox="0 0 300 360" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
        <defs>
          <pattern id="bascula-baldosa" width="44" height="44" patternUnits="userSpaceOnUse">
            <rect width="44" height="44" fill="#e9e4d6" /><rect width="44" height="44" fill="none" stroke="#d8d1bd" strokeWidth="2" />
          </pattern>
          <clipPath id="bascula-cristal"><rect x={V.x} y={V.y} width={V.w} height={V.h} rx="5" /></clipPath>
          <linearGradient id="bascula-vidrio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.12" /><stop offset="0.25" stopColor="#000" stopOpacity="0" />
            <stop offset="0.8" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="300" height="360" fill="url(#bascula-baldosa)" />
        <g className="cuerpo-bascula">
          <ellipse cx="152" cy="330" rx="104" ry="10" fill="#000" opacity="0.08" />
          <rect x="44" y="58" width="212" height="270" rx="30" fill="#6fb5a6" />
          <rect x="44" y="54" width="212" height="268" rx="30" fill="#9ad4c6" />
          <rect x="54" y="64" width="12" height="236" rx="6" fill="#c8eee5" opacity="0.7" />
          {[0, 1].map((i) => {
            const x = 70 + i * 92;
            const ribs = [];
            for (let y = 152; y < 300; y += 9) ribs.push(<rect key={y} x={x + 6} y={y} width="56" height="3" rx="1.5" fill="#86c4b6" />);
            return <g key={i}><rect x={x} y="144" width="68" height="160" rx="22" fill="#b4e1d6" />{ribs}</g>;
          })}
          {/* El visor de la ventana, en el borde de delante */}
          <rect x={V.cx - V.ancho / 2} y={V.y - 12} width={V.ancho} height={V.h + 24} rx="14" fill="#6fb5a6" />
          <rect x={V.cx - V.ancho / 2} y={V.y - 14} width={V.ancho} height={V.h + 22} rx="14" fill="#86c4b6" />
          <rect x={V.x - 4} y={V.y - 4} width={V.w + 8} height={V.h + 8} rx="7" fill="#5c9e8f" />
          <rect x={V.x} y={V.y} width={V.w} height={V.h} rx="5" fill="#fffdf7" />
          <g clipPath="url(#bascula-cristal)">
            <g className="cinta" style={{ transform: `translateX(${desplazamiento}px)` }}>{RAYAS}</g>
          </g>
          <rect x={V.x} y={V.y} width={V.w} height={V.h} rx="5" fill="url(#bascula-vidrio)" pointerEvents="none" />
          <path d={`M${V.x + 8},${V.y + 4} L${V.x + 22},${V.y + 4}`} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" pointerEvents="none" />
          {/* La línea roja fija y la lupa */}
          <line x1={V.cx} y1={V.y - 2} x2={V.cx} y2={V.y + V.h + 2} stroke="#c2452d" strokeWidth="2" />
          <circle cx={V.cx} cy={LUPA.cy} r={LUPA.r} fill="#fffdf7" stroke="#5c9e8f" strokeWidth="4" />
          <circle cx={V.cx} cy={LUPA.cy} r={LUPA.r} fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
          <path d={`M${V.cx - 13},${LUPA.cy - 12} Q${V.cx - 5},${LUPA.cy - 19} ${V.cx + 4},${LUPA.cy - 18}`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9" />
          <text x={V.cx} y={LUPA.cy + LUPA.r - 6} fontSize="5.5" textAnchor="middle" fill="#6b6a5e" fontFamily={SANS} fontWeight="700">kg</text>
        </g>
        <g className="pierna pierna-izq"><Pierna cx={104} lado={1} /></g>
        <g className="pierna pierna-der"><Pierna cx={196} lado={-1} /></g>
      </svg>
      <input
        className="campo-peso"
        inputMode="decimal"
        value={valor}
        onChange={(e) => onCambiar(e.target.value.replace(/[^\d.,]/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        onFocus={saltar}
        placeholder="0,0"
        aria-label={etiqueta || t(idioma, "cuerpo.bascula.campo")}
        style={{
          position: "absolute", left: `${((V.cx - 20) / 300) * 100}%`, top: `${((LUPA.cy - 12) / 360) * 100}%`,
          width: `${(40 / 300) * 100}%`, height: `${(20 / 360) * 100}%`, border: "none", background: "transparent",
          textAlign: "center", padding: 0, outline: "none", fontFamily: SERIF, fontSize: 16, letterSpacing: -0.4,
          color: "#2b2b26", WebkitAppearance: "none", appearance: "none",
        }}
      />
    </div>
  );
}
