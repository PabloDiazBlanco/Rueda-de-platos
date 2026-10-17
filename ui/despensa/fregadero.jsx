// ---------- ui/despensa/fregadero.jsx ----------
// Lo de debajo del fregadero (idea del usuario, octubre de 2026): una lista de la compra de lo que no es
// comida — limpieza, papel, bolsas... —, aprovechando el mueble que hay bajo el grifo de la cocina
// dibujada. No tiene nada que ver con el catálogo ni con el menú: es texto libre que se tacha al
// comprarlo. Además del panel que se abre desde el mueble, la misma lista sale en la vista de lista de
// «¿Qué tengo?» y al final de la lista de la compra del Menú completo, para tenerlo todo junto en el súper.
// La lógica está en logica/despensa.js (anadirLimpieza y compañía) y se usa a través de useDespensa.
import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { t } from "i18n";
import { inputStyle, IconBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { MarcoPanel } from "./panel.jsx";
import { TuberiaFregadero, BotellaFregadero, BOCA_BOTELLA } from "./dibujos.jsx";

// Sugerencias de un toque. Al añadirse se guardan con el texto en el idioma de cada uno (a partir de ese
// momento son datos del usuario, como cualquier cosa que escriba él).
const SUGERENCIAS = [
  "lavavajillas", "detergente", "suavizante", "lejia", "friegasuelos", "bolsasBasura",
  "papelCocina", "papelHigienico", "estropajos", "bayetas", "film", "aluminio",
];

// La lista en sí: lo apuntado (con su casilla para tacharlo y su papelera), un campo para añadir y las
// sugerencias que todavía no están pendientes.
export function ListaLimpieza({ despensa, idioma }) {
  const [texto, setTexto] = useState("");
  const lista = despensa.limpieza;
  const pendientes = new Set(lista.filter((c) => !c.comprado).map((c) => c.nombre.toLowerCase()));
  const ideas = SUGERENCIAS.map((k) => t(idioma, "despensa.limpieza.sug." + k)).filter((n) => !pendientes.has(n.toLowerCase()));
  const hayComprado = lista.some((c) => c.comprado);

  function anadir() {
    if (!texto.trim()) return;
    despensa.anadirLimpieza(texto);
    setTexto("");
  }

  return (
    <div style={{ fontFamily: FUENTE_TEXTO }}>
      {lista.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", padding: "2px 0 8px" }}>{t(idioma, "despensa.limpieza.vacia")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
          {lista.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, cursor: "pointer", minWidth: 0 }}>
                <input type="checkbox" checked={c.comprado} onChange={() => despensa.alternarLimpieza(c.id)} />
                <span style={{ fontSize: 13, color: c.comprado ? "var(--ink-soft)" : "var(--ink)", textDecoration: c.comprado ? "line-through" : "none" }}>
                  {c.nombre}
                </span>
              </label>
              <IconBtn onClick={() => despensa.quitarLimpieza(c.id)}><Trash2 size={13} /></IconBtn>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") anadir(); }}
          placeholder={t(idioma, "despensa.limpieza.placeholder")}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <button
          onClick={anadir}
          disabled={!texto.trim()}
          style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 4, cursor: texto.trim() ? "pointer" : "default",
            fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 7, padding: "0 12px", opacity: texto.trim() ? 1 : 0.5,
          }}
        >
          <Plus size={14} /> {t(idioma, "despensa.anadirBoton")}
        </button>
      </div>

      {ideas.length > 0 && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 6px" }}>
            {t(idioma, "despensa.limpieza.ideas")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {ideas.map((nombre) => (
              <button
                key={nombre}
                onClick={() => despensa.anadirLimpieza(nombre)}
                style={{
                  fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 600, color: "var(--green-dark)", cursor: "pointer",
                  background: "var(--green-soft)", border: "none", borderRadius: 20, padding: "5px 10px",
                }}
              >
                + {nombre}
              </button>
            ))}
          </div>
        </>
      )}

      {hayComprado && (
        <button
          onClick={despensa.vaciarLimpiezaComprada}
          style={{
            display: "block", marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "underline",
          }}
        >
          {t(idioma, "despensa.limpieza.vaciar")}
        </button>
      )}
    </div>
  );
}

// El panel a pantalla completa que se abre desde el mueble: arriba, el sifón y la botella que recoge el
// agua del grifo, con lo llena que esté (el dibujo de lo que se ve al abrir la puerta, ver cocina.jsx), y
// debajo, la lista sobre una tarjeta clara para que se lea bien.
export function PanelFregadero({ despensa, tema, reducido, nivelAgua = 0, onCerrar, idioma }) {
  return (
    <MarcoPanel
      titulo={t(idioma, "despensa.fregadero.titulo")}
      fondo={tema.mueble}
      tema={tema}
      reducido={reducido}
      onCerrar={onCerrar}
      idioma={idioma}
    >
      <div
        style={{
          flex: 1, minWidth: 0, overflowY: "auto", background: tema.interiorMueble, borderRadius: 18,
          border: `5px solid ${tema.muebleOscuro}`, padding: "0 10px 12px",
        }}
      >
        <svg viewBox="0 0 300 102" width="100%" style={{ display: "block", maxHeight: 120, margin: "0 auto 8px" }} aria-hidden="true">
          <TuberiaFregadero tema={tema} x={150} desde={0} hasta={98 + BOCA_BOTELLA} />
          <g transform="translate(150 98)">
            <BotellaFregadero tema={tema} nivel={nivelAgua} reducido={reducido} />
          </g>
        </svg>
        <div style={{ background: "var(--card)", borderRadius: 12, padding: "12px 12px 14px" }}>
          <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45, margin: "0 0 10px" }}>
            {t(idioma, "despensa.limpieza.intro")}
          </p>
          <ListaLimpieza despensa={despensa} idioma={idioma} />
        </div>
      </div>
    </MarcoPanel>
  );
}
