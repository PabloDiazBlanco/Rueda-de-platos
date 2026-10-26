// ---------- ui/entreno/mapa-rutina.jsx ----------
// Añadir ejercicios a una rutina desde el gimnasio dibujado (decisión 4 del bloque FitDraft, 26-oct-2026;
// maqueta v3-02 · a): en el editor de rutinas, «Añadir ejercicio» abre el mapa. Tocar una zona o una máquina
// saca su lista (ui/entreno/hoja-zona.jsx) con «＋» en cada ejercicio, que lo añade al final de la rutina sin
// cerrar la hoja; «✓» lo vuelve a quitar. La rutina se dibuja como una ruta de Maps con las paradas
// numeradas en su orden y la primera iluminada (por donde se empieza). **Nunca «ordenar por cercanía»**: el
// gimnasio del dibujo no es el del usuario y el orden bueno es el del entrenamiento.
// «Buscar» abre el selector de siempre (buscador, filtros y crear un ejercicio propio), para lo que no se
// encuentra en el dibujo. En mitad de un entreno, en cambio, «añadir ejercicio» sigue con ese selector: allí
// lo que cuenta es tardar lo menos posible.
import React, { useState, useRef } from "react";
import { ArrowLeft, Search, Plus, Minus } from "lucide-react";
import { t } from "i18n";
import { paradasDeRutina } from "gimnasio";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { BotonPrincipal } from "./comun.jsx";
import { MapaGimnasio } from "./gimnasio.jsx";
import { HojaZona } from "./hoja-zona.jsx";
import { avatarDePerfil } from "../comun/avatar.jsx";

export function CapaMapaRutina({ entreno, idioma, ejercicioIds, onAnadir, onQuitar, onBuscar, onCerrar }) {
  const mapa = useRef(null);
  const [hoja, setHoja] = useState(null); // { zona, estacion }
  const paradas = paradasDeRutina(ejercicioIds, entreno.ejercicioDe);
  const boton = { width: 36, height: 36, border: "none", background: "rgba(255,253,247,0.92)", color: "var(--green-dark)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

  return (
    <div role="dialog" aria-modal="true" aria-label={t(idioma, "fitdraft.rutina.titulo")} style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, minHeight: 56, boxSizing: "border-box", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
        <button onClick={onCerrar} aria-label={t(idioma, "entreno.comun.volver")} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink)", flexShrink: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t(idioma, "fitdraft.rutina.titulo")}
        </h2>
        <button onClick={onBuscar} style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 40, padding: "0 12px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--card)", cursor: "pointer", fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)" }}>
          <Search size={15} /> {t(idioma, "fitdraft.rutina.buscar")}
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <MapaGimnasio
          ref={mapa}
          pre="gymr"
          modo="rutina"
          idioma={idioma}
          genero={avatarDePerfil(entreno.perfil)}
          tinte={false}
          paradas={paradas}
          siguiente={paradas.length ? 0 : null}
          resaltada={hoja && hoja.estacion}
          margenArriba={12}
          margenAbajo={12}
          onZona={(zona, estacion) => setHoja({ zona, estacion })}
          onSitio={() => {}}
        />
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 6, display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden", border: "1px solid var(--cristal-borde)", boxShadow: "0 2px 8px rgba(31,77,56,0.1)" }}>
          <button onClick={() => mapa.current && mapa.current.zoom(1.6)} aria-label={t(idioma, "fitdraft.acercar")} style={boton}><Plus size={17} /></button>
          <button onClick={() => mapa.current && mapa.current.zoom(1 / 1.6)} aria-label={t(idioma, "fitdraft.alejar")} style={{ ...boton, borderTop: "1px solid var(--line)" }}><Minus size={17} /></button>
        </div>
        {!ejercicioIds.length && (
          <div style={{ position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)", zIndex: 6, maxWidth: "70%", textAlign: "center", pointerEvents: "none", background: "rgba(31,77,56,0.85)", color: "#fff", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 12 }}>
            {t(idioma, "fitdraft.rutina.pista")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--line)", background: "var(--card)", padding: "10px 14px calc(10px + env(safe-area-inset-bottom))" }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.35 }}>
          {t(idioma, ejercicioIds.length === 1 ? "entreno.comun.ejercicio1" : "entreno.comun.ejercicios", { n: ejercicioIds.length })}
          {" · "}
          {t(idioma, paradas.length === 1 ? "fitdraft.rutina.parada1" : "fitdraft.rutina.paradas", { n: paradas.length })}
        </div>
        <BotonPrincipal onClick={onCerrar} style={{ width: "auto", minHeight: 44, padding: "0 22px", fontSize: 14 }}>{t(idioma, "entreno.descanso.listo")}</BotonPrincipal>
      </div>

      {hoja && (
        <HojaZona
          entreno={entreno}
          idioma={idioma}
          zona={hoja.zona}
          estacion={hoja.estacion}
          modo="rutina"
          estaEnRutina={(id) => ejercicioIds.includes(id)}
          onAnadir={onAnadir}
          onQuitar={onQuitar}
          onCerrar={() => setHoja(null)}
        />
      )}
    </div>
  );
}
