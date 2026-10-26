// ---------- ui/cuerpo/periodo.jsx ----------
// «Período» (I1, 25-oct-2026): pestaña del área Cuerpo que solo sale si el perfil tiene sexo femenino. Un
// calendario sencillo del mes donde se marcan los días de regla y los días con relaciones, y la fecha prevista
// del siguiente inicio (logica/periodo.js, con sus casos en validacion/). Gratis.
//
// **Los datos solo viven en este dispositivo** (localStorage), nunca en la cuenta ni en la nube: decisión del
// usuario por lo íntimo del dato; se pierden al cambiar de móvil o al borrar los datos del navegador, y así se
// dice. La clave lleva el identificador de la cuenta (window.cuentaId, que pone auth-bootstrap.jsx), para que
// otra cuenta que inicie sesión en el mismo móvil no los vea. Es informativo, no un método anticonceptivo.
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Droplet, Heart, Lock, Info } from "lucide-react";
import { t } from "i18n";
import { periodoVacio, migrarPeriodo, alternarDia, prediccionPeriodo } from "periodo";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { nombreMes, DIAS_CORTOS, fechaDia } from "../entreno/comun.jsx";

const claveLocal = () => `fooddraft:periodo-v1:${window.cuentaId || "sin-cuenta"}`;
function leer() {
  try { return migrarPeriodo(JSON.parse(localStorage.getItem(claveLocal()) || "null")); } catch (e) { return periodoVacio(); }
}
// Lo leen también los informes cruzados y el constructor, que calculan las fases del ciclo **en el móvil** con
// esto (ui/cuerpo/graficas.jsx, useSerieCuerpo); nunca se sube ni se guarda en otro sitio.
export const leerPeriodoLocal = () => leer();
function guardar(p) {
  try { localStorage.setItem(claveLocal(), JSON.stringify(p)); } catch (e) { /* sin localStorage no se guarda; se avisa abajo */ }
}

const dos = (n) => String(n).padStart(2, "0");
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`; };
function sumarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 15);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`;
}

export function PeriodoView({ perfil, idioma }) {
  const [periodo, setPeriodo] = useState(leer);
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [modo, setModo] = useState("regla"); // qué marca un toque: «regla» o «relaciones»
  const prediccion = prediccionPeriodo(periodo);

  if (!perfil || perfil.sexo !== "mujer") {
    return <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink-soft)", maxWidth: 480 }}>{t(idioma, "periodo.soloMujer")}</div>;
  }

  function tocar(fecha) {
    const nuevo = alternarDia(periodo, modo, fecha);
    setPeriodo(nuevo);
    guardar(nuevo);
  }

  // Calendario del mes, con la semana empezando en lunes.
  const [a, m] = mes.split("-").map(Number);
  const diasMes = new Date(a, m, 0).getDate();
  const huecos = (new Date(a, m - 1, 1).getDay() + 6) % 7;
  const celdas = [...Array(huecos).fill(null), ...Array.from({ length: diasMes }, (_, i) => `${mes}-${dos(i + 1)}`)];
  const regla = new Set(periodo.regla);
  const relaciones = new Set(periodo.relaciones);
  const hoy = hoyISO();
  const flecha = { width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--green-dark)" };
  const botonModo = (clave, Icono, texto) => (
    <button
      onClick={() => setModo(clave)}
      aria-pressed={modo === clave}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700,
        padding: "9px 10px", borderRadius: 20, border: "1px solid var(--line)", cursor: "pointer",
        background: modo === clave ? "var(--berry)" : "var(--card)", color: modo === clave ? "#fff" : "var(--ink)",
      }}
    >
      <Icono size={14} /> {texto}
    </button>
  );

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", marginBottom: 12, fontFamily: FUENTE_TEXTO }}>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t(idioma, "periodo.siguiente")}</div>
        {prediccion ? (
          <>
            <div style={{ fontFamily: FUENTE_TITULOS, fontSize: 22, color: "var(--berry)", margin: "2px 0" }}>{fechaDia(prediccion.fecha + "T12:00:00", idioma)}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45 }}>
              {t(idioma, prediccion.base === "dos" ? "periodo.basadoDos" : "periodo.basadoUno", { n: prediccion.ciclo })}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 2 }}>{t(idioma, "periodo.sinDatos")}</div>
        )}
      </div>

      <div role="group" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {botonModo("regla", Droplet, t(idioma, "periodo.modoRegla"))}
        {botonModo("relaciones", Heart, t(idioma, "periodo.modoRelaciones"))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <button onClick={() => setMes(sumarMes(mes, -1))} aria-label={t(idioma, "entreno.historial.mesAnterior")} style={flecha}><ChevronLeft size={20} /></button>
        <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{nombreMes(mes, idioma)}</h2>
        <button onClick={() => setMes(sumarMes(mes, 1))} aria-label={t(idioma, "entreno.historial.mesSiguiente")} style={flecha}><ChevronRight size={20} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontFamily: FUENTE_TEXTO }}>
        {(DIAS_CORTOS[idioma] || DIAS_CORTOS.es).map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", padding: "2px 0" }}>{d}</div>
        ))}
        {celdas.map((f, i) => {
          if (!f) return <div key={"h" + i} />;
          const esRegla = regla.has(f);
          const esPrevisto = prediccion && prediccion.fecha === f;
          return (
            <button
              key={f}
              onClick={() => tocar(f)}
              aria-label={[fechaDia(f + "T12:00:00", idioma), esRegla && t(idioma, "periodo.modoRegla"), relaciones.has(f) && t(idioma, "periodo.modoRelaciones"), esPrevisto && t(idioma, "periodo.previsto")].filter(Boolean).join(", ")}
              aria-pressed={esRegla || relaciones.has(f)}
              style={{
                position: "relative", aspectRatio: "1 / 1", minHeight: 40, borderRadius: 10, cursor: "pointer",
                border: esPrevisto ? "2px dashed var(--berry)" : f === hoy ? "2px solid var(--green)" : "1px solid var(--line)",
                background: esRegla ? "var(--berry)" : "var(--card)", color: esRegla ? "#fff" : "var(--ink)",
                fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: f === hoy ? 700 : 500,
              }}
            >
              {Number(f.slice(8))}
              {relaciones.has(f) && (
                <Heart size={10} fill={esRegla ? "#fff" : "var(--berry)"} color={esRegla ? "#fff" : "var(--berry)"} style={{ position: "absolute", right: 3, bottom: 3 }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", margin: "10px 2px 14px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--berry)" }} /> {t(idioma, "periodo.modoRegla")}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Heart size={11} fill="var(--berry)" color="var(--berry)" /> {t(idioma, "periodo.modoRelaciones")}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: "2px dashed var(--berry)" }} /> {t(idioma, "periodo.previsto")}</span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: FUENTE_TEXTO, fontSize: 12, lineHeight: 1.5, color: "var(--ink)", background: "var(--berry-soft)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t(idioma, "periodo.aviso")}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: FUENTE_TEXTO, fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)", padding: "4px 12px" }}>
        <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{t(idioma, "periodo.privacidad")}</span>
      </div>
    </div>
  );
}
