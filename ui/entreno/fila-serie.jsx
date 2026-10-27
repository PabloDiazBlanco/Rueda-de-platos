// ---------- ui/entreno/fila-serie.jsx ----------
// Una fila de la tabla del entreno en curso: SERIE · ANTERIOR · KG · REPS · (RIR) · ✓ (las columnas de
// en medio dependen del tipo de ejercicio, ver camposDeTipo). Es la pieza que más se toca de la app, así
// que todo va a favor de «dos toques por serie» (diseño, §4.2):
// - Teclado numérico (inputmode) y el campo se selecciona entero al tocarlo; se admite la coma decimal.
// - Tocar «anterior» copia sus valores a la fila.
// - ✓ marca la serie (y arranca el descanso); otro toque la reabre sin perder los valores.
// - Tocar el número de serie abre la hoja para cambiar su tipo (calentamiento, fallo, drop) o quitarla.
// Va memorizada (React.memo): el cronómetro y el descanso se repintan cada segundo, pero las filas solo
// cuando cambia su serie.
import React, { useState, useEffect, memo } from "react";
import { Check, Trash2, HelpCircle, Columns2 } from "lucide-react";
import { t } from "i18n";
import { LETRA_SERIE, TIPOS_SERIE } from "entreno-ejercicios";
import { repsDeLado, repsLadoDebil, seriePorLados } from "entreno-calculo";
import { FUENTE_MONO } from "../estilos.js";
import {
  formatoNumero, pesoAPantalla, pesoDePantalla, distanciaAPantalla, distanciaDePantalla, HojaInferior, OpcionHoja,
  prefiereMenosMovimiento,
} from "./comun.jsx";

// Colores de cada tipo de serie: los del tema (Shell), sin azul (diseño, §7.1).
export const COLOR_SERIE = { normal: "var(--ink)", calentamiento: "var(--mustard-dark)", fallo: "var(--rust)", drop: "var(--berry)" };
const FONDO_SERIE = { calentamiento: "var(--mustard-soft)" };

// En los ejercicios de solo duración el tiempo se teclea en segundos (una plancha de 45 s); en los de
// distancia y tiempo, en minutos (20 min de cinta). Se guarda siempre en segundos.
export const unidadTiempo = (tipo) => (tipo === "duracion" ? "seg" : "min");

// Cabeceras de las columnas de un tipo de ejercicio. Con dos mancuernas, «kg ×2» (se escribe el peso de una,
// 27-oct-2026); con series unilaterales, la de repeticiones dice qué lado es cada casilla.
export function columnasDe(campos, tipo, ajustes, { pareja = false, lados = null } = {}) {
  return campos.map((c) => {
    if (c === "kg") return tipo === "lastre_reps" ? `+${ajustes.unidadPeso}` : tipo === "asistido_reps" ? `−${ajustes.unidadPeso}` : pareja ? `${ajustes.unidadPeso} ×2` : ajustes.unidadPeso;
    if (c === "km") return ajustes.unidadDistancia;
    if (c === "seg") return unidadTiempo(tipo);
    return lados || "reps";
  });
}

// Valor guardado → texto del campo, en la unidad de pantalla.
function aTexto(campo, valor, tipo, ajustes, idioma) {
  if (valor === null || valor === undefined || valor === "") return "";
  let v = valor;
  if (campo === "kg") v = pesoAPantalla(valor, ajustes.unidadPeso);
  else if (campo === "km") v = distanciaAPantalla(valor, ajustes.unidadDistancia);
  else if (campo === "seg") v = unidadTiempo(tipo) === "min" ? Math.round((valor / 60) * 100) / 100 : valor;
  return formatoNumero(v, idioma, 2).replace(/\s/g, "");
}

// Texto tecleado → valor para guardar (kg, km, segundos), o null si está vacío. Acepta coma o punto y
// quita separadores de miles que el usuario no habrá escrito a propósito.
export function deTexto(campo, texto, tipo, ajustes) {
  const limpio = String(texto).trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "" || limpio === ".") return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (campo === "kg") return pesoDePantalla(n, ajustes.unidadPeso);
  if (campo === "km") return distanciaDePantalla(n, ajustes.unidadDistancia);
  if (campo === "seg") return unidadTiempo(tipo) === "min" ? Math.round(n * 60) : Math.round(n);
  if (campo === "reps" || campo === "rir") return Math.round(n);
  return n;
}

// «61,3 × 10», «+10 × 5», «45 s», «3 km · 20 min»: lo de la vez anterior, en una línea corta.
export function textoAnterior(a, tipo, ajustes, idioma) {
  if (!a) return "—";
  const kg = a.kg !== null && a.kg !== undefined ? formatoNumero(pesoAPantalla(a.kg, ajustes.unidadPeso), idioma) : null;
  // Unilateral: «20 × 10/8» (izquierda/derecha).
  const reps = a.lados && (a.repsIzq != null || a.repsDer != null) ? `${a.repsIzq ?? a.reps ?? "—"}/${a.repsDer ?? a.reps ?? "—"}`
    : a.reps !== null && a.reps !== undefined ? a.reps : null;
  if (tipo === "peso_reps") return kg !== null && reps !== null ? `${kg} × ${reps}` : kg ?? (reps !== null ? `× ${reps}` : "—");
  if (tipo === "reps") return reps !== null ? `× ${reps}` : "—";
  if (tipo === "lastre_reps") return `+${kg ?? 0} × ${reps ?? "—"}`;
  if (tipo === "asistido_reps") return `−${kg ?? 0} × ${reps ?? "—"}`;
  if (tipo === "duracion") return a.seg ? `${a.seg} s` : "—";
  const partes = [];
  if (a.km) partes.push(`${formatoNumero(distanciaAPantalla(a.km, ajustes.unidadDistancia), idioma, 2)} ${ajustes.unidadDistancia}`);
  if (a.seg) partes.push(`${formatoNumero(a.seg / 60, idioma)} min`);
  return partes.join(" · ") || "—";
}

// Campo numérico de la tabla. Guarda su propio texto mientras se escribe (para que «61,» no se convierta
// en «61» a mitad de teclear) y manda el valor ya convertido en cada cambio, así nada se pierde si la app
// se cierra a media serie.
function CampoNumero({ id, valor, campo, tipo, ajustes, idioma, onCambio, etiqueta, hecha, marcador }) {
  const [texto, setTexto] = useState(() => aTexto(campo, valor, tipo, ajustes, idioma));
  useEffect(() => {
    // Si el valor cambia desde fuera (copiar «anterior», precarga, otra unidad), se actualiza el texto,
    // salvo que lo tecleado ya signifique lo mismo.
    if (deTexto(campo, texto, tipo, ajustes) !== (valor ?? null)) setTexto(aTexto(campo, valor, tipo, ajustes, idioma));
  }, [valor, ajustes.unidadPeso, ajustes.unidadDistancia]);
  return (
    <input
      id={id}
      value={texto}
      inputMode={campo === "reps" || campo === "rir" || (campo === "seg" && tipo === "duracion") ? "numeric" : "decimal"}
      enterKeyHint="next"
      aria-label={etiqueta}
      placeholder={marcador}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setTexto(e.target.value);
        const v = deTexto(campo, e.target.value, tipo, ajustes);
        if (v !== undefined) onCambio(v);
      }}
      style={{
        width: "100%", minWidth: 0, height: 40, boxSizing: "border-box", textAlign: "center", borderRadius: 7,
        border: `1px solid ${hecha ? "transparent" : "var(--line)"}`, background: hecha ? "transparent" : "#fff",
        fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 16, color: "var(--ink)", padding: "0 4px",
      }}
    />
  );
}

// Repeticiones de una serie unilateral (27-oct-2026): dos casillas en la misma celda, izquierda y derecha, de
// tamaño normal (la columna se ensancha, ver plantillaColumnas). Cada cambio guarda los dos lados y, en
// `reps`, el más débil (ver «Mancuernas a pares y series unilaterales» en entreno-calculo.js).
function CampoLados({ id, serie, tipo, ajustes, idioma, hecha, etiqueta, onEditar }) {
  const izq = repsDeLado(serie, "izq");
  const der = repsDeLado(serie, "der");
  const guardar = (nuevoIzq, nuevoDer) => onEditar({ lados: true, repsIzq: nuevoIzq, repsDer: nuevoDer, reps: repsLadoDebil(nuevoIzq, nuevoDer) });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, minWidth: 0 }}>
      <CampoNumero id={id} valor={izq} campo="reps" tipo={tipo} ajustes={ajustes} idioma={idioma} hecha={hecha} marcador={t(idioma, "entreno.sesion.izq")}
        etiqueta={`${t(idioma, "entreno.sesion.ladoIzq")} · ${etiqueta}`} onCambio={(v) => guardar(v, der)} />
      <CampoNumero valor={der} campo="reps" tipo={tipo} ajustes={ajustes} idioma={idioma} hecha={hecha} marcador={t(idioma, "entreno.sesion.der")}
        etiqueta={`${t(idioma, "entreno.sesion.ladoDer")} · ${etiqueta}`} onCambio={(v) => guardar(izq, v)} />
    </div>
  );
}

function FilaSerieSinMemo({ serie, etiqueta, tipo, campos, anterior, ajustes, mostrarEsfuerzo, idioma, plantillaColumnas, onEditar, onMarcar, onDesmarcar, onAbrirTipo, aviso, unilateral = false, pareja = false }) {
  const hecha = serie.hecha;
  const color = COLOR_SERIE[serie.tipo] || COLOR_SERIE.normal;
  const nombresCampo = columnasDe(campos, tipo, ajustes, { pareja });
  const porLados = seriePorLados(serie, unilateral);
  return (
    <div style={{ borderRadius: 8, background: hecha ? "var(--green-soft)" : FONDO_SERIE[serie.tipo] || "transparent", transition: prefiereMenosMovimiento() ? "none" : "background 120ms" }}>
      <div style={{ display: "grid", gridTemplateColumns: plantillaColumnas, alignItems: "center", gap: 6, padding: "3px 4px", minHeight: 46 }}>
        <button
          onClick={onAbrirTipo}
          aria-label={t(idioma, "entreno.sesion.tipoSerieDe", { serie: etiqueta })}
          style={{ height: 40, border: "none", background: "none", cursor: "pointer", fontFamily: FUENTE_MONO, fontSize: 15, fontWeight: 700, color }}
        >
          {etiqueta}
        </button>
        <button
          onClick={() => anterior && onEditar({
            kg: anterior.kg ?? null, reps: anterior.reps ?? null, seg: anterior.seg ?? null, km: anterior.km ?? null,
            ...(anterior.lados !== undefined ? { lados: anterior.lados, repsIzq: anterior.repsIzq ?? null, repsDer: anterior.repsDer ?? null } : {}),
          })}
          disabled={!anterior}
          aria-label={anterior ? t(idioma, "entreno.sesion.copiarAnterior") : undefined}
          style={{
            height: 40, border: "none", background: "none", cursor: anterior ? "pointer" : "default", textAlign: "left", padding: "0 2px",
            fontFamily: FUENTE_MONO, fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {textoAnterior(anterior, tipo, ajustes, idioma)}
        </button>
        {campos.map((c, i) => (c === "reps" && porLados ? (
          <CampoLados key={c} id={i === 0 ? `campo-${serie.id}` : undefined} serie={serie} tipo={tipo} ajustes={ajustes} idioma={idioma} hecha={hecha} etiqueta={etiqueta} onEditar={onEditar} />
        ) : (
          <CampoNumero
            key={c}
            id={i === 0 ? `campo-${serie.id}` : undefined}
            valor={serie[c]}
            campo={c}
            tipo={tipo}
            ajustes={ajustes}
            idioma={idioma}
            hecha={hecha}
            etiqueta={`${nombresCampo[i]} · ${etiqueta}`}
            onCambio={(v) => onEditar({ [c]: v })}
          />
        )))}
        {mostrarEsfuerzo && (
          <CampoNumero valor={serie.rir} campo="rir" tipo={tipo} ajustes={ajustes} idioma={idioma} hecha={hecha} etiqueta={`RIR · ${etiqueta}`} onCambio={(v) => onEditar({ rir: v })} />
        )}
        <button
          onClick={hecha ? onDesmarcar : onMarcar}
          aria-label={t(idioma, hecha ? "entreno.sesion.desmarcar" : "entreno.sesion.marcar")}
          aria-pressed={hecha}
          style={{
            width: 40, height: 40, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            border: hecha ? "none" : "1.5px solid var(--line)", background: hecha ? "var(--green)" : "var(--card)", justifySelf: "end",
          }}
        >
          <Check size={20} color={hecha ? "#fff" : "var(--ink-soft)"} strokeWidth={2.4} />
        </button>
      </div>
      {aviso}
    </div>
  );
}

export const FilaSerie = memo(FilaSerieSinMemo);

// Hoja inferior para cambiar el tipo de una serie, con su explicación («?») y la opción de quitarla.
// Unilateral (27-oct-2026) no es un tipo más sino un interruptor aparte: una serie de calentamiento o una de
// fallo también pueden ir por lados. Su explicación (cuenta como una serie, el volumen suma los dos lados y el
// 1RM y los récords usan el más débil) se ve siempre, porque cambia cómo se cuenta.
export function HojaTipoSerie({ serie, idioma, onElegir, onQuitar, onCerrar, porLados = false, onLados }) {
  const [ayuda, setAyuda] = useState(false);
  return (
    <HojaInferior titulo={t(idioma, "entreno.sesion.tipoSerieTitulo")} onCerrar={onCerrar} idioma={idioma}>
      {TIPOS_SERIE.map((tipo) => (
        <OpcionHoja
          key={tipo}
          activa={serie.tipo === tipo}
          onClick={() => onElegir(tipo)}
          detalle={ayuda ? t(idioma, `tipoSerie.${tipo}.desc`) : null}
        >
          <span style={{ display: "inline-block", width: 26, fontFamily: FUENTE_MONO, fontWeight: 700, color: COLOR_SERIE[tipo] }}>{LETRA_SERIE[tipo] || "1"}</span>
          {t(idioma, `tipoSerie.${tipo}`)}
        </OpcionHoja>
      ))}
      {onLados && (
        <OpcionHoja icono={Columns2} activa={porLados} onClick={onLados} detalle={t(idioma, "entreno.sesion.porLadosAyuda")}>
          {t(idioma, "entreno.sesion.porLados")}
        </OpcionHoja>
      )}
      <OpcionHoja icono={HelpCircle} onClick={() => setAyuda(!ayuda)}>{t(idioma, "entreno.sesion.queEs")}</OpcionHoja>
      <OpcionHoja icono={Trash2} peligro onClick={onQuitar}>{t(idioma, "entreno.sesion.quitarSerie")}</OpcionHoja>
    </HojaInferior>
  );
}

// Etiqueta de cada serie: las normales se numeran (1, 2, 3...) sin contar los calentamientos; las demás
// llevan su letra (W, F, D), y las de fallo y drop también cuentan en la numeración aunque no la enseñen.
export function etiquetasSeries(series) {
  let n = 0;
  return series.map((s) => {
    if (s.tipo === "calentamiento") return LETRA_SERIE.calentamiento;
    n += 1;
    return LETRA_SERIE[s.tipo] || String(n);
  });
}

// Plantilla de columnas de la tabla según cuántos campos hay. Con alguna serie unilateral, la última columna
// de campos (la de repeticiones) es más ancha, para que sus dos casillas sean de tamaño normal.
export function plantillaColumnas(nCampos, conEsfuerzo, conLados = false) {
  const campos = Array(nCampos).fill("minmax(52px, 68px)");
  if (conLados && nCampos) campos[nCampos - 1] = "minmax(96px, 116px)";
  return ["34px", "minmax(0, 1fr)", ...campos, ...(conEsfuerzo ? ["44px"] : []), "40px"].join(" ");
}
