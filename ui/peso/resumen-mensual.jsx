// ---------- ui/peso/resumen-mensual.jsx ----------
// Resúmenes (área Cuerpo, pestaña «Resúmenes»): un mes cualquiera (selector anterior / siguiente) con un
// selector Nutrición / Entreno arriba (B2, 25-oct-2026), cada lado con lo suyo:
// - Nutrición: comidas hechas del mes, el **cumplimiento de macros** (en cuántos días con todas las comidas
//   marcadas se llegó al objetivo de proteína, carbohidratos y grasa: cumplimientoMacrosMes) y el peso
//   (premium).
// - Entreno: entrenos, días, volumen, tiempo, récords, comparación con el mes anterior y el desglose de
//   series por músculo.
// Los informes cruzados (premium) siguen en su pestaña, aparte.
//
// Criterio de gráficas (26-oct-2026; local/ideas/esteticas/09-graficas.html): verde = lo tuyo, mostaza = la
// referencia, la grasa en oliva (ya no en mostaza); el botón verde «Gráfica» abre en una hoja la gráfica
// entera, donde tocar escribe el valor en una línea fija; y el reparto por músculo es el mapa corporal.
//
// Desde octubre de 2026 es gratis (decisión del 23-oct, local/ideas/gimnasio/03-diseno-modulo-entreno.md,
// §9): los resúmenes por separado son información del propio usuario que se calcula en el móvil, sin coste
// de servidor. Solo el apartado de Peso sigue necesitando premium, porque sus datos salen del seguimiento
// de peso, que lo es. Lo que de verdad aporta valor extra — juntar entreno, comida y peso para
// interpretarlos — son los informes cruzados (ui/cuerpo/informes.jsx), y esos son premium.
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt } from "macros";
import { OBJETIVO_ETAPAS, calcularObjetivosPerfil } from "objetivos";
import { calcularTendenciaPeso } from "peso";
import { calcularResumenMensual, pesoEnMes, cumplimientoMacrosMes } from "resumen-mensual";
import { resumenEntrenoMes, seriesPorMusculo } from "entreno-calculo";
import { t } from "i18n";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { PesoLineChart } from "./grafica.jsx";
import { PremiumRequiredNotice } from "../premium/premium.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { nombreMes, textoPeso, duracionTexto, formatoNumero, HojaInferior } from "../entreno/comun.jsx";
import { BotonGrafica, Linea, Lectura, aDatos } from "../cuerpo/graficas.jsx";
import { MapaCorporal } from "../comun/mapa-corporal.jsx";

function sumarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// `onGrafica`: si se pasa, el botón verde «Gráfica» junto al título (criterio de gráficas).
function Apartado({ titulo, children, onGrafica, idioma }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginBottom: 14, maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
        <h3 style={{ flex: 1, margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)" }}>{titulo}</h3>
        {onGrafica && <BotonGrafica onClick={onGrafica} idioma={idioma} />}
      </div>
      {children}
    </section>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>{etiqueta}</span>
      <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{valor}</span>
    </div>
  );
}

// El lado elegido del selector se recuerda en el dispositivo (comodidad, como la vista de la despensa).
const CLAVE_LADO = "fooddraft:resumen-lado";
function leerLado() {
  try { return localStorage.getItem(CLAVE_LADO) === "entreno" ? "entreno" : "nutricion"; } catch (e) { return "nutricion"; }
}

// Barra de un macro: el porcentaje de días en que se llegó al objetivo.
function BarraCumplimiento({ etiqueta, dato, color, idioma }) {
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FUENTE_TEXTO, fontSize: 13 }}>
        <span>{etiqueta}</span>
        <b>{t(idioma, "cuerpo.resumen.diasLlega", { pct: dato.pct, n: dato.llega })}</b>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--paper)", marginTop: 4, overflow: "hidden" }}>
        <div style={{ height: 8, width: `${dato.pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// La gráfica entera de un apartado, en una hoja inferior, con la lectura al tocar.
function HojaGrafica({ titulo, datos, unidad, dec, barras, idioma, onCerrar, minimo = null, maximo = null }) {
  const [lectura, setLectura] = useState(null);
  return (
    <HojaInferior titulo={titulo} onCerrar={onCerrar} idioma={idioma}>
      <Linea datos={datos} unidad={unidad} dec={dec} barras={barras} onLeer={setLectura} idioma={idioma} alto={150} minimo={minimo} maximo={maximo} />
      <Lectura texto={lectura} idioma={idioma} />
    </HojaInferior>
  );
}

const dos = (n) => String(n).padStart(2, "0");

export function ResumenMensualView({ data, premium, onGoPremium, idioma, entreno }) {
  const [hoja, setHoja] = useState(null); // "comidas" | "peso"
  const hoy = new Date();
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(actual);
  const [lado, setLadoEstado] = useState(leerLado);
  function setLado(l) {
    setLadoEstado(l);
    try { localStorage.setItem(CLAVE_LADO, l); } catch (e) { /* sin localStorage, solo mientras está abierta */ }
  }
  const anterior = sumarMes(mes, -1);

  // Los entrenos se guardan por meses y se leen bajo demanda: este mes y el anterior (para comparar).
  useEffect(() => {
    if (!entreno) return;
    entreno.cargarMes(mes).catch(() => {});
    entreno.cargarMes(anterior).catch(() => {});
  }, [mes]);

  const resumen = calcularResumenMensual(data, mes, hoy);
  const objetivosCalculados = calcularObjetivosPerfil(data.perfil);
  const etapa = objetivosCalculados ? OBJETIVO_ETAPAS[objetivosCalculados.objetivo] : null;
  const pesoDelMes = pesoEnMes(data.pesoTracking, mes);
  const tendenciaDelMes = pesoDelMes ? calcularTendenciaPeso(pesoDelMes.entradas) : null;

  const cumplimiento = cumplimientoMacrosMes(data.comidasCompletadas, mes, objetivosCalculados, Object.keys((data.perfil && data.perfil.repartoComidas) || {}));
  const ent = entreno ? resumenEntrenoMes(entreno.sesionesDeMes(mes), entreno.ejercicioDe, entreno.pesoCorporal, { indice: entreno.indice, mes }) : null;
  const porMusculo = entreno ? Object.entries(seriesPorMusculo(entreno.sesionesDeMes(mes), entreno.ejercicioDe, null, null)).sort((a, b) => b[1] - a[1]) : [];
  const pestana = (clave, texto) => (
    <button
      key={clave}
      onClick={() => setLado(clave)}
      aria-pressed={lado === clave}
      style={{
        flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, padding: "9px 12px", borderRadius: 20, cursor: "pointer",
        border: "1px solid var(--line)", background: lado === clave ? "var(--green-dark)" : "var(--card)", color: lado === clave ? "#fff" : "var(--ink)",
      }}
    >
      {texto}
    </button>
  );
  const entAnt = entreno ? resumenEntrenoMes(entreno.sesionesDeMes(anterior), entreno.ejercicioDe, entreno.pesoCorporal) : null;
  const flecha = { width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, marginBottom: 6 }}>
        <button onClick={() => setMes(anterior)} aria-label={t(idioma, "entreno.historial.mesAnterior")} style={flecha}><ChevronLeft size={20} /></button>
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{nombreMes(mes, idioma)}</h2>
        <button onClick={() => setMes(sumarMes(mes, 1))} disabled={mes >= actual} aria-label={t(idioma, "entreno.historial.mesSiguiente")} style={{ ...flecha, opacity: mes >= actual ? 0.3 : 1, cursor: mes >= actual ? "default" : "pointer" }}><ChevronRight size={20} /></button>
      </div>

      <div role="group" style={{ display: "flex", gap: 8, maxWidth: 480, marginBottom: 14 }}>
        {pestana("nutricion", t(idioma, "cuerpo.resumen.nutricion"))}
        {pestana("entreno", t(idioma, "cuerpo.resumen.entreno"))}
      </div>

      {lado === "nutricion" && (<>
      <Apartado titulo={t(idioma, "cuerpo.resumen.nutricion")} onGrafica={() => setHoja("comidas")} idioma={idioma}>
        <SectionIntro text={t(idioma, "resumenMensual.intro")} />
        <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 40, color: "var(--green-dark)", lineHeight: 1 }}>{resumen.porcentaje}%</div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 10px" }}>
          {t(idioma, "resumenMensual.completadas", { completadas: resumen.completadas, esperadas: resumen.esperadas })}
        </div>
        {etapa && (
          <Fila
            etiqueta={t(idioma, "resumenMensual.objetivoActual")}
            valor={<>{t(idioma, "objetivoEtapa." + objetivosCalculados.objetivo)}<br />{t(idioma, "resumenMensual.kcalDia", { n: objetivosCalculados.kcal })}</>}
          />
        )}
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>{t(idioma, "resumenMensual.basadoEn", { n: resumen.comidasPorDia })}</div>
      </Apartado>

      <Apartado titulo={t(idioma, "cuerpo.resumen.macrosTitulo")}>
        {!objetivosCalculados ? (
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "cuerpo.resumen.sinObjetivos")}</div>
        ) : cumplimiento.dias ? (
          <>
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6, lineHeight: 1.45 }}>
              {t(idioma, cumplimiento.dias === 1 ? "cuerpo.resumen.macrosIntroUno" : "cuerpo.resumen.macrosIntro", { n: cumplimiento.dias })}
            </div>
            <BarraCumplimiento etiqueta={t(idioma, "objetivosModal.proteina")} dato={cumplimiento.prot} color="var(--green)" idioma={idioma} />
            <BarraCumplimiento etiqueta={t(idioma, "objetivosModal.carbos")} dato={cumplimiento.carb} color="var(--coffee)" idioma={idioma} />
            <BarraCumplimiento etiqueta={t(idioma, "objetivosModal.grasa")} dato={cumplimiento.fat} color="var(--olive)" idioma={idioma} />
          </>
        ) : (
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{t(idioma, "cuerpo.resumen.macrosSinDias")}</div>
        )}
        {objetivosCalculados && (cumplimiento.sinDetalle > 0 || cumplimiento.incompletos > 0) && (
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.45 }}>
            {t(idioma, "cuerpo.resumen.macrosNoCuentan", { incompletos: cumplimiento.incompletos, sinDetalle: cumplimiento.sinDetalle })}
          </div>
        )}
      </Apartado>
      </>)}

      {lado === "entreno" && ent && (
        <Apartado titulo={t(idioma, "cuerpo.resumen.entreno")}>
          {ent.sesiones ? (
            <>
              <Fila etiqueta={t(idioma, "cuerpo.resumen.entrenos")} valor={ent.sesiones} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.dias")} valor={ent.dias} />
              <Fila etiqueta={t(idioma, "entreno.sesion.volumen")} valor={textoPeso(ent.volumen, entreno.ajustes, idioma)} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.tiempo")} valor={duracionTexto(ent.duracionSeg, idioma)} />
              <Fila etiqueta={t(idioma, "cuerpo.resumen.records")} valor={ent.records} />
              {ent.topMusculos.length > 0 && (
                <Fila etiqueta={t(idioma, "cuerpo.resumen.musculos")} valor={ent.topMusculos.map((m) => t(idioma, "musculo." + m.musculo)).join(", ")} />
              )}
              {entAnt.sesiones > 0 && (
                <div style={{ marginTop: 10, background: "var(--green-soft)", borderRadius: 8, padding: "10px 12px", fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5 }}>
                  {t(idioma, "cuerpo.resumen.comparacion", {
                    // A media frase, el mes va en minúscula (salvo en inglés, que lo escribe siempre con mayúscula).
                    mes: idioma === "en" ? nombreMes(anterior, idioma) : nombreMes(anterior, idioma).toLowerCase(),
                    entrenos: `${ent.sesiones - entAnt.sesiones >= 0 ? "+" : ""}${ent.sesiones - entAnt.sesiones}`,
                    volumen: entAnt.volumen > 0 ? `${ent.volumen >= entAnt.volumen ? "+" : ""}${formatoNumero(((ent.volumen - entAnt.volumen) / entAnt.volumen) * 100, idioma, 0)} %` : "—",
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink-soft)" }}>{t(idioma, "cuerpo.resumen.sinEntrenos")}</div>
          )}
        </Apartado>
      )}

      {/* El reparto por músculo, en el mapa corporal (criterio de gráficas): tocar un músculo escribe sus series. */}
      {lado === "entreno" && ent && porMusculo.length > 0 && (
        <Apartado titulo={t(idioma, "cuerpo.resumen.porMusculo")}>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>{t(idioma, "cuerpo.resumen.porMusculoAyuda")}</div>
          <MapaCorporal valores={Object.fromEntries(porMusculo)} perfil={data.perfil} idioma={idioma} etiqueta={t(idioma, "cuerpo.resumen.porMusculo")}
            textoDe={(m, n) => t(idioma, "cuerpo.mapa.series", { n: formatoNumero(n, idioma) })} />
        </Apartado>
      )}

      {lado === "nutricion" && (premium.active ? (
        <Apartado titulo={t(idioma, "cuerpo.resumen.peso")} onGrafica={pesoDelMes ? () => setHoja("peso") : null} idioma={idioma}>
          <Fila
            etiqueta={t(idioma, "resumenMensual.pesoEsteMes")}
            valor={pesoDelMes ? (
              <>
                {fmt(pesoDelMes.inicio)} → {fmt(pesoDelMes.fin)} kg{" "}
                <span style={{ color: "var(--green)" }}>({pesoDelMes.delta > 0 ? "+" : ""}{fmt(pesoDelMes.delta)} kg)</span>
              </>
            ) : t(idioma, "resumenMensual.sinPesadas")}
          />
          {pesoDelMes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 6 }}>
                {t(idioma, "resumenMensual.tendenciaDe", { mes: nombreMes(mes, idioma) })}
              </div>
              <PesoLineChart entradas={pesoDelMes.entradas} tendencia={tendenciaDelMes} idioma={idioma} />
            </div>
          )}
          <div style={{ marginTop: 14, background: "var(--green-soft)", borderRadius: 8, padding: "12px 14px", fontFamily: FUENTE_TEXTO, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
            {t(idioma, "resumenMensual.hasCompletado", { pct: resumen.porcentaje })}
            {pesoDelMes ? (
              <>{t(idioma, "resumenMensual.yTuPeso")} {pesoDelMes.delta < 0 ? t(idioma, "resumenMensual.pesoBajado") : pesoDelMes.delta > 0 ? t(idioma, "resumenMensual.pesoSubido") : t(idioma, "resumenMensual.pesoMantenido")}
              {pesoDelMes.delta !== 0 ? t(idioma, "resumenMensual.esteMesKg", { kg: fmt(Math.abs(pesoDelMes.delta)) }) : t(idioma, "resumenMensual.esteMes")}</>
            ) : t(idioma, "resumenMensual.esteMes")}
          </div>
        </Apartado>
      ) : (
        <div style={{ maxWidth: 480 }}>
          <PremiumRequiredNotice
            titulo={t(idioma, "premiumNotice.resumen.titulo")}
            texto={t(idioma, "premiumNotice.resumen.texto")}
            onGoPremium={onGoPremium}
            idioma={idioma}
          />
        </div>
      ))}

      {hoja === "comidas" && (
        <HojaGrafica
          titulo={t(idioma, "cuerpo.resumen.nutricion")} idioma={idioma} onCerrar={() => setHoja(null)} unidad="%" dec={0} barras minimo={0} maximo={100}
          datos={aDatos(Array.from({ length: new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate() }, (_, i) => {
            const fecha = `${mes}-${dos(i + 1)}`;
            const delDia = (data.comidasCompletadas || {})[fecha] || {};
            const tipos = Object.keys((data.perfil && data.perfil.repartoComidas) || {});
            const n = tipos.length || resumen.comidasPorDia || 4;
            const hechas = (tipos.length ? tipos : Object.keys(delDia)).filter((m) => delDia[m]).length;
            return { fecha, valor: fecha > `${actual}-${dos(hoy.getDate())}` ? null : Math.round((Math.min(hechas, n) / n) * 100) };
          }), "dia", idioma)}
        />
      )}
      {hoja === "peso" && pesoDelMes && (
        <HojaGrafica
          titulo={t(idioma, "cuerpo.resumen.peso")} idioma={idioma} onCerrar={() => setHoja(null)} unidad="kg" dec={1}
          datos={aDatos(pesoDelMes.entradas.map((e) => ({ fecha: e.fecha, valor: e.peso })), "dia", idioma)}
        />
      )}
    </>
  );
}
