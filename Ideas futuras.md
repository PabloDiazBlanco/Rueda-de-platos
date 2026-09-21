# Ideas futuras

Documento de ideas para seguir puliendo y mejorando el funcionamiento de la aplicación. No es una
hoja de ruta cerrada ni tiene prioridad ni fechas asignadas — son apuntes para retomar más adelante,
cada uno con la idea de fondo más o menos desarrollada, pero sin diseño final ni implementación.

## Evitar que se repita demasiado seguido lo mismo en el menú

**El problema**: el motor de generación reparte por probabilidad (sorteo ponderado), pero cada
comida se sortea de forma independiente de las demás. Si arroz y pasta tienen la misma probabilidad,
nada impide que salga pasta varios días seguidos y luego arroz varios días seguidos — el sorteo no
"recuerda" lo que acaba de salir. Afecta sobre todo a lo que se come casi a diario (el carbohidrato
base, la verdura, la proteína tipo pollo), donde hay más ocasiones para que la racha se note. Con
alimentos que se comen pocas veces por semana (por ejemplo el atún) el efecto es más leve porque hay
menos tiradas en juego, pero también convendría suavizarlo.

**La idea**: además de la probabilidad de base, tener en cuenta lo que se ha elegido en las últimas
veces (ya existe algo de esto para otras partes del motor — mirar `lastPicksFromHistory` en
`Logica/menu-generador.js` como referencia del patrón, y ver también la nota ya guardada en memoria
sobre este mismo tema) y penalizar temporalmente repetir lo mismo, para que el resultado se sienta
más variado sin dejar de respetar que unos alimentos son más probables que otros a largo plazo.

**A perfeccionar**: cuánto debe pesar "lo que acabo de comer" frente a la probabilidad de base, y si
el criterio debe ser igual para carbohidrato, verdura y proteína o cada uno necesita su propio ajuste
según cuántas veces por semana se repite ese grupo.

**Nota del usuario (2026-09-21)**: no quiere romper las reglas de afinidad bajo ningún concepto, pero
antes de asumir que hay que elegir entre una cosa u otra, quiere que se analice a futuro hasta qué
punto se puede conseguir variedad real sin tocarlas — puede que haya más margen del que parece sin
llegar a un reparto exacto rígido.

## Fecha de consumo preferente tras abrir un alimento

**La idea**: algunos alimentos, una vez abierto el envase, se estropean en pocos días (por ejemplo,
unos garbanzos cocidos en bote pueden empezar a ponerse malos a los 5 días). Sería útil poder marcar
ese plazo en el alimento y que el motor le diera más probabilidad de aparecer dentro de esa ventana
— no necesariamente para forzar que se termine el bote entero, sino para que sea más probable comerlo
mientras sigue en buen estado, en vez de que el azar lo deje de lado varios días y se desperdicie.

**A perfeccionar**: si el plazo es fijo por alimento o editable por el usuario, y hasta qué punto
subir la probabilidad sin que se note forzado en el menú generado (o si directamente conviene alguna
vez meter varias comidas "forzadas" de ese alimento dentro del plazo en vez de solo subir su
probabilidad).

**Simplificación del usuario (2026-09-21)**: no hace falta un marcado manual de "lo abrí hoy" — es
asumible, al menos a corto plazo, que el alimento se abre el primer día que aparece en el menú
generado (p. ej. si los garbanzos caen el martes como primera aparición, se cuenta el plazo desde
ese martes). No se puede tener en cuenta absolutamente todo con precisión perfecta, y esto quita la
mayor parte de la complejidad de captura de datos sin perder el valor de la idea.

## Desglose visual del multiplicador de ración en comidas cerradas

**El problema**: en una comida cerrada, cuando hace falta comer más que una ración, se aplica un
multiplicador (por ejemplo 1,3) sobre el plato entero. Pero para saber qué supone eso en cada
ingrediente concreto hay que ir al plato cerrado y calcularlo a mano.

**La idea**: mostrar en algún punto de la interfaz (a decidir dónde exactamente — quizá al lado del
propio multiplicador, o en un desplegable) el desglose de cada ingrediente ya multiplicado, para
verlo de un vistazo sin tener que salir de donde se está y hacer la cuenta manualmente.

## Modales de edición demasiado grandes

**El problema**: al pulsar para editar un alimento (u otros botones similares que abren un modal), la
caja que aparece es demasiado grande — a veces tanto que los botones de cerrar o guardar quedan fuera
de la pantalla visible y no se puede pulsar en ellos.

**La idea**: hacer estos modales más compactos, con scroll interno para el contenido que no quepa,
en vez de dejar que crezcan sin límite. Revisar todos los modales de edición de la app con este
criterio, no solo el de alimentos si el mismo problema se repite en otros.

## Vista "modo cocina"

**La idea**: una pantalla simplificada con solo lo que toca comer ese día, texto grande, sin nada
editable — pensada para tenerla abierta en el móvil mientras se cocina, sin tener que navegar por el
resto de la app ni arriesgarse a tocar algo sin querer con las manos ocupadas.

Propuesta originalmente el 28/08/2026 y descartada en bloque sin motivo específico; el usuario la
recuperó el 2026-09-21 — no hay ningún problema de diseño detectado, solo quedó pendiente.

## Agrupar el menú por lo que se cocina en batch

**La idea**: que la vista de Menú avise de qué días comparten la misma proteína u otro componente
para poder cocinar de una vez ("el pollo picado te toca lunes y miércoles, cocínalo junto"). Ahorra
tiempo real en la cocina al usuario que hace batch cooking.

Propuesta originalmente el 28/08/2026 y descartada en bloque sin motivo específico; el usuario la
recuperó el 2026-09-21 — no hay ningún problema de diseño detectado, solo quedó pendiente.

## Aviso de lista de la compra antes de un día "malo" para comprar

**La idea**: surgió al hablar de las notificaciones push — un aviso (reutilizando la infraestructura
ya montada de recordatorios, ver `functions/sendWeighInReminders.js` como referencia del patrón) que
recuerde ir a comprar lo que falte de la lista antes de un día en que el súper vaya a estar cerrado
(el ejemplo que surgió fue sábado por la tarde, pensando en el domingo).

**A perfeccionar**: esto probablemente signifique una función programada nueva (no reutilizar
literalmente `sendWeighInReminders`, que es específica del pesaje), qué día/hora concretos disparan
el aviso, y si el "día malo para comprar" es fijo (domingo) o configurable.

## Lista de la compra agrupada por sección del súper

**La idea**: en vez de una lista plana, agrupar `calcularListaCompra` (`Logica/comida-calculo.js`)
por secciones típicas de un súper (frutería, carnicería/pescadería, congelados, despensa...) para
poder comprar siguiendo el recorrido habitual sin ir saltando de una punta a otra.

**A perfeccionar**: cómo se asigna la sección a cada alimento — ¿un campo más en el catálogo que se
rellena al crear/editar el alimento, o una categorización automática a partir de la `category` que
ya existe (proteína, carbohidrato, verdura...)? Probablemente haga falta lo primero para que sea
fiel a un súper real, ya que la categoría nutricional no coincide siempre con la sección física.

## Exportar el menú de la semana

**La idea**: poder compartir el menú fuera de la app — para quien cocine o compre contigo y no
tenga por qué entrar en FoodDraft. Al pulsar "exportar", elegir entre tres formatos: **PDF**, **foto
(imagen)** o **texto plano** (para pegar en un chat, por ejemplo).

**A perfeccionar**: qué contenido exacto incluye cada formato (¿el menú completo de la semana, o
también las cantidades/ingredientes de cada plato?), y con qué librería generarlo respetando la
regla de "no hay build" del proyecto (algo vía CDN en el `importmap`, no una dependencia npm).

## "Cambiar solo esta comida" desde el menú

**La idea**: un botón en cada comida de la vista de Menú para volver a sortear solo ese plato,
sin regenerar el resto del día ni de la semana — para cuando un resultado concreto no apetece pero
el resto del menú sí sirve.

**A perfeccionar**: confirmar primero si ya existe algo parecido en la app actual (no está claro);
si no existe, cómo debe comportarse respecto a las reglas de afinidad y a los objetivos nutricionales
del día (¿se puede desviar el total del día al cambiar una sola comida, o hay que re-cuadrar algo
más al hacerlo?).

## Motivo y estimación al no completar una comida

**El problema actual**: `comidasCompletadas` (ver `Logica/resumenMensual.js` y
`toggleComidaCompletada` en `app.jsx`) es hoy un simple booleano por comida y por fecha — se marcó
hecha o no se marcó, sin más información. Si un día llegas apurado y te haces algo rápido en vez de
lo que tocaba, hoy no hay forma de dejar constancia de por qué ni de qué comiste en su lugar.

**La idea**: en el modal de detalle de la comida (`MealDetailModal`, el mismo que ya está anotado
más arriba como "demasiado grande" — revisar ambas ideas juntas cuando se toque), mantener el botón
actual "Sí, la hice" tal cual, y añadir un botón "No la hice" que abra un pequeño panel opcional
(no obligatorio, para no frenar a quien tiene prisa) con:

- **Motivo** (chips rápidos, uno o ninguno): no tenía el alimento, no lo descongelé, no me apetecía,
  no tenía tiempo (me hice otra cosa), comí fuera.
- **Qué comiste en su lugar**, de dos formas posibles:
  - Introducir tú mismo una estimación de macros a mano — **gratis para todos**, sin coste de IA.
  - Sacar una foto y que la app estime los macros — **solo premium**, por el coste de la llamada a
    Gemini. Sería un prompt nuevo (distinto del lector de etiquetas que ya existe en
    `window.analyzeFoodPhoto`), pensado explícitamente para devolver un **rango amplio y generoso**,
    no un número falsamente preciso — no es una etiqueta impresa, es una estimación visual de un
    plato real, y pretender precisión ahí sería engañoso.

**Decidido (2026-09-21)**: por ahora esta información es **puramente informativa** — no se suma al
progreso de macros del día ni afecta a ninguna otra comida ni al menú generado. Solo queda guardada
para poder contarlo después (ver el punto siguiente).

**A perfeccionar**: el cambio de forma del dato (`comidasCompletadas` pasaría de `true` a un objeto
con estado/motivo/estimación) necesita su parche correspondiente en `migrateData`, como cualquier
otro cambio de forma de datos guardados — revisar los bloques existentes de `migrateData` como
patrón antes de tocarlo.

## Resumen mensual premium más rico

**La idea**: usar los datos de "motivo y estimación al no completar una comida" (punto anterior)
para enriquecer la parte premium de `ResumenMensualView` (`app.jsx`), que hoy en día ya distingue
plan gratis (solo el % de comidas completadas) de premium (objetivo actual, peso del mes y su
gráfica, frase de cierre) — ver `Logica/resumenMensual.js`. Añadiría, sin nada de gamificación
(insignias, rachas competitivas... explícitamente descartado, ver más abajo por qué):

- Desglose de por qué no se completaron comidas ese mes (% por motivo: sin alimento, sin tiempo,
  comí fuera...) — literalmente lo que pedía el usuario al proponer la idea.
- Cuántas veces comiste fuera ese mes.
- Comparativa con el mes anterior (¿mejor o peor % que el mes pasado?).
- Desglose por tipo de comida (¿cuál se salta más — la cena, por ejemplo?).

**Por qué no gamificación**: se investigó (2026-09-21) qué hacen otras apps de nutrición — rachas,
insignias, competición — y hay evidencia de que ese tipo de mecánicas puede alimentar conductas de
riesgo en usuarios vulnerables en apps de este tipo. No encaja con el tono serio y basado en
evidencia que ya tiene FoodDraft (ver `PDFs explicativos/`), así que se descarta activamente, no por
falta de tiempo.

**Más a futuro, explícitamente no ahora (2026-09-21)**: el usuario quiere en algún momento un
planteamiento para medir **adherencia real a macros/objetivos**, no solo si se marcó la comida como
hecha — por ejemplo, "cumpliste tu objetivo de proteína el 90% de los días". Es calculable en parte
con datos que ya existen (cruzando los días 100% completados contra `dayTotals`/
`objetivosPorComida`), pero se vuelve mucho más preciso en cuanto exista la estimación de "qué
comiste en su lugar" de la idea anterior, para no tener que descartar del cálculo los días con
alguna comida no completada. Sin diseñar en detalle todavía — queda anotado para retomarlo más
adelante, no es prioridad ahora.
