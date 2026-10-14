// ---------- ui/menu/imprimir.jsx ----------
// Versión imprimible del menú (exportar a PDF con el diálogo de impresión del navegador).
import React from "react";
import { fmt } from "macros";
import { dayTotals, mealExportParts } from "comida-calculo";
import { DAYS } from "comun";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Barras de calorías por día de la semana seleccionada, más el desglose de macros de cada día.
// Todo se recalcula en cada render a partir de menu+data, así que si cambias una ración
// (o el propio menú), se actualiza solo, sin ningún paso extra.
// Rueda de macros del día seleccionado, con pestañas para cambiar de día sin repetir 7 gráficas iguales.
// El reparto de la rueda es por aporte calórico real (proteína y carbohidratos = 4 kcal/g, grasa = 9 kcal/g),
// así que el tamaño de cada porción refleja su peso energético de verdad, no solo los gramos.
// ---------- Exportación a PDF (vía "Imprimir" del navegador) ----------
// No usa ninguna librería externa: se renderiza siempre en el DOM (oculto en pantalla),
// y una hoja de estilos "@media print" oculta el resto de la app y muestra solo esto
// cuando el usuario pulsa "Exportar PDF" (que solo llama a window.print()).
// Así funciona igual de bien en Claude y en la versión web, sin nada que se pueda romper.
export function PrintExport({ data, menu, idioma, conCantidades = true }) {
  if (!menu) return null;
  return (
    <div id="print-export">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-export, #print-export * { visibility: visible; }
          #print-export { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-export { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: FUENTE_TITULOS, color: "#2b2b26" }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            FoodDraft
          </div>
          <h1 style={{ fontSize: 28, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "print.tuMenu")}</h1>
        </div>

        {[1, 2].map((week) => {
          const weekHasMeals = menu.some((s) => s.week === week);
          if (!weekHasMeals) return null;
          return (
            <div key={week} style={{ pageBreakBefore: week === 2 ? "always" : "auto" }}>
              <h2 style={{ fontSize: 18, color: "#1f4d38", borderBottom: "2px solid #d9a441", paddingBottom: 5, marginTop: 22 }}>
                {t(idioma, "menu.semana", { n: week })}
              </h2>
              {DAYS.map((day) => {
                const dayMeals = menu.filter((s) => s.week === week && s.day === day);
                if (!dayMeals.length) return null;
                const totals = conCantidades ? dayTotals(data, menu, week, day) : null;
                return (
                  <div
                    key={day}
                    style={{
                      display: "flex", gap: 16, alignItems: "center", marginTop: 12,
                      border: "1px solid #ddd6bf", borderRadius: 8, padding: "10px 14px",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, marginBottom: 6 }}>{t(idioma, "dia." + day)}</div>
                      <div style={{ fontFamily: FUENTE_TEXTO, display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayMeals.map((m) => (
                          <div key={m.id} style={{ fontSize: 11, lineHeight: 1.45 }}>
                            <span style={{ fontWeight: 700, color: "#a9721f" }}>{t(idioma, "mealType." + m.mealType)}: </span>
                            <span>{mealExportParts(data, m, { conCantidades }).join(", ") || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {conCantidades && <PrintDonut totals={totals} />}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          {t(idioma, conCantidades ? "print.pie" : "print.pieSimple")}
        </div>
      </div>
    </div>
  );
}

// Rueda de macros estática (sin pestañas, sin estado) para el documento impreso.
function PrintDonut({ totals }) {
  const segments = [
    { kcal: totals.prot * 4, color: "#2f6b4f" },
    { kcal: totals.fat * 9, color: "#d9a441" },
    { kcal: totals.carb * 4, color: "#6b4423" },
  ];
  const total = segments.reduce((s, x) => s + x.kcal, 0) || 1;
  const R = 34;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ flexShrink: 0, width: 100, textAlign: "center" }}>
      <svg viewBox="0 0 90 90" width="90" height="90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="#f1ede0" strokeWidth="11" />
        {segments.map((s, i) => {
          const len = (s.kcal / total) * C;
          const dashoffset = -acc;
          acc += len;
          return (
            <circle
              key={i} cx="45" cy="45" r={R} fill="none" stroke={s.color} strokeWidth="11"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={dashoffset}
              transform="rotate(-90 45 45)"
            />
          );
        })}
        <text x="45" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f4d38" fontFamily={FUENTE_TEXTO}>
          {Math.round(totals.kcal)}
        </text>
        <text x="45" y="56" textAnchor="middle" fontSize="8" fill="#6b6a5e" fontFamily={FUENTE_TEXTO}>
          kcal
        </text>
      </svg>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 8.5, display: "flex", justifyContent: "center", gap: 4, marginTop: 2 }}>
        <span style={{ color: "#1f4d38" }}>P{fmt(totals.prot)}</span>
        <span style={{ color: "#a9721f" }}>G{fmt(totals.fat)}</span>
        <span style={{ color: "#6b4423" }}>C{fmt(totals.carb)}</span>
      </div>
    </div>
  );
}
