// ---------- ui/despensa/editar.jsx ----------
// Cambiar una cosa de la despensa al tocarla dentro de la nevera dibujada: cuánto queda (con botones
// rápidos de ±50/±100 g, para cuando has gastado algo sin pasar por el menú), si queda o se acabó
// (verdura y fruta), dónde está, o quitarla. Nada se guarda hasta pulsar «Guardar».
import React, { useState } from "react";
import { t } from "i18n";
import { ModalShell, Field, inputStyle, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { SelectorZona } from "./piezas.jsx";
import { IconoAlimento } from "./dibujos.jsx";

export function EditarEntradaModal({ entrada, despensa, onClose, idioma }) {
  const { item, food, forma } = entrada;
  const conGramos = typeof item.gramos === "number";
  const [gramos, setGramos] = useState(conGramos ? String(item.gramos) : "");
  const [tengo, setTengo] = useState(!!item.tengo);
  const [zona, setZona] = useState(item.zona);

  function sumar(delta) {
    setGramos((g) => String(Math.max(0, Math.round((Number(g) || 0) + delta))));
  }

  function guardar() {
    const cambios = { zona };
    if (conGramos) cambios.gramos = Math.max(0, Math.round(Number(gramos) || 0));
    else cambios.tengo = tengo;
    despensa.editar(item.id, cambios);
    onClose();
  }

  function quitar() {
    despensa.quitar(item.id);
    onClose();
  }

  const botonRapido = {
    flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid var(--line)", background: "var(--paper)",
    fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink)", cursor: "pointer",
  };
  const botonTengo = (activo) => ({
    flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
    border: activo ? "1px solid var(--green)" : "1px solid var(--line)",
    background: activo ? "var(--green-soft)" : "#fff", color: activo ? "var(--green-dark)" : "var(--ink-soft)",
  });

  return (
    <ModalShell onClose={onClose} title={food ? food.name : item.foodId}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <IconoAlimento forma={forma} tamano={64} />
      </div>

      {conGramos ? (
        <Field label={t(idioma, "despensa.cantidad")}>
          <input
            type="number"
            min="0"
            step="10"
            inputMode="numeric"
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") guardar(); }}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[-100, -50, 50, 100].map((d) => (
              <button key={d} onClick={() => sumar(d)} style={botonRapido}>{d > 0 ? `+${d}` : `−${-d}`}</button>
            ))}
          </div>
        </Field>
      ) : (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => setTengo(true)} style={botonTengo(tengo)}>{t(idioma, "despensa.tengo")}</button>
          <button onClick={() => setTengo(false)} style={botonTengo(!tengo)}>{t(idioma, "despensa.seAcabo")}</button>
        </div>
      )}

      <Field label={t(idioma, "despensa.donde")}>
        <SelectorZona zona={zona} onChange={setZona} idioma={idioma} />
      </Field>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
        <ModalBtn variant="danger" onClick={quitar}>{t(idioma, "despensa.quitarDeCasa")}</ModalBtn>
        <span style={{ flex: 1 }} />
        <ModalBtn variant="ghost" onClick={onClose}>{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn variant="solid" onClick={guardar}>{t(idioma, "common.guardar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
