// ---------- ui/entreno/importar.jsx ----------
// Importar entrenos de Hevy o de Lyfta (G10, 25-oct-2026), dentro de Ajustes → Entrenamiento: elegir el CSV
// exportado, ver un resumen antes de nada (cuántos entrenos, desde cuándo, cuántos ya estaban y no se
// repiten, qué ejercicios se reconocen y cuáles se crearán como propios, con la opción de usar uno de la
// biblioteca en su lugar) e importar. Cada importación se puede deshacer entera. La lectura y el
// emparejamiento están en logica/entreno-importar.js; el guardado (por meses, reconstruyendo el índice), en
// el hook (ui/estado/entreno.js).
import React, { useState, useRef } from "react";
import { Upload, Undo2 } from "lucide-react";
import { t } from "i18n";
import { prepararImportacion, construirImportacion } from "entreno-importar";
import { nombresParaEmparejar } from "entreno-nombres";
import { fechaLocal } from "entreno-calculo";
import { inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";
import { CapaCompleta, BotonPrincipal, BotonSecundario, BotonTexto, TextoSuave, nombreDe, localeDe } from "./comun.jsx";

const NOMBRE_APP = { hevy: "Hevy", lyfta: "Lyfta" };
// «14 jun 2026»: con año, porque una importación puede abarcar varios.
const fechaConAnio = (iso, idioma) => new Intl.DateTimeFormat(localeDe(idioma), { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function ImportarEntrenos({ entreno, idioma }) {
  const entrada = useRef(null);
  const [estado, setEstado] = useState(""); // texto de estado o de error
  const [prep, setPrep] = useState(null);
  const [decisiones, setDecisiones] = useState({});
  const [trabajando, setTrabajando] = useState(false);
  const importaciones = (entreno.catalogo && entreno.catalogo.importaciones) || [];

  async function alElegir(e) {
    const archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    setEstado(t(idioma, "entreno.importar.leyendo"));
    try {
      const texto = await archivo.text();
      // Lo que ya hay (todos los meses y la cola), para no duplicar al reimportar.
      const docs = await entreno.cargarTodosLosMeses();
      const existentes = [...docs.flatMap((d) => d.sesiones || []), ...entreno.cola];
      const p = prepararImportacion(texto, { lista: entreno.lista, nombresDe: nombresParaEmparejar, existentes });
      if (!p) { setEstado(t(idioma, "entreno.importar.noReconocido")); return; }
      setDecisiones({});
      setPrep(p);
      setEstado("");
    } catch (err) {
      setEstado(t(idioma, "entreno.importar.error"));
    }
  }

  async function importar() {
    setTrabajando(true);
    try {
      const resultado = construirImportacion(prep, { decisiones, hoy: fechaLocal(Date.now()) });
      await entreno.importar(resultado, prep.formato);
      setEstado(t(idioma, resultado.sesiones.length === 1 ? "entreno.importar.hechoUno" : "entreno.importar.hecho", { n: resultado.sesiones.length, app: NOMBRE_APP[prep.formato] }));
      setPrep(null);
    } catch (err) {
      setEstado(t(idioma, "entreno.importar.error"));
    } finally {
      setTrabajando(false);
    }
  }

  async function deshacer(lote) {
    setTrabajando(true);
    try {
      await entreno.deshacerImportacion(lote);
      setEstado(t(idioma, "entreno.importar.deshecho"));
    } catch (err) {
      setEstado(t(idioma, "entreno.importar.error"));
    } finally {
      setTrabajando(false);
    }
  }

  const nuevos = prep ? prep.ejercicios.filter((x) => !x.ejercicioId) : [];
  const reconocidos = prep ? prep.ejercicios.filter((x) => x.ejercicioId) : [];
  const biblioteca = [...entreno.lista].sort((a, b) => nombreDe(entreno, a.id, idioma).localeCompare(nombreDe(entreno, b.id, idioma)));

  return (
    <div style={{ marginTop: 14 }}>
      <BotonSecundario onClick={() => entrada.current && entrada.current.click()} disabled={trabajando}>
        <Upload size={14} /> {t(idioma, "entreno.importar.boton")}
      </BotonSecundario>
      <input ref={entrada} type="file" accept=".csv,text/csv" onChange={alElegir} style={{ display: "none" }} />
      <TextoSuave style={{ fontSize: 12, marginTop: 4 }}>{t(idioma, "entreno.importar.ayuda")}</TextoSuave>
      {estado && <div role="status"><TextoSuave style={{ marginTop: 8, color: "var(--green-dark)", fontWeight: 600 }}>{estado}</TextoSuave></div>}

      {importaciones.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {importaciones.map((imp) => (
            <div key={imp.lote} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FUENTE_TEXTO, fontSize: 12.5, padding: "4px 0" }}>
              <span style={{ flex: 1 }}>{t(idioma, "entreno.importar.lote", { app: NOMBRE_APP[imp.app] || imp.app, n: imp.sesiones, fecha: imp.fecha })}</span>
              <BotonTexto onClick={() => deshacer(imp.lote)} color="var(--rust)" disabled={trabajando}>
                <Undo2 size={13} /> {t(idioma, "entreno.importar.deshacer")}
              </BotonTexto>
            </div>
          ))}
        </div>
      )}

      {prep && (
        <CapaCompleta
          titulo={t(idioma, "entreno.importar.titulo", { app: NOMBRE_APP[prep.formato] })}
          onCerrar={() => setPrep(null)}
          idioma={idioma}
          pie={
            <BotonPrincipal onClick={importar} disabled={trabajando || !prep.entrenos.length}>
              {trabajando ? t(idioma, "entreno.importar.importando") : t(idioma, prep.entrenos.length === 1 ? "entreno.importar.confirmarUno" : "entreno.importar.confirmar", { n: prep.entrenos.length })}
            </BotonPrincipal>
          }
        >
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 14, lineHeight: 1.6 }}>
            {prep.entrenos.length ? (
              <>
                <div>{t(idioma, prep.entrenos.length === 1 ? "entreno.importar.resumenUno" : "entreno.importar.resumen", { n: prep.entrenos.length, series: prep.series })}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  {t(idioma, "entreno.importar.fechas", { desde: fechaConAnio(prep.desde, idioma), hasta: fechaConAnio(prep.hasta, idioma) })}
                </div>
              </>
            ) : (
              <div>{t(idioma, "entreno.importar.nadaNuevo")}</div>
            )}
            {prep.repetidos > 0 && <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{t(idioma, "entreno.importar.repetidos", { n: prep.repetidos })}</div>}
          </div>

          {prep.entrenos.length > 0 && (
            <>
              <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)", margin: "16px 0 6px" }}>
                {t(idioma, "entreno.importar.reconocidos", { n: reconocidos.length })}
              </div>
              <TextoSuave style={{ fontSize: 12.5 }}>
                {reconocidos.map((x) => `${x.nombre} → ${nombreDe(entreno, x.ejercicioId, idioma)}`).join(" · ") || "—"}
              </TextoSuave>

              {nuevos.length > 0 && (
                <>
                  <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)", margin: "16px 0 4px" }}>
                    {t(idioma, "entreno.importar.nuevos", { n: nuevos.length })}
                  </div>
                  <TextoSuave style={{ fontSize: 12, marginBottom: 8 }}>{t(idioma, "entreno.importar.nuevosAyuda")}</TextoSuave>
                  {nuevos.map((x) => (
                    <label key={x.nombre} style={{ display: "block", marginBottom: 10, fontFamily: FUENTE_TEXTO, fontSize: 13 }}>
                      <span style={{ fontWeight: 600 }}>{x.nombre}</span>
                      <span style={{ color: "var(--ink-soft)", fontSize: 12 }}> · {t(idioma, "entreno.importar.series", { n: x.series })}</span>
                      <select
                        value={decisiones[x.nombre] || "nuevo"}
                        onChange={(e) => setDecisiones((d) => ({ ...d, [x.nombre]: e.target.value }))}
                        style={{ ...inputStyle, marginTop: 4, minHeight: 40 }}
                      >
                        <option value="nuevo">{t(idioma, "entreno.importar.crearPropio")}</option>
                        {x.sugerencia && <option value={x.sugerencia}>{t(idioma, "entreno.importar.usarParecido", { nombre: nombreDe(entreno, x.sugerencia, idioma) })}</option>}
                        {biblioteca.filter((e) => e.id !== x.sugerencia).map((e) => <option key={e.id} value={e.id}>{nombreDe(entreno, e.id, idioma)}</option>)}
                      </select>
                    </label>
                  ))}
                </>
              )}
              <TextoSuave style={{ fontSize: 12, marginTop: 12 }}>{t(idioma, "entreno.importar.notas")}</TextoSuave>
            </>
          )}
        </CapaCompleta>
      )}
    </div>
  );
}
