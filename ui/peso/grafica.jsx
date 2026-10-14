// ---------- ui/peso/grafica.jsx ----------
// Gráfica de peso en SVG propio (sin librerías) y su versión imprimible.
import React from "react";
import { fechaISO, formatFechaCorta } from "peso";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Gráfica de líneas hecha a mano en SVG (mismo criterio que el resto de la app: sin librerías).
// Dibuja todas las pesadas (las atípicas en un color distinto) y la recta de tendencia calculada
// sobre las pesadas normales.
export function PesoLineChart({ entradas, tendencia, idioma }) {
  const W = 320, H = 170, PAD_L = 32, PAD_R = 6, PAD_TOP = 10, PAD_BOTTOM = 20;
  const ordenadas = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const inicio = new Date(ordenadas[0].fecha + "T00:00:00");
  const puntos = ordenadas.map((e) => ({
    x: Math.round((new Date(e.fecha + "T00:00:00") - inicio) / 86400000),
    y: e.peso,
    atipico: e.atipico,
  }));
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = 0, maxX = Math.max(1, ...xs);
  const minY = Math.min(...ys) - 0.4, maxY = Math.max(...ys) + 0.4;
  const sx = (x) => PAD_L + ((x - minX) / (maxX - minX || 1)) * (W - PAD_L - PAD_R);
  const sy = (y) => H - PAD_BOTTOM - ((y - minY) / (maxY - minY || 1)) * (H - PAD_TOP - PAD_BOTTOM);

  const pathPuntos = puntos.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");

  // Eje Y: mínimo, medio y máximo del rango visible (en kg).
  const yTicks = [minY, (minY + maxY) / 2, maxY];
  // Eje X: fecha de inicio, mitad y fin del rango representado.
  const xTicks = [minX, Math.round((minX + maxX) / 2), maxX];
  const fechaEnX = (x) => fechaISO(new Date(inicio.getTime() + x * 86400000));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
      {yTicks.map((v, i) => (
        <g key={`y${i}`}>
          <line x1={PAD_L} y1={sy(v)} x2={W - PAD_R} y2={sy(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
          <text x={PAD_L - 5} y={sy(v) + 3} textAnchor="end" fontSize="8" fill="var(--ink-soft)" fontFamily={FUENTE_TEXTO}>
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}

      <polyline points={pathPuntos} fill="none" stroke="var(--line)" strokeWidth="1.5" />
      {tendencia && (
        <line
          x1={sx(minX)} y1={sy(tendencia.intercepto + tendencia.pendiente * minX)}
          x2={sx(maxX)} y2={sy(tendencia.intercepto + tendencia.pendiente * maxX)}
          stroke="var(--green)" strokeWidth="2" strokeDasharray="5 4"
        />
      )}
      {puntos.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={p.atipico ? 3.5 : 3}
          fill={p.atipico ? "var(--mustard)" : "var(--green-dark)"}
          stroke="#fff" strokeWidth="1" />
      ))}

      {xTicks.map((x, i) => (
        <text
          key={`x${i}`} x={sx(x)} y={H - 5}
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
          fontSize="8" fill="var(--ink-soft)" fontFamily={FUENTE_TEXTO}
        >
          {formatFechaCorta(fechaEnX(x), idioma)}
        </text>
      ))}
    </svg>
  );
}

// Vista de impresión del seguimiento de peso — mismo patrón que PrintExport para el menú: un bloque
// oculto en pantalla (@media screen) que solo se muestra al imprimir (@media print), para que
// "Guardar como PDF" del propio navegador lo capture sin necesidad de ninguna librería.
export function PrintSeguimiento({ entradas, tendencia, titulo, idioma }) {
  if (!entradas || entradas.length === 0) return null;
  const ordenadas = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return (
    <div id="print-seguimiento">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-seguimiento, #print-seguimiento * { visibility: visible; }
          #print-seguimiento { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @media screen {
          #print-seguimiento { display: none; }
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: FUENTE_TITULOS, color: "#2b2b26" }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6b6a5e" }}>
            FoodDraft
          </div>
          <h1 style={{ fontSize: 26, color: "#1f4d38", margin: "2px 0 0 0" }}>{t(idioma, "printSeguimiento.titulo")}</h1>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "#6b6a5e", marginTop: 4 }}>
            {t(idioma, "printSeguimiento.exportadoEl", { titulo, fecha: formatFechaCorta(fechaISO(new Date()), idioma) })}
          </div>
        </div>

        <div style={{ marginTop: 18, maxWidth: 420 }}>
          <PesoLineChart entradas={ordenadas} tendencia={tendencia || null} idioma={idioma} />
        </div>

        {tendencia && (
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "#1f4d38", fontWeight: 700, marginTop: 8 }}>
            {t(idioma, "printSeguimiento.tendencia", { signo: tendencia.pctSemana > 0 ? "+" : "", pct: tendencia.pctSemana.toFixed(2) })}
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontFamily: FUENTE_TEXTO, fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.fecha")}</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.pesoKg")}</th>
              <th style={{ textAlign: "left", borderBottom: "2px solid #d9a441", padding: "4px 6px" }}>{t(idioma, "printSeguimiento.nota")}</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((e) => (
              <tr key={e.id || e.fecha}>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{formatFechaCorta(e.fecha, idioma)}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf" }}>{e.peso}</td>
                <td style={{ padding: "3px 6px", borderBottom: "1px solid #ddd6bf", color: "#a9721f" }}>
                  {e.atipico ? t(idioma, "printSeguimiento.atipica", { detalle: e.motivo ? `: ${t(idioma, "motivo." + e.motivo)}` : "" }) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 9.5, color: "#999", textAlign: "center", marginTop: 24 }}>
          {t(idioma, "printSeguimiento.pie")}
        </div>
      </div>
    </div>
  );
}
