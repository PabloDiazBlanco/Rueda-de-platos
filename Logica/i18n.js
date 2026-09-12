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

    "campo.nombre": "Nombre (opcional)",
    "campo.nombre.placeholder": "¿Cómo te llamas?",
    "campo.sexo": "Sexo",
    "campo.sexo.mujer": "Mujer",
    "campo.sexo.hombre": "Hombre",
    "campo.anioNacimiento": "Año de nacimiento",
    "campo.anioNacimiento.placeholder": "Ej: 1995",
    "campo.altura": "Altura",
    "campo.peso": "Peso",
    "campo.tipoDiaADia": "Tipo de día a día (sin contar el entrenamiento)",
    "campo.entrenamientos": "Entrenamientos habituales (opcional)",
    "campo.horasPorSesion": "Horas/sesión",
    "campo.vecesPorSemana": "Veces/semana",
    "campo.anadirEntrenamiento": "Añadir entrenamiento",
    "campo.objetivoActual": "Objetivo actual",

    "pal.escritorio": "Trabajo / estudios de escritorio",
    "pal.escritorio.desc": "Te pasas la mayor parte del día sentado",
    "pal.de_pie": "De pie, moviéndote bastante",
    "pal.de_pie.desc": "Trabajo activo, caminas o estás de pie buena parte del día",
    "pal.exigente": "Físicamente exigente",
    "pal.exigente.desc": "Trabajo manual o muy activo la mayor parte del día",

    "entrenamiento.pesas": "Pesas / fuerza",
    "entrenamiento.cardio_ligero": "Cardio ligero (caminar rápido, bici suave)",
    "entrenamiento.correr": "Correr a ritmo medio",
    "entrenamiento.ciclismo": "Ciclismo moderado",
    "entrenamiento.natacion": "Natación",
    "entrenamiento.deporte_equipo": "Deporte de equipo / pádel / tenis",
    "entrenamiento.hiit": "HIIT / alta intensidad",
    "entrenamiento.yoga_pilates": "Yoga / pilates",

    "objetivoEtapa.mantenimiento": "Mantenimiento",
    "objetivoEtapa.mantenimiento.desc": "Mantener el peso actual",
    "objetivoEtapa.volumen": "Volumen limpio",
    "objetivoEtapa.volumen.desc": "Sube de peso progresivamente, minimizando la grasa (+12%)",
    "objetivoEtapa.definicion": "Definición conservadora",
    "objetivoEtapa.definicion.desc": "Baja de peso a ritmo lento y seguro (−15%)",

    "profileFields.formula": "El cálculo usa la fórmula de Mifflin-St Jeor para tu día a día, y suma aparte las kcal de tus entrenamientos habituales (vía METs), para no sobreestimar tu gasto si tu día a día es sedentario aunque entrenes varios días por semana. Ningún cálculo sin laboratorio es exacto al 100% — el objetivo de esta app no es la precisión absoluta, sino ayudarte a tener una relación más sana con la comida, sin tener que pensarla desde cero.",
    "profileFields.verDesglose": "Ver cálculo desglosado",

    "desglose.titulo": "Cálculo desglosado",
    "desglose.faltaDatos": "Completa año de nacimiento, altura y peso para ver el desglose.",
    "desglose.bmr": "BMR (fórmula de Mifflin-St Jeor)",
    "desglose.palLinea": "× PAL {pal} — {nivel}",
    "desglose.kcalDiaADia": "{n} kcal día a día",
    "desglose.entrenamientos": "+ Entrenamientos habituales (vía METs)",
    "desglose.tdeeMantenimiento": "= TDEE de mantenimiento",
    "desglose.etapaLinea": "{etapa} ({signo}{pct}%)",

    "onboarding.titulo": "Antes de empezar",
    "onboarding.subtitulo": "Con estos datos, la app puede calcular tus objetivos diarios de calorías y macros. Es completamente opcional.",
    "onboarding.guardarContinuar": "Guardar y continuar",
    "onboarding.saltar": "Saltar por ahora (no tendré objetivos calculados)",

    "perfilView.intro": "Estos datos se usan para calcular tus objetivos diarios de calorías y macros. Cámbialos cuando quieras — se recalculan solos al guardar.",
    "perfilView.repartoComidas.titulo": "Reparto de comidas",
    "perfilView.repartoComidas.intro": "Elige cuántas comidas haces al día y qué peso tiene cada una sobre tu objetivo diario — se usa tanto para generar el menú como para tu fracción de comidas completadas del resumen mensual. Comida y Cena están siempre presentes.",
    "perfilView.recomendado": "Recomendado",
    "perfilView.pesoDeCadaComida": "Peso de cada comida",
    "perfilView.suma": "Suma: {n}%",
    "perfilView.sumaAviso": " — debe sumar exactamente 100%",
    "perfilView.guardarCambios": "Guardar cambios",
    "perfilView.guardadoOk": "Perfil actualizado — tus objetivos se han recalculado. Puedes verlos en el botón \"Objetivos\" de la pestaña Menú.",
    "perfilView.eliminarCuenta.titulo": "Eliminar cuenta",
    "perfilView.eliminarCuenta.desc": "Borra tu cuenta y todos tus datos (alimentos, platos, menús, peso, objetivos) de forma permanente. No se puede deshacer.",
    "perfilView.eliminarCuenta.boton": "Eliminar mi cuenta",

    "preset.clasico-4.label": "Clásico · 4 comidas",
    "preset.clasico-4.texto": "El reparto con más respaldo en la ciencia de la crononutrición: concentra la energía en la primera mitad del día.",
    "preset.sin-merienda-3.label": "3 comidas · sin merienda",
    "preset.sin-merienda-3.texto": "Desayuno, comida y cena, sin nada entre horas — el patrón de toda la vida, con una comida menos que el clásico pero manteniendo una estructura clara a lo largo del día.",
    "preset.sin-desayuno-3.label": "3 comidas · sin desayuno",
    "preset.sin-desayuno-3.texto": "Saltarse el desayuno de forma habitual se ha relacionado en algunos estudios con más grasa acumulada en el hígado — no es motivo de alarma, pero conviene saberlo si lo haces todos los días.",
    "preset.intermitente-2.label": "2 comidas · comida y cena",
    "preset.intermitente-2.texto": "Ayuno intermitente: menos comidas, pero más grandes. Cuantas menos comidas haces, más fácil es acabar picoteando entre horas si no te sacian bien — vigila bien las raciones. Además, la evidencia respalda más la versión con la comida desplazada temprano en el día que tarde.",
    "preset.cinco-5.label": "5 comidas · con media mañana",
    "preset.cinco-5.texto": "Comidas más pequeñas y repartidas, para quien prefiere no pasar muchas horas seguidas sin comer. No es de los patrones con más evidencia detrás, pero es una forma habitual y válida de organizar el día.",
    "avisoCena": "Cenas copiosas o muy tardías se asocian a peor control de azúcar, peor descanso y más riesgo de grasa en el hígado. Si puedes, que la cena no sea ni la más pesada ni la más tardía del día.",

    "deleteAccount.palabraConfirmacion": "ELIMINAR",
    "deleteAccount.desc": "Esto borra permanentemente tu cuenta y todos tus datos: alimentos, platos, menús, historial de peso y objetivos. No se puede deshacer.",
    "deleteAccount.tuContrasena": "Tu contraseña",
    "deleteAccount.escribePara": "Escribe {palabra} para confirmar",
    "deleteAccount.cancelar": "Cancelar",
    "deleteAccount.eliminando": "Eliminando…",
    "deleteAccount.needsPassword": "Introduce tu contraseña para confirmar.",
    "deleteAccount.wrongPassword": "Contraseña incorrecta.",
    "deleteAccount.popupCerrado": "Has cerrado la ventana de Google antes de confirmar.",
    "deleteAccount.errorGenerico": "No se ha podido eliminar la cuenta. Inténtalo de nuevo.",

    "perfilRoot.datosPersonales": "Datos personales",
    "perfilRoot.datosPersonales.desc": "perfil y objetivos",
    "perfilRoot.seguimientoPeso": "Seguimiento de peso",
    "perfilRoot.seguimientoPeso.desc": "pesadas y tendencia",
    "perfilRoot.funcionPremium": "función premium",
    "perfilRoot.resumenMensual": "Resumen mensual",
    "perfilRoot.resumenMensual.desc": "comidas completadas",
    "perfilRoot.medidasCorporales": "Medidas corporales",
    "perfilRoot.proximamente": "próximamente",
    "perfilRoot.premium": "Premium",
    "perfilRoot.hazteremium": "Hazte premium",
    "perfilRoot.gestionarSuscripcion": "gestionar suscripción",
    "perfilRoot.desbloqueaMas": "desbloquea más",
    "perfilRoot.documentos": "Documentos",
    "perfilRoot.documentos.desc": "por qué funciona así",
    "perfilRoot.descargarDatos": "Descargar una copia de mis datos",

    "premiumNotice.verPremium": "Ver premium",
    "premiumNotice.cocinar.titulo": "\"¿Qué cocino?\" es premium",
    "premiumNotice.cocinar.texto": "Manda una foto de lo que tengas y recibe ideas hechas solo con alimentos de tu propio catálogo, con macros reales — parte de la suscripción premium.",
    "premiumNotice.peso.titulo": "El seguimiento de peso es premium",
    "premiumNotice.peso.texto": "Ciclos, tendencia y ajuste automático de tus objetivos según cómo evoluciona tu peso real — parte de la suscripción premium.",
    "premiumNotice.resumen.titulo": "El resumen completo es premium",
    "premiumNotice.resumen.texto": "Con premium, este resumen se combina con tu objetivo actual y tu tendencia de peso del mes, con gráfica incluida.",

    "resumenMensual.intro": "Cuenta las comidas que has marcado como completadas desde el detalle de cada comida en el Menú — se guarda con fecha real, aunque regeneres el menú.",
    "resumenMensual.completadas": "{completadas} de {esperadas} comidas completadas",
    "resumenMensual.basadoEn": "Basado en {n} comidas al día (configurado en tu perfil)",
    "resumenMensual.objetivoActual": "Objetivo actual",
    "resumenMensual.kcalDia": "{n} kcal/día",
    "resumenMensual.pesoEsteMes": "Peso este mes",
    "resumenMensual.sinPesadas": "sin pesadas este mes",
    "resumenMensual.tendenciaDe": "Tendencia de peso · {mes}",
    "resumenMensual.hasCompletado": "Has completado el {pct}% de tus comidas",
    "resumenMensual.yTuPeso": ", y tu peso",
    "resumenMensual.pesoBajado": "ha bajado",
    "resumenMensual.pesoSubido": "ha subido",
    "resumenMensual.pesoMantenido": "se ha mantenido",
    "resumenMensual.esteMesKg": " {kg} kg este mes.",
    "resumenMensual.esteMes": " este mes.",

    "premiumView.yaEres": "Ya eres premium",
    "premiumView.hazte": "Hazte premium",
    "premiumView.precio": "2,99€/mes — cancela cuando quieras",
    "premiumView.unMomento": "Un momento…",
    "premiumView.gestionarSuscripcion": "Gestionar mi suscripción",
    "premiumView.suscribirme": "Suscribirme",
    "premiumView.ventaja1": "Lector de etiquetas por foto (20 análisis al mes con IA)",
    "premiumView.ventaja2": "Seguimiento de peso completo: ciclos, tendencia y ajuste automático de objetivos",
    "premiumView.ventaja3": "\"Qué puedo cocinar con lo que tengo\" a partir de una foto y/o texto con tus ingredientes",
    "premiumView.ventaja4": "Resumen mensual extendido: objetivo actual, peso del mes y su gráfica de tendencia",
    "premiumView.ventaja5": "Sin anuncios",

    "suggestMeals.intro": "Manda una foto de lo que tengas (nevera, despensa...), escribe qué ingredientes tienes, o ambas cosas — te sugerimos combinaciones hechas solo con alimentos de tu propio catálogo, con macros reales, no una estimación de la IA.",
    "suggestMeals.cambiarFoto": "Cambiar foto",
    "suggestMeals.hacerFoto": "Hacer/subir foto (opcional)",
    "suggestMeals.otrosIngredientesConFoto": "Otros ingredientes que no salgan bien en la foto (opcional)",
    "suggestMeals.otrosIngredientesSinFoto": "Ingredientes que tienes — puedes escribirlos aquí sin necesidad de foto",
    "suggestMeals.placeholderIngredientes": "Ej: arroz en la despensa, huevos",
    "suggestMeals.especias": "Especias o condimentos disponibles (opcional)",
    "suggestMeals.placeholderEspecias": "Ej: comino, pimentón, orégano, ajo en polvo",
    "suggestMeals.queCocino": "¿Qué puedo cocinar?",
    "suggestMeals.sinResultados": "No hemos reconocido ningún alimento de tu catálogo en la foto. Prueba con otra imagen, o añade primero esos alimentos al catálogo.",
    "suggestMeals.guardarComoCerrado": "Guardar como plato cerrado",

    "medidas.proximamente": "Próximamente",
    "medidas.texto": "Aquí podrás añadir pliegues cutáneos y medidas corporales (cintura, cadera...) para completar el seguimiento más allá del peso en la báscula. Por ahora no es necesario — el seguimiento de peso de al lado ya cubre lo esencial.",

    "documentos.intro": "Aquí se podrán consultar documentos que, sin ser necesarios para que la app funcione, explican cómo funciona por dentro — y buscan dejar claro que decisiones como las fórmulas, los porcentajes o los umbrales no están puestas al azar.",
    "documentos.sinDocumentos": "Todavía no hay documentos añadidos",
    "documentos.sinDocumentos.desc": "En cuanto estén listos, aquí aparecerán los documentos que explican y justifican el funcionamiento interno de la app.",
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

    "campo.nombre": "Name (optional)",
    "campo.nombre.placeholder": "What's your name?",
    "campo.sexo": "Sex",
    "campo.sexo.mujer": "Female",
    "campo.sexo.hombre": "Male",
    "campo.anioNacimiento": "Birth year",
    "campo.anioNacimiento.placeholder": "E.g.: 1995",
    "campo.altura": "Height",
    "campo.peso": "Weight",
    "campo.tipoDiaADia": "Day-to-day type (not counting training)",
    "campo.entrenamientos": "Usual training (optional)",
    "campo.horasPorSesion": "Hours/session",
    "campo.vecesPorSemana": "Times/week",
    "campo.anadirEntrenamiento": "Add training",
    "campo.objetivoActual": "Current goal",

    "pal.escritorio": "Desk work / studies",
    "pal.escritorio.desc": "You spend most of the day sitting down",
    "pal.de_pie": "On your feet, moving quite a bit",
    "pal.de_pie.desc": "Active work, you walk or stand for a good part of the day",
    "pal.exigente": "Physically demanding",
    "pal.exigente.desc": "Manual or very active work most of the day",

    "entrenamiento.pesas": "Weights / strength",
    "entrenamiento.cardio_ligero": "Light cardio (brisk walking, easy cycling)",
    "entrenamiento.correr": "Running at a moderate pace",
    "entrenamiento.ciclismo": "Moderate cycling",
    "entrenamiento.natacion": "Swimming",
    "entrenamiento.deporte_equipo": "Team sport / padel / tennis",
    "entrenamiento.hiit": "HIIT / high intensity",
    "entrenamiento.yoga_pilates": "Yoga / pilates",

    "objetivoEtapa.mantenimiento": "Maintenance",
    "objetivoEtapa.mantenimiento.desc": "Keep your current weight",
    "objetivoEtapa.volumen": "Clean bulk",
    "objetivoEtapa.volumen.desc": "Gain weight progressively, minimizing fat (+12%)",
    "objetivoEtapa.definicion": "Conservative cut",
    "objetivoEtapa.definicion.desc": "Lose weight at a slow, safe pace (−15%)",

    "profileFields.formula": "The calculation uses the Mifflin-St Jeor formula for your day-to-day, and adds the kcal from your usual training separately (via METs), so as not to overestimate your expenditure if your day-to-day is sedentary even if you train several days a week. No calculation without a lab is 100% exact — this app's goal isn't absolute precision, but helping you have a healthier relationship with food, without having to think it through from scratch.",
    "profileFields.verDesglose": "View detailed calculation",

    "desglose.titulo": "Detailed calculation",
    "desglose.faltaDatos": "Fill in birth year, height and weight to see the breakdown.",
    "desglose.bmr": "BMR (Mifflin-St Jeor formula)",
    "desglose.palLinea": "× PAL {pal} — {nivel}",
    "desglose.kcalDiaADia": "{n} kcal day-to-day",
    "desglose.entrenamientos": "+ Usual training (via METs)",
    "desglose.tdeeMantenimiento": "= Maintenance TDEE",
    "desglose.etapaLinea": "{etapa} ({signo}{pct}%)",

    "onboarding.titulo": "Before we start",
    "onboarding.subtitulo": "With this information, the app can calculate your daily calorie and macro goals. It's entirely optional.",
    "onboarding.guardarContinuar": "Save and continue",
    "onboarding.saltar": "Skip for now (I won't have any goals calculated)",

    "perfilView.intro": "This information is used to calculate your daily calorie and macro goals. Change it whenever you want — it recalculates itself when you save.",
    "perfilView.repartoComidas.titulo": "Meal split",
    "perfilView.repartoComidas.intro": "Choose how many meals you have a day and how much weight each one carries toward your daily goal — it's used both to generate the menu and for your completed-meals fraction in the monthly summary. Lunch and Dinner are always present.",
    "perfilView.recomendado": "Recommended",
    "perfilView.pesoDeCadaComida": "Weight of each meal",
    "perfilView.suma": "Total: {n}%",
    "perfilView.sumaAviso": " — must add up to exactly 100%",
    "perfilView.guardarCambios": "Save changes",
    "perfilView.guardadoOk": "Profile updated — your goals have been recalculated. You can see them in the \"Goals\" button on the Menu tab.",
    "perfilView.eliminarCuenta.titulo": "Delete account",
    "perfilView.eliminarCuenta.desc": "Permanently deletes your account and all your data (foods, dishes, menus, weight, goals). This can't be undone.",
    "perfilView.eliminarCuenta.boton": "Delete my account",

    "preset.clasico-4.label": "Classic · 4 meals",
    "preset.clasico-4.texto": "The split with the strongest backing in chrononutrition science: concentrates energy in the first half of the day.",
    "preset.sin-merienda-3.label": "3 meals · no afternoon snack",
    "preset.sin-merienda-3.texto": "Breakfast, lunch and dinner, nothing in between — the lifelong pattern, one meal fewer than the classic but keeping a clear structure through the day.",
    "preset.sin-desayuno-3.label": "3 meals · no breakfast",
    "preset.sin-desayuno-3.texto": "Habitually skipping breakfast has been linked in some studies to more fat buildup in the liver — not a reason to worry, but worth knowing if you do it every day.",
    "preset.intermitente-2.label": "2 meals · lunch and dinner",
    "preset.intermitente-2.texto": "Intermittent fasting: fewer meals, but bigger ones. The fewer meals you have, the easier it is to end up snacking between them if they don't fill you up well — watch your portions closely. Also, the evidence backs the version with the meal shifted earlier in the day more than later.",
    "preset.cinco-5.label": "5 meals · with mid-morning snack",
    "preset.cinco-5.texto": "Smaller, more spread-out meals, for those who'd rather not go many hours in a row without eating. It's not among the patterns with the most evidence behind it, but it's a common and valid way to organize the day.",
    "avisoCena": "Heavy or very late dinners are linked to worse blood sugar control, worse sleep and more risk of fatty liver. If you can, don't make dinner the heaviest or the latest meal of the day.",

    "deleteAccount.palabraConfirmacion": "DELETE",
    "deleteAccount.desc": "This permanently deletes your account and all your data: foods, dishes, menus, weight history and goals. This can't be undone.",
    "deleteAccount.tuContrasena": "Your password",
    "deleteAccount.escribePara": "Type {palabra} to confirm",
    "deleteAccount.cancelar": "Cancel",
    "deleteAccount.eliminando": "Deleting…",
    "deleteAccount.needsPassword": "Enter your password to confirm.",
    "deleteAccount.wrongPassword": "Incorrect password.",
    "deleteAccount.popupCerrado": "You closed the Google window before confirming.",
    "deleteAccount.errorGenerico": "Couldn't delete the account. Please try again.",

    "perfilRoot.datosPersonales": "Personal data",
    "perfilRoot.datosPersonales.desc": "profile and goals",
    "perfilRoot.seguimientoPeso": "Weight tracking",
    "perfilRoot.seguimientoPeso.desc": "weigh-ins and trend",
    "perfilRoot.funcionPremium": "premium feature",
    "perfilRoot.resumenMensual": "Monthly summary",
    "perfilRoot.resumenMensual.desc": "completed meals",
    "perfilRoot.medidasCorporales": "Body measurements",
    "perfilRoot.proximamente": "coming soon",
    "perfilRoot.premium": "Premium",
    "perfilRoot.hazteremium": "Go premium",
    "perfilRoot.gestionarSuscripcion": "manage subscription",
    "perfilRoot.desbloqueaMas": "unlock more",
    "perfilRoot.documentos": "Documents",
    "perfilRoot.documentos.desc": "why it works this way",
    "perfilRoot.descargarDatos": "Download a copy of my data",

    "premiumNotice.verPremium": "See premium",
    "premiumNotice.cocinar.titulo": "\"What do I cook?\" is premium",
    "premiumNotice.cocinar.texto": "Send a photo of what you have and get ideas made only with food from your own catalog, with real macros — part of the premium subscription.",
    "premiumNotice.peso.titulo": "Weight tracking is premium",
    "premiumNotice.peso.texto": "Cycles, trend and automatic adjustment of your goals based on how your real weight evolves — part of the premium subscription.",
    "premiumNotice.resumen.titulo": "The full summary is premium",
    "premiumNotice.resumen.texto": "With premium, this summary combines with your current goal and your weight trend for the month, chart included.",

    "resumenMensual.intro": "Counts the meals you've marked as completed from each meal's detail in Menu — saved with the real date, even if you regenerate the menu.",
    "resumenMensual.completadas": "{completadas} of {esperadas} meals completed",
    "resumenMensual.basadoEn": "Based on {n} meals a day (set in your profile)",
    "resumenMensual.objetivoActual": "Current goal",
    "resumenMensual.kcalDia": "{n} kcal/day",
    "resumenMensual.pesoEsteMes": "Weight this month",
    "resumenMensual.sinPesadas": "no weigh-ins this month",
    "resumenMensual.tendenciaDe": "Weight trend · {mes}",
    "resumenMensual.hasCompletado": "You've completed {pct}% of your meals",
    "resumenMensual.yTuPeso": ", and your weight",
    "resumenMensual.pesoBajado": "has gone down",
    "resumenMensual.pesoSubido": "has gone up",
    "resumenMensual.pesoMantenido": "has stayed the same",
    "resumenMensual.esteMesKg": " {kg} kg this month.",
    "resumenMensual.esteMes": " this month.",

    "premiumView.yaEres": "You're already premium",
    "premiumView.hazte": "Go premium",
    "premiumView.precio": "€2.99/month — cancel anytime",
    "premiumView.unMomento": "One moment…",
    "premiumView.gestionarSuscripcion": "Manage my subscription",
    "premiumView.suscribirme": "Subscribe",
    "premiumView.ventaja1": "Photo label reader (20 AI analyses a month)",
    "premiumView.ventaja2": "Full weight tracking: cycles, trend and automatic goal adjustment",
    "premiumView.ventaja3": "\"What can I cook with what I have\" from a photo and/or text with your ingredients",
    "premiumView.ventaja4": "Extended monthly summary: current goal, weight for the month and its trend chart",
    "premiumView.ventaja5": "No ads",

    "suggestMeals.intro": "Send a photo of what you have (fridge, pantry...), type what ingredients you have, or both — we'll suggest combinations made only with food from your own catalog, with real macros, not an AI estimate.",
    "suggestMeals.cambiarFoto": "Change photo",
    "suggestMeals.hacerFoto": "Take/upload photo (optional)",
    "suggestMeals.otrosIngredientesConFoto": "Other ingredients that don't show up well in the photo (optional)",
    "suggestMeals.otrosIngredientesSinFoto": "Ingredients you have — you can type them here without a photo",
    "suggestMeals.placeholderIngredientes": "E.g.: rice in the pantry, eggs",
    "suggestMeals.especias": "Available spices or condiments (optional)",
    "suggestMeals.placeholderEspecias": "E.g.: cumin, paprika, oregano, garlic powder",
    "suggestMeals.queCocino": "What can I cook?",
    "suggestMeals.sinResultados": "We didn't recognize any food from your catalog in the photo. Try another image, or add that food to your catalog first.",
    "suggestMeals.guardarComoCerrado": "Save as closed dish",

    "medidas.proximamente": "Coming soon",
    "medidas.texto": "Here you'll be able to add skinfolds and body measurements (waist, hip...) to complete tracking beyond scale weight. It's not necessary for now — the weight tracking next to it already covers the essentials.",

    "documentos.intro": "Here you'll be able to check documents that, without being necessary for the app to work, explain how it works internally — and aim to make clear that decisions like formulas, percentages or thresholds aren't set at random.",
    "documentos.sinDocumentos": "No documents added yet",
    "documentos.sinDocumentos.desc": "As soon as they're ready, the documents explaining and justifying the app's internal workings will appear here.",
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
