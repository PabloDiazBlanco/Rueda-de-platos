// ---------- ui/despensa/dibujos.jsx ----------
// Los dibujos de la Fase B de la despensa, en SVG y sin imágenes externas (funcionan sin conexión y
// pesan muy poco): la comida, el cuerpo de la nevera con su interior, las puertas (por delante y por
// dentro), el estante de la despensa y la cocina de alrededor (pared, encimera, fregadero, grifo,
// vitrocerámica). Salen de las propuestas de local/ideas/diseno-nevera/
// (generar.py), en el estilo retro que eligió el usuario. Los colores de la nevera vienen siempre del
// tema (ui/despensa/tema.js); los de la comida son fijos, porque una manzana es roja en cualquier
// estilo.
//
// Qué dibujo lleva cada alimento y en qué hueco va lo decide logica/nevera.js (formaDe, huecoDe,
// dibujoPropio); aquí solo se pinta. Los 43 alimentos del catálogo base tienen además su dibujo propio
// (ui/despensa/alimentos.jsx), que IconoAlimento prefiere al de su forma cuando se le pasa `dibujo`.
import React from "react";
import { DIBUJOS_ALIMENTOS } from "./alimentos.jsx";

// Borde fino y suave para lo que es blanco o casi (leche, yogures, huevos): sin él se perdería sobre el
// interior claro de la nevera.
const BORDE = { stroke: "#cfc8b6", strokeWidth: 0.9, strokeLinejoin: "round" };

function brik(cuerpo, banda, tapon) {
  return {
    w: 22, h: 48,
    dibujo: () => (
      <>
        <polygon points="0,11 11,1 22,11" fill={cuerpo} {...BORDE} />
        <rect x="0" y="11" width="22" height="37" rx="2" fill={cuerpo} {...BORDE} />
        <rect x="0" y="23" width="22" height="11" fill={banda} />
        <circle cx="15" cy="6" r="2.4" fill={tapon} />
      </>
    ),
  };
}

function botella(liquido, tapon, ancho = 18, alto = 50) {
  const c = ancho / 2;
  return {
    w: ancho, h: alto,
    dibujo: () => (
      <>
        <rect x={c - 4} y="0" width="8" height="5" rx="1.5" fill={tapon} />
        <path
          d={`M${c - 3},5 L${c + 3},5 L${c + 3},11 Q${ancho},14 ${ancho},20 L${ancho},${alto - 3} Q${ancho},${alto} ${ancho - 3},${alto} L3,${alto} Q0,${alto} 0,${alto - 3} L0,20 Q0,14 ${c - 3},11 Z`}
          fill={liquido}
          {...BORDE}
        />
        <rect x="3" y="24" width={ancho - 6} height="12" rx="2" fill="#ffffff" opacity="0.55" />
      </>
    ),
  };
}

function vasoYogur(x, tapa) {
  return (
    <g transform={`translate(${x},0)`}>
      <polygon points="1,5 15,5 13,21 3,21" fill="#fbfaf5" {...BORDE} />
      <rect x="0" y="1" width="16" height="5" rx="1.5" fill={tapa} {...BORDE} />
      <rect x="4" y="11" width="8" height="5" rx="1" fill={tapa} opacity="0.5" />
    </g>
  );
}

// Cada dibujo en su propio recuadro (w × h, origen arriba a la izquierda); IconoAlimento lo escala para
// que todos ocupen lo mismo en pantalla y queden apoyados por abajo, como sobre una balda.
const DIBUJOS = {
  leche: brik("#f7f5ee", "#5b8fd1", "#5b8fd1"),
  gazpacho: brik("#e05a3f", "#f3e3c8", "#3d8b5a"),
  zumo: botella("#f2a33a", "#3d8b5a"),
  agua: botella("#bfe0f2", "#4a86c5", 17, 52),
  vino: botella("#7a2a3a", "#2b2b26", 15, 52),
  aceite: botella("#c7c03e", "#3d8b5a", 15, 52),
  salsa: {
    w: 16, h: 34,
    dibujo: () => (
      <>
        <path d="M5,8 L11,8 L9.5,1 L6.5,1 Z" fill="#f5f0e1" {...BORDE} />
        <rect x="1" y="8" width="14" height="26" rx="5" fill="#d6452f" />
        <rect x="4" y="16" width="8" height="9" rx="1.5" fill="#ffffff" opacity="0.6" />
      </>
    ),
  },
  huevos: {
    w: 38, h: 17,
    dibujo: () => (
      <>
        {[0, 1, 2].map((i) => <ellipse key={i} cx={6 + i * 12.5} cy="9" rx="6" ry="8" fill="#f6e7c9" {...BORDE} />)}
      </>
    ),
  },
  mantequilla: {
    w: 30, h: 14,
    dibujo: () => (
      <>
        <rect x="0" y="2" width="30" height="12" rx="2" fill="#f6dc7a" />
        <rect x="0" y="2" width="30" height="4" rx="2" fill="#fbf3cf" />
        <rect x="12" y="2" width="6" height="12" fill="#e9c75a" opacity="0.6" />
      </>
    ),
  },
  yogur: { w: 35, h: 21, dibujo: () => (<>{vasoYogur(0, "#e47a9a")}{vasoYogur(19, "#7fb3e0")}</>) },
  queso: {
    w: 40, h: 24,
    dibujo: () => (
      <>
        <path d="M0,24 L40,24 L40,8 Q22,3 0,15 Z" fill="#f5c947" />
        <circle cx="12" cy="19" r="2.6" fill="#e3ae2c" />
        <circle cx="25" cy="15" r="3.2" fill="#e3ae2c" />
        <circle cx="34" cy="20" r="2" fill="#e3ae2c" />
      </>
    ),
  },
  carne: {
    w: 46, h: 16,
    dibujo: () => (
      <>
        <rect x="0" y="7" width="46" height="9" rx="3" fill="#e8e3d6" />
        <ellipse cx="23" cy="8" rx="18" ry="6" fill="#f4b5a8" />
        <path d="M10,6 Q23,1 36,6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
      </>
    ),
  },
  pescado: {
    w: 44, h: 18,
    dibujo: () => (
      <>
        <polygon points="33,9 44,1 44,17" fill="#7fa9c4" />
        <ellipse cx="18" cy="9" rx="18" ry="8" fill="#9cc0d6" />
        <circle cx="8" cy="7" r="1.8" fill="#2b2b26" />
        <path d="M14,4 Q17,9 14,14" fill="none" stroke="#7fa9c4" strokeWidth="1.5" />
      </>
    ),
  },
  fiambre: {
    w: 34, h: 18,
    dibujo: () => (
      <>
        <rect x="0" y="3" width="34" height="15" rx="3" fill="#f6e0d9" />
        <ellipse cx="17" cy="10.5" rx="12" ry="5" fill="#e48f86" />
        <path d="M8,10 Q17,7 26,10" fill="none" stroke="#fbe7e2" strokeWidth="1.6" />
      </>
    ),
  },
  embutido: {
    w: 44, h: 14,
    dibujo: () => (
      <>
        <rect x="0" y="1" width="42" height="13" rx="6.5" fill="#a9473d" />
        <ellipse cx="38" cy="7.5" rx="5" ry="6.5" fill="#d77a6c" />
        <circle cx="37" cy="6" r="1" fill="#f6e3dc" />
        <circle cx="39.5" cy="9" r="1" fill="#f6e3dc" />
      </>
    ),
  },
  manzana: {
    w: 20, h: 21,
    dibujo: () => (
      <>
        <path d="M10,3 L11,0" stroke="#6b4423" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="14" cy="3" rx="4" ry="2" fill="#5aa35a" />
        <circle cx="10" cy="12" r="9" fill="#e0483e" />
        <circle cx="7" cy="9" r="2" fill="#ffffff" opacity="0.4" />
      </>
    ),
  },
  naranja: {
    w: 20, h: 21,
    dibujo: () => (
      <>
        <ellipse cx="13" cy="3" rx="4" ry="2" fill="#5aa35a" />
        <circle cx="10" cy="12" r="9" fill="#f29a2e" />
        <circle cx="7" cy="9" r="0.9" fill="#d9801c" /><circle cx="12" cy="15" r="0.9" fill="#d9801c" />
        <circle cx="14" cy="9" r="0.9" fill="#d9801c" />
      </>
    ),
  },
  fresa: {
    w: 18, h: 21,
    dibujo: () => (
      <>
        <path d="M9,21 Q0,13 2,7 Q9,4 16,7 Q18,13 9,21 Z" fill="#e2453c" />
        <polygon points="9,2 11,5 15,5 12,7 9,6 6,7 3,5 7,5" fill="#4f9a4f" />
        <circle cx="6" cy="11" r="0.8" fill="#f6d36b" /><circle cx="11" cy="10" r="0.8" fill="#f6d36b" />
        <circle cx="9" cy="15" r="0.8" fill="#f6d36b" />
      </>
    ),
  },
  fruta: {
    w: 18, h: 24,
    dibujo: () => (
      <>
        <path d="M9,4 L10,0" stroke="#6b4423" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9,5 Q12,5 12,10 Q18,14 17,19 Q16,24 9,24 Q2,24 1,19 Q0,14 6,10 Q6,5 9,5 Z" fill="#c3d356" />
      </>
    ),
  },
  tomate: {
    w: 20, h: 19,
    dibujo: () => (
      <>
        <circle cx="10" cy="10.5" r="8.5" fill="#e4573d" />
        <polygon points="10,1 12,4.5 16,4 13,6.5 10,5.5 7,6.5 4,4 8,4.5" fill="#4f9a4f" />
      </>
    ),
  },
  lechuga: {
    w: 30, h: 23,
    dibujo: () => (
      <>
        <circle cx="9" cy="14" r="9" fill="#6fae4f" />
        <circle cx="21" cy="14" r="9" fill="#6fae4f" />
        <circle cx="15" cy="10" r="9.5" fill="#8cc56a" />
        <path d="M15,6 L15,18" stroke="#d6ecc4" strokeWidth="1.5" />
      </>
    ),
  },
  verdura: {
    w: 26, h: 24,
    dibujo: () => (
      <>
        <path d="M10,24 L11,13 L15,13 L16,24 Z" fill="#a8d27a" />
        <circle cx="7" cy="10" r="6" fill="#4f9a4f" />
        <circle cx="19" cy="10" r="6" fill="#4f9a4f" />
        <circle cx="13" cy="7" r="7" fill="#5aa35a" />
      </>
    ),
  },
  zanahoria: {
    w: 34, h: 12,
    dibujo: () => (
      <>
        <path d="M24,1 L33,0 M24,4 L34,5 M24,7 L32,10" stroke="#5aa35a" strokeWidth="2" strokeLinecap="round" />
        <path d="M0,6 Q12,0.5 25,1.5 Q27,6 25,10.5 Q12,11.5 0,6 Z" fill="#ee8a33" />
      </>
    ),
  },
  platano: {
    w: 34, h: 16,
    dibujo: () => (
      <>
        <path d="M1,4 Q17,20 33,4 Q31,1 30,2 Q17,13 3,2 Q1,1 1,4 Z" fill="#f4d24a" />
        <circle cx="31.5" cy="2.5" r="1.5" fill="#6b4423" />
      </>
    ),
  },
  patata: {
    w: 44, h: 26,
    dibujo: () => (
      <>
        <circle cx="12" cy="11" r="7" fill="#b98b5a" />
        <circle cx="24" cy="9" r="7" fill="#c99d6a" />
        <circle cx="34" cy="11" r="6.5" fill="#e0b25a" />
        <path d="M33,4 L35,1" stroke="#a9721f" strokeWidth="1.5" />
        <path d="M2,13 L42,13 L38,26 L6,26 Z" fill="#c98f4f" />
        <path d="M8,17 L36,17 M10,21 L34,21" stroke="#a8743a" strokeWidth="1.4" />
      </>
    ),
  },
  helado: {
    w: 30, h: 22,
    dibujo: () => (
      <>
        <rect x="1" y="4" width="28" height="18" rx="3" fill="#f3e1e8" />
        <rect x="1" y="11" width="28" height="5" fill="#8a5a3c" />
        <rect x="0" y="1" width="30" height="5" rx="2" fill="#e8a0b8" />
      </>
    ),
  },
  arroz: {
    w: 26, h: 38,
    dibujo: () => (
      <>
        <path d="M2,6 L24,6 L26,38 L0,38 Z" fill="#f5efe0" {...BORDE} />
        <rect x="2" y="2" width="22" height="6" rx="1" fill="#e9dfc6" {...BORDE} />
        <ellipse cx="13" cy="24" rx="9" ry="7" fill="#ffffff" />
        {[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={9 + (i % 3) * 4} cy={22 + Math.floor(i / 3) * 4} rx="1.6" ry="0.9" fill="#d8cfb6" />)}
      </>
    ),
  },
  pasta: {
    w: 24, h: 38,
    dibujo: () => (
      <>
        <rect x="1" y="7" width="22" height="31" rx="5" fill="#eaf3f5" {...BORDE} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <rect key={i} x={4 + (i % 3) * 6} y={14 + Math.floor(i / 3) * 7} width="4" height="5" rx="1.5" fill="#f0c25a" />)}
        <rect x="0" y="1" width="24" height="7" rx="2" fill="#c9773b" />
      </>
    ),
  },
  cereales: {
    w: 26, h: 40,
    dibujo: () => (
      <>
        <rect x="0" y="0" width="26" height="40" rx="2" fill="#e8873a" />
        <path d="M5,24 Q13,34 21,24 Z" fill="#ffffff" />
        <circle cx="10" cy="22" r="2" fill="#a9721f" /><circle cx="15" cy="21" r="2" fill="#a9721f" />
        <rect x="4" y="5" width="18" height="6" rx="1" fill="#fbe3c8" />
      </>
    ),
  },
  lata: {
    w: 18, h: 24,
    dibujo: () => (
      <>
        <rect x="0" y="2" width="18" height="22" rx="2" fill="#c9ced2" />
        <rect x="0" y="7" width="18" height="12" fill="#d8b04a" />
        <ellipse cx="9" cy="2.5" rx="9" ry="2" fill="#e2e6e9" />
      </>
    ),
  },
  pan: {
    w: 46, h: 20,
    dibujo: () => (
      <>
        <path d="M2,20 Q0,4 23,3 Q46,4 44,20 Z" fill="#d99a52" />
        <path d="M14,8 L17,14 M23,7 L26,13 M32,8 L35,14" stroke="#b9772f" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  frutosSecos: {
    w: 24, h: 34,
    dibujo: () => (
      <>
        <rect x="1" y="7" width="22" height="27" rx="5" fill="#f3ece0" {...BORDE} />
        {[[7, 16], [14, 15], [10, 21], [17, 22], [7, 27], [14, 28]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx="3.2" ry="2.2" fill="#b9844a" />)}
        <rect x="0" y="1" width="24" height="7" rx="2" fill="#8a5a3c" />
      </>
    ),
  },
  snack: {
    w: 28, h: 36,
    dibujo: () => (
      <>
        <path d="M3,4 L25,4 L27,36 L1,36 Z" fill="#e9b443" />
        <path d="M3,4 L6,1 L9,4 L12,1 L15,4 L18,1 L21,4 L24,1 L25,4" fill="none" stroke="#c99a2e" strokeWidth="1.4" />
        <rect x="2" y="13" width="24" height="9" fill="#d6452f" />
        <circle cx="14" cy="29" r="4" fill="#f6dc7a" />
      </>
    ),
  },
  generico: {
    w: 30, h: 26,
    dibujo: () => (
      <>
        <rect x="0" y="4" width="30" height="22" rx="2" fill="#d8cfb6" />
        <rect x="12" y="4" width="6" height="22" fill="#c4b998" />
        <rect x="0" y="4" width="30" height="4" rx="2" fill="#e6dfca" />
      </>
    ),
  },
};

// Un alimento dibujado en un recuadro cuadrado de `tamano` (px, o unidades del dibujo si va dentro de
// otro SVG con x/y), escalado para que todos ocupen lo mismo y apoyado por abajo. Con `dibujo` (la clave
// que da dibujoPropio, logica/nevera.js), el dibujo propio del alimento, que ya viene hecho a la medida
// del recuadro; si no, el genérico de su `forma`.
export function IconoAlimento({ forma, dibujo, tamano = 40, x, y }) {
  const dentroDeOtroSvg = x !== undefined;
  const propio = dibujo && DIBUJOS_ALIMENTOS[dibujo];
  let contenido;
  if (propio) {
    contenido = propio();
  } else {
    const d = DIBUJOS[forma] || DIBUJOS.generico;
    const k = Math.min(40 / d.w, 40 / d.h);
    contenido = <g transform={`translate(${(48 - d.w * k) / 2} ${46 - d.h * k}) scale(${k})`}>{d.dibujo()}</g>;
  }
  return (
    <svg
      x={x} y={y} width={tamano} height={tamano} viewBox="0 0 48 48" aria-hidden="true"
      style={dentroDeOtroSvg ? undefined : { display: "block", flexShrink: 0 }}
    >
      {contenido}
    </svg>
  );
}

// Una fila de alimentos en miniatura dentro de un dibujo (la nevera vista con la puerta abriéndose, el
// estante de la escena): como mucho `max`, repartidos entre x0 y x1 y apoyados en `base`.
function FilaMini({ entradas, x0, x1, base, tamano, max = 4 }) {
  const visibles = entradas.slice(0, max);
  if (!visibles.length) return null;
  const paso = (x1 - x0) / visibles.length;
  return visibles.map((e, i) => (
    <IconoAlimento key={e.item.id} forma={e.forma} dibujo={e.dibujo} tamano={tamano} x={x0 + paso * i + (paso - tamano) / 2} y={base - tamano} />
  ));
}

const entradasDe = (huecos, ...claves) => huecos.filter((h) => claves.includes(h.clave)).flatMap((h) => h.entradas);

// Medidas del dibujo de la nevera (unidades del viewBox, 200 de ancho): el cuerpo mide 396 de alto y
// las patas asoman por debajo hasta 410. El congelador (arriba) llega hasta CORTE.
export const NEVERA_ANCHO = 200;
export const NEVERA_ALTO = 410;
export const CORTE = 123;
export const CUERPO_ALTO = 396;

// El cuerpo de la nevera con su interior, que solo se ve cuando una puerta se abre. La luz de cada
// compartimento se enciende al abrir su puerta (y se apaga al cerrarla), con una transición suave.
export function NeveraCuerpo({ tema, huecosNevera, huecosCongelador, luzNevera, luzCongelador, reducido }) {
  const transicionLuz = reducido ? "none" : "opacity 280ms ease 120ms";
  return (
    <svg viewBox={`0 0 ${NEVERA_ANCHO} ${NEVERA_ALTO}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden="true">
      <rect x="22" y="388" width="20" height="18" rx="4" fill={tema.cuerpoOscuro} />
      <rect x="158" y="388" width="20" height="18" rx="4" fill={tema.cuerpoOscuro} />
      <rect x="0" y="0" width={NEVERA_ANCHO} height={CUERPO_ALTO} rx={tema.radio} fill={tema.cuerpo} />

      {/* congelador */}
      <rect x="12" y="12" width="176" height={CORTE - 20} rx="20" fill={tema.escarcha} />
      <rect x="22" y="20" width="156" height={CORTE - 36} rx="12" fill={tema.interiorSombra} opacity="0.35" />
      <ellipse cx="100" cy="24" rx="44" ry="10" fill={tema.luz} style={{ opacity: luzCongelador ? 0.45 : 0, transition: transicionLuz }} />
      <FilaMini entradas={entradasDe(huecosCongelador, "carne", "frutaVerdura", "otros")} x0={20} x1={180} base={CORTE - 12} tamano={34} />
      <path d="M18,32 q8,-4 14,-12" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9" />

      {/* nevera */}
      <rect x="12" y={CORTE + 8} width="176" height={CUERPO_ALTO - CORTE - 20} rx="20" fill={tema.interior} />
      <rect x="22" y={CORTE + 17} width="156" height={CUERPO_ALTO - CORTE - 38} rx="12" fill={tema.interiorSombra} opacity="0.5" />
      <ellipse cx="100" cy={CORTE + 20} rx="48" ry="12" fill={tema.luz} style={{ opacity: luzNevera ? 0.45 : 0, transition: transicionLuz }} />
      <rect x="86" y={CORTE + 11} width="28" height="5" rx="2.5" fill={tema.luz} style={{ opacity: luzNevera ? 1 : 0.35, transition: transicionLuz }} />
      <FilaMini entradas={entradasDe(huecosNevera, "lacteos")} x0={18} x1={182} base={194} tamano={36} />
      <FilaMini entradas={entradasDe(huecosNevera, "carne")} x0={18} x1={182} base={257} tamano={36} />
      <FilaMini entradas={entradasDe(huecosNevera, "embutido", "otros")} x0={18} x1={182} base={320} tamano={36} />
      {[194, 257, 320].map((y) => (
        <g key={y}>
          <rect x="14" y={y} width="172" height="4" rx="2" fill={tema.balda} />
          <rect x="14" y={y} width="172" height="1.4" fill="#ffffff" opacity="0.8" />
        </g>
      ))}
      <FilaMini entradas={entradasDe(huecosNevera, "frutaVerdura")} x0={18} x1={182} base={368} tamano={34} max={5} />
      <rect x="18" y="362" width="164" height="16" rx="5" fill={tema.balda} opacity="0.88" />
      <rect x="26" y="365" width="148" height="2" rx="1" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

// Cara de fuera de una puerta: la chapa con su brillo, el tirador cromado y, en la de arriba, la
// insignia de las neveras de antes. La de arriba (congelador) tiene las esquinas de arriba redondas;
// la de abajo, las de abajo.
export function PuertaFrente({ tema, zona }) {
  const r = tema.radio;
  if (zona === "congelador") {
    const h = CORTE;
    return (
      <svg viewBox={`0 0 ${NEVERA_ANCHO} ${h}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
        <path d={`M0,${h} L0,${r} Q0,0 ${r},0 L${NEVERA_ANCHO - r},0 Q${NEVERA_ANCHO},0 ${NEVERA_ANCHO},${r} L${NEVERA_ANCHO},${h} Z`} fill={tema.cuerpo} />
        <rect x="0" y={h - 3} width={NEVERA_ANCHO} height="3" fill={tema.cuerpoOscuro} />
        <rect x="14" y="30" width="9" height={h - 46} rx="4.5" fill={tema.brillo} opacity="0.7" />
        <rect x="64" y="26" width="72" height="11" rx="5.5" fill={tema.tirador} />
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={76 + i * 12} cy="31.5" r="2" fill={tema.tiradorOscuro} />)}
        <rect x="178" y={h - 63} width="9" height="47" rx="4.5" fill={tema.tirador} />
        <rect x="180" y={h - 59} width="3" height="39" rx="1.5" fill="#ffffff" opacity="0.6" />
      </svg>
    );
  }
  const h = CUERPO_ALTO - CORTE;
  return (
    <svg viewBox={`0 0 ${NEVERA_ANCHO} ${h}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <path d={`M0,0 L${NEVERA_ANCHO},0 L${NEVERA_ANCHO},${h - r} Q${NEVERA_ANCHO},${h} ${NEVERA_ANCHO - r},${h} L${r},${h} Q0,${h} 0,${h - r} Z`} fill={tema.cuerpo} />
      <rect x="14" y="12" width="9" height={h - 40} rx="4.5" fill={tema.brillo} opacity="0.7" />
      <rect x="178" y="16" width="9" height="70" rx="4.5" fill={tema.tirador} />
      <rect x="180" y="20" width="3" height="62" rx="1.5" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

// Cara de dentro de una puerta, la que se ve al abrirla. La de la nevera lleva sus baldas de puerta con
// lo que va en ellas (bebidas, huevos...); la del congelador, solo una balda vacía.
export function PuertaDorso({ tema, zona, entradasPuerta = [] }) {
  const h = zona === "congelador" ? CORTE : CUERPO_ALTO - CORTE;
  const baldas = zona === "congelador" ? [h * 0.7] : [h * 0.3, h * 0.6, h * 0.9];
  return (
    <svg viewBox={`0 0 ${NEVERA_ANCHO} ${h}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <rect x="0" y="0" width={NEVERA_ANCHO} height={h} rx={tema.radio * 0.6} fill={tema.cuerpoOscuro} />
      <rect x="10" y="10" width={NEVERA_ANCHO - 20} height={h - 20} rx="16" fill={tema.puertaInterior} />
      {baldas.map((yb, i) => (
        <g key={i}>
          {zona !== "congelador" && <FilaMini entradas={entradasPuerta.slice(i * 3, i * 3 + 3)} x0={20} x1={180} base={yb + 6} tamano={46} max={3} />}
          <rect x="10" y={yb} width={NEVERA_ANCHO - 20} height="18" rx="4" fill={tema.balda} opacity="0.92" />
          <rect x="10" y={yb} width={NEVERA_ANCHO - 20} height="2" fill="#ffffff" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

// El estante de la despensa, con sus cuatro baldas y, en cada una, lo primero que hay en ese hueco.
export const ESTANTE_ANCHO = 200;
export const ESTANTE_ALTO = 300;
const BALDAS_ESTANTE = [76, 146, 216, 286];

export function Estante({ tema, huecos }) {
  return (
    <svg viewBox={`0 0 ${ESTANTE_ANCHO} ${ESTANTE_ALTO}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
      <rect x="12" y="8" width="176" height="284" rx="6" fill={tema.fondoEstante} />
      {huecos.map((h, i) => (
        <FilaMini key={h.clave} entradas={h.entradas} x0={20} x1={180} base={BALDAS_ESTANTE[i]} tamano={40} />
      ))}
      <rect x="4" y="2" width="12" height="296" rx="4" fill={tema.madera} />
      <rect x="184" y="2" width="12" height="296" rx="4" fill={tema.madera} />
      <rect x="2" y="0" width="196" height="10" rx="4" fill={tema.madera} />
      {BALDAS_ESTANTE.map((y) => (
        <g key={y}>
          <rect x="4" y={y} width="192" height="9" rx="3" fill={tema.madera} />
          <rect x="4" y={y + 6} width="192" height="3" fill={tema.maderaOscura} opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

// ---------- La cocina de alrededor (capas 2 y 3) ----------
// Medidas de la escena completa (unidades del viewBox). La nevera y el estante no se dibujan aquí: son
// piezas aparte que se tocan y se animan (ui/despensa/cocina.jsx las coloca encima, en estas mismas
// unidades); esto es el fondo: pared, azulejos, encimera con sus muebles y suelo, más el fregadero con
// su grifo y la vitrocerámica, que también se pueden tocar. La lámpara, la planta y el frutero, que se
// mueven al tocarlos, van aparte (ui/despensa/detalles.jsx).
export const ESCENA_ANCHO = 360;
export const ESCENA_ALTO = 470;
export const SUELO_Y = 440;
const ENCIMERA_Y = 280;
const ENCIMERA_ANCHO = 180;
// Dónde cae la gota del grifo: sale del caño y acaba dentro del fregadero.
const GOTA = { x: 40, y: 250, caida: 34 };
// El mueble de debajo del fregadero: su puerta es una pieza aparte (se abre, ver cocina.jsx) y aquí se
// dibuja lo que hay detrás: el sifón, que baja recto hasta una botella de detergente vacía que recoge el
// agua del grifo, y hasta dos botes de limpieza.
export const MUEBLE_FREGADERO = { x: 8, y: ENCIMERA_Y + 32, w: 78, h: 112 };
const COLORES_BOTES = ["#6aa6d9", "#e47a9a"];
// Dónde está cada cosa de dentro del mueble: de pie, y caída en el suelo cuando la botella se desborda.
// Cada dibujo tiene el origen en el centro de su base, así que se coloca con un translate y un giro, y
// la caída es la transición entre las dos posiciones. La botella cae hacia la derecha y se queda tumbada
// delante del mueble, sin llegar a la puerta abierta (que, al ser HTML, se pintaría por encima); los
// botes, un poco más allá, sobre el charco.
const BASE_MUEBLE = MUEBLE_FREGADERO.y + MUEBLE_FREGADERO.h - 6;
const BOTELLA_DE_PIE = { x: 44, y: BASE_MUEBLE, giro: 0 };
const BOTELLA_CAIDA = { x: 24, y: SUELO_Y - 6, giro: 90 };
const BOTES_DE_PIE = [{ x: 20, y: BASE_MUEBLE, giro: 0 }, { x: 73, y: BASE_MUEBLE, giro: 0 }];
const BOTES_CAIDOS = [{ x: 100, y: SUELO_Y + 8, giro: 84 }, { x: 168, y: SUELO_Y + 15, giro: -82 }];
// El charco crece desde la boca de la botella tumbada y se extiende por delante de todo lo caído (más
// cerca de quien mira), para que se vea bien aunque la botella y los botes estén encima. Es un óvalo
// grande con dos lóbulos a los lados, para que no parezca una alfombra.
const CHARCO = { cx: 100, cy: SUELO_Y + 18, rx: 86, ry: 10, origen: `86px ${SUELO_Y + 14}px` };

// `fuegoEncendido`: el fuego de delante se enciende un momento al tocar la vitrocerámica, justo antes de
// ir a «¿Qué cocino?». `gota`: null, "arriba" (recién salida del grifo) o "abajo" (cayendo).
// `cosasFregadero`: cuántas cosas hay pendientes en la lista de limpieza; se ven tantos botes (hasta
// dos) al abrir el mueble de debajo del fregadero. `nivelAgua` (0 a 1): lo llena que está la botella.
// `derrame`: null, "lleno" (la botella acaba de llenarse y la puerta se está abriendo), "charco" (la
// botella y los botes, en el suelo, con el charco) o "recogiendo" (todo vuelve a su sitio); ver
// VistaDibujo en cocina.jsx.
export function FondoCocina({ tema, fuegoEncendido, gota, reducido, cosasFregadero = 0, nivelAgua = 0, derrame = null }) {
  const m = MUEBLE_FREGADERO;
  const transicion = reducido ? "none" : "opacity 200ms ease, stroke 200ms ease";
  const caida = derrame === "charco";
  // Al caer, el agua se vacía en el charco; justo antes, la botella se ve llena del todo.
  const nivel = derrame === "lleno" ? 1 : caida ? 0 : nivelAgua;
  // Al caer, cada cosa acelera (como si cayera de verdad) y con un pequeño retraso distinto; al recoger,
  // vuelven todas a la vez y frenando.
  const colocar = (p, retraso) => ({
    transform: `translate(${p.x}px, ${p.y}px) rotate(${p.giro}deg)`,
    transition: reducido ? "none" : caida ? `transform 520ms cubic-bezier(.5,0,.85,.6) ${retraso}ms` : "transform 420ms ease-out",
  });
  const azulejos = [];
  for (let fila = 0; fila < 5; fila++) {
    const y = 212 + fila * 13.6;
    azulejos.push(<rect key={`h${fila}`} x="0" y={y} width={ENCIMERA_ANCHO} height="1.2" fill={tema.juntas} />);
    for (let x = fila % 2 ? 9 : 18; x < ENCIMERA_ANCHO; x += 18) {
      azulejos.push(<rect key={`v${fila}-${x}`} x={x} y={y} width="1.2" height="13.6" fill={tema.juntas} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${ESCENA_ANCHO} ${ESCENA_ALTO}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <clipPath id="cocina-recorte">
          <rect x="0" y="0" width={ESCENA_ANCHO} height={ESCENA_ALTO} rx="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#cocina-recorte)">
        <rect x="0" y="0" width={ESCENA_ANCHO} height={ESCENA_ALTO} fill={tema.pared} />

        {/* azulejos detrás de la encimera */}
        <rect x="0" y="212" width={ENCIMERA_ANCHO} height={ENCIMERA_Y - 212} fill={tema.azulejo} />
        {azulejos}

        {/* suelo, y la sombra de la nevera sobre él */}
        <rect x="0" y={SUELO_Y} width={ESCENA_ANCHO} height={ESCENA_ALTO - SUELO_Y} fill={tema.suelo} />
        <rect x="0" y={SUELO_Y} width={ESCENA_ANCHO} height="2" fill="#000000" opacity="0.06" />
        <ellipse cx="267" cy={SUELO_Y + 6} rx="82" ry="5" fill="#000000" opacity="0.12" />

        {/* muebles bajos */}
        <rect x="0" y={ENCIMERA_Y + 22} width={ENCIMERA_ANCHO - 2} height={SUELO_Y - ENCIMERA_Y - 22} fill={tema.mueble} />
        <rect x="94" y={ENCIMERA_Y + 32} width="78" height="112" rx="6" fill={tema.mueble} stroke={tema.muebleOscuro} strokeWidth="2" />
        <rect x={94 + 62} y={ENCIMERA_Y + 44} width="6" height="26" rx="3" fill={tema.metalClaro} />

        {/* dentro del mueble de debajo del fregadero: se ve al abrir su puerta */}
        <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="6" fill={tema.interiorMueble} />
        <rect x={m.x + 4} y={m.y + 4} width={m.w - 8} height={m.h - 8} rx="4" fill="#000000" opacity="0.12" />
        <TuberiaFregadero tema={tema} x={BOTELLA_DE_PIE.x} desde={m.y} hasta={BOTELLA_DE_PIE.y + BOCA_BOTELLA} />
        <rect x="0" y={SUELO_Y - 8} width={ENCIMERA_ANCHO - 2} height="8" fill={tema.muebleOscuro} />

        {/* El charco, la botella y los botes van después del zócalo: tumbados en el suelo quedan por
            delante de él. De pie, dentro del mueble, la puerta cerrada los tapa. */}
        <g
          style={{
            transformOrigin: CHARCO.origen, transform: caida ? "scale(1)" : "scale(0.05)", opacity: caida ? 1 : 0,
            transition: reducido ? "none" : caida ? "transform 600ms ease-out 320ms, opacity 200ms ease 320ms" : "transform 420ms ease-in, opacity 420ms ease-in",
          }}
        >
          <ellipse cx={CHARCO.cx} cy={CHARCO.cy} rx={CHARCO.rx} ry={CHARCO.ry} fill={tema.charco} />
          <ellipse cx={CHARCO.cx - 66} cy={CHARCO.cy + 4} rx="26" ry="7" fill={tema.charco} />
          <ellipse cx={CHARCO.cx + 70} cy={CHARCO.cy + 3} rx="24" ry="7" fill={tema.charco} />
          <ellipse cx={CHARCO.cx - 40} cy={CHARCO.cy + 6} rx="22" ry="2.6" fill={tema.charcoOscuro} opacity="0.7" />
          <ellipse cx={CHARCO.cx + 46} cy={CHARCO.cy + 6} rx="16" ry="2.2" fill={tema.charcoOscuro} opacity="0.6" />
          <ellipse cx={CHARCO.cx + 4} cy={CHARCO.cy + 5} rx="24" ry="1.8" fill={tema.charcoBrillo} opacity="0.8" />
        </g>
        <g style={colocar(caida ? BOTELLA_CAIDA : BOTELLA_DE_PIE, 0)}>
          <BotellaFregadero tema={tema} nivel={nivel} reducido={reducido} />
        </g>
        {COLORES_BOTES.slice(0, Math.min(2, cosasFregadero)).map((color, i) => (
          <g key={color} style={colocar(caida ? BOTES_CAIDOS[i] : BOTES_DE_PIE[i], 120 + i * 100)}>
            <BoteLimpieza color={color} />
          </g>
        ))}

        {/* encimera: la superficie (vista un poco desde arriba) y el canto */}
        <rect x="0" y={ENCIMERA_Y} width={ENCIMERA_ANCHO} height="16" fill={tema.encimera} />
        <rect x="0" y={ENCIMERA_Y} width={ENCIMERA_ANCHO} height="2" fill="#ffffff" opacity="0.5" />
        <rect x="0" y={ENCIMERA_Y + 16} width={ENCIMERA_ANCHO} height="8" fill={tema.encimeraCanto} />

        {/* fregadero y grifo */}
        <ellipse cx="44" cy={ENCIMERA_Y + 8} rx="30" ry="5.5" fill={tema.metalClaro} />
        <ellipse cx="44" cy={ENCIMERA_Y + 8.5} rx="25" ry="4" fill={tema.metal} opacity="0.55" />
        <path d={`M64,${ENCIMERA_Y + 4} L64,248 Q64,238 54,238 L46,238 Q40,238 40,244 L40,246`} fill="none" stroke={tema.metal} strokeWidth="5" strokeLinecap="round" />
        <rect x="66" y="258" width="10" height="5" rx="2.5" fill={tema.metal} />
        {gota && (
          <circle
            cx={GOTA.x} cy={GOTA.y} r="2.6" fill={tema.agua}
            style={{
              transform: gota === "abajo" ? `translateY(${GOTA.caida}px)` : "none",
              opacity: gota === "abajo" ? 0 : 1,
              transition: gota === "abajo" ? "transform 480ms cubic-bezier(.55,0,.9,.55), opacity 200ms ease-in 300ms" : "none",
            }}
          />
        )}

        {/* vitrocerámica, con una sartén en el fuego de atrás */}
        <rect x="92" y={ENCIMERA_Y + 1} width="80" height="13" rx="3" fill={tema.vitro} />
        <ellipse cx="114" cy={ENCIMERA_Y + 8} rx="13" ry="3.4" fill={tema.fuego} style={{ opacity: fuegoEncendido ? 0.9 : 0, transition: transicion }} />
        <ellipse cx="114" cy={ENCIMERA_Y + 8} rx="13" ry="3.4" fill="none" stroke={fuegoEncendido ? tema.fuego : "#77756c"} strokeWidth="1.4" style={{ transition: transicion }} />
        <ellipse cx="152" cy={ENCIMERA_Y + 7.5} rx="15" ry="3.8" fill="none" stroke="#77756c" strokeWidth="1.4" />
        <ellipse cx="152" cy={ENCIMERA_Y + 4} rx="15" ry="4.2" fill="#55554f" />
        <rect x="164" y={ENCIMERA_Y + 1.5} width="14" height="3.4" rx="1.7" fill="#55554f" />

        {/* La lámpara del techo, la planta de encima de la nevera y el frutero de la repisa se tocan y se
            mueven: están en ui/despensa/detalles.jsx, encima de este fondo. */}
      </g>
    </svg>
  );
}

// ---------- Debajo del fregadero ----------
// El sifón de plástico blanco, que baja recto desde el desagüe hasta la boca de la botella (idea del
// usuario: nada de cañerías hacia un lado o hacia la pared). `desde` es donde empieza (arriba del todo
// del mueble) y `hasta`, la boca de la botella; necesita al menos 36 unidades para el vaso del sifón.
export function TuberiaFregadero({ tema, x, desde, hasta }) {
  const vaso = desde + 14;
  return (
    <g>
      {/* la cola del desagüe, de metal, y la tuerca donde empieza el plástico */}
      <rect x={x - 4} y={desde} width="8" height="6" fill={tema.metal} />
      <rect x={x - 6} y={desde + 5} width="12" height="5" rx="1.5" fill={tema.tuberia} stroke={tema.tuberiaSombra} strokeWidth="1" />
      {/* el tubo recto, con su sombra a un lado */}
      <rect x={x - 3.5} y={desde + 9} width="7" height={hasta - desde - 9} fill={tema.tuberia} />
      <rect x={x + 1.5} y={desde + 9} width="2" height={hasta - desde - 9} fill={tema.tuberiaSombra} />
      {/* el vaso del sifón, más ancho, con la tuerca de abajo */}
      <rect x={x - 7} y={vaso} width="14" height="18" rx="4" fill={tema.tuberia} stroke={tema.tuberiaSombra} strokeWidth="1" />
      <rect x={x + 2} y={vaso + 2} width="3" height="12" rx="1.5" fill={tema.tuberiaSombra} />
      <rect x={x - 8} y={vaso + 14} width="16" height="4" rx="1.5" fill={tema.tuberiaSombra} />
    </g>
  );
}

// La boca de la botella está a esta altura sobre su base: ahí acaba el sifón.
export const BOCA_BOTELLA = -58;

// Botella de detergente vacía que recoge el agua del grifo (idea del usuario: verde, con el asa a la
// derecha y sin etiqueta). Origen en la base, justo debajo de la boca: el cuerpo va de x −14 a 20 y de
// y −61 a 0. El asa es un hueco del propio contorno (fillRule evenodd). `nivel`, de 0 a 1: el agua es un
// rectángulo dentro de un <svg> anidado, que recorta lo que se sale de él, y sube o baja con un
// translate (así la transición es solo de transform, que va fluida en cualquier navegador). El agua no
// pasa de la altura del asa, para no pintarse en su hueco.
export function BotellaFregadero({ tema, nivel, reducido }) {
  const alto = 32;
  return (
    <>
      <path
        d="M-8,0 L14,0 Q20,0 20,-6 L20,-48 Q20,-55 13,-55 L5,-55 L5,-58 L-5,-58 L-5,-52 Q-14,-48 -14,-38 L-14,-6 Q-14,0 -8,0 Z M9,-50 L13,-50 Q15,-50 15,-48 L15,-40 Q15,-38 13,-38 L9,-38 Q7,-38 7,-40 L7,-48 Q7,-50 9,-50 Z"
        fill={tema.botella} fillRule="evenodd"
      />
      <svg x="-11" y={-4 - alto} width="28" height={alto} overflow="hidden">
        <rect
          x="0" y="0" width="28" height={alto} fill={tema.charco} opacity="0.8"
          style={{ transform: `translateY(${(1 - nivel) * alto}px)`, transition: reducido ? "none" : "transform 420ms ease-out" }}
        />
      </svg>
      <rect x="-11" y="-34" width="3" height="26" rx="1.5" fill="#ffffff" opacity="0.4" />
      <rect x="-6.5" y="-61" width="13" height="6" rx="2" fill={tema.botellaOscura} />
    </>
  );
}

// Un bote de limpieza (spray), con el origen en el centro de su base.
function BoteLimpieza({ color }) {
  return (
    <>
      <rect x="-6" y="-24" width="12" height="24" rx="3" fill={color} />
      <rect x="-3" y="-31" width="6" height="8" rx="1.5" fill="#f5f0e1" />
      <rect x="2" y="-31" width="6" height="3" rx="1.5" fill="#f5f0e1" />
      <rect x="-4" y="-16" width="8" height="7" rx="1" fill="#ffffff" opacity="0.6" />
    </>
  );
}

// Cara de fuera de la puerta del mueble de debajo del fregadero (la bisagra está a la derecha, así que el
// tirador va a la izquierda) y su cara de dentro, que se ve al abrirla.
export function PuertaMuebleFrente({ tema }) {
  const m = MUEBLE_FREGADERO;
  return (
    <svg viewBox={`0 0 ${m.w} ${m.h}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <rect x="1" y="1" width={m.w - 2} height={m.h - 2} rx="6" fill={tema.mueble} stroke={tema.muebleOscuro} strokeWidth="2" />
      <rect x="10" y="12" width="6" height="26" rx="3" fill={tema.metalClaro} />
    </svg>
  );
}

export function PuertaMuebleDorso({ tema }) {
  const m = MUEBLE_FREGADERO;
  return (
    <svg viewBox={`0 0 ${m.w} ${m.h}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden="true">
      <rect x="0" y="0" width={m.w} height={m.h} rx="6" fill={tema.muebleOscuro} />
      <rect x="6" y="6" width={m.w - 12} height={m.h - 12} rx="4" fill={tema.mueble} opacity="0.6" />
    </svg>
  );
}
