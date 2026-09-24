# Ideas futuras

Documento de ideas para seguir puliendo y mejorando el funcionamiento de la aplicación. No es una
hoja de ruta cerrada ni tiene prioridad ni fechas asignadas — son apuntes para retomar más adelante,
cada uno con la idea de fondo más o menos desarrollada, pero sin diseño final ni implementación.

**Un hilo común**: varias de las ideas de más abajo — evitar rachas de lo mismo, consumo preferente,
agrupar por batch cooking, "cambiar solo esta comida" y la edición manual del menú — comparten un
mismo planteamiento de fondo: tratar la generación del menú como un problema de búsqueda con
restricciones y costes, en vez de como una cadena de sorteos independientes. Ese planteamiento se
desarrolla con detalle en la sección «El menú como problema de búsqueda» (al final del documento);
cada una de esas ideas lleva una línea que remite a ella.

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

**Enfoque general (2026-09-24)**: esta idea es el primer caso de uso de «El menú como problema de
búsqueda» (al final del documento): las rachas pasan a ser una penalización más dentro de una función
de daño, y un intercambio de huecos posterior al sorteo las corrige sin alterar cuántas veces sale
cada alimento.

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

**Enfoque general (2026-09-24)**: pensado como un problema de plazos dentro de «El menú como problema
de búsqueda» (al final del documento) — qué pasa cuando dos alimentos abiertos compiten por los mismos
huecos (uno con 3 días y otro con 5), cómo cruzar la frontera entre ciclos, y el caso de los envases
con cantidad fija, todo desarrollado allí.

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

**Enfoque general (2026-09-24)**: agrupar proteínas en días cercanos tira en dirección contraria a
evitar rachas. En «El menú como problema de búsqueda» (al final del documento) esa tensión deja de ser
un conflicto de código y pasa a ser un equilibrio explícito entre dos preferencias con peso.

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

**Extensión (del usuario)**: incluso se podría plantear la posibilidad de modificar solo un elemento
de una comida puntual — por ejemplo, comes el arroz con pollo pero poder marcar que no comiste la
verdura, o que comiste otra opción, o algo por el estilo.

**A perfeccionar**: confirmar primero si ya existe algo parecido en la app actual (no está claro);
si no existe, cómo debe comportarse respecto a las reglas de afinidad y a los objetivos nutricionales
del día (¿se puede desviar el total del día al cambiar una sola comida, o hay que re-cuadrar algo
más al hacerlo?).

**Enfoque general (2026-09-24)**: es el caso más pequeño de la reparación mínima descrita en «El menú
como problema de búsqueda» (al final del documento): fijar todo lo que ya sirve y volver a resolver
solo el hueco elegido, con el menor daño posible alrededor. Y está muy ligada a la idea de modificar
el menú a mano, más abajo.

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

## Chatbot de nutrición con Gemini, limitado por prompt

**La idea**: un chatbot dentro de la app para preguntar sobre nutrición, sobre los propios cálculos y
sobre el uso de FoodDraft. Aceptada el 2026-09-20; sin diseñar ni priorizar.

**Cómo encajaría**: con el mismo patrón que ya existe para el lector de etiquetas por foto
(`functions/analyzeFoodPhoto.js`): una Cloud Function "callable" que comprueba premium, reserva la
cuota mensual en una transacción de Firestore *antes* de llamar a Gemini y devuelve el hueco si la
llamada falla. No saldría directo del navegador — un límite comprobado solo en el cliente no protege
nada cuando la IA cuesta dinero.

**Alcance limitado por prompt, no por restricción técnica dura**: se le daría una instrucción de
sistema para que solo responda sobre nutrición y sobre la app y rechace el resto. El modelo lo
respeta en la práctica, pero no es infranqueable ante quien insista con trucos. Se prefiere así (frente
a un chat abierto) para no asumir responsabilidad en temas médicos que la app no calcula, y para que
nadie lo use gratis como chatbot genérico y dispare el coste.

**A perfeccionar** (el propio usuario indicó que las preguntas se afinarán más adelante):

- Qué preguntas concretas debe saber contestar y cuáles debe rechazar, y con qué mensaje.
- Si debe conocer los datos del usuario (objetivos, menú de la semana) o solo responder en general —
  lo primero lo haría mucho más útil, pero obliga a mandar datos personales a Gemini y a cuidarlo en
  la política de privacidad.
- Si es una función premium (con su cuota mensual, como las otras dos) o está abierta a todos.
- El mismo aviso que ya lleva el resto de la app: no sustituye la valoración de un profesional, y los
  casos con patologías o trastornos de la conducta alimentaria van a un profesional.
- Coste: bajo con el uso actual, pero crecería con más usuarios; relevante de cara a la publicación.

## Frutas y verduras: contar macros y micros, pero no las calorías

**La idea**: que las verduras y las frutas cuenten para los macros y los micronutrientes, pero **no
para el conteo de calorías** — con el objetivo de no obsesionarse con lo que apenas pesa en la energía
del día, sin renunciar a tener un cálculo completo de los valores que sí importan (fibra, vitaminas...).

**Cómo está hoy**: la verdura de cada comida se muestra pero queda deliberadamente **fuera de todo
cálculo** (en `mealComponents`, `Logica/comida-calculo.js`, va con `sinCalculo: true` y sin
ingrediente vinculado): ni kcal, ni macros, ni nada. Una consecuencia que hoy no se ve: los totales
que alimentan el resumen de sal, azúcares y fibra (`Logica/salud-publica.js`) tampoco incluyen la
verdura, así que la **fibra semanal está infravalorada**. Las frutas existen en el catálogo de
alimentos, pero el motor no tiene una categoría propia para ellas — solo entran como parte de un
desayuno o una merienda compuestos.

**A perfeccionar**:

- Cómo mostrarlo sin que parezca que se cuentan calorías: por ejemplo, una línea aparte ("aportan
  además: X g de fibra…") que no suma al total de kcal de la comida ni al progreso del día.
- Qué son exactamente los "micros": el catálogo solo guarda kcal, proteína, grasa, carbohidratos,
  sal, azúcares, fibra y grasa saturada. Vitaminas y minerales exigirían campos nuevos (con el parche
  correspondiente en `migrateData`) y una fuente fiable de datos. Un primer paso realista sería
  empezar solo por la fibra y los azúcares, que ya existen.
- Cómo entran las frutas al menú (¿categoría propia, como pieza de desayuno/merienda, como extra
  opcional?).
- Que el objetivo de kcal siga siendo coherente: si lo que no se cuenta apenas pesa, el desvío es
  pequeño, pero conviene decirlo con honestidad en la interfaz.

## Modificar el menú a mano: previsualizar, mover y fijar

**La idea**: poder ajustar a mano un menú ya generado. Que la app dé una previsualización y que tú
puedas cambiar cosas. El ejemplo del propio usuario: te sale pescado el jueves y lo quieres comer sí o
sí, pero ese día no comes en casa — poder moverlo a otro día, ponerlo tú directamente en un sitio, o
modificarlo y pedir un draft nuevo a partir de lo que has dejado fijado. En general los menús se
pueden respetar, pero mover cosas entre días según convenga (incluso cualquier día) no parece mala
idea: la app propone y tú decides. Sigue la lógica de todo el proyecto — **es una herramienta, no una
regla estricta: si quieres comer mal, puedes hacerlo**.

**A perfeccionar**:

- Cómo se mueve: arrastrar, o tocar un plato y elegir a dónde va (más fiable en móvil).
- Qué pasa con las reglas de afinidad al mover algo: lo que fija el usuario debe **mandar** sobre las
  reglas, avisando de forma discreta de que ha quedado una combinación que pediste evitar.
- Las raciones se calcularon para el hueco original (Comida pesa un 35% del día y Cena un 30%, por
  ejemplo), así que al mover un plato hay que volver a ajustarlas al objetivo del hueco nuevo.
- Cómo interactúa con el historial de "deshacer" ya existente, y con las dos pantallas de menú (la
  completa y la simple).
- La versión más potente — mover una cosa y que el resto se recoloque solo con el menor daño — es la
  «reparación mínima» de la sección siguiente, y comparte pieza con «Cambiar solo esta comida».

## El menú como problema de búsqueda (motor con restricciones y costes)

Propuesta del usuario (2026-09-24), pensada con calma en varias conversaciones. **Sin diseñar en
detalle a propósito**: este apartado recoge todo lo que se ha hablado y se ha ocurrido para que no se
pierda nada; los pesos, las funciones concretas y el orden de trabajo se calibrarán después, cuando se
vaya avanzando.

**La idea**: generar un menú se parece a los juegos con los que se enseña a programar búsqueda (el
mundo de bloques, el 8-puzzle): hay un tablero y hay que llegar a la mejor solución con el menor daño
posible. Aplicado aquí, la mejor solución es la que **respeta todo lo mejor posible reduciendo los
daños** cuando no se puede respetar todo.

### Decisiones ya tomadas (2026-09-24)

- **Las reglas de afinidad "nula" son restricciones duras**, no preferencias. Hoy, si no queda
  ninguna opción válida, el motor las ignora en silencio como "último recurso"; con este enfoque nunca
  se rompen por comodidad. (Pendiente de confirmar: la regla "máxima" — forzada — parece coherente
  tratarla igual, como dura, pero no se ha hablado explícitamente.)
- **Si es imposible cumplir todo, se rompe lo mínimo y se genera el menú igualmente.** Un menú con una
  rotura marcada es mejor que ningún menú. Es un orden estricto de prioridades: primero minimizar lo
  duro que se rompe y solo después optimizar lo demás. Cuando ocurra, la app debe **decir qué regla lo
  impidió**, para que se pueda arreglar la regla o el catálogo.
- **El control de variedad no es del usuario.** Nada de un mando visible de "más orden ↔ más
  sorpresa": la variedad debe regularse sola por dentro. Principio general: no cargar poco a poco al
  usuario con responsabilidades técnicas que no le tocan.
- **Sin pesos ni funciones definidos todavía.** Todo lo que sigue es marco y opciones, no diseño.

### Cómo se plantea el problema

- **Tablero**: los huecos del ciclo (14 días × las comidas del reparto de cada perfil; Comida y Cena
  son los 28 huecos que reciben proteína, carbohidrato y verdura).
- **Estado**: el tablero entero, completo o a medias.
- **Movimientos**: asignar un alimento a un hueco, **intercambiar** dos huecos, mover algo de un día a
  otro, reparar lo que un cambio dejó descolocado.
- **Restricciones duras**: lo que no se rompe (salvo imposibilidad).
- **Preferencias con daño**: lo que se intenta cumplir; cada incumplimiento suma una penalización.
- **Objetivo**: llegar a un tablero sin roturas duras y con el menor daño total.

Un matiz sobre la analogía: se parece más a un **horario o a una asignación de turnos** (muchas
soluciones válidas, gana la de menos conflictos) que a un 8-puzzle (un camino hacia una meta única).
Aquí no importa el camino recorrido, importa la configuración final.

**Qué hace el motor hoy y por qué esto lo mejora**: `generateMenu` (`Logica/menu-generador.js`)
construye el menú en una sola pasada y **sin marcha atrás**: reserva los platos cerrados, luego los
bloques de proteína y las proteínas de frecuencia fija, rellena con la base, superpone los garbanzos,
sortea carbo y verdura hueco a hueco y, por último, ajusta raciones. Cada paso decide sin saber qué
pasará después y ninguno puede corregir a los anteriores. De ahí salen las rachas, y de ahí también
que, cuando las reglas no dejan opción, el único recurso sea ignorarlas. Con un tablero completo delante
sí se pueden compensar unas cosas con otras.

### Restricciones duras (lo que se intenta no romper nunca)

- Frecuencias por semana y por ciclo de cada proteína y cada bloque, y sus patrones semanales
  explícitos (p. ej. 2+0 una semana y 1+1 la otra).
- Los platos cerrados, en su cuota.
- Reglas de afinidad "nula" (nunca juntos) y, a confirmar, "máxima" (siempre juntos), incluidas las
  de tres elementos (proteína + carbo + verdura).
- Los huecos que el usuario ha **fijado a mano** (ver «Reparación mínima»): mandan incluso sobre las
  reglas de afinidad — si algo queda en una combinación que pediste evitar, se avisa, no se deshace.
- Las comidas que existan en el reparto del perfil.

### Preferencias con daño (los términos posibles de la función de coste)

Lista abierta; no todas tienen por qué entrar, ni a la vez. El peso de cada una es lo que se calibrará
más adelante.

| Preferencia | Qué penaliza o premia | Origen |
|---|---|---|
| Rachas | El mismo carbo, verdura o proteína repetido en una ventana corta de comidas o días | «Evitar que se repita demasiado seguido lo mismo» |
| Repetición en el mismo día | Comida y Cena con el mismo carbo o la misma verdura | Ocurrencia |
| Novedad entre ciclos | El mismo alimento en el mismo día y franja que en el ciclo anterior; rachas justo en la frontera entre dos ciclos | Ocurrencia |
| Afinidad suave | Reglas "baja" (penalizan) y "alta" (premian); hoy son multiplicadores de peso del sorteo | Reglas actuales |
| Consumo preferente | Un alimento abierto que no se vuelve a comer dentro de su plazo, o que se queda sin usar | «Fecha de consumo preferente» |
| Perecederos | Fresco antes que congelado; lo más perecedero cerca de la compra | Ocurrencia |
| Batch cooking | Premia la misma proteína en días cercanos (choca con las rachas) | «Agrupar el menú por lo que se cocina en batch» |
| Compra corta | Menos alimentos distintos por semana, menos desperdicio | Ocurrencia |
| Recuentos | Que las veces que sale cada cosa se acerquen a las probabilidades configuradas | Motor actual (reparto exacto) |
| Comodidad | Platos laboriosos en los días con más tiempo | Ocurrencia — necesitaría un dato nuevo (tiempo de preparación) |
| Equilibrio semanal | Que la media de la semana cumpla umbrales (fibra, sal, pescado azul) | `Logica/salud-publica.js` y frecuencias |
| Cambio mínimo | Un coste por cada cosa que se mueve al reparar un menú ya existente | Ver «Reparación mínima» |

Que dos preferencias tiren en sentido contrario (batch cooking frente a rachas, por ejemplo) no es un
problema: es justo lo que una función de coste resuelve, decidiendo el equilibrio en un solo sitio en
lugar de repartirlo por el código.

### Consumo preferente, con detalle

Con la simplificación ya aceptada (el plazo cuenta desde la **primera aparición** del alimento en el
menú, sin marcado manual), se convierte en un problema de plazos, como una planificación con fechas de
entrega:

- **Dos plazos que compiten** (el ejemplo del usuario: uno de 3 días y otro de 5): tiene prioridad el
  que vence antes. Si los dos no caben en los mismos huecos, gana el de plazo más corto y el otro se
  queda con menos apariciones, avisando de que este ciclo no ha cabido.
- **El motor decide cuándo se "abre"** un alimento, porque decide cuándo aparece por primera vez, y
  puede aprovecharlo: colocar la segunda aparición dentro del plazo y no fuera.
- **Alimentos que aparecen una sola vez** no tienen problema de plazo (no hay nada que volver a
  comer), salvo que el envase dé para más raciones (ver el punto de los envases).
- **Frontera entre ciclos**: los plazos son cortos frente a un ciclo de 14 días, pero un alimento
  abierto en los últimos días de un ciclo sigue abierto en el siguiente. Habría que arrastrar ese
  estado desde el historial (`history`, que guarda los últimos 8 ciclos).
- **Envases y raciones**: un bote de garbanzos tiene una cantidad fija. Si una ración son 150 g y el
  bote pesa 400 g, lo razonable son unas 2,7 raciones dentro del plazo, no una. Es un refinamiento
  posterior, pero cambia el sentido de la idea: de "que se repita" a "que no sobre".
- **Frescos y congelados**: la misma idea generalizada. El pescado fresco pide comerse pronto tras la
  compra; el congelado da margen. Podría ser otro tipo de plazo del mismo mecanismo.
- **Datos nuevos necesarios**: plazo tras abrir (por alimento, quizá con un valor por defecto
  razonable para no cargar al usuario), y más adelante tamaño de envase y si es fresco o congelado —
  todos con su parche en `migrateData`.

### Cómo se conserva la variedad (el riesgo principal)

Un optimizador puro devolvería siempre el mismo menú, y la app existe para variar. Se ha razonado así:

**El riesgo real no es el menú idéntico** — con tantas combinaciones posibles, repetir exactamente un
ciclo es prácticamente imposible. El riesgo es el **menú distinto que se siente igual** porque comparte
una estructura: una alternancia perfecta pasta-arroz-pasta-arroz, el pescado siempre en los mismos
días, un hueco concreto (el lunes) con casi siempre lo mismo. Ese es el patrón que hay que evitar.

Herramientas para evitarlo, de las más sencillas a las más sofisticadas — se pueden combinar:

1. **Los recuentos también salen del azar.** Si se pasara al "reparto exacto" que ya usan desayunos y
   meriendas, las veces que sale cada alimento serían casi las mismas en todos los ciclos (35% de 24
   comidas da siempre 8 o 9). Redondear con azar mantiene las proporciones y deja variar los totales.
2. **Arrancar de un tablero barajado y parar en "suficientemente bueno".** Casi nunca hay un único
   mejor tablero: hay una meseta enorme de tableros sin daño. Si el algoritmo se detiene en cuanto
   entra en ella, el azar del arranque sigue vivo; si se empeña en perfeccionar sin fin, todos los
   caminos tienden a los mismos patrones. (Idea del propio usuario: barajar primero y usar el
   algoritmo para ordenar después — es exactamente una búsqueda local con arranque aleatorio.)
3. **Orden aleatorio de los movimientos.** Probar siempre los intercambios en el mismo orden resuelve
   los empates siempre igual y mete un sesgo escondido.
4. **Novedad respecto al historial.** Penalizar repetir lo del ciclo anterior en la misma posición
   (hoy solo se recuerda la última elección de los grupos de un hueco).
5. **Recocido simulado.** En vez de aceptar solo mejoras, acepta a veces empeoramientos pequeños con
   una probabilidad controlada por una "temperatura". Es un botón de variedad natural: fría = menús
   más ordenados, caliente = más libres.
6. **Varios candidatos.** Generar unos cuantos menús buenos (cuesta milisegundos) y quedarse con uno al
   azar, o con el más distinto del anterior.

**Un control de variedad que fluya por dentro** (decisión del usuario): en vez de un ajuste visible,
la temperatura o la exigencia de novedad se adaptan solas — por ejemplo, subiendo si los últimos
ciclos han salido demasiado parecidos entre sí, o relajándose cuando hay poca holgura (muchas reglas y
pocos alimentos, donde de todos modos casi no hay alternativas). El usuario nunca lo toca.

**Cómo saber si funciona, en vez de fiarse de la intuición**: generar cientos de menús con semilla y
medir:

- La distribución de cada hueco (si el lunes tiene mucha más pasta que el resto, hay sesgo de posición).
- La longitud de las rachas.
- La distancia media entre dos menús.
- Cuántas reglas se rompen.

Y comparar el motor actual contra el nuevo con los mismos números antes de tocar la app.

### Algoritmos posibles

- **Búsqueda local con intercambios** — el punto de partida que más sentido tiene. Un intercambio
  entre dos huecos no cambia cuántas veces sale cada alimento, así que las frecuencias y los
  porcentajes se conservan por construcción; solo cambia *dónde* va cada cosa. Los movimientos que
  dejarían una regla dura rota se rechazan.
- **Reparación posterior al generador actual** (vía incremental): el generador de hoy se queda como
  está y una fase final mejora el tablero por intercambios. Es un cambio pequeño y fácil de comparar
  con lo que hay, y de paso resolvería la duda pendiente de cómo lograr un reparto exacto de
  carbo y verdura sin romper las reglas de afinidad.
- **Recocido simulado**: la versión de lo anterior con temperatura, si se quiere más control de la
  variedad.
- **Búsqueda con vuelta atrás y orden aleatorio**: garantiza mejor las restricciones duras y da
  soluciones distintas si se recorren los valores en orden aleatorio, pero maneja peor las
  preferencias. Encaja como respaldo cuando la búsqueda local no encuentra un tablero válido.
- **Algoritmos genéticos**: posibles, pero excesivos para un problema de este tamaño.
- **Descartados**: A\* — necesita garantizar el óptimo, y aquí se busca justo lo contrario (un menú
  bueno y distinto cada vez). Y SAT o programación lineal — con 28 huecos sobran, y chocan con la regla
  de no añadir dependencias.

**Rendimiento**: 28 huecos con unas pocas opciones por hueco es un espacio pequeño. Una búsqueda local
en JavaScript puro tarda milisegundos, incluso generando decenas de candidatos. No requiere build ni
librerías, así que respeta la regla principal del proyecto.

### Reparación mínima: menú manual, "cambiar solo esta comida" y "no como en casa"

Es la misma pieza vista desde otro lado. Marcar huecos como **fijados** (por el usuario, por un "ese
día no como en casa" o por «Cambiar solo esta comida») y dejar que el motor recoloque el resto **con el
menor cambio posible**: un coste por cada cosa que mueve, para no descolocar todo un menú que ya
servía. Cubre a la vez:

- **Menú manual**: mover el pescado del jueves y que solo se resuelva lo que ese cambio afecta.
- **Cambiar solo esta comida**: fijar todo menos un hueco y volver a resolverlo.
- **Un día fuera de casa**: los huecos de ese día quedan bloqueados y lo que tocaba en ellos se recoloca.
- **Modificar un solo elemento de una comida** (la verdura del arroz con pollo): un hueco fijado
  parcialmente.
- **Lo que no se cocinó**: hoy «Motivo y estimación al no completar una comida» es solo informativo
  (decisión del 2026-09-21). Una extensión a futuro, sin decidir: que lo que se quedó sin cocinar (un
  pescado que no se descongeló) se pueda reprogramar en otro día, enlazando con el consumo preferente.

### Cómo encaja con el resto del motor

- **Ajuste de raciones**: se mantiene después de la búsqueda. Colocar los platos y calcular cuánto de
  cada cosa son problemas distintos; unirlos sería una fase mucho más adelante, si acaso.
- **Reglas de tres elementos**: solo se evalúan cuando los otros dos están decididos. Con un tablero
  completo esa limitación desaparece y la regla se puede comprobar entera.
- **Desayunos, medias mañanas y meriendas** podrían entrar en el mismo tablero (hoy se reparten aparte
  por proporción exacta) para evitar también sus rachas.
- **Garbanzos**: se superponen sobre otra comida y tienen sus propias reglas — hay que decidir si son
  un elemento más del tablero o un modificador.
- **Menú simple y Menú completo** usan el mismo motor, así que cualquier mejora llega a los dos.

### Transparencia

Un motor que decide por daños puede **explicar por qué**. La app ya lo hace en parte (el detalle de
cada comida muestra las reglas aplicadas o evitadas). Se podría ampliar con: las preferencias que no se
han podido cumplir, la regla dura que impidió algo, y un "por qué está aquí" en cada comida.

### Pruebas y medición

- **Generador de aleatorios con semilla.** Hoy todo usa `Math.random()` (en `Logica/seleccion.js` y en
  el propio motor), y por eso `generateMenu` no tiene casos con valores fijos en `Validacion/`. Con
  semilla el comportamiento por defecto sería el mismo, pero se podría reproducir cualquier menú y
  comprobar propiedades.
- **Propiedades que `Validacion/` podría comprobar**: que las restricciones duras nunca se rompen (salvo
  imposibilidad real), que las frecuencias se cumplen, y estadísticas sobre muchas generaciones.
- **Una línea base antes de cambiar nada**: un script desechable que mida el motor actual (rachas,
  sesgo de posición, reglas ignoradas) para saber el tamaño real del problema y tener con qué comparar.
- **Probar con el catálogo real**: la app ya permite descargar los datos como JSON desde Ajustes
  (`descargarDatosJSON`), lo que permitiría medir con un catálogo verdadero y no solo con uno sintético.

### Un orden de trabajo posible (orientativo, sin compromiso)

0. Semilla de aleatorios y línea base de medición.
1. Módulos puros aparte: uno que comprueba restricciones duras, otro que calcula el daño.
2. Fase de reparación tras el generador actual, empezando por las rachas.
3. Consumo preferente como nuevo término, con arrastre entre ciclos.
4. Fijados y reparación mínima: base del menú manual y de «Cambiar solo esta comida».
5. El resto de preferencias (batch cooking, compra corta, perecederos), la transparencia y el control
   de variedad que se regula solo.

### A perfeccionar

- Los pesos relativos entre preferencias — a propósito, sin definir todavía.
- Cuál es el tamaño de la ventana de rachas y si depende del grupo (carbo, verdura, proteína) y de
  cuántas veces por semana aparece.
- Qué significa exactamente "suficientemente bueno" para detener la búsqueda.
- Cómo se regula por dentro la variedad, y qué señales usa.
- Qué datos nuevos hacen falta (plazo de consumo, envase, fresco/congelado, tiempo de preparación) y
  cuáles se pueden inferir o dejar con un valor por defecto para no pedirle trabajo al usuario.
- Cómo se comunica al usuario una rotura inevitable de una regla, sin agobiarlo.
- El riesgo de pasarse de complicado: la vía incremental (reparación tras el generador actual) permite
  quedarse en lo pequeño si lo grande no compensa.
