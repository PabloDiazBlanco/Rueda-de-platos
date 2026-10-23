// ---------- ui/entreno/ejercicios.jsx ----------
// «Ejercicios»: la biblioteca (diseño, §4.5). Buscador, filtros, favoritos, «mis ejercicios» y crear uno
// propio. Sin imágenes ni textos copiados de ninguna app: la biblioteca es propia. Tocar un ejercicio abre
// su ficha (ui/entreno/ficha.jsx desde la fase C; hasta entonces, la ficha mínima de este archivo).
import React, { useState, useMemo } from "react";
import { Plus, Star, Pencil, Archive } from "lucide-react";
import { t } from "i18n";
import { buscarEjercicios } from "entreno-ejercicios";
import { nombreEjercicio } from "entreno-nombres";
import { Field, inputStyle, ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { BotonSecundario, BotonTexto, TextoSuave, CapaCompleta, reloj } from "./comun.jsx";
import { FiltrosEjercicios, FilaEjercicio } from "./selector-ejercicio.jsx";
import { EditarEjercicio } from "./editar-ejercicio.jsx";

const DESCANSOS = [null, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300];

export function EjerciciosView({ entreno, idioma, onAbrir }) {
  const [texto, setTexto] = useState("");
  const [musculo, setMusculo] = useState(null);
  const [equipo, setEquipo] = useState(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [soloPropios, setSoloPropios] = useState(false);
  const [creando, setCreando] = useState(false);
  const [abierto, setAbierto] = useState(null); // id del ejercicio con la ficha mínima abierta

  const resultados = useMemo(
    () => buscarEjercicios(entreno.lista, texto, (e) => nombreEjercicio(e, idioma), { musculo, equipo, soloFavoritos, soloPropios }),
    [entreno.lista, texto, musculo, equipo, soloFavoritos, soloPropios, idioma]
  );
  const abrir = onAbrir || setAbierto;

  return (
    <div>
      <TextoSuave style={{ marginBottom: 12 }}>{t(idioma, "entreno.ejercicios.intro")}</TextoSuave>
      <FiltrosEjercicios
        idioma={idioma} texto={texto} setTexto={setTexto} musculo={musculo} setMusculo={setMusculo}
        equipo={equipo} setEquipo={setEquipo} soloFavoritos={soloFavoritos} setSoloFavoritos={setSoloFavoritos}
        soloPropios={soloPropios} setSoloPropios={setSoloPropios}
      />
      <BotonSecundario onClick={() => setCreando(true)} style={{ width: "100%", margin: "12px 0 6px" }}>
        <Plus size={15} /> {texto.trim() ? t(idioma, "entreno.ejercicios.crearConNombre", { nombre: texto.trim() }) : t(idioma, "entreno.ejercicios.crear")}
      </BotonSecundario>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {resultados.map((e) => <FilaEjercicio key={e.id} ejercicio={e} idioma={idioma} onClick={() => abrir(e.id)} />)}
      </div>
      {!resultados.length && <TextoSuave style={{ padding: "16px 4px" }}>{t(idioma, "entreno.ejercicios.sinResultados")}</TextoSuave>}

      {creando && (
        <EditarEjercicio
          entreno={entreno}
          idioma={idioma}
          nombreInicial={texto.trim()}
          onGuardado={(id) => { setCreando(false); setTexto(""); abrir(id); }}
          onUsarExistente={(id) => { setCreando(false); abrir(id); }}
          onCancelar={() => setCreando(false)}
        />
      )}
      {abierto && <FichaMinima entreno={entreno} idioma={idioma} id={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}

// Lo que el usuario puede cambiar de cualquier ejercicio (favorito, nota fija, descanso propio) y, si es
// suyo, editarlo o quitarlo de la biblioteca. Lo usan la ficha mínima y la ficha completa.
export function AjustesDeEjercicio({ entreno, idioma, ejercicio: e, onCerrar }) {
  const [nota, setNota] = useState(e.notaFija || "");
  const [editando, setEditando] = useState(false);
  const [archivar, setArchivar] = useState(false);
  return (
    <div>
      <BotonSecundario onClick={() => entreno.personalizar(e.id, { favorito: !e.favorito })} style={{ width: "100%", marginBottom: 12 }} aria-pressed={!!e.favorito}>
        <Star size={15} color="var(--mustard-dark)" fill={e.favorito ? "var(--mustard)" : "none"} />
        {t(idioma, e.favorito ? "entreno.ficha.quitarFavorito" : "entreno.ficha.marcarFavorito")}
      </BotonSecundario>
      <Field label={t(idioma, "entreno.ficha.notaFija")}>
        <input
          value={nota}
          onChange={(ev) => setNota(ev.target.value)}
          onBlur={() => entreno.personalizar(e.id, { notaFija: nota.trim() })}
          placeholder={t(idioma, "entreno.rutinas.notaPlaceholder")}
          style={{ ...inputStyle, minHeight: 44, fontSize: 16 }}
        />
        <TextoSuave style={{ fontSize: 11.5, marginTop: 4 }}>{t(idioma, "entreno.ficha.notaFijaAyuda")}</TextoSuave>
      </Field>
      <Field label={t(idioma, "entreno.ficha.descanso")}>
        <select
          value={e.descansoSeg ?? ""}
          onChange={(ev) => entreno.personalizar(e.id, { descansoSeg: ev.target.value === "" ? null : Number(ev.target.value) })}
          style={{ ...inputStyle, minHeight: 44 }}
        >
          {DESCANSOS.map((d) => <option key={String(d)} value={d ?? ""}>{d === null ? t(idioma, "entreno.rutinas.descansoDefecto", { t: reloj(entreno.ajustes.descansoSeg) }) : reloj(d)}</option>)}
        </select>
      </Field>
      {e.propio && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <BotonTexto onClick={() => setEditando(true)}><Pencil size={14} /> {t(idioma, "entreno.ficha.editar")}</BotonTexto>
          <BotonTexto onClick={() => setArchivar(true)} color="var(--rust)"><Archive size={14} /> {t(idioma, "entreno.ficha.archivar")}</BotonTexto>
        </div>
      )}
      {editando && (
        <EditarEjercicio entreno={entreno} idioma={idioma} ejercicio={e} onGuardado={() => setEditando(false)} onCancelar={() => setEditando(false)} />
      )}
      {archivar && (
        <ModalShell title={t(idioma, "entreno.ficha.archivar")} onClose={() => setArchivar(false)}>
          <TextoSuave style={{ marginBottom: 16 }}>{t(idioma, "entreno.ficha.archivarTexto")}</TextoSuave>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <ModalBtn variant="ghost" onClick={() => setArchivar(false)}>{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn variant="danger" onClick={() => { entreno.archivarPropio(e.id); setArchivar(false); if (onCerrar) onCerrar(); }}>{t(idioma, "entreno.ficha.archivar")}</ModalBtn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Datos fijos de un ejercicio: músculos, equipo y qué se anota.
export function DatosEjercicio({ ejercicio: e, idioma }) {
  const fila = (etiqueta, valor) => (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--line)", fontFamily: FUENTE_TEXTO, fontSize: 13.5 }}>
      <span style={{ width: 120, flexShrink: 0, color: "var(--ink-soft)" }}>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
  return (
    <div style={{ marginBottom: 16 }}>
      {fila(t(idioma, "entreno.ficha.principal"), <b style={{ color: "var(--green-dark)" }}>{t(idioma, "musculo." + e.musculo)}</b>)}
      {fila(t(idioma, "entreno.ficha.secundarios"), (e.secundarios || []).length ? e.secundarios.map((m) => t(idioma, "musculo." + m)).join(", ") : "—")}
      {fila(t(idioma, "entreno.ejercicios.equipo"), t(idioma, "equipo." + e.equipo))}
      {fila(t(idioma, "entreno.ejercicios.tipo"), t(idioma, "tipoEjercicio." + e.tipo))}
    </div>
  );
}

function FichaMinima({ entreno, idioma, id, onCerrar }) {
  const e = entreno.ejercicioDe(id);
  if (!e) return null;
  return (
    <CapaCompleta titulo={nombreEjercicio(e, idioma)} onCerrar={onCerrar} icono="volver" idioma={idioma}>
      <DatosEjercicio ejercicio={e} idioma={idioma} />
      <AjustesDeEjercicio entreno={entreno} idioma={idioma} ejercicio={e} onCerrar={onCerrar} />
    </CapaCompleta>
  );
}
