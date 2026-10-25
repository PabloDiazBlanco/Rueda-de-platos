// ---------- ui/menu/cambie-algo.jsx ----------
// «Cambié algo» (B1 + B3, 25-oct-2026): dentro del detalle de una comida del Menú completo, la lista de lo
// que lleva (cada alimento con sus gramos) para decir qué se comió de verdad. Cada línea tiene «Cambiar»
// (abre el catálogo propio, primero la misma carpeta y después el resto) y «No lo comí». Al cambiar se
// propone la cantidad con las mismas kcal, editable. Abajo, las kcal del menú frente a las comidas, y
// «Guardar como hecha», que marca la comida como hecha con esos cambios (y la despensa descuenta lo
// comido de verdad). Toda la lógica está en logica/comida-real.js; aquí solo se pinta y se elige.
import React, { useState } from "react";
import { ArrowRight, Search, Undo2 } from "lucide-react";
import { getFood, fmt } from "macros";
import { t } from "i18n";
import { comidaReal, propuestaGramos, opcionesCambio } from "comida-real";
import { inputStyle, ModalBtn } from "../comun/modal.jsx";
import { emojiDe } from "../despensa/piezas.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

const normalizar = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const botonLinea = {
  fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, padding: "6px 10px", minHeight: 32, borderRadius: 7,
  border: "1px solid var(--line)", background: "var(--card)", color: "var(--green-dark)", cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 4,
};

export function CambieAlgo({ data, meal, cambiosIniciales, onGuardar, onCancelar, idioma }) {
  const [cambios, setCambios] = useState(() => ({ ...(cambiosIniciales || {}) }));
  const [eligiendo, setEligiendo] = useState(null); // clave de la línea que se está cambiando
  const [busqueda, setBusqueda] = useState("");
  const real = comidaReal(data, meal, cambios);

  function poner(clave, valor) {
    setCambios((c) => {
      const nuevo = { ...c };
      if (valor) nuevo[clave] = valor;
      else delete nuevo[clave];
      return nuevo;
    });
  }

  // ---------- Elegir el sustituto ----------
  if (eligiendo) {
    const linea = real.lineas.find((l) => l.clave === eligiendo);
    const { mismaCarpeta, resto } = opcionesCambio(data, linea);
    const q = normalizar(busqueda.trim());
    const filtrar = (lista) => (q ? lista.filter((f) => normalizar(f.name).includes(q)) : lista);
    const grupo = (titulo, lista) => lista.length > 0 && (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ink-soft)", margin: "4px 0 6px" }}>{titulo}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {lista.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                poner(eligiendo, { foodId: f.id, gramos: propuestaGramos(data, linea, f.id) });
                setEligiendo(null);
                setBusqueda("");
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", minHeight: 40,
                padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer",
                fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)",
              }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{emojiDe(f)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{f.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-soft)", flexShrink: 0 }}>{t(idioma, "cambieAlgo.kcal100", { n: Math.round(f.kcal) })}</span>
            </button>
          ))}
        </div>
      </div>
    );
    return (
      <div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)", marginBottom: 8 }}>
          {t(idioma, "cambieAlgo.elegirTitulo", { nombre: linea.nombre })}
        </div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={14} color="var(--ink-soft)" style={{ position: "absolute", left: 9, top: 11 }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t(idioma, "cambieAlgo.buscar")}
            aria-label={t(idioma, "cambieAlgo.buscar")}
            style={{ ...inputStyle, paddingLeft: 28, fontSize: 16 }}
          />
        </div>
        {grupo(t(idioma, "cambieAlgo.mismaCarpeta"), filtrar(mismaCarpeta))}
        {grupo(t(idioma, "cambieAlgo.resto"), filtrar(resto))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <ModalBtn onClick={() => { setEligiendo(null); setBusqueda(""); }} variant="ghost">{t(idioma, "cambieAlgo.volver")}</ModalBtn>
        </div>
      </div>
    );
  }

  // ---------- Las líneas de la comida ----------
  return (
    <div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)", marginBottom: 2 }}>{t(idioma, "cambieAlgo.titulo")}</div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.45 }}>{t(idioma, "cambieAlgo.ayuda")}</div>

      {!real.lineas.length && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>{t(idioma, "cambieAlgo.sinLineas")}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {real.lineas.map((l) => {
          const original = getFood(data, l.foodId);
          const nuevo = l.cambio && l.cambio.foodId ? getFood(data, l.cambio.foodId) : null;
          const omitido = !!(l.cambio && l.cambio.omitido);
          return (
            <div key={l.clave} style={{ paddingBottom: 10, borderBottom: "1px solid var(--line)", fontFamily: FUENTE_TEXTO }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17, flexShrink: 0, opacity: omitido || nuevo ? 0.5 : 1 }}>{original ? emojiDe(original) : "🥗"}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink)", textDecoration: omitido || nuevo ? "line-through" : "none", opacity: omitido || nuevo ? 0.6 : 1 }}>
                  {l.nombre}
                  {l.gramos > 0 && <span style={{ fontSize: 11, color: "var(--ink-soft)" }}> · {Math.round(l.gramos)} g</span>}
                </span>
              </div>

              {nuevo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingLeft: 4 }}>
                  <ArrowRight size={14} color="var(--green)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 17, flexShrink: 0 }}>{emojiDe(nuevo)}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink)" }}>{nuevo.name}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={l.cambio.gramos}
                    onChange={(e) => poner(l.clave, { foodId: l.cambio.foodId, gramos: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })}
                    aria-label={t(idioma, "cambieAlgo.gramosDe", { nombre: nuevo.name })}
                    style={{ ...inputStyle, width: 72, textAlign: "center", padding: "6px 4px", fontSize: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", flexShrink: 0 }}>g</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {!omitido && (
                  <button onClick={() => setEligiendo(l.clave)} style={botonLinea}>
                    {t(idioma, nuevo ? "cambieAlgo.cambiarOtro" : "cambieAlgo.cambiar")}
                  </button>
                )}
                {!nuevo && (
                  <button onClick={() => poner(l.clave, omitido ? null : { omitido: true })} style={{ ...botonLinea, color: omitido ? "var(--green-dark)" : "var(--rust)" }}>
                    {t(idioma, omitido ? "cambieAlgo.siLoComi" : "cambieAlgo.noLoComi")}
                  </button>
                )}
                {nuevo && (
                  <button onClick={() => poner(l.clave, null)} style={{ ...botonLinea, color: "var(--ink-soft)" }}>
                    <Undo2 size={13} /> {t(idioma, "cambieAlgo.deshacer")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "var(--paper)", fontFamily: FUENTE_TEXTO, fontSize: 12.5 }}>
        <span style={{ color: "var(--ink-soft)" }}>{t(idioma, "cambieAlgo.menu", { kcal: Math.round(real.planificadas.kcal) })}</span>
        <span style={{ fontWeight: 700, color: "var(--green-dark)" }}>
          {t(idioma, "cambieAlgo.comido", { kcal: Math.round(real.macros.kcal) })} · P {fmt(real.macros.prot)} · G {fmt(real.macros.fat)} · C {fmt(real.macros.carb)}
        </span>
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.4 }}>{t(idioma, "cambieAlgo.sinReajustes")}</div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <ModalBtn onClick={onCancelar} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={() => onGuardar(cambios)} variant="solid">{t(idioma, "cambieAlgo.guardar")}</ModalBtn>
      </div>
    </div>
  );
}
