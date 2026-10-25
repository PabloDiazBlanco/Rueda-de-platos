// ---------- ui/ajustes/ajustes.jsx ----------
// Ajustes: idioma, notificaciones, descarga de datos, repetir el cuestionario, los ajustes de entreno,
// cerrar sesión y eliminar la cuenta.
import React, { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { descargarDatosJSON } from "peso";
import { t, guardarIdiomaLocal } from "i18n";
import { ModalShell, Field, inputStyle, ModalBtn } from "../comun/modal.jsx";
import { SectionIntro } from "../comun/tarjetas.jsx";
import { LanguageDropdown } from "../comun/idioma.jsx";
import { TarjetaCerrarSesion } from "../comun/cerrar-sesion.jsx";
import { SeccionAjustesEntreno } from "../entreno/ajustes.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Requiere reautenticación (contraseña, o pop-up de Google si la cuenta usa ese login) antes de
// borrar nada — así window.deleteAccount (auth-bootstrap.jsx) nunca se encuentra a mitad de
// camino con una sesión caducada. Escribir "ELIMINAR" es una segunda confirmación deliberadamente
// más lenta que un simple clic, dado que la acción es irreversible.
function DeleteAccountModal({ onClose, idioma }) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const esGoogle = window.authProvider === "google";
  // La palabra de confirmación también se traduce (ELIMINAR/DELETE) — si el aviso le pide a un
  // usuario en inglés que escriba "DELETE", la comprobación tiene que aceptar esa palabra, no la
  // española a la fuerza.
  const palabraConfirmacion = t(idioma, "deleteAccount.palabraConfirmacion");
  const listo = confirmText.trim().toUpperCase() === palabraConfirmacion.toUpperCase() && (esGoogle || password);

  function traducirError(code) {
    const map = {
      "needs-password": "deleteAccount.needsPassword",
      "auth/wrong-password": "deleteAccount.wrongPassword",
      "auth/invalid-credential": "deleteAccount.wrongPassword",
      "auth/popup-closed-by-user": "deleteAccount.popupCerrado",
    };
    return map[code] ? t(idioma, map[code]) : t(idioma, "deleteAccount.errorGenerico");
  }

  async function handleDelete() {
    if (!listo || loading) return;
    setError("");
    setLoading(true);
    try {
      await window.deleteAccount(password);
      // Tras borrar la cuenta, el listener de sesión de auth-bootstrap.jsx detecta el cierre
      // de sesión solo y vuelve a la pantalla de bienvenida — no hace falta hacer nada más aquí.
    } catch (err) {
      setLoading(false);
      setError(traducirError(err.code));
    }
  }

  return (
    <ModalShell onClose={onClose} title={t(idioma, "perfilView.eliminarCuenta.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink)", margin: "0 0 14px" }}>
        {t(idioma, "deleteAccount.desc")}
      </p>

      {!esGoogle && (
        <input
          type="password"
          placeholder={t(idioma, "deleteAccount.tuContrasena")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
      )}

      <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
        {t(idioma, "deleteAccount.escribePara", { palabra: palabraConfirmacion })}
      </div>
      <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={inputStyle} />

      {error && (
        <div style={{ fontFamily: FUENTE_TEXTO, color: "var(--rust)", fontSize: 12, marginTop: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onClose} variant="ghost">{t(idioma, "deleteAccount.cancelar")}</ModalBtn>
        <ModalBtn onClick={handleDelete} variant="danger" disabled={!listo || loading}>
          {loading ? t(idioma, "deleteAccount.eliminando") : t(idioma, "perfilView.eliminarCuenta.titulo")}
        </ModalBtn>
      </div>
    </ModalShell>
  );
}

// ---------- Ajustes ----------
// Reúne lo que antes vivía repartido dentro de Perfil (idioma, notificaciones, eliminar cuenta) más
// la descarga de datos que antes vivía en la tarjeta raíz de Perfil. A diferencia de Perfil (que
// tiene su propio botón "Guardar cambios"), aquí cada ajuste se aplica al momento de tocarlo — no
// hay nada que "confirmar" después, igual que ya hacía el interruptor de notificaciones.
// Importante: onSave siempre parte de `{ ...perfil, ... }` en vez de construir un objeto desde
// cero — savePerfil (en el componente raíz) sustituye el perfil entero por lo que se le pase, así
// que si esta pantalla mandara solo el campo que toca, borraría sin querer todo lo demás (nombre,
// reparto de comidas...) que vive en otras pantallas.
// Los ajustes de entreno van como sección propia antes de lo de la cuenta (cerrar sesión, eliminarla), que
// queda siempre lo último. Con `params.seccion === "entreno"` (el enlace «Ajustes de entreno» de la
// pantalla Entrenar) la pantalla se abre ya desplazada hasta esa sección.
export function SettingsView({ perfil, data, onSave, onRepetirCuestionario, entreno, params, idioma }) {
  const refEntreno = useRef(null);
  const irAEntreno = params && params.seccion === "entreno";
  useEffect(() => {
    if (irAEntreno && refEntreno.current) refEntreno.current.scrollIntoView({ block: "start" });
  }, [irAEntreno]);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showRepetirCuestionario, setShowRepetirCuestionario] = useState(false);
  const [notifEstado, setNotifEstado] = useState(""); // "" | "pidiendo" | "error"
  const [notifError, setNotifError] = useState("");
  const notifPush = perfil?.notificacionesPush ?? false;
  // C8: el aviso para descongelar usa el mismo permiso y token de notificaciones que el recordatorio de pesaje,
  // pero se activa aparte; el token solo se borra cuando ninguno de los dos está activado.
  const avisoDescongelar = perfil?.avisoDescongelar ?? false;
  const [descongelarEstado, setDescongelarEstado] = useState(""); // "" | "pidiendo" | "error"
  const [descongelarError, setDescongelarError] = useState("");

  async function handleToggleDescongelar(activar) {
    setDescongelarError("");
    if (!activar) {
      onSave({ ...perfil, avisoDescongelar: false });
      setDescongelarEstado("");
      if (!notifPush && typeof window.disablePushNotifications === "function") window.disablePushNotifications().catch(() => {});
      return;
    }
    setDescongelarEstado("pidiendo");
    try {
      await window.requestPushPermission();
      onSave({ ...perfil, avisoDescongelar: true });
      setDescongelarEstado("");
    } catch (err) {
      setDescongelarEstado("error");
      setDescongelarError(t(idioma, "perfil.notificaciones.error." + (err.code || "generico")));
    }
  }

  function cambiarIdioma(nuevo) {
    guardarIdiomaLocal(nuevo);
    onSave({ ...perfil, idioma: nuevo });
  }

  async function handleToggleNotificaciones(activar) {
    setNotifError("");
    if (!activar) {
      onSave({ ...perfil, notificacionesPush: false });
      setNotifEstado("");
      // Si el aviso para descongelar (C8) sigue activado, el token hace falta para él: no se borra.
      if (!avisoDescongelar && typeof window.disablePushNotifications === "function") {
        window.disablePushNotifications().catch(() => {});
      }
      return;
    }
    setNotifEstado("pidiendo");
    try {
      await window.requestPushPermission();
      onSave({ ...perfil, notificacionesPush: true });
      setNotifEstado("");
    } catch (err) {
      setNotifEstado("error");
      setNotifError(t(idioma, "perfil.notificaciones.error." + (err.code || "generico")));
    }
  }

  return (
    <>
      <SectionIntro text={t(idioma, "ajustes.intro")} />

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 18px 20px", maxWidth: 480 }}>
        <Field label={t(idioma, "perfil.idioma.label")}>
          <LanguageDropdown idioma={idioma} onChange={cambiarIdioma} />
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            {t(idioma, "perfil.idioma.ayuda")}
          </div>
        </Field>

        <Field label={t(idioma, "perfil.notificaciones.label")}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: true, labelKey: "perfil.notificaciones.activadas" },
              { value: false, labelKey: "perfil.notificaciones.desactivadas" },
            ].map((op) => (
              <button
                key={String(op.value)}
                onClick={() => handleToggleNotificaciones(op.value)}
                disabled={notifEstado === "pidiendo"}
                style={{
                  flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
                  padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)",
                  background: notifPush === op.value ? "var(--green-dark)" : "#fff",
                  color: notifPush === op.value ? "#fff" : "var(--ink)",
                  cursor: notifEstado === "pidiendo" ? "default" : "pointer",
                }}
              >
                {t(idioma, op.labelKey)}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            {t(idioma, "perfil.notificaciones.ayuda")}
          </div>
          {notifEstado === "pidiendo" && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
              {t(idioma, "perfil.notificaciones.pidiendoPermiso")}
            </div>
          )}
          {notifEstado === "error" && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>
              {notifError}
            </div>
          )}
        </Field>

        <Field label={t(idioma, "ajustes.descongelar.label")}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: true, labelKey: "perfil.notificaciones.activadas" },
              { value: false, labelKey: "perfil.notificaciones.desactivadas" },
            ].map((op) => (
              <button
                key={String(op.value)}
                onClick={() => handleToggleDescongelar(op.value)}
                disabled={descongelarEstado === "pidiendo"}
                style={{
                  flex: 1, fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700,
                  padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)",
                  background: avisoDescongelar === op.value ? "var(--green-dark)" : "#fff",
                  color: avisoDescongelar === op.value ? "#fff" : "var(--ink)",
                  cursor: descongelarEstado === "pidiendo" ? "default" : "pointer",
                }}
              >
                {t(idioma, op.labelKey)}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            {t(idioma, "ajustes.descongelar.ayuda")}
          </div>
          {descongelarEstado === "pidiendo" && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>{t(idioma, "perfil.notificaciones.pidiendoPermiso")}</div>
          )}
          {descongelarEstado === "error" && (
            <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 11.5, color: "var(--rust)", marginTop: 4 }}>{descongelarError}</div>
          )}
        </Field>

        <button
          onClick={() => descargarDatosJSON(data)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            cursor: "pointer", padding: 0, marginTop: 4,
            fontFamily: FUENTE_TEXTO, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)",
          }}
        >
          <Download size={13} /> {t(idioma, "perfilRoot.descargarDatos")}
        </button>
      </div>

      <div style={{ border: "1px solid var(--mustard-dark)", borderRadius: 12, padding: "16px 18px", marginTop: 24, maxWidth: 480 }}>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--mustard-dark)", marginBottom: 4 }}>
          {t(idioma, "ajustes.repetirCuestionario.titulo")}
        </div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
          {t(idioma, "ajustes.repetirCuestionario.desc")}
        </div>
        <button
          onClick={() => setShowRepetirCuestionario(true)}
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
            color: "var(--mustard-dark)", background: "var(--mustard-soft)", border: "none", borderRadius: 7,
            padding: "8px 12px", cursor: "pointer",
          }}
        >
          {t(idioma, "ajustes.repetirCuestionario.boton")}
        </button>
      </div>

      {entreno && (
        <div ref={refEntreno} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px 20px", marginTop: 16, maxWidth: 480, scrollMarginTop: 16 }}>
          <h2 style={{ margin: 0, fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 19, color: "var(--green-dark)" }}>{t(idioma, "area.entreno")}</h2>
          <SeccionAjustesEntreno entreno={entreno} idioma={idioma} />
        </div>
      )}

      <TarjetaCerrarSesion idioma={idioma} />

      <div style={{ border: "1px solid var(--rust)", borderRadius: 12, padding: "16px 18px", marginTop: 16, maxWidth: 480 }}>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "var(--rust)", marginBottom: 4 }}>
          {t(idioma, "perfilView.eliminarCuenta.titulo")}
        </div>
        <div style={{ fontFamily: FUENTE_TEXTO, fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
          {t(idioma, "perfilView.eliminarCuenta.desc")}
        </div>
        <button
          onClick={() => setShowDeleteAccount(true)}
          style={{
            fontFamily: FUENTE_TEXTO, fontSize: 12.5, fontWeight: 700,
            color: "var(--rust)", background: "var(--rust-soft)", border: "none", borderRadius: 7,
            padding: "8px 12px", cursor: "pointer",
          }}
        >
          {t(idioma, "perfilView.eliminarCuenta.boton")}
        </button>
      </div>

      {showDeleteAccount && <DeleteAccountModal onClose={() => setShowDeleteAccount(false)} idioma={idioma} />}
      {showRepetirCuestionario && (
        <ConfirmRepetirCuestionarioModal
          onCancel={() => setShowRepetirCuestionario(false)}
          onConfirm={() => {
            setShowRepetirCuestionario(false);
            onRepetirCuestionario();
          }}
          idioma={idioma}
        />
      )}
    </>
  );
}

// Confirmación simple (sin reautenticación, a diferencia de eliminar cuenta): repetir el
// cuestionario reemplaza los ingredientes/bloques actuales, pero no es una acción destructiva de
// verdad — no borra cuenta ni datos de peso/menús, y siempre se puede volver a editar a mano desde
// Mis comidas después. Por eso un solo paso de confirmación es suficiente.
function ConfirmRepetirCuestionarioModal({ onCancel, onConfirm, idioma }) {
  return (
    <ModalShell onClose={onCancel} title={t(idioma, "ajustes.repetirCuestionario.titulo")}>
      <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13.5, color: "var(--ink)", margin: 0 }}>
        {t(idioma, "ajustes.repetirCuestionario.confirmTexto")}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <ModalBtn onClick={onCancel} variant="ghost">{t(idioma, "common.cancelar")}</ModalBtn>
        <ModalBtn onClick={onConfirm} variant="danger">{t(idioma, "ajustes.repetirCuestionario.confirmar")}</ModalBtn>
      </div>
    </ModalShell>
  );
}
