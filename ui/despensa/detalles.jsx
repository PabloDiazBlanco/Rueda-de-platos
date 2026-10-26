// ---------- ui/despensa/detalles.jsx ----------
// Los detalles que se tocan en la cocina dibujada de «¿Qué tengo?» (estética del 26-oct-2026, bloque
// COCINA de local/ideas/esteticas/registro.md; maqueta v2-07-cocina.html). Son juguetes: no abren nada,
// no cambian nada de la despensa y nada se guarda.
//
// - El frutero, en una repisa de madera encima de la vitrocerámica: enseña la fruta que hay en casa
//   (frutasDelFrutero, logica/nevera.js) y al tocarlo la fruta da un saltito. Está ahí y no colgado junto
//   al grifo para dejar libre la zona del grifo (que tiene su propio juego) y queda por encima de la vitro
//   sin taparla, porque la vitro sigue siendo el botón que lleva a «¿Qué cocino?».
// - La planta de encima de la nevera, que solo se mueve si se toca. Tras un número de toques al azar
//   entre 4 y 9 (otro distinto cada vez) sale una mosca de la tierra, que vuela alrededor de la planta;
//   un toque la mata y deja una mancha verde oscura (no roja, para que no sea desagradable) que se apaga
//   en unos segundos. Si no se le da, se vuelve a esconder sola.
// - La lámpara del techo, que oscila al tocarla y se para sola; cada toque más la mueve más rápido y más
//   amplio, hasta un tope (el doble de rápido), y la luz de debajo se mueve con ella.
//
// Con «reducir movimiento» (accesibilidad), lo que decía cada nota de la maqueta: la fruta no salta, la
// planta y la lámpara no se mueven (la luz de la lámpara solo parpadea), y la mosca aparece y desaparece
// sin volar; su mancha se quita sin fundido.
//
// Se pinta todo en un SVG con las medidas de la escena (ESCENA_ANCHO × ESCENA_ALTO), encima del fondo de
// la cocina y que no recibe toques; lo que se toca son botones invisibles colocados con las mismas
// unidades, como el grifo o la vitro en cocina.jsx. Lo que se mueve cada fotograma (la lámpara) o con una
// animación corta (la planta, la fruta) se cambia directamente en el elemento con refs, sin repintar
// React; la mosca y las manchas sí son estado, porque aparecen y desaparecen.
import React, { useState, useEffect, useRef } from "react";
import { t } from "i18n";
import { IconoAlimento, ESCENA_ANCHO, ESCENA_ALTO } from "./dibujos.jsx";

// ---------- Medidas (unidades de la escena) ----------
// La nevera empieza en y ≈ 97,5 (cocina.jsx): la planta y la lámpara están encima de ella.
const TECHO_NEVERA = 97.5;
// Frutero: centro de la cesta y altura de su base, sobre la repisa que va de x = 108 a 172.
const FRUTERO = { cx: 140, base: 248 };
// Dónde va cada pieza de fruta dentro de la cesta, respecto a su centro (las dos primeras abajo).
const SITIOS_FRUTA = [[-12, -6], [11, -6], [0, -10], [-6, -16], [7, -16]];
const TAMANO_FRUTA = 17;
const ZONA_FRUTERO = { x: 110, y: 212, w: 60, h: 46 };
// Planta: el punto sobre el que se mece (la tierra de la maceta) y la zona que se toca, que no llega a
// la de la lámpara.
const ZONA_PLANTA = { x: 214, y: 40, w: 58, h: TECHO_NEVERA - 40 };
// Lámpara: cuelga del techo en x = 300 y gira sobre ese punto.
const LAMPARA = { x: 300 };
const ZONA_LAMPARA = { x: 276, y: 0, w: 48, h: 62 };

// ---------- Planta y mosca ----------
const TOQUES_MIN = 4;
const TOQUES_MAX = 9;
// La mosca sale de la tierra y vuela en zigzag alrededor de la planta, de punto en punto.
const RUTA_MOSCA = [[240, 82], [214, 58], [262, 40], [278, 72], [226, 34], [256, 66], [232, 50]];
const PASO_MOSCA = 480;
const VUELO_MOSCA = 450;
// Si no se le da, se esconde a los 6 s.
const MOSCA_SE_ESCONDE = 6000;
const MOSCA_TAMANO = 28; // lo que se toca, más grande que el dibujo
// La mancha se apaga en ~3 s (con un pequeño retraso, para que se vea), y sin movimiento se quita al 1,5 s.
const MANCHA_APAGA = 3000;
const MANCHA_RETRASO = 600;
const MANCHA_FUERA = 4000;
const MANCHA_FUERA_SIN_MOVIMIENTO = 1500;

// ---------- Lámpara ----------
// Cada toque suma amplitud (hasta 22°) y «energía» (hasta 1, que es ir al doble de rápido); las dos bajan
// solas, así que la lámpara frena y se para en unos segundos. Frecuencia de partida: 1,1 oscilaciones/s.
const AMPLITUD_POR_TOQUE = 9;
const AMPLITUD_MAX = 22;
const ENERGIA_POR_TOQUE = 0.25;
const FRECUENCIA = 1.1;
const FRENO_AMPLITUD = 2.2; // s (constante de tiempo)
const FRENO_ENERGIA = 2.5;
const AMPLITUD_PARADA = 0.3;

const azar = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Posición de una pieza en porcentajes de la escena (igual que `en` en cocina.jsx).
function en(x, y, w, h) {
  return {
    position: "absolute",
    left: `${(x / ESCENA_ANCHO) * 100}%`, top: `${(y / ESCENA_ALTO) * 100}%`,
    width: `${(w / ESCENA_ANCHO) * 100}%`, height: `${(h / ESCENA_ALTO) * 100}%`,
  };
}

const botonInvisible = { padding: 0, border: "none", background: "none", cursor: "pointer" };

// `frutas`: lo que da useDespensa().frutero(). `bloqueado`: con un panel abierto, los juguetes no
// responden (igual que el grifo).
export function DetallesCocina({ tema, reducido, frutas, bloqueado, idioma }) {
  const tallos = useRef(null);
  const lampara = useRef(null);
  const conoLuz = useRef(null);
  const frutasRef = useRef([]);
  const [mosca, setMosca] = useState(null); // null | { paso }
  const [manchas, setManchas] = useState([]); // [{ id, x, y, apagando }]
  const toques = useRef(0);
  const meta = useRef(azar(TOQUES_MIN, TOQUES_MAX));
  const temporizadores = useRef([]); // el de esconder la mosca
  const deManchas = useRef([]); // los de quitar las manchas, aparte: esconderMosca no debe cortarlos
  const vuelo = useRef(null);
  const pendulo = useRef({ amplitud: 0, energia: 0, fase: 0, ultimo: 0, fotograma: null });

  useEffect(() => () => {
    temporizadores.current.forEach(clearTimeout);
    deManchas.current.forEach(clearTimeout);
    clearInterval(vuelo.current);
    if (pendulo.current.fotograma) cancelAnimationFrame(pendulo.current.fotograma);
  }, []);

  function temporizar(fn, ms) {
    const id = setTimeout(fn, ms);
    temporizadores.current.push(id);
    return id;
  }

  // ---------- frutero ----------
  function tocarFrutero() {
    if (bloqueado || reducido) return;
    frutasRef.current.forEach((el, i) => {
      if (!el || !el.animate) return;
      el.animate(
        [{ transform: "none" }, { transform: "translateY(-7px) rotate(-6deg)", offset: 0.4 }, { transform: "none" }],
        { duration: 500, delay: (i % 3) * 60, easing: "cubic-bezier(.3,1.6,.5,1)" }
      );
    });
  }

  // ---------- planta y mosca ----------
  function tocarPlanta() {
    if (bloqueado) return;
    if (!reducido && tallos.current && tallos.current.animate) {
      tallos.current.animate(
        ["0", "-7deg", "5deg", "-3deg", "1deg", "0"].map((g) => ({ transform: `rotate(${g})` })),
        { duration: 1100, easing: "ease-out" }
      );
    }
    if (mosca) return;
    toques.current += 1;
    if (toques.current >= meta.current) {
      toques.current = 0;
      meta.current = azar(TOQUES_MIN, TOQUES_MAX);
      sacarMosca();
    }
  }

  function sacarMosca() {
    setMosca({ paso: 0 });
    if (!reducido) {
      vuelo.current = setInterval(() => setMosca((m) => (m ? { paso: (m.paso + 1) % RUTA_MOSCA.length } : m)), PASO_MOSCA);
    }
    temporizar(esconderMosca, MOSCA_SE_ESCONDE);
  }

  function esconderMosca() {
    clearInterval(vuelo.current);
    vuelo.current = null;
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
    setMosca(null);
  }

  function aplastarMosca() {
    if (!mosca) return;
    const [x, y] = RUTA_MOSCA[mosca.paso];
    esconderMosca();
    const id = `${Date.now()}-${Math.random()}`;
    setManchas((ms) => [...ms, { id, x, y, apagando: false }]);
    const quitar = () => setManchas((ms) => ms.filter((m) => m.id !== id));
    if (reducido) { deManchas.current.push(setTimeout(quitar, MANCHA_FUERA_SIN_MOVIMIENTO)); return; }
    // Un fotograma después de pintarla, para que la transición tenga un punto de partida.
    requestAnimationFrame(() => requestAnimationFrame(() => setManchas((ms) => ms.map((m) => (m.id === id ? { ...m, apagando: true } : m)))));
    deManchas.current.push(setTimeout(quitar, MANCHA_FUERA));
  }

  // ---------- lámpara ----------
  function pasoPendulo(ahora) {
    const p = pendulo.current;
    const dt = Math.min(0.05, Math.max(0, (ahora - p.ultimo) / 1000));
    p.ultimo = ahora;
    p.amplitud *= Math.exp(-dt / FRENO_AMPLITUD);
    p.energia *= Math.exp(-dt / FRENO_ENERGIA);
    p.fase += dt * FRECUENCIA * (1 + Math.min(1, p.energia)) * Math.PI * 2;
    const el = lampara.current;
    if (p.amplitud > AMPLITUD_PARADA) {
      if (el) el.style.transform = `rotate(${p.amplitud * Math.sin(p.fase)}deg)`;
      p.fotograma = requestAnimationFrame(pasoPendulo);
    } else {
      if (el) el.style.transform = "";
      p.amplitud = 0;
      p.fotograma = null;
    }
  }

  function tocarLampara() {
    if (bloqueado) return;
    if (reducido) {
      if (conoLuz.current && conoLuz.current.animate) {
        conoLuz.current.animate([{ opacity: 0.28 }, { opacity: 0.7 }, { opacity: 0.28 }], { duration: 400 });
      }
      return;
    }
    const p = pendulo.current;
    p.amplitud = Math.min(AMPLITUD_MAX, p.amplitud + AMPLITUD_POR_TOQUE);
    p.energia = Math.min(1, p.energia + ENERGIA_POR_TOQUE);
    if (!p.fotograma) {
      p.ultimo = performance.now();
      p.fotograma = requestAnimationFrame(pasoPendulo);
    }
  }

  const { cx, base } = FRUTERO;
  const posMosca = mosca ? RUTA_MOSCA[mosca.paso] : null;

  return (
    <>
      <svg
        viewBox={`0 0 ${ESCENA_ANCHO} ${ESCENA_ALTO}`} aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
      >
        {/* la repisa y el frutero, con la fruta detrás del frente de la cesta */}
        <rect x="108" y={base + 6} width="64" height="4" rx="2" fill={tema.maderaOscura} />
        <path d={`M114,${base + 10} L114,${base + 18} M166,${base + 10} L166,${base + 18}`} stroke={tema.maderaOscura} strokeWidth="2" />
        {frutas.slice(0, SITIOS_FRUTA.length).map((e, i) => {
          const [dx, dy] = SITIOS_FRUTA[i];
          return (
            <g
              key={e.food.id}
              ref={(el) => { frutasRef.current[i] = el; }}
              style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            >
              {/* La del catálogo base, con su dibujo propio; la que creó el usuario, con su emoji (como en
                  el resto de la despensa) o, sin él, con el dibujo genérico de la fruta. */}
              {!e.dibujo && e.food.emoji ? (
                <text x={cx + dx} y={base - 4 + dy + 5} fontSize="13" textAnchor="middle">{e.food.emoji}</text>
              ) : (
                <IconoAlimento
                  forma={e.forma} dibujo={e.dibujo} tamano={TAMANO_FRUTA}
                  x={cx + dx - TAMANO_FRUTA / 2} y={base - 4 + dy - TAMANO_FRUTA * 0.7}
                />
              )}
            </g>
          );
        })}
        <path d={`M${cx - 22},${base - 8} L${cx - 18},${base + 6} L${cx + 18},${base + 6} L${cx + 22},${base - 8} Z`} fill={tema.mimbre} />
        {[0, 1].map((i) => (
          <path key={i} d={`M${cx - 21},${base - 3 + i * 5} L${cx + 21},${base - 3 + i * 5}`} stroke={tema.mimbreOscuro} strokeWidth="1.3" />
        ))}
        {[-11, 0, 11].map((d) => (
          <path key={d} d={`M${cx + d},${base - 8} L${cx + d * 0.85},${base + 6}`} stroke={tema.mimbreOscuro} strokeWidth="1.3" />
        ))}
        <path d={`M${cx - 20},${base - 8} Q${cx},${base - 34} ${cx + 20},${base - 8}`} stroke={tema.mimbreOscuro} strokeWidth="2.4" fill="none" />

        {/* la planta: los tallos se mecen sobre la tierra; la maceta no se mueve */}
        <g ref={tallos} style={{ transformBox: "view-box", transformOrigin: "240px 84px" }}>
          <path d="M232,82 Q220,62 228,52 M238,82 Q240,58 252,50 M244,82 Q258,68 266,66" stroke={tema.planta} strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="227" cy="50" rx="6" ry="3.5" fill={tema.hoja} transform="rotate(-50 227 50)" />
          <ellipse cx="253" cy="49" rx="6" ry="3.5" fill={tema.hoja} transform="rotate(30 253 49)" />
          <ellipse cx="267" cy="65" rx="6" ry="3.5" fill={tema.hoja} />
        </g>
        <path d={`M222,80 L258,80 L253,${TECHO_NEVERA} L227,${TECHO_NEVERA} Z`} fill={tema.maceta} />
        <ellipse cx="240" cy="80.5" rx="18" ry="2.5" fill="#6b4423" />

        {/* las manchas de las moscas aplastadas */}
        {manchas.map((m) => (
          <g
            key={m.id}
            style={{
              opacity: m.apagando ? 0 : 1,
              transition: m.apagando ? `opacity ${MANCHA_APAGA}ms ease-in ${MANCHA_RETRASO}ms` : "none",
            }}
          >
            <ellipse cx={m.x} cy={m.y} rx="6" ry="4" fill={tema.mancha} opacity="0.85" />
            <circle cx={m.x + 7} cy={m.y - 3} r="1.6" fill={tema.mancha} opacity="0.8" />
            <circle cx={m.x - 6} cy={m.y + 3} r="1.3" fill={tema.mancha} opacity="0.8" />
          </g>
        ))}

        {/* la lámpara de siempre, con su luz, colgada del techo: gira sobre el punto de donde cuelga */}
        <g ref={lampara} style={{ transformBox: "view-box", transformOrigin: `${LAMPARA.x}px 0px` }}>
          <path ref={conoLuz} d={`M${LAMPARA.x},62 L${LAMPARA.x - 30},${TECHO_NEVERA - 6} L${LAMPARA.x + 30},${TECHO_NEVERA - 6} Z`} fill={tema.luz} opacity="0.28" />
          <rect x={LAMPARA.x - 1} y="0" width="2" height="34" fill={tema.cable} />
          <path d={`M${LAMPARA.x - 18},52 Q${LAMPARA.x - 18},34 ${LAMPARA.x},34 Q${LAMPARA.x + 18},34 ${LAMPARA.x + 18},52 Z`} fill={tema.cuerpo} />
          <ellipse cx={LAMPARA.x} cy="54" rx="8" ry="3" fill={tema.luz} />
        </g>
      </svg>

      <button onClick={tocarFrutero} aria-label={t(idioma, "cocina.frutero")} style={{ ...botonInvisible, ...en(ZONA_FRUTERO.x, ZONA_FRUTERO.y, ZONA_FRUTERO.w, ZONA_FRUTERO.h) }} />
      <button onClick={tocarPlanta} aria-label={t(idioma, "cocina.planta")} style={{ ...botonInvisible, ...en(ZONA_PLANTA.x, ZONA_PLANTA.y, ZONA_PLANTA.w, ZONA_PLANTA.h) }} />
      <button onClick={tocarLampara} aria-label={t(idioma, "cocina.lampara")} style={{ ...botonInvisible, ...en(ZONA_LAMPARA.x, ZONA_LAMPARA.y, ZONA_LAMPARA.w, ZONA_LAMPARA.h) }} />

      {/* La mosca es un botón que se mueve (de punto en punto de su ruta) para poder darle con el dedo. */}
      {posMosca && (
        <button
          onClick={aplastarMosca}
          aria-label={t(idioma, "cocina.mosca")}
          style={{
            ...botonInvisible,
            ...en(posMosca[0] - MOSCA_TAMANO / 2, posMosca[1] - MOSCA_TAMANO / 2, MOSCA_TAMANO, MOSCA_TAMANO),
            transition: reducido ? "none" : `left ${VUELO_MOSCA}ms ease-in-out, top ${VUELO_MOSCA}ms ease-in-out`,
            zIndex: 3,
          }}
        >
          <svg viewBox={`${-MOSCA_TAMANO / 2} ${-MOSCA_TAMANO / 2} ${MOSCA_TAMANO} ${MOSCA_TAMANO}`} width="100%" height="100%" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
            <ellipse cx="-2" cy="-4" rx="4" ry="2.4" fill={tema.alaMosca} opacity="0.85" />
            <ellipse cx="3" cy="-4" rx="4" ry="2.4" fill={tema.alaMosca} opacity="0.85" />
            <ellipse cx="0" cy="0" rx="4.5" ry="3.5" fill={tema.mosca} />
            <circle cx="4" cy="0" r="1.2" fill={tema.ojoMosca} />
          </svg>
        </button>
      )}
    </>
  );
}
