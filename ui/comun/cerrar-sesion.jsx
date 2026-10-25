// ---------- ui/comun/cerrar-sesion.jsx ----------
// Cerrar sesión, con una confirmación breve. Hasta octubre de 2026 era un botón que auth-bootstrap.jsx
// pegaba fuera de React, flotando arriba a la derecha (z-index 9999) en todas las pantallas: obligaba a
// que toda barra a pantalla completa dejase ~110 px libres a ese lado y se tocaba sin querer. Ahora vive
// en Ajustes (la tarjeta de abajo) y, en pequeño, en la pantalla de alta, por si alguien ha entrado con
// otra cuenta y quiere salir antes de rellenar nada (`BotonCerrarSesionAlta`).
//
// El cierre en sí lo hace window.signOutUser (auth-bootstrap.jsx, el puente con Firebase): al cerrarse
// la sesión, su escucha de onAuthStateChanged vuelve sola a la bienvenida, así que aquí no hay que hacer
// nada más. El guardado automático de los datos (ui/estado/datos.js) espera solo medio segundo, de modo
// que lo último que se tocó ya está en la nube cuando se llega a confirmar.
import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { t } from "i18n";
import { ModalShell, ModalBtn } from "./modal.jsx";
import { FUENTE_TEXTO } from "../estilos.js";

function ConfirmarCerrarSesion({ onCancel, idioma }) {
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState("");

  async function salir() {
    if (saliendo) return;
    setError("");
    setSaliendo(true);
    try {
      await window.signOutUser();
    } catch (e) {
      setSaliendo(false);
      setError(t(idioma, "cerrarSesion.error"));
    }
  }

  return (
    <ModalShell onClose={onCancel} title={t(idioma, "cerrarSesion.confirmTitulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "cerrarSesion.confirmTexto")}
      </p>
      {error && <div style={{ fontFamily: FUENTE_TEXTO, color: "var(--rust)", fontSize: 12, marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={salir} variant="solid" disabled={saliendo}>{t(idioma, "cerrarSesion.boton")}</ModalBtn>
      </div>
    </ModalShell>
  );
}

// Tarjeta de Ajustes: el mismo formato que «Repetir el cuestionario» y «Eliminar cuenta», pero en verde,
// porque salir no borra nada.
export function TarjetaCerrarSesion({ idioma }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginTop: 16, maxWidth: 480 }}>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--green-dark)", marginBottom: 4 }}>
        {t(idioma, "cerrarSesion.titulo")}
      </div>
      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
        {t(idioma, "cerrarSesion.desc")}
      </div>
      <button
        onClick={() => setConfirmando(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
          color: "var(--green-dark)", background: "var(--green-soft)", border: "none", borderRadius: 7,
          padding: "8px 12px", cursor: "pointer",
        }}
      >
        <LogOut size={14} /> {t(idioma, "cerrarSesion.boton")}
      </button>
      {confirmando && <ConfirmarCerrarSesion onCancel={() => setConfirmando(false)} idioma={idioma} />}
    </div>
  );
}

// En la pantalla de alta (asistente de perfil y cuestionario de alimentos): un botón pequeño arriba a
// la derecha, donde estaba el flotante de antes. Ahí no hay barra superior ni menú lateral con los que
// chocar, y es la única salida mientras no se ha llegado a Ajustes.
export function BotonCerrarSesionAlta({ idioma }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <button
        onClick={() => setConfirmando(true)}
        style={{
          position: "fixed", top: 10, right: 10, zIndex: 30,
          display: "flex", alignItems: "center", gap: 5,
          fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--green-dark)",
          background: "var(--green-soft)", border: "none", borderRadius: 20, padding: "7px 12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)", cursor: "pointer",
        }}
      >
        <LogOut size={13} /> {t(idioma, "cerrarSesion.boton")}
      </button>
      {confirmando && <ConfirmarCerrarSesion onCancel={() => setConfirmando(false)} idioma={idioma} />}
    </>
  );
}
