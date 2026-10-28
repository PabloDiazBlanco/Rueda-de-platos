# El gimnasio dibujado de FitDraft

Léelo antes de tocar `logica/gimnasio.js`, `ui/entreno/gimnasio-*.jsx`, `hoja-zona.jsx`, `mapa-rutina.jsx`,
`mini-mapa.jsx` o `ui/comun/avatar.jsx`. Decisiones: `local/ideas/esteticas/registro.md` («DECISIONES
FINALES», bloque ENTRENO / FITDRAFT); maquetas `local/ideas/esteticas/v3-01-gimnasio.html` a
`v3-03-gimnasio-piezas.html`.

## Archivos

- `logica/gimnasio.js` (grupo «FitDraft: el gimnasio» de `validacion/`): plano, `ZONAS` (7), `ESTACIONES`
  (25), `ESTACION_POR_MUSCULO`, `ejerciciosDeZona`, A* (`aEstrella`, `puntoDe`), `paradasDeRutina`,
  `pasoEntreEjercicios`, `ultimaVezPorZona`, `estadoZonas`, `fraseMonitor`, `rutinaDeHoy`.
- `ui/entreno/gimnasio-vista.jsx` (la vista Dibujo de Entrenar), `gimnasio.jsx` (`MapaGimnasio`),
  `gimnasio-dibujo.jsx`, `gimnasio-tema.js` (colores), `hoja-zona.jsx`, `mapa-rutina.jsx`, `mini-mapa.jsx`.
- `ui/comun/avatar.jsx`: el avatar chibi y el monitor.

## Reglas de esta área

- **Todo es solo lectura**: no cambia ningún dato de entreno, ni la cola ni el borrador.
- **Al añadir un ejercicio a la biblioteca, ponlo en una máquina**: un caso de `validacion/` cuenta que estén
  los 80. Los ejercicios propios se dibujan en la máquina de su músculo (`ESTACION_POR_MUSCULO`).
- Colores solo desde `gimnasio-tema.js`, nunca a mano.
- **Nunca «ordenar por cercanía»** una rutina: la ruta sigue el orden de la rutina.
- Textos en el bloque `fitdraft.` al final de cada diccionario (zonas, máquinas, sitios, frases...).
- **Reducir movimiento**: sin puerta, la cámara salta, el avatar aparece donde iba (también en el mini-mapa),
  la siguiente parada no palpita y el monitor no levanta el brazo.

## Cómo funciona

- **Vista Dibujo de Entrenar** (`gimnasio-vista.jsx`); la otra es **Lista**. La primera vez sale el dibujo y
  luego se recuerda la última (`localStorage`, `fooddraft:vista-gimnasio`). El plano ocupa la pantalla entre
  la cabecera y abajo (fijo, z-index 5; la barra de cristal flota encima). Es una planta vista desde arriba
  con canto, de 600 × 1010 unidades: arriba siete zonas (las cinco de los avisos de grupos, esterillas y
  cardio) con 25 máquinas para los 80 ejercicios (cada uno en una sola), abajo la oficina y la recepción.
- **Sistema híbrido** (`MapaGimnasio`): mapa con arrastre, pellizco, doble toque, rueda y + / −, donde el zoom
  es la jerarquía (de lejos, los rótulos de zona; de cerca, los nombres de las máquinas, solo de adorno);
  «Pasear» cambia a un joystick flotante (nace donde se pone el pulgar, zona muerta de 10 px, radio de 46 px)
  con «Usar · …» junto a cada máquina o sitio; «Ir a…» siempre (zonas y sitios). La cámara, el avatar y el
  joystick se mueven por refs, sin repintar el plano.
- **Sitios**: en recepción, el torno es «Empezar» (todas las rutinas y el entreno vacío), la pizarra a tiza es
  Progreso y el libro es Historial; en la oficina, la estantería es Rutinas, el corcho es la semana (días con
  entreno y estado de las zonas) y el monitor está siempre sentado.
- **Botón fijo «Empezar · (rutina de hoy)»** encima de la barra, un toque: la rutina que hace más tiempo que
  no se hace según el índice (`rutinaDeHoy`; antes que ninguna, las que no se han hecho nunca); sin rutinas, un
  entreno vacío. No sale mientras hay un entreno a medias (su sitio es de la pastilla).
- **Al tocar una zona o una máquina** (`hoja-zona.jsx`, también al crear rutinas): una sola lista con todos
  los ejercicios de la zona (los de músculo principal en ella), con filtros por músculo; con máquina, primero
  su ejercicio principal y el resto de su músculo de cerca a lejos (`ejerciciosDeZona`). Sin nombres de
  máquina: el título es la zona y bajo cada ejercicio, «equipo · músculo». Sin «Añadir todos».
- **Zonas teñidas** (botón de capas, `localStorage` `fooddraft:capas-gimnasio`): verde con ✓ = entrenada esta
  semana; gris con telarañas = 14 días o más sin entrenar; nunca entrenada, sin tinte. Sale del índice y de
  la cola, sin leer meses (`ultimaVezPorZona`, `estadoZonas`).
- **Monitor**: 15 frases (`fitdraft.monitor.<situacion>.<n>`, cinco por situación: saludo, una zona olvidada
  14 días, mucho tiempo sin venir = 14 días sin ninguna sesión), al azar, **como mucho una al día**
  (`localStorage` `fooddraft:monitor-gym`); tocarlo la repite. El grupo va siempre detrás de «de» o «sin»
  (`fitdraft.grupoFrase.*`) para no concordar nada. En el dibujo, el monitor y las zonas hacen de avisos; los
  de actividad y de grupos sin entrenar siguen en la Lista.
- **Puerta de cristal corredera**: solo la primera vez al día (`localStorage` `fooddraft:puerta-gym`), se
  salta tocando.
- **Crear la rutina** (`mapa-rutina.jsx`): en el editor, «Añadir ejercicio» abre el mapa; la rutina se dibuja
  como ruta con paradas numeradas en su orden (`paradasDeRutina`; dos seguidas en la misma máquina, una
  parada) y la primera iluminada. «Buscar» abre el selector de siempre (buscador y ejercicios propios). En
  mitad de un entreno, «añadir ejercicio» sigue con el selector sencillo.
- **Entre ejercicios** (`mini-mapa.jsx`): al marcar la última serie de un ejercicio, un mini-mapa encima de
  la barra del descanso donde el avatar va a la máquina del siguiente pendiente (`pasoEntreEjercicios`). Un
  toque lo salta; `ajustes.paseoDescanso` (en Ajustes → FitDraft) lo apaga.
- **Avatar chibi**: mujer u hombre (solo cambia el pelo). `perfil.avatar`, elegido en el paso
  «Entrenamiento» del asistente de alta y cambiable en Ajustes → FitDraft; `migrateData` pone el del sexo del
  perfil a los perfiles de antes (sin sexo, el de hombre).
