// ---------- ui/entreno/discos.jsx ----------
// Calculadora de discos (opcional C10 del plan): en los ejercicios con barra, desde el ⋮ de la sesión,
// qué discos poner en cada lado para llegar al peso de la serie. Trabaja en la unidad elegida (barra de
// 20 kg y discos de 25 a 1,25 kg, o barra de 45 lb y discos de 45 a 2,5 lb). La cuenta está en
// discosPorLado (logica/entreno-calculo.js), con sus casos.
import React, { useState } from "react";
import { t } from "i18n";
import { discosPorLado, DISCOS_KG, DISCOS_LB } from "entreno-calculo";
import { inputStyle } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_MONO } from "../estilos.js";
import { HojaInferior, TextoSuave, formatoNumero, pesoAPantalla } from "./comun.jsx";

// Colores de los discos por tamaño (los del tema; los grandes, más oscuros).
const COLORES = ["var(--green-dark)", "var(--rust)", "var(--mustard-dark)", "var(--green)", "var(--olive)", "var(--berry)", "var(--coffee)"];

export function HojaDiscos({ kg, ajustes, idioma, onCerrar }) {
  const lb = ajustes.unidadPeso === "lb";
  const barra = lb ? 45 : 20;
  const discos = lb ? DISCOS_LB : DISCOS_KG;
  const [texto, setTexto] = useState(kg ? formatoNumero(pesoAPantalla(kg, ajustes.unidadPeso), idioma).replace(/\s/g, "") : "");
  const objetivo = Number(String(texto).trim().replace(",", ".")) || 0;
  const r = discosPorLado(objetivo, barra, discos);
  const unidad = ajustes.unidadPeso;
  const maxD = discos[0];
  return (
    <HojaInferior titulo={t(idioma, "entreno.discos.titulo")} onCerrar={onCerrar} idioma={idioma}>
      <label style={{ display: "block", fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 4 }}>
        {t(idioma, "entreno.discos.peso", { unidad })}
      </label>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} inputMode="decimal" onFocus={(e) => e.target.select()} style={{ ...inputStyle, minHeight: 44, fontSize: 18, fontFamily: FUENTE_MONO }} />
      <TextoSuave style={{ fontSize: 12, margin: "6px 0 12px" }}>{t(idioma, "entreno.discos.barra", { barra: `${barra} ${unidad}` })}</TextoSuave>
      {!r.posible ? (
        <TextoSuave>{t(idioma, "entreno.discos.menosQueBarra")}</TextoSuave>
      ) : (
        <>
          {/* Dibujo de un lado de la barra, del centro hacia fuera. */}
          <svg viewBox="0 0 300 90" width="100%" height="90" role="img" aria-label={t(idioma, "entreno.discos.porLado", { discos: r.porLado.map((d) => formatoNumero(d, idioma)).join(" + ") || "—", unidad })}>
            <rect x="0" y="40" width="300" height="10" rx="3" fill="var(--line)" />
            <rect x="8" y="30" width="10" height="30" rx="2" fill="var(--ink-soft)" />
            {r.porLado.reduce((acc, d, i) => {
              const x = acc.x;
              const alto = 24 + (d / maxD) * 60;
              acc.el.push(<rect key={i} x={x} y={45 - alto / 2} width="14" height={alto} rx="3" fill={COLORES[discos.indexOf(d)] || "var(--green)"} />);
              acc.x += 17;
              return acc;
            }, { x: 22, el: [] }).el}
          </svg>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 15, fontWeight: 700, marginTop: 6 }}>
            {r.porLado.length ? t(idioma, "entreno.discos.porLado", { discos: r.porLado.map((d) => formatoNumero(d, idioma)).join(" + "), unidad }) : t(idioma, "entreno.discos.soloBarra")}
          </div>
          {r.resto > 0 && <TextoSuave style={{ marginTop: 4 }}>{t(idioma, "entreno.discos.resto", { total: `${formatoNumero(r.total, idioma)} ${unidad}`, resto: `${formatoNumero(r.resto, idioma)} ${unidad}` })}</TextoSuave>}
        </>
      )}
    </HojaInferior>
  );
}
