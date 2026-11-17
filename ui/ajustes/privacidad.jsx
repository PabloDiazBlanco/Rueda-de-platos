// ---------- ui/ajustes/privacidad.jsx ----------
// «Privacidad» en Ajustes (auditoría de noviembre de 2026, etapa 2: L2): lo que se firmó en «Antes de empezar»
// (ui/onboarding/antes-de-empezar.jsx), cuándo y qué versión, y la forma de retirar el consentimiento de los datos de
// salud. El RGPD (art. 7.3) pide que retirarlo sea tan fácil como darlo, y que se diga antes qué pasa al hacerlo.
//
// Retirarlo equivale a eliminar la cuenta (D13): casi todo lo que guarda la app son datos de salud y sin ellos no
// puede calcular objetivos, preparar menús ni llevar el peso o el entreno. Por eso el botón no borra nada por sí
// mismo: explica eso, ofrece descargar antes una copia de los datos y lleva a la ventana de siempre de «Eliminar
// cuenta» (con su contraseña y su palabra de confirmación), que hace el borrado de verdad (functions/deleteAccount.js,
// que se lleva también las firmas). Sin un camino propio de borrado, no hay dos formas de borrar que mantener.
//
// Las firmas llegan de auth-bootstrap.jsx (`window.consentimientos`, leídas al entrar, con la hora del servidor).
//
// «Descargar mis datos» vive aquí y en ningún otro sitio de la app (etapa 4 de la auditoría, punto 12b): un ZIP con
// todo lo de la cuenta (ui/ajustes/exportar.js). El mismo botón sale también dentro de la ventana de retirar el
// consentimiento, que ofrece guardar una copia antes de borrarlo todo: es el mismo sitio y la misma descarga.
import React, { useState } from "react";
import { ShieldCheck, Download } from "lucide-react";
import { t } from "i18n";
import { resumenFirmas, fechaDeFirma } from "consentimientos";
import { ModalShell, ModalBtn } from "../comun/modal.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { descargarTodosMisDatos } from "./exportar.js";

const estiloLinea = { fontFamily: FUENTE_TEXTO, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink)", margin: "0 0 6px" };
const estiloEnlace = { fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--green-dark)", fontWeight: 700 };

// El botón de la descarga, con su estado: preparando (no se puede pulsar otra vez), descargado o el error. `fuentes`:
// los hooks con los datos de la cuenta (ver descargarTodosMisDatos).
function DescargarMisDatos({ fuentes, idioma }) {
  const [estado, setEstado] = useState(null); // null | "preparando" | { ok: nombre } | { error: "lectura" | "otro" }
  const preparando = estado === "preparando";

  async function descargar() {
    if (preparando) return;
    setEstado("preparando");
    try {
      const { nombre } = await descargarTodosMisDatos(fuentes, idioma);
      setEstado({ ok: nombre });
    } catch (e) {
      if (!(e && e.lectura)) console.warn("Descargar mis datos:", (e && e.message) || e);
      setEstado({ error: e && e.lectura ? "lectura" : "otro" });
    }
  }

  return (
    <div>
      <button
        onClick={descargar}
        disabled={preparando}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0,
          cursor: preparando ? "default" : "pointer", opacity: preparando ? 0.6 : 1,
          fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700, color: "var(--green-dark)",
        }}
      >
        <Download size={14} aria-hidden="true" /> {t(idioma, "perfilRoot.descargarDatos")}
      </button>
      {estado && (
        <div role="status" style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, lineHeight: 1.45, marginTop: 6, color: estado.error ? "var(--rust)" : "var(--ink-soft)" }}>
          {preparando && t(idioma, "ajustes.privacidad.preparando")}
          {estado.ok && t(idioma, "ajustes.privacidad.descargado", { archivo: estado.ok })}
          {estado.error === "lectura" && t(idioma, "ajustes.privacidad.errorLectura")}
          {estado.error === "otro" && t(idioma, "ajustes.privacidad.errorDescarga")}
        </div>
      )}
    </div>
  );
}

// `onEliminarCuenta`: abre la ventana de «Eliminar cuenta» de Ajustes. `fuentes`: los hooks con los datos de la
// cuenta, para la descarga (data, menuCompleto, menuSimple, despensa, entreno, cuerpo).
export function SeccionPrivacidad({ idioma, fuentes, onEliminarCuenta }) {
  const [retirando, setRetirando] = useState(false);
  const firmas = resumenFirmas(window.consentimientos);
  // Una fecha que faltara (no debería: las firmas se releen del servidor al entrar) sale como «—», sin inventarla.
  const fecha = (f) => fechaDeFirma(f && f.fecha, idioma) || "—";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px 18px", marginTop: 16, maxWidth: 480 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px", fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>
        <ShieldCheck size={18} aria-hidden="true" /> {t(idioma, "ajustes.privacidad.titulo")}
      </h2>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px" }}>{t(idioma, "ajustes.privacidad.intro")}</p>

      {firmas.edad && (
        <p style={estiloLinea}>{t(idioma, "ajustes.privacidad.edad", { anio: firmas.edad.anio ?? "—", fecha: fecha(firmas.edad) })}</p>
      )}
      {firmas.terminos && (
        <p style={estiloLinea}>{t(idioma, "ajustes.privacidad.terminos", { fecha: fecha(firmas.terminos), version: firmas.terminos.version || "—" })}</p>
      )}
      {firmas.salud && (
        <p style={estiloLinea}>{t(idioma, "ajustes.privacidad.salud", { fecha: fecha(firmas.salud), version: firmas.salud.version || "—" })}</p>
      )}
      {!firmas.edad && !firmas.terminos && !firmas.salud && (
        <p style={{ ...estiloLinea, color: "var(--ink-soft)" }}>{t(idioma, "ajustes.privacidad.sinDato")}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", margin: "8px 0 12px" }}>
        <a href="terminos.html" target="_blank" rel="noopener" style={estiloEnlace}>{t(idioma, "login.terminos")}</a>
        <a href="privacidad.html" target="_blank" rel="noopener" style={estiloEnlace}>{t(idioma, "login.privacidad")}</a>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", padding: "12px 0 14px" }}>
        <DescargarMisDatos fuentes={fuentes} idioma={idioma} />
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, lineHeight: 1.45, color: "var(--ink-soft)", margin: "6px 0 0" }}>
          {t(idioma, "ajustes.privacidad.descargarAyuda", { donde: t(idioma, "premiumView.gestionarSuscripcion") })}
        </p>
      </div>

      <button
        onClick={() => setRetirando(true)}
        style={{
          fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
          color: "var(--rust)", background: "var(--rust-soft)", border: "none", borderRadius: 7,
          padding: "8px 12px", cursor: "pointer",
        }}
      >
        {t(idioma, "ajustes.privacidad.retirar")}
      </button>

      {retirando && (
        <ModalShell onClose={() => setRetirando(false)} title={t(idioma, "ajustes.privacidad.retirar")}>
          <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)", margin: "0 0 10px" }}>
            {t(idioma, "ajustes.privacidad.retirarTexto")}
          </p>
          <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-soft)", margin: "0 0 8px" }}>
            {t(idioma, "ajustes.privacidad.retirarCopia")}
          </p>
          <DescargarMisDatos fuentes={fuentes} idioma={idioma} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <ModalBtn onClick={() => setRetirando(false)} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
            <ModalBtn
              onClick={() => {
                setRetirando(false);
                onEliminarCuenta();
              }}
              variant="danger"
            >
              {t(idioma, "ajustes.privacidad.retirarSeguir")}
            </ModalBtn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
