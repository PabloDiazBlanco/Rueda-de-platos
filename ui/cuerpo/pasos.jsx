// ---------- ui/cuerpo/pasos.jsx ----------
// Pasos de hoy (26-oct-2026), dentro de Actividad diaria (destino `actividad-diaria`; gratis). Es la opción A
// de la maqueta local/ideas/esteticas/v3-06-sueno-pasos.html **sin el interruptor «Apuntar pasos»**: el campo
// está siempre a la vista, con −1000 y +1000 a los lados, y vacío quiere decir «sin dato» (no «0 pasos»).
// Debajo, las barras de la semana y el enlace al constructor (premium) para cruzarlos con lo demás. A mano;
// más adelante podrían leerse del reloj o de Health Connect. Se guardan en el diario del cuerpo
// (logica/cuerpo-diario.js). Son solo un dato para los informes: no cambian el gasto de Actividad diaria.
import React, { useState, useEffect } from "react";
import { Link2, ChevronRight } from "lucide-react";
import { t } from "i18n";
import { PASOS_MAX } from "cuerpo-diario";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { fechaDia, DIAS_CORTOS, formatoNumero } from "../entreno/comun.jsx";

const ESCALA_BARRAS = 14000; // una barra llena = 14.000 pasos (los días con más se cortan arriba)

export function PasosHoy({ cuerpo, idioma, navegar }) {
  const hoy = cuerpo.hoy();
  const guardados = cuerpo.diario && cuerpo.diario.dias[hoy] ? cuerpo.diario.dias[hoy].pasos ?? null : null;
  const [texto, setTexto] = useState(guardados === null ? "" : formatoNumero(guardados, idioma, 0));
  useEffect(() => { setTexto(guardados === null ? "" : formatoNumero(guardados, idioma, 0)); }, [guardados, idioma]);
  if (!cuerpo.diario) return null;

  const leer = (s) => { const d = String(s).replace(/\D/g, ""); return d === "" ? null : Math.min(PASOS_MAX, Number(d)); };
  const guardar = (n) => cuerpo.apuntarPasos(n, hoy);
  const sumar = (k) => {
    const actual = leer(texto);
    if (actual === null && k < 0) return; // vacío sigue vacío: no se inventa un 0
    guardar(Math.max(0, (actual || 0) + k));
  };
  const semana = cuerpo.ultimosDias(7, hoy);
  const dias = DIAS_CORTOS[idioma] || DIAS_CORTOS.es;
  const boton = { border: "none", background: "var(--paper)", borderRadius: 10, minWidth: 64, height: 44, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)" };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", maxWidth: 480, marginTop: 14 }}>
      <h3 style={{ margin: "0 0 2px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 18, color: "var(--green-dark)" }}>{t(idioma, "cuerpo.pasos.titulo")}</h3>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.45 }}>{t(idioma, "cuerpo.pasos.ayuda")}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <button onClick={() => sumar(-1000)} aria-label={t(idioma, "cuerpo.pasos.menos")} style={boton}>−1000</button>
        <input
          inputMode="numeric" value={texto} placeholder={t(idioma, "cuerpo.pasos.vacio")}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => guardar(leer(texto))}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          aria-label={t(idioma, "cuerpo.pasos.deHoy")}
          style={{ flex: 1, minWidth: 0, textAlign: "center", fontFamily: FUENTE_TITULOS, fontSize: 24, border: "1px solid var(--line)", borderRadius: 10, padding: "5px", background: "var(--card)", color: "var(--ink)", height: 44 }}
        />
        <button onClick={() => sumar(1000)} aria-label={t(idioma, "cuerpo.pasos.mas")} style={boton}>+1000</button>
      </div>
      <div role="img" aria-label={t(idioma, "cuerpo.pasos.semanaAria", { lista: semana.map((d) => `${fechaDia(d.fecha + "T12:00:00", idioma)}: ${d.pasos === null ? "—" : formatoNumero(d.pasos, idioma, 0)}`).join(", ") })}
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, alignItems: "end", height: 84, marginTop: 10 }}>
        {semana.map((d) => {
          const dow = (new Date(d.fecha + "T12:00:00").getDay() + 6) % 7;
          return (
            <div key={d.fecha} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 3, height: "100%", fontFamily: FUENTE_TEXTO, fontSize: 10, color: d.fecha === hoy ? "var(--ink)" : "var(--ink-soft)", fontWeight: d.fecha === hoy ? 700 : 400 }}>
              <div style={{ width: "70%", maxWidth: 26, height: d.pasos !== null ? Math.max(3, (Math.min(d.pasos, ESCALA_BARRAS) / ESCALA_BARRAS) * 56) : 4, borderRadius: "6px 6px 3px 3px", background: d.pasos !== null ? "var(--green)" : "#e6e2d6" }} />
              <span>{dias[dow]}</span>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => navegar("cuerpo-constructor", { spec: { pregunta: "pesoPasos", forma: "relacion", huecos: { v1: "pasos", v2: "dPeso" }, periodo: "semana", vista: "a", tiempo: false } })}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "var(--green-soft)", border: "none", borderRadius: 12, padding: "11px 12px", marginTop: 10, fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)", textAlign: "left", minHeight: 44 }}
      >
        <Link2 size={15} /> <span style={{ flex: 1 }}>{t(idioma, "cuerpo.pasos.cruzar")}</span> <ChevronRight size={15} />
      </button>
    </div>
  );
}
