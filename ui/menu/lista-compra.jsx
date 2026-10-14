// ---------- ui/menu/lista-compra.jsx ----------
// Lista de la compra del menú (modal), agrupada por categoría.
import React, { useState } from "react";
import { calcularListaCompra } from "comida-calculo";
import { t } from "i18n";
import { CATEGORY_META, MACRO_CATS, ESPECIALES_CATS } from "../comun/categorias.js";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

const LISTA_COMPRA_ORDEN_CATS = [...MACRO_CATS, ...ESPECIALES_CATS];

// Lista de la compra: agrega el menú (una semana o el ciclo completo) por alimento y lo agrupa por
// categoría. Las marcas de "ya lo tengo" se guardan en data.listaCompra y sobreviven a cerrar la
// app — solo se olvidan cuando generas un menú nuevo (ver handleGenerateMenu).
export function ListaCompraModal({ data, menu, menuWeek, listaCompra, onToggle, onClose, idioma, conCantidades = true }) {
  const [alcance, setAlcance] = useState(menuWeek || 1);
  const items = calcularListaCompra(data, menu, alcance, { conCantidades });
  const marcados = listaCompra.marcados || {};

  const grupos = {};
  items.forEach((it) => {
    if (!grupos[it.categoria]) grupos[it.categoria] = [];
    grupos[it.categoria].push(it);
  });
  const categoriasOrdenadas = LISTA_COMPRA_ORDEN_CATS.filter((c) => grupos[c]);
  const marcadosCount = items.filter((it) => marcados[it.key]).length;

  return (
    <ModalShell onClose={onClose} title={t(idioma, "listaCompra.titulo")}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[1, 2, "todo"].map((w) => (
          <button
            key={w}
            onClick={() => setAlcance(w)}
            style={{
              flex: 1, padding: "7px 8px", borderRadius: 8, border: "1px solid var(--line)",
              background: alcance === w ? "var(--green-dark)" : "#fff",
              color: alcance === w ? "#fff" : "var(--ink)",
              fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
            }}
          >
            {w === "todo" ? t(idioma, "listaCompra.cicloCompleto") : t(idioma, "menu.semana", { n: w })}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, "listaCompra.sinMenu")}
        </p>
      ) : (
        <>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            {t(idioma, "listaCompra.marcados", { marcados: marcadosCount, total: items.length })}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {categoriasOrdenadas.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta?.icon;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {Icon && <Icon size={13} color={meta.color} />}
                    <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: meta?.color || "var(--ink)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {meta?.label || cat}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {grupos[cat].map((it) => {
                      const marcado = !!marcados[it.key];
                      const kg = conCantidades ? it.gramos / 1000 : 0;
                      const cantidad = kg >= 1 ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(it.gramos)} g`;
                      return (
                        <label
                          key={it.key}
                          style={{
                            display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 7,
                            cursor: "pointer", background: marcado ? "var(--paper)" : "transparent",
                          }}
                        >
                          <input type="checkbox" checked={marcado} onChange={() => onToggle(it.key)} />
                          <span style={{
                            flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13,
                            color: marcado ? "var(--ink-soft)" : "var(--ink)", textDecoration: marcado ? "line-through" : "none",
                          }}>
                            {it.nombre}
                          </span>
                          {conCantidades && (
                            <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)" }}>
                              {cantidad}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <ModalBtn variant="solid" onClick={onClose}>{t(idioma, "common.cerrar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
