// ---------- ui/entreno/selector-ejercicio.jsx ----------
// Elegir ejercicios de la biblioteca: buscador que ignora tildes y tolera una errata, filtros por
// músculo y equipo, favoritos y «mis ejercicios», y crear uno propio sin salir de aquí (diseño, §4.5).
// Con `multiple` (añadir a la sesión o a una rutina) se marcan varios y se añaden de una vez; sin él
// (sustituir solo hoy) basta con tocar uno.
import React, { useState, useMemo } from "react";
import { Search, Star, Check, Plus, User } from "lucide-react";
import { t } from "i18n";
import { GRUPOS_MUSCULARES, EQUIPOS, buscarEjercicios } from "entreno-ejercicios";
import { nombreEjercicio } from "entreno-nombres";
import { inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { CapaCompleta, BotonPrincipal, BotonTexto, Chip, TextoSuave } from "./comun.jsx";
import { EditarEjercicio } from "./editar-ejercicio.jsx";

export function SelectorEjercicio({ entreno, idioma, titulo, multiple = true, onElegir, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [musculo, setMusculo] = useState(null);
  const [equipo, setEquipo] = useState(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [soloPropios, setSoloPropios] = useState(false);
  const [elegidos, setElegidos] = useState([]);
  const [creando, setCreando] = useState(false);

  const nombre = (e) => nombreEjercicio(e, idioma);
  const resultados = useMemo(
    () => buscarEjercicios(entreno.lista, texto, nombre, { musculo, equipo, soloFavoritos, soloPropios }),
    [entreno.lista, texto, musculo, equipo, soloFavoritos, soloPropios, idioma]
  );

  function tocar(id) {
    if (!multiple) {
      onElegir([id]);
      return;
    }
    setElegidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  if (creando) {
    return (
      <EditarEjercicio
        entreno={entreno}
        idioma={idioma}
        nombreInicial={texto}
        onGuardado={(id) => {
          setCreando(false);
          setTexto("");
          if (multiple) setElegidos((l) => [...l, id]);
          else onElegir([id]);
        }}
        onUsarExistente={(id) => {
          setCreando(false);
          tocar(id);
        }}
        onCancelar={() => setCreando(false)}
      />
    );
  }

  return (
    <CapaCompleta
      titulo={titulo || t(idioma, "entreno.ejercicios.elegirTitulo")}
      onCerrar={onCerrar}
      idioma={idioma}
      pie={multiple && (
        <BotonPrincipal disabled={!elegidos.length} onClick={() => onElegir(elegidos)}>
          {elegidos.length ? t(idioma, "entreno.ejercicios.anadirN", { n: elegidos.length }) : t(idioma, "entreno.ejercicios.anadir")}
        </BotonPrincipal>
      )}
    >
      <FiltrosEjercicios
        idioma={idioma} texto={texto} setTexto={setTexto} musculo={musculo} setMusculo={setMusculo}
        equipo={equipo} setEquipo={setEquipo} soloFavoritos={soloFavoritos} setSoloFavoritos={setSoloFavoritos}
        soloPropios={soloPropios} setSoloPropios={setSoloPropios} autoFocus
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
        {resultados.map((e) => (
          <FilaEjercicio key={e.id} ejercicio={e} idioma={idioma} elegido={elegidos.includes(e.id)} multiple={multiple} onClick={() => tocar(e.id)} />
        ))}
      </div>
      {!resultados.length && <TextoSuave style={{ padding: "16px 4px" }}>{t(idioma, "entreno.ejercicios.sinResultados")}</TextoSuave>}

      <div style={{ marginTop: 12 }}>
        <BotonTexto onClick={() => setCreando(true)}>
          <Plus size={15} /> {texto.trim() ? t(idioma, "entreno.ejercicios.crearConNombre", { nombre: texto.trim() }) : t(idioma, "entreno.ejercicios.crear")}
        </BotonTexto>
      </div>
    </CapaCompleta>
  );
}

// Buscador y filtros (los usa también la biblioteca, ui/entreno/ejercicios.jsx).
export function FiltrosEjercicios({ idioma, texto, setTexto, musculo, setMusculo, equipo, setEquipo, soloFavoritos, setSoloFavoritos, soloPropios, setSoloPropios, autoFocus }) {
  return (
    <div>
      <div style={{ position: "relative" }}>
        <Search size={16} color="var(--ink-soft)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t(idioma, "entreno.ejercicios.buscar")}
          aria-label={t(idioma, "entreno.ejercicios.buscar")}
          autoFocus={autoFocus}
          style={{ ...inputStyle, paddingLeft: 34, minHeight: 44, fontSize: 16 }}
        />
      </div>
      {/* Músculos en fila desplazable: caben todos sin ocupar media pantalla. */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 0 4px" }}>
        <Chip activo={!musculo} onClick={() => setMusculo(null)}>{t(idioma, "entreno.ejercicios.todos")}</Chip>
        {GRUPOS_MUSCULARES.map((m) => (
          <Chip key={m} activo={musculo === m} onClick={() => setMusculo(musculo === m ? null : m)}>{t(idioma, "musculo." + m)}</Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingTop: 4 }}>
        <select
          value={equipo || ""}
          onChange={(e) => setEquipo(e.target.value || null)}
          aria-label={t(idioma, "entreno.ejercicios.equipo")}
          style={{ ...inputStyle, width: "auto", minHeight: 34, padding: "5px 8px", fontSize: 13 }}
        >
          <option value="">{t(idioma, "entreno.ejercicios.todosEquipos")}</option>
          {EQUIPOS.map((q) => <option key={q} value={q}>{t(idioma, "equipo." + q)}</option>)}
        </select>
        <Chip activo={soloFavoritos} onClick={() => setSoloFavoritos(!soloFavoritos)}><Star size={12} style={{ verticalAlign: "-1px" }} /> {t(idioma, "entreno.ejercicios.favoritos")}</Chip>
        <Chip activo={soloPropios} onClick={() => setSoloPropios(!soloPropios)}><User size={12} style={{ verticalAlign: "-1px" }} /> {t(idioma, "entreno.ejercicios.mios")}</Chip>
      </div>
    </div>
  );
}

export function FilaEjercicio({ ejercicio: e, idioma, elegido, multiple, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={multiple ? !!elegido : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 52, padding: "8px 10px",
        textAlign: "left", cursor: "pointer", borderRadius: 8, border: "none",
        background: elegido ? "var(--green-soft)" : "transparent", fontFamily: FUENTE_TEXTO,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreEjercicio(e, idioma)}</span>
          {e.favorito && <Star size={12} color="var(--mustard-dark)" fill="var(--mustard)" style={{ flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>
          {[t(idioma, "musculo." + e.musculo), t(idioma, "equipo." + e.equipo), e.propio && t(idioma, "entreno.ejercicios.propio")].filter(Boolean).join(" · ")}
        </div>
      </div>
      {multiple && (
        <span
          aria-hidden="true"
          style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${elegido ? "var(--green)" : "var(--line)"}`, background: elegido ? "var(--green)" : "transparent",
          }}
        >
          {elegido && <Check size={14} color="#fff" />}
        </span>
      )}
    </button>
  );
}
