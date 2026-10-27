// ---------- Entreno: biblioteca de ejercicios ----------
// Módulo de lógica pura (sin JSX, sin React) del módulo de entreno (octubre de 2026): los tipos de
// ejercicio y de serie, los grupos musculares y equipos, la biblioteca semilla de 80 ejercicios y la
// búsqueda. El diseño completo está en local/ideas/gimnasio/03-diseno-modulo-entreno.md (§4.5 y §7.2) y
// las decisiones cerradas en 04-plan-de-ejecucion.md (§3).
//
// Por qué así:
// - **Ids fijos** (`ex_press_banca_barra`...): las sesiones guardadas, el índice y una futura importación
//   desde Hevy o Lyfta se refieren a los ejercicios por id, así que un id de la semilla no cambia nunca
//   (como los `f_...` de FOODS_SEED). Para quitar uno de la biblioteca habría que dejarlo y ocultarlo.
// - **El nombre no vive aquí** sino en logica/entreno-nombres.js, en los cinco idiomas: a diferencia de
//   los alimentos (que se guardan solo en español), un ejercicio lo nombra la propia app y un usuario
//   inglés no debería ver «Jalón al pecho». Los ejercicios propios llevan su `nombre` tal cual lo
//   escribió el usuario (dato del usuario: nunca se traduce).
// - **Sin imágenes ni textos ajenos**: la biblioteca es propia, escrita a mano.

// Qué se anota en cada serie según el tipo de ejercicio. `asistido_reps` usa «kg» para los kilos de
// ayuda de la máquina (cuantos más, más fácil), y `lastre_reps` para el lastre que se cuelga.
export const TIPOS_EJERCICIO = ["peso_reps", "reps", "lastre_reps", "asistido_reps", "duracion", "distancia_duracion"];

const CAMPOS_POR_TIPO = {
  peso_reps: ["kg", "reps"],
  reps: ["reps"],
  lastre_reps: ["kg", "reps"],
  asistido_reps: ["kg", "reps"],
  duracion: ["seg"],
  distancia_duracion: ["km", "seg"],
};

export function camposDeTipo(tipo) {
  return CAMPOS_POR_TIPO[tipo] || CAMPOS_POR_TIPO.peso_reps;
}

// Tipos de serie. La normal no lleva letra (se numera: 1, 2, 3...); las demás llevan la suya, como en
// las apps de las que viene la costumbre (W de «warm-up»). Las de calentamiento no cuentan para el
// volumen ni para las series por músculo, y tienen su propio descanso, más corto.
export const TIPOS_SERIE = ["normal", "calentamiento", "fallo", "drop"];
export const LETRA_SERIE = { calentamiento: "W", fallo: "F", drop: "D" };

// Grupos musculares. `cardio` no es un músculo: agrupa la cinta, la bici... y no cuenta en «series por
// músculo» (ver seriesPorMusculo en entreno-calculo.js).
export const GRUPOS_MUSCULARES = [
  "pecho", "dorsales", "espalda_alta", "hombros", "biceps", "triceps", "antebrazos", "abdomen", "lumbar",
  "gluteos", "cuadriceps", "isquios", "gemelos", "aductores", "cardio",
];

export const EQUIPOS = ["barra", "mancuernas", "maquina", "polea", "peso_corporal", "kettlebell", "banda", "otro"];

// Biblioteca semilla (anexo A del plan): [id, tipo, músculo principal, secundarios, equipo]. Los más
// comunes por grupo muscular y equipo, incluidos los que salen en las capturas del usuario de las apps
// que usaba (para que lo importado encaje desde el principio).
const FILAS_SEMILLA = [
  // Pecho
  ["ex_press_banca_barra", "peso_reps", "pecho", ["triceps", "hombros"], "barra"],
  ["ex_press_inclinado_barra", "peso_reps", "pecho", ["hombros", "triceps"], "barra"],
  ["ex_press_declinado_barra", "peso_reps", "pecho", ["triceps"], "barra"],
  ["ex_press_banca_mancuernas", "peso_reps", "pecho", ["triceps", "hombros"], "mancuernas"],
  ["ex_press_inclinado_mancuernas", "peso_reps", "pecho", ["hombros", "triceps"], "mancuernas"],
  ["ex_press_pecho_maquina", "peso_reps", "pecho", ["triceps", "hombros"], "maquina"],
  ["ex_aperturas_maquina", "peso_reps", "pecho", ["hombros"], "maquina"],
  ["ex_aperturas_mancuernas", "peso_reps", "pecho", ["hombros"], "mancuernas"],
  ["ex_cruce_poleas", "peso_reps", "pecho", ["hombros"], "polea"],
  ["ex_fondos_paralelas", "reps", "pecho", ["triceps", "hombros"], "peso_corporal"],
  ["ex_flexiones", "reps", "pecho", ["triceps", "hombros"], "peso_corporal"],
  // Espalda
  ["ex_dominadas", "reps", "dorsales", ["biceps", "espalda_alta"], "peso_corporal"],
  ["ex_dominadas_lastradas", "lastre_reps", "dorsales", ["biceps", "espalda_alta"], "peso_corporal"],
  ["ex_dominadas_asistidas", "asistido_reps", "dorsales", ["biceps"], "maquina"],
  ["ex_jalon_pecho", "peso_reps", "dorsales", ["biceps", "espalda_alta"], "polea"],
  ["ex_jalon_estrecho", "peso_reps", "dorsales", ["biceps"], "polea"],
  ["ex_remo_barra", "peso_reps", "espalda_alta", ["dorsales", "biceps", "lumbar"], "barra"],
  ["ex_remo_mancuerna", "peso_reps", "dorsales", ["espalda_alta", "biceps"], "mancuernas"],
  ["ex_remo_sentado_polea", "peso_reps", "espalda_alta", ["dorsales", "biceps"], "polea"],
  ["ex_remo_maquina", "peso_reps", "espalda_alta", ["dorsales", "biceps"], "maquina"],
  ["ex_remo_landmine", "peso_reps", "espalda_alta", ["dorsales", "biceps"], "barra"],
  ["ex_pullover_polea", "peso_reps", "dorsales", ["triceps"], "polea"],
  ["ex_peso_muerto", "peso_reps", "isquios", ["gluteos", "lumbar", "espalda_alta"], "barra"],
  ["ex_hiperextensiones", "reps", "lumbar", ["gluteos", "isquios"], "peso_corporal"],
  ["ex_encogimientos", "peso_reps", "espalda_alta", ["antebrazos"], "mancuernas"],
  // Hombros
  ["ex_press_militar", "peso_reps", "hombros", ["triceps"], "barra"],
  ["ex_press_hombro_mancuernas", "peso_reps", "hombros", ["triceps"], "mancuernas"],
  ["ex_press_hombro_maquina", "peso_reps", "hombros", ["triceps"], "maquina"],
  ["ex_laterales_mancuernas", "peso_reps", "hombros", [], "mancuernas"],
  ["ex_laterales_polea", "peso_reps", "hombros", [], "polea"],
  ["ex_laterales_maquina", "peso_reps", "hombros", [], "maquina"],
  ["ex_frontales", "peso_reps", "hombros", ["pecho"], "mancuernas"],
  ["ex_pajaros_mancuernas", "peso_reps", "hombros", ["espalda_alta"], "mancuernas"],
  ["ex_contractor_inverso", "peso_reps", "hombros", ["espalda_alta"], "maquina"],
  ["ex_face_pull", "peso_reps", "hombros", ["espalda_alta"], "polea"],
  // Bíceps, tríceps y antebrazos
  ["ex_curl_barra", "peso_reps", "biceps", ["antebrazos"], "barra"],
  ["ex_curl_mancuernas", "peso_reps", "biceps", ["antebrazos"], "mancuernas"],
  ["ex_curl_martillo", "peso_reps", "biceps", ["antebrazos"], "mancuernas"],
  ["ex_curl_polea", "peso_reps", "biceps", [], "polea"],
  ["ex_curl_predicador", "peso_reps", "biceps", [], "maquina"],
  ["ex_curl_inclinado", "peso_reps", "biceps", [], "mancuernas"],
  ["ex_triceps_cuerda", "peso_reps", "triceps", [], "polea"],
  ["ex_triceps_barra_polea", "peso_reps", "triceps", [], "polea"],
  ["ex_press_frances", "peso_reps", "triceps", [], "barra"],
  ["ex_triceps_sobre_cabeza", "peso_reps", "triceps", [], "polea"],
  ["ex_fondos_maquina", "peso_reps", "triceps", ["pecho"], "maquina"],
  ["ex_press_cerrado", "peso_reps", "triceps", ["pecho"], "barra"],
  ["ex_curl_muneca", "peso_reps", "antebrazos", [], "mancuernas"],
  // Abdomen
  ["ex_plancha", "duracion", "abdomen", ["lumbar"], "peso_corporal"],
  ["ex_plancha_lateral", "duracion", "abdomen", [], "peso_corporal"],
  ["ex_crunch", "reps", "abdomen", [], "peso_corporal"],
  ["ex_crunch_polea", "peso_reps", "abdomen", [], "polea"],
  ["ex_crunch_maquina", "peso_reps", "abdomen", [], "maquina"],
  ["ex_elevacion_piernas", "reps", "abdomen", [], "peso_corporal"],
  ["ex_rueda_abdominal", "reps", "abdomen", ["lumbar"], "otro"],
  // Piernas
  ["ex_sentadilla", "peso_reps", "cuadriceps", ["gluteos", "isquios", "lumbar"], "barra"],
  ["ex_sentadilla_frontal", "peso_reps", "cuadriceps", ["gluteos"], "barra"],
  ["ex_sentadilla_goblet", "peso_reps", "cuadriceps", ["gluteos"], "kettlebell"],
  ["ex_prensa", "peso_reps", "cuadriceps", ["gluteos", "isquios"], "maquina"],
  ["ex_hack", "peso_reps", "cuadriceps", ["gluteos"], "maquina"],
  ["ex_extension_cuadriceps", "peso_reps", "cuadriceps", [], "maquina"],
  ["ex_zancadas", "peso_reps", "cuadriceps", ["gluteos"], "mancuernas"],
  ["ex_bulgara", "peso_reps", "cuadriceps", ["gluteos"], "mancuernas"],
  ["ex_peso_muerto_rumano", "peso_reps", "isquios", ["gluteos", "lumbar"], "barra"],
  ["ex_femoral_tumbado", "peso_reps", "isquios", [], "maquina"],
  ["ex_femoral_sentado", "peso_reps", "isquios", [], "maquina"],
  ["ex_hip_thrust", "peso_reps", "gluteos", ["isquios"], "barra"],
  ["ex_hip_thrust_maquina", "peso_reps", "gluteos", ["isquios"], "maquina"],
  ["ex_patada_gluteo", "peso_reps", "gluteos", ["isquios"], "polea"],
  ["ex_abductores", "peso_reps", "gluteos", [], "maquina"],
  ["ex_aductores", "peso_reps", "aductores", [], "maquina"],
  ["ex_gemelos_pie", "peso_reps", "gemelos", [], "maquina"],
  ["ex_gemelos_sentado", "peso_reps", "gemelos", [], "maquina"],
  // Cardio
  ["ex_cinta", "distancia_duracion", "cardio", [], "maquina"],
  ["ex_bicicleta", "distancia_duracion", "cardio", [], "maquina"],
  ["ex_eliptica", "distancia_duracion", "cardio", [], "maquina"],
  ["ex_remo_ergometro", "distancia_duracion", "cardio", [], "maquina"],
  ["ex_escaladora", "duracion", "cardio", [], "maquina"],
  ["ex_comba", "duracion", "cardio", [], "otro"],
  ["ex_caminar", "distancia_duracion", "cardio", [], "peso_corporal"],
];

// Con dos mancuernas a la vez (27-oct-2026): se escribe el peso de una y los cálculos lo cuentan doble (ver
// «Mancuernas a pares» en entreno-calculo.js). Son todos los de mancuernas salvo el remo a una mano, que es de
// una sola. La búlgara se hace con una en cada mano, así que lleva pareja Y es unilateral.
const CON_PAREJA = new Set([
  "ex_press_banca_mancuernas", "ex_press_inclinado_mancuernas", "ex_aperturas_mancuernas", "ex_encogimientos",
  "ex_press_hombro_mancuernas", "ex_laterales_mancuernas", "ex_frontales", "ex_pajaros_mancuernas",
  "ex_curl_mancuernas", "ex_curl_martillo", "ex_curl_inclinado", "ex_curl_muneca", "ex_zancadas", "ex_bulgara",
]);
// Unilaterales por naturaleza: sus series salen ya divididas en izquierda y derecha (se puede deshacer en
// cada serie, y cualquier otro ejercicio se puede hacer unilateral desde el tipo de serie). Solo los que se
// hacen un lado y luego el otro contando repeticiones: las zancadas alternas se cuentan juntas, y la plancha
// lateral es de tiempo.
const UNILATERALES = new Set(["ex_remo_mancuerna", "ex_laterales_polea", "ex_bulgara", "ex_patada_gluteo"]);

export const EJERCICIOS_SEMILLA = FILAS_SEMILLA.map(([id, tipo, musculo, secundarios, equipo]) => ({
  id, tipo, musculo, secundarios, equipo,
  ...(CON_PAREJA.has(id) ? { pareja: true } : {}),
  ...(UNILATERALES.has(id) ? { unilateral: true } : {}),
}));

const SEMILLA_POR_ID = Object.fromEntries(EJERCICIOS_SEMILLA.map((e) => [e.id, e]));

// Lo que el usuario puede personalizar de cualquier ejercicio (de fábrica o propio), guardado aparte en
// `catalogo.personalizados[id]` para que la semilla siga siendo una constante.
const CAMPOS_PERSONALIZABLES = ["favorito", "notaFija", "descansoSeg"];

function aplicarPersonalizacion(ejercicio, personalizados) {
  const p = personalizados && personalizados[ejercicio.id];
  if (!p) return ejercicio;
  const extra = {};
  CAMPOS_PERSONALIZABLES.forEach((c) => { if (p[c] !== undefined) extra[c] = p[c]; });
  return { ...ejercicio, ...extra };
}

// Biblioteca completa de un usuario: la semilla más sus ejercicios propios que no estén archivados (un
// propio no se borra nunca si ya tiene sesiones: se archiva, para que el historial no pierda su nombre),
// con la personalización de cada uno aplicada. `propio` distingue unos de otros.
export function listaEjercicios(catalogo) {
  const personalizados = (catalogo && catalogo.personalizados) || {};
  const propios = ((catalogo && catalogo.propios) || []).filter((e) => !e.archivado);
  return [
    ...EJERCICIOS_SEMILLA.map((e) => aplicarPersonalizacion({ ...e, propio: false }, personalizados)),
    ...propios.map((e) => aplicarPersonalizacion({ secundarios: [], ...e, propio: true }, personalizados)),
  ];
}

// Busca un ejercicio por id entre la semilla y los propios (también los archivados: una sesión antigua
// puede usar uno que ya no está en la lista). null si no existe.
export function ejercicioPorId(catalogo, id) {
  if (SEMILLA_POR_ID[id]) return aplicarPersonalizacion({ ...SEMILLA_POR_ID[id], propio: false }, catalogo && catalogo.personalizados);
  const propio = ((catalogo && catalogo.propios) || []).find((e) => e.id === id);
  return propio ? aplicarPersonalizacion({ secundarios: [], ...propio, propio: true }, catalogo && catalogo.personalizados) : null;
}

// ---------- Búsqueda ----------
// Ignora tildes, mayúsculas y signos, y tolera una errata en palabras largas: una queja repetida en las
// reseñas de las apps de entreno es que no encuentran «jalon» si el nombre lleva tilde, o nada si se
// teclea con prisa en el gimnasio.

export function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñç]+/g, " ")
    .trim();
}

// Distancia de edición (Levenshtein): cuántas letras hay que cambiar, quitar o poner para pasar de una
// palabra a otra. Solo se usa con palabras cortas, así que la versión sencilla basta.
function distancia(a, b) {
  if (a === b) return 0;
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

// ¿Cómo coincide una palabra buscada con las palabras del nombre? 0 = empieza igual, 1 = está dentro,
// 2 = con una errata (solo palabras de 5 letras o más: en las cortas una letra cambia demasiado), null =
// no coincide.
function coincidenciaPalabra(buscada, palabras) {
  if (palabras.some((p) => p.startsWith(buscada))) return 0;
  if (palabras.some((p) => p.includes(buscada))) return 1;
  if (buscada.length >= 5 && palabras.some((p) => distancia(buscada, p) <= 1 || distancia(buscada, p.slice(0, buscada.length)) <= 1)) return 2;
  return null;
}

// `nombreDe(ejercicio)` da el nombre que ve el usuario (en su idioma); se pasa desde fuera para que este
// módulo no dependa del de nombres. Filtros: `musculo` (solo el principal), `equipo`, `soloFavoritos` y
// `soloPropios`. Con texto, los resultados salen ordenados por lo bien que coinciden y, a igualdad, por
// nombre; sin texto, en el orden de la lista.
export function buscarEjercicios(lista, texto, nombreDe, { musculo = null, equipo = null, soloFavoritos = false, soloPropios = false } = {}) {
  const filtrados = lista.filter((e) =>
    (!musculo || e.musculo === musculo) &&
    (!equipo || e.equipo === equipo) &&
    (!soloFavoritos || e.favorito) &&
    (!soloPropios || e.propio));
  const buscadas = normalizarTexto(texto).split(" ").filter(Boolean);
  if (!buscadas.length) return filtrados;
  const puntuados = [];
  filtrados.forEach((e) => {
    const nombre = normalizarTexto(nombreDe(e));
    const palabras = nombre.split(" ");
    let puntos = nombre.startsWith(buscadas.join(" ")) ? -1 : 0;
    for (const b of buscadas) {
      const c = coincidenciaPalabra(b, palabras);
      if (c === null) return;
      puntos += c;
    }
    puntuados.push({ e, puntos, nombre });
  });
  puntuados.sort((a, b) => a.puntos - b.puntos || a.nombre.localeCompare(b.nombre));
  return puntuados.map((p) => p.e);
}

// Palabras que no distinguen un ejercicio de otro («Jalón al pecho» y «Jalón pecho» son el mismo).
const PALABRAS_VACIAS = new Set(["a", "al", "de", "del", "la", "el", "los", "las", "con", "en", "y", "the", "with", "of"]);

function huellaNombre(nombre) {
  return normalizarTexto(nombre).split(" ").filter((p) => p && !PALABRAS_VACIAS.has(p));
}

// Al crear un ejercicio propio: ¿hay ya uno que se llame casi igual? (queja de las reseñas: «la
// biblioteca está llena de duplicados»). Se compara sin tildes ni palabras vacías, con y sin lo que va
// entre paréntesis (el equipo, como en «Jalón al pecho (polea)»), en cualquier orden y admitiendo una
// errata por palabra larga. Devuelve el primer ejercicio que se le parece, o null. Es solo un aviso: el
// usuario puede crear el suyo igualmente.
export function posibleDuplicado(nombre, lista, nombreDe) {
  const buscado = huellaNombre(nombre);
  if (!buscado.length) return null;
  const parecidas = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && distancia(a, b) <= 1);
  const iguales = (x, y) => x.length === y.length && x.every((p) => y.some((q) => parecidas(p, q)));
  for (const e of lista) {
    const completo = nombreDe(e);
    const sinParentesis = String(completo || "").replace(/\([^)]*\)/g, " ");
    if (iguales(buscado, huellaNombre(completo)) || iguales(buscado, huellaNombre(sinParentesis))) return e;
  }
  return null;
}

// ---------- Gimnasios (G2, 25-oct-2026) ----------
// Al terminar un entreno se puede apuntar dónde se hizo (opcional): para poder ver solo los entrenos de un
// sitio si se entrena en varios (filtro del historial) y como dato para posibles estudios. Se sugieren las
// cadenas más habituales en España (por orden alfabético) y se puede escribir cualquier otro; el habitual,
// en los ajustes, sale ya puesto. Es texto libre: no hay ubicación ni ninguna fuente de datos de gimnasios.
export const GIMNASIOS_HABITUALES = [
  "Altafit", "Anytime Fitness", "Basic-Fit", "DiR", "Fitness Park", "Forus", "GO fit", "Holmes Place", "McFIT",
  "Metropolitan", "Sano Center", "Supera", "Synergym", "VivaGym",
];
