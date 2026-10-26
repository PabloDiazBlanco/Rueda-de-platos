// ---------- ui/cuerpo/sueno.jsx ----------
// «Sueño» (destino `cuerpo-sueno`, en el menú lateral del área Cuerpo, no en la barra; gratis; 26-oct-2026).
// Es la opción C de la maqueta local/ideas/esteticas/v3-06-sueno-pasos.html: un deslizador de 3 a 11 horas
// de cuarto en cuarto y cinco caras para la calidad (se guardan como 2, 4, 6, 8 y 10). Una entrada por
// noche, con la fecha del día en que uno se despierta: lo de «anoche» es la entrada de hoy, y sale ya puesto
// lo de la última vez, así que si fue igual se apunta de un toque. Tocar una barra de «Últimas 7 noches»
// corrige esa noche. Debajo, los últimos 30 días y el enlace al constructor (premium) para cruzarlo con
// lo demás. Sin hambre ni energía (descartados el 26-oct). Los datos, en el diario del cuerpo
// (logica/cuerpo-diario.js, ui/estado/cuerpo.js).
import React, { useState, useEffect } from "react";
import { Link2, ChevronRight, Trash2 } from "lucide-react";
import { t } from "i18n";
import { SUENO_MIN, SUENO_MAX, CALIDADES, calidadDeCara, caraDeCalidad, redondearCuarto, mediaSinHuecos } from "cuerpo-diario";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { TextoSuave, fechaDia, DIAS_CORTOS } from "../entreno/comun.jsx";
import { Linea, Lectura, num, aDatos } from "./graficas.jsx";

// Recomendación de consenso para adultos: 7 horas o más por noche (Academia Americana de Medicina del
// Sueño y Sociedad de Investigación del Sueño, Watson et al., 2015, J Clin Sleep Med 11:591). Es la raya
// mostaza de referencia de la gráfica; no se usa para nada más.
const SUENO_RECOMENDADO = 7;

// «7 h», «6 h 45».
export function horasTexto(h, idioma) {
  if (h === null || h === undefined) return "—";
  const e = Math.floor(h), m = Math.round((h - e) * 60);
  return m ? t(idioma, "cuerpo.sueno.horasMin", { h: e, m: String(m).padStart(2, "0") }) : t(idioma, "cuerpo.sueno.horas", { h: e });
}

// Las cinco caras, de «fatal» a «genial» (la boca de cada una).
const BOCAS = ["M8 17 Q12 13 16 17", "M8 16 Q12 14 16 16", "M8 15 L16 15", "M8 14 Q12 17 16 14", "M7.5 13.5 Q12 19 16.5 13.5"];
function Cara({ k, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true" style={{ display: "block", margin: "0 auto 2px" }}>
      <circle cx={12} cy={12} r={9} />
      <circle cx={9} cy={10} r={0.8} fill="currentColor" />
      <circle cx={15} cy={10} r={0.8} fill="currentColor" />
      <path d={BOCAS[k]} />
    </svg>
  );
}
// Tono de la calidad (de 1 a 10) para el punto de cada barra: más verde cuanto mejor.
const tonoCalidad = (c) => `hsl(${142 - (10 - c) * 9}, ${35 + c * 3}%, ${58 - c * 2.6}%)`;

function Tarjeta({ titulo, sub, children }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
      {titulo && <h3 style={{ margin: "0 0 4px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)" }}>{titulo}</h3>}
      {sub && <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", margin: "0 0 8px", lineHeight: 1.4 }}>{sub}</div>}
      {children}
    </section>
  );
}

export function SuenoView({ cuerpo, idioma, navegar }) {
  const hoy = cuerpo.hoy();
  const [fecha, setFecha] = useState(hoy); // la noche que se apunta (la del día en que uno se despierta)
  const deEsaNoche = (cuerpo.diario && cuerpo.diario.dias[fecha] && cuerpo.diario.dias[fecha].sueno) || null;
  const ultima = cuerpo.ultimoSueno(fecha);
  const base = deEsaNoche || ultima || { horas: 7, calidad: 6 };
  const [horas, setHoras] = useState(base.horas);
  const [cara, setCara] = useState(caraDeCalidad(base.calidad) ?? 2);
  const [aviso, setAviso] = useState(null);
  const [lectura, setLectura] = useState(null);

  // Al cambiar de noche (tocando una barra), se cargan sus valores (o los de la última vez).
  useEffect(() => {
    const b = deEsaNoche || cuerpo.ultimoSueno(fecha) || { horas: 7, calidad: 6 };
    setHoras(b.horas);
    setCara(caraDeCalidad(b.calidad) ?? 2);
  }, [fecha, !!cuerpo.diario]);
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(id);
  }, [aviso]);

  if (!cuerpo.diario) return <TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave>;

  const nocheTexto = fecha === hoy ? t(idioma, "cuerpo.sueno.anoche") : t(idioma, "cuerpo.sueno.nocheDel", { fecha: fechaDia(fecha + "T12:00:00", idioma) });
  function apuntar() {
    cuerpo.apuntarSueno(redondearCuarto(horas), calidadDeCara(cara), fecha);
    setAviso(t(idioma, "cuerpo.sueno.apuntado", { noche: nocheTexto.toLowerCase() }));
  }

  const ult7 = cuerpo.ultimosDias(7, hoy);
  const ult30 = cuerpo.ultimosDias(30, hoy);
  const media7 = mediaSinHuecos(ult7.map((d) => d.sueno && d.sueno.horas));
  const cal7 = mediaSinHuecos(ult7.map((d) => d.sueno && d.sueno.calidad));
  const dias = DIAS_CORTOS[idioma] || DIAS_CORTOS.es;
  const nombresCara = ["fatal", "mal", "normal", "bien", "genial"].map((k) => t(idioma, "cuerpo.sueno.cara." + k));

  return (
    <div style={{ maxWidth: 480 }}>
      <Tarjeta titulo={fecha === hoy ? t(idioma, "cuerpo.sueno.queTal") : nocheTexto}>
        {fecha !== hoy && (
          <button onClick={() => setFecha(hoy)} style={{ background: "none", border: "none", padding: 0, fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", marginBottom: 4, minHeight: 32 }}>
            {t(idioma, "cuerpo.sueno.volverAnoche")}
          </button>
        )}
        <div style={{ textAlign: "center", fontFamily: FUENTE_TITULOS, fontSize: 30, color: "var(--green-dark)", marginTop: 2 }} aria-live="polite">{horasTexto(horas, idioma)}</div>
        <input
          type="range" min={SUENO_MIN} max={SUENO_MAX} step={0.25} value={horas}
          onChange={(e) => setHoras(Number(e.target.value))}
          aria-label={t(idioma, "cuerpo.sueno.horasDormidas")} aria-valuetext={horasTexto(horas, idioma)}
          style={{ width: "100%", accentColor: "var(--green)", margin: "8px 0 2px", minHeight: 32 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: "var(--ink-soft)" }}>
          <span>{horasTexto(SUENO_MIN, idioma)}</span><span>{horasTexto(7, idioma)}</span><span>{horasTexto(SUENO_MAX, idioma)}</span>
        </div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", margin: "10px 0 4px" }}>{t(idioma, "cuerpo.sueno.calidad")}</div>
        <div role="radiogroup" aria-label={t(idioma, "cuerpo.sueno.calidad")} style={{ display: "flex", gap: 4 }}>
          {CALIDADES.map((_, k) => (
            <button key={k} role="radio" aria-checked={cara === k} onClick={() => setCara(k)}
              style={{ flex: 1, border: `1px solid ${cara === k ? "var(--green)" : "var(--line)"}`, background: cara === k ? "var(--green-soft)" : "var(--paper)", borderRadius: 10, padding: "6px 0 4px", minHeight: 48, fontFamily: FUENTE_TEXTO, fontSize: 10.5, color: cara === k ? "var(--green-dark)" : "var(--ink-soft)", fontWeight: cara === k ? 700 : 400 }}>
              <Cara k={k} />{nombresCara[k]}
            </button>
          ))}
        </div>
        <button onClick={apuntar}
          style={{ width: "100%", marginTop: 12, minHeight: 46, border: "none", borderRadius: 10, background: "var(--green)", color: "#fff", fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700 }}>
          {t(idioma, deEsaNoche ? "cuerpo.sueno.corregir" : "cuerpo.sueno.apuntar", { h: horasTexto(horas, idioma), cara: nombresCara[cara].toLowerCase() })}
        </button>
        <div aria-live="polite" style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--green-dark)", fontWeight: 700, textAlign: "center", marginTop: 8, minHeight: 18 }}>{aviso}</div>
        {deEsaNoche && (
          <button onClick={() => cuerpo.quitarSueno(fecha)} style={{ display: "flex", alignItems: "center", gap: 5, margin: "0 auto", background: "none", border: "none", fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", minHeight: 32 }}>
            <Trash2 size={13} /> {t(idioma, "cuerpo.sueno.borrar")}
          </button>
        )}
      </Tarjeta>

      <Tarjeta
        titulo={t(idioma, "cuerpo.sueno.ultimas7")}
        sub={media7 === null ? t(idioma, "cuerpo.sueno.sinNoches") : t(idioma, "cuerpo.sueno.media7", { h: horasTexto(Math.round(media7 * 4) / 4, idioma), c: num(cal7, idioma, 1) })}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, alignItems: "end", height: 112 }}>
          {ult7.map((d) => {
            const h = d.sueno ? d.sueno.horas : null;
            const dow = (new Date(d.fecha + "T12:00:00").getDay() + 6) % 7;
            const activa = d.fecha === fecha;
            return (
              <button key={d.fecha} onClick={() => setFecha(d.fecha)} aria-pressed={activa}
                aria-label={`${fechaDia(d.fecha + "T12:00:00", idioma)}: ${h === null ? t(idioma, "cuerpo.sueno.sinApuntar") : horasTexto(h, idioma)}. ${t(idioma, "cuerpo.sueno.tocaCorregir")}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 3, height: "100%", background: activa ? "var(--green-soft)" : "none", border: "none", borderRadius: 8, padding: "2px 0", fontFamily: FUENTE_TEXTO, fontSize: 10, color: "var(--ink-soft)" }}>
                <div style={{ width: "70%", maxWidth: 26, height: h ? (h / SUENO_MAX) * 70 : 4, borderRadius: "6px 6px 3px 3px", background: h ? "var(--green)" : "#e6e2d6", position: "relative" }}>
                  {d.sueno && d.sueno.calidad && <i style={{ position: "absolute", left: "50%", top: -9, width: 8, height: 8, marginLeft: -4, borderRadius: "50%", border: "1.5px solid #fffdf7", background: tonoCalidad(d.sueno.calidad) }} />}
                </div>
                <span>{dias[dow]}</span>
                <b style={{ fontSize: 10, color: "var(--ink)" }}>{h === null ? "—" : num(h, idioma, 2)}</b>
              </button>
            );
          })}
        </div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>{t(idioma, "cuerpo.sueno.leyenda7")}</div>
      </Tarjeta>

      <Tarjeta titulo={t(idioma, "cuerpo.sueno.ultimos30")}>
        {ult30.some((d) => d.sueno) ? (
          <>
            <Linea
              datos={aDatos(ult30.map((d) => ({ fecha: d.fecha, valor: d.sueno ? d.sueno.horas : null })), "dia", idioma)}
              unidad="h" dec={2} alto={110} referencia={SUENO_RECOMENDADO} refTxt={t(idioma, "cuerpo.sueno.recomendado")}
              onLeer={setLectura} idioma={idioma}
            />
            <Lectura texto={lectura} idioma={idioma} />
          </>
        ) : <TextoSuave>{t(idioma, "cuerpo.sueno.sinNoches")}</TextoSuave>}
      </Tarjeta>

      <button
        onClick={() => navegar("cuerpo-constructor", { spec: { pregunta: "suenoEsfuerzo", forma: "relacion", huecos: { v1: "sueno", v2: "esfuerzo" }, periodo: "dia", vista: "a", tiempo: false } })}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "var(--green-soft)", border: "none", borderRadius: 12, padding: "11px 12px", fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)", textAlign: "left", minHeight: 44 }}
      >
        <Link2 size={15} /> <span style={{ flex: 1 }}>{t(idioma, "cuerpo.sueno.cruzar")}</span> <ChevronRight size={15} />
      </button>
    </div>
  );
}
