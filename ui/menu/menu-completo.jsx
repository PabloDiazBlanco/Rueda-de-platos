// ---------- ui/menu/menu-completo.jsx ----------
// Pantalla de Menú completo: el ciclo de dos semanas con kcal, macros, raciones y comparación con
// los objetivos del día. Desde la Fase A de la despensa, un menú recién generado es un borrador
// hasta que se confirma: solo entonces su lista de la compra se puede tachar (y llena la despensa) y
// las comidas completadas descuentan de la despensa (ver useDespensa, ui/estado/despensa.js).
import React, { useState } from "react";
import { Shuffle, Undo2, Check } from "lucide-react";
import { DAYS } from "comun";
import { registroComida, indiceRegistros, totalesComidaReal } from "comida-real";
import { fechaISO } from "peso";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { MealDetailModal } from "./detalle-comida.jsx";
import { DayStatsPanel, ResumenSaludPublica, ObjetivosModal } from "./estadisticas.jsx";
import { ListaCompraNetaModal } from "./lista-compra.jsx";
import { documentoMenu } from "./exportar.js";
import { BotonCompartir } from "../comun/compartir.jsx";
import { HistoryPanel } from "./historial.jsx";
import { GenerandoMenu } from "./generando.jsx";
import { LineaPreentreno } from "../perfil/preentreno.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

export function MenuView({ menu, onGenerate, generando, onUndo, menuWeek, setMenuWeek, history, data, onUpdateMeal, objetivos, onUpdateObjetivos, onUpsertRule, onToggleComidaCompletada, despensa, idioma }) {
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [editingObjetivos, setEditingObjetivos] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showListaCompra, setShowListaCompra] = useState(false);
  // Se busca la comida por id en cada render en vez de guardar una copia en el estado:
  // así, al cambiar las raciones, el modal refleja el valor nuevo inmediatamente.
  const selectedMeal = selectedMealId && menu ? menu.find((s) => s.id === selectedMealId) : null;
  // Lo marcado hoy para ese tipo de comida (como siempre, la comida se marca para HOY, no para el día del
  // menú) y lo guardado de cada comida del menú, por su id (B1+B3: para enseñar las kcal de verdad).
  const registroHoy = selectedMeal ? ((data.comidasCompletadas || {})[fechaISO(new Date())] || {})[selectedMeal.mealType] : null;
  const completadaHoy = !!registroHoy;
  const registros = indiceRegistros(data.comidasCompletadas);

  // La línea que explica, en el detalle de la comida, qué pasa con la despensa al marcarla.
  function avisoDespensa() {
    if (!selectedMeal) return null;
    if (completadaHoy) {
      const consumo = despensa.consumoDeHoy(selectedMeal.mealType);
      if (!consumo) return null;
      return t(idioma, consumo.items.length ? "mealDetail.despensa.descontado" : "mealDetail.despensa.nadaQueDescontar");
    }
    return t(idioma, despensa.confirmado ? "mealDetail.despensa.seDescontara" : "mealDetail.despensa.sinConfirmar");
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <SectionIntro text={t(idioma, "menu.intro")} />
        <button
          onClick={() => setEditingObjetivos(true)}
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
            color: "var(--green-dark)", background: "var(--green-soft)", border: "none",
            borderRadius: 8, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          {t(idioma, "menu.verObjetivos")}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button
          onClick={onGenerate}
          disabled={!!generando}
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
            opacity: generando ? 0.6 : 1,
          }}
        >
          <Shuffle size={15} />
          {menu ? t(idioma, "menu.generarOtro") : t(idioma, "menu.generarPrimero")}
        </button>
        {history && history.length >= 2 && !generando && (
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

      {/* Mientras «se genera» (C11), la animación ocupa el sitio del menú. */}
      {generando && <GenerandoMenu generando={generando} idioma={idioma} />}

      {!menu && !generando && (
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

      {menu && !generando && (
        <>
          <AvisoConfirmacion despensa={despensa} idioma={idioma} />

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
            <BotonCompartir
              aspecto="pastilla"
              construirDocumento={(formato) => documentoMenu(data, menu, menuWeek, idioma, { conCantidades: true, formato })}
              nombreArchivo={`menu-semana-${menuWeek}.png`}
              idioma={idioma}
            />
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
            <button
              onClick={() => setShowStats((s) => !s)}
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 600,
                color: "var(--ink-soft)", background: "transparent", border: "none",
                padding: "7px 4px", marginLeft: "auto",
              }}
            >
              {showStats ? t(idioma, "menu.ocultarEstadisticas") : t(idioma, "menu.verEstadisticas")}
            </button>
          </div>

          {showStats && <DayStatsPanel data={data} menu={menu} week={menuWeek} objetivos={objetivos} idioma={idioma} />}
          {showStats && <ResumenSaludPublica data={data} menu={menu} week={menuWeek} objetivos={objetivos} idioma={idioma} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map((day) => {
              const dayMeals = menu.filter((s) => s.week === menuWeek && s.day === day);
              return (
                <div key={day} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>{t(idioma, "dia." + day)}</div>
                  {/* D3: en los días de entreno, la recomendación de preentreno en una línea. */}
                  <LineaPreentreno perfil={data.perfil} day={day} idioma={idioma} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dayMeals.map((m) => {
                      // Las kcal de verdad si la comida se marcó con cambios (B1+B3); si no, las del menú.
                      const totales = totalesComidaReal(data, m, registros);
                      const ajustada = m.raciones && Object.values(m.raciones).some((v) => Number(v) !== 1);
                      return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMealId(m.id)}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                          fontFamily: FUENTE_TEXTO,
                          cursor: "pointer",
                          padding: "4px 6px",
                          marginLeft: -6,
                          marginRight: -6,
                          borderRadius: 7,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mustard-dark)", width: 68, flexShrink: 0 }}>{t(idioma, "mealType." + m.mealType)}</span>
                        {m.closedDish ? (
                          <span style={{ fontSize: 13, color: "var(--rust)", fontWeight: 600 }}>{m.closedDish}</span>
                        ) : m.item ? (
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.item}</span>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {m.protein} + {m.carbo} + {m.verdura}
                            {m.garbanzos && (
                              <span
                                style={{
                                  fontFamily: FUENTE_TEXTO,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: "var(--mustard-dark)",
                                  background: "var(--mustard-soft)",
                                  padding: "2px 7px",
                                  borderRadius: 20,
                                }}
                              >
                                {t(idioma, "menu.garbanzos5050")}
                              </span>
                            )}
                          </span>
                        )}
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          {ajustada && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: 20 }}>
                              {t(idioma, "menu.ajustada")}
                            </span>
                          )}
                          {totales.cambiada && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--mustard-dark)", background: "var(--mustard-soft)", padding: "2px 6px", borderRadius: 20 }}>
                              {t(idioma, "menu.cambiada")}
                            </span>
                          )}
                          {totales.kcal > 0 && (
                            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 700 }}>
                              {t(idioma, "menu.kcal", { n: Math.round(totales.kcal) })}
                            </span>
                          )}
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

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          data={data}
          onUpdateMeal={onUpdateMeal}
          onUpsertRule={onUpsertRule}
          onClose={() => setSelectedMealId(null)}
          completadaHoy={completadaHoy}
          registro={registros.get(selectedMeal.id) || null}
          cambiosHoy={registroHoy && registroHoy.slotId === selectedMeal.id && registroHoy.cambios ? registroHoy.cambios : null}
          onToggleCompletada={() => {
            // «Hecha»: guarda qué comida era y sus macros (lo del menú, tal cual); quitarla la borra.
            onToggleComidaCompletada(selectedMeal.mealType, completadaHoy ? null : registroComida(data, selectedMeal));
            despensa.alMarcarComida(selectedMeal, !completadaHoy);
          }}
          onGuardarCambios={(cambios) => {
            // «Cambié algo»: la comida queda hecha con lo comido de verdad, y la despensa devuelve lo que
            // hubiera descontado y descuenta eso (sin tocar el menú ni el ciclo).
            const registro = registroComida(data, selectedMeal, cambios);
            onToggleComidaCompletada(selectedMeal.mealType, registro);
            despensa.alMarcarComida(selectedMeal, true, registro.cambios || null);
          }}
          avisoDespensa={avisoDespensa()}
          idioma={idioma}
        />
      )}

      {editingObjetivos && (
        <ObjetivosModal
          objetivos={objetivos}
          perfil={data.perfil}
          onClose={() => setEditingObjetivos(false)}
          idioma={idioma}
        />
      )}

      {showListaCompra && (
        <ListaCompraNetaModal
          menu={menu}
          menuWeek={menuWeek}
          despensa={despensa}
          onClose={() => setShowListaCompra(false)}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Encima del menú: si es un borrador, el aviso con el botón para confirmarlo; si ya está confirmado,
// una línea discreta que lo recuerda, con la opción de volver a dejarlo como borrador.
function AvisoConfirmacion({ despensa, idioma }) {
  if (!despensa.confirmado) {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14,
          background: "var(--mustard-soft)", borderRadius: 10, padding: "10px 12px", fontFamily: FUENTE_TEXTO,
        }}
      >
        <span style={{ flex: "1 1 200px", fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>{t(idioma, "menu.confirmar.borrador")}</span>
        <button
          onClick={despensa.confirmar}
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "#fff", background: "var(--green)",
            border: "none", borderRadius: 8, padding: "8px 13px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          }}
        >
          <Check size={14} /> {t(idioma, "menu.confirmar.boton")}
        </button>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 14,
        background: "var(--green-soft)", borderRadius: 10, padding: "8px 12px", fontFamily: FUENTE_TEXTO,
      }}
    >
      <span style={{ flex: "1 1 200px", fontSize: 12, color: "var(--green-dark)", lineHeight: 1.45 }}>
        <Check size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        {t(idioma, "menu.confirmar.confirmado")}
      </span>
      <button
        onClick={despensa.quitarConfirmacion}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "underline",
        }}
      >
        {t(idioma, "menu.confirmar.quitar")}
      </button>
    </div>
  );
}
