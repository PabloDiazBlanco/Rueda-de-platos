// ---------- ui/entreno/gimnasio-vista.jsx ----------
// La vista «Dibujo» de la pestaña Entrenar (bloque FitDraft de la parte estética, 26-oct-2026; maqueta
// v3-01 · D): el gimnasio entero a pantalla completa, entre la cabecera y la barra de abajo, con lo de encima:
// - arriba a la derecha, Dibujo / Lista (la otra vista son las pantallas de siempre; se recuerda lo último en
//   el dispositivo, `fooddraft:vista-gimnasio`), y debajo «Ir a…» (atajo, siempre), «Pasear» (joystick) y el
//   botón de capas, que tiñe las zonas según la semana (`fooddraft:capas-gimnasio`);
// - + / − para el zoom (solo en el mapa, no al pasear);
// - el botón fijo «Empezar · (rutina de hoy)», encima de la barra: un toque y a entrenar. Mientras hay un
//   entreno a medias no sale, porque en su sitio está la pastilla del entreno en curso;
// - el bocadillo del monitor, que habla una vez al día como mucho (`fooddraft:monitor-gym`) y repite su
//   frase si se le toca;
// - la puerta de cristal corredera, solo la primera vez al día (`fooddraft:puerta-gym`): se salta tocando.
// Todo eso son comodidades del dispositivo, no datos de la cuenta: van en localStorage y, si falla, no pasa
// nada. Los sitios de la recepción y la oficina llevan a lo de siempre: el torno es Empezar, la pizarra es
// Progreso, el libro es Historial, la estantería es Rutinas y el corcho, la semana.
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Play, MapPin, Footprints, Layers, Plus, Minus, Check, Dumbbell } from "lucide-react";
import { t } from "i18n";
import {
  ZONAS, MONITOR, ultimaVezPorZona, estadoZonas, fraseMonitor, rutinaDeHoy, diasEntrenadosSemana, zonaDeMusculo,
} from "gimnasio";
import { fechaLocal, semanaDe, sumarDias, seriesPorMusculo } from "entreno-calculo";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { MapaGimnasio } from "./gimnasio.jsx";
import { HojaZona } from "./hoja-zona.jsx";
import { HojaInferior, OpcionHoja, TextoSuave, prefiereMenosMovimiento, DIAS_CORTOS } from "./comun.jsx";
import { avatarDePerfil } from "../comun/avatar.jsx";

export const CLAVE_VISTA = "fooddraft:vista-gimnasio";
const CLAVE_CAPAS = "fooddraft:capas-gimnasio";
const CLAVE_PUERTA = "fooddraft:puerta-gym";
const CLAVE_MONITOR = "fooddraft:monitor-gym";

function leer(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* sin localStorage, solo dura esta visita */ }
}

// La vista elegida: la primera vez, el dibujo; luego, la última.
export function leerVista() {
  return leer(CLAVE_VISTA) === "lista" ? "lista" : "dibujo";
}

// Dibujo / Lista, en píldora. En el dibujo va flotando arriba a la derecha; en la lista, arriba del todo.
export function SelectorVista({ vista, onCambiar, idioma, flotante }) {
  return (
    <div role="group" aria-label={t(idioma, "fitdraft.vista.etiqueta")} style={{
      display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, border: "1px solid var(--cristal-borde)",
      background: flotante ? "rgba(255,253,247,0.9)" : "var(--card)", boxShadow: flotante ? "0 2px 8px rgba(31,77,56,0.1)" : "none",
    }}>
      {["dibujo", "lista"].map((v) => (
        <button key={v} onClick={() => onCambiar(v)} aria-pressed={vista === v} style={{
          border: "none", borderRadius: 999, padding: "6px 12px", minHeight: 32, cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
          background: vista === v ? "var(--green-soft)" : "transparent", color: vista === v ? "var(--green-dark)" : "var(--ink-soft)",
        }}>
          {t(idioma, "fitdraft.vista." + v)}
        </button>
      ))}
    </div>
  );
}

const botonFlotante = (activo) => ({
  display: "inline-flex", alignItems: "center", gap: 5, minHeight: 36, padding: "6px 11px", borderRadius: 999, cursor: "pointer",
  border: "1px solid var(--cristal-borde)", boxShadow: "0 2px 8px rgba(31,77,56,0.1)", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
  background: activo ? "var(--green-dark)" : "rgba(255,253,247,0.92)", color: activo ? "#fff" : "var(--green-dark)",
});

export function VistaGimnasio({ entreno, idioma, navegar, empezar, onVista }) {
  const mapa = useRef(null);
  const marcaRef = useRef(null);
  const bocadilloRef = useRef(null);
  const [arriba, setArriba] = useState(null); // dónde acaba la cabecera, en píxeles
  const [pasear, setPasear] = useState(false);
  const [tinte, setTinte] = useState(() => leer(CLAVE_CAPAS) !== "0");
  const [hoja, setHoja] = useState(null); // { tipo: "zona", zona, estacion } | { tipo: "empezar" | "semana" | "ira" }
  const [pista, setPista] = useState(null);
  const [frase, setFrase] = useState(null); // texto del bocadillo mientras se ve
  const [saluda, setSaluda] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const tiempos = useRef([]);

  const hoy = fechaLocal(Date.now());
  const inicioSemana = (entreno.ajustes && entreno.ajustes.inicioSemana) ?? 1;
  const lunes = semanaDe(hoy, inicioSemana);
  const ejercicioDe = entreno.ejercicioDe;

  // La semana puede empezar en el mes anterior: entonces hace falta ese mes también.
  const mesLunes = lunes.slice(0, 7);
  useEffect(() => { if (mesLunes !== entreno.mesActual()) entreno.cargarMes(mesLunes); }, [mesLunes]);

  const ultimaVez = useMemo(() => ultimaVezPorZona(entreno.indice, ejercicioDe, entreno.cola), [entreno.indice, entreno.cola, entreno.catalogo]);
  const estados = useMemo(() => estadoZonas({ ultimaVez, hoy, inicioSemana }), [ultimaVez, hoy, inicioSemana]);
  const sesionesSemana = useMemo(() => {
    const meses = [...new Set([mesLunes, entreno.mesActual()])];
    return meses.flatMap((mes) => entreno.sesionesDeMes(mes)).filter((s) => fechaLocal(s.inicio) >= lunes);
  }, [entreno.meses, entreno.cola, lunes]);
  const semana = useMemo(() => diasEntrenadosSemana(sesionesSemana, hoy, inicioSemana), [sesionesSemana, hoy, inicioSemana]);
  // La pizarra: series de esta semana de los cinco grupos de los avisos (pecho, espalda, pierna, hombros, brazos).
  const pizarra = useMemo(() => {
    const porMusculo = seriesPorMusculo(sesionesSemana, ejercicioDe, lunes, sumarDias(lunes, 6));
    const porZona = {};
    Object.entries(porMusculo).forEach(([m, n]) => { const z = zonaDeMusculo(m); if (z) porZona[z] = (porZona[z] || 0) + n; });
    return { grupos: ["pecho", "espalda", "pierna", "hombros", "brazos"].map((zona) => ({ zona, n: porZona[zona] || 0 })), entrenos: sesionesSemana.length };
  }, [sesionesSemana, lunes]);

  const rutinas = (entreno.catalogo && entreno.catalogo.rutinas) || [];
  const deHoy = rutinaDeHoy(rutinas, entreno.indice);
  const genero = avatarDePerfil(entreno.perfil);

  // Dónde empieza el dibujo: justo debajo de la cabecera (la vista ocupa la pantalla hasta abajo, y la barra
  // de cristal flota encima, como en la maqueta).
  useEffect(() => {
    function medir() {
      const main = marcaRef.current && marcaRef.current.closest("main");
      if (main) setArriba(Math.max(0, main.getBoundingClientRect().top));
    }
    window.scrollTo(0, 0);
    medir();
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      tiempos.current.forEach(clearTimeout);
    };
  }, []);

  // ---------- el monitor ----------
  function textoFrase(f) {
    return t(idioma, `fitdraft.monitor.${f.situacion}.${f.indice}`, { grupo: f.grupo ? t(idioma, "fitdraft.grupoFrase." + f.grupo) : "" });
  }
  function hablar(f) {
    setFrase(textoFrase(f));
    if (!prefiereMenosMovimiento()) {
      setSaluda(true);
      tiempos.current.push(setTimeout(() => setSaluda(false), 2800));
    }
    tiempos.current.push(setTimeout(() => setFrase(null), 6500));
  }
  function fraseDeHoy() {
    let guardada = null;
    try { guardada = JSON.parse(leer(CLAVE_MONITOR) || "null"); } catch (e) { guardada = null; }
    const f = fraseMonitor({ estados, ultimaSesion: ultimaVez.ultima, hoy, guardada });
    if (f.nueva) escribir(CLAVE_MONITOR, JSON.stringify({ fecha: f.fecha, situacion: f.situacion, indice: f.indice, grupo: f.grupo }));
    return f;
  }
  // Al entrar: la puerta (la primera vez al día) y, después, el saludo del día si aún no lo ha dicho.
  const yaEntro = useRef(false);
  useEffect(() => {
    if (arriba === null || yaEntro.current || !mapa.current) return;
    yaEntro.current = true;
    const puerta = leer(CLAVE_PUERTA) !== hoy && !prefiereMenosMovimiento();
    if (puerta) {
      escribir(CLAVE_PUERTA, hoy);
      setEntrando(true);
      setPista(t(idioma, "fitdraft.pista.saltar"));
      mapa.current.entrada();
    } else alEntrar();
  }, [arriba]);
  function alEntrar() {
    setEntrando(false);
    setPista(null);
    const f = fraseDeHoy();
    if (f.nueva) hablar(f);
  }

  // El bocadillo, encima del monitor si se ve; si no (al pasear lejos), arriba de la pantalla.
  function colocarBocadillo() {
    const el = bocadilloRef.current;
    if (!el || !mapa.current) return;
    const [px, py] = mapa.current.aPantalla(MONITOR.x, MONITOR.y - 38);
    const { w, h } = mapa.current.vista();
    const visible = px > 0 && px < w && py > 70 && py < h - 60;
    el.style.left = visible ? `${Math.max(8, Math.min(w - 238, px - 26))}px` : "12px";
    el.style.top = visible ? `${py}px` : "52px";
    el.style.transform = visible ? "translateY(-100%)" : "none";
  }
  useEffect(colocarBocadillo, [frase]);

  function mostrarPista(texto, ms) {
    setPista(texto);
    tiempos.current.push(setTimeout(() => setPista((x) => (x === texto ? null : x)), ms));
  }

  function alSitio(id) {
    if (id === "progreso") return navegar("entreno-progreso");
    if (id === "historial") return navegar("entreno-historial");
    if (id === "rutinas") return navegar("entreno-rutinas");
    if (id === "monitor") return hablar(fraseDeHoy());
    setHoja({ tipo: id }); // "empezar" (el torno) o "semana" (el corcho)
  }
  function cambiarTinte() {
    const nuevo = !tinte;
    setTinte(nuevo);
    escribir(CLAVE_CAPAS, nuevo ? "1" : "0");
    mostrarPista(t(idioma, nuevo ? "fitdraft.capas.si" : "fitdraft.capas.no"), 1800);
  }
  function alternarPasear() {
    const nuevo = !pasear;
    setPasear(nuevo);
    setHoja(null);
    if (nuevo) mostrarPista(t(idioma, "fitdraft.pista.pasear"), 2600);
  }

  const resaltada = hoja && hoja.tipo === "zona" ? hoja.estacion : hoja && (hoja.tipo === "empezar" || hoja.tipo === "semana") ? hoja.tipo : null;
  const pie = "calc(84px + env(safe-area-inset-bottom))";

  return (
    <div ref={marcaRef}>
      {arriba !== null && (
        <div style={{ position: "fixed", left: 0, right: 0, top: arriba, bottom: 0, zIndex: 5, overflow: "hidden" }}>
          <MapaGimnasio
            ref={mapa}
            pre="gym"
            idioma={idioma}
            genero={genero}
            estados={estados}
            tinte={tinte}
            pizarra={pizarra}
            semana={semana}
            resaltada={resaltada}
            pasear={pasear}
            saluda={saluda}
            margenArriba={44}
            margenAbajo={150}
            onZona={(zona, estacion) => setHoja({ tipo: "zona", zona, estacion })}
            onSitio={alSitio}
            onCamara={colocarBocadillo}
            alEntrar={alEntrar}
          />

          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 6, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <SelectorVista vista="dibujo" onCambiar={onVista} idioma={idioma} flotante />
            <button onClick={() => setHoja({ tipo: "ira" })} style={botonFlotante(false)}><MapPin size={15} /> {t(idioma, "fitdraft.irA")}</button>
            <button onClick={alternarPasear} aria-pressed={pasear} style={botonFlotante(pasear)}><Footprints size={15} /> {t(idioma, "fitdraft.pasear")}</button>
            <button onClick={cambiarTinte} aria-pressed={tinte} aria-label={t(idioma, "fitdraft.capas.etiqueta")} title={t(idioma, "fitdraft.capas.etiqueta")} style={{ ...botonFlotante(tinte), width: 36, padding: 0, justifyContent: "center" }}>
              <Layers size={17} />
            </button>
            {!pasear && (
              <div style={{ display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: "1px solid var(--cristal-borde)", boxShadow: "0 2px 8px rgba(31,77,56,0.1)" }}>
                <button onClick={() => mapa.current && mapa.current.zoom(1.6)} aria-label={t(idioma, "fitdraft.acercar")} style={{ width: 36, height: 36, border: "none", background: "rgba(255,253,247,0.92)", color: "var(--green-dark)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Plus size={17} /></button>
                <button onClick={() => mapa.current && mapa.current.zoom(1 / 1.6)} aria-label={t(idioma, "fitdraft.alejar")} style={{ width: 36, height: 36, border: "none", borderTop: "1px solid var(--line)", background: "rgba(255,253,247,0.92)", color: "var(--green-dark)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Minus size={17} /></button>
              </div>
            )}
          </div>

          {/* El bocadillo del monitor: tocarlo lo cierra. */}
          {frase && (
            <button
              ref={bocadilloRef}
              onClick={() => setFrase(null)}
              aria-live="polite"
              style={{
                position: "absolute", zIndex: 7, maxWidth: 230, textAlign: "left", cursor: "pointer", background: "var(--card)", border: "1.5px solid var(--ink)", borderRadius: 14,
                padding: "8px 11px", fontFamily: FUENTE_TITULOS, fontStyle: "italic", fontSize: 13, lineHeight: 1.35, color: "var(--green-dark)", boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              }}
            >
              <span style={{ display: "block", fontFamily: FUENTE_TEXTO, fontStyle: "normal", fontSize: 10, fontWeight: 700, color: "var(--ink-soft)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>
                {t(idioma, "fitdraft.monitor.quien")}
              </span>
              {frase}
            </button>
          )}

          {pista && (
            <div style={{ position: "absolute", left: "50%", top: "46%", transform: "translateX(-50%)", zIndex: 7, maxWidth: "80%", textAlign: "center", pointerEvents: "none", background: "rgba(31,77,56,0.85)", color: "#fff", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 12 }}>
              {pista}
            </div>
          )}

          {/* Empezar en un toque: la rutina que toca hoy (o un entreno vacío si no hay rutinas). */}
          {!entreno.borrador && !entrando && (
            <button
              onClick={() => empezar(deHoy)}
              style={{
                position: "absolute", left: "50%", bottom: pie, transform: "translateX(-50%)", zIndex: 6, display: "flex", alignItems: "center", gap: 8, maxWidth: "calc(100% - 32px)",
                border: "none", background: "var(--green-dark)", color: "#fff", borderRadius: 999, padding: "9px 18px 9px 10px", boxShadow: "0 6px 18px rgba(31,77,56,0.28)", cursor: "pointer", fontFamily: FUENTE_TEXTO,
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--mustard)", color: "var(--green-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Play size={13} fill="currentColor" /></span>
              <span style={{ textAlign: "left", minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {deHoy ? t(idioma, "fitdraft.empezar.rutina", { nombre: deHoy.nombre }) : t(idioma, "fitdraft.empezar.vacio")}
                </b>
                <small style={{ display: "block", fontSize: 10.5, opacity: 0.75 }}>{t(idioma, deHoy ? "fitdraft.empezar.teToca" : "fitdraft.empezar.vacioAyuda")}</small>
              </span>
            </button>
          )}
        </div>
      )}

      {hoja && hoja.tipo === "zona" && (
        <HojaZona
          entreno={entreno} idioma={idioma} zona={hoja.zona} estacion={hoja.estacion} estado={tinte ? estados[hoja.zona] : null}
          onFicha={(id) => navegar("entreno-ejercicio", { id })}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja && hoja.tipo === "empezar" && (
        <HojaInferior titulo={t(idioma, "fitdraft.torno.titulo")} onCerrar={() => setHoja(null)} idioma={idioma}>
          {entreno.borrador && (
            <OpcionHoja icono={Play} activa onClick={() => { setHoja(null); entreno.mostrarSesion(); }} detalle={entreno.borrador.nombre || null}>
              {t(idioma, "entreno.inicio.continuar")}
            </OpcionHoja>
          )}
          {[...(deHoy ? [deHoy] : []), ...rutinas.filter((r) => r !== deHoy)].map((r) => (
            <OpcionHoja key={r.id} icono={Dumbbell} onClick={() => { setHoja(null); empezar(r); }} detalle={r === deHoy ? t(idioma, "fitdraft.empezar.teToca") : t(idioma, r.ejercicios.length === 1 ? "entreno.comun.ejercicio1" : "entreno.comun.ejercicios", { n: r.ejercicios.length })}>
              {r.nombre}
            </OpcionHoja>
          ))}
          <OpcionHoja icono={Plus} onClick={() => { setHoja(null); empezar(null); }} detalle={t(idioma, "fitdraft.empezar.vacioAyuda")}>
            {t(idioma, "entreno.inicio.empezarVacio")}
          </OpcionHoja>
        </HojaInferior>
      )}
      {hoja && hoja.tipo === "semana" && (
        <HojaInferior titulo={t(idioma, "fitdraft.semana.titulo")} onCerrar={() => setHoja(null)} idioma={idioma}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(DIAS_CORTOS[idioma] || DIAS_CORTOS.es).map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, padding: "8px 0", borderRadius: 8, background: semana[i] ? "var(--green-soft)" : "var(--paper)", color: semana[i] ? "var(--green-dark)" : "var(--ink-soft)" }}>
                {d}
                <div style={{ height: 16, marginTop: 2 }}>{semana[i] && <Check size={14} />}</div>
              </div>
            ))}
          </div>
          <TextoSuave style={{ marginBottom: 8 }}>{t(idioma, sesionesSemana.length === 1 ? "fitdraft.semana.entrenos1" : "fitdraft.semana.entrenos", { n: sesionesSemana.length })}</TextoSuave>
          {ZONAS.filter((z) => estados[z.id].estado !== "nada").map((z) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--line)", fontFamily: FUENTE_TEXTO, fontSize: 13.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: estados[z.id].estado === "entrenada" ? "var(--green)" : "var(--ink-soft)" }} />
              <span style={{ flex: 1 }}>{t(idioma, "fitdraft.zona." + z.id)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: estados[z.id].estado === "entrenada" ? "var(--green-dark)" : "var(--rust)" }}>
                {estados[z.id].estado === "entrenada" ? t(idioma, "fitdraft.zona.entrenada") : t(idioma, "fitdraft.zona.haceDias", { n: estados[z.id].dias })}
              </span>
            </div>
          ))}
        </HojaInferior>
      )}
      {hoja && hoja.tipo === "ira" && (
        <HojaInferior titulo={t(idioma, "fitdraft.irA")} onCerrar={() => setHoja(null)} idioma={idioma}>
          {ZONAS.map((z) => (
            <OpcionHoja key={z.id} icono={MapPin} onClick={() => { setHoja(null); mapa.current && mapa.current.irA("zona", z.id); }}>
              {t(idioma, "fitdraft.zona." + z.id)}
            </OpcionHoja>
          ))}
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 10.5, fontWeight: 700, color: "var(--mustard-dark)", textTransform: "uppercase", letterSpacing: 0.6, margin: "10px 8px 2px" }}>
            {t(idioma, "fitdraft.irA.oficina")}
          </div>
          {["empezar", "progreso", "historial", "rutinas", "semana"].map((s) => (
            <OpcionHoja key={s} icono={MapPin} onClick={() => { setHoja(null); mapa.current && mapa.current.irA("sitio", s); }}>
              {t(idioma, "fitdraft.sitioLargo." + s)}
            </OpcionHoja>
          ))}
        </HojaInferior>
      )}
    </div>
  );
}
