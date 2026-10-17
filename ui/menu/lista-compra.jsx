// ---------- ui/menu/lista-compra.jsx ----------
// Listas de la compra (modales). Dos versiones que conviven:
// - ListaCompraModal: la de siempre, agrupada por categoría de ingrediente y con casillas "ya lo
//   tengo" guardadas en data.listaCompraSimple. Hoy solo la usa el Menú simple.
// - ListaCompraNetaModal: la del Menú completo desde la Fase A de la despensa. Resta lo que ya hay en
//   casa (logica/lista-compra-neta.js) y, con el menú confirmado, tachar una fila mete lo comprado
//   en la despensa; destacharla lo saca.
import React, { useState } from "react";
import { Check } from "lucide-react";
import { calcularListaCompra } from "comida-calculo";
import { t } from "i18n";
import { CATEGORIAS_ALIMENTOS } from "datos-iniciales";
import { CATEGORY_META, MACRO_CATS, ESPECIALES_CATS } from "../comun/categorias.js";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

const LISTA_COMPRA_ORDEN_CATS = [...MACRO_CATS, ...ESPECIALES_CATS];

// Gramos en kg a partir de 1 kg (con un decimal), en g por debajo — así se ha escrito siempre la
// lista de la compra.
function formatoCantidad(gramos) {
  const kg = gramos / 1000;
  return kg >= 1 ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(gramos)} g`;
}

// Selector de alcance compartido por las dos listas: una semana del ciclo o el ciclo entero.
function SelectorAlcance({ alcance, setAlcance, idioma }) {
  return (
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
  );
}

// Lista de la compra: agrega el menú (una semana o el ciclo completo) por alimento y lo agrupa por
// categoría. Las marcas de "ya lo tengo" se guardan en data.listaCompraSimple y sobreviven a cerrar
// la app — solo se olvidan cuando generas un menú nuevo (ver useMenu, ui/estado/menu.js).
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
      <SelectorAlcance alcance={alcance} setAlcance={setAlcance} idioma={idioma} />

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
                      {meta ? t(idioma, meta.labelKey) : cat}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {grupos[cat].map((it) => {
                      const marcado = !!marcados[it.key];
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
                              {formatoCantidad(it.gramos)}
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

// Lista de la compra neta del Menú completo: "necesitas · tienes · comprar" por alimento, agrupada por
// carpeta del catálogo (como la despensa). Arriba, lo que hay que comprar; abajo, plegado en una
// sección propia, lo que ya está en casa. Mientras el menú no está confirmado es PROVISIONAL: se
// calcula igual (contra lo que hay hoy en la despensa) pero sin casillas, porque tachar mete cosas en
// la despensa y eso solo tiene sentido con un menú decidido (decisión del usuario).
export function ListaCompraNetaModal({ menu, menuWeek, despensa, onClose, idioma }) {
  const [alcance, setAlcance] = useState(menuWeek || 1);
  const [verEnCasa, setVerEnCasa] = useState(false);
  const filas = despensa.listaNeta(alcance);
  const confirmado = despensa.confirmado;

  const hayQueComprar = (f) => f.comprado || (f.sinCantidad ? f.comprar : f.comprar > 0);
  const porComprar = filas.filter(hayQueComprar);
  const enCasa = filas.filter((f) => !hayQueComprar(f));
  const comprados = porComprar.filter((f) => f.comprado).length;

  const claveGrupo = (f) => (CATEGORIAS_ALIMENTOS.some((c) => c.key === f.categoria) ? f.categoria : "__sin_categoria");
  const grupos = [...CATEGORIAS_ALIMENTOS, { key: "__sin_categoria", labelKey: "categoriaAlimento.sinCategoria", emoji: "🗂️" }]
    .map((cat) => ({ cat, filas: porComprar.filter((f) => claveGrupo(f) === cat.key) }))
    .filter((g) => g.filas.length);

  const textoCantidades = (f) => (f.sinCantidad ? null : t(idioma, "listaCompra.necesitasTienes", { necesito: formatoCantidad(f.necesito), tengo: formatoCantidad(f.tengo) }));

  return (
    <ModalShell onClose={onClose} title={t(idioma, "listaCompra.titulo")}>
      <SelectorAlcance alcance={alcance} setAlcance={setAlcance} idioma={idioma} />

      {!confirmado && menu && (
        <div style={{ background: "var(--mustard-soft)", borderRadius: 9, padding: "9px 11px", marginBottom: 12, fontFamily: FUENTE_TEXTO }}>
          <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.45 }}>{t(idioma, "listaCompra.provisional")}</div>
          <button
            onClick={despensa.confirmar}
            style={{
              marginTop: 8, fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "#fff", background: "var(--green)",
              border: "none", borderRadius: 7, padding: "6px 11px", cursor: "pointer",
            }}
          >
            {t(idioma, "menu.confirmar.boton")}
          </button>
        </div>
      )}

      {!menu || filas.length === 0 ? (
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>
          {t(idioma, menu ? "listaCompra.todoEnCasa" : "listaCompra.sinMenu")}
        </p>
      ) : (
        <>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
            {porComprar.length === 0
              ? t(idioma, "listaCompra.todoEnCasa")
              : confirmado
              ? t(idioma, "listaCompra.resumenNeto", { comprados, total: porComprar.length })
              : t(idioma, "listaCompra.resumenProvisional", { total: porComprar.length })}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {grupos.map(({ cat, filas: delGrupo }) => (
              <div key={cat.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{cat.emoji}</span>
                  <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {t(idioma, cat.labelKey)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {delGrupo.map((f) => (
                    <FilaListaNeta key={f.key} fila={f} confirmado={confirmado} despensa={despensa} textoCantidades={textoCantidades(f)} idioma={idioma} />
                  ))}
                </div>
              </div>
            ))}

            {enCasa.length > 0 && (
              <div>
                <button
                  onClick={() => setVerEnCasa((v) => !v)}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 4,
                    fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5,
                  }}
                >
                  {verEnCasa ? "▾" : "▸"} {t(idioma, "listaCompra.yaEnCasa", { n: enCasa.length })}
                </button>
                {verEnCasa && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {enCasa.map((f) => (
                      <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 8px", fontFamily: FUENTE_TEXTO }}>
                        <Check size={14} color="var(--green)" style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-soft)" }}>{f.nombre}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>
                          {f.sinCantidad ? t(idioma, "listaCompra.loTienes") : textoCantidades(f)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <ModalBtn variant="solid" onClick={onClose}>{t(idioma, "common.cerrar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

// Una fila de lo que hay que comprar. Con el menú confirmado lleva casilla: tacharla mete en la
// despensa la cantidad de "comprar" (o marca "tengo" en verdura y fruta) y la fila se queda tachada
// enseñando lo comprado; destacharla lo deshace. Sin confirmar, la misma fila pero sin casilla.
function FilaListaNeta({ fila, confirmado, despensa, textoCantidades, idioma }) {
  const tachada = fila.comprado;
  const derecha = fila.sinCantidad
    ? t(idioma, tachada ? "listaCompra.compradoSinCantidad" : "listaCompra.aComprar")
    : tachada
    ? t(idioma, "listaCompra.comprado", { n: formatoCantidad(fila.compra && fila.compra.delta ? fila.compra.delta : fila.comprar) })
    : t(idioma, "listaCompra.comprar", { n: formatoCantidad(fila.comprar) });
  const contenido = (
    <>
      {confirmado && <input type="checkbox" checked={tachada} onChange={() => (tachada ? despensa.desComprar(fila) : despensa.comprar(fila))} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, color: tachada ? "var(--ink-soft)" : "var(--ink)", textDecoration: tachada ? "line-through" : "none" }}>
          {fila.nombre}
        </span>
        {textoCantidades && <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-soft)", marginTop: 1 }}>{textoCantidades}</span>}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: tachada ? "var(--green-dark)" : "var(--ink)", whiteSpace: "nowrap" }}>{derecha}</span>
    </>
  );
  const estilo = {
    display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 7, fontFamily: FUENTE_TEXTO,
    background: tachada ? "var(--paper)" : "transparent", cursor: confirmado ? "pointer" : "default",
  };
  return confirmado ? <label style={estilo}>{contenido}</label> : <div style={estilo}>{contenido}</div>;
}
