// ---------- ui/onboarding/antes-de-empezar.jsx ----------
// «Antes de empezar»: la pantalla de firma de los consentimientos y la edad mínima (auditoría de noviembre de 2026,
// etapa 2: L1, L2, L3 y L18). Sale al entrar en la cuenta (después de verificar el correo, si hace falta) y ANTES
// de que la app lea o guarde ningún dato: casi todo lo que guarda FoodDraft son datos de salud, y para tratarlos
// hace falta un consentimiento explícito que se pueda demostrar. Hasta entonces se registraba cualquiera sin edad
// mínima ni casilla, y la política decía que el consentimiento se daba «al usar las funciones», que no vale.
//
// Quién decide y quién guarda: auth-bootstrap.jsx lee las firmas de la cuenta, decide con
// logica/consentimientos.js qué falta y pinta esta pantalla con `pendientes`; al pulsar «Continuar», `onFirmar`
// escribe las firmas (un lote, con la hora del servidor) y, si van bien, abre la app. Aquí solo se recogen las
// respuestas. Si las firmas no se han podido leer (sin conexión), auth-bootstrap.jsx la pinta con `error` y sale
// la misma pantalla de «Reintentar» que en la carga de datos: una lectura que falla no es «no ha firmado nada».
//
// Qué se pide, y solo lo que falte (una cuenta que ya firmó y ve unos términos nuevos solo ve los términos):
// - El año de nacimiento: 18 años o más (D2). Con el año justo, se pregunta si ya los ha cumplido. El asistente de
//   perfil reutiliza este año en vez de volver a preguntarlo. Por debajo de 18 no se sigue: se explica por qué y se
//   ofrece eliminar la cuenta (o cerrar sesión, arriba a la derecha).
// - Los términos y la política de privacidad, con una casilla sin marcar.
// - El consentimiento para los datos de salud, con una casilla sin marcar y el texto delante (qué datos, para qué,
//   qué no se hace con ellos y qué pasa al retirarlo: eliminar la cuenta, D13). Su versión es la de `VERSIONES`:
//   si este texto cambia de fondo, hay que subirla.
import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { t } from "i18n";
import { EDAD_MINIMA, evaluarAnioNacimiento, edadSuficiente } from "consentimientos";
import { Shell } from "../marco/cabecera.jsx";
import { Field, inputStyle } from "../comun/modal.jsx";
import { BotonCerrarSesionAlta } from "../comun/cerrar-sesion.jsx";
import { ErrorCarga } from "../comun/error-carga.jsx";
import { DeleteAccountModal } from "../ajustes/ajustes.jsx";
import { FUENTE_TEXTO, FUENTE_TITULOS } from "../estilos.js";

// Lo que pinta auth-bootstrap.jsx (lo exporta app.jsx). Lleva su propio Shell: se enseña antes de montar la app.
export function PantallaAntesDeEmpezar({ idioma, error, pendientes, onReintentar, onFirmar }) {
  return (
    <Shell>
      {error ? (
        <ErrorCarga idioma={idioma} onReintentar={onReintentar} />
      ) : (
        <>
          <BotonCerrarSesionAlta idioma={idioma} />
          <AntesDeEmpezar idioma={idioma} pendientes={pendientes} onFirmar={onFirmar} />
        </>
      )}
    </Shell>
  );
}

const estiloSeccion = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px", marginTop: 12 };
const estiloTitulo = { fontFamily: FUENTE_TEXTO, fontSize: 13.5, fontWeight: 700, color: "var(--green-dark)", margin: "0 0 8px" };
const estiloTexto = { fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5, color: "var(--ink)", margin: "0 0 8px" };
const estiloAyuda = { fontFamily: FUENTE_TEXTO, fontSize: 12, lineHeight: 1.45, color: "var(--ink-soft)", margin: "0 0 4px" };
const estiloEnlace = { fontFamily: FUENTE_TEXTO, fontSize: 12.5, color: "var(--green-dark)", fontWeight: 700 };

// Una casilla con su texto. Toda la fila es pulsable (la etiqueta envuelve la casilla), y la casilla es algo más
// grande que la del navegador para el dedo. Nunca sale marcada: el consentimiento tiene que ser un gesto.
function Casilla({ marcada, onCambio, children }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "6px 0" }}>
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "var(--green)", cursor: "pointer" }}
      />
      <span style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.45, color: "var(--ink)", fontWeight: 600 }}>{children}</span>
    </label>
  );
}

function AntesDeEmpezar({ idioma, pendientes, onFirmar }) {
  const pideEdad = pendientes.includes("edad");
  const pideTerminos = pendientes.includes("terminos");
  const pideSalud = pendientes.includes("salud");
  const [anio, setAnio] = useState("");
  const [cumplidos, setCumplidos] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaSalud, setAceptaSalud] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // El año de hoy del aparato. Las reglas comprueban lo mismo con el del servidor; solo discrepan una hora al año
  // (documentacion/datos.md, «Consentimientos»), y entonces la firma falla y se puede reintentar pasada esa hora.
  const edad = evaluarAnioNacimiento(anio, new Date().getFullYear());
  const esMenor = pideEdad && edad.estado === "menor";
  const listo = !guardando
    && (!pideEdad || edadSuficiente(edad.estado, cumplidos))
    && (!pideTerminos || aceptaTerminos)
    && (!pideSalud || aceptaSalud);

  async function continuar() {
    if (!listo) return;
    setErrorGuardar(false);
    setGuardando(true);
    try {
      await onFirmar({ anio: edad.anio, cumplidosEsteAnio: cumplidos });
      // Si sale bien, auth-bootstrap.jsx cambia de pantalla él solo: aquí no queda nada que hacer.
    } catch (e) {
      setGuardando(false);
      setErrorGuardar(true);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <ShieldCheck size={32} style={{ color: "var(--green)", marginBottom: 6 }} aria-hidden="true" />
        <h1 style={{ fontFamily: FUENTE_TITULOS, fontWeight: 400, fontSize: 24, color: "var(--green-dark)", margin: "0 0 8px" }}>
          {t(idioma, "antesDeEmpezar.titulo")}
        </h1>
        <p style={{ fontFamily: FUENTE_TEXTO, fontSize: 13, lineHeight: 1.5, color: "var(--ink-soft)", margin: 0 }}>
          {t(idioma, pideEdad ? "antesDeEmpezar.introNueva" : "antesDeEmpezar.introActualizada")}
        </p>
      </div>

      {pideEdad && (
        <div style={estiloSeccion}>
          <Field label={t(idioma, "campo.anioNacimiento")}>
            <input
              type="number"
              inputMode="numeric"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              style={inputStyle}
              placeholder={t(idioma, "campo.anioNacimiento.placeholder")}
            />
          </Field>
          <p style={estiloAyuda}>{t(idioma, "antesDeEmpezar.edad.ayuda", { edad: EDAD_MINIMA })}</p>
          {edad.estado === "invalido" && (
            <p role="alert" style={{ ...estiloAyuda, color: "var(--rust)" }}>{t(idioma, "antesDeEmpezar.edad.invalido")}</p>
          )}
          {edad.estado === "confirmar" && (
            <Casilla marcada={cumplidos} onCambio={setCumplidos}>
              {t(idioma, "antesDeEmpezar.edad.yaCumplidos", { edad: EDAD_MINIMA })}
            </Casilla>
          )}
        </div>
      )}

      {esMenor ? (
        <div role="alert" style={{ ...estiloSeccion, background: "var(--rust-soft)", border: "1px solid var(--rust-soft)" }}>
          <p style={{ ...estiloTitulo, color: "var(--rust)" }}>{t(idioma, "antesDeEmpezar.menor.titulo", { edad: EDAD_MINIMA })}</p>
          <p style={estiloTexto}>{t(idioma, "antesDeEmpezar.menor.texto")}</p>
          <button
            onClick={() => setEliminando(true)}
            style={{
              fontFamily: FUENTE_TEXTO, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--rust)",
              border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", marginTop: 4,
            }}
          >
            {t(idioma, "perfilView.eliminarCuenta.titulo")}
          </button>
          {eliminando && <DeleteAccountModal onClose={() => setEliminando(false)} idioma={idioma} />}
        </div>
      ) : (
        <>
          {pideTerminos && (
            <div style={estiloSeccion}>
              <p style={estiloTitulo}>{t(idioma, "antesDeEmpezar.terminos.titulo")}</p>
              {/* En otra pestaña: volver aquí no hace perder lo que ya se ha rellenado. */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginBottom: 6 }}>
                <a href="terminos.html" target="_blank" rel="noopener" style={estiloEnlace}>{t(idioma, "login.terminos")}</a>
                <a href="privacidad.html" target="_blank" rel="noopener" style={estiloEnlace}>{t(idioma, "login.privacidad")}</a>
              </div>
              <Casilla marcada={aceptaTerminos} onCambio={setAceptaTerminos}>{t(idioma, "antesDeEmpezar.terminos.casilla")}</Casilla>
            </div>
          )}

          {pideSalud && (
            <div style={estiloSeccion}>
              <p style={estiloTitulo}>{t(idioma, "antesDeEmpezar.salud.titulo")}</p>
              <p style={estiloTexto}>{t(idioma, "antesDeEmpezar.salud.que")}</p>
              <p style={estiloTexto}>{t(idioma, "antesDeEmpezar.salud.uso")}</p>
              <Casilla marcada={aceptaSalud} onCambio={setAceptaSalud}>{t(idioma, "antesDeEmpezar.salud.casilla")}</Casilla>
            </div>
          )}

          {errorGuardar && (
            <p role="alert" style={{ ...estiloAyuda, color: "var(--rust)", marginTop: 12 }}>{t(idioma, "antesDeEmpezar.errorGuardar")}</p>
          )}

          <button
            onClick={continuar}
            disabled={!listo}
            style={{
              width: "100%", marginTop: 16, fontFamily: FUENTE_TEXTO, fontSize: 14, fontWeight: 700,
              color: "#fff", background: listo ? "var(--green)" : "var(--line)", border: "none",
              borderRadius: 9, padding: "12px", cursor: listo ? "pointer" : "default",
            }}
          >
            {guardando ? t(idioma, "antesDeEmpezar.guardando") : t(idioma, "antesDeEmpezar.continuar")}
          </button>
        </>
      )}
    </div>
  );
}
