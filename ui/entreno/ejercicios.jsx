// ---------- ui/entreno/ejercicios.jsx ----------
// «Ejercicios»: la biblioteca (diseño, §4.5). Buscador, filtros, favoritos, «mis ejercicios» y crear uno
// propio. Sin imágenes ni textos copiados de ninguna app: la biblioteca es propia.
import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { t } from "i18n";
import { buscarEjercicios } from "entreno-ejercicios";
import { nombreEjercicio } from "entreno-nombres";
import { BotonSecundario, TextoSuave } from "./comun.jsx";
import { FiltrosEjercicios, FilaEjercicio } from "./selector-ejercicio.jsx";
import { EditarEjercicio } from "./editar-ejercicio.jsx";

export function EjerciciosView({ entreno, idioma, onAbrir }) {
  const [texto, setTexto] = useState("");
  const [musculo, setMusculo] = useState(null);
  const [equipo, setEquipo] = useState(null);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [soloPropios, setSoloPropios] = useState(false);
  const [creando, setCreando] = useState(false);

  const resultados = useMemo(
    () => buscarEjercicios(entreno.lista, texto, (e) => nombreEjercicio(e, idioma), { musculo, equipo, soloFavoritos, soloPropios }),
    [entreno.lista, texto, musculo, equipo, soloFavoritos, soloPropios, idioma]
  );

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
        {resultados.map((e) => (
          <FilaEjercicio key={e.id} ejercicio={e} idioma={idioma} onClick={onAbrir ? () => onAbrir(e.id) : undefined} />
        ))}
      </div>
      {!resultados.length && <TextoSuave style={{ padding: "16px 4px" }}>{t(idioma, "entreno.ejercicios.sinResultados")}</TextoSuave>}

      {creando && (
        <EditarEjercicio
          entreno={entreno}
          idioma={idioma}
          nombreInicial={texto.trim()}
          onGuardado={(id) => { setCreando(false); setTexto(""); if (onAbrir) onAbrir(id); }}
          onUsarExistente={(id) => { setCreando(false); if (onAbrir) onAbrir(id); }}
          onCancelar={() => setCreando(false)}
        />
      )}
    </div>
  );
}
