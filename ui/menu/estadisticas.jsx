// ---------- ui/menu/estadisticas.jsx ----------
// Estadísticas del menú: panel del día, resumen de sal/azúcares/fibra frente a la OMS y el modal
// de objetivos nutricionales.
import React from "react";
import { AlertCircle } from "lucide-react";
import { fmt } from "macros";
import { totalesDiaReal } from "comida-real";
import { OBJETIVO_ETAPAS, calcularObjetivosPerfil, objetivosPorComida } from "objetivos";
import { resumenNutrientesSemana } from "salud-publica";
import { t } from "i18n";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { MacroPill } from "../comun/tarjetas.jsx";
import { NivelBadge } from "../peso/seguimiento.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

// La tarjeta de macros del día elegido (Bloque MENÚ de la parte estética, 26-oct-2026: opción A «sin aro»
// de local/ideas/esteticas/v2-02-macros.html). A la izquierda, el anillo cuenta solo el reparto de las kcal
// entre los tres macros, con las kcal en el centro, y debajo la pastilla del % del objetivo de kcal (mostaza
// si te quedas corto, verde si estás en el ±10 %, óxido si te pasas: el mismo criterio que antes). A la
// derecha, cada macro contra su objetivo: la barra es lo que llevas y la raya mostaza, el 100 % (la escala
// llega al 130 %, para que se vea cuánto te pasas); una barra que pasa del 110 % se pinta en óxido, como su
// cifra. Así responde a «¿llego hoy a mis objetivos?» sin leer números, con el criterio de gráficas: un color,
// un significado. Sin objetivos calculados no hay barras: quedan el anillo y las pastillas P/G/C.
//
// Las kcal y macros del día son las de verdad (B1+B3): en las comidas que se marcaron con cambios, lo
// que se comió; en el resto, lo del menú. Se avisa debajo cuando hay alguna cambiada. El día lo elige
// quien la pinta (MenuView, con SelectorDia), para que la gráfica y las comidas de debajo vayan a la par.
export function DayStatsPanel({ data, menu, week, day, objetivos, idioma }) {
  const totals = totalesDiaReal(data, menu, week, day);

  const segments = [
    { key: "prot", kcal: totals.prot * 4, color: "var(--macro-prot)" },
    { key: "fat", kcal: totals.fat * 9, color: "var(--macro-grasa)" },
    { key: "carb", kcal: totals.carb * 4, color: "var(--macro-carb)" },
  ];
  const totalForRing = segments.reduce((s, x) => s + x.kcal, 0);
  const R = 50;
  const C = 2 * Math.PI * R;
  // Un pequeño hueco entre segmentos, para que se lean tres trozos y no una mancha.
  const HUECO = totalForRing > 0 ? 2 : 0;
  let acc = 0;

  const pct = objetivos?.kcal ? Math.round((totals.kcal / objetivos.kcal) * 100) : null;
  const pctStyle =
    pct === null ? null :
    pct < 90 ? { bg: "var(--mustard-soft)", fg: "var(--mustard-dark)" } :
    pct > 110 ? { bg: "var(--rust-soft)", fg: "var(--rust)" } :
    { bg: "var(--green-soft)", fg: "var(--green-dark)" };

  const conObjetivos = !!(objetivos && objetivos.kcal && objetivos.prot && objetivos.fat && objetivos.carb);
  const barras = [
    { key: "prot", nombre: t(idioma, "objetivosModal.proteina"), valor: totals.prot, obj: objetivos?.prot, color: "var(--macro-prot)" },
    { key: "fat", nombre: t(idioma, "objetivosModal.grasa"), valor: totals.fat, obj: objetivos?.fat, color: "var(--macro-grasa)" },
    { key: "carb", nombre: t(idioma, "objetivosModal.carbos"), valor: totals.carb, obj: objetivos?.carb, color: "var(--macro-carb)" },
  ];
  // La escala de las barras llega al 130 %: la raya del objetivo cae en 1/1,3 del ancho.
  const TOPE = 1.3;
  const rayaObjetivo = `${(100 / TOPE).toFixed(2)}%`;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 14px 12px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
        <div style={{ width: 124, flexShrink: 0, textAlign: "center" }}>
          <div style={{ position: "relative", width: 124, height: 124 }}>
            <svg viewBox="0 0 124 124" width="124" height="124" aria-hidden="true">
              <circle cx="62" cy="62" r={R} fill="none" stroke="var(--paper)" strokeWidth="14" />
              {totalForRing > 0 && segments.map((s) => {
                const len = (s.kcal / totalForRing) * C;
                const dashoffset = -acc;
                acc += len;
                return (
                  <circle
                    key={s.key} cx="62" cy="62" r={R} fill="none" stroke={s.color} strokeWidth="14"
                    strokeDasharray={`${Math.max(0, len - HUECO)} ${C}`} strokeDashoffset={dashoffset}
                    transform="rotate(-90 62 62)"
                  />
                );
              })}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 23, color: "var(--green-dark)", lineHeight: 1.1 }}>{Math.round(totals.kcal)}</div>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10, color: "var(--ink-soft)" }}>kcal</div>
            </div>
          </div>
          {pct !== null && (
            <span style={{
              display: "inline-block", marginTop: 6, fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700, lineHeight: 1.3,
              padding: "3px 9px", borderRadius: 20, background: pctStyle.bg, color: pctStyle.fg,
            }}>
              {t(idioma, "menu.dia.pctDe", { pct, kcal: objetivos.kcal })}
            </span>
          )}
        </div>

        {conObjetivos ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, fontFamily: FUENTE_TEXTO }}>
            {barras.map((b) => {
              const r = b.valor / b.obj;
              const fuera = r > 1.1;
              return (
                <div key={b.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nombre}</span>
                    <span style={{ fontSize: 10.5, color: fuera ? "var(--rust)" : "var(--ink-soft)", fontWeight: fuera ? 700 : 400, whiteSpace: "nowrap" }}>
                      {Math.round(b.valor)} / {Math.round(b.obj)} g
                    </span>
                  </div>
                  <div style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--paper)" }}>
                    <div style={{ height: 8, borderRadius: 4, width: `${(Math.min(TOPE, r) / TOPE) * 100}%`, background: fuera ? "var(--rust)" : b.color }} />
                    <div aria-hidden="true" style={{ position: "absolute", left: rayaObjetivo, top: -3, width: 2.5, height: 14, marginLeft: -1.25, borderRadius: 1, background: "var(--mustard)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <MacroPill label="P" value={`${fmt(totals.prot)}g`} color="var(--macro-prot-texto)" bg="var(--macro-prot-suave)" />
            <MacroPill label="G" value={`${fmt(totals.fat)}g`} color="var(--macro-grasa-texto)" bg="var(--macro-grasa-suave)" />
            <MacroPill label="C" value={`${fmt(totals.carb)}g`} color="var(--macro-carb-texto)" bg="var(--macro-carb-suave)" />
          </div>
        )}
      </div>

      {totals.cambiadas > 0 && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10, textAlign: "center" }}>
          {t(idioma, totals.cambiadas === 1 ? "dayStats.conCambiosUna" : "dayStats.conCambios", { n: totals.cambiadas })}
        </div>
      )}

      {!objetivos?.kcal && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)", marginTop: 10, textAlign: "center" }}>
          {t(idioma, "dayStats.fijaObjetivo")}
        </div>
      )}
    </div>
  );
}

// Media diaria de sal, azúcares y fibra de la semana del menú actual, comparada contra los
// umbrales de la OMS (ver logica/salud-publica.js). El umbral de azúcar se ajusta a tu objetivo de
// kcal si lo tienes calculado; si no, usa la dieta de referencia de 2000 kcal del propio estudio.
export function ResumenSaludPublica({ data, menu, week, objetivos, idioma }) {
  const resumen = resumenNutrientesSemana(data, menu, week, objetivos?.kcal);
  if (!resumen) return null;

  const filas = [
    { key: "sal", label: t(idioma, "saludPublica.sal"), unidad: "g", info: resumen.sal, detalle: t(idioma, "saludPublica.detalleSal", { n: resumen.sal.umbral }) },
    { key: "azucares", label: t(idioma, "saludPublica.azucares"), unidad: "g", info: resumen.azucares, detalle: t(idioma, "saludPublica.detalleAzucares", { optimo: fmt(resumen.azucares.umbralOptimo), maximo: fmt(resumen.azucares.umbralMaximo) }) },
    { key: "fibra", label: t(idioma, "saludPublica.fibra"), unidad: "g", info: resumen.fibra, detalle: t(idioma, "saludPublica.detalleFibra", { n: resumen.fibra.umbral }) },
  ];

  const avisos = ["sal", "azucares", "fibra"].filter((k) => resumen.faltanDatos[k].length > 0);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
        {t(idioma, "saludPublica.titulo")}
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 12 }}>
        {t(idioma, "saludPublica.sobreDias", { dias: resumen.dias, plural: resumen.dias === 1 ? "" : "s" })}
        {resumen.azucares.kcalPersonalizada ? t(idioma, "saludPublica.azucarAjustado") : ""}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filas.map((f) => (
          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink)" }}>
                {f.label}: <strong>{fmt(f.info.media)} {f.unidad}/día</strong>
              </div>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)" }}>{f.detalle}</div>
            </div>
            <NivelBadge nivel={f.info.nivel} idioma={idioma} />
          </div>
        ))}
      </div>

      {avisos.length > 0 && (
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--mustard-dark)", marginTop: 12, lineHeight: 1.5 }}>
          {t(idioma, "saludPublica.calculoIncompleto", { lista: avisos.map((k) => t(idioma, "saludPublica." + k + ".nombre")).join(", ") })}
        </div>
      )}
    </div>
  );
}

export function ObjetivosModal({ objetivos, perfil, onClose, idioma }) {
  const objetivosCalculados = calcularObjetivosPerfil(perfil);

  return (
    <ModalShell onClose={onClose} title={t(idioma, "objetivosModal.titulo")}>
      {!objetivosCalculados ? (
        <>
          <div
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--mustard-dark)",
              background: "var(--mustard-soft)", borderRadius: 8, padding: "12px 14px", display: "flex",
              alignItems: "flex-start", gap: 8, lineHeight: 1.5,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{t(idioma, "objetivosModal.perfilIncompleto")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-dark)" }}>{objetivosCalculados.kcal}</div>
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)" }}>{t(idioma, "objetivosModal.kcalDia")}</div>
            {objetivosCalculados.kcalEntrenamiento > 0 && (
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
                {t(idioma, "objetivosModal.desglose", { base: objetivosCalculados.kcalBase, entrenamiento: objetivosCalculados.kcalEntrenamiento })}
              </div>
            )}
            {objetivosCalculados.objetivo !== "mantenimiento" && (
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                {t(idioma, "objetivosModal.tdee", {
                  kcal: objetivosCalculados.kcalMantenimiento,
                  etapa: OBJETIVO_ETAPAS[objetivosCalculados.objetivo].label,
                  signo: objetivosCalculados.ajustePct > 0 ? "+" : "",
                  pct: objetivosCalculados.ajustePct,
                })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
            <MacroPill label={t(idioma, "objetivosModal.proteina")} value={`${objetivosCalculados.prot}g`} color="var(--macro-prot-texto)" bg="var(--macro-prot-suave)" />
            <MacroPill label={t(idioma, "objetivosModal.grasa")} value={`${objetivosCalculados.fat}g`} color="var(--macro-grasa-texto)" bg="var(--macro-grasa-suave)" />
            <MacroPill label={t(idioma, "objetivosModal.carbos")} value={`${objetivosCalculados.carb}g`} color="var(--macro-carb-texto)" bg="var(--macro-carb-suave)" />
          </div>

          {objetivosCalculados.carbMinNotMet && (
            <div
              style={{
                fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--mustard-dark)",
                background: "var(--mustard-soft)", borderRadius: 8, padding: "10px 12px", marginBottom: 16,
                display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {t(idioma, "objetivosModal.carbMinAviso", { carbMin: objetivosCalculados.carbMin, fatFloor: objetivosCalculados.fatFloor })}
              </span>
            </div>
          )}

          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {t(idioma, "objetivosModal.repartoPorComida")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {Object.keys(perfil.repartoComidas).map((mealType) => {
              const sub = objetivosPorComida(objetivosCalculados, mealType, perfil.repartoComidas);
              return (
                <div
                  key={mealType}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontFamily: FUENTE_TEXTO, fontSize: 12.5,
                    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 7, padding: "7px 11px",
                  }}
                >
                  <span>{t(idioma, "mealType." + mealType)} <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>({Math.round(perfil.repartoComidas[mealType] * 100)}%)</span></span>
                  <span style={{ color: "var(--ink-soft)" }}>
                    {sub.kcal} kcal · P{sub.prot} · G{sub.fat} · C{sub.carb}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)",
              background: "var(--paper)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5,
            }}
          >
            {t(idioma, "objetivosModal.formula")}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <ModalBtn onClick={onClose} variant="solid">{t(idioma, "common.cerrar")}</ModalBtn>
          </div>
        </>
      )}
    </ModalShell>
  );
}
