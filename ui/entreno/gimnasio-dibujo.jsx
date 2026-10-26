// ---------- ui/entreno/gimnasio-dibujo.jsx ----------
// El dibujo del gimnasio de FitDraft (parte estética, 26-oct-2026; maqueta v3-01): una planta vista desde
// arriba con un poco de canto (la cara de delante de cada mueble se ve, como en los juegos de rol de antes),
// en SVG propio y sin imágenes. Solo dibuja: dónde está cada cosa sale de logica/gimnasio.js y los colores,
// de gimnasio-tema.js. Lo mueve, lo amplía y lo hace tocable ui/entreno/gimnasio.jsx.
//
// Las piezas son funciones pequeñas que devuelven elementos de React (rect, círculo, línea, texto...) y se
// combinan con `F(...)` (un Fragment con los hijos como argumentos sueltos, así React no pide `key`). Es la
// traducción directa del motor de la maqueta (v3-gimnasio.js), que las escribía como texto.
//
// Capas, de abajo arriba: suelo · tinte de la semana · paredes · ruta (la pone el mapa) · objetos (máquinas,
// oficina, recepción) · avatar (lo pone el mapa) · rótulos. Los rótulos tienen dos niveles: de lejos, las
// zonas (con su estado de la semana); de cerca, el nombre de cada máquina y de cada sitio, solo de adorno.
import React from "react";
import { t } from "i18n";
import { ANCHO, ALTO, ZONAS, ESTACIONES, SITIO, MUEBLES, PAREDES, CARAS, ALFEIZAR, MONITOR } from "gimnasio";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { TEMA_GIMNASIO } from "./gimnasio-tema.js";
import { Monitor } from "../comun/avatar.jsx";
import { DIAS_CORTOS } from "./comun.jsx";

const h = React.createElement;
const F = (...hijos) => h(React.Fragment, null, ...hijos);
const n1 = (v) => Math.round(v * 10) / 10;
const r = (x, y, w, alto, rx, fill, extra) => h("rect", { x: n1(x), y: n1(y), width: n1(Math.max(0, w)), height: n1(Math.max(0, alto)), rx, fill, ...extra });
const ci = (cx, cy, rad, fill, extra) => h("circle", { cx: n1(cx), cy: n1(cy), r: rad, fill, ...extra });
const li = (x1, y1, x2, y2, stroke, sw = 1.5, extra) => h("line", { x1, y1, x2, y2, stroke, strokeWidth: sw, strokeLinecap: "round", ...extra });
const pa = (d, extra) => h("path", { d, ...extra });
function tx(x, y, texto, o = {}) {
  return h("text", {
    x, y, fontSize: o.s || 10, fill: o.c || TEMA_GIMNASIO.tinta, textAnchor: o.a || "middle", fontWeight: o.w || 400,
    fontFamily: o.f || FUENTE_TEXTO, ...(o.extra || {}),
  }, texto);
}
// Rótulo con un borde claro alrededor de las letras, para leerse encima de cualquier cosa.
const conBorde = (C) => ({ paintOrder: "stroke", stroke: C.crema, strokeWidth: 3, strokeLinejoin: "round" });

// ---------- trazos básicos ----------
// Una pieza con canto: la cara de arriba y, debajo, la de delante, más oscura.
const caja = (x, y, w, alto, canto, arriba, frente, rx = 3) => F(r(x, y + alto - canto - rx, w, canto + rx, rx, frente), r(x, y, w, alto - canto, rx, arriba));
const sombra = (x, y, w, alto, rx = 6) => r(x + 3, y + 4, w, alto, rx, "#000", { opacity: 0.08 });

function piezas(C) {
  function barraH(x1, x2, y, discos = 2, alto = 24) {
    const hijos = [r(x1, y - 1.6, x2 - x1, 3.2, 1.6, C.disco)];
    for (let i = 0; i < discos; i++) {
      const hh = alto - i * 5;
      hijos.push(r(x1 + 3 + i * 6, y - hh / 2, 5, hh, 2, C.disco), r(x2 - 8 - i * 6, y - hh / 2, 5, hh, 2, C.disco));
    }
    hijos.push(r(x1 + 4 + discos * 6, y - 3, 3, 6, 1, C.menta), r(x2 - 7 - discos * 6, y - 3, 3, 6, 1, C.menta));
    return F(...hijos);
  }
  const mancuerna = (cx, cy, largo = 14, grueso = 6) => F(r(cx - largo / 2, cy - 1.1, largo, 2.2, 1, C.disco), r(cx - largo / 2 - 1, cy - grueso / 2, 4.5, grueso, 1.5, C.disco), r(cx + largo / 2 - 3.5, cy - grueso / 2, 4.5, grueso, 1.5, C.disco));
  const pesaRusa = (cx, cy, rad = 5) => F(
    pa(`M${cx - rad * 0.6},${cy - rad * 0.4} Q${cx},${cy - rad * 1.9} ${cx + rad * 0.6},${cy - rad * 0.4}`, { stroke: C.disco, strokeWidth: 2, fill: "none" }),
    ci(cx, cy + 1, rad, C.disco), ci(cx - rad * 0.35, cy - rad * 0.1, rad * 0.25, C.discoClaro)
  );
  function pila(x, y, w, alto) {
    const hijos = [caja(x, y, w, alto, 5, C.discoClaro, C.disco, 2)];
    for (let k = y + 4; k < y + alto - 7; k += 3.2) hijos.push(r(x + 2, k, w - 4, 1, 0.5, C.discoLinea));
    hijos.push(r(x + w / 2 - 2, y + alto * 0.45, 4, 2.5, 1, C.menta));
    return F(...hijos);
  }
  const asiento = (x, y, w, alto, canto = 5) => F(caja(x, y, w, alto, canto, C.cojin, C.cojinOsc, 5), r(x + 4, y + 3, w - 8, 2.5, 1.2, C.cojinClaro));
  const respaldo = (x, y, w, alto) => caja(x, y, w, alto, 3, C.cojinClaro, C.cojinOsc, 4);
  const poste = (x, y, w, alto) => caja(x, y, w, alto, 4, C.marco, C.marcoOsc, 2);
  return { barraH, mancuerna, pesaRusa, pila, asiento, respaldo, poste };
}

// Telaraña en una esquina: radios y anillos, con la araña colgando de un hilo.
export function telarana(C, x, y, rad = 30, giro = 0) {
  const ang = (k) => ((giro + k * 18) * Math.PI) / 180;
  const hijos = [];
  for (let k = 0; k <= 5; k++) hijos.push(li(x, y, x + Math.cos(ang(k)) * rad, y + Math.sin(ang(k)) * rad, C.telarana, 0.8));
  for (let rr = rad * 0.3; rr <= rad; rr += rad * 0.23) {
    let d = "";
    for (let k = 0; k <= 5; k++) d += `${k ? "L" : "M"}${n1(x + Math.cos(ang(k)) * rr)},${n1(y + Math.sin(ang(k)) * rr)} `;
    hijos.push(pa(d, { fill: "none", stroke: C.telarana, strokeWidth: 0.7 }));
  }
  const ax = x + Math.cos(ang(2.5)) * rad * 0.8, ay = y + Math.sin(ang(2.5)) * rad * 0.8;
  hijos.push(li(ax, ay, ax, ay + 12, C.telarana, 0.5), ci(ax, ay + 14, 2.4, C.tinta));
  return h("g", { opacity: 0.95 }, ...hijos);
}

// ---------- las máquinas, vistas desde arriba con su canto ----------
export function dibujoEstacion(e, C = TEMA_GIMNASIO) {
  const { barraH, mancuerna, pesaRusa, pila, asiento, respaldo, poste } = piezas(C);
  const { x, y, w, h: alto } = e;
  const cx = x + w / 2;
  switch (e.tipo) {
    case "bancoBarra":
      return F(sombra(cx - 12, y + 18, 24, alto - 18), poste(x + 8, y + 6, 9, 18), poste(x + w - 17, y + 6, 9, 18), asiento(cx - 11, y + 22, 22, alto - 22, 6), barraH(x, x + w, y + 13));
    case "bancoInclinado": {
      const hr = Math.round(alto * 0.5);
      return F(sombra(cx - 12, y + 18, 24, alto - 18), poste(x + 6, y + 6, 9, 18), poste(x + w - 15, y + 6, 9, 18),
        respaldo(cx - 11, y + 22, 22, hr), asiento(cx - 11, y + 24 + hr, 22, alto - 24 - hr, 6), barraH(x - 2, x + w + 2, y + 13),
        mancuerna(x + 2, y + alto - 10, 12), mancuerna(x + w - 2, y + alto - 10, 12));
    }
    case "cruce":
      return F(
        r(cx - 26, y + 18, 52, alto - 22, 6, C.banco), sombra(x + 2, y + 6, 26, alto - 10), sombra(x + w - 28, y + 6, 26, alto - 10),
        r(x + 10, y + 2, w - 20, 5, 2, C.metal),
        ...[x, x + w - 26].map((tx_) => F(caja(tx_, y, 26, alto - 6, 8, C.marco, C.marcoOsc, 3), pila(tx_ + 4, y + 4, 18, 22), ci(tx_ + 13, y + 34, 3.5, C.disco))),
        pa(`M${x + 13},${y + 34} Q${cx - 30},${y + alto - 22} ${cx - 10},${y + alto - 22} M${x + w - 13},${y + 34} Q${cx + 30},${y + alto - 22} ${cx + 10},${y + alto - 22}`, { stroke: C.disco, strokeWidth: 1.2, fill: "none" }),
        ci(cx - 10, y + alto - 22, 3, C.disco), ci(cx + 10, y + alto - 22, 3, C.disco)
      );
    case "jalon":
      return F(
        sombra(x + 4, y + 6, w - 8, alto - 6), pila(x + w - 24, y + 6, 18, 30), poste(x + 4, y + 4, w - 8, 9), poste(cx - 4, y + 8, 8, alto - 24),
        li(cx, y + 12, cx, y + 24, C.disco, 1.2), pa(`M${x + 1},${y + 28} Q${cx},${y + 20} ${x + w - 1},${y + 28}`, { stroke: C.disco, strokeWidth: 3.5, fill: "none", strokeLinecap: "round" }),
        r(x - 1, y + 25, 7, 4, 2, C.menta), r(x + w - 6, y + 25, 7, 4, 2, C.menta),
        respaldo(cx - 14, y + alto - 36, 28, 9), asiento(cx - 12, y + alto - 24, 24, 20)
      );
    case "remoPolea":
      return F(
        sombra(cx - 12, y + 6, 24, alto - 6), poste(cx - 15, y, 30, 32), pila(cx - 11, y + 3, 22, 26), caja(cx - 4, y + 28, 8, alto - 30, 3, C.marco, C.marcoOsc, 2),
        caja(cx - 13, y + 36, 26, 10, 4, C.metalClaro, C.metal, 2), li(cx, y + 28, cx, y + 54, C.disco, 1.2),
        pa(`M${cx - 5},${y + 54} L${cx},${y + 60} L${cx + 5},${y + 54}`, { stroke: C.disco, strokeWidth: 2.5, fill: "none", strokeLinejoin: "round" }),
        asiento(cx - 11, y + alto - 28, 22, 20)
      );
    case "torre":
      return F(
        sombra(x + 2, y + 6, w - 4, alto - 6), poste(x + 2, y + 2, 8, alto - 6), poste(x + w - 10, y + 2, 8, alto - 6), r(x - 5, y + 6, w + 10, 4, 2, C.disco),
        r(x - 7, y + 5, 5, 6, 2, C.menta), r(x + w + 2, y + 5, 5, 6, 2, C.menta),
        respaldo(cx - 9, y + 14, 18, 24), r(x + 9, y + 18, 13, 6, 3, C.cojin), r(x + w - 22, y + 18, 13, 6, 3, C.cojin),
        r(x + 11, y + 34, 4, 18, 2, C.disco), r(x + w - 15, y + 34, 4, 18, 2, C.disco), caja(cx - 12, y + alto - 14, 24, 10, 3, C.metalClaro, C.metal, 2)
      );
    case "bancoRemo":
      return F(
        sombra(x + 4, y + 6, 46, 18), asiento(x + 4, y + 4, 46, 18, 5), mancuerna(x + 62, y + 9, 14), mancuerna(x + 62, y + 19, 14),
        barraH(x - 2, x + w + 2, y + alto - 12, 2, 22), li(x + w - 4, y + 4, x + w - 30, y + 26, C.disco, 3), ci(x + w - 4, y + 4, 3.5, C.marcoOsc), r(x + w - 34, y + 20, 5, 13, 2, C.disco)
      );
    case "hiper":
      return F(
        sombra(cx - 14, y + 6, 28, alto - 6), caja(cx - 5, y + 10, 10, alto - 14, 3, C.marco, C.marcoOsc, 2), asiento(cx - 15, y + 8, 30, 18, 5),
        ci(cx - 8, y + alto - 26, 5, C.cojin), ci(cx + 8, y + alto - 26, 5, C.cojin), caja(cx - 13, y + alto - 14, 26, 10, 3, C.metalClaro, C.metal, 2)
      );
    case "mancuernero": {
      const hijos = [sombra(x, y + 4, w, 22), caja(x, y + 2, w, 24, 7, C.marco, C.marcoOsc, 3)];
      for (let i = 0; i < 7; i++) hijos.push(mancuerna(x + 12 + i * 17, y + 8, 11, 4 + i * 0.45), mancuerna(x + 12 + i * 17, y + 15, 11, 4 + i * 0.45));
      hijos.push(sombra(x + 34, y + 36, 22, 44), respaldo(x + 34, y + 34, 22, 24), asiento(x + 34, y + 60, 22, 22, 6));
      hijos.push(poste(x + w - 50, y + 40, 6, 14), poste(x + w - 12, y + 40, 6, 14), barraH(x + w - 62, x + w + 4, y + 45, 1, 18));
      return F(...hijos);
    }
    case "polea":
      return F(
        sombra(x + 2, y + 4, w - 4, alto - 10), caja(x + 2, y, w - 4, alto - 12, 8, C.marco, C.marcoOsc, 3), pila(x + 6, y + 4, w - 12, 24),
        ci(cx, y + 38, 3.5, C.disco), li(cx, y + 38, cx, y + alto - 6, C.disco, 1.2),
        pa(`M${cx},${y + alto - 8} L${cx - 5},${y + alto} M${cx},${y + alto - 8} L${cx + 5},${y + alto}`, { stroke: C.mostaza, strokeWidth: 2.4, strokeLinecap: "round" })
      );
    case "bancoBrazos": {
      const hijos = [sombra(x, y + 6, 28, 40), caja(x, y + 4, 28, 42, 6, C.marco, C.marcoOsc, 3)];
      [12, 22, 32].forEach((dy) => hijos.push(
        pa(`M${x - 3},${y + dy} l8,0 l3,-2 l4,4 l3,-2 l8,0`, { stroke: C.disco, strokeWidth: 2, fill: "none", strokeLinejoin: "round" }),
        r(x - 5, y + dy - 4, 4, 8, 1.5, C.disco), r(x + 29, y + dy - 4, 4, 8, 1.5, C.disco)
      ));
      hijos.push(sombra(x + 42, y + 6, 22, alto - 8), asiento(x + 42, y + 4, 22, alto - 8, 6));
      [14, 26, 38, 50].forEach((dy, i) => hijos.push(mancuerna(x + 86, y + dy, 11, 4.5 + i * 0.6)));
      return F(...hijos);
    }
    case "predicador":
      return F(
        sombra(x + 2, y + 6, 32, alto - 8), respaldo(x + 2, y + 6, 32, 16), pa(`M${x},${y + 4} l9,0 l3,-2 l4,4 l3,-2 l9,0 l7,0`, { stroke: C.disco, strokeWidth: 2.2, fill: "none" }),
        caja(x + 15, y + 22, 6, 14, 3, C.marco, C.marcoOsc, 1), asiento(x + 6, y + 34, 24, 16, 5),
        sombra(x + 38, y + 8, 22, alto - 10), pila(x + 40, y + 2, 18, 22), poste(x + 38, y + 4, 4, alto - 22), poste(x + 56, y + 4, 4, alto - 22), asiento(x + 38, y + alto - 26, 22, 18)
      );
    case "rack": {
      const hijos = [r(x - 6, y - 4, w + 12, alto + 10, 4, C.maderaClara)];
      for (let k = y; k < y + alto + 4; k += 12) hijos.push(li(x - 6, k, x + w + 6, k, C.madera, 0.8));
      hijos.push(h("rect", { x: x + 4, y: y + 4, width: w - 8, height: alto - 8, rx: 2, fill: "none", stroke: C.marco, strokeWidth: 3 }));
      [[x, y], [x + w - 9, y], [x, y + alto - 10], [x + w - 9, y + alto - 10]].forEach(([px, py]) => hijos.push(poste(px, py, 9, 12)));
      hijos.push(ci(x + 20, y + 16, 6, C.disco), ci(x + 20, y + 16, 2, C.discoClaro), ci(x + w - 20, y + 16, 6, C.disco), ci(x + w - 20, y + 16, 2, C.discoClaro));
      hijos.push(barraH(x - 10, x + w + 10, y + alto - 22, 2, 24));
      return F(...hijos);
    }
    case "plataforma": {
      const hijos = [r(x, y, w, alto, 3, C.plataforma), r(x + 28, y + 2, w - 56, alto - 4, 2, C.maderaClara)];
      for (let k = x + 28; k < x + w - 28; k += 16) hijos.push(li(k, y + 2, k, y + alto - 2, C.madera, 0.8));
      hijos.push(barraH(x + 6, x + w - 6, y + alto / 2, 3, 34));
      return F(...hijos);
    }
    case "prensa":
      return F(
        sombra(x + 2, y + 6, w - 4, alto - 6), r(x + 4, y + alto - 10, w - 8, 8, 2, C.marcoOsc), r(cx - 15, y + 8, 4, alto - 36, 2, C.marco), r(cx + 11, y + 8, 4, alto - 36, 2, C.marco),
        r(cx - 31, y + 14, 12, 8, 2, C.disco), r(cx + 19, y + 14, 12, 8, 2, C.disco), r(cx - 29, y + 22, 8, 5, 2, C.disco), r(cx + 21, y + 22, 8, 5, 2, C.disco),
        caja(cx - 20, y + 8, 40, 22, 5, C.metalClaro, C.metal, 3), respaldo(cx - 14, y + alto - 52, 28, 28), asiento(cx - 14, y + alto - 28, 28, 20)
      );
    case "libre":
      return F(
        h("rect", { x, y, width: w, height: alto, rx: 6, fill: "none", stroke: C.mostaza, strokeWidth: 2, strokeDasharray: "6 4" }),
        sombra(x + 10, y + 10, 52, 16), asiento(x + 10, y + 10, 52, 17, 5), pesaRusa(x + 82, y + 22), pesaRusa(x + 98, y + 22, 5.5), pesaRusa(x + 115, y + 22, 6),
        mancuerna(x + 138, y + 14, 12), mancuerna(x + 138, y + 27, 12)
      );
    case "esterilla": {
      const hijos = [];
      [C.esterilla1, C.esterilla2, C.esterilla3].forEach((col, i) => {
        const mx = x + i * 40;
        hijos.push(r(mx + 2, y + 3, 34, alto - 16, 8, "#000", { opacity: 0.06 }), r(mx, y, 34, alto - 16, 8, col));
        for (let k = y + 10; k < y + alto - 20; k += 10) hijos.push(li(mx + 6, k, mx + 28, k, C.crema, 0.7, { opacity: 0.45 }));
      });
      hijos.push(
        pesaRusa(x + 136, y + 10), pesaRusa(x + 152, y + 12, 4.5), ci(x + 140, y + 34, 6, C.disco), li(x + 132, y + 34, x + 148, y + 34, C.marco, 2),
        pa(`M${x + 126},${y + 50} q6,-6 12,0 t12,0 t10,-2`, { stroke: C.oxido, strokeWidth: 1.6, fill: "none" }),
        h("ellipse", { cx: x + 144, cy: y + 66, rx: 11, ry: 5, fill: "none", stroke: C.mostaza, strokeWidth: 2.4 }),
        caja(x + 124, y + alto - 22, 34, 14, 6, C.esterilla1, C.esterillaOsc, 7)
      );
      return F(...hijos);
    }
    case "cardio": {
      const cinta = (c) => F(
        sombra(c - 18, y + 4, 36, alto - 6), caja(c - 18, y, 36, alto - 4, 6, C.marco, C.marcoOsc, 4), r(c - 12, y + 18, 24, alto - 30, 3, C.plataforma),
        li(c - 9, y + 26, c + 9, y + 26, C.discoLinea, 1), li(c - 9, y + 46, c + 9, y + 46, C.discoLinea, 1), li(c - 9, y + 66, c + 9, y + 66, C.discoLinea, 1),
        caja(c - 16, y + 2, 32, 12, 4, C.disco, C.discoNegro, 3), r(c - 8, y + 4, 16, 4, 1, C.menta)
      );
      const bici = (c) => F(
        sombra(c - 8, y + 10, 16, alto - 16), r(c - 3, y + 14, 6, alto - 30, 3, C.marco), li(c - 13, y + 16, c + 13, y + 16, C.disco, 3), r(c - 15, y + 13, 5, 6, 2, C.menta), r(c + 10, y + 13, 5, 6, 2, C.menta),
        r(c - 7, y + 26, 14, 8, 2, C.disco), h("ellipse", { cx: c, cy: y + alto - 30, rx: 7, ry: 9, fill: C.cojin }), li(c - 9, y + alto - 48, c + 9, y + alto - 48, C.marcoOsc, 2), caja(c - 14, y + alto - 14, 28, 9, 3, C.marco, C.marcoOsc, 2)
      );
      const eliptica = (c) => F(
        sombra(c - 14, y + 6, 28, alto - 8), r(c - 3, y + 8, 6, 26, 2, C.marco), li(c - 12, y + 10, c - 8, y + 32, C.disco, 2.5), li(c + 12, y + 10, c + 8, y + 32, C.disco, 2.5),
        r(c - 12, y + 40, 9, 26, 3, C.metal), r(c + 3, y + 46, 9, 26, 3, C.metal), caja(c - 14, y + alto - 18, 28, 12, 4, C.marco, C.marcoOsc, 3), r(c - 6, y + 2, 12, 7, 2, C.disco)
      );
      const remo = (c) => F(
        sombra(c - 6, y + 6, 12, alto - 6), caja(c - 3, y + 6, 6, alto - 10, 2, C.metal, C.marco, 2), ci(c, y + 14, 10, C.disco), ci(c, y + 14, 4, C.discoClaro),
        r(c - 11, y + 28, 7, 10, 2, C.marcoOsc), r(c + 4, y + 28, 7, 10, 2, C.marcoOsc), asiento(c - 7, y + alto - 40, 14, 12, 3)
      );
      return F(cinta(x + 20), cinta(x + 62), bici(x + 102), eliptica(x + 140), eliptica(x + 176), remo(x + 210));
    }
    default: {
      // «maquina»: pila de placas, postes, respaldo y asiento; `var` añade lo propio de cada una.
      const v = e.var;
      const hijos = [sombra(x + 4, y + 8, w - 8, alto - 8), poste(x + 5, y + 2, w - 10, 10), pila(cx - 10, y + 5, 20, 24), poste(x + 5, y + 4, 7, alto - 18), poste(x + w - 12, y + 4, 7, alto - 18)];
      if (v === "contractor") hijos.push(r(x - 4, y + 26, 9, 22, 4, C.cojin), r(x + w - 5, y + 26, 9, 22, 4, C.cojin), li(x + 8, y + 22, x + 2, y + 30, C.marco, 3), li(x + w - 8, y + 22, x + w - 2, y + 30, C.marco, 3));
      if (v === "hombro") hijos.push(li(cx - 15, y + alto - 40, cx - 15, y + alto - 52, C.disco, 3), li(cx + 15, y + alto - 40, cx + 15, y + alto - 52, C.disco, 3));
      if (v === "remo") hijos.push(respaldo(cx - 9, y + alto - 48, 18, 10), li(cx - 14, y + alto - 52, cx + 14, y + alto - 52, C.disco, 3));
      if (v === "abs") hijos.push(pa(`M${cx - 13},${y + alto - 40} Q${cx},${y + alto - 50} ${cx + 13},${y + alto - 40}`, { stroke: C.cojin, strokeWidth: 6, fill: "none", strokeLinecap: "round" }));
      hijos.push(respaldo(cx - 12, y + alto - 32, 24, 11), asiento(cx - 13, y + alto - 22, 26, 19));
      if (v === "sillas") hijos.push(r(cx - 12, y + alto - 3, 24, 6, 3, C.cojinOsc));
      if (v === "gluteo") hijos.push(r(cx - 19, y + alto - 18, 7, 13, 3, C.cojinOsc), r(cx + 12, y + alto - 18, 7, 13, 3, C.cojinOsc));
      return F(...hijos);
    }
  }
}

// ---------- muebles de la oficina y de la recepción ----------
function estanteria(C, { x, y, w, h: alto }) {
  const cols = [C.cojin, C.mostaza, C.menta, C.marcoOsc, C.cojin, C.oxido, C.mostaza];
  const hijos = [r(x, y, w, alto, 2, C.maderaOsc), r(x + 3, y + 3, w - 6, alto - 8, 1, C.maderaLibros)];
  [0, 1].forEach((fila) => {
    cols.forEach((col, i) => {
      const hh = 19 - (i % 3 === 1 ? 3 : 0);
      hijos.push(r(x + 7 + i * 13.5, y + 5 + fila * 23 + (19 - hh), 10, hh, 1.5, col), r(x + 9 + i * 13.5, y + 9 + fila * 23 + (19 - hh), 6, 4, 1, C.crema));
    });
    hijos.push(r(x + 2, y + 24 + fila * 23, w - 4, 3, 1, C.madera));
  });
  hijos.push(r(x, y + alto - 5, w, 5, 1, C.maderaMuyOsc));
  return F(...hijos);
}
// El corcho con un pósit por día de la semana: ✓ verde los días que se entrenó.
function corcho(C, { x, y, w, h: alto }, dias, letras) {
  const hijos = [r(x, y, w, alto, 3, C.corchoMarco), r(x + 4, y + 4, w - 8, alto - 8, 2, C.corcho)];
  for (let i = 0; i < 40; i++) hijos.push(ci(x + 6 + ((i * 37) % (w - 12)), y + 6 + ((i * 53) % (alto - 12)), 0.8, C.corchoPunto));
  letras.forEach((d, i) => {
    const cx = x + 13 + i * ((w - 26) / 6), cy = y + 10 + (i % 2) * 5, giro = ((i * 7) % 9) - 4;
    const fui = !!(dias && dias[i]);
    hijos.push(h("g", { transform: `rotate(${giro} ${n1(cx)} ${cy})` },
      r(cx - 6, cy, 12, 22, 0, C.crema), tx(cx, cy + 9, d, { s: d.length > 1 ? 5.5 : 7, w: 700 }),
      fui ? pa(`M${n1(cx - 3.5)},${cy + 15} l2,2 l5,-5`, { stroke: C.cojin, strokeWidth: 1.6, fill: "none", strokeLinecap: "round" }) : null,
      ci(cx, cy, 2.1, fui ? C.cojin : C.oxido)));
  });
  return F(...hijos);
}
// La pizarra de la recepción, a tiza: las series de esta semana por grupo y los entrenos hechos.
function pizarra(C, { x, y, w, h: alto }, datos, idioma, pre) {
  const hijos = [r(x, y, w, alto, 4, C.madera), r(x + 5, y + 4, w - 10, alto - 11, 2, C.pizarra)];
  const tiza = [tx(x + 12, y + 16, t(idioma, "fitdraft.pizarra.titulo"), { s: 9.5, c: C.tiza, a: "start", f: FUENTE_TITULOS, extra: { fontStyle: "italic" } })];
  const max = Math.max(10, ...datos.grupos.map((g) => g.n));
  datos.grupos.forEach((g, i) => {
    const bx = x + 14 + i * 32, base = y + alto - 12;
    tiza.push(tx(bx + 6, base - 1, t(idioma, "fitdraft.zona." + g.zona).slice(0, 3), { s: 6, c: C.tiza }));
    const alto2 = (g.n / max) * 20;
    if (g.n) tiza.push(h("rect", { x: bx, y: n1(base - 7 - alto2), width: 12, height: n1(alto2), fill: "none", stroke: C.tizaVerde, strokeWidth: 1.1 }), tx(bx + 6, n1(base - 9 - alto2), String(Math.round(g.n)), { s: 6, c: C.tizaAmarilla }));
    else tiza.push(tx(bx + 6, base - 9, "¿?", { s: 7, c: C.tizaNaranja }));
  });
  tiza.push(tx(x + w - 24, y + 16, `${datos.entrenos} ✓`, { s: 9, c: C.tizaAmarilla, w: 700 }));
  hijos.push(h("g", { filter: `url(#${pre}-tiza)` }, ...tiza));
  hijos.push(r(x + 20, y + alto - 6, w - 40, 4, 1.5, C.corchoMarco), r(x + 30, y + alto - 8, 12, 3, 1.5, C.tiza), r(x + 48, y + alto - 8, 8, 3, 1.5, C.tizaAmarilla));
  return F(...hijos);
}
function mostrador(C, { x, y, w, h: alto }) {
  return F(
    sombra(x, y + 4, w, alto), caja(x, y, w, alto, 22, C.mostrador, C.cojin, 3), r(x, y + alto - 24, w, 4, 0, C.cojinOsc),
    tx(x + w / 2, y + alto - 7, "FitDraft", { s: 12, c: C.crema, f: FUENTE_TITULOS }), ci(x + w - 18, y + 9, 4, C.metalClaro), r(x + w - 19, y + 4, 2, 2, 1, C.metal),
    r(x + 72, y + 4, 12, 10, 2, C.crema, { stroke: C.marco, strokeWidth: 0.8 })
  );
}
function libro(C, { x, y, w, h: alto }) {
  const cx = x + w / 2;
  return F(
    pa(`M${x},${y + 4} L${cx},${y} L${x + w},${y + 4} L${x + w},${y + alto} L${cx},${y + alto - 3} L${x},${y + alto} Z`, { fill: C.crema, stroke: C.mostrador, strokeWidth: 0.9 }),
    li(cx, y, cx, y + alto - 3, C.mostrador, 0.9), li(x + 4, y + 7, cx - 4, y + 5, C.hojaLibro, 0.8), li(x + 4, y + 11, cx - 4, y + 9, C.hojaLibro, 0.8),
    li(cx + 4, y + 5, x + w - 4, y + 7, C.hojaLibro, 0.8), r(cx - 1, y + alto - 4, 2, 8, 0.5, C.oxido)
  );
}
function torno(C, { x, y, w, h: alto }) {
  return F(
    sombra(x + 4, y + 4, 18, alto - 4), caja(x + 2, y, 18, alto, 10, C.metalClaro, C.metal, 3), ci(x + 11, y + 8, 3, C.luzTorno),
    li(x + 20, y + 10, x + w, y + 6, C.metal, 4), li(x + 20, y + 10, x + w - 6, y + 20, C.metal, 4), li(x + 20, y + 10, x + 30, y - 2, C.metal, 4)
  );
}
function mesa(C, { x, y, w, h: alto }) {
  return F(
    sombra(x, y + 4, w, alto), caja(x, y, w, alto, 14, C.madera, C.maderaOsc, 3), r(x + 70, y - 14, 34, 22, 2, C.disco), r(x + 73, y - 11, 28, 15, 1, C.menta), r(x + 84, y + 7, 6, 4, 1, C.disco),
    r(x + 14, y + 6, 24, 16, 1, C.crema, { transform: `rotate(-6 ${x + 26} ${y + 14})` }), ci(x + 116, y + 12, 5, C.crema), ci(x + 116, y + 12, 3.2, C.cafe)
  );
}
const sillaOficina = (C, cx, y) => F(sombra(cx - 13, y + 4, 26, 20), caja(cx - 12, y, 24, 18, 3, C.cojinClaro, C.cojinOsc, 4), caja(cx - 12, y + 14, 24, 10, 3, C.cojin, C.cojinOsc, 4));
const planta = (C, x, y) => F(caja(x + 3, y + 14, 20, 16, 6, C.maceta, C.macetaOsc, 3), ci(x + 13, y + 10, 9, C.planta), ci(x + 6, y + 6, 6, C.plantaOsc), ci(x + 19, y + 4, 6, C.plantaClara));
const espejo = (C, x, w) => F(r(x, 16, w, 22, 2, C.espejo, { stroke: C.espejoMarco, strokeWidth: 2.5 }), pa(`M${x + 20},37 L${x + 34},17 M${x + 40},37 L${x + 54},17`, { stroke: "#fff", strokeWidth: 5, opacity: 0.5 }));

// ---------- el plano entero ----------
// Props:
// - `pre`: prefijo de los id de los filtros y tramas (puede haber dos mapas a la vez: el de la pantalla y el
//   mini-mapa del descanso).
// - `estados`: el de cada zona (logica/gimnasio.js, estadoZonas); `tinte`: si se pintan.
// - `pizarra`: { grupos: [{ zona, n }], entrenos }; `semana`: los siete días del corcho.
// - `resaltada`: id de la máquina o del sitio con el aro mostaza; `siguiente`: máquina que palpita (la
//   siguiente parada de una ruta).
// - `ruta` y `avatar`: lo que el mapa pone entre las paredes y los objetos, y encima de los objetos.
// - `refLejos`, `refCerca`: los dos niveles de rótulos, que el mapa enseña u oculta según el zoom.
// - `puertaRef`: la puerta corredera, que el mapa abre y cierra al entrar.
export function PlanoGimnasio({ pre, estados = {}, tinte = true, idioma, pizarra: datosPizarra, semana, resaltada, siguiente, ruta, avatar, refLejos, refCerca, puertaRef, saluda = false, reducido = false }) {
  const C = TEMA_GIMNASIO;
  const estado = (zona) => (tinte && estados[zona] ? estados[zona].estado : "nada");
  const borde = conBorde(C);
  const aro = (c, margen = 6) => h("rect", { x: c.x - margen, y: c.y - margen, width: c.w + margen * 2, height: c.h + margen * 2, rx: 10, fill: "none", stroke: C.mostaza, strokeWidth: 3, strokeDasharray: "7 5" });

  // Suelo
  const suelo = [
    r(0, 0, ANCHO, ALTO, 0, `url(#${pre}-acera)`), r(0, 992, ANCHO, 18, 0, C.calzada), r(0, 990, ANCHO, 3, 0, C.bordillo),
    r(12, 12, 576, 676, 0, `url(#${pre}-caucho)`), r(12, 700, 242, 228, 0, `url(#${pre}-tarima)`), r(266, 700, 322, 228, 0, `url(#${pre}-baldosa)`), r(290, 686, 50, 16, 0, `url(#${pre}-caucho)`),
    // los pasillos llevan una línea de puntos, como un camino de Maps
    pa("M315,700 L315,304 M24,304 L576,304 M24,540 L576,540", { stroke: C.pasillo, strokeWidth: 3, strokeDasharray: "2 9", strokeLinecap: "round", fill: "none" }),
    ...ZONAS.map((z) => r(z.x + 4, z.y + (z.y === 12 ? 30 : 4), z.w - 8, z.h - (z.y === 12 ? 34 : 8), 10, C.suelo[z.id], { stroke: "rgba(0,0,0,0.05)", strokeWidth: 1.5 })),
  ];

  // Tinte de la semana: verde = entrenada; gris con telarañas = olvidada (14 días o más).
  const capaTinte = [];
  ZONAS.forEach((z) => {
    const y0 = z.y + (z.y === 12 ? 30 : 4), h0 = z.h - (z.y === 12 ? 34 : 8);
    if (estado(z.id) === "entrenada") capaTinte.push(r(z.x + 4, y0, z.w - 8, h0, 10, C.cojin, { opacity: 0.14 }), r(z.x + 5, y0 + 1, z.w - 10, h0 - 2, 9, "none", { stroke: C.cojin, strokeWidth: 2, opacity: 0.5 }));
    if (estado(z.id) === "olvidada") capaTinte.push(r(z.x + 4, y0, z.w - 8, h0, 10, C.tinteOlvidada, { opacity: 0.2 }), telarana(C, z.x + 6, y0 + 2, 34, 0), telarana(C, z.x + z.w - 6, y0 + 2, 26, 90));
  });

  // Paredes: el borde de arriba, oscuro, y las caras que miran hacia ti, claras con zócalo menta.
  const paredes = [
    ...CARAS.map((c) => F(r(c.x, c.y, c.w, c.h, 0, C.paredCara), r(c.x, c.y + c.h - 5, c.w, 5, 0, C.menta))),
    espejo(C, 36, 110), espejo(C, 158, 110), espejo(C, 372, 96),
    r(486, 17, 34, 20, 2, C.mostaza), tx(503, 30, t(idioma, "fitdraft.cartel.animo"), { s: 5, c: C.cojinOsc, w: 700 }),
    r(530, 17, 46, 20, 2, C.crema, { stroke: "#ddd6bf" }), tx(553, 29.5, t(idioma, "fitdraft.cartel.horario"), { s: 5.5, c: C.marcoOsc }),
    r(0, 940, ANCHO, 30, 0, C.fachada), r(0, 964, ANCHO, 6, 0, C.fachadaLinea),
    ...[30, 160, 500].map((vx) => r(vx, 946, 70, 14, 2, C.ventanaFachada, { stroke: C.ventanaMarco, strokeWidth: 2 })),
    ...PAREDES.map((p) => r(p.x, p.y, p.w, p.h, 0, C.paredTop)),
    r(ALFEIZAR.x - 2, ALFEIZAR.y, ALFEIZAR.w + 4, ALFEIZAR.h, 1, C.alfeizar), r(ALFEIZAR.x - 2, ALFEIZAR.y - 3, ALFEIZAR.w + 4, 6, 1, C.maderaOsc), r(ALFEIZAR.x - 2, ALFEIZAR.y + ALFEIZAR.h - 3, ALFEIZAR.w + 4, 6, 1, C.maderaOsc),
    // la puerta de cristal corredera, en la fachada: dos hojas que el mapa desliza al entrar
    r(378, 936, 94, 36, 2, C.disco), r(381, 940, 88, 30, 0, C.puertaLuz, { opacity: 0.55 }),
    h("g", { ref: puertaRef },
      h("g", { "data-hoja": "izq", style: { transition: reducido ? "none" : "transform 0.7s cubic-bezier(.5,0,.3,1)" } },
        r(381, 938, 44, 32, 1, C.puerta, { stroke: C.disco, strokeWidth: 2 }), r(417, 950, 3, 10, 1.5, C.disco), pa("M388,962 L398,944", { stroke: "#fff", strokeWidth: 3, opacity: 0.6 })),
      h("g", { "data-hoja": "der", style: { transition: reducido ? "none" : "transform 0.7s cubic-bezier(.5,0,.3,1)" } },
        r(425, 938, 44, 32, 1, C.puerta, { stroke: C.disco, strokeWidth: 2 }), r(430, 950, 3, 10, 1.5, C.disco), pa("M444,962 L454,944", { stroke: "#fff", strokeWidth: 3, opacity: 0.6 }))),
    r(380, 922, 90, 16, 3, C.cojinOsc), tx(425, 934, "FitDraft", { s: 11, c: C.crema, f: FUENTE_TITULOS }), r(392, 974, 66, 10, 2, C.marcoOsc),
    // el cartel de la oficina, colgado encima del ventanal
    li(238, 754, 238, 762, C.cuerda, 1), li(282, 754, 282, 762, C.cuerda, 1), r(222, 760, 76, 18, 4, C.cojinOsc),
    tx(260, 773, t(idioma, "fitdraft.rotulo.oficina").toUpperCase(), { s: 9.5, c: C.crema, w: 700, extra: { letterSpacing: 2 } }),
  ];

  // Objetos, de arriba abajo para que lo de delante tape lo de detrás.
  const objetos = [];
  ESTACIONES.forEach((e) => {
    const olvidada = estado(e.zona) === "olvidada";
    const primeraDeZona = ESTACIONES.find((x) => x.zona === e.zona) === e;
    objetos.push({
      clave: e.y + e.h,
      el: h("g", { "data-est": e.id, style: { cursor: "pointer" } },
        r(e.x - 6, e.y - 6, e.w + 12, e.h + 12, 8, "transparent"),
        siguiente === e.id ? F(
          r(e.x - 8, e.y - 8, e.w + 16, e.h + 16, 12, C.mostaza, { opacity: 0.18 }),
          reducido ? null : h("rect", { x: e.x - 8, y: e.y - 8, width: e.w + 16, height: e.h + 16, rx: 12, fill: "none", stroke: C.mostaza, strokeWidth: 3, style: { transformBox: "fill-box", transformOrigin: "50% 50%", animation: "fdPulsa 1.4s ease-out infinite" } })
        ) : null,
        resaltada === e.id ? aro(e) : null,
        h("g", olvidada ? { filter: `url(#${pre}-gris)` } : null, dibujoEstacion(e, C)),
        olvidada && primeraDeZona ? telarana(C, e.x + e.w - 4, e.y + 2, 22, 90) : null),
    });
  });
  const sitio = (id, contenido, clave) => objetos.push({
    clave,
    el: h("g", { "data-sitio": id, style: { cursor: "pointer" } }, r(SITIO[id].x - 4, SITIO[id].y - 4, SITIO[id].w + 8, SITIO[id].h + 8, 6, "transparent"), resaltada === id ? aro(SITIO[id], 5) : null, contenido),
  });
  const letras = (DIAS_CORTOS[idioma] || DIAS_CORTOS.es);
  sitio("rutinas", estanteria(C, SITIO.rutinas), 760);
  sitio("semana", corcho(C, SITIO.semana, semana, letras), 750);
  sitio("progreso", pizarra(C, SITIO.progreso, datosPizarra || { grupos: [], entrenos: 0 }, idioma, pre), 754);
  objetos.push({ clave: 790, el: sillaOficina(C, 121, 772) });
  sitio("monitor", h("g", { transform: `translate(${MONITOR.x},${MONITOR.y})` }, h(Monitor, { saluda })), 810);
  objetos.push({ clave: 850, el: mesa(C, MUEBLES[0]) });
  objetos.push({ clave: 886, el: sillaOficina(C, 122, 862) });
  objetos.push({ clave: 914, el: F(planta(C, 20, 884), planta(C, 554, 884)) });
  objetos.push({ clave: 851, el: mostrador(C, MUEBLES[3]) });
  sitio("historial", libro(C, SITIO.historial), 852);
  sitio("empezar", torno(C, SITIO.empezar), 802);
  objetos.push({ clave: 902, el: F(sombra(286, 882, 74, 18), caja(286, 880, 74, 22, 7, C.madera, C.maderaOsc, 3), li(296, 886, 350, 886, C.maderaClara, 1)) });
  objetos.push({ clave: 680, el: F(sombra(262, 654, 22, 26), caja(262, 652, 22, 28, 12, C.metalClaro, C.metal, 3), ci(273, 659, 4, C.agua)) });
  objetos.sort((a, b) => a.clave - b.clave);

  // Rótulos: de lejos las zonas (con su estado de la semana); de cerca, cada máquina y cada sitio.
  const lejos = ZONAS.map((z) => {
    const texto = t(idioma, "fitdraft.zona." + z.id).toUpperCase();
    const st = estado(z.id);
    const icono = st !== "nada";
    const w = texto.length * 11.6 + 30 + (icono ? 20 : 0), x0 = z.lx - w / 2;
    let ic = null;
    if (st === "entrenada") ic = F(ci(x0 + 17, z.ly, 8, C.insigniaVerde), pa(`M${x0 + 13},${z.ly} l3,3 l5,-6`, { stroke: C.cojinOsc, strokeWidth: 2, fill: "none", strokeLinecap: "round" }));
    if (st === "olvidada") ic = F(ci(x0 + 17, z.ly, 8, C.insigniaGris), li(x0 + 11, z.ly - 5, x0 + 23, z.ly + 5, C.marcoOsc, 0.9), li(x0 + 23, z.ly - 5, x0 + 11, z.ly + 5, C.marcoOsc, 0.9), li(x0 + 17, z.ly - 7, x0 + 17, z.ly + 7, C.marcoOsc, 0.9), h("circle", { cx: x0 + 17, cy: z.ly, r: 3.5, fill: "none", stroke: C.marcoOsc, strokeWidth: 0.9 }));
    return h("g", { "data-zona-chip": z.id, style: { cursor: "pointer" } },
      r(x0 + 2, z.ly - 12, w, 28, 14, "#000", { opacity: 0.12 }), r(x0, z.ly - 14, w, 28, 14, C.cojinOsc), ic,
      tx(x0 + w / 2 + (icono ? 10 : 0), z.ly + 6, texto, { s: 16, c: C.crema, w: 700, extra: { letterSpacing: 1.5 } }));
  });
  const rotulosZona = [["fitdraft.rotulo.oficina", 160, 908], ["fitdraft.rotulo.recepcion", 480, 886]].map(([clave, x, y]) =>
    tx(x, y, t(idioma, clave).toUpperCase(), { s: 15, c: C.marcoOsc, w: 700, extra: { letterSpacing: 2, opacity: 0.7, pointerEvents: "none" } }));
  const cerca = [
    ...ESTACIONES.map((e) => tx(e.x + e.w / 2, e.y + e.h + 12, t(idioma, "fitdraft.maquina." + e.id), { s: 8.5, w: 700, extra: borde })),
    ...["rutinas", "semana", "progreso", "historial", "empezar", "monitor"].map((id) => {
      const s = SITIO[id];
      const yy = id === "historial" || id === "empezar" ? s.y - 6 : s.y + s.h + 11;
      return tx(s.x + s.w / 2, yy, t(idioma, "fitdraft.sitio." + id), { s: 8.5, c: C.cojinOsc, w: 700, extra: borde });
    }),
  ];

  return (
    <>
      <defs>
        <filter id={`${pre}-tiza`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.6" />
        </filter>
        <filter id={`${pre}-gris`}>
          <feColorMatrix type="saturate" values="0.12" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.92" intercept="0.06" />
            <feFuncG type="linear" slope="0.92" intercept="0.06" />
            <feFuncB type="linear" slope="0.92" intercept="0.06" />
          </feComponentTransfer>
        </filter>
        <pattern id={`${pre}-caucho`} width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill={C.caucho} /><path d="M0,0 L60,0 M0,0 L0,60" stroke={C.cauchoLinea} strokeWidth="1.5" /></pattern>
        <pattern id={`${pre}-baldosa`} width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill={C.baldosa} /><path d="M0,0 L34,0 M0,0 L0,34" stroke={C.baldosaLinea} strokeWidth="1.5" /></pattern>
        <pattern id={`${pre}-tarima`} width="120" height="16" patternUnits="userSpaceOnUse"><rect width="120" height="16" fill={C.tarima} /><path d="M0,0 L120,0 M40,0 L40,16 M100,8 L100,16" stroke={C.tarimaLinea} strokeWidth="1.2" /><path d="M0,8 L120,8" stroke={C.tarimaLinea2} strokeWidth="0.8" /></pattern>
        <pattern id={`${pre}-acera`} width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill={C.acera} /><path d="M0,0 L40,0 M0,0 L0,40" stroke={C.aceraLinea} strokeWidth="1.5" /></pattern>
      </defs>
      <g>{F(...suelo)}</g>
      {capaTinte.length > 0 && <g>{F(...capaTinte)}</g>}
      <g>{F(...paredes)}</g>
      {ruta}
      <g>{F(...objetos.map((o) => o.el))}</g>
      {avatar}
      <g ref={refLejos}>{F(...lejos, ...rotulosZona)}</g>
      <g ref={refCerca} pointerEvents="none">{F(...cerca)}</g>
    </>
  );
}

// Las claves de la animación de la siguiente parada (un aro que palpita), una sola vez por página.
export function EstilosGimnasio() {
  return (
    <style>{`
      @keyframes fdPulsa { from { transform: scale(0.6); opacity: 0.9; } to { transform: scale(1.5); opacity: 0; } }
      @keyframes fdBrota { from { transform: scale(0.3); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes fdSaluda { from { transform: rotate(-18deg); } to { transform: rotate(14deg); } }
    `}</style>
  );
}
