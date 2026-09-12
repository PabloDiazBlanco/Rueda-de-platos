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

    // Nombres de días y tipos de comida: viven en español en el modelo de datos (DAYS, mealType
    // del menú generado, claves de perfil.repartoComidas) — cambiarlos ahí tocaría el motor de
    // generación de menús y las reglas de combinación, que comparan por igualdad de texto exacta.
    // Aquí solo se traduce cómo se MUESTRAN, sin tocar el dato real por debajo.
    "dia.Lunes": "Lunes", "dia.Martes": "Martes", "dia.Miércoles": "Miércoles",
    "dia.Jueves": "Jueves", "dia.Viernes": "Viernes", "dia.Sábado": "Sábado", "dia.Domingo": "Domingo",
    "mealType.Desayuno": "Desayuno", "mealType.Media mañana": "Media mañana", "mealType.Comida": "Comida",
    "mealType.Merienda": "Merienda", "mealType.Cena": "Cena",

    "menu.intro": "Genera un ciclo de 2 semanas respetando todas las frecuencias, bloques y probabilidades definidos. Cada vez que pulses el botón, se sortea un menú nuevo.",
    "menu.verObjetivos": "🎯 Ver objetivos",
    "menu.generarOtro": "Generar otro menú",
    "menu.generarPrimero": "Generar menú (2 semanas)",
    "menu.sinMenuTodavia": "Todavía no has generado ningún menú. Pulsa el botón de arriba para crear el primero.",
    "menu.semana": "Semana {n}",
    "menu.exportarPdf": "Exportar PDF",
    "menu.listaCompra": "🛒 Lista de la compra",
    "menu.ocultarEstadisticas": "Ocultar estadísticas ▲",
    "menu.verEstadisticas": "Ver estadísticas ▼",
    "menu.garbanzos5050": "+garbanzos 50/50",
    "menu.ajustada": "ajustada",
    "menu.kcal": "{n} kcal",
    "menu.historial.titulo": "Ciclos anteriores",
    "menu.historial.explicacion": "La app usa el último ciclo para evitar repetir de inmediato el mismo plato cerrado o la misma elección en los grupos de un solo hueco.",
    "menu.historial.platoCerrado": "Plato cerrado: {nombre}",

    "mealDetail.sinDatos": "sin datos nutricionales",
    "mealDetail.total": "Total de la comida",
    "mealDetail.reglaEvitada": "⚠ No se pudo evitar la combinación \"{nombres}\" (regla: nunca) por falta de alternativas ese día.",
    "mealDetail.reglaAplicada": "⚙ Regla aplicada: {nombres} ({nivel})",
    "mealDetail.racionBase": "1 ración = la cantidad base del ingrediente",
    "mealDetail.restablecer": "Restablecer",
    "mealDetail.completadaHoy": "Completada hoy",
    "mealDetail.marcarCompletada": "Marcar como completada hoy",

    "common.cerrar": "Cerrar",

    "nivel.optimo": "Dentro del rango esperado",
    "nivel.ineficaz": "Ritmo demasiado lento",
    "nivel.aviso": "Zona alta del rango",
    "nivel.accion": "Ritmo excesivo",
    "nivel.direccionContraria": "Va en dirección contraria al objetivo",
    "nivel.insuficiente": "Por debajo de lo recomendado",
    "nivel.aceptable": "Aceptable, mejorable",
    "nivel.demasiado": "Por encima de lo recomendado",

    "dayStats.pctObjetivo": "{pct}% del objetivo ({kcal} kcal)",
    "dayStats.fijaObjetivo": "Fija un objetivo diario (botón de arriba) para ver el % de cumplimiento de este día.",

    "saludPublica.titulo": "Sal, azúcares y fibra — media diaria de esta semana",
    "saludPublica.sal": "Sal",
    "saludPublica.azucares": "Azúcares libres",
    "saludPublica.fibra": "Fibra",
    "saludPublica.detalleSal": "recomendado: menos de {n} g/día",
    "saludPublica.detalleAzucares": "óptimo hasta {optimo} g/día · límite {maximo} g/día",
    "saludPublica.detalleFibra": "recomendado: al menos {n} g/día",
    "saludPublica.sobreDias": "Sobre {dias} día{plural} con comidas · umbrales de la OMS",
    "saludPublica.azucarAjustado": " (azúcar ajustado a tu objetivo de kcal)",
    "saludPublica.calculoIncompleto": "⚠ Cálculo incompleto — falta el dato de {lista} en algún alimento usado esta semana. El total real podría ser mayor.",
    "saludPublica.sal.nombre": "sal",
    "saludPublica.azucares.nombre": "azúcares",
    "saludPublica.fibra.nombre": "fibra",

    "objetivosModal.titulo": "Tus objetivos diarios",
    "objetivosModal.perfilIncompleto": "Todavía no tienes un perfil completo, así que no se puede calcular ningún objetivo. Ve a la pestaña \"Perfil\" y rellena tus datos (año de nacimiento, altura, peso y tipo de día a día) para que se calculen solos.",
    "objetivosModal.kcalDia": "kcal / día",
    "objetivosModal.desglose": "{base} kcal día a día + {entrenamiento} kcal entrenamiento (media diaria)",
    "objetivosModal.tdee": "TDEE mantenimiento {kcal} kcal → {etapa} ({signo}{pct}%)",
    "objetivosModal.proteina": "Proteína",
    "objetivosModal.grasa": "Grasa",
    "objetivosModal.carbos": "Carbos",
    "objetivosModal.carbMinAviso": "Con tus entrenamientos intensos habituales, lo ideal sería un mínimo de {carbMin}g de carbohidrato, pero con estas kcal y la grasa ya en su suelo de seguridad ({fatFloor}g) no se puede llegar sin más margen calórico.",
    "objetivosModal.repartoPorComida": "Reparto por comida",
    "objetivosModal.formula": "Calculado con la fórmula de Mifflin-St Jeor para tu día a día, más las kcal de tus entrenamientos habituales sumadas aparte, con un margen de error razonable (ningún cálculo sin laboratorio es exacto al 100%). Si algo cambia (peso, entrenamientos...), actualízalo en la pestaña \"Perfil\" y se recalculará solo.",

    "comboAfinidad.pregunta": "¿Qué te parece esta combinación?",
    "comboAfinidad.meGusta": "Me gusta",
    "comboAfinidad.noMeGusta": "No me gusta",
    "comboAfinidad.bastante": "Bastante",
    "comboAfinidad.siempreQueSePueda": "Siempre que se pueda",
    "comboAfinidad.menos": "Menos",
    "comboAfinidad.nunca": "Nunca",
    "comboAfinidad.guardado": "Guardado en Reglas de afinidad como \"{nivel}\".",

    "print.tuMenu": "Tu menú",
    "print.pie": "FoodDraft — exportado para cocinar con las cantidades a mano",

    "listaCompra.titulo": "Lista de la compra",
    "listaCompra.cicloCompleto": "Ciclo completo",
    "listaCompra.sinMenu": "No hay ningún menú generado todavía.",
    "listaCompra.marcados": "{marcados} de {total} marcados",
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

    "dia.Lunes": "Monday", "dia.Martes": "Tuesday", "dia.Miércoles": "Wednesday",
    "dia.Jueves": "Thursday", "dia.Viernes": "Friday", "dia.Sábado": "Saturday", "dia.Domingo": "Sunday",
    "mealType.Desayuno": "Breakfast", "mealType.Media mañana": "Mid-morning snack", "mealType.Comida": "Lunch",
    "mealType.Merienda": "Afternoon snack", "mealType.Cena": "Dinner",

    "menu.intro": "Generates a 2-week cycle honoring every frequency, block and probability you've set. Each time you press the button, a new menu is drawn.",
    "menu.verObjetivos": "🎯 View goals",
    "menu.generarOtro": "Generate another menu",
    "menu.generarPrimero": "Generate menu (2 weeks)",
    "menu.sinMenuTodavia": "You haven't generated a menu yet. Press the button above to create the first one.",
    "menu.semana": "Week {n}",
    "menu.exportarPdf": "Export PDF",
    "menu.listaCompra": "🛒 Shopping list",
    "menu.ocultarEstadisticas": "Hide stats ▲",
    "menu.verEstadisticas": "View stats ▼",
    "menu.garbanzos5050": "+chickpeas 50/50",
    "menu.ajustada": "adjusted",
    "menu.kcal": "{n} kcal",
    "menu.historial.titulo": "Previous cycles",
    "menu.historial.explicacion": "The app uses the last cycle to avoid immediately repeating the same closed dish or the same pick in single-slot groups.",
    "menu.historial.platoCerrado": "Closed dish: {nombre}",

    "mealDetail.sinDatos": "no nutritional data",
    "mealDetail.total": "Meal total",
    "mealDetail.reglaEvitada": "⚠ Couldn't avoid the \"{nombres}\" combination (rule: never) for lack of alternatives that day.",
    "mealDetail.reglaAplicada": "⚙ Rule applied: {nombres} ({nivel})",
    "mealDetail.racionBase": "1 serving = the ingredient's base amount",
    "mealDetail.restablecer": "Reset",
    "mealDetail.completadaHoy": "Completed today",
    "mealDetail.marcarCompletada": "Mark as completed today",

    "common.cerrar": "Close",

    "nivel.optimo": "Within the expected range",
    "nivel.ineficaz": "Pace too slow",
    "nivel.aviso": "High end of the range",
    "nivel.accion": "Pace too fast",
    "nivel.direccionContraria": "Going the opposite way from your goal",
    "nivel.insuficiente": "Below what's recommended",
    "nivel.aceptable": "Acceptable, could improve",
    "nivel.demasiado": "Above what's recommended",

    "dayStats.pctObjetivo": "{pct}% of goal ({kcal} kcal)",
    "dayStats.fijaObjetivo": "Set a daily goal (button above) to see this day's completion %.",

    "saludPublica.titulo": "Salt, sugar and fiber — this week's daily average",
    "saludPublica.sal": "Salt",
    "saludPublica.azucares": "Free sugars",
    "saludPublica.fibra": "Fiber",
    "saludPublica.detalleSal": "recommended: under {n} g/day",
    "saludPublica.detalleAzucares": "ideal up to {optimo} g/day · limit {maximo} g/day",
    "saludPublica.detalleFibra": "recommended: at least {n} g/day",
    "saludPublica.sobreDias": "Over {dias} day{plural} with meals · WHO thresholds",
    "saludPublica.azucarAjustado": " (sugar adjusted to your kcal goal)",
    "saludPublica.calculoIncompleto": "⚠ Incomplete calculation — missing {lista} data for some food used this week. The real total could be higher.",
    "saludPublica.sal.nombre": "salt",
    "saludPublica.azucares.nombre": "sugar",
    "saludPublica.fibra.nombre": "fiber",

    "objetivosModal.titulo": "Your daily goals",
    "objetivosModal.perfilIncompleto": "You don't have a complete profile yet, so no goal can be calculated. Go to the \"Profile\" tab and fill in your details (birth year, height, weight and day-to-day type) so they're calculated automatically.",
    "objetivosModal.kcalDia": "kcal / day",
    "objetivosModal.desglose": "{base} kcal day-to-day + {entrenamiento} kcal training (daily average)",
    "objetivosModal.tdee": "Maintenance TDEE {kcal} kcal → {etapa} ({signo}{pct}%)",
    "objetivosModal.proteina": "Protein",
    "objetivosModal.grasa": "Fat",
    "objetivosModal.carbos": "Carbs",
    "objetivosModal.carbMinAviso": "With your usual intense training, the ideal would be a minimum of {carbMin}g of carbohydrate, but with these kcal and fat already at its safety floor ({fatFloor}g), it can't be reached without more calorie room.",
    "objetivosModal.repartoPorComida": "Split by meal",
    "objetivosModal.formula": "Calculated with the Mifflin-St Jeor formula for your day-to-day, plus the kcal from your usual training added separately, with a reasonable margin of error (no calculation without a lab is 100% exact). If anything changes (weight, training...), update it in the \"Profile\" tab and it'll recalculate itself.",

    "comboAfinidad.pregunta": "What do you think of this combination?",
    "comboAfinidad.meGusta": "I like it",
    "comboAfinidad.noMeGusta": "I don't like it",
    "comboAfinidad.bastante": "Quite a lot",
    "comboAfinidad.siempreQueSePueda": "Whenever possible",
    "comboAfinidad.menos": "Less",
    "comboAfinidad.nunca": "Never",
    "comboAfinidad.guardado": "Saved in Affinity rules as \"{nivel}\".",

    "print.tuMenu": "Your menu",
    "print.pie": "FoodDraft — exported for cooking with the amounts by hand",

    "listaCompra.titulo": "Shopping list",
    "listaCompra.cicloCompleto": "Full cycle",
    "listaCompra.sinMenu": "No menu has been generated yet.",
    "listaCompra.marcados": "{marcados} of {total} checked",
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
