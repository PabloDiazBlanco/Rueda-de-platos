// ---------- ui/despensa/alimentos.jsx ----------
// Un dibujo propio para cada alimento del catálogo base (FOODS_SEED, los 43), en el estilo retro de la
// cocina: formas planas y redondeadas, sin trazos negros, con un brillo blanco suave y el mismo borde
// claro que el resto de la comida dibujada (ui/despensa/dibujos.jsx). Decisión estética del 26-oct-2026
// (local/ideas/esteticas/registro.md, bloque COCINA; maquetas v2-07-cocina.html y 07-cocina-detalles.html):
// con los dibujos genéricos por forma todo lo que era carne salía como la misma bandeja y todo el pescado
// como el mismo pez, y la pegatina del emoji que se puso en F3 cambiaba de aspecto en cada móvil y no
// seguía los colores de la cocina. Los de la maqueta (pollo, salmón, merluza, atún, pimiento, cebolla,
// garbanzos, pasta, pavo, hamburguesa y la fruta del frutero) se han pasado tal cual o casi; el resto
// están dibujados aquí con la misma mano.
//
// Cada dibujo ocupa una caja de 48 × 48 (el viewBox de IconoAlimento) y se apoya abajo, hacia y = 44-46,
// para que en una balda todos queden de pie sobre ella. Tienen que reconocerse a tamaño de ficha (46 px
// en el interior de la nevera), en miniatura (34 px, dentro del dibujo de la escena) y en la lista (22
// px), así que cada uno lleva una sola idea clara y algún detalle de color que lo distinga de su vecino:
// la etiqueta amarilla es «pollo» y la roja «ternera/cerdo», el puré lleva su cuchara y su zanahoria, la
// mozzarella sale rallada en su bolsa...
//
// Como el resto de la comida dibujada, los colores son fijos (una manzana es roja en cualquier estilo de
// cocina); los del tema (ui/despensa/tema.js) son los de la nevera y la cocina de alrededor.
//
// Las claves son los ids de FOODS_SEED, que no cambian nunca. Qué alimento lleva su dibujo propio lo decide
// logica/nevera.js (dibujoPropio): los que crea el usuario siguen con su emoji.
import React from "react";

// Borde fino y claro para lo blanco o casi (yogures, bolsas, tazas), igual que en dibujos.jsx.
const B = { stroke: "#cfc8b6", strokeWidth: 0.9, strokeLinejoin: "round" };
const ETIQUETA_POLLO = "#f2c14e";
const ETIQUETA_CARNE = "#d6452f";

// Bandeja de carnicería (corcho blanco), con la etiqueta de color que dice qué carne es.
function bandeja(etiqueta) {
  return (
    <>
      <rect x="3" y="35" width="42" height="9" rx="3" fill="#ece7da" {...B} />
      <rect x="5" y="35" width="38" height="2" rx="1" fill="#ffffff" opacity="0.7" />
      {etiqueta && <rect x="29" y="38.5" width="13" height="4" rx="1" fill={etiqueta} />}
    </>
  );
}

// Carne picada en su bandeja: un montón con las vetas retorcidas de la picadora.
function picada(carne, vetas, etiqueta) {
  const ondas = [
    "M9,33 q2,-3 4,0 q2,3 4,0 q2,-3 4,0", "M23,33 q2,-3 4,0 q2,3 4,0 q2,-3 4,0", "M13,28 q2,-3 4,0 q2,3 4,0 q2,-3 4,0 q2,3 4,0",
    "M18,23.5 q2,-3 4,0 q2,3 4,0 q2,-3 4,0",
  ];
  return (
    <>
      {bandeja(etiqueta)}
      <path d="M5,36 Q6,22 16,20 Q24,17 33,20 Q43,23 43,36 Z" fill={carne} />
      {ondas.map((d) => <path key={d} d={d} fill="none" stroke={vetas} strokeWidth="1.5" strokeLinecap="round" />)}
    </>
  );
}

// Un cuenco blanco con una raya de color, como los de loza de antes. Lo de dentro se pinta antes.
function cuenco(raya) {
  return (
    <>
      <path d="M4,28 Q5,44 24,45 Q43,44 44,28 Z" fill="#fbf8f0" {...B} />
      <path d="M6.5,34 Q24,37 41.5,34" fill="none" stroke={raya} strokeWidth="2" />
      <path d="M9,31 Q10,38 16,41" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

// Frasco de cristal con tapa, para las legumbres en conserva.
function frasco(tapa) {
  return (
    <>
      <rect x="12" y="12" width="24" height="32" rx="5" fill="rgba(220,236,240,0.7)" stroke="#b9cfd4" strokeWidth="1.4" />
      <rect x="11" y="8" width="26" height="6" rx="2" fill={tapa} />
    </>
  );
}

// Brillo blanco de lo redondo (fruta, verdura): una media luna arriba a la izquierda.
const brillo = (d) => <path d={d} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.45" />;

export const DIBUJOS_ALIMENTOS = {
  // ---------- Proteínas ----------
  f_pechuga_pollo: () => (
    <>
      {bandeja(ETIQUETA_POLLO)}
      <path d="M5,35 Q4,25 13,22 Q23,19 28,25 Q31,31 26,36 Z" fill="#f6c6b3" />
      <path d="M19,36 Q17,27 27,24 Q39,21 43,29 Q45,35 41,36 Z" fill="#f2b5a0" />
      <path d="M9,29 Q15,24 22,25" fill="none" stroke="#fde4da" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24,31 Q30,26 38,27" fill="none" stroke="#fde4da" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  f_hamb_pollo: () => (
    <>
      {bandeja(ETIQUETA_POLLO)}
      {[15, 33].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="31.5" rx="10.5" ry="5.5" fill="#e9c39c" />
          <ellipse cx={cx} cy="30" rx="10.5" ry="5" fill="#f4d8b9" />
          {[-5, 0, 5].map((d) => <circle key={d} cx={cx + d} cy={29.5 + (d === 0 ? -1.5 : 0.5)} r="0.9" fill="#e2b48a" />)}
        </g>
      ))}
    </>
  ),
  f_picada_pollo: () => picada("#f4c8b6", "#e8a58f", ETIQUETA_POLLO),
  f_picada_mixta: () => picada("#c9524a", "#e88e82", ETIQUETA_CARNE),
  f_hamb_mixta: () => (
    <>
      {bandeja(ETIQUETA_CARNE)}
      <ellipse cx="15" cy="31" rx="11" ry="6" fill="#8a4a2f" />
      <ellipse cx="33" cy="30" rx="11" ry="6" fill="#9a5636" />
      <path d="M9,30 L20,28 M27,29 L38,27" stroke="#5e2f1c" strokeWidth="1.4" />
    </>
  ),
  f_salmon: () => (
    <>
      <path d="M6,20 L40,16 Q44,16 44,20 L44,32 Q44,36 40,36 L8,36 Q4,36 4,32 L4,23 Q4,20 6,20 Z" fill="#f2946a" />
      <path d="M12,19 L9,36 M20,18 L17,36 M28,17 L25,36 M36,16 L33,36" stroke="#fbd0b8" strokeWidth="1.8" />
      <path d="M4,32 L44,32 L44,34 Q44,36 40,36 L8,36 Q4,36 4,34 Z" fill="#a6b7c0" />
    </>
  ),
  f_merluza: () => (
    <>
      <ellipse cx="24" cy="31" rx="18" ry="11" fill="#7f8f98" />
      <ellipse cx="24" cy="30" rx="15.6" ry="9.2" fill="#f7f5ee" />
      <path d="M24,22 L24,38 M14,30 L34,30" stroke="#e3e0d4" strokeWidth="1.4" />
      <circle cx="24" cy="30" r="2" fill="#cfc8b6" />
    </>
  ),
  f_atun: () => (
    <>
      <ellipse cx="24" cy="38" rx="18" ry="6" fill="#9aa3a8" />
      <rect x="6" y="28" width="36" height="10" fill="#4a86c5" />
      <ellipse cx="24" cy="28" rx="18" ry="6" fill="#d5dadd" {...B} />
      <ellipse cx="24" cy="28" rx="14" ry="4" fill="none" stroke="#aab5ba" />
      <path d="M16,33 Q22,30 28,33 L32,31 L32,35 L28,33 Q22,36 16,33 Z" fill="#ffffff" opacity="0.85" />
    </>
  ),
  f_sardinas: () => (
    <>
      <path d="M38,22 Q46,16 41,9" fill="none" stroke="#aab5ba" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="3" y="21" width="42" height="22" rx="7" fill="#c9ced2" {...B} />
      <rect x="6" y="24" width="36" height="16" rx="5" fill="#e3c873" />
      {[27.5, 32, 36.5].map((y, i) => (
        <g key={y}>
          <path d={`M9,${y} Q20,${y - 3.4} ${33 - i},${y} Q20,${y + 3.4} 9,${y} Z`} fill="#a7bccb" />
          <path d={`M10,${y - 0.6} Q20,${y - 3} ${32 - i},${y - 0.6}`} fill="none" stroke="#5f7d92" strokeWidth="1.2" />
          <path d={`M${33 - i},${y} L${39 - i},${y - 2.6} L${39 - i},${y + 2.6} Z`} fill="#8fa9bb" />
        </g>
      ))}
    </>
  ),
  f_huevo: () => (
    <>
      {[9, 19, 29, 39].map((cx, i) => (
        <ellipse key={cx} cx={cx} cy="29" rx="5.2" ry="6.6" fill={i === 1 ? "#fbf8f0" : "#f3dcb4"} {...B} />
      ))}
      <path d="M2,32 Q7,37 12,32 Q17,37 22,32 Q27,37 32,32 Q37,37 42,32 Q45,34 46,32 L43,44 L5,44 Z" fill="#cbbd9c" />
      <path d="M4,38 L44,38" stroke="#b5a582" strokeWidth="1.2" />
    </>
  ),

  // ---------- Embutido y fiambre ----------
  f_pavo: () => (
    <>
      <ellipse cx="22" cy="36" rx="17" ry="7" fill="#f3dcc8" stroke="#e2c3a6" />
      <ellipse cx="25" cy="30" rx="17" ry="7" fill="#f6e3d2" stroke="#e2c3a6" />
      <ellipse cx="28" cy="24" rx="16" ry="6.5" fill="#f9ebde" stroke="#e2c3a6" />
      <path d="M18,24 Q28,21 38,24" stroke="#ffffff" strokeWidth="1.4" fill="none" />
    </>
  ),
  f_jamon: () => (
    <>
      <path d="M41,8 Q38,4 35,8" fill="none" stroke="#e8dcc0" strokeWidth="1.4" />
      <path d="M5,38 Q1,26 11,18 Q22,9 33,12 L39,8 L44,12 L38,18 Q43,32 31,40 Q18,47 5,38 Z" fill="#c98b4f" />
      <path d="M39,7 L46,11 L44,14 L37,10 Z" fill="#4a3426" />
      <g transform="rotate(-32 17 32)">
        <ellipse cx="17" cy="32" rx="11" ry="7.5" fill="#f3e1c6" />
        <ellipse cx="17" cy="32.5" rx="8.6" ry="5.6" fill="#b5373a" />
        <path d="M11,32 Q17,29 23,32" fill="none" stroke="#e07a6a" strokeWidth="1.2" />
      </g>
      {brillo("M14,17 Q20,13 27,13")}
    </>
  ),
  f_lomo: () => (
    <>
      <g transform="rotate(-18 28 20)">
        <rect x="11" y="13" width="34" height="13" rx="6.5" fill="#7c2a22" />
        {[17, 23, 29, 35].map((x) => <path key={x} d={`M${x},13 L${x + 4},26`} stroke="#a8584a" strokeWidth="1" opacity="0.8" />)}
      </g>
      {[[14, 35, 9], [32, 38, 7.5]].map(([cx, cy, r]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={r} fill="#8e2f25" />
          <circle cx={cx} cy={cy} r={r - 2} fill="#c8483b" />
          <circle cx={cx - r / 3} cy={cy - r / 4} r="1.3" fill="#ec9a8c" />
          <circle cx={cx + r / 4} cy={cy + r / 3} r="1" fill="#ec9a8c" />
          <circle cx={cx + r / 3} cy={cy - r / 3} r="0.8" fill="#ec9a8c" />
        </g>
      ))}
    </>
  ),

  // ---------- Carbohidratos ----------
  f_pasta: () => (
    <>
      <rect x="13" y="12" width="22" height="32" rx="5" fill="#eaf3f5" {...B} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x={16 + (i % 3) * 6} y={18 + Math.floor(i / 3) * 8} width="4" height="5.5" rx="1.5" fill="#f0c25a" />
      ))}
      <rect x="12" y="6" width="24" height="7" rx="2" fill="#c9773b" />
    </>
  ),
  f_arroz_basmati: () => (
    <>
      <path d="M10,11 L38,11 L41,44 L7,44 Z" fill="#f7f1e2" {...B} />
      <rect x="10" y="6" width="28" height="6" rx="1.5" fill="#d9a441" />
      <path d="M9.3,18 L38.7,18 L39.3,25 L8.7,25 Z" fill="#3d8b5a" />
      <ellipse cx="24" cy="35" rx="10.5" ry="6" fill="#ffffff" {...B} />
      {[[19, 33, 20], [24, 32, -15], [29, 34, 30], [21, 37, -30], [27, 37, 10], [24, 35, 70]].map(([x, y, g]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.4" ry="0.9" fill="#e6dbbf" transform={`rotate(${g} ${x} ${y})`} />
      ))}
    </>
  ),
  f_patata: () => (
    <>
      <ellipse cx="17" cy="34" rx="13" ry="9" fill="#c99d62" transform="rotate(-12 17 34)" />
      <ellipse cx="32" cy="37" rx="11.5" ry="7.5" fill="#b8874f" transform="rotate(10 32 37)" />
      {[[12, 31], [20, 36], [17, 29], [29, 37], [36, 35]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x - 1.4},${y} q1.4,-1.4 2.8,0`} fill="none" stroke="#8a6436" strokeWidth="1.1" strokeLinecap="round" />
      ))}
      {brillo("M9,30 Q12,26 17,25.5")}
    </>
  ),
  f_gnocchi: () => (
    <>
      <rect x="3" y="33" width="42" height="11" rx="3" fill="#e9e5da" {...B} />
      {[[10, 31], [19, 32], [28, 31], [37, 32], [14, 25.5], [23, 26], [32, 25.5], [19, 20], [28, 20.5]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y} rx="5" ry="3.6" fill="#f4dc9a" stroke="#e2c271" strokeWidth="0.7" />
          <path d={`M${x - 2.4},${y - 2} L${x - 2.4},${y + 2} M${x},${y - 2.6} L${x},${y + 2.6} M${x + 2.4},${y - 2} L${x + 2.4},${y + 2}`} stroke="#d9b45a" strokeWidth="0.8" />
        </g>
      ))}
      <rect x="31" y="37" width="4" height="4" fill="#3d8b5a" />
      <rect x="35" y="37" width="4" height="4" fill="#ffffff" />
      <rect x="39" y="37" width="4" height="4" fill="#d6452f" />
    </>
  ),

  // ---------- Legumbres ----------
  f_garbanzos_cocidos: () => (
    <>
      {frasco("#d9a441")}
      {[[17, 39], [24, 40], [31, 39], [20, 34], [28, 34], [17, 29], [24, 28], [31, 29], [21, 23], [28, 23]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#e6c27a" stroke="#c99d62" strokeWidth="0.7" />
      ))}
    </>
  ),

  // ---------- Panes ----------
  f_pan_molde: () => {
    const rebanada = "M0,36 L0,13 Q-4,11 -2,6 Q2,-1 11,1 Q16,-3 22,1 Q31,-1 34,6 Q36,11 32,13 L32,36 Z";
    return (
      <>
        <g transform="translate(12 8)"><path d={rebanada} fill="#b9793d" /></g>
        <g transform="translate(6 9)">
          <path d={rebanada} fill="#c98b4f" />
          <path d="M3,33 L3,14.5 Q-0.5,12 1,8 Q4,3 11,4.5 Q16,1 21,4.5 Q29,3 31,8 Q32.5,12 29,14.5 L29,33 Z" fill="#f6e3bf" />
          {[[9, 14], [20, 20], [13, 26], [24, 12]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#e6cc98" />)}
        </g>
      </>
    );
  },
  f_pan_brioche: () => (
    <>
      <rect x="5" y="34" width="38" height="9" rx="4" fill="#e9b46a" />
      <rect x="6" y="32" width="36" height="3" rx="1.5" fill="#f6e3bf" />
      <path d="M5,31 Q5,13 24,13 Q43,13 43,31 Z" fill="#e0a24f" />
      {brillo("M11,23 Q15,16 23,15.5")}
      {[[18, 20, -20], [26, 18, 10], [32, 23, 30], [22, 26, -5], [13, 27, -40], [35, 28, 15]].map(([x, y, g]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.5" ry="0.8" fill="#fbf1d6" transform={`rotate(${g} ${x} ${y})`} />
      ))}
    </>
  ),

  // ---------- Cereales ----------
  f_cereales_cacao: () => (
    <>
      <rect x="9" y="4" width="28" height="40" rx="2" fill="#7b4a2e" />
      <rect x="34" y="4" width="5" height="40" rx="1" fill="#5e3721" />
      <rect x="12" y="8" width="19" height="7" rx="1.5" fill="#f2c14e" />
      {[[17, 26], [21, 24.5], [25, 25.5], [19, 28], [23, 28], [27, 27.5]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#3f2414" />
      ))}
      <path d="M12,28 Q22,40 32,28 Z" fill="#fffdf7" />
      <path d="M12,28 L32,28" stroke="#e9dfc6" strokeWidth="1" />
    </>
  ),

  // ---------- Vegetales ----------
  f_ensalada: () => (
    <>
      <path d="M7,29 Q8,18 15,20 Q16,13 23,16 Q28,10 33,17 Q40,15 41,22 Q45,25 42,29 Z" fill="#5aa35a" />
      <path d="M10,29 Q13,22 19,24 Q23,19 28,23 Q33,20 37,25 L39,29 Z" fill="#8cc66a" />
      <circle cx="17" cy="26" r="3.4" fill="#e0483e" />
      <circle cx="31" cy="25" r="3" fill="#e0483e" />
      <circle cx="24" cy="23" r="1.6" fill="#f2c14e" />
      {cuenco("#4a86c5")}
    </>
  ),
  f_tomate: () => (
    <>
      <circle cx="24" cy="30" r="15" fill="#e0483e" />
      <path d="M17,17.5 Q15,30 19,44 M31,17.5 Q33,30 29,44" fill="none" stroke="#c93a32" strokeWidth="1.2" opacity="0.7" />
      {brillo("M13,25 Q15,19 21,17")}
      <path d="M24,16 L18,13 L22,18 L16,19 L23,19.5 L24,23 L25,19.5 L32,19 L26,18 L30,13 Z" fill="#4f9a4f" />
      <path d="M24,16 Q24,11 27,9" fill="none" stroke="#4f9a4f" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  f_pimiento: () => (
    <>
      <path d="M24,14 Q30,10 33,13" stroke="#4f9a4f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M12,22 Q10,14 18,14 Q24,12 30,14 Q38,14 37,22 Q38,34 32,40 Q28,44 24,40 Q20,44 16,40 Q10,34 12,22 Z" fill="#e2453c" />
      <path d="M24,16 L24,40" stroke="#c03a32" strokeWidth="1.4" />
      <path d="M15,20 Q14,28 17,34" stroke="#ffffff" strokeWidth="2" opacity="0.4" fill="none" />
    </>
  ),
  f_cebolla: () => (
    <>
      <path d="M24,8 Q22,12 24,16 Q26,12 24,8 Z" fill="#a8d27a" />
      <path d="M24,16 Q36,20 37,31 Q37,42 24,43 Q11,42 11,31 Q12,20 24,16 Z" fill="#a85a8a" />
      <path d="M24,17 Q18,26 19,42 M24,17 Q30,26 29,42" stroke="#c88ab0" strokeWidth="1.2" fill="none" />
      <path d="M20,43 L24,46 L28,43" stroke="#d9c3a6" strokeWidth="1.2" fill="none" />
    </>
  ),
  f_pure_verduras: () => (
    <>
      <path d="M31,27 L42,8" stroke="#aab5ba" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="24" cy="28" rx="19.5" ry="4.5" fill="#f0913a" />
      <path d="M14,28 Q20,25.5 26,28 Q31,30 35,27" fill="none" stroke="#f7b36a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19,26 l2,-2 l2,2 M21,24 l0,-2" stroke="#4f9a4f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {cuenco("#e05a3f")}
      <path d="M1,45 L9,33 L12,35 Z" fill="#f08a2c" />
      <path d="M9,33 L10,29 M10.5,34 L14,31 M9.5,33 L7,30" stroke="#4f9a4f" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  // ---------- Frutas ----------
  f_manzana: () => (
    <>
      <path d="M24,18 Q16,12 9,18 Q3,25 6,34 Q10,44 18,44 Q21,43 24,42 Q27,43 30,44 Q38,44 42,34 Q45,25 39,18 Q32,12 24,18 Z" fill="#e0483e" />
      <path d="M24,18 Q24,12 27,8" stroke="#6b4423" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="11" rx="5.5" ry="2.6" fill="#5aa35a" transform="rotate(-20 32 11)" />
      {brillo("M10,27 Q11,21 16,19")}
    </>
  ),
  f_platano: () => (
    <>
      <path d="M9,14 Q12,34 30,37 Q39,38 44,31 Q42,29 38,31 Q26,33 17,22 Q14,17 13,13 Z" fill="#e8bd32" />
      <path d="M6,18 Q8,40 29,42 Q39,42 44,35 Q42,33 38,35 Q24,38 15,26 Q11,20 10,16 Z" fill="#f2cf4a" />
      <path d="M8,15 L12,12 L14,15 L10,18 Z" fill="#6b4423" />
      <circle cx="44" cy="34" r="1.6" fill="#6b4423" />
      <path d="M12,24 Q16,34 26,38" fill="none" stroke="#fbe58a" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  f_naranja: () => (
    <>
      <circle cx="24" cy="30" r="15" fill="#f29a2e" />
      {[[18, 26], [29, 24], [22, 35], [32, 33], [15, 33], [26, 29]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="#d9801c" />)}
      {brillo("M13,26 Q15,20 21,18")}
      <path d="M24,15.5 L24,12" stroke="#6b4423" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="30" cy="12" rx="6" ry="2.6" fill="#5aa35a" transform="rotate(-15 30 12)" />
    </>
  ),
  f_pera: () => (
    <>
      <path d="M24,9 Q30,9 30,17 Q38,23 37,33 Q36,44 24,44 Q12,44 11,33 Q10,23 18,17 Q18,9 24,9 Z" fill="#c3d356" />
      <ellipse cx="31" cy="35" rx="4" ry="3" fill="#e7a94a" opacity="0.45" />
      <path d="M24,9 L25,4" stroke="#6b4423" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="30" cy="6" rx="5" ry="2.2" fill="#5aa35a" transform="rotate(-20 30 6)" />
      {brillo("M15,27 Q16,21 20,18")}
    </>
  ),
  f_fresas: () => {
    const fresa = (x, y, k) => (
      <g transform={`translate(${x} ${y}) scale(${k})`}>
        <path d="M0,16 Q-8,9 -7,1 Q-4,-2.5 0,-1.5 Q4,-2.5 7,1 Q8,9 0,16 Z" fill="#e2453c" />
        {[[-3.5, 3], [0, 6], [3.5, 3], [-2, 10], [2, 10], [0, 1.5], [-4, 7], [4, 7]].map(([a, b]) => <ellipse key={`${a}-${b}`} cx={a} cy={b} rx="0.6" ry="0.9" fill="#f8d36a" />)}
        <path d="M-6,0 L-4,-4.5 L-1,-1.5 L0,-5.5 L1,-1.5 L4,-4.5 L6,0 L2,0.5 L0,2 L-2,0.5 Z" fill="#4f9a4f" />
      </g>
    );
    return <>{fresa(14, 21, 1.25)}{fresa(33, 22, 1.25)}{fresa(24, 28, 1.05)}</>;
  },
  f_uvas: () => (
    <>
      <path d="M24,12 Q24,7 28,5" stroke="#6b4423" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="10" rx="6" ry="3" fill="#5aa35a" transform="rotate(-15 32 10)" />
      {[[16, 17], [24, 17], [32, 17], [12, 24], [20, 24], [28, 24], [36, 24], [16, 31], [24, 31], [32, 31], [20, 38], [28, 38], [24, 44]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y - 1.5} r="4.4" fill="#7a3f6e" />
          <circle cx={x - 1.4} cy={y - 3} r="1.1" fill="#ffffff" opacity="0.4" />
        </g>
      ))}
    </>
  ),

  // ---------- Lácteos ----------
  f_queso_cottage: () => (
    <>
      <ellipse cx="38" cy="22" rx="8" ry="11" fill="#4a86c5" transform="rotate(18 38 22)" />
      <path d="M5,27 L43,27 L40,44 L8,44 Z" fill="#fbfaf5" {...B} />
      <path d="M6.2,33 L41.8,33 L41,38 L7,38 Z" fill="#4a86c5" />
      {[[10, 26], [15, 24.5], [20, 26], [25, 24], [30, 25.5], [35, 24.5], [39, 26], [17.5, 22.5], [27.5, 22]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#fbf8f0" {...B} />
      ))}
    </>
  ),
  f_yogur_prot: () => (
    <>
      <path d="M12,13 L36,13 L33,44 L15,44 Z" fill="#fbfaf5" {...B} />
      <rect x="10" y="8" width="28" height="6" rx="2" fill="#2f4f8a" />
      <path d="M12.9,23 L35.1,23 L34.2,33 L13.8,33 Z" fill="#2f4f8a" />
      <rect x="19" y="27" width="10" height="2" rx="1" fill="#ffffff" />
      <rect x="16.5" y="25" width="3" height="6" rx="1" fill="#ffffff" />
      <rect x="28.5" y="25" width="3" height="6" rx="1" fill="#ffffff" />
    </>
  ),
  f_mozzarella: () => (
    <>
      <path d="M8,11 Q24,8 40,11 L42,42 Q24,46 6,42 Z" fill="#eef5f7" {...B} />
      <rect x="7.6" y="8" width="32.8" height="6" rx="2" fill="#4a86c5" />
      <ellipse cx="24" cy="30" rx="13" ry="9" fill="#ffffff" opacity="0.8" />
      {[[16, 28, 30], [20, 32, -20], [24, 27, 60], [28, 31, 15], [31, 27, -40], [19, 25, -60], [26, 35, 40], [22, 30, 80], [30, 34, -10], [17, 33, 50]].map(([x, y, g]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 1} width="6" height="2" rx="1" fill="#efc95a" transform={`rotate(${g} ${x} ${y})`} />
      ))}
    </>
  ),
  f_cafe_leche: () => (
    <>
      <path d="M16,18 Q13,14 16,10 Q19,6 16,3 M24,18 Q21,14 24,10 Q27,6 24,3" fill="none" stroke="#c8c2b4" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="22" cy="42" rx="19" ry="3.6" fill="#f3efe2" {...B} />
      <path d="M35,27 Q43,26 42,32 Q41,37 33,36" fill="none" stroke="#e3ddd0" strokeWidth="3.2" />
      <path d="M7,23 L37,23 Q36,40 22,41 Q8,40 7,23 Z" fill="#fbfaf5" {...B} />
      <path d="M8.3,30 Q22,32 35.7,30" fill="none" stroke="#9ad4c6" strokeWidth="2.2" />
      <ellipse cx="22" cy="23" rx="15" ry="3" fill="#c49a6c" />
      <path d="M15,23 Q19,21.5 22,23 Q25,24.5 29,23" fill="none" stroke="#ead6b8" strokeWidth="1.3" />
    </>
  ),

  // ---------- Grasas ----------
  f_aove: () => (
    <>
      <rect x="20" y="1" width="8" height="5" rx="1.5" fill="#3d8b5a" />
      <path d="M21,6 L27,6 L27,13 Q34,16 34,23 L34,42 Q34,45 31,45 L17,45 Q14,45 14,42 L14,23 Q14,16 21,13 Z" fill="#7d8f2a" />
      <path d="M15.5,26 L32.5,26 L32.5,42 Q32.5,43.5 31,43.5 L17,43.5 Q15.5,43.5 15.5,42 Z" fill="#c7b93a" opacity="0.6" />
      <rect x="16.5" y="27" width="15" height="12" rx="2" fill="#f7f1e2" />
      <ellipse cx="22.5" cy="33.5" rx="2.6" ry="3.2" fill="#4f6b2a" />
      <ellipse cx="27" cy="31.5" rx="3.2" ry="1.4" fill="#7fa34a" transform="rotate(-30 27 31.5)" />
      <path d="M17,16 Q16.5,19 16.5,23" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </>
  ),

  // ---------- Frutos secos ----------
  f_anacardos: () => (
    <>
      {/* cada anacardo, una media luna gruesa con su borde algo más oscuro */}
      {[[14, 27, -10], [25, 24, 25], [35, 27, 60], [19, 31, 150], [31, 31, 190]].map(([x, y, g]) => {
        const d = `M${x - 6},${y + 2} Q${x - 5},${y - 6} ${x + 5},${y - 4}`;
        return (
          <g key={`${x}-${y}`} transform={`rotate(${g} ${x} ${y})`}>
            <path d={d} fill="none" stroke="#d2ae74" strokeWidth="7.4" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#f0d9a8" strokeWidth="5.4" strokeLinecap="round" />
          </g>
        );
      })}
      <path d="M4,30 Q6,44 24,45 Q42,44 44,30 Z" fill="#c99d62" />
      <path d="M6,34 Q24,38 42,34" fill="none" stroke="#b38550" strokeWidth="1.4" />
      <path d="M9,33 Q10,39 15,42" fill="none" stroke="#e2bf8c" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  f_pistachos: () => (
    <>
      {[[12, 38, -20], [24, 40, 10], [36, 38, 30], [18, 31, -40], [30, 31, 20], [24, 23, -5]].map(([x, y, g], i) => (
        <g key={`${x}-${y}`} transform={`rotate(${g} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="6.6" ry="4.6" fill="#e8d3a6" stroke="#c9ad78" strokeWidth="0.8" />
          {i !== 5 && <ellipse cx={x} cy={y - 0.3} rx="3.6" ry="2.2" fill="#9ccc5a" />}
          {i !== 5 && <path d={`M${x - 3},${y - 1.6} Q${x},${y - 3} ${x + 3},${y - 1.6}`} fill="none" stroke="#9a5a7a" strokeWidth="0.9" />}
        </g>
      ))}
    </>
  ),
  f_cacahuete_polvo: () => (
    <>
      <rect x="10" y="14" width="28" height="30" rx="3" fill="#f7f1e2" {...B} />
      <rect x="8" y="9" width="32" height="7" rx="2" fill="#a85f2e" />
      <rect x="10" y="22" width="28" height="14" fill="#e6c27a" />
      <path d="M17,29 Q17,25 21,25 Q24,25 24,27 Q24,29 27,29 Q31,29 31,32 Q31,35 27,35 Q23,35 23,33 Q23,31 21,31 Q17,31 17,29 Z" fill="#c98b4f" transform="rotate(-20 24 30)" />
      <path d="M2,45 Q8,37 15,45 Z" fill="#dcb27a" />
    </>
  ),

  // ---------- Snacks ----------
  f_choco85: () => (
    <g transform="rotate(-12 24 26)">
      <rect x="11" y="4" width="24" height="26" rx="2" fill="#5a3220" />
      {[0, 1].map((c) => [0, 1, 2].map((f) => (
        <g key={`${c}-${f}`}>
          <rect x={13.5 + c * 10.5} y={6.5 + f * 7.5} width="8.5" height="6" rx="1" fill="#6b3d27" />
          <path d={`M${14.5 + c * 10.5},${7.5 + f * 7.5} L${20.5 + c * 10.5},${7.5 + f * 7.5}`} stroke="#8a5638" strokeWidth="1" />
        </g>
      )))}
      <path d="M10,27 L13,25 L16,28 L19,25 L22,28 L25,25 L28,28 L31,25 L34,28 L36,26 L36,31 L10,31 Z" fill="#d5dadd" />
      <rect x="10" y="30" width="26" height="16" rx="2" fill="#2b2b26" />
      <rect x="10" y="35" width="26" height="4" fill="#d9a441" />
    </g>
  ),
  f_nachos: () => (
    <>
      {[[6, 44, 18, 14, 30, 44], [16, 42, 26, 10, 38, 40], [24, 45, 33, 18, 45, 42], [2, 38, 10, 20, 20, 36], [12, 46, 22, 26, 32, 46]].map((p, i) => (
        <g key={i}>
          <path d={`M${p[0]},${p[1]} L${p[2]},${p[3]} L${p[4]},${p[5]} Z`} fill={i % 2 ? "#f2c14e" : "#eab43c"} stroke="#d9a441" strokeWidth="0.8" strokeLinejoin="round" />
          <circle cx={(p[0] + p[2] + p[4]) / 3} cy={(p[1] + p[3] + p[5]) / 3} r="0.8" fill="#c98b2e" />
          <circle cx={(p[0] + p[2] * 2) / 3 + 1} cy={(p[1] + p[3] * 2) / 3 + 2} r="0.7" fill="#c98b2e" />
        </g>
      ))}
    </>
  ),
  f_guacamole: () => (
    <>
      <path d="M3,28 Q4,44 20,45 Q36,44 37,28 Z" fill="#c9773b" />
      <ellipse cx="20" cy="28" rx="17" ry="4.4" fill="#8cbf4a" />
      {[[12, 27.5], [18, 29], [24, 27], [29, 29]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#6e9e36" />)}
      <path d="M6,32 Q20,35 34,32" fill="none" stroke="#a85f2e" strokeWidth="1.4" />
      <g transform="rotate(20 38 34)">
        <path d="M38,22 Q45,23 46,33 Q46,43 38,44 Q30,43 30,33 Q31,23 38,22 Z" fill="#3f6b2a" />
        <path d="M38,24.5 Q43.5,25.5 44,33 Q44,41 38,41.5 Q32,41 32,33 Q32.5,25.5 38,24.5 Z" fill="#d6e69a" />
        <circle cx="38" cy="35" r="4" fill="#8a5a2a" />
        <circle cx="36.8" cy="33.8" r="1.1" fill="#b98a5a" />
      </g>
    </>
  ),
};

export function tieneDibujoAlimento(clave) {
  return !!(clave && DIBUJOS_ALIMENTOS[clave]);
}
