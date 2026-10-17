// ---------- ui/despensa/cocina.jsx ----------
// Vista dibujada de «¿Qué tengo?» (Fase B de la despensa): una cocina con la nevera retro y su
// congelador, el estante de la despensa colgado en la pared, y la encimera con el fregadero y la
// vitrocerámica. Tocar una puerta la abre de verdad: gira sobre su bisagra, con un
// pequeño rebote al llegar al tope, se enciende la luz de dentro y, justo después, el interior se
// amplía a pantalla completa (ui/despensa/panel.jsx), donde se ve y se cambia lo que hay. Al volver,
// el panel se desvanece y la puerta se cierra con el mismo giro al revés. Nevera y congelador se abren
// cada uno por su puerta; el estante no tiene puerta y se abre directamente.
//
// Las tres capas acordadas con el usuario (idea F1 de local/ideas/ideas-futuras.md): 1) nevera y
// estante, lo que guarda de verdad la despensa; 2) pared, azulejos, encimera y muebles, solo decorado;
// 3) la vitrocerámica, que enciende un fuego y lleva a «¿Qué cocino?» (solo navegando: esa pantalla es
// la de siempre, premium o con su aviso), y el grifo, que suelta una gota al tocarlo.
// Además, el mueble de debajo del fregadero se abre como la nevera y guarda la lista de limpieza y cosas
// de casa (ui/despensa/fregadero.jsx).
//
// El juego del grifo (idea del usuario, octubre de 2026): debajo del fregadero, el sifón baja recto hasta
// una botella de detergente vacía, y cada gota la llena una parte fija (GOTAS_PARA_LLENAR). Con la última,
// se desborda: la puerta del mueble se abre (o se queda abierta), la botella cae al suelo con los botes
// de limpieza que haya y se forma un charco de agua sucia. Tocar el charco lo recoge todo y la botella
// vuelve vacía a su sitio. Es solo un juego: lo lleno que está se recuerda en este dispositivo
// (localStorage), no en la cuenta, y si se sale con el charco en el suelo, al volver ya está recogido.
//
// Con «reducir movimiento» activado en el sistema (una opción de accesibilidad) no hay giros ni
// fundidos: el interior se abre al instante, la vitrocerámica navega sin esperar al fuego, y el grifo
// llena la botella sin gota que caiga (y si se desborda, todo aparece ya en el suelo).
import React, { useState, useEffect, useRef } from "react";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";
import {
  NeveraCuerpo, PuertaFrente, PuertaDorso, Estante, FondoCocina, PuertaMuebleFrente, PuertaMuebleDorso, MUEBLE_FREGADERO,
  NEVERA_ANCHO, NEVERA_ALTO, CORTE, CUERPO_ALTO, ESTANTE_ANCHO, ESTANTE_ALTO, ESCENA_ANCHO, ESCENA_ALTO, SUELO_Y,
} from "./dibujos.jsx";
import { PanelZona } from "./panel.jsx";
import { PanelFregadero } from "./fregadero.jsx";

// Tiempos de la animación (ms). La puerta tarda en abrirse ABRIR_PUERTA y el panel aparece poco antes
// de que termine el rebote, para que no se note una espera; el estante solo «late» un momento.
const ABRIR_PUERTA = 560;
const PANEL_TRAS_PUERTA = 520;
const PANEL_TRAS_ESTANTE = 240;
const CERRAR_PUERTA = 380;
// Ángulo de la puerta abierta: algo más de 90°, para que se vea su cara de dentro con las baldas.
const ANGULO_ABIERTA = -112;
// El fuego de la vitrocerámica se ve encendido este rato antes de cambiar de pantalla.
const FUEGO_ANTES_DE_IR = 420;
const DURACION_GOTA = 650;
// La gota llega al fregadero a este tiempo (su caída dura 480 ms, ver FondoCocina): entonces sube el agua.
const LLEGA_GOTA = 520;
// Cuántas gotas llenan la botella (cada una, la misma cantidad: una octava parte).
const GOTAS_PARA_LLENAR = 8;
// Al desbordarse: lo que tarda la puerta en abrirse antes de que caiga la botella, y lo que tarda todo en
// volver a su sitio al recoger el charco antes de cerrar la puerta.
const VUELCO_TRAS_ABRIR = 320;
const RECOGER = 460;
const CLAVE_AGUA = "fooddraft:agua-fregadero";

// Dónde va cada pieza de la escena, en unidades del dibujo de la cocina (ESCENA_ANCHO × ESCENA_ALTO,
// ver FondoCocina). La nevera, a la derecha y de pie sobre el suelo: su puerta gira sobre la bisagra de
// la izquierda y así se abre por encima de la encimera, a la vista. El estante, colgado en la pared de
// la izquierda, encima de los azulejos. La vitrocerámica y el grifo, sobre la encimera: lo que se toca es
// algo más grande que el dibujo, para que sea fácil acertar con el dedo.
const NEVERA_X = 182;
const NEVERA_W = 170;
const NEVERA_Y = SUELO_Y + 6 - (NEVERA_W * NEVERA_ALTO) / NEVERA_ANCHO;
const ESTANTE = { x: 24, y: 20, w: 124 };
const VITRO = { x: 88, y: 258, w: 90, h: 48 };
const GRIFO = { x: 6, y: 230, w: 80, h: 70 };

// Posición de una pieza en porcentajes del contenedor de la escena, que tiene la misma proporción que el
// dibujo: así todo encaja a cualquier ancho de pantalla.
function en(x, y, w, h) {
  return {
    position: "absolute",
    left: `${(x / ESCENA_ANCHO) * 100}%`, top: `${(y / ESCENA_ALTO) * 100}%`,
    width: `${(w / ESCENA_ANCHO) * 100}%`, ...(h !== undefined ? { height: `${(h / ESCENA_ALTO) * 100}%` } : {}),
  };
}

const botonInvisible = { padding: 0, border: "none", background: "none", cursor: "pointer" };

// Lo llena que está la botella (en gotas), guardado en el dispositivo. Siempre con try/catch: en una
// ventana privada o con los datos del sitio bloqueados, localStorage puede fallar, y entonces la botella
// simplemente empieza vacía.
function leerAgua() {
  try {
    const n = parseInt(localStorage.getItem(CLAVE_AGUA), 10);
    return n > 0 && n < GOTAS_PARA_LLENAR ? n : 0;
  } catch (e) {
    return 0;
  }
}

function guardarAgua(n) {
  try {
    localStorage.setItem(CLAVE_AGUA, String(n));
  } catch (e) {
    // sin almacenamiento, el nivel solo dura mientras la pantalla está abierta
  }
}

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}

export function VistaDibujo({ data, despensa, tema, idioma, onIrACocinar }) {
  const [reducido] = useState(prefiereMenosMovimiento);
  const [puertas, setPuertas] = useState({ nevera: false, congelador: false, fregadero: false });
  const [estantePulsado, setEstantePulsado] = useState(false);
  const [panel, setPanel] = useState(null);
  const [fuego, setFuego] = useState(false);
  const [gota, setGota] = useState(null); // null | "arriba" | "abajo"
  const [agua, setAgua] = useState(leerAgua);
  const [derrame, setDerrame] = useState(null); // null | "lleno" | "charco" | "recogiendo"
  // Copias en refs para los temporizadores (que ven el estado del render en que se crearon) y para que
  // varios toques seguidos no se pisen.
  const aguaRef = useRef(agua);
  const derrameRef = useRef(null);
  const temporizadores = useRef([]);

  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  function temporizar(fn, ms) {
    temporizadores.current.push(setTimeout(fn, ms));
  }
  // Como temporizar, pero sin esperar si el sistema pide reducir el movimiento.
  function luego(fn, ms) {
    if (reducido) { fn(); return; }
    temporizar(fn, ms);
  }

  function irACocinar() {
    if (panel || fuego) return;
    setFuego(true);
    luego(onIrACocinar, FUEGO_ANTES_DE_IR);
  }

  function cambiarDerrame(fase) {
    derrameRef.current = fase;
    setDerrame(fase);
  }

  // La gota aparece en el caño y, un instante después, empieza a caer (así la transición tiene un punto
  // de partida ya pintado); al llegar al fregadero, sube el agua de la botella. Sin movimiento no hay
  // gota: el agua sube nada más tocar. Con el charco en el suelo, el grifo no hace nada.
  function abrirGrifo() {
    if (panel || derrameRef.current) return;
    if (reducido) { sumarAgua(); return; }
    if (gota) return;
    setGota("arriba");
    temporizar(() => setGota("abajo"), 40);
    temporizar(sumarAgua, LLEGA_GOTA);
    temporizar(() => setGota(null), DURACION_GOTA);
  }

  function sumarAgua() {
    if (derrameRef.current) return;
    const n = aguaRef.current + 1;
    if (n >= GOTAS_PARA_LLENAR) { derramar(); return; }
    aguaRef.current = n;
    setAgua(n);
    guardarAgua(n);
  }

  // La botella, ya llena, se ve un momento mientras se abre la puerta; luego cae. El nivel guardado vuelve
  // a cero desde ya: si se cierra la app con el charco, al volver está recogido y la botella vacía.
  function derramar() {
    aguaRef.current = 0;
    setAgua(0);
    guardarAgua(0);
    setPuertas((p) => ({ ...p, fregadero: true }));
    if (reducido) { cambiarDerrame("charco"); return; }
    cambiarDerrame("lleno");
    temporizar(() => cambiarDerrame("charco"), VUELCO_TRAS_ABRIR);
  }

  // Tocar el charco: se seca, la botella (vacía) y los botes vuelven a su sitio y se cierra la puerta.
  function recogerCharco() {
    if (derrameRef.current !== "charco") return;
    cambiarDerrame("recogiendo");
    luego(() => {
      cambiarDerrame(null);
      setPuertas((p) => ({ ...p, fregadero: false }));
    }, RECOGER);
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
  // Con el charco en el suelo, la del fregadero se queda abierta hasta recogerlo.
  function alCerrarPanel() {
    setPanel(null);
    luego(() => {
      setPuertas({ nevera: false, congelador: false, fregadero: !!derrameRef.current });
      setEstantePulsado(false);
    }, 40);
  }

  const huecosNevera = despensa.huecos("nevera");
  const huecosCongelador = despensa.huecos("congelador");
  const huecosDespensa = despensa.huecos("despensa");
  const puertaNevera = huecosNevera.find((h) => h.clave === "puerta");
  const cuenta = (zona) => despensa.porZona[zona].length;
  // Si algo de una zona se está acabando, su botón de abajo lleva un punto rojo (el detalle, en el aviso
  // de arriba de la pantalla y en rojo dentro de la nevera).
  const conAlerta = (zona) => despensa.alertas.some((a) => a.zonas.includes(zona));
  const limpiezaPendiente = despensa.limpieza.filter((c) => !c.comprado).length;
  const m = MUEBLE_FREGADERO;

  return (
    <>
      <div
        style={{
          position: "relative", width: "100%", maxWidth: 420, margin: "4px auto 0", aspectRatio: `${ESCENA_ANCHO} / ${ESCENA_ALTO}`,
          borderRadius: 18, boxShadow: "0 0 0 1px var(--line)",
        }}
      >
        <FondoCocina
          tema={tema} fuegoEncendido={fuego} gota={gota} reducido={reducido} cosasFregadero={limpiezaPendiente}
          nivelAgua={agua / GOTAS_PARA_LLENAR} derrame={derrame}
        />

        <button onClick={abrirGrifo} aria-label={t(idioma, "despensa.grifo")} style={{ ...botonInvisible, ...en(GRIFO.x, GRIFO.y, GRIFO.w, GRIFO.h) }} />
        <button onClick={irACocinar} aria-label={t(idioma, "despensa.abrir.cocinar")} style={{ ...botonInvisible, ...en(VITRO.x, VITRO.y, VITRO.w, VITRO.h) }} />

        <button
          onClick={() => abrir("despensa")}
          aria-label={t(idioma, "despensa.abrir.despensa")}
          style={{
            ...botonInvisible, ...en(ESTANTE.x, ESTANTE.y, ESTANTE.w, (ESTANTE.w * ESTANTE_ALTO) / ESTANTE_ANCHO), display: "block",
            transform: estantePulsado ? "scale(1.04)" : "none", transformOrigin: "50% 100%",
            transition: reducido ? "none" : "transform 220ms cubic-bezier(.3,1.6,.5,1)",
          }}
        >
          <Estante tema={tema} huecos={huecosDespensa} />
        </button>

        {/* El mueble de debajo del fregadero: su puerta se abre como las de la nevera, pero con la
            bisagra a la derecha (se abre hacia el otro mueble, no fuera de la escena). */}
        <div style={{ ...en(m.x, m.y, m.w, m.h), perspective: 500 }}>
          <Puerta
            abierta={puertas.fregadero} reducido={reducido} onClick={() => abrir("fregadero")} bisagra="derecha"
            arriba={0} alto={1} etiqueta={t(idioma, "despensa.abrir.fregadero")}
            frente={<PuertaMuebleFrente tema={tema} />}
            dorso={<PuertaMuebleDorso tema={tema} />}
          />
        </div>

        {/* El charco se recoge tocándolo: la zona que se toca es todo el suelo de delante de los muebles,
            más grande que el dibujo, para acertar fácil. */}
        {derrame === "charco" && (
          <button onClick={recogerCharco} aria-label={t(idioma, "despensa.charco")} style={{ ...botonInvisible, ...en(8, SUELO_Y, 172, ESCENA_ALTO - SUELO_Y) }} />
        )}

        {/* Nevera: el cuerpo con su interior, y las dos puertas encima. Su caja tiene la proporción del
            dibujo de la nevera, así que las puertas, en porcentaje, siempre encajan con el cuerpo. Va la
            última para que la puerta abierta quede por delante de la encimera. */}
        <div style={en(NEVERA_X, NEVERA_Y, NEVERA_W)}>
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
        </div>
      </div>

      {/* Lo mismo con botones normales: a la vista cuánto hay en cada sitio, y abrir sin tener que
          atinar con una puerta (también con teclado o lector de pantalla). */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {["nevera", "congelador", "despensa", "fregadero"].map((zona) => (
          <button
            key={zona}
            onClick={() => abrir(zona)}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", cursor: "pointer",
              background: "var(--green-soft)", border: "none", borderRadius: 20, padding: "7px 12px",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {zona === "fregadero"
              ? t(idioma, "despensa.zonaConCuenta", { zona: t(idioma, "despensa.fregadero.titulo"), n: limpiezaPendiente })
              : t(idioma, "despensa.zonaConCuenta", { zona: t(idioma, "despensa.zona." + zona), n: cuenta(zona) })}
            {zona !== "fregadero" && conAlerta(zona) && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: tema.alerta, flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>
      <p
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 12, textAlign: "center", margin: "10px 0 0",
          color: derrame === "charco" ? "var(--ink)" : "var(--ink-soft)", fontWeight: derrame === "charco" ? 700 : 400,
        }}
      >
        {derrame === "charco" ? t(idioma, "despensa.charco.ayuda") : t(idioma, "despensa.tocaParaAbrir")}
      </p>

      {panel === "fregadero" && (
        <PanelFregadero
          despensa={despensa} tema={tema} reducido={reducido} nivelAgua={agua / GOTAS_PARA_LLENAR} onCerrar={alCerrarPanel} idioma={idioma}
        />
      )}
      {panel && panel !== "fregadero" && (
        <PanelZona zona={panel} despensa={despensa} data={data} tema={tema} reducido={reducido} onCerrar={alCerrarPanel} idioma={idioma} />
      )}
    </>
  );
}

// Una puerta que gira sobre su bisagra: a la izquierda en la nevera (los tiradores están a la derecha) y
// a la derecha en el mueble del fregadero. Tiene dos caras, la de fuera y la de dentro, y cada una se
// oculta cuando queda de espaldas. Al abrir, la curva se pasa un poco del ángulo final y vuelve: ese es
// el rebote al llegar al tope.
function Puerta({ abierta, reducido, onClick, arriba, alto, etiqueta, frente, dorso, bisagra = "izquierda" }) {
  const cara = { position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      style={{
        position: "absolute", left: 0, top: `${arriba * 100}%`, width: "100%", height: `${alto * 100}%`,
        padding: 0, border: "none", background: "none", cursor: "pointer",
        transformOrigin: bisagra === "derecha" ? "right center" : "left center", transformStyle: "preserve-3d",
        transform: `rotateY(${abierta ? (bisagra === "derecha" ? -ANGULO_ABIERTA : ANGULO_ABIERTA) : 0}deg)`,
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
