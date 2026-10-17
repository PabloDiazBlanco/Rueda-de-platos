// ---------- ui/despensa/cocina.jsx ----------
// Vista dibujada de «¿Qué tengo?» (Fase B de la despensa, capa 1): la nevera retro con su congelador y,
// al lado, el estante de la despensa. Tocar una puerta la abre de verdad: gira sobre su bisagra, con un
// pequeño rebote al llegar al tope, se enciende la luz de dentro y, justo después, el interior se
// amplía a pantalla completa (ui/despensa/panel.jsx), donde se ve y se cambia lo que hay. Al volver,
// el panel se desvanece y la puerta se cierra con el mismo giro al revés. Nevera y congelador se abren
// cada uno por su puerta; el estante no tiene puerta y se abre directamente.
//
// Con «reducir movimiento» activado en el sistema (una opción de accesibilidad) no hay giros ni
// fundidos: el interior se abre al instante.
//
// Las capas 2 (pared y encimera) y 3 (vitrocerámica y grifo, que llevará a «¿Qué puedo cocinar?") son
// para más adelante: ver local/ideas/ideas-futuras.md (F1).
import React, { useState, useEffect, useRef } from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";
import { NeveraCuerpo, PuertaFrente, PuertaDorso, Estante, NEVERA_ANCHO, NEVERA_ALTO, CORTE, CUERPO_ALTO } from "./dibujos.jsx";
import { PanelZona } from "./panel.jsx";

// Tiempos de la animación (ms). La puerta tarda en abrirse ABRIR_PUERTA y el panel aparece poco antes
// de que termine el rebote, para que no se note una espera; el estante solo «late» un momento.
const ABRIR_PUERTA = 560;
const PANEL_TRAS_PUERTA = 520;
const PANEL_TRAS_ESTANTE = 240;
const CERRAR_PUERTA = 380;
// Ángulo de la puerta abierta: algo más de 90°, para que se vea su cara de dentro con las baldas.
const ANGULO_ABIERTA = -112;

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

export function VistaDibujo({ data, despensa, tema, idioma }) {
  const [reducido] = useState(prefiereMenosMovimiento);
  const [puertas, setPuertas] = useState({ nevera: false, congelador: false });
  const [estantePulsado, setEstantePulsado] = useState(false);
  const [panel, setPanel] = useState(null);
  const temporizadores = useRef([]);

  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  function luego(fn, ms) {
    if (reducido) { fn(); return; }
    temporizadores.current.push(setTimeout(fn, ms));
  }

  function abrir(zona) {
    if (panel) return;
    if (zona === "despensa") {
      setEstantePulsado(true);
      luego(() => setPanel("despensa"), PANEL_TRAS_ESTANTE);
      return;
    }
    setPuertas((p) => ({ ...p, [zona]: true }));
    luego(() => setPanel(zona), PANEL_TRAS_PUERTA);
  }

  // Lo llama el panel cuando ya se ha desvanecido: entonces se cierran las puertas (y vuelve el estante).
  function alCerrarPanel() {
    setPanel(null);
    luego(() => {
      setPuertas({ nevera: false, congelador: false });
      setEstantePulsado(false);
    }, 40);
  }

  const huecosNevera = despensa.huecos("nevera");
  const huecosCongelador = despensa.huecos("congelador");
  const huecosDespensa = despensa.huecos("despensa");
  const puertaNevera = huecosNevera.find((h) => h.clave === "puerta");
  const cuenta = (zona) => despensa.porZona[zona].length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "6%", maxWidth: 400, margin: "6px auto 0" }}>
        {/* El estante a la izquierda y la nevera a la derecha: la puerta gira sobre su bisagra izquierda
            y así se abre por encima del estante, a la vista, en vez de salirse de la pantalla. */}
        <div style={{ width: "40%" }}>
          <button
            onClick={() => abrir("despensa")}
            aria-label={t(idioma, "despensa.abrir.despensa")}
            style={{
              display: "block", width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer",
              transform: estantePulsado ? "scale(1.04)" : "none", transformOrigin: "50% 100%",
              transition: reducido ? "none" : "transform 220ms cubic-bezier(.3,1.6,.5,1)",
            }}
          >
            <Estante tema={tema} huecos={huecosDespensa} />
          </button>
          <Sombra />
        </div>
        {/* Nevera: el cuerpo con su interior, y las dos puertas encima. Todo se escala con el ancho
            (aspect-ratio fijo), así que las puertas, en porcentaje, siempre encajan con el cuerpo. */}
        <div style={{ width: "54%" }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: `${NEVERA_ANCHO} / ${NEVERA_ALTO}`, perspective: 1100 }}>
            <NeveraCuerpo
              tema={tema}
              huecosNevera={huecosNevera}
              huecosCongelador={huecosCongelador}
              luzNevera={puertas.nevera}
              luzCongelador={puertas.congelador}
              reducido={reducido}
            />
            <Puerta
              zona="congelador" abierta={puertas.congelador} reducido={reducido} onClick={() => abrir("congelador")}
              arriba={0} alto={CORTE / NEVERA_ALTO} etiqueta={t(idioma, "despensa.abrir.congelador")}
              frente={<PuertaFrente tema={tema} zona="congelador" />}
              dorso={<PuertaDorso tema={tema} zona="congelador" />}
            />
            <Puerta
              zona="nevera" abierta={puertas.nevera} reducido={reducido} onClick={() => abrir("nevera")}
              arriba={CORTE / NEVERA_ALTO} alto={(CUERPO_ALTO - CORTE) / NEVERA_ALTO} etiqueta={t(idioma, "despensa.abrir.nevera")}
              frente={<PuertaFrente tema={tema} zona="nevera" />}
              dorso={<PuertaDorso tema={tema} zona="nevera" entradasPuerta={puertaNevera ? puertaNevera.entradas : []} />}
            />
          </div>
          <Sombra />
        </div>

      </div>

      {/* Lo mismo con botones normales: a la vista cuánto hay en cada sitio, y abrir sin tener que
          atinar con una puerta (también con teclado o lector de pantalla). */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {["nevera", "congelador", "despensa"].map((zona) => (
          <button
            key={zona}
            onClick={() => abrir(zona)}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", cursor: "pointer",
              background: "var(--green-soft)", border: "none", borderRadius: 20, padding: "7px 12px",
            }}
          >
            {t(idioma, "despensa.zonaConCuenta", { zona: t(idioma, "despensa.zona." + zona), n: cuenta(zona) })}
          </button>
        ))}
      </div>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", textAlign: "center", margin: "10px 0 0" }}>
        {t(idioma, "despensa.tocaParaAbrir")}
      </p>

      {panel && (
        <PanelZona zona={panel} despensa={despensa} data={data} tema={tema} reducido={reducido} onCerrar={alCerrarPanel} idioma={idioma} />
      )}
    </>
  );
}

// Una puerta que gira sobre su bisagra (a la izquierda: los tiradores están a la derecha). Tiene dos
// caras, la de fuera y la de dentro, y cada una se oculta cuando queda de espaldas. Al abrir, la curva
// se pasa un poco del ángulo final y vuelve: ese es el rebote al llegar al tope.
function Puerta({ abierta, reducido, onClick, arriba, alto, etiqueta, frente, dorso }) {
  const cara = { position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      style={{
        position: "absolute", left: 0, top: `${arriba * 100}%`, width: "100%", height: `${alto * 100}%`,
        padding: 0, border: "none", background: "none", cursor: "pointer",
        transformOrigin: "left center", transformStyle: "preserve-3d",
        transform: `rotateY(${abierta ? ANGULO_ABIERTA : 0}deg)`,
        transition: reducido
          ? "none"
          : abierta
          ? `transform ${ABRIR_PUERTA}ms cubic-bezier(.3,1.45,.5,1)`
          : `transform ${CERRAR_PUERTA}ms cubic-bezier(.4,0,.2,1)`,
        zIndex: abierta ? 2 : 1,
      }}
    >
      <span style={cara}>{frente}</span>
      <span style={{ ...cara, transform: "rotateY(180deg)" }}>{dorso}</span>
    </button>
  );
}

function Sombra() {
  return <div style={{ height: 10, margin: "-4px 6% 0", borderRadius: "50%", background: "rgba(0,0,0,0.10)" }} />;
}
