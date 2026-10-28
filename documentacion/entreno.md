# Entreno (área FitDraft)

Léelo antes de tocar `logica/entreno-*.js`, `ui/entreno/` o `ui/estado/entreno.js`. El gimnasio dibujado
tiene su propio documento (`fitdraft-gimnasio.md`). Diseño y porqué:
`local/ideas/gimnasio/03-diseno-modulo-entreno.md`; plan de construcción y decisiones cerradas:
`local/ideas/gimnasio/04-plan-de-ejecucion.md` (§3 y §4.3).

## Archivos

- Lógica, en **seis** módulos, con sus casos en `validacion/` (grupos «Entreno: …»): `entreno-ejercicios.js`,
  `entreno-nombres.js`, `entreno-calculo.js`, `entreno-sesion.js`, `entreno-almacen.js`,
  `entreno-importar.js`.
- Estado: `ui/estado/entreno.js` (`useEntreno`).
- Interfaz: `ui/entreno/` (`inicio.jsx`, `sesion.jsx`, `fila-serie.jsx`, `descanso.jsx`, `terminar.jsx`,
  `pastilla.jsx`, `rutinas.jsx`, `editor-rutina.jsx`, `ejercicios.jsx`, `ficha.jsx`, `historial.jsx`,
  `progreso.jsx`, `graficas.jsx`, `importar.jsx`, `ajustes.jsx`, `discos.jsx`, `superserie.jsx`,
  `comun.jsx`...). Los `gimnasio-*`, `hoja-zona.jsx`, `mapa-rutina.jsx` y `mini-mapa.jsx` son del gimnasio
  dibujado.

## Reglas de esta área

- **Que un entreno no se pierda nunca** (reglas de guardado, abajo).
- **Nunca `window.storage.list()`**: los meses se conocen por el índice.
- Siempre se guarda en **kg y km**; libras y millas son solo de pantalla.
- Los ejercicios de la biblioteca tienen **ids fijos** (`ex_…`): no se cambian nunca. Su nombre vive en
  `entreno-nombres.js`; los propios (`exp_…`) llevan su `nombre` y no se traducen.
- **Al añadir un ejercicio a la biblioteca**: sus nombres en los cinco idiomas, sus alias en
  `ALIAS_EJERCICIOS` (los usa importar) y su máquina en el gimnasio (`fitdraft-gimnasio.md`).
- **Cuando cambie cómo se calcula un récord**, sube `CALCULO_INDICE` (`entreno-almacen.js`): los índices
  guardados se reconstruyen una vez.
- A `volumenSerie`, `mejoresDeEjercicioEnSesion`, `recordsEnVivo` y `seriesConRecord` **pásales el
  ejercicio entero** donde lo tengas (no solo el texto del tipo): así saben si es ×2 o unilateral.
- Las claves del entreno tienen su propia versión y migración en `entreno-almacen.js`: **no pasan por
  `migrateData`**.
- Los CSV del usuario nunca se copian al repositorio: los casos de `validacion/` usan filas inventadas con el
  mismo formato.

## Modelo de datos

| Clave | Contenido |
|---|---|
| `rueda-de-platos:entreno-catalogo-v1` | ejercicios propios, personalización de los de fábrica (favorito, nota fija, descanso), rutinas, ajustes, estado de los avisos, importaciones hechas |
| `rueda-de-platos:entreno-AAAA-MM-v1` | las sesiones **terminadas** de ese mes |
| `rueda-de-platos:entreno-indice-v1` | caché reconstruible: sesiones por mes; por ejercicio, la última vez y sus récords; por rutina (`rutinas`), los ejercicios de su última sesión |
| `rueda-de-platos:entreno-borrador-v1` | `{ version, sesion }`: la sesión en curso (o `null`) |
| `localStorage` `fooddraft:entreno-borrador` / `fooddraft:entreno-pendientes` | copia inmediata del borrador y cola de sesiones terminadas sin confirmar en la nube |

Los ajustes del catálogo incluyen `paseoDescanso` (el mini-mapa del descanso; `true` por defecto, lo completa
`migrarCatalogo`) y `gimnasio` (el habitual).

Una sesión es `{ id, nombre, rutinaId, inicio, fin, pausas, esfuerzo, nota, origen, lote, gimnasio,
ejercicios: [{ inst, ejercicioId, sustituyeA, nota, descansoSeg, superserie, series: [{ id, tipo, kg, reps,
seg, km, rir, hecha, lados?, repsIzq?, repsDer? }] }], actualizado }`. El borrador añade `descanso: { inicio,
hasta, inst, avisado }`.

## Reglas de guardado

1. Cada cambio del borrador va al instante a `localStorage` y, con 2,5 s de retraso y al ocultarse la app, a
   la nube. Al cargar, si hay borrador en los dos sitios gana el de `actualizado` mayor.
2. Al terminar, la sesión entra en la cola; se escribe en su mes (leer → fusionar por `id` → escribir) y, si
   va bien, se actualiza el índice, se borra el borrador y sale de la cola. Si falla, se reintenta al cargar
   la app y con el evento `online`.
3. Editar o borrar una sesión pasada reescribe su mes y **reconstruye el índice**; también se reconstruye si
   el nº de sesiones del mes actual no cuadra con `indice.meses`.
4. Si la carga del catálogo falla (sin conexión al abrir), no se escribe encima hasta haberlo leído bien
   (`cargaFiable`).

## Cálculos

- **1RM** de Epley con r = repeticiones + RIR («fiable» hasta 12).
- **Volumen** = kg × reps de las series hechas que no son de calentamiento (peso corporal del perfil en los de
  peso corporal, lastre sumado, ayuda restada; 0 si falta el peso).
- **Series por músculo**: el principal 1 y cada secundario 0,5 (el cardio no cuenta).
- **Récords** por tipo de ejercicio (`RECORDS_POR_TIPO`); solo se «baten» si había uno anterior.
- **`validarSerie`** avisa, sin bloquear, de errores de dedo: más de 2,5 × el máximo histórico, más de 400 kg
  sin histórico, más de 100 repeticiones o 0, más de 4 horas.
- **×2** («Mancuernas a pares», en `entreno-calculo.js`): los ejercicios con dos mancuernas a la vez llevan
  `pareja: true` (`CON_PAREJA` en `entreno-ejercicios.js`, y una casilla en los propios). Se escribe y se
  guarda el peso de **una**; la cabecera dice «kg ×2» y volumen, 1RM y mejor serie lo cuentan doble; el peso
  máximo sigue siendo el de una (lo que compara `validarSerie`).
- **Unilaterales**: una serie con `lados: true`, `repsIzq` y `repsDer` es una sola fila con dos casillas y
  cuenta como una serie; el volumen suma los dos lados y `reps` guarda siempre el lado más débil, que es el
  que usan el 1RM y los récords. Se activa en la hoja del tipo de serie; los unilaterales por naturaleza
  (`UNILATERALES`) tratan como divididas las series sin `lados`.
- Conversiones de libras y millas en `entreno-calculo.js` (con sus pruebas); `ui/entreno/comun.jsx` las
  reexporta.

## Interfaz

- **`useEntreno(data)`** lleva todo: catálogo, índice, borrador, meses (se leen **bajo demanda** con
  `cargarMes`; `sesionesDeMes` junta los del mes con los que esperan en la cola), cola y las acciones, que
  envuelven las operaciones puras de `entreno-sesion.js`. Todo cambio del borrador pasa por `fijarBorrador`
  (sella `actualizado`, guarda en `localStorage` y programa la subida). No crea ningún documento hasta que se
  usa. `nube === "pendiente"` solo si una subida falló.
- **Pantallas** (destinos de FitDraft en `ui/pantallas.jsx`): `entreno` (`inicio.jsx`: vistas Dibujo y
  Lista; la Lista tiene empezar vacío o con una rutina, seguir uno a medias y últimos entrenos),
  `entreno-rutinas` y `entreno-rutina` (`params: { id }`, editor), `entreno-ejercicios` (biblioteca),
  `entreno-ejercicio` (ficha), `entreno-historial` y `entreno-sesion` (`params: { id, inicio }`, detalle
  corregible).
- **Los ajustes del entreno** no son un destino: son la sección «FitDraft» de Ajustes (título
  `fitdraft.area`; el avatar y `SeccionAjustesEntreno`, `ui/entreno/ajustes.jsx`), antes de cerrar sesión y
  eliminar la cuenta: unidades, interruptores (también el paseo del descanso), descansos, exportar CSV/JSON,
  importar y recalcular el índice. El enlace «Ajustes de entreno» de Entrenar abre Ajustes con `params: {
  seccion: "entreno" }`, que la desplaza hasta ella.
- **El entreno en curso no es un destino**: es una capa a pantalla completa (`sesion.jsx`, z-index 45) que
  pinta `app.jsx` cuando `entreno.sesionVisible`; ˅ la minimiza y queda la **pastilla** (`pastilla.jsx`,
  z-index 31, encima de la barra o abajo del todo en la zona común). Mientras se ve: Wake Lock, cronómetro y
  descanso repintados cada segundo en piezas aparte (la tabla no), y la pantalla de debajo inmóvil.
- **La tabla** (`fila-serie.jsx`): columnas según `camposDeTipo`; cada campo guarda su propio texto mientras
  se escribe (coma decimal, unidades de pantalla) y manda el valor convertido en cada cambio. ✓ valida con
  `validarSerie` (aviso con «Corregir» / «Es correcto»), marca y arranca el descanso, **sin enfocar nada**
  (el foco abriría el teclado del móvil). Solo está abierto el ejercicio que toca; si la siguiente serie
  (`siguienteSerie`) es de otro ejercicio, este se pliega y aquel se abre y se trae a la vista (en una
  superserie, ronda a ronda). Tocar la cabecera abre o cierra cualquiera a mano.
- **Descanso** (`descanso.jsx`): se calcula con `descanso.hasta` y avisa una vez con un pitido de Web Audio
  (el contexto se crea con el primer toque) y vibración donde exista.
- **Terminar** (`terminar.jsx`): resumen, esfuerzo 1-5, nota, fecha (solo cambia si se toca), gimnasio,
  récords batidos, «actualizar la rutina» si cambió su estructura (o el descanso de algún ejercicio),
  guardar, compartir (`documentoSesion` con `BotonCompartir`) y descartar con confirmación. Enseña el mapa
  corporal con los músculos trabajados (`MapaSesion`, que sale igual en el detalle del historial).
- **«Anterior» equivalente** (G4): en un entreno que viene de una rutina, la columna «anterior» y la precarga
  usan lo que se hizo en la **última sesión de esa misma rutina** (`anteriorEquivalente`; el mismo ejercicio
  dos veces, cada uno con el suyo por `ocurrencia`). Primera vez de la rutina, ejercicio que aquella vez no
  estaba o entreno sin rutina: la última vez a secas. Un índice guardado sin `rutinas` hace que
  `migrarIndice` pida `reconstruir`, y el hook lo reconstruye una vez al cargar.
- **Descanso de cada ejercicio** (G3): cada ejercicio de una rutina lleva su `descansoSeg` (número; 0 = sin
  descanso). Entra con el de su ficha o el de los ajustes (`descansoInicial`) al añadirlo a una rutina o a un
  entreno empezado de cero, y se cambia con el botón del reloj de su tarjeta (`BotonDescanso` /
  `HojaDescanso`), en el editor y durante el entreno (`descansoEjercicio`, solo para las series siguientes).
  Cambiar el descanso por defecto no mueve las rutinas. Tras una serie de calentamiento se usa el de los
  ajustes.
- **Comodidad y progreso**: en el ⋮ de cada ejercicio de la sesión, sustituir solo hoy (`sustituyeA`, no
  cambia la rutina), subir/bajar, nota de hoy, ver ficha, «Superserie con…» y quitar; ⏸ pausa el cronómetro
  (no el descanso). Al marcar una serie que bate un récord sale una línea discreta (`recordsEnVivo`), y en el
  historial una medalla junto a las series que **tienen hoy** un récord (`seriesConRecord`, a partir del
  índice: se recolocan solas al corregir).
- **Ficha de cada ejercicio** (`ficha.jsx`): Resumen · Historial · Progreso · Récords, con gráficas propias en
  SVG (`graficas.jsx`: `GraficaLineas`, `GraficaBarras`) y rangos 3 meses / 1 año / todo, todo gratis. Lee
  todos los meses al abrirse (`useTodasLasSesiones`). «¿Datos erróneos o que faltan?» navega a `feedback` con
  `params: { categoria: "ejercicio", ejercicioId }`, y `FeedbackView` ofrece el correo ya rellenado (nunca lo
  abre solo).
- **Historial**: calendario con puntos en los días entrenados; si un mes tiene entrenos en más de un gimnasio,
  fichas para ver solo los de un sitio.
- **Progreso** (`progreso.jsx`): series por músculo de esta semana frente a la media de las 4 anteriores (en
  el mapa corporal), y entrenos y volumen por semana, sin «zona recomendada». Sigue el criterio de gráficas
  (`cuerpo.md`): cada tarjeta es una pregunta; un solo selector de rango 1 mes · 3 meses · 1 año · Todo, con
  las piezas de `ui/cuerpo/graficas.jsx`; verde lo tuyo, la media del rango como referencia mostaza, lectura
  al tocar y botón «Gráfica».
- **Importar de otra app** (G10; `importar.jsx`, en Ajustes → FitDraft; la interfaz no nombra Hevy ni Lyfta):
  se elige el CSV exportado, se ve un resumen (entrenos nuevos, los que ya estaban, ejercicios reconocidos y
  los que se crearán como propios, con la opción de elegir uno de la biblioteca) y se importa por el mismo
  camino que un entreno terminado (por meses + `reconstruir`). Las sesiones llevan `origen:
  "importado:hevy|lyfta"` y un `lote`, que guarda `catalogo.importaciones` para **deshacer** la importación
  entera (los propios que creó se archivan). No duplica: mismo nombre y misma hora de inicio (±5 min). El
  emparejamiento usa la biblioteca de cada momento con sus nombres en los cinco idiomas y los alias. RPE de
  Hevy → RIR = 10 − RPE; pesos de Lyfta en kg.
- **Calculadora de discos** (`discos.jsx`, `discosPorLado`, desde el ⋮ de los ejercicios con barra; barra de
  20 kg o 45 lb) y **carpetas de rutinas** (`rutina.carpeta`, texto opcional que solo agrupa la lista; una
  rutina sin carpeta se ve como siempre).
- **Gimnasio** (G2): campo opcional al terminar (`sesion.gimnasio`, texto libre, con las cadenas habituales en
  España de `GIMNASIOS_HABITUALES` como sugerencia) y gimnasio habitual en los ajustes (`ajustes.gimnasio`),
  que sale ya puesto. Sin ubicación (su viabilidad está en `local/ideas/registro-2026-10-25.md`).
- **Superseries** (G11): `superserie: id` en cada ejercicio de la rutina y de la sesión; los **seguidos** con
  el mismo id forman el grupo (2 o más), así que reordenar no deja restos (`gruposSuperserie`, `grupoDe`,
  `unirSuperserie`, `separarSuperserie`, `superserieCon` en `entreno-sesion.js`). Se crean en el editor
  (entre tarjetas, «Superserie con el siguiente») y con «Superserie con…» en el ⋮ de cada ejercicio, de la
  sesión y del editor (`HojaSuperserieCon`, `superserie.jsx`): se elige el otro, esté donde esté, y se coloca
  detrás del grupo; franja mostaza y «Superserie N». Al marcar una serie, el foco va por rondas
  (`ordenDeSeries`/`siguienteSerie`: A1 B1 A2 B2…). Cada ejercicio conserva su descanso. Crear o deshacer una
  durante el entreno cuenta como cambio de la rutina; las importadas llegan con el mismo modelo.
- **Capas a pantalla completa y hojas inferiores**: `CapaCompleta` y `HojaInferior` en `ui/entreno/comun.jsx`
  (que también tiene los formatos: números y fechas con el idioma, con tablas propias de meses y días para
  cuando el navegador no trae gallego o euskera, unidades de pantalla y duraciones).
- **Avisos** de actividad y de grupos sin entrenar: en `cuerpo.md` (su lógica está en `informes.js`; su
  estado, en `catalogo.aviso`).
