// ---------- Entreno: nombres de los ejercicios en los cinco idiomas ----------
// Módulo de lógica pura (sin JSX, sin React). Los ejercicios de la biblioteca semilla
// (logica/entreno-ejercicios.js) los nombra la propia app, así que se traducen como cualquier texto de
// interfaz; pero no van en logica/i18n.js porque son datos de catálogo (80 entradas por idioma) y no
// frases de pantallas, y así i18n.js no crece con ellos. Los ejercicios propios del usuario llevan su
// `nombre` tal cual lo escribió y no se traducen nunca (como sus platos).
//
// Cada fila: [español, inglés, catalán, gallego, euskera]. El español y el inglés salen del anexo A del
// plan (local/ideas/gimnasio/04-plan-de-ejecucion.md); el inglés sigue el estilo «Ejercicio (Equipo)» de
// Hevy, que además sirve de pista al importar desde esa app. Catalán, gallego y euskera están pendientes
// de revisión del usuario (octubre de 2026).

const FILAS = {
  ex_press_banca_barra: ["Press de banca con barra", "Bench Press (Barbell)", "Press de banca amb barra", "Press de banca con barra", "Bankako press-a barrarekin"],
  ex_press_inclinado_barra: ["Press inclinado con barra", "Incline Bench Press (Barbell)", "Press inclinat amb barra", "Press inclinado con barra", "Press inklinatua barrarekin"],
  ex_press_declinado_barra: ["Press declinado con barra", "Decline Bench Press (Barbell)", "Press declinat amb barra", "Press declinado con barra", "Press deklinatua barrarekin"],
  ex_press_banca_mancuernas: ["Press de banca con mancuernas", "Bench Press (Dumbbell)", "Press de banca amb manuelles", "Press de banca con mancuernas", "Bankako press-a mankuernekin"],
  ex_press_inclinado_mancuernas: ["Press inclinado con mancuernas", "Incline Bench Press (Dumbbell)", "Press inclinat amb manuelles", "Press inclinado con mancuernas", "Press inklinatua mankuernekin"],
  ex_press_pecho_maquina: ["Press de pecho en máquina", "Chest Press (Machine)", "Press de pit a màquina", "Press de peito en máquina", "Bularreko press-a makinan"],
  ex_aperturas_maquina: ["Aperturas en máquina (contractor)", "Butterfly (Pec Deck)", "Obertures a màquina (contractor)", "Aberturas en máquina (contractor)", "Irekierak makinan (kontraktorea)"],
  ex_aperturas_mancuernas: ["Aperturas con mancuernas", "Chest Fly (Dumbbell)", "Obertures amb manuelles", "Aberturas con mancuernas", "Irekierak mankuernekin"],
  ex_cruce_poleas: ["Cruce de poleas", "Cable Fly Crossovers", "Creuament de politges", "Cruce de poleas", "Polea-gurutzaketa"],
  ex_fondos_paralelas: ["Fondos en paralelas", "Chest Dip", "Fons en paral·leles", "Fondos en paralelas", "Fondoak paraleloetan"],
  ex_flexiones: ["Flexiones", "Push Up", "Flexions", "Flexións", "Flexioak"],
  ex_dominadas: ["Dominadas", "Pull Up", "Dominades", "Dominadas", "Dominatuak"],
  ex_dominadas_lastradas: ["Dominadas lastradas", "Pull Up (Weighted)", "Dominades llastrades", "Dominadas lastradas", "Dominatuak lastrearekin"],
  ex_dominadas_asistidas: ["Dominadas asistidas", "Pull Up (Assisted)", "Dominades assistides", "Dominadas asistidas", "Dominatu lagunduak"],
  ex_jalon_pecho: ["Jalón al pecho (polea)", "Lat Pulldown (Cable)", "Jaló al pit (politja)", "Tirón ao peito (polea)", "Bularrerako tiraldia (polea)"],
  ex_jalon_estrecho: ["Jalón con agarre estrecho", "Lat Pulldown - Close Grip (Cable)", "Jaló amb agafada estreta", "Tirón con agarre estreito", "Tiraldia heldutze estuarekin"],
  ex_remo_barra: ["Remo con barra", "Bent Over Row (Barbell)", "Rem amb barra", "Remo con barra", "Arraunketa barrarekin"],
  ex_remo_mancuerna: ["Remo con mancuerna", "Dumbbell Row", "Rem amb manuella", "Remo con mancuerna", "Arraunketa mankuernarekin"],
  ex_remo_sentado_polea: ["Remo sentado en polea", "Seated Cable Row - V Grip (Cable)", "Rem assegut a la politja", "Remo sentado en polea", "Eserita arraunketa polean"],
  ex_remo_maquina: ["Remo en máquina", "Seated Row (Machine)", "Rem a màquina", "Remo en máquina", "Arraunketa makinan"],
  ex_remo_landmine: ["Remo landmine", "Landmine Row", "Rem landmine", "Remo landmine", "Landmine arraunketa"],
  ex_pullover_polea: ["Pullover en polea (brazos rectos)", "Straight Arm Lat Pulldown (Cable)", "Pullover a la politja (braços rectes)", "Pullover en polea (brazos rectos)", "Pullover polean (beso zuzenak)"],
  ex_peso_muerto: ["Peso muerto", "Deadlift (Barbell)", "Pes mort", "Peso morto", "Pisu hila"],
  ex_hiperextensiones: ["Hiperextensiones", "Back Extension (Hyperextension)", "Hiperextensions", "Hiperextensións", "Hiperextentsioak"],
  ex_encogimientos: ["Encogimientos de trapecio", "Shrug (Dumbbell)", "Encongiments de trapezi", "Encollementos de trapecio", "Trapezio-uzkurketak"],
  ex_press_militar: ["Press militar con barra", "Overhead Press (Barbell)", "Press militar amb barra", "Press militar con barra", "Press militarra barrarekin"],
  ex_press_hombro_mancuernas: ["Press de hombro con mancuernas", "Shoulder Press (Dumbbell)", "Press d'espatlla amb manuelles", "Press de ombro con mancuernas", "Sorbaldako press-a mankuernekin"],
  ex_press_hombro_maquina: ["Press de hombro en máquina", "Shoulder Press (Machine)", "Press d'espatlla a màquina", "Press de ombro en máquina", "Sorbaldako press-a makinan"],
  ex_laterales_mancuernas: ["Elevaciones laterales con mancuernas", "Lateral Raise (Dumbbell)", "Elevacions laterals amb manuelles", "Elevacións laterais con mancuernas", "Alboko altxaldiak mankuernekin"],
  ex_laterales_polea: ["Elevaciones laterales en polea", "Lateral Raise (Cable)", "Elevacions laterals a la politja", "Elevacións laterais en polea", "Alboko altxaldiak polean"],
  ex_laterales_maquina: ["Elevaciones laterales en máquina", "Lateral Raise (Machine)", "Elevacions laterals a màquina", "Elevacións laterais en máquina", "Alboko altxaldiak makinan"],
  ex_frontales: ["Elevaciones frontales", "Front Raise (Dumbbell)", "Elevacions frontals", "Elevacións frontais", "Aurreko altxaldiak"],
  ex_pajaros_mancuernas: ["Pájaros con mancuernas", "Rear Delt Reverse Fly (Dumbbell)", "Ocells amb manuelles", "Paxaros con mancuernas", "Txoriak mankuernekin"],
  ex_contractor_inverso: ["Contractor inverso", "Rear Delt Reverse Fly (Machine)", "Contractor invers", "Contractor inverso", "Alderantzizko kontraktorea"],
  ex_face_pull: ["Face pull", "Face Pull", "Face pull", "Face pull", "Face pull"],
  ex_curl_barra: ["Curl con barra", "Bicep Curl (Barbell)", "Curl amb barra", "Curl con barra", "Curl-a barrarekin"],
  ex_curl_mancuernas: ["Curl con mancuernas", "Bicep Curl (Dumbbell)", "Curl amb manuelles", "Curl con mancuernas", "Curl-a mankuernekin"],
  ex_curl_martillo: ["Curl martillo", "Hammer Curl (Dumbbell)", "Curl martell", "Curl martelo", "Mailu-curla"],
  ex_curl_polea: ["Curl en polea", "Bicep Curl (Cable)", "Curl a la politja", "Curl en polea", "Curl-a polean"],
  ex_curl_predicador: ["Curl predicador", "Preacher Curl (Machine)", "Curl predicador", "Curl predicador", "Curl predikadorea"],
  ex_curl_inclinado: ["Curl inclinado con mancuernas", "Seated Incline Curl (Dumbbell)", "Curl inclinat amb manuelles", "Curl inclinado con mancuernas", "Curl inklinatua mankuernekin"],
  ex_triceps_cuerda: ["Extensión de tríceps en polea con cuerda", "Triceps Rope Pushdown", "Extensió de tríceps a la politja amb corda", "Extensión de tríceps en polea con corda", "Trizeps-luzapena polean sokarekin"],
  ex_triceps_barra_polea: ["Extensión de tríceps en polea con barra", "Triceps Pushdown", "Extensió de tríceps a la politja amb barra", "Extensión de tríceps en polea con barra", "Trizeps-luzapena polean barrarekin"],
  ex_press_frances: ["Press francés", "Skullcrusher (Barbell)", "Press francès", "Press francés", "Press frantsesa"],
  ex_triceps_sobre_cabeza: ["Extensión de tríceps sobre la cabeza", "Overhead Triceps Extension (Cable)", "Extensió de tríceps per sobre del cap", "Extensión de tríceps sobre a cabeza", "Trizeps-luzapena buru gainetik"],
  ex_fondos_maquina: ["Fondos en máquina", "Seated Dip Machine", "Fons a màquina", "Fondos en máquina", "Fondoak makinan"],
  ex_press_cerrado: ["Press de banca con agarre cerrado", "Bench Press - Close Grip (Barbell)", "Press de banca amb agafada tancada", "Press de banca con agarre pechado", "Bankako press-a heldutze itxiarekin"],
  ex_curl_muneca: ["Curl de muñeca", "Wrist Curl (Dumbbell)", "Curl de canell", "Curl de boneca", "Eskumuturreko curla"],
  ex_plancha: ["Plancha", "Plank", "Planxa", "Prancha", "Plantxa"],
  ex_plancha_lateral: ["Plancha lateral", "Side Plank", "Planxa lateral", "Prancha lateral", "Alboko plantxa"],
  ex_crunch: ["Crunch abdominal", "Crunch", "Crunch abdominal", "Crunch abdominal", "Crunch abdominala"],
  ex_crunch_polea: ["Crunch en polea", "Cable Crunch", "Crunch a la politja", "Crunch en polea", "Crunch-a polean"],
  ex_crunch_maquina: ["Crunch en máquina", "Crunch (Machine)", "Crunch a màquina", "Crunch en máquina", "Crunch-a makinan"],
  ex_elevacion_piernas: ["Elevación de piernas colgado", "Hanging Leg Raise", "Elevació de cames penjat", "Elevación de pernas colgado", "Hanka-altxaldia zintzilik"],
  ex_rueda_abdominal: ["Rueda abdominal", "Ab Wheel", "Roda abdominal", "Roda abdominal", "Gurpil abdominala"],
  ex_sentadilla: ["Sentadilla con barra", "Squat (Barbell)", "Esquat amb barra", "Agachamento con barra", "Squat-a barrarekin"],
  ex_sentadilla_frontal: ["Sentadilla frontal", "Front Squat", "Esquat frontal", "Agachamento frontal", "Aurreko squat-a"],
  ex_sentadilla_goblet: ["Sentadilla goblet", "Goblet Squat", "Esquat goblet", "Agachamento goblet", "Goblet squat-a"],
  ex_prensa: ["Prensa de piernas", "Leg Press (Machine)", "Premsa de cames", "Prensa de pernas", "Hanka-prentsa"],
  ex_hack: ["Sentadilla hack", "Hack Squat (Machine)", "Esquat hack", "Agachamento hack", "Hack squat-a"],
  ex_extension_cuadriceps: ["Extensión de cuádriceps", "Leg Extension (Machine)", "Extensió de quàdriceps", "Extensión de cuádriceps", "Koadrizeps-luzapena"],
  ex_zancadas: ["Zancadas con mancuernas", "Lunge (Dumbbell)", "Gambades amb manuelles", "Zancadas con mancuernas", "Aurrerako pausoak mankuernekin"],
  ex_bulgara: ["Sentadilla búlgara", "Bulgarian Split Squat", "Esquat búlgar", "Agachamento búlgaro", "Squat bulgariarra"],
  ex_peso_muerto_rumano: ["Peso muerto rumano", "Romanian Deadlift (Barbell)", "Pes mort romanès", "Peso morto romanés", "Pisu hil errumaniarra"],
  ex_femoral_tumbado: ["Curl femoral tumbado", "Lying Leg Curl (Machine)", "Curl femoral estirat", "Curl femoral deitado", "Femoral curla etzanda"],
  ex_femoral_sentado: ["Curl femoral sentado", "Seated Leg Curl (Machine)", "Curl femoral assegut", "Curl femoral sentado", "Femoral curla eserita"],
  ex_hip_thrust: ["Hip thrust con barra", "Hip Thrust (Barbell)", "Hip thrust amb barra", "Hip thrust con barra", "Hip thrust-a barrarekin"],
  ex_hip_thrust_maquina: ["Hip thrust en máquina", "Hip Thrust (Machine)", "Hip thrust a màquina", "Hip thrust en máquina", "Hip thrust-a makinan"],
  ex_patada_gluteo: ["Patada de glúteo en polea", "Glute Kickback (Cable)", "Puntada de gluti a la politja", "Patada de glúteo en polea", "Gluteo-ostikoa polean"],
  ex_abductores: ["Abductores en máquina", "Hip Abduction (Machine)", "Abductors a màquina", "Abdutores en máquina", "Abduktoreak makinan"],
  ex_aductores: ["Aductores en máquina", "Hip Adduction (Machine)", "Adductors a màquina", "Adutores en máquina", "Aduktoreak makinan"],
  ex_gemelos_pie: ["Elevación de gemelos de pie", "Standing Calf Raise (Machine)", "Elevació de bessons dret", "Elevación de xemelgos de pé", "Bikien altxaldia zutik"],
  ex_gemelos_sentado: ["Elevación de gemelos sentado", "Seated Calf Raise", "Elevació de bessons assegut", "Elevación de xemelgos sentado", "Bikien altxaldia eserita"],
  ex_cinta: ["Cinta de correr", "Treadmill", "Cinta de córrer", "Cinta de correr", "Korrika egiteko zinta"],
  ex_bicicleta: ["Bicicleta estática", "Stationary Bike", "Bicicleta estàtica", "Bicicleta estática", "Bizikleta estatikoa"],
  ex_eliptica: ["Elíptica", "Elliptical Trainer", "El·líptica", "Elíptica", "Eliptikoa"],
  ex_remo_ergometro: ["Remo (máquina de remo)", "Rowing Machine", "Rem (màquina de rem)", "Remo (máquina de remo)", "Arraun-makina"],
  ex_escaladora: ["Escaladora", "Stair Machine", "Escaladora", "Escaladora", "Eskailera-makina"],
  ex_comba: ["Comba", "Jump Rope", "Corda de saltar", "Corda", "Soka-saltoa"],
  ex_caminar: ["Caminar", "Walking", "Caminar", "Camiñar", "Oinez ibiltzea"],
};

const ORDEN_IDIOMAS = ["es", "en", "ca", "gl", "eu"];

export const NOMBRES_EJERCICIOS = Object.fromEntries(
  ORDEN_IDIOMAS.map((idioma, i) => [idioma, Object.fromEntries(Object.entries(FILAS).map(([id, nombres]) => [id, nombres[i]]))])
);

// Nombre que ve el usuario. Acepta el ejercicio (con su `nombre` si es propio) o solo su id. Si es de la
// semilla: el del idioma pedido, si no el español y, en último caso, el propio id (para notar enseguida
// un ejercicio sin nombre registrado, igual que `t` devuelve la clave).
export function nombreEjercicio(ejercicio, idioma) {
  if (!ejercicio) return "";
  if (typeof ejercicio === "object" && ejercicio.nombre) return ejercicio.nombre;
  const id = typeof ejercicio === "string" ? ejercicio : ejercicio.id;
  const dict = NOMBRES_EJERCICIOS[idioma] || NOMBRES_EJERCICIOS.es;
  return dict[id] || NOMBRES_EJERCICIOS.es[id] || id;
}

// ---------- Alias para importar (G10, 25-oct-2026) ----------
// Otros nombres con que otras apps llaman a los ejercicios de la biblioteca, para emparejarlos al importar
// (logica/entreno-importar.js). Los nombres en inglés de arriba ya siguen el estilo de Hevy («Bench Press
// (Barbell)»), así que aquí van sobre todo los de Lyfta, que usa los de ExerciseDB («Lever Chest Press»,
// «Barbell Bench Press»), y variantes de Hevy que no coinciden con el nuestro. Se comparan sin tildes ni
// mayúsculas y, si no hay coincidencia exacta, sin lo que va entre paréntesis y en cualquier orden.
// **Al añadir un ejercicio a la biblioteca, añade aquí sus alias**: el importador usa siempre la biblioteca
// entera que haya, sin tocarlo. Los que salen en las exportaciones reales del usuario están todos.
export const ALIAS_EJERCICIOS = {
  ex_press_banca_barra: ["Barbell Bench Press", "Bench Press"],
  ex_press_inclinado_barra: ["Barbell Incline Bench Press", "Incline Bench Press"],
  ex_press_declinado_barra: ["Barbell Decline Bench Press"],
  ex_press_banca_mancuernas: ["Dumbbell Bench Press", "Dumbbell Press"],
  ex_press_inclinado_mancuernas: ["Dumbbell Incline Bench Press", "Incline Dumbbell Press"],
  ex_press_pecho_maquina: ["Lever Chest Press", "Machine Chest Press", "Chest Press", "Lever Seated Chest Press"],
  ex_aperturas_maquina: ["Lever Seated Fly", "Pec Deck", "Chest Fly (Machine)", "Machine Fly", "Lever Pec Deck Fly"],
  ex_aperturas_mancuernas: ["Dumbbell Fly", "Dumbbell Chest Fly"],
  ex_cruce_poleas: ["Cable Crossover", "Cable Fly", "Cable Standing Fly"],
  ex_fondos_paralelas: ["Chest Dip", "Dips", "Triceps Dip"],
  ex_flexiones: ["Push-up", "Push Ups", "Pushup"],
  ex_dominadas: ["Pull-up", "Pull Ups", "Pullup", "Chin Up"],
  ex_dominadas_lastradas: ["Weighted Pull-up", "Weighted Pull Up"],
  ex_dominadas_asistidas: ["Assisted Pull-up", "Assisted Pull Up", "Lever Assisted Pull-up"],
  ex_jalon_pecho: ["Pulldown", "Lat Pulldown", "Cable Pulldown", "Cable Lat Pulldown", "Lat Pulldown (Machine)", "Lever Front Pulldown"],
  ex_jalon_estrecho: ["Close Grip Lat Pulldown", "Cable Close Grip Pulldown", "Narrow Grip Lat Pulldown"],
  ex_remo_barra: ["Barbell Bent Over Row", "Bent Over Row", "Barbell Row"],
  ex_remo_mancuerna: ["Dumbbell Bent Over Row", "One Arm Dumbbell Row", "Dumbbell One Arm Row"],
  ex_remo_sentado_polea: ["Cable Seated Row", "Seated Cable Row", "Seated Row (Cable)", "Cable Low Seated Row"],
  ex_remo_maquina: ["Lever Seated Row", "Lever Alternating Narrow Grip Seated Row", "Machine Row", "Seated Row", "Lever Narrow Grip Seated Row", "Iso-Lateral Row (Machine)"],
  ex_remo_landmine: ["T Bar Row", "Lever T Bar Row", "T-Bar Row"],
  ex_pullover_polea: ["Cable Straight Arm Pulldown", "Straight Arm Pulldown"],
  ex_peso_muerto: ["Barbell Deadlift", "Deadlift"],
  ex_hiperextensiones: ["Hyperextension", "Back Extension", "45 Degree Hyperextension"],
  ex_encogimientos: ["Dumbbell Shrug", "Barbell Shrug", "Shrug"],
  ex_press_militar: ["Barbell Overhead Press", "Barbell Standing Military Press", "Military Press", "Overhead Press"],
  ex_press_hombro_mancuernas: ["Dumbbell Shoulder Press", "Dumbbell Seated Shoulder Press", "Seated Dumbbell Press"],
  ex_press_hombro_maquina: ["Lever Shoulder Press", "Machine Shoulder Press", "Shoulder Press (Machine Plates)", "Seated Shoulder Press (Machine)"],
  ex_laterales_mancuernas: ["Dumbbell Lateral Raise", "Lateral Raise", "Side Lateral Raise", "Seated Lateral Raise (Dumbbell)"],
  ex_laterales_polea: ["Cable Lateral Raise", "Cable One Arm Lateral Raise"],
  ex_laterales_maquina: ["Lever Lateral Raise", "Machine Lateral Raise"],
  ex_frontales: ["Dumbbell Front Raise", "Front Raise"],
  ex_pajaros_mancuernas: ["Dumbbell Rear Fly", "Rear Delt Fly", "Dumbbell Rear Delt Raise"],
  ex_contractor_inverso: ["Lever Seated Reverse Fly", "Reverse Pec Deck", "Rear Delt Machine"],
  ex_face_pull: ["Cable Face Pull", "Face Pull (Cable)"],
  ex_curl_barra: ["Barbell Curl", "Barbell Biceps Curl", "EZ Bar Curl", "EZ Barbell Curl", "EZ Bar Biceps Curl"],
  ex_curl_mancuernas: ["Dumbbell Curl", "Dumbbell Biceps Curl", "Dumbbell Alternate Biceps Curl"],
  ex_curl_martillo: ["Dumbbell Hammer Curl", "Hammer Curl"],
  ex_curl_polea: ["Cable Curl", "Cable Biceps Curl"],
  ex_curl_predicador: ["Lever Preacher Curl", "Preacher Curl", "EZ Bar Preacher Curl"],
  ex_curl_inclinado: ["Dumbbell Incline Curl", "Incline Dumbbell Curl"],
  ex_triceps_cuerda: ["Cable Pushdown (with rope attachment)", "Rope Pushdown", "Cable Rope Pushdown", "Triceps Pushdown (Rope)"],
  ex_triceps_barra_polea: ["Cable Pushdown", "Cable Triceps Pushdown", "Cable Triceps Pushdown (V-bar)", "Triceps Pushdown (Cable)"],
  ex_press_frances: ["Barbell Lying Triceps Extension", "EZ Barbell Lying Triceps Extension", "Skull Crusher", "Lying Triceps Extension"],
  ex_triceps_sobre_cabeza: ["Cable Overhead Triceps Extension", "Overhead Triceps Extension", "Triceps Extension (Cable)"],
  ex_fondos_maquina: ["Lever Seated Dip", "Seated Dip (Machine)", "Lever Triceps Dip"],
  ex_press_cerrado: ["Barbell Close Grip Bench Press", "Close Grip Bench Press"],
  ex_curl_muneca: ["Dumbbell Wrist Curl", "Barbell Wrist Curl", "Wrist Curl"],
  ex_plancha: ["Front Plank", "Plank Hold", "Weighted Front Plank"],
  ex_plancha_lateral: ["Side Plank Hold", "Side Bridge"],
  ex_crunch: ["Crunch Floor", "Sit-up", "Sit Up", "Abdominal Crunch"],
  ex_crunch_polea: ["Cable Kneeling Crunch", "Kneeling Cable Crunch"],
  ex_crunch_maquina: ["Lever Crunch", "Machine Crunch", "Crunch abdominal en máquina"],
  ex_elevacion_piernas: ["Captains Chair Straight Leg Raise", "Captain's Chair Leg Raise", "Hanging Straight Leg Raise", "Leg Raise", "Knee Raise (Captain's Chair)", "Leg Raise Parallel Bars"],
  ex_rueda_abdominal: ["Wheel Rollout", "Ab Roller", "Ab Wheel Rollout"],
  ex_sentadilla: ["Barbell Full Squat", "Barbell Squat", "Back Squat", "Squat"],
  ex_sentadilla_frontal: ["Barbell Front Squat", "Front Squat (Barbell)"],
  ex_sentadilla_goblet: ["Dumbbell Goblet Squat", "Kettlebell Goblet Squat", "Goblet Squat (Kettlebell)"],
  ex_prensa: ["Sled 45° Leg Press", "Sled 45 Leg Press", "Leg Press", "Lever Leg Press", "Sled Leg Press", "Leg Press Horizontal (Machine)"],
  ex_hack: ["Sled Hack Squat", "Lever Hack Squat", "Hack Squat"],
  ex_extension_cuadriceps: ["Lever Leg Extension", "Leg Extension"],
  ex_zancadas: ["Dumbbell Lunge", "Lunge", "Walking Lunge", "Dumbbell Walking Lunge"],
  ex_bulgara: ["Dumbbell Bulgarian Split Squat", "Bulgarian Split Squat (Dumbbell)", "Split Squat"],
  ex_peso_muerto_rumano: ["Barbell Romanian Deadlift", "Romanian Deadlift", "Romanian Deadlift (Dumbbell)", "Dumbbell Romanian Deadlift", "Stiff Leg Deadlift"],
  ex_femoral_tumbado: ["Lever Lying Leg Curl", "Lying Leg Curl", "Leg Curl"],
  ex_femoral_sentado: ["Lever Seated Leg Curl", "Seated Leg Curl"],
  ex_hip_thrust: ["Barbell Hip Thrust", "Hip Thrust", "Barbell Glute Bridge"],
  ex_hip_thrust_maquina: ["Lever Hip Thrust", "Glute Drive (Machine)"],
  ex_patada_gluteo: ["Cable Kickback", "Cable Glute Kickback", "Cable Hip Extension"],
  ex_abductores: ["Lever Seated Hip Abduction", "Hip Abductor", "Seated Hip Abduction"],
  ex_aductores: ["Lever Seated Hip Adduction", "Hip Adductor", "Seated Hip Adduction"],
  ex_gemelos_pie: ["Lever Standing Calf Raise", "Standing Calf Raise", "Calf Raise", "Calf Press (Machine)", "Calf Press on Leg Press"],
  ex_gemelos_sentado: ["Lever Seated Calf Raise", "Seated Calf Raise (Machine)"],
  ex_cinta: ["Treadmill Running", "Running (Treadmill)", "Run", "Running", "Walking on Treadmill"],
  ex_bicicleta: ["Stationary Bike", "Cycling", "Bike", "Indoor Cycling", "Stationary Bike (Machine)"],
  ex_eliptica: ["Elliptical", "Elliptical Machine", "Cross Trainer"],
  ex_remo_ergometro: ["Rowing", "Rower", "Rowing (Machine)"],
  ex_escaladora: ["Stair Climber", "Stairmaster", "Stair Climber (Machine)"],
  ex_comba: ["Jump Rope", "Skipping Rope"],
  ex_caminar: ["Walk", "Walking (Outdoor)"],
};

// Todos los nombres con que se puede reconocer un ejercicio al importar: los de los cinco idiomas y sus alias
// si es de la biblioteca; su nombre (y sus alias, si algún día los tiene) si es propio.
export function nombresParaEmparejar(ejercicio) {
  if (!ejercicio) return [];
  if (ejercicio.nombre) return [ejercicio.nombre, ...(ejercicio.alias || [])];
  const id = ejercicio.id;
  return [...ORDEN_IDIOMAS.map((i) => NOMBRES_EJERCICIOS[i][id]).filter(Boolean), ...(ALIAS_EJERCICIOS[id] || [])];
}
