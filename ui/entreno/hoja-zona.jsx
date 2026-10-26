// ---------- ui/entreno/hoja-zona.jsx ----------
// Lo que sale al tocar una zona o una máquina del gimnasio (en Entrenar y al crear una rutina; decisión 3
// del bloque FitDraft, 26-oct-2026): **una sola lista con todos los ejercicios de la zona** (los de músculo
// principal dentro de ella), con fichas para filtrar por músculo. Si se tocó una máquina, su ejercicio va
// primero y luego el resto de su músculo; el orden lo decide ejerciciosDeZona (logica/gimnasio.js).
// Sin nombres de máquina: el título es la zona y bajo cada ejercicio va «equipo · músculo» (los nombres de las
// máquinas se quedan en el dibujo, de adorno). Sin «Añadir todos».
// - `modo="ficha"`: tocar un ejercicio abre su ficha.
// - `modo="rutina"`: «＋» lo añade a la rutina y la hoja sigue abierta para seguir añadiendo.
import React, { useState, useMemo } from "react";
import { Plus, Check, ChevronRight } from "lucide-react";
import { t } from "i18n";
import { ZONA, ejerciciosDeZona } from "gimnasio";
import { FUENTE_TEXTO } from "../estilos.js";
import { HojaInferior, Chip, TextoSuave, nombreDe } from "./comun.jsx";

export function HojaZona({ entreno, idioma, zona, estacion = null, estado = null, modo = "ficha", estaEnRutina, onFicha, onAnadir, onQuitar, onCerrar }) {
  const [musculo, setMusculo] = useState(null);
  const ids = useMemo(() => ejerciciosDeZona(entreno.lista, zona, estacion), [entreno.lista, zona, estacion]);
  const z = ZONA[zona];
  if (!z) return null;
  const porId = Object.fromEntries(entreno.lista.map((e) => [e.id, e]));
  const musculos = z.musculos.filter((m) => ids.some((id) => porId[id] && porId[id].musculo === m));
  const visibles = musculo ? ids.filter((id) => porId[id].musculo === musculo) : ids;

  return (
    <HojaInferior titulo={t(idioma, "fitdraft.zona." + zona)} onCerrar={onCerrar} idioma={idioma}>
      {estado && estado.estado !== "nada" && (
        <TextoSuave style={{ fontSize: 12, fontWeight: 700, marginTop: -4, marginBottom: 6, color: estado.estado === "entrenada" ? "var(--green-dark)" : "var(--rust)" }}>
          {estado.estado === "entrenada" ? t(idioma, "fitdraft.zona.entrenada") : t(idioma, "fitdraft.zona.haceDias", { n: estado.dias })}
        </TextoSuave>
      )}
      {musculos.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 4 }}>
          <Chip activo={!musculo} onClick={() => setMusculo(null)}>{t(idioma, "fitdraft.zona.todos")}</Chip>
          {musculos.map((m) => <Chip key={m} activo={musculo === m} onClick={() => setMusculo(musculo === m ? null : m)}>{t(idioma, "musculo." + m)}</Chip>)}
        </div>
      )}
      <div role="list">
        {visibles.map((id) => {
          const e = porId[id];
          const sub = `${t(idioma, "equipo." + e.equipo)} · ${t(idioma, "musculo." + e.musculo)}`;
          const dentro = modo === "rutina" && estaEnRutina ? estaEnRutina(id) : false;
          return (
            <div key={id} role="listitem" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px", borderTop: "1px solid var(--line)", fontFamily: FUENTE_TEXTO }}>
              <button
                onClick={() => (modo === "rutina" ? (dentro ? onQuitar && onQuitar(id) : onAnadir(id)) : onFicha(id))}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: FUENTE_TEXTO, color: "var(--ink)" }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{nombreDe(entreno, id, idioma)}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</div>
              </button>
              {modo === "rutina" ? (
                <button
                  onClick={() => (dentro ? onQuitar && onQuitar(id) : onAnadir(id))}
                  aria-label={t(idioma, dentro ? "fitdraft.rutina.quitar" : "fitdraft.rutina.anadir", { nombre: nombreDe(entreno, id, idioma) })}
                  aria-pressed={dentro}
                  style={{
                    flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, minHeight: 36, padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: dentro ? "var(--green)" : "var(--green-soft)", color: dentro ? "#fff" : "var(--green-dark)", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700,
                  }}
                >
                  {dentro ? <><Check size={14} /> {t(idioma, "fitdraft.rutina.enRutina")}</> : <><Plus size={14} /> {t(idioma, "fitdraft.rutina.anadirCorto")}</>}
                </button>
              ) : (
                <ChevronRight size={16} color="var(--ink-soft)" style={{ flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>
      {!visibles.length && <TextoSuave>{t(idioma, "fitdraft.zona.vacia")}</TextoSuave>}
    </HojaInferior>
  );
}
