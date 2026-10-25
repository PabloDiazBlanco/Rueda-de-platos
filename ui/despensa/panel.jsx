// ---------- ui/despensa/panel.jsx ----------
// El interior de una zona a pantalla completa, lo que se ve tras abrir la puerta de la nevera dibujada
// (ui/despensa/cocina.jsx): la nevera con sus baldas, la puerta y el cajón; el congelador con sus
// cajones; o el estante de la despensa. Cada cosa es una ficha con su dibujo, su nombre y lo que queda;
// tocarla abre el modal para cambiarla. Qué va en cada hueco lo decide logica/nevera.js
// (repartirEnHuecos, a través de useDespensa().huecos).
//
// No es un único SVG, sino cajas con el aspecto de la nevera: lo que hay dentro cambia de tamaño (dos
// yogures o veinte cosas), y así cada balda crece o se desplaza sola en vez de tener que calcular a mano
// dónde cabe cada dibujo. Se cierra con «Volver» o con Escape.
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { IconoAlimento } from "./dibujos.jsx";
import { nombreCorto, formatoGramos } from "./piezas.jsx";
import { EditarEntradaModal } from "./editar.jsx";
import { AnadirAlimentoModal } from "./anadir.jsx";

// Etiqueta de cada hueco. Lácteos y embutido reutilizan el nombre de su carpeta del catálogo.
const ETIQUETA_HUECO = {
  puerta: "despensa.hueco.puerta", lacteos: "categoriaAlimento.lacteos", carne: "despensa.hueco.carne",
  embutido: "categoriaAlimento.embutidoFiambre", otros: "despensa.hueco.otros", frutaVerdura: "despensa.hueco.frutaVerdura",
  cereales: "despensa.hueco.cereales", conservas: "despensa.hueco.conservas", aceites: "despensa.hueco.aceites", pan: "despensa.hueco.pan",
};

const DURACION_SALIDA = 200;

// Marco común de los paneles a pantalla completa (el interior de la nevera, del congelador, del
// estante y del mueble del fregadero): el fundido de entrada y salida, Escape para cerrar, que la
// pantalla de debajo no se desplace, la barra con «Volver» y el título, y un pie opcional. `escapeActivo`
// lo apaga mientras hay un modal abierto encima, para que Escape cierre el modal y no el panel.
export function MarcoPanel({ titulo, fondo, tema, reducido, onCerrar, escapeActivo = true, pie, encima, idioma, children }) {
  const [visible, setVisible] = useState(reducido);
  const cerrando = useRef(false);

  // Entrada suave: se monta transparente y un poco más pequeño, y en el siguiente fotograma pasa a su
  // tamaño. Con «reducir movimiento» activado en el sistema aparece directamente.
  useEffect(() => {
    if (reducido) return undefined;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Mientras está abierto, la pantalla de debajo no se desplaza.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  function cerrar() {
    if (cerrando.current) return;
    cerrando.current = true;
    setVisible(false);
    if (reducido) onCerrar();
    else setTimeout(onCerrar, DURACION_SALIDA);
  }

  useEffect(() => {
    function alPulsar(e) {
      if (e.key === "Escape" && escapeActivo) cerrar();
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [escapeActivo]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      style={{
        position: "fixed", inset: 0, zIndex: 45, boxSizing: "border-box", background: fondo,
        padding: "12px 12px calc(12px + env(safe-area-inset-bottom))",
        opacity: visible ? 1 : 0, transform: visible ? "none" : "scale(0.97)",
        transition: reducido ? "none" : `opacity ${DURACION_SALIDA}ms ease, transform ${DURACION_SALIDA}ms ease`,
      }}
    >
      <div style={{ height: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <button
            onClick={cerrar}
            style={{
              display: "flex", alignItems: "center", gap: 5, flexShrink: 0, cursor: "pointer",
              fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: tema.texto,
              background: "rgba(255,255,255,0.7)", border: "none", borderRadius: 20, padding: "7px 12px",
            }}
          >
            <ArrowLeft size={15} /> {t(idioma, "despensa.volver")}
          </button>
          <h2 style={{ fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 21, color: tema.texto, margin: 0 }}>
            {titulo}
          </h2>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 8 }}>{children}</div>

        {pie}
      </div>

      {encima}
    </div>
  );
}

export function PanelZona({ zona, despensa, data, tema, reducido, onCerrar, idioma }) {
  const [editando, setEditando] = useState(null);
  const [anadiendo, setAnadiendo] = useState(false);
  const huecos = despensa.huecos(zona);
  const vacio = huecos.every((h) => h.entradas.length === 0);

  const comun = { tema, idioma, onTocar: setEditando, alertaDe: despensa.alertaDe };
  const aviso = vacio && (
    <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: tema.textoSuave, textAlign: "center", lineHeight: 1.45, margin: "4px 8px 10px" }}>
      {t(idioma, "despensa.panelVacio")}
    </p>
  );

  return (
    <MarcoPanel
      titulo={t(idioma, "despensa.zona." + zona)}
      fondo={zona === "despensa" ? tema.fondoEstante : tema.cuerpo}
      tema={tema}
      reducido={reducido}
      onCerrar={onCerrar}
      escapeActivo={!editando && !anadiendo}
      idioma={idioma}
      pie={
        <button
          onClick={() => setAnadiendo(true)}
          style={{
            marginTop: 10, alignSelf: "center", display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 22, padding: "10px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Plus size={15} /> {t(idioma, "despensa.anadir")}
        </button>
      }
      encima={
        <>
          {editando && <EditarEntradaModal entrada={editando} despensa={despensa} onClose={() => setEditando(null)} idioma={idioma} />}
          {anadiendo && <AnadirAlimentoModal data={data} despensa={despensa} zonaInicial={zona} onClose={() => setAnadiendo(false)} idioma={idioma} />}
        </>
      }
    >
      {zona === "nevera" && <InteriorNevera huecos={huecos} aviso={aviso} {...comun} />}
      {zona === "congelador" && <InteriorCongelador huecos={huecos} aviso={aviso} {...comun} />}
      {zona === "despensa" && <InteriorDespensa huecos={huecos} aviso={aviso} {...comun} />}
    </MarcoPanel>
  );
}

// ---------- Interiores ----------

function InteriorNevera({ huecos, aviso, tema, idioma, onTocar, alertaDe }) {
  const puerta = huecos.find((h) => h.clave === "puerta");
  const dentro = huecos.filter((h) => h.clave !== "puerta");
  // Baldas de la puerta: dos cosas por balda (la puerta es estrecha), y al menos tres baldas aunque
  // estén vacías, para que siga pareciendo una puerta.
  const baldasPuerta = [];
  for (let i = 0; i < Math.max(3, Math.ceil(puerta.entradas.length / 2)); i++) baldasPuerta.push(puerta.entradas.slice(i * 2, i * 2 + 2));
  return (
    <>
      <div
        style={{
          flex: 1, minWidth: 0, overflowY: "auto", background: tema.interior, borderRadius: 24, padding: "10px 10px 12px",
          boxShadow: `inset 0 0 0 5px ${tema.interiorSombra}`,
        }}
      >
        <div style={{ width: 46, height: 6, borderRadius: 3, background: tema.luz, margin: "0 auto 10px", boxShadow: `0 0 18px 7px ${tema.luz}` }} />
        {aviso}
        {dentro.map((h) =>
          h.clave === "frutaVerdura" ? (
            <Cajon key={h.clave} hueco={h} tema={tema} idioma={idioma} onTocar={onTocar} alertaDe={alertaDe} />
          ) : (
            <Balda key={h.clave} hueco={h} tema={tema} idioma={idioma} onTocar={onTocar} alertaDe={alertaDe} />
          )
        )}
      </div>
      <div
        style={{
          width: "31%", maxWidth: 170, flexShrink: 0, overflowY: "auto", boxSizing: "border-box",
          background: tema.puertaInterior, borderRadius: 18, border: `5px solid ${tema.cuerpoOscuro}`, padding: "8px 6px",
        }}
      >
        <EtiquetaHueco clave="puerta" tema={tema} idioma={idioma} />
        {baldasPuerta.map((entradas, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 2, minHeight: 64 }}>
              {entradas.map((e) => <Ficha key={e.item.id} entrada={e} onTocar={onTocar} idioma={idioma} tema={tema} alertaDe={alertaDe} pequena />)}
            </div>
            <div style={{ height: 13, borderRadius: 4, background: tema.balda, opacity: 0.92, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.7)" }} />
          </div>
        ))}
      </div>
    </>
  );
}

function InteriorCongelador({ huecos, aviso, tema, idioma, onTocar, alertaDe }) {
  return (
    <div
      style={{
        flex: 1, minWidth: 0, overflowY: "auto", background: tema.escarcha, borderRadius: 24, padding: "12px 10px",
        boxShadow: `inset 0 0 0 5px ${tema.interiorSombra}`,
      }}
    >
      {aviso}
      {huecos.map((h) => <Cajon key={h.clave} hueco={h} tema={tema} idioma={idioma} onTocar={onTocar} alertaDe={alertaDe} />)}
    </div>
  );
}

function InteriorDespensa({ huecos, aviso, tema, idioma, onTocar, alertaDe }) {
  const tabla = { height: 10, borderRadius: 3, background: tema.madera, borderBottom: `3px solid ${tema.maderaOscura}` };
  return (
    <div
      style={{
        flex: 1, minWidth: 0, overflowY: "auto", boxSizing: "border-box", background: "#fbf4e6", padding: "8px 8px 4px",
        borderLeft: `10px solid ${tema.madera}`, borderRight: `10px solid ${tema.madera}`, borderTop: `10px solid ${tema.madera}`, borderRadius: 8,
      }}
    >
      {aviso}
      {huecos.map((h) => <Balda key={h.clave} hueco={h} tema={tema} idioma={idioma} onTocar={onTocar} alertaDe={alertaDe} tabla={tabla} />)}
    </div>
  );
}

// ---------- Piezas del interior ----------

function EtiquetaHueco({ clave, tema, idioma }) {
  return (
    <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10, fontWeight: 700, color: tema.textoSuave, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
      {t(idioma, ETIQUETA_HUECO[clave] || clave)}
    </div>
  );
}

// Una balda: su etiqueta, lo que hay encima y la tabla (de cristal en la nevera, de madera en la
// despensa). Si hay mucho, las fichas pasan a la línea siguiente y la balda crece.
function Balda({ hueco, tema, idioma, onTocar, tabla, alertaDe }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <EtiquetaHueco clave={hueco.clave} tema={tema} idioma={idioma} />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "6px 4px", minHeight: 66, padding: "0 2px" }}>
        {hueco.entradas.map((e) => <Ficha key={e.item.id} entrada={e} onTocar={onTocar} idioma={idioma} tema={tema} alertaDe={alertaDe} />)}
      </div>
      <div style={tabla || { height: 5, borderRadius: 3, background: tema.balda, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)" }} />
    </div>
  );
}

// Un cajón: la fruta y la verdura de la nevera o cada cajón del congelador. Lo de dentro asoma por
// encima del frente, que lleva su tirador.
function Cajon({ hueco, tema, idioma, onTocar, alertaDe }) {
  return (
    <div style={{ marginTop: 4, marginBottom: 10, borderRadius: 14, border: `2px solid ${tema.balda}`, background: "rgba(255,255,255,0.45)", overflow: "hidden" }}>
      <div style={{ padding: "6px 6px 0" }}>
        <EtiquetaHueco clave={hueco.clave} tema={tema} idioma={idioma} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "6px 4px", minHeight: 66 }}>
          {hueco.entradas.map((e) => <Ficha key={e.item.id} entrada={e} onTocar={onTocar} idioma={idioma} tema={tema} alertaDe={alertaDe} />)}
        </div>
      </div>
      <div style={{ height: 18, background: tema.balda, opacity: 0.92, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: "#ffffff", opacity: 0.85 }} />
      </div>
    </div>
  );
}

// Una cosa de la despensa: su dibujo, su nombre (corto) y lo que queda. Lo que se ha acabado se ve
// apagado, pero sigue ahí para volver a marcarlo cuando se compre. Si se está acabando (queda menos de
// una ración, o nada: alertasStock en logica/despensa.js), la cantidad sale en rojo.
function Ficha({ entrada, onTocar, idioma, tema, pequena, alertaDe }) {
  const { item, food } = entrada;
  const conGramos = typeof item.gramos === "number";
  const agotado = conGramos ? item.gramos <= 0 : !item.tengo;
  const alerta = alertaDe ? alertaDe(item.foodId) : null;
  const nombre = food ? food.name : item.foodId;
  return (
    <button
      onClick={() => onTocar(entrada)}
      title={nombre}
      style={{
        width: pequena ? 46 : 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
        background: "none", border: "none", padding: "2px 0", cursor: "pointer", opacity: agotado ? 0.45 : 1,
        fontFamily: FUENTE_TEXTO,
      }}
    >
      {/* El dibujo de siempre (bote, bandeja, botella...) y, encima, como una pegatina, el emoji propio del
          alimento (F3): con solo el dibujo, todas las proteínas o todos los yogures se veían iguales. Sin
          emoji propio, solo el dibujo, como antes. */}
      <span style={{ position: "relative", display: "block" }}>
        <IconoAlimento forma={entrada.forma} tamano={pequena ? 34 : 46} />
        {food && food.emoji && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute", right: pequena ? -4 : -6, bottom: -2, fontSize: pequena ? 15 : 20, lineHeight: 1,
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
            }}
          >
            {food.emoji}
          </span>
        )}
      </span>
      <span
        style={{
          width: "100%", fontSize: pequena ? 9.5 : 10.5, lineHeight: 1.15, color: "var(--ink)", textAlign: "center",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word",
        }}
      >
        {nombreCorto(nombre)}
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: alerta ? tema.alerta : tema.texto, display: "flex", alignItems: "center", gap: 2 }}>
        {agotado ? t(idioma, "despensa.seAcabo") : conGramos ? formatoGramos(item.gramos) : <Check size={11} />}
      </span>
    </button>
  );
}
