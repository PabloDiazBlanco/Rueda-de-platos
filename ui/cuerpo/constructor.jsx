// ---------- ui/cuerpo/constructor.jsx ----------
// El constructor de informes (destino `cuerpo-constructor`, se llega desde Informes; premium; 26-oct-2026,
// maqueta local/ideas/esteticas/v3-05-constructor.html). De las cuatro maneras de montar un informe que se
// probaron, el usuario eligió la C, **frase con huecos**: se elige una pregunta hecha (unas 25, por temas:
// peso, comida, entreno, sueño y ciclo) y se cambian sus huecos («¿Hay relación entre [el sueño] y [las
// kcal], [por día]?»), o se monta una **pregunta libre** de 3 o 4 variables. Por día o por semana, con el
// selector de rango de siempre, y con 3 o más variables las cinco vistas de la maqueta: apiladas, juntas
// (de 0 a 100), tabla, color y tiras. La estrella lo guarda en los favoritos, que se ven arriba de Informes.
//
// Las preguntas, sus formas y qué se dibuja con cada montaje están en logica/cuerpo-series.js (PREGUNTAS,
// FORMAS, resolverMontaje); la estadística honesta, también allí. Al cambiar un hueco, la pregunta deja de
// ser «la hecha» y su título pasa a ser la frase general con lo elegido.
import React, { useState, useMemo } from "react";
import { t } from "i18n";
import {
  PREGUNTAS, PREGUNTA_LIBRE, TEMAS, FORMAS, VARIABLES, MUSCULOS_SERIES, variable, valores, relacion, porCategoria,
  tablaXYZ, completarHuecos, resolverMontaje, ejerciciosConRM, MINIMO, MINIMO_CATEGORIA,
} from "cuerpo-series";
import { idDeConstructor } from "cuerpo-diario";
import { PremiumRequiredNotice } from "../premium/premium.jsx";
import { BackLink } from "../comun/tarjetas.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { TextoSuave, Chip } from "../entreno/comun.jsx";
import { AvisoMesesSinLeer } from "../entreno/ficha.jsx";
import {
  useSerieCuerpo, GraficaMontada, Estrella, Chapa, Frase, Lectura, SelectorRango, Selector, textoPista, num, conUnidad,
  nombreVariable, conArticulo, unidadTexto, etiquetaCategoria, referenciaDe,
} from "./graficas.jsx";

const PREGUNTA_POR_ID = Object.fromEntries([...PREGUNTAS, PREGUNTA_LIBRE].map((p) => [p.id, p]));
const VISTAS = ["a", "b", "c", "d", "e"];

// Cómo se escribe un hueco dentro de la frase: con artículo («el sueño») salvo en la tabla, donde va detrás
// de «más» («con más proteína»).
function textoHueco(forma, clave, valor, idioma, entreno) {
  if (!valor) return t(idioma, "cuerpo.cons.ninguna");
  if (clave === "per") return t(idioma, "cuerpo.periodo." + valor + ".frase");
  if (clave === "c") return t(idioma, `cuerpo.var.${valor}.art`);
  if (forma === "tabla" && (clave === "v1" || clave === "v2")) return nombreVariable(valor, idioma, entreno).toLowerCase();
  return conArticulo(valor, idioma, entreno);
}

// Trozos de una frase con huecos: ["texto", { hueco: "v1" }, "texto", ...].
function trozos(plantilla) {
  return plantilla.split(/(\{v1\}|\{v2\}|\{v3\}|\{v4\}|\{c\}|\{per\})/).filter((x) => x !== "").map((x) => (/^\{.+\}$/.test(x) ? { hueco: x.slice(1, -1) } : x));
}

// El título de un montaje (también para los favoritos): el de la pregunta hecha o la frase con lo elegido.
export function tituloDeMontaje(spec, idioma, entreno) {
  if (!spec) return "";
  if (spec.pregunta && PREGUNTA_POR_ID[spec.pregunta] && spec.pregunta !== "libre") return t(idioma, "cuerpo.cons.p." + spec.pregunta);
  const forma = FORMAS[spec.forma] ? spec.forma : "libre";
  // La libre se edita con «… Y también: [otra]», pero se titula como una frase entera, con tres o con cuatro.
  const plantilla = forma === "libre" ? ((spec.huecos || {}).v4 ? "cuerpo.cons.forma.libreCuatro" : "cuerpo.cons.forma.juntas") : "cuerpo.cons.forma." + forma;
  return trozos(t(idioma, plantilla)).map((x) => {
    if (typeof x === "string") return x;
    if (x.hueco === "per") return t(idioma, "cuerpo.periodo." + (spec.periodo === "dia" ? "dia" : "semana") + ".frase");
    if (x.hueco === "v4" && !(spec.huecos || {}).v4) return "";
    return textoHueco(forma, x.hueco, (spec.huecos || {})[x.hueco], idioma, entreno);
  }).join("").replace(/\s+([,.?])/g, "$1").replace(/\s{2,}/g, " ");
}

// Las opciones de un hueco de variable, agrupadas como en la maqueta (cuerpo, comida, entreno). El 1RM, de
// los ejercicios que tienen alguno; las series, de los 14 músculos del mapa.
function opcionesVariables(serie, idioma, entreno, actual) {
  const conRM = ejerciciosConRM(serie).map((e) => "rm:" + e.id);
  if (actual && actual.startsWith("rm:") && !conRM.includes(actual)) conRM.unshift(actual);
  const grupos = [
    ["cuerpo", VARIABLES.filter((v) => v.grupo === "cuerpo" && !v.cat).map((v) => v.id)],
    ["comida", VARIABLES.filter((v) => v.grupo === "comida" && !v.cat).map((v) => v.id)],
    ["entreno", VARIABLES.filter((v) => v.grupo === "entreno" && !v.cat).map((v) => v.id)],
    ["rm", conRM],
    ["series", MUSCULOS_SERIES.map((m) => "series:" + m)],
  ];
  return grupos.filter(([, ids]) => ids.length).map(([g, ids]) => ({ grupo: g, opciones: ids.map((id) => [id, nombreVariable(id, idioma, entreno)]) }));
}

// Un hueco de la frase: se ve el texto tal como va en la frase («el sueño», con su anchura natural) y encima,
// invisible, el select nativo, que abre el selector del móvil. Un select a la vista tomaría el ancho de su
// opción más larga («el 1RM de Elevaciones laterales con mancuernas») y rompería la frase.
function Hueco({ valor, onCambiar, opciones, grupos, etiqueta, texto }) {
  return (
    <span style={{ position: "relative", display: "inline-block", maxWidth: "100%", margin: "0 2px", verticalAlign: "baseline" }}>
      <span aria-hidden="true" style={{
        display: "inline-block", maxWidth: "100%", fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700, lineHeight: 1.35, color: "var(--green-dark)",
        background: "var(--green-soft)", borderBottom: "2px solid var(--green)", borderRadius: "6px 6px 0 0", padding: "4px 6px", minHeight: 32,
      }}>{texto} ▾</span>
      <select value={valor || ""} onChange={(e) => onCambiar(e.target.value)} aria-label={`${etiqueta}: ${texto}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontSize: 16 }}>
        {opciones && opciones.map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
        {grupos && grupos.map((g) => (
          <optgroup key={g.etiqueta} label={g.etiqueta}>
            {g.opciones.map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
          </optgroup>
        ))}
      </select>
    </span>
  );
}

// El resultado de un montaje: { grafica, frase, aviso }.
function calcularResultado(spec, serie, objetivos, semanas, idioma, entreno) {
  const m = resolverMontaje(spec);
  const u = t(idioma, m.periodo === "dia" ? "cuerpo.graf.dias" : "cuerpo.graf.semanas");
  const aviso = m.soloSemana ? t(idioma, "cuerpo.cons.soloSemana", { nombre: nombreVariable(m.soloSemana, idioma, entreno) }) : null;
  if (!m.ids.length) return { grafica: null, frase: null, aviso };
  const [a, b, c] = m.ids;
  const va = variable(a);
  if (m.forma === "tiempo") {
    const vals = valores(serie, a, m.periodo, semanas);
    const xs = vals.map((q) => q.valor).filter((x) => x !== null);
    const min = MINIMO[m.periodo];
    const ref = referenciaDe(a, objetivos);
    const frase = xs.length < min
      ? { tipo: "poco", corto: t(idioma, "cuerpo.pista.pocoCorto"), texto: t(idioma, "cuerpo.cons.tendenciaPoco", { n: xs.length, min, u }) }
      : { tipo: "pista", corto: t(idioma, "cuerpo.cons.tendenciaCorto"), texto: t(idioma, "cuerpo.cons.tendencia", { desde: conUnidad(xs[0], unidadTexto(va.unidad, idioma), idioma, va.dec), hasta: conUnidad(xs[xs.length - 1], unidadTexto(va.unidad, idioma), idioma, va.dec), n: xs.length, u, media: conUnidad(xs.reduce((s, x) => s + x, 0) / xs.length, unidadTexto(va.unidad, idioma), idioma, va.dec) }) };
    return { grafica: { tipo: "linea", periodo: m.periodo, datos: vals, barras: va.agg === "suma", unidad: unidadTexto(va.unidad, idioma), dec: va.dec, ref, refTxt: ref ? t(idioma, "cuerpo.graf.objetivo", { v: num(ref, idioma) }) : "" }, frase, aviso };
  }
  if (m.forma === "relacion") {
    const rel = relacion(serie, a, b, m.periodo, semanas);
    const grafica = spec.tiempo
      ? { tipo: "apiladas", periodo: rel.periodo, ids: [a, b], semanas: rel.periodo === "dia" ? Math.min(semanas, 6) : semanas }
      : { tipo: "dispersion", p: rel.p, x: a, y: b, periodo: rel.periodo };
    return { grafica, frase: textoPista(rel.pista, idioma), aviso };
  }
  if (m.forma === "categoria") {
    const idCat = m.cat || "entreno";
    const g = porCategoria(serie, idCat, a, semanas);
    const pocos = g.filter((x) => x.n < MINIMO_CATEGORIA);
    const frase = pocos.length
      ? { tipo: "poco", corto: t(idioma, "cuerpo.pista.pocoCorto"), texto: t(idioma, "cuerpo.cons.categoriaPoco", { cat: etiquetaCategoria(idCat, pocos[0].cat, idioma), n: pocos[0].n, min: MINIMO_CATEGORIA }) }
      : { tipo: "pista", corto: t(idioma, "cuerpo.pista.mediaCorto"), texto: t(idioma, "cuerpo.cons.categoria", { lista: g.map((x) => `${etiquetaCategoria(idCat, x.cat, idioma)}: ${conUnidad(x.media, unidadTexto(va.unidad, idioma), idioma, va.dec)}`).join(" · "), n: g.reduce((s, x) => s + x.n, 0) }) };
    return { grafica: { tipo: "pares", grupos: g, variable: a, cat: idCat, ciclo: idCat === "fase", ref: referenciaDe(a, objetivos) }, frase, aviso };
  }
  if (m.forma === "tabla" || ((m.forma === "juntas" || m.forma === "libre") && spec.vista === "c")) {
    if (m.ids.length < 3) return { grafica: null, frase: { tipo: "nada", corto: t(idioma, "cuerpo.cons.faltaCorto"), texto: t(idioma, "cuerpo.cons.faltaTres") }, aviso };
    const tabla = tablaXYZ(serie, [a, b, c], "semana", semanas);
    const conMedia = Object.values(tabla.celdas).filter((x) => x.media !== null).length;
    const frase = conMedia >= 2
      ? { tipo: "pista", corto: t(idioma, "cuerpo.pista.mediaCorto"), texto: t(idioma, "cuerpo.inf.m-prot.frase") }
      : { tipo: "poco", corto: t(idioma, "cuerpo.pista.pocoCorto"), texto: t(idioma, "cuerpo.inf.m-prot.poco") };
    return { grafica: { tipo: "tabla", ids: [a, b, c], tabla }, frase, aviso };
  }
  // juntas o libre: 3 o 4 variables, con la vista elegida.
  if (m.ids.length < 3) return { grafica: null, frase: { tipo: "nada", corto: t(idioma, "cuerpo.cons.faltaCorto"), texto: t(idioma, "cuerpo.cons.faltaTres") }, aviso };
  const rel = relacion(serie, a, b, m.periodo, semanas);
  const p1 = textoPista(rel.pista, idioma);
  const frase = { ...p1, texto: t(idioma, "cuerpo.cons.entreDos", { a: nombreVariable(a, idioma, entreno).toLowerCase(), b: nombreVariable(b, idioma, entreno).toLowerCase(), pista: p1.texto.charAt(0).toLowerCase() + p1.texto.slice(1) }) };
  const vista = spec.vista || "a";
  const corto = m.periodo === "dia" ? Math.min(semanas, vista === "e" ? 8 : 4) : semanas;
  if (vista === "d") {
    const zs = Object.fromEntries(valores(serie, c, m.periodo, semanas).map((q) => [q.fecha, q.valor]));
    const p3 = rel.p.map((q) => [q[0], q[1], q[2], zs[q[2]] ?? null]).filter((q) => q[3] !== null);
    return { grafica: { tipo: "dispersion", p: p3, x: a, y: b, color: c, periodo: rel.periodo }, frase, aviso };
  }
  const tipo = vista === "b" ? "juntas" : vista === "e" ? "tiras" : "apiladas";
  return { grafica: { tipo, periodo: m.periodo, ids: m.ids, semanas: corto }, frase, aviso };
}

// Un montaje de partida: el de una pregunta hecha (con sus marcadores ya completados) o el que llega desde un
// favorito.
function montajeDe(pregunta, serie) {
  return { pregunta: pregunta.id, forma: pregunta.forma, huecos: completarHuecos(pregunta.huecos, serie), periodo: pregunta.periodo || "semana", vista: "a", tiempo: false };
}

export function ConstructorView({ data, premium, entreno, cuerpo, idioma, onGoPremium, navegar, params }) {
  const { listo, serie, objetivos, esMujer, incompleto } = useSerieCuerpo({ data, entreno, cuerpo });
  const temas = TEMAS.filter((x) => x !== "ciclo" || esMujer);
  const inicial = params && params.spec ? params.spec : null;
  const [tema, setTema] = useState(inicial ? (PREGUNTA_POR_ID[inicial.pregunta] && PREGUNTA_POR_ID[inicial.pregunta].tema) || (inicial.forma === "libre" ? "libre" : temas[0]) : temas[0]);
  const [spec, setSpec] = useState(inicial);
  const [semanas, setSemanas] = useState(13);
  const [lectura, setLectura] = useState(null);
  const montaje = spec || (listo ? montajeDe(PREGUNTAS.find((p) => p.tema === tema) || PREGUNTAS[0], serie) : null);
  const resultado = useMemo(() => (montaje && listo ? calcularResultado(montaje, serie, objetivos, semanas, idioma, entreno) : null), [montaje, serie, semanas, idioma, listo]);

  const volver = <BackLink label={t(idioma, "barra.informes")} onClick={() => navegar("cuerpo-informes")} />;
  if (!premium.active) {
    return (
      <div style={{ maxWidth: 480 }}>
        {volver}
        <PremiumRequiredNotice titulo={t(idioma, "cuerpo.informes.premiumTitulo")} texto={t(idioma, "cuerpo.informes.premiumTexto")} onGoPremium={onGoPremium} idioma={idioma} />
      </div>
    );
  }
  if (!listo || !montaje) return <div>{volver}<TextoSuave>{t(idioma, "loading.cargando")}</TextoSuave></div>;

  const cambiar = (cambios) => { setSpec({ ...montaje, ...cambios }); setLectura(null); };
  const elegirTema = (x) => {
    setTema(x);
    setSpec(x === "libre" ? montajeDe(PREGUNTA_LIBRE, serie) : montajeDe(PREGUNTAS.find((p) => p.tema === x), serie));
    setLectura(null);
  };
  const forma = montaje.forma;
  const gruposVar = (actual) => opcionesVariables(serie, idioma, entreno, actual).map((g) => ({ etiqueta: t(idioma, "cuerpo.cons.grupo." + g.grupo), opciones: g.opciones }));
  const cambiarHueco = (clave, valor) => cambiar({ pregunta: forma === "libre" ? "libre" : null, huecos: { ...montaje.huecos, [clave]: valor } });

  const hueco = (clave) => {
    if (clave === "per") {
      return <Hueco key={clave} valor={montaje.periodo} onCambiar={(v) => cambiar({ periodo: v, pregunta: forma === "libre" ? "libre" : montaje.pregunta && PREGUNTA_POR_ID[montaje.pregunta] && PREGUNTA_POR_ID[montaje.pregunta].periodo === v ? montaje.pregunta : null })} etiqueta={t(idioma, "cuerpo.graf.periodo")} texto={textoHueco(forma, "per", montaje.periodo, idioma, entreno)}
        opciones={[["dia", t(idioma, "cuerpo.periodo.dia.frase")], ["semana", t(idioma, "cuerpo.periodo.semana.frase")]]} />;
    }
    if (clave === "c") {
      const cats = ["entreno", ...(esMujer ? ["fase"] : [])];
      return <Hueco key={clave} valor={montaje.huecos.c} onCambiar={(v) => cambiarHueco("c", v)} etiqueta={t(idioma, "cuerpo.cons.hueco")} texto={textoHueco(forma, "c", montaje.huecos.c, idioma, entreno)} opciones={cats.map((x) => [x, t(idioma, `cuerpo.var.${x}.art`)])} />;
    }
    const valor = montaje.huecos[clave];
    const grupos = gruposVar(valor);
    if (clave === "v4") grupos.unshift({ etiqueta: t(idioma, "cuerpo.cons.opcional"), opciones: [["", t(idioma, "cuerpo.cons.ninguna")]] });
    return <Hueco key={clave} valor={valor} onCambiar={(v) => cambiarHueco(clave, v)} etiqueta={t(idioma, "cuerpo.cons.hueco")} texto={textoHueco(forma, clave, valor, idioma, entreno)} grupos={grupos} />;
  };

  const preguntasTema = PREGUNTAS.filter((p) => p.tema === tema);
  const idFav = idDeConstructor(montaje);
  const fav = cuerpo.esFavorito(idFav);
  const nNum = resolverMontaje(montaje).ids.length;
  const conFase = forma === "categoria" && montaje.huecos.c === "fase";

  return (
    <div style={{ maxWidth: 520 }}>
      {volver}
      <TextoSuave style={{ marginBottom: 10 }}>{t(idioma, "cuerpo.cons.intro")}</TextoSuave>
      {incompleto && <AvisoMesesSinLeer idioma={idioma} />}

      {/* Temas y preguntas hechas */}
      <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
        {[...temas, "libre"].map((x) => (
          <Chip key={x} role="tab" aria-selected={tema === x} activo={tema === x} onClick={() => elegirTema(x)}>{t(idioma, "cuerpo.cons.tema." + x)}</Chip>
        ))}
      </div>
      {tema !== "libre" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {preguntasTema.map((p) => {
            const activa = montaje.pregunta === p.id;
            return (
              <button key={p.id} onClick={() => { setSpec(montajeDe(p, serie)); setLectura(null); }} aria-pressed={activa}
                style={{ textAlign: "left", fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: activa ? 700 : 500, color: activa ? "var(--green-dark)" : "var(--ink)", background: activa ? "var(--green-soft)" : "var(--card)", border: `1px solid ${activa ? "var(--green)" : "var(--line)"}`, borderRadius: 10, padding: "9px 11px", minHeight: 40 }}>
                {t(idioma, "cuerpo.cons.p." + p.id)}
              </button>
            );
          })}
        </div>
      )}

      {/* La frase con huecos */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t(idioma, "cuerpo.cons.cambiaHuecos")}</div>
        <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 19, lineHeight: 1.9, color: "var(--ink)" }}>
          {trozos(t(idioma, "cuerpo.cons.forma." + forma)).map((x, i) => (typeof x === "string" ? <span key={i}>{x}</span> : hueco(x.hueco)))}
        </div>
      </div>

      {/* El resultado */}
      <section style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div style={{ flex: 1, fontFamily: FUENTE_TITULOS, fontSize: 16.5, color: "var(--green-dark)", lineHeight: 1.25 }}>{tituloDeMontaje(montaje, idioma, entreno)}</div>
          <Estrella activa={fav} onClick={() => cuerpo.alternarFavorito({ id: idFav, tipo: "cons", spec: { pregunta: montaje.pregunta || null, forma, huecos: montaje.huecos, periodo: montaje.periodo, vista: montaje.vista, tiempo: !!montaje.tiempo } })} idioma={idioma} />
        </div>
        <div>
          <Chapa tipo="premium">{t(idioma, "cuerpo.chapa.premium")}</Chapa>
          {conFase && <Chapa tipo="local">{t(idioma, "cuerpo.chapa.local")}</Chapa>}
          {resultado && resultado.frase && <Chapa tipo={resultado.frase.tipo}>{resultado.frase.corto}</Chapa>}
        </div>
        <SelectorRango semanas={semanas} onCambiar={(s) => { setSemanas(s); setLectura(null); }} idioma={idioma} />
        {forma === "relacion" && (
          <Selector etiqueta={t(idioma, "cuerpo.cons.como")} valor={!!montaje.tiempo} onCambiar={(v) => cambiar({ tiempo: v })}
            opciones={[[false, t(idioma, "cuerpo.cons.unaContraOtra")], [true, t(idioma, "cuerpo.cons.enElTiempo")]]} />
        )}
        {(forma === "juntas" || forma === "libre") && nNum >= 3 && (
          <Selector etiqueta={t(idioma, "cuerpo.cons.vista")} valor={montaje.vista || "a"} onCambiar={(v) => cambiar({ vista: v })}
            opciones={VISTAS.map((v) => [v, t(idioma, "cuerpo.cons.vista." + v)])} />
        )}
        <div style={{ marginTop: 6 }}>
          {resultado && resultado.grafica
            ? <GraficaMontada grafica={resultado.grafica} serie={serie} objetivos={objetivos} idioma={idioma} entreno={entreno} onLeer={setLectura} />
            : <TextoSuave>{t(idioma, "cuerpo.cons.eligeVariable")}</TextoSuave>}
        </div>
        <Lectura texto={lectura} idioma={idioma} />
        {resultado && resultado.aviso && <Frase frase={{ tipo: "nada", corto: t(idioma, "cuerpo.cons.ojo"), texto: resultado.aviso }} />}
        {resultado && <Frase frase={resultado.frase} />}
      </section>
      <TextoSuave style={{ fontSize: 11.5, marginTop: 10 }}>{t(idioma, "cuerpo.inf.honestidad")}</TextoSuave>
    </div>
  );
}
