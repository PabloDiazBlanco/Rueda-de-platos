// ---------- ui/cuerpo/informes.jsx ----------
// Informes cruzados (destino `cuerpo-informes`, pestaña «Informes» del área Cuerpo; premium). Desde el
// 26-oct-2026 son los 15 predefinidos de la maqueta v3-04 (local/ideas/esteticas/, decisiones en su
// registro.md): pocos y estratégicos, tres por cada cruce (comida × entreno, peso × comida, peso × entreno,
// ciclo) y tres de más de dos cosas. Cada fila es una pregunta con su cifra, una mini gráfica, el botón
// verde «Gráfica» (la gráfica entera, en una hoja, con el selector de rango) y la estrella de favorito.
// Arriba, el panel de favoritos (los predefinidos y los montados en el constructor), guardados en la
// cuenta (ui/estado/cuerpo.js). Y un enlace al constructor (ui/cuerpo/constructor.jsx).
//
// La honestidad de siempre: una relación es una pista, nunca un hecho; con pocos datos, «aún no hay
// suficiente»; sin causa ni consejo, y nada de esto cambia los objetivos. Los del ciclo solo salen con
// perfil de mujer y se calculan en el móvil con el período del dispositivo, que no sale de aquí.
// Los cálculos están en logica/informes.js (INFORMES) y logica/cuerpo-series.js.
import React, { useState } from "react";
import { Star, Wrench, ChevronRight } from "lucide-react";
import { t } from "i18n";
import { INFORMES, GRUPOS_INFORMES, informesVisibles } from "informes";
import { PremiumRequiredNotice } from "../premium/premium.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { TextoSuave, HojaInferior } from "../entreno/comun.jsx";
import { AvisoMesesSinLeer } from "../entreno/ficha.jsx";
import {
  useSerieCuerpo, GraficaMontada, Mini, BotonGrafica, Estrella, Chapa, Frase, Lectura, SelectorRango, Selector,
  textoPista, num, nombreVariable,
} from "./graficas.jsx";
import { tituloDeMontaje } from "./constructor.jsx";

const SEMANAS_POR_DEFECTO = 13; // 3 meses
const POR_ID = Object.fromEntries(INFORMES.map((it) => [it.id, it]));
const conSigno = (v, idioma, dec = 1) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${num(Math.abs(v), idioma, dec)}`);

// Las palabras de cada informe: { cifra, sub, frase: { tipo, corto, texto } }. Los números vienen de
// logica/informes.js; aquí solo se escriben, en el idioma de la pantalla.
export function textosInforme(id, r, idioma, entreno) {
  const c = r.cifras;
  const k = (s, v) => t(idioma, `cuerpo.inf.${id}.${s}`, v);
  const poco = (texto) => ({ tipo: "poco", corto: t(idioma, "cuerpo.pista.pocoCorto"), texto });
  const media = (texto) => ({ tipo: "pista", corto: t(idioma, "cuerpo.pista.mediaCorto"), texto });
  const ej = c.ejercicio ? nombreVariable("rm:" + c.ejercicio, idioma, entreno) : "";
  const p1 = textoPista(r.pista, idioma);
  const minus = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : "");
  switch (id) {
    case "ce-prot":
      return {
        cifra: `${num(c.con, idioma)} / ${num(c.sin, idioma)} g`, sub: k("sub"),
        frase: r.suficiente ? media(k(c.pctSin !== null ? "frase" : "fraseSinObjetivo", { con: num(c.con, idioma), sin: num(c.sin, idioma), pct: c.pctSin, n: c.nCon + c.nSin })) : poco(k("poco", { con: c.nCon, sin: c.nSin })),
      };
    case "ce-hidr":
      return { cifra: `${num(c.alto, idioma, 1)} / ${num(c.bajo, idioma, 1)}`, sub: k("sub", { g: num(c.umbral, idioma) }), frase: p1 };
    case "ce-hechas":
      return { cifra: `${num(c.mas, idioma)} % / ${num(c.menos, idioma)} %`, sub: k("sub", { n: c.umbral }), frase: p1 };
    case "pc-balance":
      return {
        cifra: `${conSigno(c.cambio, idioma)} kg`, sub: k("sub", { kcal: num(c.kcalMedia, idioma) }),
        frase: r.suficiente ? { ...p1, texto: k("frase", { kg: conSigno(c.semanaMedia, idioma, 2), pista: minus(p1.texto) }) } : poco(k("poco")),
      };
    case "pc-finde":
      return {
        cifra: `${conSigno(c.media, idioma)} kg`, sub: k("sub"),
        frase: r.suficiente ? media(k(c.media >= 0 ? "fraseMas" : "fraseMenos", { kg: num(Math.abs(c.media), idioma, 1) })) : poco(k("poco", { n: c.n, min: c.min })),
      };
    case "pc-siguiente":
      return {
        cifra: `${conSigno(c.mas, idioma, 2)} / ${conSigno(c.menos, idioma, 2)} kg`, sub: k("sub", { kcal: num(c.umbral, idioma) }),
        frase: p1 && p1.tipo !== "poco" ? { ...p1, texto: `${p1.texto} ${k("nota")}` } : p1,
      };
    case "pe-fuerza": {
      if (!c.ejercicio) return { cifra: "—", sub: k("sinEjercicioSub"), frase: poco(k("sinEjercicio")) };
      const frase = !r.suficiente ? poco(k("poco"))
        : c.dPeso < 0 ? media(k(c.dRm >= 0 ? "fraseBien" : "fraseBaja", { ejercicio: ej }))
        : media(k("fraseSinBajar"));
      return { cifra: `${conSigno(c.dRm, idioma)} kg`, sub: k("sub", { ejercicio: ej, kg: conSigno(c.dPeso, idioma) }), frase };
    }
    case "pe-relativa":
      if (!c.ejercicio) return { cifra: "—", sub: t(idioma, "cuerpo.inf.pe-fuerza.sinEjercicioSub"), frase: poco(t(idioma, "cuerpo.inf.pe-fuerza.sinEjercicio")) };
      return { cifra: `${num(c.ultimo, idioma, 2)} ×`, sub: k("sub", { ejercicio: ej }), frase: r.suficiente ? media(k("frase", { ejercicio: ej })) : poco(t(idioma, "cuerpo.inf.pe-fuerza.poco")) };
    case "pe-volumen":
      return { cifra: p1.corto, sub: k("sub", { n: c.n }), frase: p1.tipo === "nada" ? { ...p1, texto: `${p1.texto} ${k("nota")}` } : p1 };
    case "ci-peso":
      return {
        cifra: `${conSigno(c.max, idioma, 1)} kg`, sub: c.dia ? k("sub", { dia: c.dia }) : k("subSin"),
        frase: r.suficiente ? media(k("frase")) : poco(k("poco", { n: c.n, min: c.min })),
      };
    case "ci-comida":
      return {
        cifra: `${num(c.lutea, idioma)} / ${num(c.folicular, idioma)}`, sub: k("sub"),
        frase: r.suficiente ? media(k("frase")) : poco(k("poco")),
      };
    case "ci-rinde":
      return {
        cifra: `${num(c.regla, idioma, 1)} / ${num(c.folicular, idioma, 1)}`, sub: k("sub"),
        frase: r.suficiente ? media(k("frase", { regla: num(c.regla, idioma, 1), folicular: num(c.folicular, idioma, 1), n: c.total })) : poco(k("poco")),
      };
    case "m-sueno": {
      const p2 = textoPista(r.pista2, idioma);
      return {
        cifra: `${conSigno(c.dif, idioma, 0)} kcal`, sub: k("sub", { h: num(c.umbral, idioma, 1) }),
        frase: r.suficiente ? { ...p1, texto: k("frase", { kcal: minus(p1.texto), esfuerzo: minus(p2.corto) }) } : p1,
      };
    }
    case "m-ciclo":
      return { cifra: k("cifra", { n: c.semanas }), sub: k("sub"), frase: r.suficiente ? { tipo: "pista", corto: t(idioma, "cuerpo.pista.mirarCorto"), texto: k("frase") } : poco(k("poco")) };
    case "m-prot":
      return { cifra: k("cifra"), sub: k("sub"), frase: r.suficiente ? media(k("frase")) : poco(k("poco")) };
    default:
      return { cifra: "", sub: "", frase: null };
  }
}

function FilaInforme({ it, r, txt, favorito, onFavorito, onAbrir, idioma }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 6px 10px 12px", marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.3 }}>{t(idioma, `cuerpo.inf.${it.id}.p`)}</div>
        <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 19, color: "var(--ink)", marginTop: 1 }}>
          {txt.cifra}
          <small style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, marginLeft: 5, color: "var(--ink-soft)" }}>{txt.sub}</small>
        </div>
        <div>
          {it.local && <Chapa tipo="local">{t(idioma, "cuerpo.chapa.local")}</Chapa>}
          {txt.frase && <Chapa tipo={txt.frase.tipo}>{txt.frase.corto}</Chapa>}
        </div>
      </div>
      <div className="cuerpo-mini"><Mini datos={r.mini.datos} barras={r.mini.barras} color={r.mini.color} /></div>
      <BotonGrafica onClick={onAbrir} idioma={idioma} />
      <Estrella activa={favorito} onClick={onFavorito} idioma={idioma} />
    </div>
  );
}

// La hoja con la gráfica entera: rango, por día / por semana (si el informe lo admite), lectura al tocar,
// la frase prudente y de qué datos sale.
function HojaInforme({ it, serie, objetivos, entreno, cuerpo, idioma, onCerrar }) {
  const [semanas, setSemanas] = useState(SEMANAS_POR_DEFECTO);
  const [periodo, setPeriodo] = useState("dia");
  const [lectura, setLectura] = useState(null);
  const r = it.calc(serie, { semanas, periodo, objetivos });
  const txt = textosInforme(it.id, r, idioma, entreno);
  const fav = cuerpo.esFavorito(it.id);
  return (
    <HojaInferior titulo={t(idioma, "cuerpo.inf.grupo." + it.grupo)} onCerrar={onCerrar} idioma={idioma}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <h4 style={{ flex: 1, margin: "0 0 2px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)", lineHeight: 1.25 }}>{t(idioma, `cuerpo.inf.${it.id}.p`)}</h4>
        <Estrella activa={fav} onClick={() => cuerpo.alternarFavorito({ id: it.id, tipo: "pre" })} idioma={idioma} />
      </div>
      <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 24, color: "var(--ink)", margin: "2px 0 4px" }}>
        {txt.cifra}<small style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, fontWeight: 700, marginLeft: 6, color: "var(--ink-soft)" }}>{txt.sub}</small>
      </div>
      {it.local && <Chapa tipo="local">{t(idioma, "cuerpo.chapa.local")}</Chapa>}
      <SelectorRango semanas={semanas} onCambiar={(s) => { setSemanas(s); setLectura(null); }} idioma={idioma} />
      {it.conPeriodo && (
        <Selector etiqueta={t(idioma, "cuerpo.graf.periodo")} opciones={[["dia", t(idioma, "cuerpo.periodo.dia")], ["semana", t(idioma, "cuerpo.periodo.semana")]]} valor={periodo} onCambiar={(p) => { setPeriodo(p); setLectura(null); }} />
      )}
      <div style={{ marginTop: 4 }}>
        <GraficaMontada grafica={r.grafica} serie={serie} objetivos={objetivos} idioma={idioma} entreno={entreno} onLeer={setLectura} />
      </div>
      <Lectura texto={lectura} idioma={idioma} />
      <Frase frase={txt.frase} />
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", background: "var(--paper)", borderRadius: 10, padding: "8px 10px", marginTop: 8, lineHeight: 1.45 }}>
        <b>{t(idioma, "cuerpo.inf.datos")}</b> {t(idioma, `cuerpo.inf.${it.id}.datos`)}
      </div>
    </HojaInferior>
  );
}

function PanelFavoritos({ cuerpo, idioma, entreno, onAbrir, onAbrirMontaje }) {
  const lista = (cuerpo.favoritos && cuerpo.favoritos.lista) || [];
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "10px 12px", marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)", display: "flex", alignItems: "center", gap: 6 }}>
        <Star size={17} color="var(--mustard)" fill="var(--mustard)" /> {t(idioma, "cuerpo.fav.titulo")}
      </h3>
      {!lista.length && <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", padding: "4px 0 6px", lineHeight: 1.45 }}>{t(idioma, "cuerpo.fav.vacio")}</div>}
      {lista.map((f, i) => {
        const pre = f.tipo === "pre" ? POR_ID[f.id] : null;
        if (f.tipo === "pre" && !pre) return null;
        const titulo = pre ? t(idioma, `cuerpo.inf.${f.id}.p`) : tituloDeMontaje(f.spec, idioma, entreno);
        return (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none", fontFamily: FUENTE_TEXTO, fontSize: 13 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{titulo}</span>
            <button onClick={() => (pre ? onAbrir(pre) : onAbrirMontaje(f.spec))} style={{ flexShrink: 0, fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 8, padding: "7px 10px", minHeight: 34 }}>
              {t(idioma, pre ? "cuerpo.fav.ver" : "cuerpo.fav.abrir")}
            </button>
          </div>
        );
      })}
    </section>
  );
}

export function InformesView({ data, premium, entreno, cuerpo, idioma, onGoPremium, navegar }) {
  const [abierto, setAbierto] = useState(null);
  const { listo, serie, objetivos, esMujer, incompleto } = useSerieCuerpo({ data, entreno, cuerpo });

  if (!premium.active) {
    return (
      <div style={{ maxWidth: 480 }}>
        <PremiumRequiredNotice titulo={t(idioma, "cuerpo.informes.premiumTitulo")} texto={t(idioma, "cuerpo.informes.premiumTexto")} onGoPremium={onGoPremium} idioma={idioma} />
      </div>
    );
  }

  const visibles = informesVisibles(esMujer);
  return (
    <div style={{ maxWidth: 520 }}>
      {/* La mini gráfica de cada fila se esconde en pantallas muy estrechas, para que quepan la cifra y los botones. */}
      <style>{"@media (max-width: 400px) { .cuerpo-mini { display: none; } }"}</style>
      <TextoSuave style={{ marginBottom: 12 }}>{t(idioma, "cuerpo.inf.intro")}</TextoSuave>
      {incompleto && <AvisoMesesSinLeer idioma={idioma} />}
      <PanelFavoritos cuerpo={cuerpo} idioma={idioma} entreno={entreno} onAbrir={setAbierto} onAbrirMontaje={(spec) => navegar("cuerpo-constructor", { spec })} />

      <button
        onClick={() => navegar("cuerpo-constructor")}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "var(--green-soft)", border: "none", borderRadius: 12, padding: "11px 12px", marginBottom: 6, fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)", textAlign: "left", minHeight: 44 }}
      >
        <Wrench size={16} /> <span style={{ flex: 1 }}>{t(idioma, "cuerpo.inf.irConstructor")}</span> <ChevronRight size={16} />
      </button>

      {!listo && <TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave>}
      {listo && GRUPOS_INFORMES.map((g) => {
        const items = visibles.filter((it) => it.grupo === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700, color: "var(--mustard-dark)", textTransform: "uppercase", letterSpacing: 0.6, margin: "16px 4px 6px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {t(idioma, "cuerpo.inf.grupo." + g)}
              {g === "ciclo" && <Chapa tipo="local">{t(idioma, "cuerpo.chapa.soloMujer")}</Chapa>}
            </div>
            {items.map((it) => {
              const r = it.calc(serie, { semanas: SEMANAS_POR_DEFECTO, periodo: "dia", objetivos });
              return (
                <FilaInforme
                  key={it.id} it={it} r={r} txt={textosInforme(it.id, r, idioma, entreno)} idioma={idioma}
                  favorito={cuerpo.esFavorito(it.id)}
                  onFavorito={() => cuerpo.alternarFavorito({ id: it.id, tipo: "pre" })}
                  onAbrir={() => setAbierto(it)}
                />
              );
            })}
          </div>
        );
      })}

      <TextoSuave style={{ fontSize: 11.5, marginTop: 10 }}>{t(idioma, "cuerpo.inf.honestidad")}</TextoSuave>

      {abierto && listo && (
        <HojaInforme it={abierto} serie={serie} objetivos={objetivos} entreno={entreno} cuerpo={cuerpo} idioma={idioma} onCerrar={() => setAbierto(null)} />
      )}
    </div>
  );
}
