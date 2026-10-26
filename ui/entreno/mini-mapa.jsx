// ---------- ui/entreno/mini-mapa.jsx ----------
// Entre ejercicios (decisión 5 del bloque FitDraft, 26-oct-2026; maqueta v3-02 · V2): al cerrar un
// ejercicio porque se ha terminado, la tarjeta del descanso lleva encima un trocito del gimnasio donde el
// avatar anda de la máquina de ese ejercicio a la del siguiente, según el orden de la sesión (el de la
// rutina), con la ruta y sus paradas y la siguiente iluminada. No tapa la tabla ni el reloj: se ve mientras
// se descansa. Se salta con un toque, y un interruptor de los ajustes de entreno lo apaga
// (`ajustes.paseoDescanso`). Con «reducir movimiento», el avatar aparece ya en la siguiente máquina.
// Qué ejercicio toca lo decide pasoEntreEjercicios (logica/gimnasio.js); nada más cambia en la sesión.
import React, { useRef, useEffect } from "react";
import { t } from "i18n";
import { paradasDeRutina, estacionDeEjercicio } from "gimnasio";
import { FUENTE_TEXTO } from "../estilos.js";
import { MapaGimnasio } from "./gimnasio.jsx";
import { nombreDe, prefiereMenosMovimiento } from "./comun.jsx";
import { avatarDePerfil } from "../comun/avatar.jsx";

export const ALTO_MINI_MAPA = 150;

export function MiniMapaPaseo({ entreno, idioma, sesion, paso, onSaltar }) {
  const mapa = useRef(null);
  const ids = sesion.ejercicios.map((e) => e.ejercicioId);
  const paradas = paradasDeRutina(ids, entreno.ejercicioDe);
  const siguiente = paradas.findIndex((p) => p.indices.includes(paso.hacia));
  const haciaId = ids[paso.hacia];
  const desde = estacionDeEjercicio(entreno.ejercicioDe(ids[paso.desde]));
  const hacia = estacionDeEjercicio(entreno.ejercicioDe(haciaId));

  useEffect(() => {
    const api = mapa.current;
    if (!api || !hacia) return undefined;
    if (prefiereMenosMovimiento() || !desde || desde === hacia) {
      api.ponerEn(hacia);
      api.camara({ ...api.centroDe(hacia), s: 1 });
      return undefined;
    }
    api.ponerEn(desde);
    api.camara({ ...api.centroDe(desde), s: 1 });
    const id = setTimeout(() => api.caminarA(hacia, { duracion: 2400, sinCamino: true }), 350);
    return () => clearTimeout(id);
  }, []);

  if (!hacia) return null;
  return (
    <div style={{ position: "relative", height: ALTO_MINI_MAPA, margin: "0 10px 8px", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)" }}>
      <MapaGimnasio
        ref={mapa}
        pre="gymm"
        modo="mini"
        idioma={idioma}
        genero={avatarDePerfil(entreno.perfil)}
        tinte={false}
        paradas={paradas}
        siguiente={siguiente >= 0 ? siguiente : null}
        margenArriba={0}
        margenAbajo={0}
        onTocar={onSaltar}
      />
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 6, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, pointerEvents: "none", fontFamily: FUENTE_TEXTO }}>
        <span style={{ minWidth: 0, background: "rgba(255,253,247,0.92)", borderRadius: 999, padding: "4px 10px", fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
          {t(idioma, "fitdraft.paseo.siguiente")} <b>{nombreDe(entreno, haciaId, idioma)}</b>
        </span>
        <span style={{ flexShrink: 0, background: "rgba(31,77,56,0.85)", color: "#fff", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>
          {t(idioma, "fitdraft.paseo.saltar")}
        </span>
      </div>
    </div>
  );
}
