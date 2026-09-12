// ---------- Internacionalización (i18n) ----------
// Módulo de lógica pura (sin JSX): diccionario de textos de interfaz por idioma, y la función que
// los busca. Nunca traduce datos del usuario (nombres de sus propios platos, notas, comentarios) —
// solo los textos fijos de la interfaz que se registran aquí a mano, uno por uno. Es la Fase 5 de
// la hoja de ruta de publicación (ver memoria del proyecto): un diccionario propio, no una API de
// traducción en vivo, para que la interfaz siga funcionando sin conexión igual que el resto de la
// app (ver sw.js: solo se cachean peticiones al propio origen, una API externa nunca funcionaría
// offline).
//
// Cobertura de hoy: bienvenida, login, cabecera y pestañas principales. El resto de la interfaz
// (menú, configuración, perfil, premium...) se traduce por bloques en pasadas siguientes — hasta
// entonces esos textos se ven en español pase lo que pase, ya que `t` cae siempre a español si
// falta una clave (ver más abajo), nunca rompe la pantalla ni deja un hueco en blanco.

export const IDIOMAS_DISPONIBLES = [
  { key: "es", label: "Español" },
  { key: "en", label: "English" },
];
export const DEFAULT_IDIOMA = "es";

const LOCALSTORAGE_KEY = "fooddraft:idioma";

// Detecta el idioma del navegador entre los disponibles (compara solo los 2 primeros caracteres:
// "en-US" o "en-GB" cuentan igual que "en"). Si no hay ninguno disponible que coincida, cae a
// español — nunca a un idioma a medio traducir por sorpresa.
export function detectarIdiomaNavegador() {
  if (typeof navigator === "undefined" || !navigator.language) return DEFAULT_IDIOMA;
  const base = navigator.language.slice(0, 2).toLowerCase();
  return IDIOMAS_DISPONIBLES.some((i) => i.key === base) ? base : DEFAULT_IDIOMA;
}

// Idioma elegido (o recordado de la última vez) para las pantallas de antes de iniciar sesión
// (bienvenida, login, carga), que no tienen acceso todavía al perfil guardado en Firestore.
// Una vez dentro de la app con sesión iniciada, perfil.idioma manda de verdad — esto es solo
// el punto de partida y lo que se recuerda tras cerrar sesión.
export function leerIdiomaGuardado() {
  try {
    const guardado = localStorage.getItem(LOCALSTORAGE_KEY);
    if (guardado && IDIOMAS_DISPONIBLES.some((i) => i.key === guardado)) return guardado;
  } catch (e) {
    // localStorage puede fallar (navegación privada muy restrictiva) — no pasa nada, se detecta del navegador.
  }
  return detectarIdiomaNavegador();
}

export function guardarIdiomaLocal(idioma) {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, idioma);
  } catch (e) {
    // Sin localStorage, el idioma elegido no sobrevive a un cierre de sesión — no es grave.
  }
}

const TEXTOS = {
  es: {
    "app.eslogan": "Come variado, sin pensarlo cada día.",
    "welcome.iniciarSesion": "Iniciar sesión",

    "login.subtituloLogin": "Inicia sesión para ver tus datos",
    "login.subtituloSignup": "Crea tu cuenta",
    "login.email": "Email",
    "login.password": "Contraseña",
    "login.entrando": "Un momento…",
    "login.iniciarSesion": "Iniciar sesión",
    "login.crearCuenta": "Crear cuenta",
    "login.continuarGoogle": "Continuar con Google",
    "login.noTienesCuenta": "¿No tienes cuenta?",
    "login.creaAqui": "Créala aquí",
    "login.yaTienesCuenta": "¿Ya tienes cuenta?",
    "login.iniciaSesionLink": "Inicia sesión",
    "login.privacidad": "Política de privacidad",
    "login.terminos": "Términos de uso",

    "loading.cargando": "Cargando…",

    "error.emailInvalido": "El email no es válido.",
    "error.usuarioNoExiste": "No existe ninguna cuenta con ese email.",
    "error.passwordIncorrecta": "Contraseña incorrecta.",
    "error.credencialInvalida": "Email o contraseña incorrectos.",
    "error.emailEnUso": "Ya existe una cuenta con ese email. Prueba a iniciar sesión.",
    "error.passwordDebil": "La contraseña debe tener al menos 6 caracteres.",
    "error.popupCerrado": "Has cerrado la ventana de Google antes de terminar.",
    "error.generico": "Ha ocurrido un error ({code}). Inténtalo de nuevo.",

    "tab.menu": "Menú",
    "tab.configuracion": "Configuración",
    "tab.perfil": "Perfil",
    "header.tuRecetario": "Tu recetario",
    "header.guardando": "Guardando…",
    "header.guardado": "Guardado",

    "perfil.idioma.label": "Idioma",
    "perfil.idioma.ayuda": "El idioma de la interfaz. Por ahora, el resto de los textos de la app puede seguir viéndose en español mientras se traduce por partes.",
  },
  en: {
    "app.eslogan": "Eat a varied diet, without thinking about it every day.",
    "welcome.iniciarSesion": "Sign in",

    "login.subtituloLogin": "Sign in to see your data",
    "login.subtituloSignup": "Create your account",
    "login.email": "Email",
    "login.password": "Password",
    "login.entrando": "One moment…",
    "login.iniciarSesion": "Sign in",
    "login.crearCuenta": "Create account",
    "login.continuarGoogle": "Continue with Google",
    "login.noTienesCuenta": "Don't have an account?",
    "login.creaAqui": "Create one here",
    "login.yaTienesCuenta": "Already have an account?",
    "login.iniciaSesionLink": "Sign in",
    "login.privacidad": "Privacy policy",
    "login.terminos": "Terms of use",

    "loading.cargando": "Loading…",

    "error.emailInvalido": "That email isn't valid.",
    "error.usuarioNoExiste": "There's no account with that email.",
    "error.passwordIncorrecta": "Incorrect password.",
    "error.credencialInvalida": "Incorrect email or password.",
    "error.emailEnUso": "An account with that email already exists. Try signing in instead.",
    "error.passwordDebil": "Password must be at least 6 characters.",
    "error.popupCerrado": "You closed the Google window before finishing.",
    "error.generico": "Something went wrong ({code}). Please try again.",

    "tab.menu": "Menu",
    "tab.configuracion": "Settings",
    "tab.perfil": "Profile",
    "header.tuRecetario": "Your recipe book",
    "header.guardando": "Saving…",
    "header.guardado": "Saved",

    "perfil.idioma.label": "Language",
    "perfil.idioma.ayuda": "The interface language. For now, the rest of the app's text may still appear in Spanish while it's translated in stages.",
  },
};

// Busca una clave en el idioma pedido; si falta ahí, cae a español; si tampoco existe en español,
// devuelve la propia clave (para notar enseguida un texto sin registrar en vez de romper la
// pantalla o dejar un hueco en blanco). `vars` sustituye marcadores {nombre} dentro del texto,
// para frases con datos variables (p.ej. un código de error).
export function t(idioma, clave, vars) {
  const dict = TEXTOS[idioma] || TEXTOS[DEFAULT_IDIOMA];
  let texto = dict[clave] ?? TEXTOS[DEFAULT_IDIOMA][clave] ?? clave;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      texto = texto.replace(`{${k}}`, vars[k]);
    });
  }
  return texto;
}
