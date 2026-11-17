// ---------- ui/comun/error-carga.jsx ----------
// Las dos pantallas que app.jsx enseña en lugar de la app cuando lo guardado no se puede usar:
//
// 1. «No se han podido cargar tus datos · Reintentar» (ErrorCarga), cuando alguno de los cargadores iniciales
//    (datos, menús, despensa, cuerpo) no ha podido leer lo que hay guardado: casi siempre, porque la app se ha
//    abierto sin conexión (Firestore no tiene caché persistente: ver documentacion/datos.md).
//    Antes, una lectura fallida se tomaba por una cuenta vacía: la app enseñaba el alta y completarla o saltarla
//    escribía un documento vacío encima de todos los datos (riesgo D1 del diagnóstico de octubre de 2026). Ahora
//    nada se guarda mientras la carga no vaya bien, y esta pantalla lo dice con claridad: no se ha tocado nada.
//
// 2. «Actualiza FoodDraft» (ActualizaApp; R12 de la auditoría de noviembre de 2026, logica/versiones.js), cuando en
//    la cuenta hay datos guardados por una versión más nueva que esta copia de la app. Puede salir al abrir o a mitad
//    de uso (el entreno lee meses bajo demanda). Desde ese momento no se guarda nada (window.storage lo impide), y
//    esta pantalla lo explica.
//
// Las dos llevan también el botón de cerrar sesión de la pantalla de alta, por si se ha entrado con otra cuenta y
// no se quiere esperar.
import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { t } from "i18n";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";
import { BotonCerrarSesionAlta } from "./cerrar-sesion.jsx";

const estiloCaja = { maxWidth: 420, margin: "0 auto", padding: "72px 24px 40px", textAlign: "center" };
const estiloTitulo = { margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 24, color: "var(--green-dark)" };
const estiloTexto = { fontFamily: FUENTE_TEXTO, fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: "14px 0 26px" };
const estiloBoton = (ocupado) => ({
  display: "inline-flex", alignItems: "center", gap: 8,
  fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
  color: "var(--card)", background: "var(--green-dark)", border: "none", borderRadius: 10,
  padding: "11px 20px", cursor: ocupado ? "default" : "pointer", opacity: ocupado ? 0.7 : 1,
});

// `motivo`: «conexion» (lo normal: no se pudo leer) o «ilegible» (se leyó, pero lo guardado no se puede usar:
// un documento dañado o una migración que falla). Con «ilegible» el texto no culpa a la conexión y da el correo
// de contacto, porque reintentar no lo va a arreglar solo.
export function ErrorCarga({ idioma, onReintentar, motivo = "conexion" }) {
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
      <div role="alert" style={estiloCaja}>
        <h1 style={estiloTitulo}>{t(idioma, "carga.error.titulo")}</h1>
        <p style={estiloTexto}>{t(idioma, motivo === "ilegible" ? "carga.error.textoIlegible" : "carga.error.texto")}</p>
        <button onClick={reintentar} disabled={reintentando} style={estiloBoton(reintentando)}>
          <RefreshCw size={16} />
          {reintentando ? t(idioma, "loading.cargando") : t(idioma, "carga.error.reintentar")}
        </button>
      </div>
    </>
  );
}

// «Actualizar» recarga la página. Con eso basta: el service worker pide siempre lo último a la red (sw.js, «red
// primero»), así que con conexión la recarga ya trae la versión nueva de la app. Sin conexión no se llega a esta
// pantalla (sin red no se puede leer nada, y lo que sale es ErrorCarga). Si aun así sigue saliendo (una app de
// iPhone que no se ha cerrado del todo, o que el código de la app haya vuelto a una versión anterior), la nota lo
// dice y da el correo. Bloquear la app entera y este texto son decisiones de Pablo (17-nov-2026). Sin animación:
// no hace falta versión para «reducir movimiento».
export function ActualizaApp({ idioma }) {
  const [recargando, setRecargando] = useState(false);

  function actualizar() {
    if (recargando) return;
    setRecargando(true);
    window.location.reload();
  }

  return (
    <>
      <BotonCerrarSesionAlta idioma={idioma} />
      <div role="alert" style={estiloCaja}>
        <h1 style={estiloTitulo}>{t(idioma, "carga.version.titulo")}</h1>
        <p style={estiloTexto}>{t(idioma, "carga.version.texto")}</p>
        <button onClick={actualizar} disabled={recargando} style={estiloBoton(recargando)}>
          <RefreshCw size={16} />
          {recargando ? t(idioma, "loading.cargando") : t(idioma, "carga.version.actualizar")}
        </button>
        <p style={{ ...estiloTexto, fontSize: 12.5, margin: "26px 0 0" }}>{t(idioma, "carga.version.nota")}</p>
      </div>
    </>
  );
}
