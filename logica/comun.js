// ---------- Utilidades comunes ----------
// Módulo de lógica pura (sin JSX): piezas mínimas compartidas entre app.jsx y el resto de
// módulos (identificadores y nombres de los días), para no duplicarlas en varios sitios.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// El primer emoji de un texto, completo (F3: el emoji propio de un alimento). El campo acepta lo que dé
// el teclado del móvil, y un «emoji» puede ocupar varios caracteres: 👍🏽 lleva el tono de piel, 🧑‍🍳 son
// tres piezas unidas, una bandera son dos letras regionales. Por eso no vale quedarse con el primer
// carácter: se parte el texto en grafemas (lo que se ve como un solo símbolo) con Intl.Segmenter, que
// tienen todos los navegadores actuales, y, donde no esté, con una expresión regular que cubre los casos
// habituales. Si se pegan varios, se guarda el primero; letras, números y espacios se ignoran (un «a» no
// es un emoji). Sin ninguno, devuelve "" (y entonces se usa el de la carpeta del alimento).
export function primerEmoji(texto) {
  const s = String(texto || "").trim();
  if (!s) return "";
  let grafemas = null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      grafemas = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment);
    }
  } catch (e) {
    grafemas = null;
  }
  if (!grafemas) {
    grafemas = s.match(/\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*|[\s\S]/gu) || [];
  }
  const esEmoji = (g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(g);
  return grafemas.find(esEmoji) || "";
}
