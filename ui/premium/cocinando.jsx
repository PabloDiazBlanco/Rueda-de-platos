// ---------- ui/premium/cocinando.jsx ----------
// Lo que se ve en «¿Qué cocino?» mientras Gemini piensa las recetas (Bloque MENÚ de la parte estética,
// 26-oct-2026; opción B de local/ideas/esteticas/v2-03-que-cocino.html con la transición de la D de
// 03-que-cocino.html). Hasta entonces solo cambiaba el texto del botón a «Un momento…», y la respuesta tarda
// de 2 a más de 10 s: una espera así, sin nada que mirar, parece que la app se ha quedado colgada.
//
// Dos tiempos:
// 1. El viaje (VIAJE_MS): se ve la cocina de la despensa entera y la cámara se acerca a la vitrocerámica
//    hasta fundirse con la vista de cerca. Cuenta que «volvemos a la cocina», como la vitro de «¿Qué tengo?»,
//    que lleva aquí mismo.
// 2. La escena en primera persona, en bucle hasta que llega la respuesta: la encimera inclinada y cerca, como
//    vista desde donde se cocina, con dos muñones (beis con manga blanca, para no tener que elegir un color de
//    piel): el derecho pica el tomate —cada golpe de cuchillo saca una rodaja; a las cinco, vuelve a estar
//    entero— y el izquierdo saltea la sartén con un golpe de muñeca, y el filete se da la vuelta. Al fondo, la
//    olla con la pasta hirviendo. Sin salero ni pimienta (decisión del usuario). Siempre la misma escena.
// Debajo, una frase que cambia cada 2,2 s y, si pasa de 8 s, «Está tardando un poco más de lo normal…».
//
// La espera mínima (para que no parpadee si Gemini contesta muy rápido) la aplica quien la pinta con
// `esperaMinimaPensando()`: el viaje más 1,5 s de escena. Con «reducir movimiento», nada se mueve: se ve la
// escena de cerca quieta desde el principio (sin viaje) y solo cambian las frases.
//
// Los dibujos son propios de este archivo (no se reutiliza la cocina de ui/despensa/, que es interactiva):
// solo se importan los colores del tema retro, ui/despensa/tema.js, sin cambiarlo.
import React, { useState, useEffect, useRef } from "react";
import { t } from "i18n";
import { temaNevera } from "../despensa/tema.js";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

const VIAJE_MS = 1000;
const ESPERA_MINIMA_MS = 1500;
const CAMBIO_FRASE_MS = 2200;
const AVISO_TARDA_MS = 8000;
const N_FRASES = 4;
// La escena B de la maqueta: más inclinada y más cerca que la A, para que se lea como «tus manos».
const ANGULO = 50, ZOOM = 1.18, PERSPECTIVA = 420;
// El cuchillo da un golpe cada GOLPE_S y cada golpe saca una rodaja; el ciclo es de RODAJAS golpes.
const GOLPE_S = 0.55;
const RODAJAS = 5;

// Colores de la ilustración que no son del tema de la cocina (la comida, los muñones, la sartén).
const C = {
  tomate: "#e4573d", tomateDentro: "#f08a70", pepita: "#f6e3a0", hoja: "#4f9a4f",
  pasta: "#efc75e", filete: "#c07a48", fileteRaya: "#9a5a30", fileteTostado: "#8f4f28", fileteTostadoRaya: "#5e2f17",
  sarten: "#3b3b38", sartenDentro: "#4a4a45", mango: "#2f2f2c", vitroAro: "#55554f", vitroPunto: "#77756c",
  manga: "#fffdf7", mangaBorde: "#e2dccb", puno: "#2f6b4f", munon: "#f3dcc0", munonBorde: "#d9b994", mangoCuchillo: "#3a3a3a",
  estante: "#f3e6d0", lata: "#e4573d", tarro: "#d9a441", bote: "#f4efe2", botella: "#7fae4f", caja: "#c99d62", lampara: "#8a7a5c",
};

export function reducirMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

// Lo mínimo que tiene que durar la espera desde que se pulsa, con o sin viaje.
export function esperaMinimaPensando() {
  return (reducirMovimiento() ? 0 : VIAJE_MS) + ESPERA_MINIMA_MS;
}

// Los fotogramas de cada rodaja y del tomate que queda, para un ciclo de RODAJAS golpes. La rodaja i aparece
// justo cuando el cuchillo toca la tabla en el golpe i, se aparta a su sitio y se queda hasta el final, cuando
// todo se desvanece y el tomate vuelve a estar entero.
function cssRodajas() {
  const ciclo = GOLPE_S * RODAJAS;
  const pct = (s) => ((s / ciclo) * 100).toFixed(2);
  let css = "";
  for (let i = 0; i < RODAJAS; i++) {
    const t0 = i * GOLPE_S + GOLPE_S * 0.4;
    css += `@keyframes qcSale${i} { 0%, ${pct(t0)}% { opacity: 0; transform: translateX(-6px); } ${pct(t0 + 0.12)}% { opacity: 1; transform: translateX(var(--x)); } 92% { opacity: 1; transform: translateX(var(--x)); } 100% { opacity: 0; transform: translateX(var(--x)); } }
      .qc-pensando .qc-r${i} { animation: qcSale${i} ${ciclo}s linear infinite; }\n`;
  }
  let pasos = "0% { transform: scaleX(1); }";
  for (let i = 0; i < RODAJAS; i++) {
    const t0 = i * GOLPE_S + GOLPE_S * 0.4;
    pasos += ` ${pct(t0)}% { transform: scaleX(${(1 - i * 0.1).toFixed(2)}); } ${pct(t0 + 0.05)}% { transform: scaleX(${(1 - (i + 1) * 0.1).toFixed(2)}); }`;
  }
  pasos += " 96% { transform: scaleX(0.5); opacity: 1; } 99% { opacity: 0; } 100% { transform: scaleX(1); opacity: 1; }";
  return css + `@keyframes qcQueda { ${pasos} } .qc-pensando .qc-tomate-queda { animation: qcQueda ${ciclo}s linear infinite; }`;
}

// Todo lo que se mueve va en CSS y solo con .qc-pensando (que nunca se pone con «reducir movimiento»).
const ESTILOS = `
  .qc-viaje .qc-entera { position: absolute; inset: 0; transform-origin: 42% 72%; transition: transform 1.1s cubic-bezier(.6,0,.3,1), opacity 0.4s ease 0.8s; }
  .qc-viaje .qc-cerca { position: absolute; inset: 0; opacity: 0; transition: opacity 0.45s ease 0.85s; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; }
  .qc-viaje.qc-dentro .qc-entera { transform: scale(3.4); opacity: 0; }
  .qc-viaje.qc-dentro .qc-cerca { opacity: 1; }
  .qc-viaje.qc-quieta .qc-entera, .qc-viaje.qc-quieta .qc-cerca { transition: none; }
  .qc-burbuja, .qc-vapor, .qc-chispa, .qc-pica, .qc-sarten, .qc-filete, .qc-tomate-queda, .qc-rodaja { transform-box: fill-box; }
  .qc-burbuja { opacity: 0; transform-origin: center; }
  .qc-pensando .qc-burbuja { animation: qcBurbuja 0.9s ease-in infinite; }
  .qc-pensando .qc-burbuja:nth-of-type(2n) { animation-delay: 0.35s; }
  .qc-pensando .qc-burbuja:nth-of-type(3n) { animation-delay: 0.6s; }
  @keyframes qcBurbuja { 0% { transform: scale(0.2); opacity: 0; } 60% { opacity: 0.9; } 100% { transform: scale(1.3); opacity: 0; } }
  .qc-vapor { opacity: 0; transform-origin: center; }
  .qc-pensando .qc-vapor { animation: qcVapor 2s ease-out infinite; }
  .qc-pensando .qc-vapor:nth-of-type(2) { animation-delay: 0.7s; }
  .qc-pensando .qc-vapor:nth-of-type(3) { animation-delay: 1.4s; }
  @keyframes qcVapor { 0% { transform: scale(0.3); opacity: 0; } 30% { opacity: 0.55; } 100% { transform: scale(1.6); opacity: 0; } }
  .qc-brasa { opacity: 0.25; }
  .qc-pensando .qc-brasa { animation: qcBrasa 1.4s ease-in-out infinite alternate; }
  @keyframes qcBrasa { from { opacity: 0.25; } to { opacity: 0.5; } }
  .qc-chispa { opacity: 0; transform-origin: center; }
  .qc-pensando .qc-chispa { animation: qcChispa 0.7s ease-out infinite; }
  .qc-pensando .qc-chispa:nth-of-type(2) { animation-delay: 0.25s; }
  .qc-pensando .qc-chispa:nth-of-type(3) { animation-delay: 0.45s; }
  .qc-pensando .qc-chispa:nth-of-type(4) { animation-delay: 0.6s; }
  @keyframes qcChispa { 0% { transform: scale(0.2); opacity: 0; } 30% { opacity: 1; } 100% { transform: scale(1) translateY(-6px); opacity: 0; } }
  .qc-pensando .qc-pica { animation: qcPica ${GOLPE_S}s cubic-bezier(.5,0,.5,1) infinite; transform-origin: 50% 100%; }
  @keyframes qcPica { 0%, 100% { transform: translateY(-8px) scale(1.05); } 40%, 55% { transform: translateY(1px) scale(1); } }
  .qc-sarten { transform-origin: 30% 95%; }
  .qc-pensando .qc-sarten { animation: qcGolpe 2.2s ease-in-out infinite; }
  @keyframes qcGolpe { 0%, 8%, 30%, 58%, 80%, 100% { transform: none; } 14%, 64% { transform: translate(6px, -10px) rotate(-4deg); } }
  .qc-filete { transform-origin: center; }
  .qc-pensando .qc-filete { animation: qcVoltea 2.2s ease-in-out infinite; }
  @keyframes qcVoltea { 0%, 12%, 30%, 62%, 80%, 100% { transform: none; } 21%, 71% { transform: translateY(-14px) scale(1.3, 0.06); } }
  .qc-lado-b { opacity: 0; }
  .qc-pensando .qc-lado-a { animation: qcLadoA 2.2s linear infinite; }
  .qc-pensando .qc-lado-b { animation: qcLadoB 2.2s linear infinite; }
  @keyframes qcLadoA { 0%, 20.9% { opacity: 1; } 21%, 70.9% { opacity: 0; } 71%, 100% { opacity: 1; } }
  @keyframes qcLadoB { 0%, 20.9% { opacity: 0; } 21%, 70.9% { opacity: 1; } 71%, 100% { opacity: 0; } }
  .qc-tomate-queda { transform-origin: 0% 50%; }
  .qc-rodaja { opacity: 0; }
  .qc-puntos i { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--green); margin: 0 1.5px; opacity: 0.25; }
  .qc-pensando .qc-puntos i { animation: qcPunto 1.2s ease-in-out infinite; }
  .qc-pensando .qc-puntos i:nth-child(2) { animation-delay: 0.2s; }
  .qc-pensando .qc-puntos i:nth-child(3) { animation-delay: 0.4s; }
  @keyframes qcPunto { 0%, 100% { opacity: 0.25; transform: none; } 40% { opacity: 1; transform: translateY(-3px); } }
  ${cssRodajas()}
`;

// La cocina entera, vista de frente (el punto de partida del viaje): estante con tarros, fregadero, vitro con
// una olla y una sartén, la nevera retro con su planta y la lámpara. Un resumen de la de «¿Qué tengo?».
function CocinaEntera({ tema }) {
  return (
    <svg viewBox="0 0 340 300" width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <pattern id="qc-azulejos-entera" width="18" height="13.6" patternUnits="userSpaceOnUse">
          <rect width="18" height="13.6" fill={tema.azulejo} /><rect width="18" height="1.2" fill={tema.juntas} /><rect width="1.2" height="13.6" fill={tema.juntas} />
        </pattern>
      </defs>
      <rect width="340" height="300" fill={tema.pared} />
      <rect x="18" y="20" width="76" height="110" rx="4" fill={C.estante} />
      <rect x="14" y="16" width="84" height="7" rx="3" fill={tema.madera} />
      {[56, 92, 128].map((y) => <rect key={y} x="14" y={y} width="84" height="6" rx="2" fill={tema.madera} />)}
      <rect x="28" y="38" width="12" height="18" rx="2" fill={C.lata} /><rect x="46" y="42" width="16" height="14" rx="2" fill={C.tarro} />
      <rect x="30" y="76" width="22" height="16" rx="3" fill={C.bote} /><rect x="60" y="72" width="14" height="20" rx="3" fill={C.botella} />
      <rect x="30" y="110" width="40" height="18" rx="3" fill={C.caja} />
      <rect y="150" width="200" height="62" fill="url(#qc-azulejos-entera)" />
      <rect y="212" width="200" height="12" fill={tema.encimera} /><rect y="224" width="200" height="7" fill={tema.encimeraCanto} />
      <rect y="231" width="200" height="56" fill={tema.mueble} />
      <rect x="6" y="238" width="80" height="46" rx="5" fill="none" stroke={tema.muebleOscuro} strokeWidth="2" />
      <rect x="94" y="238" width="98" height="46" rx="5" fill="none" stroke={tema.muebleOscuro} strokeWidth="2" />
      <rect y="287" width="340" height="13" fill={tema.suelo} />
      <ellipse cx="40" cy="218" rx="26" ry="4.5" fill={tema.metalClaro} />
      <path d="M58,214 L58,192 Q58,184 50,184 L40,184 L40,190" fill="none" stroke={tema.metal} strokeWidth="4" strokeLinecap="round" />
      <rect x="96" y="213" width="96" height="10" rx="3" fill={tema.vitro} />
      <path d="M150,208 L184,208 L182,213 L152,213 Z" fill={C.sarten} />
      <path d="M114,200 L136,200 L135,213 L115,213 Z" fill={tema.cuerpo} /><ellipse cx="125" cy="200" rx="11" ry="2" fill={tema.cuerpoOscuro} />
      <rect x="210" y="62" width="118" height="222" rx="22" fill={tema.cuerpo} /><rect x="210" y="128" width="118" height="4" fill={tema.cuerpoOscuro} />
      <rect x="312" y="92" width="6" height="28" rx="3" fill={tema.metalClaro} /><rect x="312" y="140" width="6" height="44" rx="3" fill={tema.metalClaro} />
      <rect x="218" y="80" width="6" height="40" rx="3" fill={tema.brillo} opacity="0.7" />
      <path d="M232,62 L256,62 L252,48 L236,48 Z" fill={tema.maceta} />
      <path d="M240,48 Q232,30 238,22 M246,48 Q248,28 258,22" stroke={tema.planta} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="285" y="0" width="2" height="24" fill={C.lampara} /><path d="M272,38 Q272,24 286,24 Q300,24 300,38 Z" fill={tema.cuerpo} />
    </svg>
  );
}

// Un muñón: puño redondeado beis y manga blanca de chaqueta con el puño verde. Origen en el centro del puño;
// `rot` gira la manga, que sale hacia abajo (hacia quien mira).
function Munon({ x, y, rot }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <rect x="-18" y="10" width="36" height="110" rx="10" fill={C.manga} stroke={C.mangaBorde} strokeWidth="1.5" />
      <rect x="-18" y="10" width="36" height="10" rx="4" fill={C.puno} opacity="0.85" />
      <rect x="-16" y="-15" width="32" height="34" rx="16" fill={C.munon} stroke={C.munonBorde} strokeWidth="1.2" />
    </g>
  );
}

// La encimera vista desde arriba (la inclina el CSS de quien la contiene): vitro con olla y sartén, y la tabla
// con el tomate y el cuchillo.
function EscenaCerca({ tema }) {
  const filete = "M88,150 Q94,132 118,136 Q140,140 136,160 Q132,178 110,176 Q86,172 88,150 Z";
  return (
    <svg viewBox="0 0 340 250" width="100%" style={{ display: "block", transform: `rotateX(${ANGULO}deg) scale(${ZOOM})`, transformOrigin: "50% 100%" }} aria-hidden="true">
      <defs>
        <pattern id="qc-motas" width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill={tema.encimera} /><circle cx="2" cy="3" r="0.7" fill={tema.encimeraCanto} />
        </pattern>
        <clipPath id="qc-corte-tomate"><rect x="220" y="140" width="51" height="60" /></clipPath>
      </defs>
      <rect width="340" height="250" fill="url(#qc-motas)" />
      <rect x="8" y="8" width="192" height="206" rx="14" fill={tema.vitro} />
      <circle className="qc-brasa" cx="72" cy="66" r="50" fill={tema.fuego} />
      <circle className="qc-brasa" cx="116" cy="150" r="48" fill={tema.fuego} />
      <circle cx="72" cy="66" r="47" fill="none" stroke={C.vitroAro} strokeWidth="2" />
      <circle cx="165" cy="48" r="24" fill="none" stroke={C.vitroAro} strokeWidth="2" />
      <circle cx="116" cy="150" r="45" fill="none" stroke={C.vitroAro} strokeWidth="2" />
      {[40, 70, 100, 130].map((x) => <circle key={x} cx={x} cy="206" r="2.5" fill={C.vitroPunto} />)}

      {/* la olla con la pasta hirviendo */}
      <rect x="16" y="59" width="14" height="14" rx="4" fill={tema.metal} /><rect x="114" y="59" width="14" height="14" rx="4" fill={tema.metal} />
      <circle cx="72" cy="66" r="44" fill={tema.cuerpo} stroke={tema.cuerpoOscuro} strokeWidth="3" />
      <circle cx="72" cy="66" r="37" fill={tema.agua} />
      <path d="M50,58 q8,-10 16,0 t16,0 M54,72 q8,-10 16,0 t16,0 M62,52 q6,10 14,2" stroke={C.pasta} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <g>{[[56, 80], [86, 54], [92, 76], [64, 46], [76, 86]].map(([x, y]) => <circle key={`${x}-${y}`} className="qc-burbuja" cx={x} cy={y} r="3.2" fill="none" stroke="#fff" strokeWidth="1.4" />)}</g>
      <g>{[0, 1, 2].map((i) => <circle key={i} className="qc-vapor" cx="72" cy="66" r="20" fill="#fff" />)}</g>

      {/* la tabla, el tomate que se va cortando y sus rodajas */}
      <rect x="212" y="96" width="120" height="142" rx="12" fill={tema.madera} stroke={tema.maderaOscura} strokeWidth="2" />
      <path d="M222,120 q30,6 60,0 t40,4 M222,214 q30,6 60,0 t40,4" stroke={tema.maderaOscura} strokeWidth="1" fill="none" opacity="0.5" />
      <circle cx="316" cy="110" r="5" fill={tema.encimera} />
      <g className="qc-tomate-queda">
        <g clipPath="url(#qc-corte-tomate)"><circle cx="250" cy="168" r="21" fill={C.tomate} /><circle cx="244" cy="161" r="4" fill="#fff" opacity="0.3" /></g>
        <ellipse cx="270" cy="168" rx="4" ry="14" fill={C.tomateDentro} />
        <path d="M243,152 l4,5 6,-2 -3,6 4,4 -6,0 -3,5 -2,-6 -6,-1 5,-3 z" fill={C.hoja} />
      </g>
      {Array.from({ length: RODAJAS }, (_, i) => (
        <g key={i} className={`qc-rodaja qc-r${i}`} style={{ "--x": `${i * 8.5}px` }}>
          <ellipse cx="285" cy={168 + i * 1.5} rx="5.5" ry="17" fill={C.tomate} />
          <ellipse cx="285" cy={168 + i * 1.5} rx="3.7" ry="14" fill={C.tomateDentro} />
          <circle cx="284" cy={162 + i * 1.5} r="1" fill={C.pepita} /><circle cx="286" cy={174 + i * 1.5} r="1" fill={C.pepita} />
        </g>
      ))}

      {/* la sartén con el filete; el muñón izquierdo la sujeta por el mango y le da el golpe de muñeca */}
      <g className="qc-sarten">
        <g transform="translate(4,-6)">
          <rect x="-7" y="36" width="14" height="74" rx="7" fill={C.mango} transform="translate(112,156) rotate(15)" />
          <circle cx="112" cy="156" r="41" fill={C.sarten} /><circle cx="112" cy="156" r="35" fill={C.sartenDentro} />
          <g className="qc-filete">
            <g className="qc-lado-a"><path d={filete} fill={C.filete} /><path d="M98,146 L126,152 M96,158 L128,164" stroke={C.fileteRaya} strokeWidth="2.4" strokeLinecap="round" /></g>
            <g className="qc-lado-b"><path d={filete} fill={C.fileteTostado} /><path d="M98,146 L126,152 M96,158 L128,164 M100,168 L122,172" stroke={C.fileteTostadoRaya} strokeWidth="2.6" strokeLinecap="round" /></g>
          </g>
          <g>{[[92, 138], [136, 150], [128, 178], [90, 172]].map(([x, y]) => <circle key={`${x}-${y}`} className="qc-chispa" cx={x} cy={y} r="2" fill={C.pepita} />)}</g>
        </g>
        <Munon x={95} y={229} rot={15} />
      </g>

      {/* el muñón derecho con el cuchillo: bajan juntos */}
      <g className="qc-pica">
        <polygon points="281,104 289,116 289,190 275,190 275,128" fill={tema.metalClaro} stroke={tema.metal} strokeWidth="1.5" />
        <rect x="275" y="188" width="14" height="38" rx="5" fill={C.mangoCuchillo} />
        <circle cx="282" cy="200" r="1.6" fill={tema.metalClaro} /><circle cx="282" cy="214" r="1.6" fill={tema.metalClaro} />
        <Munon x={282} y={214} rot={-8} />
      </g>
    </svg>
  );
}

// Se monta al pulsar «¿Qué cocino?» y se desmonta al llegar la respuesta (o el error).
export function PensandoCocina({ idioma }) {
  const tema = temaNevera();
  const [quieta] = useState(reducirMovimiento);
  const [dentro, setDentro] = useState(quieta);
  const [pensando, setPensando] = useState(false);
  const [frase, setFrase] = useState(0);
  const [tarda, setTarda] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    // Que se vea entera: el botón queda al final del formulario y la escena justo debajo, medio tapada
    // por la barra inferior si no se centra.
    if (caja.current && caja.current.scrollIntoView) caja.current.scrollIntoView({ block: "center", behavior: quieta ? "auto" : "smooth" });
    const timers = [];
    if (!quieta) {
      // Un fotograma con la cocina entera y luego el viaje (lo hacen las transiciones CSS de .qc-dentro).
      timers.push(setTimeout(() => setDentro(true), 30));
      timers.push(setTimeout(() => setPensando(true), VIAJE_MS));
    }
    const cambio = setInterval(() => setFrase((f) => (f + 1) % N_FRASES), CAMBIO_FRASE_MS);
    timers.push(setTimeout(() => { clearInterval(cambio); setTarda(true); }, AVISO_TARDA_MS));
    return () => { timers.forEach(clearTimeout); clearInterval(cambio); };
  }, []);

  const texto = tarda ? t(idioma, "queCocino.pensando.tarda") : t(idioma, "queCocino.pensando.frase" + (frase + 1));
  // Los azulejos de la pared del fondo de la vista de cerca, como fondo CSS (llenan lo que no tapa la encimera).
  const azulejos = `repeating-linear-gradient(90deg, ${tema.juntas} 0 1.2px, transparent 1.2px 18px), repeating-linear-gradient(${tema.juntas} 0 1.2px, ${tema.azulejo} 1.2px 13.6px)`;

  return (
    <div
      ref={caja}
      role="status"
      className={pensando ? "qc-pensando" : ""}
      style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", maxWidth: 480, marginBottom: 16 }}
    >
      <style>{ESTILOS}</style>
      <div
        className={`qc-viaje${dentro ? " qc-dentro" : ""}${quieta ? " qc-quieta" : ""}`}
        style={{ position: "relative", overflow: "hidden", background: tema.pared, aspectRatio: "340 / 300" }}
      >
        <div className="qc-entera"><CocinaEntera tema={tema} /></div>
        <div className="qc-cerca" style={{ background: azulejos }}>
          <div style={{ perspective: `${PERSPECTIVA}px`, perspectiveOrigin: "50% -20%" }}><EscenaCerca tema={tema} /></div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 10px", borderTop: "1px solid var(--line)", minHeight: 40 }}>
        <span style={{ flex: 1, fontFamily: FUENTE_TITULOS, fontSize: 14.5, fontStyle: "italic", color: "var(--green-dark)" }}>{texto}</span>
        <span className="qc-puntos" aria-hidden="true" style={{ fontFamily: FUENTE_TEXTO }}><i /><i /><i /></span>
      </div>
    </div>
  );
}
