// ---------- ui/comun/errores.js ----------
// El mensaje de error de una Cloud Function, en el idioma de la interfaz. Las funciones (functions/) lanzan
// sus errores con un código estándar de Firebase y un texto en español: functions/ es un proyecto aparte y no
// depende de logica/i18n.js. Hasta octubre de 2026 la app enseñaba ese texto tal cual (`err.message`), así
// que en inglés, catalán, gallego o euskera se veía en español (C.4.2 del diagnóstico). Ahora se elige por
// `err.code` y por función (`contexto`), con claves `errorFuncion.*` en los cinco idiomas: no hace falta
// tocar ni desplegar las funciones. Los puentes de auth-bootstrap.jsx (window.analyzeFoodPhoto...) conservan
// el código del error para que llegue hasta aquí.
//
// `contexto`: "fotos" (lector de etiquetas), "cocinar" («¿Qué cocino?»), "pago" (Checkout) o "portal"
// (gestión de la suscripción).
import { t } from "i18n";

export function mensajeErrorFuncion(err, idioma, contexto) {
  // El SDK modular antepone «functions/» al código (functions/resource-exhausted).
  const codigo = String((err && err.code) || "").replace(/^functions\//, "");
  switch (codigo) {
    case "unauthenticated":
      return t(idioma, "errorFuncion.sesion");
    case "unavailable":
    case "deadline-exceeded":
      return t(idioma, "errorFuncion.conexion");
    case "permission-denied":
      if (contexto === "fotos" || contexto === "cocinar") return t(idioma, `errorFuncion.${contexto}.premium`);
      break;
    case "resource-exhausted":
      if (contexto === "fotos" || contexto === "cocinar") return t(idioma, `errorFuncion.${contexto}.limite`);
      break;
    case "invalid-argument":
      if (contexto === "fotos" || contexto === "cocinar") return t(idioma, `errorFuncion.${contexto}.revisar`);
      break;
    case "internal":
      if (contexto === "fotos" || contexto === "cocinar") return t(idioma, `errorFuncion.${contexto}.interpretar`);
      break;
    case "failed-precondition":
      if (contexto === "portal") return t(idioma, "errorFuncion.portal.sinSuscripcion");
      break;
    default:
      break;
  }
  return t(idioma, `errorFuncion.${contexto}.generico`);
}
