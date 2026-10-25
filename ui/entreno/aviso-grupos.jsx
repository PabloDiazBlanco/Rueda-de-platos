// ---------- ui/entreno/aviso-grupos.jsx ----------
// Aviso de grupos musculares sin entrenar (G8, 25-oct-2026): en «Entrenar», una tarjeta discreta con los
// grupos (pecho, espalda, pierna, hombros, brazos) que se entrenaban y llevan 3 semanas o más sin
// trabajarse. La ✕ la cierra y esos grupos no vuelven a salir en 14 días. La regla está en
// gruposSinEntrenar (logica/informes.js), con sus casos en validacion/. Esta tarjeta es la versión
// provisional y sencilla: la ilustración (la telaraña y el bocadillo de la idea original) es de la parte
// estética y sustituirá a este componente sin tocar la regla.
import React from "react";
import { X } from "lucide-react";
import { t } from "i18n";
import { ultimaVezPorGrupo, gruposSinEntrenar } from "informes";
import { fechaLocal } from "entreno-calculo";
import { FUENTE_TEXTO } from "../estilos.js";
import { TextoSuave } from "./comun.jsx";

export function AvisoGrupos({ entreno, idioma }) {
  if (!entreno.catalogo) return null;
  const hoy = fechaLocal(Date.now());
  const aviso = entreno.catalogo.aviso || {};
  const lista = gruposSinEntrenar({ ultimaVez: ultimaVezPorGrupo(entreno.indice, entreno.ejercicioDe, entreno.cola), hoy, aviso });
  if (!lista.length) return null;

  function cerrar() {
    const grupos = { ...(aviso.grupos || {}) };
    lista.forEach((x) => { grupos[x.grupo] = hoy; });
    entreno.cambiarAviso({ grupos });
  }

  const cuando = (dias) => (dias >= 28 ? t(idioma, "entreno.grupos.semanas", { n: Math.floor(dias / 7) }) : t(idioma, "entreno.grupos.dias", { n: dias }));
  return (
    <div role="status" style={{ position: "relative", marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1px solid var(--line)", fontFamily: FUENTE_TEXTO }}>
      <button
        onClick={cerrar}
        aria-label={t(idioma, "entreno.grupos.cerrar")}
        title={t(idioma, "entreno.grupos.cerrar")}
        style={{ position: "absolute", top: 4, right: 4, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}
      >
        <X size={16} />
      </button>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)", paddingRight: 28 }}>{t(idioma, "entreno.grupos.titulo")}</div>
      <ul style={{ margin: "6px 0 4px", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.6 }}>
        {lista.map((x) => (
          <li key={x.grupo}>
            <b>{t(idioma, "entreno.grupo." + x.grupo)}</b> · {cuando(x.dias)}
          </li>
        ))}
      </ul>
      <TextoSuave style={{ fontSize: 12 }}>{t(idioma, "entreno.grupos.ayuda")}</TextoSuave>
    </div>
  );
}
