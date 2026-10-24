// ---------- ui/cuerpo/informes.jsx ----------
// Informes cruzados (destino `cuerpo-informes`, pestaña «Informes» del área Cuerpo; premium). Juntan lo
// que ninguna pantalla por separado puede enseñar: el entreno junto al peso, la constancia en la comida
// según haya entreno ese día, lo registrado frente a lo declarado en el perfil (y su efecto en las
// calorías que asume el objetivo) y cómo cambia todo de un mes a otro. Cada tarjeta lleva una gráfica
// sencilla y una frase en lenguaje claro y prudente; los cálculos están en logica/informes.js.
// Son solo lectura: no tocan los objetivos (diseño, §8 y §9). Sin premium se ve el aviso de siempre, sin
// insistir.
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "i18n";
import { informeCruzadoMes } from "informes";
import { PremiumRequiredNotice } from "../premium/premium.jsx";
import { PesoLineChart } from "../peso/grafica.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { nombreMes, textoPeso, formatoNumero, TextoSuave } from "../entreno/comun.jsx";

function sumarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Tarjeta({ titulo, frase, children }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginBottom: 14, maxWidth: 480 }}>
      <h3 style={{ margin: "0 0 10px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)" }}>{titulo}</h3>
      {children}
      {frase && (
        <div style={{ marginTop: 12, background: "var(--green-soft)", borderRadius: 8, padding: "10px 12px", fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{frase}</div>
      )}
    </section>
  );
}

// Barras horizontales comparadas (dos o tres valores del mismo tipo, uno debajo de otro).
function Barras({ filas }) {
  const max = Math.max(1, ...filas.map((f) => f.valor || 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FUENTE_TEXTO, fontSize: 12.5, marginBottom: 3 }}>
            <span style={{ color: "var(--ink-soft)" }}>{f.etiqueta}</span>
            <b>{f.texto}</b>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "var(--green-soft)" }} role="img" aria-label={`${f.etiqueta}: ${f.texto}`}>
            <div style={{ width: `${((f.valor || 0) / max) * 100}%`, height: 10, borderRadius: 5, background: f.color || "var(--green)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const signo = (n) => (n > 0 ? "+" : "");

export function InformesView({ data, premium, entreno, idioma, onGoPremium }) {
  const hoy = new Date();
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(actual);
  const anterior = sumarMes(mes, -1);

  useEffect(() => {
    if (!premium.active) return;
    entreno.cargarMes(mes).catch(() => {});
    entreno.cargarMes(anterior).catch(() => {});
  }, [mes, premium.active]);

  if (!premium.active) {
    return (
      <div style={{ maxWidth: 480 }}>
        <PremiumRequiredNotice titulo={t(idioma, "cuerpo.informes.premiumTitulo")} texto={t(idioma, "cuerpo.informes.premiumTexto")} onGoPremium={onGoPremium} idioma={idioma} />
      </div>
    );
  }

  const r = informeCruzadoMes({
    data, sesionesMes: entreno.sesionesDeMes(mes), sesionesMesAnterior: entreno.sesionesDeMes(anterior),
    ejercicioDe: entreno.ejercicioDe, mesISO: mes, hoy,
  });
  const a = entreno.ajustes;
  const mesAnt = idioma === "en" ? nombreMes(anterior, idioma) : nombreMes(anterior, idioma).toLowerCase();
  const kg = (v) => `${formatoNumero(Math.abs(v), idioma)} kg`;
  const kgConSigno = (v) => `${signo(v)}${formatoNumero(v, idioma)} kg`;
  const flecha = { width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" };

  // 1. Entreno y peso: una frase que junte las dos cosas solo si hay datos de las dos.
  let fraseEP = null;
  if (r.peso && r.variacion.volumenPct !== null) {
    fraseEP = t(idioma, "cuerpo.informes.frasePesoVolumen", {
      peso: t(idioma, r.peso.delta < 0 ? "cuerpo.informes.pesoBajo" : r.peso.delta > 0 ? "cuerpo.informes.pesoSubio" : "cuerpo.informes.pesoIgual", { kg: kg(r.peso.delta) }),
      volumen: t(idioma, r.variacion.volumenPct >= 0 ? "cuerpo.informes.volumenSubio" : "cuerpo.informes.volumenBajo", { pct: Math.abs(r.variacion.volumenPct), mes: mesAnt }),
    });
  } else if (!r.peso) fraseEP = t(idioma, "cuerpo.informes.sinPeso");
  else fraseEP = t(idioma, "cuerpo.informes.sinComparar");

  // 2. Constancia según el día.
  const c = r.constancia;
  const fraseC = c.diasCon && c.diasSin
    ? t(idioma, "cuerpo.informes.fraseConstancia", { con: c.conEntreno, sin: c.sinEntreno })
    : t(idioma, "cuerpo.informes.sinConstancia");

  // 3. Declarado frente a real.
  const dcl = r.declarado;
  const fraseD = dcl.declaradasSemana
    ? t(idioma, "cuerpo.informes.fraseDeclarado", {
        declaradas: formatoNumero(dcl.declaradasSemana, idioma), registradas: formatoNumero(dcl.registradasSemana, idioma),
        kcalDeclaradas: dcl.kcalDeclaradas ?? "—", kcalEstimadas: dcl.kcalEstimadas ?? "—",
      })
    : t(idioma, "cuerpo.informes.sinDeclarado");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, marginBottom: 6 }}>
        <button onClick={() => setMes(anterior)} aria-label={t(idioma, "entreno.historial.mesAnterior")} style={flecha}><ChevronLeft size={20} /></button>
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{nombreMes(mes, idioma)}</h2>
        <button onClick={() => setMes(sumarMes(mes, 1))} disabled={mes >= actual} aria-label={t(idioma, "entreno.historial.mesSiguiente")} style={{ ...flecha, opacity: mes >= actual ? 0.3 : 1, cursor: mes >= actual ? "default" : "pointer" }}><ChevronRight size={20} /></button>
      </div>
      <TextoSuave style={{ maxWidth: 480, marginBottom: 14 }}>{t(idioma, "cuerpo.informes.intro")}</TextoSuave>

      <Tarjeta titulo={t(idioma, "cuerpo.informes.entrenoPeso")} frase={fraseEP}>
        <Barras filas={[
          { etiqueta: nombreMes(anterior, idioma), valor: r.anterior.volumen, texto: textoPeso(r.anterior.volumen, a, idioma), color: "var(--olive)" },
          { etiqueta: nombreMes(mes, idioma), valor: r.volumen, texto: textoPeso(r.volumen, a, idioma) },
        ]} />
        <TextoSuave style={{ fontSize: 12, marginTop: 6 }}>{t(idioma, "cuerpo.informes.volumenYSesiones", { n: r.sesiones, h: formatoNumero(r.horas, idioma) })}</TextoSuave>
        {r.peso && (
          <div style={{ marginTop: 10 }}>
            <PesoLineChart entradas={r.peso.entradas} tendencia={null} idioma={idioma} />
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo={t(idioma, "cuerpo.informes.constancia")} frase={fraseC}>
        <Barras filas={[
          { etiqueta: t(idioma, "cuerpo.informes.diasConEntreno", { n: c.diasCon }), valor: c.conEntreno || 0, texto: c.conEntreno === null ? "—" : `${c.conEntreno} %` },
          { etiqueta: t(idioma, "cuerpo.informes.diasSinEntreno", { n: c.diasSin }), valor: c.sinEntreno || 0, texto: c.sinEntreno === null ? "—" : `${c.sinEntreno} %`, color: "var(--olive)" },
        ]} />
      </Tarjeta>

      <Tarjeta titulo={t(idioma, "cuerpo.informes.declarado")} frase={fraseD}>
        <Barras filas={[
          { etiqueta: t(idioma, "cuerpo.informes.declaradasSemana"), valor: dcl.declaradasSemana, texto: formatoNumero(dcl.declaradasSemana, idioma), color: "var(--olive)" },
          { etiqueta: t(idioma, "cuerpo.informes.registradasSemana"), valor: dcl.registradasSemana, texto: formatoNumero(dcl.registradasSemana, idioma) },
        ]} />
      </Tarjeta>

      <Tarjeta titulo={t(idioma, "cuerpo.informes.mesFrenteAMes")}>
        {[
          [t(idioma, "cuerpo.resumen.entrenos"), r.anterior.sesiones, r.sesiones, `${signo(r.variacion.sesiones)}${r.variacion.sesiones}`],
          [t(idioma, "entreno.sesion.volumen"), textoPeso(r.anterior.volumen, a, idioma), textoPeso(r.volumen, a, idioma), r.variacion.volumenPct === null ? "—" : `${signo(r.variacion.volumenPct)}${r.variacion.volumenPct} %`],
          [t(idioma, "cuerpo.informes.cambioPeso"), r.anterior.peso ? kgConSigno(r.anterior.peso.delta) : "—", r.peso ? kgConSigno(r.peso.delta) : "—", ""],
          [t(idioma, "cuerpo.informes.comidasDiasEntreno"), r.anterior.constancia.conEntreno === null ? "—" : `${r.anterior.constancia.conEntreno} %`, c.conEntreno === null ? "—" : `${c.conEntreno} %`, ""],
        ].map(([etiqueta, antes, ahora, cambio]) => (
          <div key={etiqueta} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 0.7fr", gap: 6, padding: "7px 0", borderTop: "1px solid var(--line)", fontFamily: FUENTE_TEXTO, fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-soft)" }}>{etiqueta}</span>
            <span>{antes}</span>
            <b>{ahora}</b>
            <span style={{ color: "var(--green-dark)", textAlign: "right" }}>{cambio}</span>
          </div>
        ))}
        <TextoSuave style={{ fontSize: 11.5, marginTop: 6 }}>{t(idioma, "cuerpo.informes.columnas", { antes: nombreMes(anterior, idioma), ahora: nombreMes(mes, idioma) })}</TextoSuave>
      </Tarjeta>

      <TextoSuave style={{ fontSize: 11.5, maxWidth: 480 }}>{t(idioma, "cuerpo.informes.aviso")}</TextoSuave>
    </div>
  );
}
