// ---------- ui/menu/menu-simple.jsx ----------
// Pantalla de Menú simple: el mismo generador, sin calorías ni cantidades.
import React, { useState } from "react";
import { Shuffle, Download, Undo2 } from "lucide-react";
import { DAYS } from "comun";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { ListaCompraModal } from "./lista-compra.jsx";
import { PrintExport } from "./imprimir.jsx";
import { HistoryPanel } from "./historial.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// Menú simple (Tanda 3 del rediseño): la misma idea de "organizar la semana" que Menú completo,
// pero deliberadamente sin nada de calorías, macros ni gramos — solo el borrador de combinaciones.
// Reutiliza el mismo generateMenu de siempre (la selección de qué toca cada día ya es independiente
// del ajuste de raciones a objetivos, ver logica/menu-generador.js), así que no hace falta ningún
// motor nuevo: aquí sencillamente no se pide ni se muestra la parte de cantidades. Lleva su propio
// ciclo, su propio historial y su propia lista de la compra, separados de Menú completo — las dos
// pantallas conviven sin pisarse.
export function MenuSimpleView({ menu, onGenerate, onUndo, menuWeek, setMenuWeek, history, data, onToggleMarcadoCompra, idioma }) {
  const [showListaCompra, setShowListaCompra] = useState(false);

  return (
    <>
      <SectionIntro text={t(idioma, "menuSimple.intro")} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button
          onClick={onGenerate}
          style={{
            fontFamily: FUENTE_TEXTO,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            background: "var(--green)",
            border: "none",
            borderRadius: 9,
            padding: "11px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Shuffle size={15} />
          {menu ? t(idioma, "menu.generarOtro") : t(idioma, "menu.generarPrimero")}
        </button>
        {history && history.length >= 2 && (
          <button
            onClick={onUndo}
            style={{
              fontFamily: FUENTE_TEXTO,
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink-soft)",
              background: "transparent",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Undo2 size={14} />
            {t(idioma, "menu.deshacer")}
          </button>
        )}
      </div>

      {!menu && (
        <div
          style={{
            border: "1.5px dashed var(--line)",
            borderRadius: 12,
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ink-soft)",
            fontFamily: FUENTE_TEXTO,
            fontSize: 13,
          }}
        >
          {t(idioma, "menu.sinMenuTodavia")}
        </div>
      )}

      {menu && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2].map((w) => (
              <button
                key={w}
                onClick={() => setMenuWeek(w)}
                style={{
                  fontFamily: FUENTE_TEXTO,
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "7px 14px",
                  borderRadius: 20,
                  border: "1px solid var(--line)",
                  background: menuWeek === w ? "var(--green-dark)" : "var(--card)",
                  color: menuWeek === w ? "#fff" : "var(--ink)",
                }}
              >
                {t(idioma, "menu.semana", { n: w })}
              </button>
            ))}
            <button
              onClick={() => window.print()}
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
                color: "var(--green-dark)", background: "var(--green-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Download size={13} /> {t(idioma, "menu.exportarPdf")}
            </button>
            <button
              onClick={() => setShowListaCompra(true)}
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
                color: "var(--coffee)", background: "var(--coffee-soft)", border: "none",
                borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t(idioma, "menu.listaCompra")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "dia." + day)}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => {
                      const combinacion = m.closedDish
                        ? m.closedDish
                        : m.item
                        ? m.item
                        : [m.protein, m.carbo, m.verdura, m.garbanzos ? t(idioma, "menuSimple.garbanzos") : null].filter(Boolean).join(" + ") || "—";
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex", alignItems: "baseline", gap: 10,
                            fontFamily: FUENTE_TEXTO, padding: "4px 6px",
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", width: 68, flexShrink: 0 }}>
                            {t(idioma, "mealType." + m.mealType)}
                          </span>
                          <span style={{ fontSize: 13, color: m.closedDish ? "var(--rust)" : "var(--ink)", fontWeight: m.closedDish ? 600 : 400 }}>
                            {combinacion}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <HistoryPanel history={history} idioma={idioma} />

      <PrintExport data={data} menu={menu} idioma={idioma} conCantidades={false} />

      {showListaCompra && (
        <ListaCompraModal
          data={data}
          menu={menu}
          menuWeek={menuWeek}
          listaCompra={data.listaCompraSimple || { marcados: {}, generadoEn: null }}
          onToggle={onToggleMarcadoCompra}
          onClose={() => setShowListaCompra(false)}
          idioma={idioma}
          conCantidades={false}
        />
      )}
    </>
  );
}
