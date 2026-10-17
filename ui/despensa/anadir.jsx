// ---------- ui/despensa/anadir.jsx ----------
// Añadir a la despensa: primero se busca el alimento en el catálogo y luego se dice dónde está y
// cuánto hay (aproximado). Tras añadir, vuelve al buscador en vez de cerrarse: en la revisión del
// sábado se apuntan varias cosas seguidas, y así no hay que reabrirlo para cada una.
// `zonaInicial` (opcional): al añadir desde dentro de la nevera dibujada, la zona que se está viendo
// manda sobre la zona por defecto del alimento — si abres el congelador y añades pollo, es que el
// pollo está en el congelador.
import React, { useState } from "react";
import { Search, Check } from "lucide-react";
import { getFood } from "macros";
import { t } from "i18n";
import { zonaPorDefecto, usaCantidad } from "despensa";
import { ModalShell, Field, inputStyle, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { emojiDe, SelectorZona } from "./piezas.jsx";

export function AnadirAlimentoModal({ data, despensa, onClose, idioma, zonaInicial }) {
  const [query, setQuery] = useState("");
  const [elegido, setElegido] = useState(null);
  const [zona, setZona] = useState(zonaInicial || "despensa");
  const [gramos, setGramos] = useState("");
  const [ultimo, setUltimo] = useState(null);

  const food = elegido ? getFood(data, elegido) : null;
  const conCantidad = usaCantidad(food);
  const q = query.trim().toLowerCase();
  const resultados = (data.foods || [])
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  function elegir(f) {
    setElegido(f.id);
    setZona(zonaInicial || zonaPorDefecto(f));
    setGramos("");
  }

  function anadir() {
    despensa.anadir(food.id, conCantidad ? { zona, gramos: Number(gramos) } : { zona, tengo: true });
    setUltimo(conCantidad ? `${food.name} (${Math.round(Number(gramos))} g)` : food.name);
    setElegido(null);
    setQuery("");
  }

  const puedeAnadir = food && (!conCantidad || Number(gramos) > 0);

  return (
    <ModalShell onClose={onClose} title={t(idioma, "despensa.anadir")}>
      {!food ? (
        <>
          {ultimo && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--green-dark)", background: "var(--green-soft)", borderRadius: 7, padding: "6px 9px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={13} /> {t(idioma, "despensa.anadido", { nombre: ultimo })}
            </div>
          )}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(idioma, "despensa.buscar")}
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {resultados.length === 0 ? (
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", padding: "6px 2px" }}>{t(idioma, "despensa.sinResultados")}</div>
            ) : (
              resultados.map((f) => (
                <button
                  key={f.id}
                  onClick={() => elegir(f)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, textAlign: "left", width: "100%",
                    fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)", background: "transparent",
                    border: "none", borderRadius: 7, padding: "7px 6px", cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{emojiDe(f)}</span>
                  <span>{f.name}</span>
                </button>
              ))
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <ModalBtn variant="ghost" onClick={onClose}>{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontFamily: FUENTE_TEXTO }}>
            <span style={{ fontSize: 18 }}>{emojiDe(food)}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{food.name}</span>
            <button
              onClick={() => setElegido(null)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, color: "var(--green-dark)" }}
            >
              {t(idioma, "despensa.cambiarAlimento")}
            </button>
          </div>
          <Field label={t(idioma, "despensa.donde")}>
            <SelectorZona zona={zona} onChange={setZona} idioma={idioma} />
          </Field>
          {conCantidad ? (
            <Field label={t(idioma, "despensa.cantidad")}>
              <input
                autoFocus
                type="number"
                min="0"
                step="10"
                inputMode="numeric"
                value={gramos}
                onChange={(e) => setGramos(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && puedeAnadir) anadir(); }}
                style={inputStyle}
              />
            </Field>
          ) : (
            <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45, margin: "0 0 12px" }}>
              {t(idioma, "despensa.sinCantidadNota")}
            </p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <ModalBtn variant="ghost" onClick={() => setElegido(null)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn variant="solid" onClick={anadir} disabled={!puedeAnadir}>{t(idioma, "despensa.anadirBoton")}</ModalBtn>
          </div>
        </>
      )}
    </ModalShell>
  );
}
