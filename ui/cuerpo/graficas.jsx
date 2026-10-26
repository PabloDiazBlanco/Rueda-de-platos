// ---------- ui/cuerpo/graficas.jsx ----------
// Gráficas y piezas comunes de los informes cruzados, el constructor y el sueño (área Cuerpo, 26-oct-2026),
// en SVG propio y sin librerías, con el **criterio de gráficas** (local/ideas/esteticas/09-graficas.html y
// v2-09-informes.html, decidido el 26-oct):
// - un color, un significado: verde = lo tuyo (el dato), mostaza = la referencia (objetivo, media), óxido =
//   fuera de rango, gris = fondo o sin dato. Con varias variables a la vez, cada una lleva el color de su
//   orden (1.ª verde, 2.ª naranja, 3.ª ciruela, 4.ª café), nunca mostaza;
// - tres familias: «hoy frente a objetivo» (barras con la raya del objetivo), «evolución en el tiempo»
//   (línea o barras) y «reparto por músculo» (el mapa corporal, ui/comun/mapa-corporal.jsx);
// - tocar para leer: cada punto, barra o casilla escribe su valor en una línea fija debajo (`Lectura`),
//   nunca en un globo que tape la gráfica;
// - el botón verde «Gráfica» siempre visible abre la gráfica entera en una hoja inferior;
// - un solo selector de rango: 1 mes · 3 meses · 1 año · Todo.
// Las gráficas reciben los datos ya calculados (logica/cuerpo-series.js) y solo los dibujan.
import React, { useState, useMemo } from "react";
import { BarChart3, Star } from "lucide-react";
import { t } from "i18n";
import { RANGOS, construirSerie, valores, variable, tablaXYZ } from "cuerpo-series";
import { calcularObjetivosPerfil } from "objetivos";
import { nombreEjercicio } from "entreno-nombres";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { formatoNumero, diaYMes, DIAS_CORTOS } from "../entreno/comun.jsx";
import { useTodasLasSesiones } from "../entreno/ficha.jsx";
import { leerPeriodoLocal } from "./periodo.jsx";

export const COLORES_SERIE = ["var(--green)", "var(--citrus)", "var(--berry)", "var(--coffee)"];
const TINTA = "var(--ink)";
const SUAVE = "var(--ink-soft)";
const FONDO = "#e6e2d6";
const PAPEL = "#f1ede0";

// ---------- Formatos ----------
export const num = (v, idioma, dec = 0) => (v === null || v === undefined || Number.isNaN(v) ? "—" : formatoNumero(v, idioma, dec));
export function conUnidad(v, unidad, idioma, dec = 0) {
  if (v === null || v === undefined) return "—";
  const n = num(v, idioma, dec);
  if (!unidad || unidad === "kcal") return unidad === "kcal" ? `${n} kcal` : n;
  return unidad[0] === "/" ? n + unidad : `${n} ${unidad}`;
}
// «lun 12» para un día; «12 oct» para una semana (el día en que empieza).
export function etiquetaFecha(fecha, idioma, periodo) {
  const d = new Date(fecha + "T12:00:00");
  if (periodo === "semana") return diaYMes(d, idioma, true);
  const dia = (DIAS_CORTOS[idioma] || DIAS_CORTOS.es)[(d.getDay() + 6) % 7];
  return `${dia} ${d.getDate()}`;
}
export function etiquetaLarga(fecha, idioma, periodo) {
  const d = new Date(fecha + "T12:00:00");
  return periodo === "semana" ? t(idioma, "cuerpo.graf.semanaDel", { fecha: diaYMes(d, idioma, true) }) : diaYMes(d, idioma, true);
}

function rango(vals, pad = 0.08) {
  const xs = vals.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (!xs.length) return [0, 1];
  let a = Math.min(...xs), b = Math.max(...xs);
  if (a === b) { a -= 1; b += 1; }
  const d = (b - a) * pad;
  return [a - d, b + d];
}
const Txt = ({ x, y, children, a = "start", s = 8.5, c = SUAVE, w = 400, ...resto }) => (
  <text x={x} y={y} fontSize={s} fill={c} textAnchor={a} fontWeight={w} fontFamily={FUENTE_TEXTO} {...resto}>{children}</text>
);
function trazo(vals, X, Y) {
  let d = "", dentro = false;
  vals.forEach((v, i) => {
    if (v === null || v === undefined) { dentro = false; return; }
    d += `${dentro ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)} `;
    dentro = true;
  });
  return d;
}
function EjeX({ etiquetas, X, y }) {
  const n = etiquetas.length;
  const cada = Math.max(1, Math.ceil(n / 6));
  return etiquetas.map((e, i) => (i % cada === 0 || i === n - 1) && !(i !== n - 1 && n - 1 - i < cada / 2) ? <Txt key={i} x={X(i)} y={y} a="middle" s={7.5}>{e}</Txt> : null);
}

// ---------- Lectura al tocar ----------
export function useLectura() {
  return useState(null);
}
export function Lectura({ texto, idioma }) {
  return (
    <div aria-live="polite" style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: texto ? TINTA : SUAVE, borderTop: "1px dashed var(--line)", paddingTop: 6, marginTop: 6, minHeight: 20 }}>
      {texto || t(idioma, "cuerpo.graf.tocar")}
    </div>
  );
}
const tocable = (onLeer, texto) => (onLeer ? { onClick: () => onLeer(texto), style: { cursor: "pointer" } } : {});

// ---------- Evolución en el tiempo ----------
// `datos`: [{ etiqueta, larga, valor }]. Con `barras`, barras desde 0 (sumas: entrenos, volumen, récords).
export function Linea({ datos, color = "var(--green)", referencia = null, refTxt = "", unidad = "", dec = 0, alto = 130, barras = false, onLeer, idioma, bandas = null, minimo = null, maximo = null }) {
  const x0 = 34, x1 = 292, y0 = 12, y1 = alto - 18, n = datos.length;
  const vals = datos.map((q) => q.valor);
  let [a, b] = rango(referencia !== null ? [...vals, referencia] : vals);
  if (barras) a = Math.min(0, a);
  // Escala fija cuando la tiene la magnitud (un porcentaje va de 0 a 100, no de −8 a 108).
  if (minimo !== null) a = minimo;
  if (maximo !== null) b = maximo;
  const X = (i) => (barras ? x0 + ((i + 0.5) / Math.max(1, n)) * (x1 - x0) : x0 + (i / Math.max(1, n - 1)) * (x1 - x0));
  const Y = (v) => y1 - ((v - a) / (b - a)) * (y1 - y0);
  const ancho = ((x1 - x0) / Math.max(1, n)) * 0.72;
  const decEje = Math.abs(b - a) < 6 ? 1 : 0;
  return (
    <svg viewBox={`0 0 300 ${alto}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      {bandas && datos.map((q, i) => (bandas(q) ? <rect key={"b" + i} x={X(i) - (x1 - x0) / Math.max(1, n) / 2} y={0} width={(x1 - x0) / Math.max(1, n) + 0.3} height={y1} fill={bandas(q)} /> : null))}
      {[a, (a + b) / 2, b].map((v, i) => <Txt key={i} x={x0 - 4} y={Y(v) + 3} a="end" s={7.5}>{num(v, idioma, decEje)}</Txt>)}
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={FONDO} />
      {barras
        ? datos.map((q, i) => (q.valor === null ? null : (
          <rect key={i} x={X(i) - ancho / 2} y={Math.min(Y(q.valor), Y(0))} width={ancho} height={Math.max(0.5, Math.abs(Y(0) - Y(q.valor)))} rx={2} fill={color} opacity={i === n - 1 ? 1 : 0.6} {...tocable(onLeer, `${q.larga}: ${conUnidad(q.valor, unidad, idioma, dec)}`)} />
        )))
        : (
          <>
            <path d={trazo(vals, X, Y)} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
            {datos.map((q, i) => (q.valor === null ? null : (
              <circle key={i} cx={X(i)} cy={Y(q.valor)} r={n > 40 ? 2.2 : i === n - 1 ? 4 : 3} fill={i === n - 1 ? color : "var(--card)"} stroke={color} strokeWidth={n > 40 ? 1.2 : 1.6} {...tocable(onLeer, `${q.larga}: ${conUnidad(q.valor, unidad, idioma, dec)}`)} />
            )))}
            {/* Zona tocable más ancha que el punto, para el dedo. */}
            {onLeer && datos.map((q, i) => (q.valor === null ? null : <rect key={"t" + i} x={X(i) - (x1 - x0) / Math.max(1, n) / 2} y={0} width={(x1 - x0) / Math.max(1, n)} height={y1} fill="transparent" {...tocable(onLeer, `${q.larga}: ${conUnidad(q.valor, unidad, idioma, dec)}`)} />))}
          </>
        )}
      {referencia !== null && (
        <>
          <line x1={x0} y1={Y(referencia)} x2={x1} y2={Y(referencia)} stroke="var(--mustard)" strokeWidth={1.5} strokeDasharray="5 4" />
          <Txt x={x0 + 4} y={Y(referencia) - 4} c="var(--mustard-dark)" w={700} s={7.5} paintOrder="stroke" stroke="#fffdf7" strokeWidth={3}>{refTxt}</Txt>
        </>
      )}
      <EjeX etiquetas={datos.map((q) => q.etiqueta)} X={X} y={alto - 4} />
    </svg>
  );
}

// ---------- Hoy frente a objetivo / por categoría ----------
// `grupos`: [{ etiqueta, n, media }]; la raya mostaza es la referencia (el objetivo).
export function Pares({ grupos, unidad = "", dec = 0, colores = ["var(--green)"], referencia = null, refTxt = "", onLeer, idioma }) {
  const x0 = 92, ancho = 176;
  const max = Math.max(1, ...grupos.map((g) => g.media || 0), referencia || 0) * 1.12;
  const esc = ancho / max;
  const H = grupos.length * 28 + (referencia !== null ? 18 : 6);
  return (
    <svg viewBox={`0 0 300 ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      {grupos.map((g, i) => {
        const y = 6 + i * 28;
        const texto = `${g.etiqueta}: ${conUnidad(g.media, unidad, idioma, dec)} (${t(idioma, "cuerpo.graf.nDias", { n: g.n })})`;
        return (
          <g key={i} {...tocable(onLeer, texto)}>
            <Txt x={0} y={y + 12} c={TINTA} w={700} s={9}>{g.etiqueta}</Txt>
            <Txt x={0} y={y + 22} s={7}>{t(idioma, "cuerpo.graf.nDias", { n: g.n })}</Txt>
            <rect x={x0} y={y + 3} width={ancho} height={14} rx={4} fill={PAPEL} />
            {g.media !== null && <rect x={x0} y={y + 3} width={Math.max(1, g.media * esc)} height={14} rx={4} fill={colores[i % colores.length]} />}
            {g.media !== null && <Txt x={x0 + g.media * esc + 4} y={y + 13.5} s={8.5} c={TINTA} w={700}>{num(g.media, idioma, dec)}</Txt>}
          </g>
        );
      })}
      {referencia !== null && (
        <>
          <line x1={x0 + referencia * esc} y1={2} x2={x0 + referencia * esc} y2={grupos.length * 28 + 4} stroke="var(--mustard)" strokeWidth={2} strokeDasharray="4 3" />
          <Txt x={Math.min(290, x0 + referencia * esc)} y={grupos.length * 28 + 14} c="var(--mustard-dark)" w={700} s={7.5} a="middle">{refTxt}</Txt>
        </>
      )}
    </svg>
  );
}

// ---------- Una cosa contra otra ----------
// `p`: [[x, y, etiqueta]]; la raya fina mostaza es la tendencia (recta de mínimos cuadrados). Con
// `colorDe`, el color de cada punto es una tercera variable (de claro a oscuro).
export function Dispersion({ p, ejeX, ejeY, decX = 0, decY = 0, uX = "", uY = "", colorDe = null, colorTxt = "", onLeer, idioma }) {
  const x0 = 38, x1 = 290, y0 = 10, y1 = 112;
  const [ax, bx] = rango(p.map((q) => q[0]));
  const [ay, by] = rango(p.map((q) => q[1]));
  const X = (v) => x0 + ((v - ax) / (bx - ax)) * (x1 - x0);
  const Y = (v) => y1 - ((v - ay) / (by - ay)) * (y1 - y0);
  const n = p.length;
  const mx = p.reduce((a, q) => a + q[0], 0) / (n || 1), my = p.reduce((a, q) => a + q[1], 0) / (n || 1);
  const bb = p.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0) / (p.reduce((a, q) => a + (q[0] - mx) ** 2, 0) || 1);
  const aa = my - bb * mx;
  const [ac, bc] = colorDe ? rango(p.map(colorDe), 0) : [0, 1];
  const tono = (v) => {
    const k = (v - ac) / (bc - ac || 1);
    const c1 = [214, 230, 216], c2 = [31, 77, 56];
    return `rgb(${c1.map((c, i) => Math.round(c + (c2[i] - c) * k)).join(",")})`;
  };
  return (
    <svg viewBox={`0 0 300 ${colorDe ? 148 : 132}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={FONDO} />
      <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={FONDO} />
      {n >= 3 && <line x1={X(ax)} y1={Y(aa + bb * ax)} x2={X(bx)} y2={Y(aa + bb * bx)} stroke="var(--mustard)" strokeWidth={1.5} strokeDasharray="4 4" />}
      {p.map((q, i) => (
        <circle key={i} cx={X(q[0])} cy={Y(q[1])} r={n > 40 ? 3.4 : 4.6} fill={colorDe ? tono(colorDe(q)) : "var(--green)"} fillOpacity={colorDe ? 1 : 0.75} stroke="#fffdf7"
          {...tocable(onLeer, `${q[2] || ""}: ${conUnidad(q[0], uX, idioma, decX)} · ${conUnidad(q[1], uY, idioma, decY)}${colorDe ? ` · ${colorTxt} ${num(colorDe(q), idioma, 1)}` : ""}`)} />
      ))}
      <Txt x={x1} y={y1 + 14} a="end" s={8}>{ejeX}</Txt>
      <Txt x={10} y={y0} s={8} a="end" transform={`rotate(-90 10 ${y0})`}>{ejeY}</Txt>
      <Txt x={x0} y={y1 + 14} s={7.5}>{num(ax, idioma, decX)}</Txt>
      <Txt x={x0 - 4} y={y0 + 6} a="end" s={7.5}>{num(by, idioma, decY)}</Txt>
      <Txt x={x0 - 4} y={y1} a="end" s={7.5}>{num(ay, idioma, decY)}</Txt>
      {colorDe && (
        <>
          <defs><linearGradient id="cuerpo-grad-color" x1="0" x2="1"><stop offset="0" stopColor="rgb(214,230,216)" /><stop offset="1" stopColor="#1f4d38" /></linearGradient></defs>
          <rect x={x1 - 80} y={134} width={50} height={7} rx={3.5} fill="url(#cuerpo-grad-color)" />
          <Txt x={x1 - 84} y={141} a="end" s={7.5}>{`${colorTxt}: ${num(ac, idioma, 1)}`}</Txt>
          <Txt x={x1 - 26} y={141} s={7.5}>{num(bc, idioma, 1)}</Txt>
        </>
      )}
    </svg>
  );
}

// ---------- Tres variables o más: las cinco vistas ----------
// `filas`: [{ nombre, unidad, dec, datos: [{ etiqueta, larga, valor }] }] (todas con las mismas fechas).

// (a) Apiladas: cada variable en su franja, con su escala; tocar una columna marca esa fecha en todas.
export function Apiladas({ filas, onLeer, idioma, bandas = null }) {
  const [col, setCol] = useState(null);
  if (!filas.length) return null;
  const n = filas[0].datos.length, x0 = 34, x1 = 292, alto = 62;
  const X = (i) => x0 + (i / Math.max(1, n - 1)) * (x1 - x0);
  const H = filas.length * (alto + 8) + 12;
  const anchoCol = (x1 - x0) / Math.max(1, n);
  return (
    <svg viewBox={`0 0 300 ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      {bandas && filas[0].datos.map((q, i) => (bandas(q) ? <rect key={"b" + i} x={X(i) - anchoCol / 2} y={0} width={anchoCol + 0.3} height={H - 14} fill={bandas(q)} /> : null))}
      {filas.map((f, k) => {
        const top = k * (alto + 8), y0 = top + 14, y1 = top + alto;
        const vals = f.datos.map((q) => q.valor);
        const [a, b] = rango(vals);
        const Y = (v) => y1 - ((v - a) / (b - a)) * (y1 - y0);
        const color = COLORES_SERIE[k % 4];
        return (
          <g key={k}>
            <Txt x={0} y={top + 9} c={color} w={700} s={8.5}>{f.nombre}</Txt>
            <Txt x={x1} y={top + 9} a="end" s={7.5}>{f.unidad && f.unidad !== "kcal" ? f.unidad : f.unidad === "kcal" ? "kcal" : ""}</Txt>
            <line x1={x0} y1={y1} x2={x1} y2={y1} stroke={FONDO} />
            {/* Sin ningún dato en el rango, una escala inventada (0-1) confundiría: se dice que no hay datos. */}
            {vals.every((v) => v === null || v === undefined)
              ? <Txt x={(x0 + x1) / 2} y={(y0 + y1) / 2 + 3} a="middle" s={8}>{t(idioma, "cuerpo.graf.sinDatos")}</Txt>
              : (
                <>
                  <Txt x={x0 - 4} y={y0 + 4} a="end" s={7}>{num(b, idioma, f.dec)}</Txt>
                  <Txt x={x0 - 4} y={y1} a="end" s={7}>{num(a, idioma, f.dec)}</Txt>
                </>
              )}
            <path d={trazo(vals, X, Y)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
            {vals.map((v, i) => (v === null ? null : <circle key={i} cx={X(i)} cy={Y(v)} r={n > 40 ? 1.4 : 2.2} fill={color} />))}
          </g>
        );
      })}
      <EjeX etiquetas={filas[0].datos.map((q) => q.etiqueta)} X={X} y={H - 4} />
      {col !== null && <line x1={X(col)} y1={0} x2={X(col)} y2={H - 14} stroke={TINTA} strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />}
      {filas[0].datos.map((q, i) => (
        <rect key={"c" + i} x={X(i) - anchoCol / 2} y={0} width={anchoCol} height={H - 14} fill="transparent" style={{ cursor: "pointer" }}
          onClick={() => { setCol(i); if (onLeer) onLeer(`${q.larga}: ${filas.map((f) => `${f.nombre} ${conUnidad(f.datos[i].valor, f.unidad, idioma, f.dec)}`).join(" · ")}`); }} />
      ))}
    </svg>
  );
}

// (b) Juntas: cada línea de su mínimo (abajo) a su máximo (arriba); se comparan las formas, no los números.
export function Normalizadas({ filas, onLeer, idioma }) {
  if (!filas.length) return null;
  const n = filas[0].datos.length, x0 = 30, x1 = 292, y0 = 24, y1 = 128;
  const X = (i) => x0 + (i / Math.max(1, n - 1)) * (x1 - x0);
  const Y = (k) => y1 - k * (y1 - y0);
  return (
    <svg viewBox="0 0 300 146" style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
      {[0, 0.5, 1].map((k) => (
        <g key={k}>
          <line x1={x0} y1={Y(k)} x2={x1} y2={Y(k)} stroke={FONDO} strokeDasharray={k ? "2 3" : "0"} />
          <Txt x={x0 - 4} y={Y(k) + 3} a="end" s={7}>{t(idioma, k === 1 ? "cuerpo.graf.max" : k ? "cuerpo.graf.medio" : "cuerpo.graf.min")}</Txt>
        </g>
      ))}
      {filas.map((f, k) => {
        const vals = f.datos.map((q) => q.valor);
        const [a, b] = rango(vals, 0);
        const color = COLORES_SERIE[k % 4];
        const norm = (v) => (v - a) / (b - a);
        return (
          <g key={k}>
            <path d={trazo(vals.map((v) => (v === null ? null : norm(v))), X, Y)} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" opacity={0.9} />
            {vals.map((v, i) => (v === null ? null : <circle key={i} cx={X(i)} cy={Y(norm(v))} r={n > 40 ? 1.8 : 2.8} fill="#fffdf7" stroke={color} strokeWidth={1.4} {...tocable(onLeer, `${f.datos[i].larga} · ${f.nombre}: ${conUnidad(v, f.unidad, idioma, f.dec)}`)} />))}
            <circle cx={8 + k * 74} cy={8} r={3.5} fill={color} />
            <Txt x={14 + k * 74} y={11} s={7.5}>{f.nombre}</Txt>
          </g>
        );
      })}
      <EjeX etiquetas={filas[0].datos.map((q) => q.etiqueta)} X={X} y={142} />
    </svg>
  );
}

// (c) Tabla: alto / bajo de X e Y (por su mediana), media de Z en cada casilla con cuántas fechas detrás.
export function TablaXYZ({ tabla, nombres, unidadZ, decZ, decX, decY, onLeer, idioma }) {
  const [nx, ny, nz] = nombres;
  const u = t(idioma, tabla.periodo === "dia" ? "cuerpo.graf.dias" : "cuerpo.graf.semanas");
  const celda = (k) => {
    const c = tabla.celdas[k];
    const base = { borderRadius: 10, textAlign: "center", padding: "10px 4px", fontFamily: FUENTE_TEXTO, fontSize: 12 };
    if (c.media === null) return <td key={k} style={{ ...base, background: PAPEL, color: SUAVE }}>{c.n} {u}<br /><small>{t(idioma, "cuerpo.graf.pocos")}</small></td>;
    return (
      <td key={k} onClick={onLeer ? () => onLeer(`${c.n} ${u}: ${nz} ${conUnidad(c.media, unidadZ, idioma, decZ)}`) : undefined} style={{ ...base, background: "var(--green-soft)", color: "var(--green-dark)", cursor: onLeer ? "pointer" : "default" }}>
        <b style={{ fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18 }}>{conUnidad(c.media, unidadZ, idioma, decZ)}</b><br /><small>{c.n} {u}</small>
      </td>
    );
  };
  const th = { fontFamily: FUENTE_TEXTO, fontSize: 11, color: SUAVE, fontWeight: 700, textAlign: "center", padding: 4 };
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
        <tbody>
          <tr>
            <th style={th} />
            <th style={th}>{t(idioma, "cuerpo.graf.alto", { nombre: ny.toLowerCase() })}<br /><small style={{ fontWeight: 400 }}>≥ {num(tabla.medianaY, idioma, decY)}</small></th>
            <th style={th}>{t(idioma, "cuerpo.graf.bajo", { nombre: ny.toLowerCase() })}<br /><small style={{ fontWeight: 400 }}>&lt; {num(tabla.medianaY, idioma, decY)}</small></th>
          </tr>
          <tr>
            <th style={th}>{t(idioma, "cuerpo.graf.alto", { nombre: nx.toLowerCase() })}<br /><small style={{ fontWeight: 400 }}>≥ {num(tabla.medianaX, idioma, decX)}</small></th>
            {celda("aa")}{celda("ab")}
          </tr>
          <tr>
            <th style={th}>{t(idioma, "cuerpo.graf.bajo", { nombre: nx.toLowerCase() })}<br /><small style={{ fontWeight: 400 }}>&lt; {num(tabla.medianaX, idioma, decX)}</small></th>
            {celda("ba")}{celda("bb")}
          </tr>
        </tbody>
      </table>
      <Pie>{t(idioma, "cuerpo.graf.pieTabla", { nombre: nz.toLowerCase() })}</Pie>
    </div>
  );
}

// (e) Tiras de calor: una fila por variable, de claro (bajo) a oscuro (alto), cada fila con su escala.
export function Tiras({ filas, onLeer, idioma }) {
  if (!filas.length) return null;
  const COLOR_HEX = ["#2f6b4f", "#c2662d", "#8a3b5e", "#6b4423"];
  const n = filas[0].datos.length, x0 = 70, x1 = 296, w = (x1 - x0) / Math.max(1, n), alto = 22;
  const mezcla = (hex, k) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgb(${c.map((v) => Math.round(245 + (v - 245) * k)).join(",")})`;
  };
  const H = filas.length * (alto + 6) + 12;
  const X = (i) => x0 + (i + 0.5) * w;
  return (
    <div>
      <svg viewBox={`0 0 300 ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-hidden="true">
        {filas.map((f, k) => {
          const y = k * (alto + 6);
          const vals = f.datos.map((q) => q.valor);
          const [a, b] = rango(vals, 0);
          return (
            <g key={k}>
              <Txt x={0} y={y + 14} c={COLORES_SERIE[k % 4]} w={700} s={8.5}>{f.nombre}</Txt>
              {vals.map((v, i) => (
                <rect key={i} x={x0 + i * w} y={y} width={Math.max(0.5, w - (n > 40 ? 0.4 : 1.5))} height={alto} rx={n > 40 ? 0 : 2}
                  fill={v === null ? PAPEL : mezcla(COLOR_HEX[k % 4], 0.15 + 0.85 * ((v - a) / (b - a)))}
                  {...tocable(onLeer, `${f.datos[i].larga} · ${f.nombre}: ${conUnidad(v, f.unidad, idioma, f.dec)}`)} />
              ))}
            </g>
          );
        })}
        <EjeX etiquetas={filas[0].datos.map((q) => q.etiqueta)} X={X} y={H - 2} />
      </svg>
      <Pie>{t(idioma, "cuerpo.graf.pieTiras")}</Pie>
    </div>
  );
}

// Mini gráfica sin ejes, para las filas de la lista (unos 60 × 28).
export function Mini({ datos, color = "var(--green)", barras = false }) {
  const xs = datos.filter((v) => v !== null && v !== undefined);
  if (!xs.length) return <svg viewBox="0 0 64 30" style={{ width: 60, height: 28, flexShrink: 0 }} aria-hidden="true" />;
  const max = Math.max(...xs), min = barras ? Math.min(0, ...xs) : Math.min(...xs);
  if (barras) {
    const w = 64 / datos.length;
    return (
      <svg viewBox="0 0 64 30" style={{ width: 60, height: 28, flexShrink: 0 }} aria-hidden="true">
        {datos.map((v, i) => {
          const h = v === null ? 0 : ((v - min) / (max - min || 1)) * 26 + 2;
          return <rect key={i} x={i * w + 1} y={30 - h} width={Math.max(1, w - 2)} height={h} rx={1.5} fill={i === datos.length - 1 ? color : "#9fc8ad"} />;
        })}
      </svg>
    );
  }
  const X = (i) => 3 + (i / Math.max(1, datos.length - 1)) * 58;
  const Y = (v) => 27 - ((v - min) / (max - min || 1)) * 24;
  const ult = datos.length - 1 - [...datos].reverse().findIndex((v) => v !== null && v !== undefined);
  return (
    <svg viewBox="0 0 64 30" style={{ width: 60, height: 28, flexShrink: 0 }} aria-hidden="true">
      <path d={trazo(datos, X, Y)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={X(ult)} cy={Y(datos[ult])} r={2.8} fill={color} />
    </svg>
  );
}

// ---------- Piezas ----------
export function Pie({ children }) {
  return <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: SUAVE, marginTop: 4, lineHeight: 1.4 }}>{children}</div>;
}
export function TituloGrafica({ children }) {
  return <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: SUAVE, margin: "10px 0 2px" }}>{children}</div>;
}

// El botón verde «Gráfica», siempre visible (criterio de gráficas).
export function BotonGrafica({ onClick, idioma }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, border: "1.5px solid var(--green)", background: "var(--green-soft)",
      color: "var(--green-dark)", fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "7px 9px", minHeight: 34,
    }}>
      <BarChart3 size={13} /> {t(idioma, "cuerpo.graf.boton")}
    </button>
  );
}

export function Estrella({ activa, onClick, idioma }) {
  return (
    <button onClick={onClick} aria-pressed={!!activa} aria-label={t(idioma, activa ? "cuerpo.fav.quitar" : "cuerpo.fav.poner")}
      style={{ flexShrink: 0, border: "none", background: "none", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: activa ? "var(--mustard)" : "#c9bfa9" }}>
      <Star size={20} fill={activa ? "var(--mustard)" : "none"} />
    </button>
  );
}

const CHAPAS = {
  pista: ["var(--green-soft)", "var(--green-dark)"],
  nada: ["#efece3", SUAVE],
  poco: ["var(--mustard-soft)", "var(--mustard-dark)"],
  local: ["var(--berry-soft)", "var(--berry)"],
  premium: ["var(--mustard-soft)", "var(--mustard-dark)"],
};
export function Chapa({ tipo, children }) {
  const [bg, c] = CHAPAS[tipo] || CHAPAS.nada;
  return <span style={{ display: "inline-block", fontFamily: FUENTE_TEXTO, fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px", margin: "4px 4px 0 0", background: bg, color: c }}>{children}</span>;
}

// Una pista de logica/cuerpo-series.js en palabras: { corto, texto }. Siempre con «no dice que una cause la
// otra» cuando hay relación.
export function textoPista(p, idioma) {
  if (!p) return null;
  const u = t(idioma, p.periodo === "semana" ? "cuerpo.graf.semanas" : "cuerpo.graf.dias");
  if (p.tipo === "poco") return { tipo: "poco", corto: t(idioma, "cuerpo.pista.pocoCorto"), texto: t(idioma, "cuerpo.pista.poco", { n: p.n, min: p.min, u }) };
  if (p.tipo === "nada") return { tipo: "nada", corto: t(idioma, "cuerpo.pista.nadaCorto"), texto: t(idioma, "cuerpo.pista.nada", { n: p.n, u }) };
  return {
    tipo: "pista",
    corto: t(idioma, "cuerpo.pista." + p.fuerza),
    texto: t(idioma, p.sube ? "cuerpo.pista.sube" : "cuerpo.pista.baja", { n: p.n, u, matiz: t(idioma, "cuerpo.pista.matiz." + p.fuerza) }),
  };
}

export function Frase({ frase }) {
  if (!frase) return null;
  const bg = frase.tipo === "poco" ? "var(--mustard-soft)" : frase.tipo === "nada" ? "#efece3" : "var(--green-soft)";
  return (
    <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: TINTA, background: bg, borderRadius: 10, padding: "8px 10px", marginTop: 8, lineHeight: 1.45 }}>
      <b>{frase.corto}.</b> {frase.texto}
    </div>
  );
}

// Selector en píldora (rango, por día / por semana, vistas...): `opciones` = [[valor, texto]].
export function Selector({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} style={{ display: "flex", gap: 3, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 999, padding: 3, margin: "6px 0 8px" }}>
      {opciones.map(([v, texto]) => (
        <button key={String(v)} onClick={() => onCambiar(v)} aria-pressed={valor === v}
          style={{ flex: 1, border: "none", borderRadius: 999, fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, padding: "7px 4px", minHeight: 32,
            background: valor === v ? "var(--green-dark)" : "transparent", color: valor === v ? "#fff" : SUAVE }}>
          {texto}
        </button>
      ))}
    </div>
  );
}

// El selector único de rango del criterio: 1 mes · 3 meses · 1 año · Todo (devuelve el nº de semanas).
export function SelectorRango({ semanas, onCambiar, idioma }) {
  return (
    <Selector
      etiqueta={t(idioma, "cuerpo.graf.rango")}
      opciones={RANGOS.map((r) => [r.semanas, t(idioma, "cuerpo.rango." + r.clave)])}
      valor={semanas}
      onCambiar={onCambiar}
    />
  );
}

// ---------- La serie con los datos reales ----------
// Junta todo lo que hace falta para los informes y el constructor: todas las sesiones (se leen todos los
// meses al abrir, como la ficha de un ejercicio), los datos de la cuenta, el diario del cuerpo y, solo con
// perfil de mujer, el período **de este dispositivo** (nunca sale de aquí).
export function useSerieCuerpo({ data, entreno, cuerpo }) {
  const { listo, sesiones } = useTodasLasSesiones(entreno);
  const perfil = (data && data.perfil) || {};
  const esMujer = perfil.sexo === "mujer";
  const periodo = useMemo(() => (esMujer ? leerPeriodoLocal() : null), [esMujer]);
  const diario = cuerpo && cuerpo.diario;
  const serie = useMemo(() => construirSerie({
    data, sesiones, ejercicioDe: entreno.ejercicioDe, pesoCorporal: entreno.pesoCorporal, indice: entreno.indice,
    diario, periodo, hoy: new Date(), inicioSemana: (entreno.ajustes && entreno.ajustes.inicioSemana) ?? 1,
  }), [data, sesiones.length, entreno.indice, diario, periodo, listo]);
  const objetivos = useMemo(() => calcularObjetivosPerfil(perfil), [data && data.perfil]);
  return { listo, serie, objetivos, esMujer, conCiclo: esMujer && !!(periodo && periodo.regla && periodo.regla.length) };
}

// ---------- Nombres de las variables ----------
// Corto («Sueño»), con artículo para las frases («el sueño») y la unidad, en el idioma de la pantalla. Las
// que llevan parámetro (1RM de un ejercicio, series de un músculo) se escriben con su nombre.
const nombreEj = (id, idioma, entreno) => nombreEjercicio((entreno && entreno.ejercicioDe(id)) || id, idioma);
export function nombreVariable(id, idioma, entreno) {
  if (!id) return "";
  if (id.startsWith("rm:")) return t(idioma, "cuerpo.var.rmDe", { ejercicio: nombreEj(id.slice(3), idioma, entreno) });
  if (id.startsWith("series:")) return t(idioma, "cuerpo.var.seriesDe", { musculo: t(idioma, "musculo." + id.slice(7)) });
  return t(idioma, "cuerpo.var." + id);
}
export function conArticulo(id, idioma, entreno) {
  if (!id) return "";
  if (id.startsWith("rm:")) return t(idioma, "cuerpo.var.rmDe.art", { ejercicio: nombreEj(id.slice(3), idioma, entreno) });
  if (id.startsWith("series:")) return t(idioma, "cuerpo.var.seriesDe.art", { musculo: t(idioma, "musculo." + id.slice(7)).toLowerCase() });
  return t(idioma, "cuerpo.var." + id + ".art");
}
export function unidadTexto(u, idioma) {
  if (u === "pasos" || u === "series") return t(idioma, "cuerpo.unidad." + u);
  return u || "";
}
export const etiquetaCategoria = (idCat, cat, idioma) => t(idioma, `cuerpo.cat.${idCat}.${cat}`);

// valores() de logica/cuerpo-series.js → lo que pintan las gráficas.
export function aDatos(vals, periodo, idioma) {
  return vals.map((q) => ({
    fecha: q.fecha,
    etiqueta: periodo === "ciclo" ? q.fecha : etiquetaFecha(q.fecha, idioma, periodo),
    larga: periodo === "ciclo" ? t(idioma, "cuerpo.graf.diaCiclo", { n: q.fecha }) : etiquetaLarga(q.fecha, idioma, periodo),
    valor: q.valor,
  }));
}
export function filaDe(serie, id, periodo, semanas, idioma, entreno) {
  const v = variable(id);
  const p = v.soloSemana ? "semana" : periodo;
  return { nombre: nombreVariable(id, idioma, entreno), unidad: unidadTexto(v.unidad, idioma), dec: v.dec, datos: aDatos(valores(serie, id, p, semanas), p, idioma) };
}
export function referenciaDe(id, objetivos) {
  const v = variable(id);
  return v && v.ref && objetivos && objetivos[v.ref] ? objetivos[v.ref] : null;
}

// Las fases del ciclo de fondo (días de regla en ciruela; la fase lútea, más claro).
const bandaFase = (serie) => {
  const porFecha = Object.fromEntries(serie.dias.map((d) => [d.fecha, d.fase]));
  return (q) => (porFecha[q.fecha] === "regla" ? "rgba(138,59,94,0.16)" : porFecha[q.fecha] === "lutea" ? "rgba(138,59,94,0.06)" : null);
};

// ---------- Lo que dibuja un informe ----------
// `grafica` es lo que devuelve cada informe de logica/informes.js (o el constructor): { tipo, ... }.
export function GraficaMontada({ grafica, serie, idioma, entreno, onLeer }) {
  const g = grafica;
  if (g.tipo === "pares") {
    const v = variable(g.variable);
    const colores = g.ciclo ? ["var(--berry)", "#c98aa6", "#c98aa6", "var(--berry)"] : g.colores || ["#9fc8ad", "var(--green)"];
    const idCat = g.cat || (g.ciclo ? "fase" : "entreno");
    return (
      <Pares
        grupos={g.grupos.map((x) => ({ ...x, etiqueta: etiquetaCategoria(idCat, x.cat, idioma) }))}
        unidad={unidadTexto(v.unidad, idioma)} dec={v.dec} colores={colores}
        referencia={g.ref || null} refTxt={g.ref ? t(idioma, "cuerpo.graf.objetivo", { v: num(g.ref, idioma) }) : ""}
        onLeer={onLeer} idioma={idioma}
      />
    );
  }
  if (g.tipo === "dispersion") {
    const vx = variable(g.x) || { unidad: g.x === "hidrAntes" ? "g" : "", dec: 0 };
    const vy = variable(g.y) || { unidad: g.y === "desvPeso" ? "kg" : "", dec: 2 };
    const nx = g.x === "hidrAntes" ? t(idioma, "cuerpo.var.hidrAntes") : nombreVariable(g.x, idioma, entreno);
    const ny = g.y === "desvPeso" ? t(idioma, "cuerpo.var.desvPeso") : nombreVariable(g.y, idioma, entreno);
    const ux = unidadTexto(vx.unidad, idioma), uy = unidadTexto(vy.unidad, idioma);
    if (g.p.length < 3) return <Pie>{t(idioma, "cuerpo.graf.casiNada")}</Pie>;
    return (
      <Dispersion
        p={g.p.map((q) => (g.color ? [q[0], q[1], etiquetaLarga(q[2], idioma, g.periodo), q[3]] : [q[0], q[1], etiquetaLarga(q[2], idioma, g.periodo)]))}
        ejeX={`${nx.toLowerCase()}${ux ? ` (${ux})` : ""}`} ejeY={ny.toLowerCase()}
        decX={vx.dec} decY={vy.dec} uX={ux} uY={uy} onLeer={onLeer} idioma={idioma}
        colorDe={g.color ? (q) => q[3] : null} colorTxt={g.color ? nombreVariable(g.color, idioma, entreno) : ""}
      />
    );
  }
  if (g.tipo === "linea") {
    const refTxt = g.refTxt || (g.ref === 0 ? t(idioma, "cuerpo.graf.tuTendencia") : g.ref === 1 ? t(idioma, "cuerpo.graf.tuPeso") : g.ref ? t(idioma, "cuerpo.graf.objetivo", { v: num(g.ref, idioma) }) : "");
    return (
      <Linea datos={aDatos(g.datos, g.periodo, idioma)} barras={!!g.barras} unidad={g.unidad || ""} dec={g.dec || 0} color={g.color || "var(--green)"}
        referencia={g.ref ?? null} refTxt={refTxt} onLeer={onLeer} idioma={idioma} />
    );
  }
  if (g.tipo === "lineas2") {
    return (
      <>
        {g.filas.map((f, i) => {
          const v = f.variable ? variable(f.variable) : null;
          if (!v) return <Pie key={i}>{t(idioma, "cuerpo.graf.casiNada")}</Pie>;
          return (
            <div key={i}>
              <TituloGrafica>{t(idioma, "cuerpo.graf.porSemana", { nombre: nombreVariable(f.variable, idioma, entreno) })}</TituloGrafica>
              <Linea datos={aDatos(f.datos, g.periodo, idioma)} barras={!!f.barras} unidad={unidadTexto(v.unidad, idioma)} dec={v.dec} alto={110}
                referencia={f.ref ?? null} refTxt={f.ref ? t(idioma, "cuerpo.graf.objetivo", { v: num(f.ref, idioma) }) : ""} onLeer={onLeer} idioma={idioma} />
            </div>
          );
        })}
      </>
    );
  }
  if (g.tipo === "apiladas" || g.tipo === "juntas" || g.tipo === "tiras") {
    const filas = g.ids.map((id) => filaDe(serie, id, g.periodo, g.semanas, idioma, entreno));
    if (g.tipo === "juntas") return <Normalizadas filas={filas} onLeer={onLeer} idioma={idioma} />;
    if (g.tipo === "tiras") return <Tiras filas={filas} onLeer={onLeer} idioma={idioma} />;
    return (
      <>
        <Apiladas filas={filas} onLeer={onLeer} idioma={idioma} bandas={g.bandasFase ? bandaFase(serie) : null} />
        {g.bandasFase && <Pie>{t(idioma, "cuerpo.graf.pieFases")}</Pie>}
        <Pie>{t(idioma, g.periodo === "dia" ? "cuerpo.graf.pieApiladasDia" : "cuerpo.graf.pieApiladasSemana")}</Pie>
      </>
    );
  }
  if (g.tipo === "tabla") {
    const [ix, iy, iz] = g.ids;
    const tabla = g.tabla || tablaXYZ(serie, g.ids, g.periodo || "semana", g.semanas);
    return (
      <TablaXYZ tabla={tabla} nombres={g.ids.map((id) => nombreVariable(id, idioma, entreno))} unidadZ={unidadTexto(variable(iz).unidad, idioma)}
        decZ={Math.max(1, variable(iz).dec)} decX={variable(ix).dec} decY={variable(iy).dec} onLeer={onLeer} idioma={idioma} />
    );
  }
  return null;
}
