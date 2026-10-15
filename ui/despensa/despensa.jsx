// ---------- ui/despensa/despensa.jsx ----------
// Pantalla «¿Qué tengo?» (Fase A de la despensa): lo que hay en casa, por zonas (despensa, nevera y
// congelador), con gramos aproximados o, para verdura y fruta, solo "tengo / se acabó". Se añade
// buscando en el propio catálogo de alimentos (como FoodsView), porque la despensa solo puede
// compararse con el menú por alimento. Es la vista de lista: cuando llegue la nevera dibujada (Fase
// B) esta seguirá disponible siempre, y las dos leerán el mismo hook, useDespensa.
import React, { useState } from "react";
import { Plus, Trash2, Search, Archive, Refrigerator, Snowflake, Check } from "lucide-react";
import { getFood } from "macros";
import { t } from "i18n";
import { CATEGORIAS_ALIMENTOS } from "datos-iniciales";
import { ZONAS, zonaPorDefecto, usaCantidad } from "despensa";
import { ModalShell, Field, inputStyle, ModalBtn, IconBtn } from "../comun/modal.jsx";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

const ICONO_ZONA = { despensa: Archive, nevera: Refrigerator, congelador: Snowflake };

const emojiDe = (food) => (CATEGORIAS_ALIMENTOS.find((c) => c.key === (food && food.categoria)) || { emoji: "🗂️" }).emoji;

export function DespensaView({ data, despensa, idioma }) {
  const [anadiendo, setAnadiendo] = useState(false);
  const total = ZONAS.reduce((s, z) => s + despensa.porZona[z].length, 0);

  return (
    <>
      <h2 style={{ fontFamily: FUENTE_TITULOS, fontSize: 20, fontWeight: 400, color: "var(--green-dark)", margin: "0 0 4px" }}>
        {t(idioma, "despensa.titulo")}
      </h2>
      <SectionIntro text={t(idioma, "despensa.intro")} />

      <button
        onClick={() => setAnadiendo(true)}
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--green)",
          border: "none", borderRadius: 8, padding: "9px 14px", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <Plus size={14} /> {t(idioma, "despensa.anadir")}
      </button>

      {total === 0 ? (
        <div
          style={{
            border: "1.5px dashed var(--line)", borderRadius: 12, padding: "28px 20px", textAlign: "center",
            color: "var(--ink-soft)", fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5,
          }}
        >
          {t(idioma, "despensa.vacia")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ZONAS.map((zona) => (
            <ZonaDespensa key={zona} zona={zona} items={despensa.porZona[zona]} data={data} despensa={despensa} idioma={idioma} />
          ))}
        </div>
      )}

      {anadiendo && <AnadirAlimentoModal data={data} despensa={despensa} onClose={() => setAnadiendo(false)} idioma={idioma} />}
    </>
  );
}

function ZonaDespensa({ zona, items, data, despensa, idioma }) {
  const Icon = ICONO_ZONA[zona];
  const nombreDe = (item) => (getFood(data, item.foodId) || { name: item.foodId }).name;
  const ordenados = [...items].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), "es"));
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: items.length ? 8 : 4 }}>
        <Icon size={16} color="var(--green-dark)" />
        <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t(idioma, "despensa.zona." + zona)}
        </span>
        <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)" }}>({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)" }}>{t(idioma, "despensa.zonaVacia")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ordenados.map((item) => (
            <FilaDespensa key={item.id} item={item} food={getFood(data, item.foodId)} nombre={nombreDe(item)} despensa={despensa} idioma={idioma} />
          ))}
        </div>
      )}
    </div>
  );
}

// Una entrada de la despensa. Los gramos se escriben en un campo que solo guarda al salir de él (o
// con Intro), para poder borrar y teclear un número nuevo sin que se guarde cada pulsación; la
// `key` con los gramos hace que el campo se rehaga si cambian desde fuera (al descontar una comida
// o al tachar la lista de la compra).
function FilaDespensa({ item, food, nombre, despensa, idioma }) {
  const conGramos = typeof item.gramos === "number";
  const agotado = conGramos ? item.gramos <= 0 : !item.tengo;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "5px 0", borderTop: "1px solid var(--paper)" }}>
      <span
        style={{
          flex: "1 1 140px", minWidth: 0, display: "flex", alignItems: "center", gap: 7,
          fontFamily: FUENTE_TEXTO, fontSize: 13, color: agotado ? "var(--ink-soft)" : "var(--ink)",
        }}
      >
        <span style={{ fontSize: 15, flexShrink: 0, opacity: agotado ? 0.5 : 1 }}>{emojiDe(food)}</span>
        <span>{nombre}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        {conGramos ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              key={`${item.id}:${item.gramos}`}
              type="number"
              min="0"
              step="10"
              inputMode="numeric"
              defaultValue={item.gramos}
              aria-label={t(idioma, "despensa.cantidad")}
              onBlur={(e) => {
                const g = Math.max(0, Math.round(Number(e.target.value) || 0));
                if (g !== item.gramos) despensa.editar(item.id, { gramos: g });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              style={{ ...inputStyle, width: 70, padding: "5px 6px", textAlign: "right", fontSize: 13, fontWeight: 700 }}
            />
            <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)" }}>g</span>
          </span>
        ) : (
          <button
            onClick={() => despensa.editar(item.id, { tengo: !item.tengo })}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              border: item.tengo ? "1px solid var(--green)" : "1px solid var(--line)",
              background: item.tengo ? "var(--green-soft)" : "transparent",
              color: item.tengo ? "var(--green-dark)" : "var(--ink-soft)",
            }}
          >
            {item.tengo && <Check size={12} />}
            {item.tengo ? t(idioma, "despensa.tengo") : t(idioma, "despensa.seAcabo")}
          </button>
        )}
        <select
          value={item.zona}
          aria-label={t(idioma, "despensa.moverA")}
          onChange={(e) => despensa.editar(item.id, { zona: e.target.value })}
          style={{ ...inputStyle, width: "auto", padding: "5px 4px", fontSize: 12 }}
        >
          {ZONAS.map((z) => (
            <option key={z} value={z}>{t(idioma, "despensa.zona." + z)}</option>
          ))}
        </select>
        <IconBtn onClick={() => despensa.quitar(item.id)}>
          <Trash2 size={13} />
        </IconBtn>
      </span>
    </div>
  );
}

// Añadir: primero se busca el alimento en el catálogo y luego se dice dónde está y cuánto hay
// (aproximado). Tras añadir, vuelve al buscador en vez de cerrarse: en la revisión del sábado se
// apuntan varias cosas seguidas, y así no hay que reabrirlo para cada una.
function AnadirAlimentoModal({ data, despensa, onClose, idioma }) {
  const [query, setQuery] = useState("");
  const [elegido, setElegido] = useState(null);
  const [zona, setZona] = useState("despensa");
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
    setZona(zonaPorDefecto(f));
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
            <div style={{ display: "flex", gap: 6 }}>
              {ZONAS.map((z) => {
                const Icon = ICONO_ZONA[z];
                return (
                  <button
                    key={z}
                    onClick={() => setZona(z)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid var(--line)",
                      background: zona === z ? "var(--green-dark)" : "#fff", color: zona === z ? "#fff" : "var(--ink)",
                      fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    }}
                  >
                    <Icon size={15} />
                    {t(idioma, "despensa.zona." + z)}
                  </button>
                );
              })}
            </div>
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
