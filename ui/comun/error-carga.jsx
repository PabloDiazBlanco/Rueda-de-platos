// ---------- ui/comun/error-carga.jsx ----------
// «No se han podido cargar tus datos · Reintentar». La enseña app.jsx cuando alguno de los cargadores
// iniciales (datos, menús, despensa, cuerpo) no ha podido leer lo que hay guardado: casi siempre, porque
// la app se ha abierto sin conexión (Firestore no tiene caché persistente: ver documentacion/datos.md).
//
// Antes, una lectura fallida se tomaba por una cuenta vacía: la app enseñaba el alta y completarla o
// saltarla escribía un documento vacío encima de todos los datos (riesgo D1 del diagnóstico de octubre de
// 2026). Ahora nada se guarda mientras la carga no vaya bien, y esta pantalla lo dice con claridad: no se
// ha tocado nada. Lleva también el botón de cerrar sesión de la pantalla de alta, por si se ha entrado con
// otra cuenta y no se quiere esperar.
import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { BotonCerrarSesionAlta } from "./cerrar-sesion.jsx";

export function ErrorCarga({ idioma, onReintentar }) {
  const [reintentando, setReintentando] = useState(false);

  async function reintentar() {
    if (reintentando) return;
    setReintentando(true);
    try {
      await onReintentar();
    } finally {
      setReintentando(false);
    }
  }

  return (
    <>
      <BotonCerrarSesionAlta idioma={idioma} />
      <div role="alert" style={{ maxWidth: 420, margin: "0 auto", padding: "72px 24px 40px", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 24, color: "var(--green-dark)" }}>
          {t(idioma, "carga.error.titulo")}
        </h1>
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: "14px 0 26px" }}>
          {t(idioma, "carga.error.texto")}
        </p>
        <button
          onClick={reintentar}
          disabled={reintentando}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
            color: "var(--card)", background: "var(--green-dark)", border: "none", borderRadius: 10,
            padding: "11px 20px", cursor: reintentando ? "default" : "pointer", opacity: reintentando ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} />
          {reintentando ? t(idioma, "loading.cargando") : t(idioma, "carga.error.reintentar")}
        </button>
      </div>
    </>
  );
}
