// ---------- ui/onboarding/cuestionario.jsx ----------
// Cuestionario de catálogo del alta (la pantalla; la lógica vive en logica/cuestionario.js).
import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { t } from "i18n";
import { FOODS_SEED, CATEGORIAS_ALIMENTOS } from "datos-iniciales";
import { CUESTIONARIO_PROTEINAS, CUESTIONARIO_CARBOS, CUESTIONARIO_VERDURAS, CUESTIONARIO_GRASAS, EXCLUSIONES_DISPONIBLES, pasosCuestionario, NIVELES_FRECUENCIA, NIVELES_PESO, ARQUETIPOS_COMIDA_LIGERA, construirIngredientesDesdeCuestionario } from "cuestionario";
import { PasosIndicador } from "./asistente-perfil.jsx";

// ---------- Cuestionario de catálogo (Bloque 3 del rediseño, Tanda 3) ----------
// Se muestra justo después del asistente de perfil, solo la primera vez y solo si no se saltó el
// asistente de perfil (ver el porqué en RuedaDePlatos, junto a guardarPerfilInicial). Construye
// ingredients a partir de tarjetas elegidas con un toque — nunca hay que escribir nada ni meter un
// número a mano. "Saltar todo" está disponible en cualquier pantalla, no solo en la intro.
export function CatalogoOnboarding({ idioma, repartoComidas, onComplete, onSkipAll }) {
  const [fase, setFase] = useState("intro"); // "intro" | "paso" | "cierre"
  const [paso, setPaso] = useState(0);
  const [exclusiones, setExclusiones] = useState([]);
  const [frecuencias, setFrecuencias] = useState({});
  const [pesosCarbo, setPesosCarbo] = useState({});
  const [pesosVerdura, setPesosVerdura] = useState({});
  const [pesosGrasa, setPesosGrasa] = useState({});
  // Una selección independiente por cada comida ligera (Tanda 3: antes solo existía la de
  // desayuno). Misma forma en las tres: { [arquetipoKey]: { nivel: 1|2|3, grupos: { [índiceDeGrupo]: foodId[] } } }.
  const [desayunoSeleccion, setDesayunoSeleccion] = useState({});
  const [mediaMananaSeleccion, setMediaMananaSeleccion] = useState({});
  const [meriendaSeleccion, setMeriendaSeleccion] = useState({});

  const pasos = pasosCuestionario(repartoComidas);

  function estaExcluido(foodId) {
    return exclusiones.some((key) => EXCLUSIONES_DISPONIBLES.find((e) => e.key === key)?.foodIds.includes(foodId));
  }
  function alternarExclusion(key) {
    setExclusiones((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  function alternarSeleccion(setMapa, foodId, nivelInicial) {
    setMapa((prev) => {
      if (foodId in prev) {
        const resto = { ...prev };
        delete resto[foodId];
        return resto;
      }
      return { ...prev, [foodId]: nivelInicial };
    });
  }
  function ciclarNivel(setMapa, foodId) {
    setMapa((prev) => ({ ...prev, [foodId]: (prev[foodId] % 3) + 1 }));
  }

  // Genéricos: parametrizados por el setState de la comida ligera concreta (desayuno/media
  // mañana/merienda), para no triplicar la misma lógica tres veces (Tanda 3).
  function alternarArquetipoComidaLigera(setMapa, key) {
    setMapa((prev) => {
      if (prev[key]) {
        const { [key]: _omitido, ...resto } = prev;
        return resto;
      }
      return { ...prev, [key]: { nivel: 2, grupos: {} } };
    });
  }
  function ciclarNivelArquetipoComidaLigera(setMapa, key) {
    setMapa((prev) => ({ ...prev, [key]: { ...prev[key], nivel: (prev[key].nivel % 3) + 1 } }));
  }
  function alternarFoodEnGrupoComidaLigera(setMapa, arqKey, grupoIdx, foodId, multiSelect) {
    setMapa((prev) => {
      const arq = prev[arqKey];
      if (!arq) return prev;
      const actual = arq.grupos[grupoIdx] || [];
      const nuevo = multiSelect
        ? (actual.includes(foodId) ? actual.filter((f) => f !== foodId) : [...actual, foodId])
        : (actual.includes(foodId) ? [] : [foodId]);
      return { ...prev, [arqKey]: { ...arq, grupos: { ...arq.grupos, [grupoIdx]: nuevo } } };
    });
  }

  function siguiente() {
    if (paso === pasos.length - 1) setFase("cierre");
    else setPaso((p) => p + 1);
  }
  function confirmarCierre() {
    onComplete(construirIngredientesDesdeCuestionario({
      frecuencias, pesosCarbo, pesosVerdura, pesosGrasa,
      comidasLigeras: { desayuno: desayunoSeleccion, media_manana: mediaMananaSeleccion, merienda: meriendaSeleccion },
    }));
  }

  if (fase === "intro") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🥗</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "var(--green-dark)", margin: "0 0 12px" }}>
          {t(idioma, "cuestionario.intro.titulo")}
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 26px" }}>
          {t(idioma, "cuestionario.intro.texto", { n: pasos.length })}
        </p>
        <button
          onClick={() => setFase("paso")}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "cuestionario.intro.empezar")}
        </button>
        <button
          onClick={onSkipAll}
          style={{
            width: "100%", marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "cuestionario.saltarTodo")}
        </button>
      </div>
    );
  }

  if (fase === "cierre") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>✅</div>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 22, color: "var(--green-dark)", margin: "0 0 12px" }}>
          {t(idioma, "cuestionario.cierre.titulo")}
        </h1>
        <p style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6, margin: "0 0 26px" }}>
          {t(idioma, "cuestionario.cierre.texto")}
        </p>
        <button
          onClick={confirmarCierre}
          style={{
            width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
            color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
          }}
        >
          {t(idioma, "cuestionario.cierre.entrar")}
        </button>
      </div>
    );
  }

  // fase === "paso": Exclusiones (chips simples) + 4 de selección con tarjetas
  // (SeleccionAlimentosStep) + hasta 3 pasos de comida ligera (SeleccionComidaLigeraStep: desayuno
  // desde la Tanda 2, media mañana y merienda desde la Tanda 3), cada uno solo si esa comida está en
  // el reparto elegido. Las exclusiones elegidas en el paso 0 filtran las opciones de todos los
  // pasos siguientes, incluidos los de comida ligera.
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <PasosIndicador pasoActual={paso} pasos={pasos} idioma={idioma} labelPrefix="cuestionario.paso" />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px" }}>
        {paso === 0 && (
          <>
            <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              {t(idioma, "cuestionario.exclusiones.titulo")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {EXCLUSIONES_DISPONIBLES.map((ex) => {
                const activo = exclusiones.includes(ex.key);
                return (
                  <button
                    key={ex.key}
                    onClick={() => alternarExclusion(ex.key)}
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, fontWeight: 600,
                      padding: "8px 13px", borderRadius: 20, border: "1px solid var(--line)",
                      background: activo ? "var(--rust-soft)" : "#fff", color: activo ? "var(--rust)" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {t(idioma, ex.labelKey)}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {paso === 1 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.proteinas.titulo"
            opciones={CUESTIONARIO_PROTEINAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={frecuencias}
            nivelLabels={NIVELES_FRECUENCIA}
            onToggle={(foodId) => alternarSeleccion(setFrecuencias, foodId, 1)}
            onCiclarNivel={(foodId) => ciclarNivel(setFrecuencias, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 2 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.carbohidratos.titulo"
            opciones={CUESTIONARIO_CARBOS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosCarbo}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosCarbo, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosCarbo, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 3 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.verduras.titulo"
            opciones={CUESTIONARIO_VERDURAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosVerdura}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosVerdura, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosVerdura, foodId)}
            idioma={idioma}
          />
        )}
        {paso === 4 && (
          <SeleccionAlimentosStep
            tituloKey="cuestionario.grasas.titulo"
            opciones={CUESTIONARIO_GRASAS.filter((o) => !estaExcluido(o.foodId))}
            seleccion={pesosGrasa}
            nivelLabels={NIVELES_PESO}
            onToggle={(foodId) => alternarSeleccion(setPesosGrasa, foodId, 2)}
            onCiclarNivel={(foodId) => ciclarNivel(setPesosGrasa, foodId)}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "desayuno" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.desayuno.titulo"
            seleccion={desayunoSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setDesayunoSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setDesayunoSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setDesayunoSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "media_manana" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.mediaManana.titulo"
            seleccion={mediaMananaSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setMediaMananaSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setMediaMananaSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setMediaMananaSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}
        {pasos[paso] === "merienda" && (
          <SeleccionComidaLigeraStep
            tituloKey="cuestionario.merienda.titulo"
            seleccion={meriendaSeleccion}
            onToggleArquetipo={(key) => alternarArquetipoComidaLigera(setMeriendaSeleccion, key)}
            onCiclarNivel={(key) => ciclarNivelArquetipoComidaLigera(setMeriendaSeleccion, key)}
            onToggleFood={(arqKey, gi, foodId, multi) => alternarFoodEnGrupoComidaLigera(setMeriendaSeleccion, arqKey, gi, foodId, multi)}
            estaExcluido={estaExcluido}
            idioma={idioma}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {paso > 0 && (
            <button
              onClick={() => setPaso((p) => p - 1)}
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
                color: "var(--ink)", background: "#fff", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", cursor: "pointer",
              }}
            >
              {t(idioma, "onboarding.atras")}
            </button>
          )}
          <button
            onClick={siguiente}
            style={{
              flex: 1, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 14, fontWeight: 700,
              color: "#fff", background: "var(--green)", border: "none", borderRadius: 9, padding: "12px", cursor: "pointer",
            }}
          >
            {paso === pasos.length - 1 ? t(idioma, "cuestionario.terminar") : t(idioma, "onboarding.siguiente")}
          </button>
        </div>
        <button
          onClick={onSkipAll}
          style={{
            width: "100%", marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12.5, color: "var(--ink-soft)",
            background: "transparent", border: "none", padding: "6px",
          }}
        >
          {t(idioma, "cuestionario.saltarTodo")}
        </button>
      </div>
    </div>
  );
}

// Fila seleccionable con nivel: tocar el nombre activa/desactiva el alimento; con el alimento
// activo aparece un chip aparte a la derecha que, al tocarlo, rota entre los 3 niveles (1/2/3 o
// Poco/Normal/Mucho, según nivelLabels) — nunca hay que escribir un número.
function SeleccionAlimentosStep({ tituloKey, opciones, seleccion, nivelLabels, onToggle, onCiclarNivel, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
        {t(idioma, tituloKey)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {opciones.map((opt) => {
          const nivel = seleccion[opt.foodId];
          const activo = nivel !== undefined;
          return (
            <div key={opt.foodId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => onToggle(opt.foodId)}
                style={{
                  flex: 1, textAlign: "left", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5, fontWeight: activo ? 700 : 500,
                  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)",
                  background: activo ? "var(--green-soft)" : "#fff", color: activo ? "var(--green-dark)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {t(idioma, opt.labelKey)}
              </button>
              {activo && (
                <button
                  onClick={() => onCiclarNivel(opt.foodId)}
                  style={{
                    flexShrink: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                    padding: "9px 10px", borderRadius: 8, border: "1px solid var(--green)", background: "#fff",
                    color: "var(--green-dark)", cursor: "pointer", minWidth: 60,
                  }}
                >
                  {t(idioma, nivelLabels[nivel - 1])}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Paso de comida ligera del cuestionario (Tanda 2, piloto solo para Desayuno; Tanda 3 reutiliza el
// mismo componente, sin cambios, también para Media mañana y Merienda — solo cambia `tituloKey` y
// qué selección/setState le pasa CatalogoOnboarding): en vez de una lista plana de alimentos,
// tarjetas de "arquetipo" (Tostadas, Cereales con lácteo, Plato combinado) que, al activarse,
// despliegan debajo su propia sub-selección por carpeta de CATEGORIAS_ALIMENTOS — una o dos guiadas
// en orden, o una libre entre varias a la vez.
// Los nombres de los alimentos se muestran tal cual están en la base de datos (en español, ver
// CLAUDE.md) — a diferencia de CUESTIONARIO_PROTEINAS y compañía, estas carpetas no tienen todavía
// una traducción propia por alimento; es una limitación conocida de este piloto, no un olvido.
function SeleccionComidaLigeraStep({ tituloKey, seleccion, onToggleArquetipo, onCiclarNivel, onToggleFood, estaExcluido, idioma }) {
  return (
    <>
      <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
        {t(idioma, tituloKey)}
      </div>
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: 11.5, color: "var(--mustard-dark)", background: "var(--mustard-soft)", borderRadius: 8,
          padding: "9px 11px", marginBottom: 14, lineHeight: 1.5,
        }}
      >
        <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t(idioma, "cuestionario.comidaLigera.aviso")}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ARQUETIPOS_COMIDA_LIGERA.map((arq) => {
          const arqSel = seleccion[arq.key];
          const activo = !!arqSel;
          return (
            <div
              key={arq.key}
              style={{
                border: "1px solid var(--line)", borderRadius: 10, padding: "10px 11px",
                background: activo ? "var(--green-soft)" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => onToggleArquetipo(arq.key)}
                  style={{
                    flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8, padding: 0,
                  }}
                >
                  <span style={{ fontSize: 19 }}>{arq.emoji}</span>
                  <span
                    style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13.5,
                      fontWeight: activo ? 700 : 500, color: activo ? "var(--green-dark)" : "var(--ink)",
                    }}
                  >
                    {t(idioma, arq.labelKey)}
                  </span>
                </button>
                {activo && (
                  <button
                    onClick={() => onCiclarNivel(arq.key)}
                    style={{
                      flexShrink: 0, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 11.5, fontWeight: 700,
                      padding: "8px 10px", borderRadius: 8, border: "1px solid var(--green)", background: "#fff",
                      color: "var(--green-dark)", cursor: "pointer", minWidth: 60,
                    }}
                  >
                    {t(idioma, NIVELES_PESO[arqSel.nivel - 1])}
                  </button>
                )}
              </div>

              {activo && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {arq.grupos.map((grupo, gi) => {
                    const opciones = FOODS_SEED.filter((f) => grupo.categorias.includes(f.categoria) && !estaExcluido(f.id));
                    if (!opciones.length) return null;
                    const elegidos = arqSel.grupos[gi] || [];
                    return (
                      <div key={gi}>
                        <div
                          style={{
                            fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 10.5, fontWeight: 700,
                            color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
                          }}
                        >
                          {t(idioma, grupo.labelKey)}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {opciones.map((food) => {
                            const marcado = elegidos.includes(food.id);
                            const catFood = CATEGORIAS_ALIMENTOS.find((c) => c.key === food.categoria);
                            return (
                              <button
                                key={food.id}
                                onClick={() => onToggleFood(arq.key, gi, food.id, grupo.multiSelect)}
                                style={{
                                  fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 12, fontWeight: 600,
                                  padding: "6px 10px", borderRadius: 20, border: "1px solid var(--line)",
                                  background: marcado ? "var(--green-dark)" : "#fff",
                                  color: marcado ? "#fff" : "var(--ink)", cursor: "pointer",
                                }}
                              >
                                {catFood?.emoji} {food.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
