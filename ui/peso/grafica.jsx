// ---------- ui/peso/grafica.jsx ----------
// Gráfica de peso en SVG propio (sin librerías) y el seguimiento como «documento» para compartirlo como texto o
// imagen (BotonCompartir, ui/comun/compartir.jsx).
import React from "react";
import { fechaISO, formatFechaCorta } from "peso";
import { t } from "i18n";
import { FUENTE_TEXTO } from "../estilos.js";

// Los puntos y el rango de la gráfica de peso, comunes a la de la pantalla y a la de la imagen para compartir,
// para que las dos dibujen lo mismo. El día 0 es la primera pesada, como en calcularTendenciaPeso
// (logica/peso.js), para que la recta de tendencia caiga en su sitio; 0,4 kg de aire arriba y abajo.
function serieGraficaPeso(entradas) {
  const ordenadas = [...entradas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const inicio = new Date(ordenadas[0].fecha + "T00:00:00");
  const puntos = ordenadas.map((e) => ({
    x: Math.round((new Date(e.fecha + "T00:00:00") - inicio) / 86400000),
    y: e.peso,
    atipico: e.atipico,
  }));
  const ys = puntos.map((p) => p.y);
  const rango = {
    minX: 0, maxX: Math.max(1, ...puntos.map((p) => p.x)),
    minY: Math.min(...ys) - 0.4, maxY: Math.max(...ys) + 0.4,
  };
  // Eje X: fecha de inicio, mitad y fin del rango representado.
  const xTicks = [rango.minX, Math.round((rango.minX + rango.maxX) / 2), rango.maxX];
  const fechaEnX = (x) => fechaISO(new Date(inicio.getTime() + x * 86400000));
  return { ordenadas, puntos, rango, xTicks, fechaEnX };
}

// Gráfica de líneas hecha a mano en SVG (mismo criterio que el resto de la app: sin librerías).
// Dibuja todas las pesadas (las atípicas en un color distinto) y la recta de tendencia calculada
// sobre las pesadas normales.
export function PesoLineChart({ entradas, tendencia, idioma }) {
  const W = 320, H = 170, PAD_L = 32, PAD_R = 6, PAD_TOP = 10, PAD_BOTTOM = 20;
  const { puntos, rango, xTicks, fechaEnX } = serieGraficaPeso(entradas);
  const { minX, maxX, minY, maxY } = rango;
  const sx = (x) => PAD_L + ((x - minX) / (maxX - minX || 1)) * (W - PAD_L - PAD_R);
  const sy = (y) => H - PAD_BOTTOM - ((y - minY) / (maxY - minY || 1)) * (H - PAD_TOP - PAD_BOTTOM);

  const pathPuntos = puntos.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");

  // Eje Y: mínimo, medio y máximo del rango visible (en kg).
  const yTicks = [minY, (minY + maxY) / 2, maxY];

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

// El seguimiento de peso (un cierre de ciclo o un rango de la progresión) como «documento» para compartirlo
// como texto o como imagen (BotonCompartir, ui/comun/compartir.jsx). Sustituye a la versión imprimible
// (window.print), que salía con mal formato y en iPhone no se podía usar (Pablo, noviembre de 2026). Lleva lo
// mismo que llevaba el PDF:
// - Cabecera: «Seguimiento de peso» y de qué es (el cierre o el rango) con la fecha de hoy; si hay tendencia,
//   su frase debajo («Tendencia: −0,25 %/semana»).
// - En la imagen, la gráfica, dibujada como la de la pantalla (mismo `serieGraficaPeso`).
// - Las pesadas, por años: la fecha corta («12 nov») no lleva año y un rango «Histórico completo» puede
//   abarcar varios; el año como título de cada apartado lo deja claro sin alargar cada línea. Las atípicas
//   llevan su aviso y su motivo, como en el PDF.
export function documentoSeguimiento(entradas, tendencia, titulo, idioma, formato = "texto") {
  const { ordenadas, puntos, rango, xTicks, fechaEnX } = serieGraficaPeso(entradas);
  const secciones = [];
  ordenadas.forEach((e) => {
    const ano = e.fecha.slice(0, 4);
    let seccion = secciones[secciones.length - 1];
    if (!seccion || seccion.titulo !== ano) {
      seccion = { titulo: ano, lineas: [] };
      secciones.push(seccion);
    }
    const atipica = e.atipico
      ? ` · ${t(idioma, "printSeguimiento.atipica", { detalle: e.motivo ? `: ${t(idioma, "motivo." + e.motivo)}` : "" })}`
      : "";
    seccion.lineas.push({ etiqueta: formatFechaCorta(e.fecha, idioma), texto: `${e.peso} kg${atipica}` });
  });
  return {
    titulo: t(idioma, "printSeguimiento.titulo"),
    subtitulo: t(idioma, "printSeguimiento.exportadoEl", { titulo, fecha: formatFechaCorta(fechaISO(new Date()), idioma) }),
    nota: tendencia
      ? t(idioma, "printSeguimiento.tendencia", { signo: tendencia.pctSemana > 0 ? "+" : "", pct: tendencia.pctSemana.toFixed(2) })
      : null,
    grafica: formato === "imagen"
      ? {
          puntos: puntos.map((p) => ({ x: p.x, y: p.y, destacado: !!p.atipico })),
          rango,
          tendencia: tendencia || null,
          etiquetasX: xTicks.map((x) => formatFechaCorta(fechaEnX(x), idioma)),
        }
      : null,
    secciones,
  };
}
