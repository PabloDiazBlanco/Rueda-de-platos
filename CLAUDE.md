# FoodDraft — convenciones del proyecto

PWA que genera menús semanales variados a partir de platos propios, con cálculo de objetivos
nutricionales y seguimiento de peso. Nació como app de uso personal (un solo usuario, un solo
desarrollador); desde septiembre de 2026 está en proceso de abrirse a más usuarios y publicarse en
Google Play, con una capa de suscripción premium (ver `functions/`, y la hoja de ruta de
publicación si la tienes a mano). El contexto completo (por qué existe, la ciencia detrás) está en
los PDFs de `local/divulgacion/` — léelos antes de tocar cualquier fórmula nutricional. Ojo: esa
carpeta **no está en el repositorio** (ver "Carpeta `local/`" más abajo); si no la tienes en tu
copia, pídesela al usuario en vez de suponer su contenido.

**Nota sobre el nombre**: la app se llama "FoodDraft" de cara al usuario (así aparece en la
interfaz, el manifest, las páginas legales...). Por debajo, el proyecto de Firebase, el
repositorio de GitHub y todas las claves de almacenamiento siguen llamándose `rueda-de-platos` —
es el nombre con el que se creó la infraestructura, y renombrarlo ahí rompería la app ya
desplegada o, en el caso de las claves de Firestore, causaría que los datos ya guardados
parecieran haber desaparecido. No lo cambies en esos sitios aunque parezca inconsistente.

## Regla más importante: no hay build

No hay bundler, no hay `npm install`, no hay `package.json` **en la app**. Nunca lo añadas, aunque
parezca la solución obvia a algo. El navegador transforma JSX al vuelo con Babel Standalone (CDN), y
los módulos ES nativos (`import`/`export`) se resuelven con el `importmap` de `index.html`.

La única excepción es `functions/`: es un proyecto Node aparte (Cloud Functions de Firebase) con su
propio `package.json`, que se despliega con `firebase deploy --only functions` y no tiene nada que
ver con cómo carga el navegador la app. Esa regla no aplica ahí, pero tampoco se cuela hacia fuera:
la app nunca importa nada de `functions/`, ni al revés (ver más abajo el único código duplicado a
mano entre las dos mitades).

Esto tiene una consecuencia técnica concreta: **el `importmap` decide dónde buscar un archivo, no lo
transforma**. Un módulo sin JSX (todo `logica/`) se importa con nombre corto sin más. Los archivos
con JSX (`app.jsx` y `ui/`) necesitan pasar por Babel antes de ejecutarse: de eso se encarga
`cargador-ui.js` (ver "Cómo se carga la interfaz").

## Arquitectura de módulos

```
index.html             → importmap + carga auth-bootstrap.jsx
auth-bootstrap.jsx     → login/Firestore/App Check, puente con las Cloud Functions (window.*),
                          luego carga la interfaz con cargador-ui.js
cargador-ui.js         → carga app.jsx y ui/ (Babel + registro de módulos propio, sin build)
app.jsx                → componente principal: reúne los hooks de ui/estado/, decide si toca carga,
                          alta o app, lleva la navegación (destino, datos y última pantalla de cada
                          área) y pinta la pantalla elegida con su cabecera y su barra inferior

ui/                    → la interfaz (React): .jsx si lleva JSX, .js si no
  archivos.json         lista de TODOS los archivos de ui/ (la usan el cargador y sw.js)
  estilos.js            tipografías (FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO)
  pantallas.jsx         tabla destino del menú lateral (`tab`) → pantalla
  estado/               hooks: datos.js (useDatos, usePremium, useCargaInicial), menu.js (useMenu,
                          el mismo para Menú completo y simple), catalogo.js, perfil.js, peso.js,
                          despensa.js (useDespensa), entreno.js (useEntreno), cuerpo.js (useCuerpo)
  comun/                piezas reutilizadas: modal, tarjetas, idioma, categorias (iconos/colores),
                          cerrar-sesion (tarjeta de Ajustes y botón de la pantalla de alta), mapa corporal
                          (mapa-corporal.jsx y sus trazados MIT, mapa-trazados.js), avatar.jsx (el chibi
                          de FitDraft y el monitor)
  marco/                Shell (variables de tema y estilos de impresión), cabecera, menú lateral,
                          navegacion.js (áreas, pestañas y menú) y barra-inferior.jsx (barra de cristal)
  menu/ catalogo/ perfil/ onboarding/ peso/ premium/ ajustes/ despensa/ entreno/ cuerpo/   una carpeta por área

logica/comun.js               → uid(), DAYS, primerEmoji — utilidades mínimas compartidas
logica/macros.js               → getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt
logica/seleccion.js            → sorteo ponderado + reglas de combinación (weightedPick, pickWithRules...)
logica/comida-calculo.js       → mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra
logica/objetivos.js            → PAL/TDEE/macros objetivo, calcularObjetivosPerfil, objetivosPorComida,
                                  presets de reparto de comidas (PRESETS_COMIDAS) y la recomendación de
                                  preentreno (recomendacionPreentreno, D3: no toca ninguna fórmula)
logica/menu-generador.js       → generateMenu, lastPicksFromHistory (el motor de generación completo)
logica/peso.js                 → seguimiento de peso: tendencia, cambios atípicos, ciclos
logica/salud-publica.js        → resumenNutrientesSemana: sal/azúcares/fibra contra umbrales de la OMS
logica/resumen-mensual.js      → calcularResumenMensual, pesoEnMes (comidas completadas + peso del mes)
logica/i18n.js                 → diccionario de textos por idioma (ES/EN/CA/GL/EU) y la función t()
logica/datos-iniciales.js      → FOODS_SEED, CATEGORIAS_ALIMENTOS, initialData (cuenta nueva)
logica/cuestionario.js         → opciones del cuestionario de alta y construirIngredientesDesdeCuestionario
                                  (con la proteína predeterminada, que pasa a ser la «base» del motor, A9)
logica/migraciones.js          → migrateData
logica/despensa.js             → stock de la despensa: zonas, menú confirmado, descontar/devolver comidas,
                                  tachar/destachar compras, queda poco (alertasStock), limpieza,
                                  fecha de cambio (sellarCambios), migrarDespensa, lo que se manda a
                                  «¿Qué cocino?» (resumenDespensaParaIA)
logica/lista-compra-neta.js    → necesidadesComida, calcularListaNeta (lista de la compra menos lo que hay)
logica/comida-real.js          → lo comido de verdad («Cambié algo»): lineasComida, propuestaGramos,
                                  comidaReal, registroComida, totalesDiaReal, necesidadesComidaReal
logica/periodo.js              → período (I1): inicios de regla y predicción del siguiente (no importa nada)
logica/nevera.js               → colocación de la nevera dibujada: huecoDe, formaDe, esBebida, repartirEnHuecos
logica/entreno-ejercicios.js   → tipos de ejercicio y de serie, músculos, equipos, biblioteca semilla (80),
                                  listaEjercicios, ejercicioPorId, buscarEjercicios, posibleDuplicado
logica/entreno-nombres.js      → nombres de los 80 ejercicios en ES/EN/CA/GL/EU y nombreEjercicio
logica/entreno-calculo.js      → 1RM (Epley), volumen, duración con pausas, récords, «anterior», series
                                  por músculo, validarSerie, semanas
logica/entreno-sesion.js       → operaciones puras de la sesión en curso (series, descanso, sustituir hoy,
                                  pausa, terminar) y de rutinas (aplicarARutina, rutinaDesdeSesion)
logica/entreno-almacen.js      → claves, migraciones, meses, índice, borrador, cola de envíos y CSV
logica/entreno-importar.js     → importar de Hevy y Lyfta: leerCSV, adaptadores, emparejar con la biblioteca,
                                  prepararImportacion (vista previa) y construirImportacion
logica/informes.js             → informes cruzados del área Cuerpo: los 15 predefinidos (INFORMES,
                                  informesVisibles) y los de antes (informeCruzadoMes, declaradoPorSemana),
                                  aviso de actividad (sesionesPorSemana, evaluarAvisoActividad) y de grupos
                                  musculares sin entrenar (ultimaVezPorGrupo, gruposSinEntrenar)
logica/cuerpo-diario.js        → sueño y pasos de cada día (migrarDiario, apuntarSueno, apuntarPasos...) y
                                  favoritos de los informes (migrarFavoritos, alternarFavorito, idDeConstructor)
logica/cuerpo-series.js        → la serie de cada día con los datos reales (construirSerie), VARIABLES, valores
                                  por día o semana, estadística honesta (pearson, pista, relacion, porCategoria,
                                  tablaXYZ) y las preguntas del constructor (PREGUNTAS, FORMAS, resolverMontaje)
logica/mapa-corporal.js        → mapa corporal: SLUG_A_GRUPO (trazo → 14 grupos), escala de verdes,
                                  seriesDeRutina, valoresDeEjercicio, generoMapa
logica/gimnasio.js             → el gimnasio dibujado de FitDraft: plano, zonas y 25 máquinas (ZONAS, ESTACIONES),
                                  lista de una zona (ejerciciosDeZona), rutas A* (aEstrella, puntoDe), paradas de
                                  una rutina, paso entre ejercicios, zonas teñidas (estadoZonas), frase del
                                  monitor (fraseMonitor), rutina de hoy (rutinaDeHoy) y días de la semana
```

Todos los módulos de `logica/` son **sin JSX, sin React**, y solo se importan entre sí, nunca nada
de `ui/` ni de `app.jsx`. Los cruces que existen hoy: `peso.js` → `i18n.js` (mensaje de
`evaluarTendencia` y meses de `formatFechaCorta`), `datos-iniciales.js` → `peso.js`,
`cuestionario.js` → `comun.js` y `datos-iniciales.js`, `migraciones.js` → `datos-iniciales.js`,
`objetivos.js`, `peso.js` e `i18n.js`, `despensa.js` → `comun.js` y `datos-iniciales.js`, y `lista-compra-neta.js` →
`macros.js`, `comida-calculo.js` y `despensa.js`, y `comida-real.js` → esos tres y `datos-iniciales.js`
(`nevera.js` no importa nada). Del entreno:
`entreno-sesion.js` → `comun.js`, `entreno-importar.js` → `comun.js` y `entreno-ejercicios.js`,
`entreno-almacen.js` → `entreno-calculo.js` e `informes.js` →
`entreno-calculo.js`, `resumen-mensual.js`, `objetivos.js` (solo lee de él) y `cuerpo-series.js`; del área
Cuerpo, `cuerpo-series.js` → `entreno-calculo.js` y `periodo.js` (`cuerpo-diario.js` y `mapa-corporal.js` no
importan nada); del gimnasio de FitDraft, `gimnasio.js` → `entreno-calculo.js` (fechas); `entreno-ejercicios.js`,
`entreno-nombres.js` y `entreno-calculo.js` no importan nada (reciben `ejercicioDe(id)` y `nombreDe` como
funciones, para no depender de la biblioteca ni de los nombres). La interfaz importa `logica/` por **nombre corto** y otros
archivos de `ui/` por **ruta relativa con extensión** (`"../comun/modal.jsx"`). Los archivos de
arranque se quedan en la raíz (`index.html`, `auth-bootstrap.jsx`, `cargador-ui.js`, `sw.js`,
`manifest.json`, `icon.svg`): `sw.js` en concreto necesita estar ahí para que su "scope" cubra toda
la app.

**Al crear un módulo nuevo de lógica**, ponlo en `logica/` y registra su nombre corto en **dos**
sitios, o `validacion/` dejará de cargar sin avisar con un error claro:
- `index.html` → `"nombre": "./logica/archivo.js"`
- `validacion/index.html` → `"nombre": "../logica/archivo.js"` (un nivel arriba)

Y añádelo a `FILES_TO_CACHE` en `sw.js` (ver más abajo). Como todo se importa por nombre corto
entre los propios módulos y desde la interfaz, mover un archivo de sitio no obliga a tocar nada
dentro de él — solo esas entradas.

**Al crear un archivo nuevo de interfaz**, ponlo en su carpeta de `ui/` y añádelo a
`ui/archivos.json`. No hace falta tocar ningún `importmap`. Si se te olvida, la app funciona igual
con conexión, pero `validacion/` lo marca en rojo (grupo "Carga de la interfaz") y el archivo no
quedaría disponible sin conexión.

Para que `validacion/tests.js` pueda usar una función de `logica/`, lo más directo es importarla en
el propio `tests.js` por su nombre corto (así lo hacen los casos de `migrateData` y del
cuestionario). Las más antiguas las recoge del objeto exportado por `app.jsx` (`export { ... }` al
principio de `app.jsx`); ese patrón sigue funcionando.

## Cómo se carga la interfaz (`cargador-ui.js`)

Hasta octubre de 2026 toda la interfaz vivía en un único `app.jsx` (~7.200 líneas) porque un
archivo con JSX que importa a otro con JSX no se puede resolver solo con el `importmap`, y las dos
salidas que se habían evaluado eran malas: enseñar a `sw.js` a transformar `.jsx` en cada petición
(arriesgado para el arranque sin conexión) o cargar componentes con `import()` dinámico (cambia
cómo se escribe todo el código). La reestructuración de octubre de 2026 usó una tercera vía:

`cargador-ui.js` descarga `app.jsx` y los archivos de `ui/`, los pasa por Babel con el plugin
`transform-modules-commonjs` (ya incluido en Babel Standalone), que convierte sus `import`/`export`
en llamadas a un registro propio, y los enlaza entre sí en el navegador. Los nombres cortos
(`react`, `lucide-react`, los módulos de `logica/`) se siguen resolviendo con el `importmap`. Lo
usan tanto `auth-bootstrap.jsx` como `validacion/index.html`, así que las pruebas cargan exactamente
la misma interfaz que la app. Reglas al escribir en `ui/`:

- **Cada archivo con JSX importa React** (`import React from "react"`): el JSX se transforma en
  `React.createElement`, así que React tiene que estar en el ámbito del archivo.
- **Imports entre archivos de la interfaz, con ruta relativa y extensión** (`.jsx` o `.js`).
- **No uses al cargarse el módulo** (fuera de funciones) algo importado de otro archivo de `ui/`;
  solo dentro de componentes o funciones. Así los ciclos entre archivos no dan problemas.
- El cargador pide los archivos con `cache: "no-cache"` para no mezclar archivos nuevos y viejos
  tras un despliegue. Un error de sintaxis dice en qué archivo está, y en las herramientas del
  navegador cada archivo aparece con su nombre real.
- Coste de arranque: Babel transforma toda la interfaz en cada carga (~0,5 s en escritorio, medido
  en octubre de 2026; más en móvil). Una mejora pendiente es guardar el resultado transformado
  entre visitas — no está hecho porque hay que invalidarlo bien tras cada despliegue.

## Navegación por áreas

Desde octubre de 2026 la app es «muchas aplicaciones en una»: tres **áreas** — **FoodDraft**
(nutrición), **FitDraft** (entreno; hasta el 26-oct-2026 se llamaba «Entrenamiento», su clave interna sigue
siendo `entreno`) y **Cuerpo** (peso, medidas, actividad diaria, resúmenes) — y una zona
**común** sin área (Compartir, Ayuda y comentarios, Documentos, Premium, Ajustes, Perfil). El porqué y
el aspecto de cada pieza están en `local/ideas/gimnasio/03-diseno-modulo-entreno.md` (§3).

- **`ui/marco/navegacion.js`** (sin JSX) es la única descripción: `AREAS` (cada una con sus `pestanas`
  y su `menu`) y `COMUNES`. Una pestaña tiene un destino raíz y la lista de destinos que cuelgan de ella
  (`incluye`), escrita a mano. `areaDe(destino)` y `pestanaDe(destino)` dicen dónde cae cualquier
  pantalla. De aquí leen el menú lateral, la barra inferior y la cabecera.
- **Los destinos son los `tab` de siempre** (las claves de `PANTALLAS` en `ui/pantallas.jsx`): ninguna
  pantalla cambia por dentro. `app.jsx` guarda `{ tab, params }`: `navegar(destino, params)` permite
  abrir una pantalla con datos (la ficha de un ejercicio concreto...), y `setTab(destino)` sigue siendo
  lo que usan las pantallas de siempre (navegar sin datos). Las dos van en `ctx`, junto con `params`.
- **Última pantalla de cada área**: al tocar un área en el menú lateral se vuelve adonde se estaba
  (`localStorage`, `fooddraft:ultima-pantalla`, comodidad del dispositivo); si no hay, a su primera
  pestaña. La app sigue abriendo en `menu`.
- **Menú lateral**: arriba las áreas, desplegables con todas sus funciones (el área actual sale
  resaltada y desplegada); abajo lo común, con Premium en mostaza. Un área sin pantallas no se lista.
- **Barra inferior** (`ui/marco/barra-inferior.jsx`): píldora flotante de cristal claro (fondo
  `--cristal` al 60 % con desenfoque; fondo sólido sin `backdrop-filter` o con «reducir transparencia»),
  solo en las pantallas de un área. Solo la pestaña activa enseña su nombre (las demás, como
  `aria-label` y `title`); tocar una pestaña lleva a su raíz. Se esconde mientras hay un campo de texto
  con el foco (el teclado del móvil la subiría encima), y `<main>` deja libre abajo lo que ocupa
  (`RELLENO_BARRA`). Las variables del cristal están en `Shell`.
- **Cabecera**: el título grande dice el área («Tu recetario», «Tu entreno», «Tu cuerpo»; «Tu cuenta» en
  la zona común); el rótulo pequeño es «FoodDraft», salvo en el área de entreno, que dice «FitDraft» (el
  `rotulo` de su entrada en `AREAS`; es una marca, no se traduce).
- **Capas (`z-index`)**: gimnasio dibujado de Entrenar 5 (fijo debajo de la cabecera; sus botones, 6-7) ·
  barra inferior 30 · pastilla de entreno en curso 31 · menú lateral 40/41 ·
  sesión de entreno y paneles de la nevera 45 · modales 50 · `HistoriaScreen` de `auth-bootstrap.jsx`
  9999. Las capas a pantalla completa (sesión, `CapaCompleta`, paneles de la nevera) bloquean el scroll de la
  página con `useBloqueoScroll` (`ui/comun/bloqueo-scroll.js`), un contador común: **nunca** guardes y
  devuelvas `document.body.style.overflow` a mano en una capa nueva (hasta el 27-oct-2026 cada una lo hacía y,
  al cerrarse en otro orden, la página se quedaba sin scroll hasta recargar).
- **«← Gimnasio»**: `navegar(destino, params, { volver: true })` recuerda de dónde se viene, y `app.jsx` pinta
  arriba la vuelta mientras se siga en esa pestaña. Hoy solo lo usa el gimnasio dibujado (Progreso, Historial,
  Rutinas y la ficha de un ejercicio).
- **Cerrar sesión** (`ui/comun/cerrar-sesion.jsx`, con una confirmación breve) está en **Ajustes** y,
  en pequeño arriba a la derecha, en la **pantalla de alta** (asistente de perfil y cuestionario), por si
  se ha entrado con otra cuenta. Lo cierra `window.signOutUser` (`auth-bootstrap.jsx`). Hasta octubre de
  2026 era un botón flotante que `auth-bootstrap.jsx` pegaba fuera de React en todas las pantallas y que
  obligaba a dejar ~110 px libres a la derecha en las barras a pantalla completa: ya no hace falta.

**Al añadir una pantalla**: su destino en `PANTALLAS`, y su sitio en `navegacion.js` — en el `incluye` de
una pestaña, en el `menu` de un área o en `COMUNES`. Si se olvida, `validacion/` (grupo «Navegación por
áreas») la marca en rojo como huérfana. **Al añadir una pestaña**: su entrada en `pestanas` con icono
de `lucide-react` (monocromo, de línea) y su etiqueta `barra.*` en los cinco idiomas; caben cinco por
área. Ese mismo grupo comprueba que todas las claves de la navegación (y las de los prefijos nuevos:
`area.`, `barra.`, `entreno.`, `cuerpo.`...) existen en los cinco diccionarios.

## Al añadir un archivo `.js`/`.jsx` nuevo que la app carga siempre

Además de registrarlo donde toque (los dos `importmap` y `FILES_TO_CACHE` de `sw.js` si es de
`logica/`; `ui/archivos.json` si es de la interfaz, que `sw.js` lee solo), sube en uno la versión
de `CACHE_NAME` en `sw.js`. Si no lo haces, el service worker ya instalado no se reinstala y el
archivo nuevo solo queda disponible sin conexión después de haberlo pedido con conexión al menos
una vez — la estrategia de `sw.js` es "red primero con cacheo de paso", así que en el uso normal no
se nota, pero falla si alguien instala la PWA estando ya sin conexión. Se nos olvidó al crear los
7 primeros módulos de la capa de lógica; quedó corregido después, pero es fácil que vuelva a pasar.

## Migraciones de datos guardados

`migrateData` (en `logica/migraciones.js`) se ejecuta sobre cualquier dato cargado desde
Firestore/localStorage antes de usarlo (lo llama `useDatos`, en `ui/estado/datos.js`). Si cambias la
forma de los datos guardados (un campo nuevo, un catálogo que crece, una estructura que cambia),
añade aquí el parche correspondiente — nunca asumas que los datos ya guardados de antes tienen la
forma nueva. El patrón siempre es el mismo: comprobar si falta algo y completarlo sin pisar lo que
el usuario ya haya editado a mano (mira los bloques existentes como ejemplo, especialmente el de
`FOODS_SEED` y los campos añadidos después). Y añade su caso en `validacion/tests.js` (grupo
"migrateData"): es lo que protege los datos de todas las cuentas.

## Menú completo y Menú simple

Hay dos pantallas de menú que conviven, y las dos usan el mismo `generateMenu`:

- **Menú completo** (`MenuView`, `ui/menu/menu-completo.jsx`): con kcal, macros, raciones ajustables
  y comparación contra los objetivos del día. Ciclo en `menu-v1`, historial en `history-v1`, lista de la compra en
  `data.listaCompra`.
- **Menú simple** (`MenuSimpleView`, `ui/menu/menu-simple.jsx`): solo el borrador de combinaciones,
  sin calorías ni gramos.
  Tiene su propio ciclo (`menu-simple-v1`), su propio historial (`history-simple-v1`) y su propia
  lista de la compra (`data.listaCompraSimple`), independientes de los de arriba — generar o
  deshacer en uno nunca toca al otro. Para no mostrar cantidades, `mealExportParts` y
  `calcularListaCompra` aceptan `{ conCantidades: false }`.

El estado de los dos lo lleva el mismo hook, `useMenu` (`ui/estado/menu.js`), con una configuración
distinta para cada uno (`MENU_COMPLETO` y `MENU_SIMPLE`: claves de almacenamiento y campo de la
lista de la compra) — así es imposible que una mejora llegue a uno y se olvide en el otro.

**Preentreno** (D3, 25-oct-2026, versión mínima): el perfil guarda cuándo se entrena (`diasEntreno`,
`horaEntreno` y `entrenoComida: { momento: "antes"|"despues", comida }`; se pregunta al final del asistente de
alta y se edita en Actividad diaria, `ui/perfil/preentreno.jsx`). `recomendacionPreentreno` da una
**recomendación** transparente (comer algo ligero antes, o que no hace falta si se entrena después de una
comida), **sin tocar el reparto de macros**. En los días de entreno, los dos menús enseñan una línea corta
(`LineaPreentreno`).

**Generar no es instantáneo** (C11, 25-oct-2026): `useMenu.generar` calcula el menú igual que siempre pero lo
enseña tras una espera al azar de 3 a 6 s (`ESPERA_GENERAR_MIN_MS`/`MAX_MS`), con la animación de
`ui/menu/generando.jsx` en el sitio del menú y el botón desactivado; la misma en los dos menús. Con «reducir
movimiento» se genera al momento. La animación es la **cadena de tuppers** (parte estética, 26-oct-2026): siete
tuppers en la encimera de la cocina retro (colores de `ui/despensa/tema.js`, solo importado), uno por día, que un
cucharón va llenando y que se cierran con un rebote, con frases de cocina (`menu.generando.frase1-4`), los segundos
y una barra. Todo va en fracciones de la duración, así que dura lo que dure la espera. El componente sigue
recibiendo solo `{ inicio, duracion }`.

**Fondo «mínimo pulido» y un solo día a la vez** (parte estética, 26-oct-2026): sin ilustración de fondo, y los
dos menús enseñan **un día cada vez** (`SelectorDia` y `TarjetaDia`, `ui/menu/selector-dia.jsx`): al abrir, hoy
(con un punto mostaza en su botón); los botones de día cambian a la vez la tarjeta de macros y las comidas. El día
elegido vive en el estado de la pantalla, no se guarda. En el Menú completo, la tarjeta de macros
(`DayStatsPanel`, `ui/menu/estadisticas.jsx`) es la «A sin aro»: el anillo cuenta solo el reparto de kcal entre
macros, debajo la pastilla del % de kcal y a la derecha una barra por macro contra su objetivo (raya mostaza en el
100 %, escala hasta el 130 %, óxido por encima del 110 %); sin objetivos, las pastillas P/G/C. La tarjeta del día
acaba con el total de kcal. Sal, azúcares y fibra siguen siendo de la semana, debajo.

**Colores de los macros**: en un solo sitio, variables de `Shell` (`--macro-prot`, `--macro-grasa`, `--macro-carb`,
con `-texto` y `-suave` para las pastillas). Por el criterio de gráficas (un color, un significado: verde lo tuyo,
mostaza objetivo o referencia, óxido fuera de rango), **la grasa es oliva**, no mostaza. Úsalas en todo lo nuevo
que pinte macros, nunca el color a mano.

**Hecha y «Cambié algo»** (B1+B3, 25-oct-2026; solo Menú completo, que es el único que marca comidas):
en el detalle de una comida, «Hecha» la da por buena tal cual y «Cambié algo» (`ui/menu/cambie-algo.jsx`)
deja cambiar cada alimento por otro del catálogo propio (primero su carpeta, luego el resto; cantidad
propuesta con las mismas kcal, redondeada sin pasar del ±10 %, editable) o marcar «no lo comí». Se marca
para HOY, como siempre, en `data.comidasCompletadas[fecha][tipo]`, que desde entonces guarda un registro
`{ hecha: true, slotId, macros, cambios? }` (`registroComida`, `logica/comida-real.js`; las de antes,
`true`, las convierte `migrateData` en `{ hecha: true }`). Las kcal del día del menú y de cada comida
enseñan lo comido de verdad en las comidas con cambios (`totalesDiaReal`), **sin reajustar nada** del
menú ni del ciclo; la despensa descuenta lo comido de verdad.

**Compartir** (`BotonCompartir`, `ui/comun/compartir.jsx`): el menú de la semana elegida y las dos
listas de la compra se comparten como texto o como imagen (un PNG dibujado en un `<canvas>`, sin
librerías), con `navigator.share` y, donde no se puede, copiando el texto al portapapeles o
descargando la imagen. Cada pantalla arma un «documento» (título, secciones y líneas) y la pieza común
lo pasa a texto o lo dibuja; el del menú lo arma `documentoMenu` (`ui/menu/exportar.js`): en texto,
cada comida con sus ingredientes (y gramos en el Menú completo); en imagen, solo los platos (y las kcal
en el completo), para que se lea en un móvil. La imagen se prepara al abrir las opciones y no al
elegir «Imagen», porque Safari solo deja abrir el menú de compartir justo después de un toque. Sustituye
al antiguo «Exportar PDF» del menú (`window.print`), que se quitó en octubre de 2026 porque en el móvil
iba mal; el seguimiento de peso y el catálogo de alimentos conservan su versión imprimible.

Todas las claves de almacenamiento (`STORAGE_KEY` en `ui/estado/datos.js`; las de los menús en
`MENU_COMPLETO`/`MENU_SIMPLE`, `ui/estado/menu.js`) empiezan por `rueda-de-platos:` — ver la nota sobre el nombre al principio de este archivo.

## Despensa («¿Qué tengo?»)

Lo que hay en casa, por zonas (despensa, nevera, congelador), en gramos aproximados; la verdura y la
fruta solo como «tengo / no tengo». Vive en su propia clave, `rueda-de-platos:despensa-v1`, con su
propia versión y su propia migración (`migrarDespensa`, en `logica/despensa.js`): **no pasa por
`migrateData`**. Si cambia su forma, el parche va en `migrarDespensa` y su caso en `validacion/tests.js`
(grupo «Despensa y lista de la compra neta»). La lleva `useDespensa` (`ui/estado/despensa.js`) y la
pantalla es `ui/despensa/despensa.jsx`, con dos vistas del mismo contenido: **Dibujo** y **Lista**.

Cómo se relaciona con el Menú completo (el Menú simple queda fuera):
- **Un menú recién generado es un borrador** hasta que se confirma. Se guarda el id de `menu[0]`
  (`menuConfirmadoId`): sobrevive a ajustar raciones y vuelve a coincidir con «Deshacer».
- **La lista de la compra es neta** (`calcularListaNeta`): necesidad de las comidas *pendientes* menos
  lo que hay, agrupada por alimento. Antes de confirmar es provisional y sin casillas; después, tachar
  mete lo comprado en la despensa (`despensa.compras`) y destachar lo saca.
- **Completar una comida descuenta** lo que lleva (sin bajar de cero) y desmarcarla devuelve
  exactamente lo descontado (`despensa.consumos`, por fecha y tipo de comida). Una comida con consumo
  ya no cuenta como pendiente, así que nada se cuenta dos veces. Si se marca con «Cambié algo», se
  devuelve lo descontado antes y se descuenta lo comido de verdad (`necesidadesComidaReal`).
- `calcularListaCompra` (`comida-calculo.js`) sigue intacta para el Menú simple, que conserva sus
  casillas de siempre en `data.listaCompraSimple`.
- Borrar un alimento del catálogo lo quita también de la despensa: `useCatalogo` recibe el aviso
  `alBorrarAlimento` y `app.jsx` lo conecta con `useDespensa` (los hooks no se importan entre sí).
- Las dos listas de la compra tienen el botón **Compartir**, que manda lo pendiente como texto o como
  imagen (ver «Menú completo y Menú simple»).

Además, dentro de la misma clave:
- **Queda poco** (`alertasStock`): lo acabado o con menos de una ración media (la media de los gramos con
  que sale en los platos del usuario; si ningún plato lo usa, la cantidad por defecto de su carpeta) sale
  en rojo, con un punto en el botón de su zona y un aviso arriba de «¿Qué tengo?» que se cierra hasta el
  día siguiente (`localStorage`, `fooddraft:aviso-stock-cerrado`). Solo automático, sin mínimos a mano
  (decisión del usuario).
- **Limpieza y casa** (`despensa.limpieza`): lista de la compra de lo que no es comida, en texto libre,
  fuera del catálogo y del menú. Se ve debajo del fregadero de la cocina dibujada
  (`ui/despensa/fregadero.jsx`), en la vista de lista y al final de la lista de la compra del Menú
  completo.
- **Emoji de cada alimento** (F3, 25-oct-2026): `food.emoji`, opcional. Los de `FOODS_SEED` traen uno
  distinto cada uno (lo completa `migrateData` en las cuentas existentes, sin pisar uno cambiado ni uno
  borrado a propósito, que se guarda como `""`); el usuario lo cambia al editar el alimento (se queda el
  primer emoji de lo que escriba, `primerEmoji`). Sin emoji, el de su carpeta (`emojiDe` en
  `ui/despensa/piezas.jsx`). En la Lista sale en lugar del de la carpeta; en el Dibujo, como una pegatina
  encima del dibujo de siempre.
- **Dibujo propio de cada alimento base** (estética del 26-oct-2026): los 43 de `FOODS_SEED` tienen su
  dibujo en SVG (`ui/despensa/alimentos.jsx`, con el id del alimento como clave, en una caja de 48 × 48),
  que sustituye al dibujo genérico de su forma **y** a la pegatina del emoji en la nevera, el estante, la
  Lista y «Añadir» (`MarcaAlimento`, `piezas.jsx`). Lo decide `dibujoPropio(food, FOODS_SEED)`
  (`logica/nevera.js`; `repartirEnHuecos` lo añade como `dibujo` a cada entrada): solo los de la semilla, y
  no si el usuario les cambió el emoji (entonces manda el suyo; si lo borró, vuelve el dibujo). Los que crea
  el usuario siguen como antes (forma + pegatina, o emoji en la Lista). **Al añadir un alimento a
  `FOODS_SEED`, dibújalo ahí**: el caso «Dibujo propio» de `validacion/` cuenta que estén todos.
- **Fecha de cambio** (`actualizado` en cada entrada): la pone `sellarCambios` en `useDespensa` con cada
  cambio, nunca cada operación por su cuenta. Hoy no la usa nada: es para el futuro aviso de revisar lo
  que lleva mucho sin tocarse (idea F2).

La vista **Dibujo** (Fase B, octubre de 2026) es una cocina (`ui/despensa/cocina.jsx`) en tres capas: la
nevera retro con su congelador y el estante de la despensa (lo que guarda de verdad); la pared, la
encimera y los muebles (solo decorado); y la vitrocerámica y el grifo. Cada puerta gira sobre su bisagra
con un pequeño rebote, se enciende la luz y el interior se abre a pantalla completa
(`ui/despensa/panel.jsx`), con fichas que se tocan para cambiar cada cosa (`editar.jsx`). La
vitrocerámica enciende un fuego y lleva a «¿Qué cocino?» solo navegando, al destino
`cocinar-desde-cocina` de `ui/pantallas.jsx` (la misma pantalla que `cocinar`, pero volviendo a «¿Qué
tengo?»); el mueble de debajo del fregadero se abre como la nevera y guarda la lista de limpieza. Los
paneles a pantalla completa comparten marco (`MarcoPanel`, en `panel.jsx`).

El grifo es un pequeño juego (idea del usuario): cada toque suelta una gota que llena una octava parte
(`GOTAS_PARA_LLENAR`, en `cocina.jsx`) de una botella de detergente verde a la que baja recto el sifón,
debajo del fregadero. Con la octava se desborda (`derrame`: `"lleno"` → `"charco"`): la puerta del
mueble se abre, la botella cae al suelo con hasta dos botes de limpieza (uno por cosa pendiente de la
lista) y queda un charco de agua sucia; tocar el charco (`"recogiendo"`) lo devuelve todo a su sitio, la
botella vacía y la puerta cerrada. El nivel se guarda en `localStorage` (`fooddraft:agua-fregadero`),
como comodidad del dispositivo y no como dato de la cuenta, y vuelve a cero en cuanto se desborda: si se
sale con el charco en el suelo, al volver ya está recogido.

**Detalles que se tocan** (estética del 26-oct-2026, `ui/despensa/detalles.jsx`; maqueta
`local/ideas/esteticas/v2-07-cocina.html`): juguetes que no abren nada ni guardan nada. El **frutero**, en una
repisa encima de la vitro (lejos del grifo y sin tapar la vitro, que sigue siendo el botón de «¿Qué
cocino?»), enseña la fruta que hay en casa (`frutasDelFrutero`, `logica/nevera.js`: nevera y despensa, no la
congelada ni la acabada, cada una una vez, como mucho 5) y da un saltito al tocarlo. La **planta** de encima
de la nevera solo se mueve si se toca; tras un número de toques al azar entre 4 y 9 (otro cada vez) sale una
**mosca** que vuela a su alrededor, se mata con un toque y deja una mancha verde oscura que se apaga en ~3 s
(si no se le da, se esconde a los 6 s). La **lámpara** oscila al tocarla y se para sola; cada toque más la
mueve más rápido y más amplio, hasta el doble (rAF con amortiguación, sin estado de React). La planta y la
lámpara salieron de `FondoCocina` para poder moverse. Sus colores, en el tema (`mimbre`, `hoja`, `mosca`,
`mancha`, `cable`...); sus textos, en el bloque `cocina.` de `logica/i18n.js`.

Reglas de esta parte:
- **Qué va en cada hueco** (puerta, baldas, cajón, cesta...) **y con qué dibujo** lo decide
  `logica/nevera.js`, con sus casos en `validacion/tests.js` (grupo «Colocación en la nevera»); la
  interfaz solo pinta lo que le llega de `useDespensa().huecos(zona)`. Si algo es una bebida (va a la
  puerta) se deduce del nombre, porque el catálogo no tiene carpeta de bebidas.
- **Los colores salen de un tema** (`ui/despensa/tema.js`, hoy solo «retro»), nunca escritos a mano en
  los componentes: así otro estilo sería una entrada nueva ahí. Los dibujos están en
  `ui/despensa/dibujos.jsx` (SVG, sin imágenes externas); las propuestas originales, en
  `local/ideas/diseno-nevera/`.
- Con «reducir movimiento» activado en el sistema no hay animaciones: el interior se abre al instante,
  la vitrocerámica navega sin esperar al fuego y el grifo llena la botella sin gota que caiga (si se
  desborda, todo aparece ya en el suelo, y al recogerlo vuelve de golpe). La fruta del frutero no salta,
  la planta y la lámpara no se mueven (la luz de la lámpara solo parpadea) y la mosca aparece y desaparece
  sin volar; su mancha se quita sin fundido.
- Todo se coloca en unidades del dibujo de la cocina (`ESCENA_ANCHO` × `ESCENA_ALTO`) sobre un
  contenedor con esa misma proporción, así que la escena se escala entera con el ancho de la pantalla.
- La vista elegida (Dibujo o Lista) se recuerda en `localStorage` (`fooddraft:vista-despensa`), como
  comodidad del dispositivo, no como dato de la cuenta.

## Entrenamiento

Módulo de entreno al estilo Hevy/Lyfta con la estética de FoodDraft (octubre de 2026), en el área
FitDraft (así se llama desde el 26-oct-2026; antes, «Entrenamiento»). Diseño y porqué: `local/ideas/gimnasio/03-diseno-modulo-entreno.md`; plan de construcción
y decisiones cerradas: `04-plan-de-ejecucion.md` (§3 y §4.3). Toda la lógica está en los cinco módulos
`logica/entreno-*.js`, con sus casos en `validacion/` (grupos «Entreno: …»).

**Modelo de datos** (claves nuevas, cada una con su `version` y su migración en `entreno-almacen.js`; como la
despensa, **no pasan por `migrateData`**):

| Clave | Contenido |
|---|---|
| `rueda-de-platos:entreno-catalogo-v1` | ejercicios propios, personalización de los de fábrica (favorito, nota fija, descanso), rutinas, ajustes, estado de los avisos, importaciones hechas |
| `rueda-de-platos:entreno-AAAA-MM-v1` | las sesiones **terminadas** de ese mes |
| `rueda-de-platos:entreno-indice-v1` | caché reconstruible: sesiones por mes; por ejercicio, la última vez y sus récords; por rutina (`rutinas`, G4), los ejercicios de su última sesión |
| `rueda-de-platos:entreno-borrador-v1` | `{ version, sesion }`: la sesión en curso (o `null`) |
| `localStorage` `fooddraft:entreno-borrador` / `fooddraft:entreno-pendientes` | copia inmediata del borrador y cola de sesiones terminadas sin confirmar en la nube |

Los ajustes del catálogo incluyen `paseoDescanso` (FitDraft, 26-oct-2026: el mini-mapa del descanso; `true`
por defecto, lo completa `migrarCatalogo` en los catálogos de antes).

Una sesión es `{ id, nombre, rutinaId, inicio, fin, pausas, esfuerzo, nota, origen, lote, ejercicios:
[{ inst, ejercicioId, sustituyeA, nota, descansoSeg, series: [{ id, tipo, kg, reps, seg, km, rir, hecha }] }],
actualizado }` (el borrador añade `descanso: { inicio, hasta, inst, avisado }`). Los ejercicios de la
biblioteca tienen **ids fijos** (`ex_…`, no se cambian nunca) y su nombre vive en `entreno-nombres.js`; los
propios (`exp_…`) llevan su `nombre` y no se traducen. Siempre se guarda en **kg y km**; libras y millas son
solo de pantalla.

**Reglas de guardado** (que un entreno no se pierda nunca):
1. Cada cambio del borrador va al instante a `localStorage` y, con 2,5 s de retraso y al ocultarse la app,
   a la nube. Al cargar, si hay borrador en los dos sitios gana el de `actualizado` mayor.
2. Al terminar, la sesión entra en la cola; se escribe en su mes (leer → fusionar por `id` → escribir) y,
   si va bien, se actualiza el índice, se borra el borrador y sale de la cola. Si falla, se reintenta al
   cargar la app y con el evento `online`.
3. Editar o borrar una sesión pasada reescribe su mes y **reconstruye el índice**; también se reconstruye
   si el nº de sesiones del mes actual no cuadra con `indice.meses`.
4. **Nunca `window.storage.list()`** (en Firestore lee la colección entera): los meses se conocen por el índice.

**Cálculos** (decisiones del plan, con sus casos): 1RM de Epley con r = repeticiones + RIR («fiable» hasta
12); volumen = kg × reps de las series hechas que no son de calentamiento (peso corporal del perfil en los
de peso corporal, lastre sumado, ayuda restada; 0 si falta el peso); series por músculo: el principal 1 y
cada secundario 0,5 (el cardio no cuenta); récords por tipo de ejercicio (`RECORDS_POR_TIPO`), que solo se
«baten» si había uno anterior; `validarSerie` avisa, sin bloquear, de errores de dedo (más de 2,5 × el
máximo histórico, más de 400 kg sin histórico, más de 100 repeticiones o 0, más de 4 horas).

**×2 y unilaterales** (27-oct-2026; «Mancuernas a pares y series unilaterales» en `entreno-calculo.js`):
- Los ejercicios con dos mancuernas a la vez llevan `pareja: true` (`CON_PAREJA` en `entreno-ejercicios.js`, y una
  casilla en los propios): se escribe y se guarda el peso de **una**, la cabecera dice «kg ×2» y volumen, 1RM y mejor
  serie lo cuentan doble; el peso máximo sigue siendo el de una (lo que compara `validarSerie`).
- Una serie unilateral (`lados: true`, `repsIzq`, `repsDer`) es una sola fila con dos casillas y cuenta como una
  serie; el volumen suma los dos lados y `reps` guarda siempre el lado más débil, que es el que usan el 1RM y los
  récords. Se activa en la hoja del tipo de serie; los unilaterales por naturaleza (`UNILATERALES`) tratan como
  divididas las series sin `lados`.
- Para que los cálculos lo sepan, `volumenSerie`, `mejoresDeEjercicioEnSesion`, `recordsEnVivo` y `seriesConRecord`
  aceptan el ejercicio entero en lugar del texto del tipo: **pásales el ejercicio** donde lo tengas. Cuando cambie
  cómo se calcula un récord, sube `CALCULO_INDICE` (`entreno-almacen.js`) y los índices guardados se reconstruyen
  una vez.

**Interfaz** (`ui/entreno/` y `ui/estado/entreno.js`):
- **`useEntreno(data)`** lleva todo: catálogo, índice, borrador, meses (se leen **bajo demanda** con
  `cargarMes`; `sesionesDeMes` junta los del mes con los que esperan en la cola), cola y las acciones, que
  envuelven las operaciones puras de `entreno-sesion.js`. Todo cambio del borrador pasa por
  `fijarBorrador` (sella `actualizado`, guarda en `localStorage` y programa la subida). Si la carga del
  catálogo o del índice falla (sin conexión al abrir), no se escribe encima hasta haberlos leído bien. No
  crea ningún documento hasta que se usa. `nube === "pendiente"` solo si una subida falló.
- **Pantallas** (destinos del área FitDraft en `ui/pantallas.jsx`): `entreno` (inicio.jsx: dos vistas, el
  gimnasio **Dibujo** y la **Lista** de siempre con empezar vacío o con una rutina, seguir uno a medias y
  últimos entrenos; ver «El gimnasio dibujado de FitDraft» más abajo), `entreno-rutinas` y `entreno-rutina`
  (`params: { id }`, editor), `entreno-ejercicios` (biblioteca), `entreno-historial` y `entreno-sesion`
  (`params: { id, inicio }`, detalle corregible). Los **ajustes de entreno** (unidades, interruptores,
  descansos, exportar CSV/JSON, recalcular el índice) no son un destino del área desde el 25-oct-2026: son
  una sección de Ajustes (`SeccionAjustesEntreno`, `ui/entreno/ajustes.jsx`), antes de cerrar sesión y
  eliminar la cuenta; el enlace de Entrenar abre Ajustes con `params: { seccion: "entreno" }`, que la
  desplaza hasta ella. `app.jsx` ignora una «última pantalla» recordada que ya no sea de su área.
- **El entreno en curso no es un destino**: es una capa a pantalla completa (`sesion.jsx`, z-index 45) que
  pinta `app.jsx` cuando `entreno.sesionVisible`; ˅ la minimiza y queda la **pastilla** (`pastilla.jsx`,
  z-index 31, encima de la barra o abajo del todo en la zona común). Mientras se ve: Wake Lock, cronómetro y
  descanso repintados cada segundo en piezas aparte (la tabla no), y la pantalla de debajo inmóvil.
- **La tabla** (`fila-serie.jsx`): columnas según `camposDeTipo`; cada campo guarda su propio texto mientras
  se escribe (coma decimal, unidades de pantalla) y manda el valor convertido en cada cambio; ✓ valida con
  `validarSerie` (aviso con «Corregir» / «Es correcto»), marca y arranca el descanso, **sin enfocar nada**
  (desde el 27-oct-2026: el foco abría el teclado del móvil). Solo está abierto el ejercicio que toca; si la
  siguiente serie (`siguienteSerie`) es de otro ejercicio, este se pliega y aquel se abre y se trae a la vista
  (en una superserie, ronda a ronda). Tocar la cabecera abre o cierra cualquiera a mano. El descanso (`descanso.jsx`) se calcula con `descanso.hasta` y avisa una vez con un
  pitido de Web Audio (el contexto se crea con el primer toque) y vibración donde exista.
- **Terminar** (`terminar.jsx`): resumen, esfuerzo 1-5, nota, fecha (solo cambia si se toca), récords
  batidos, «actualizar la rutina» si cambió su estructura (o el descanso de algún ejercicio), guardar,
  compartir (`documentoSesion` con `BotonCompartir`) y descartar con confirmación. Desde el 27-oct-2026 enseña
  también el mapa corporal con los músculos trabajados (`MapaSesion`, que sale igual en el detalle del historial).
- **«Anterior» equivalente** (G4, 25-oct-2026): en un entreno que viene de una rutina, la columna
  «anterior» y la precarga usan lo que se hizo en la **última sesión de esa misma rutina**
  (`anteriorEquivalente`, `entreno-calculo.js`; el mismo ejercicio dos veces, cada uno con el suyo por
  `ocurrencia`). Primera vez de la rutina, ejercicio que aquella vez no estaba o entreno sin rutina: la
  última vez a secas, como antes. Un índice guardado sin `rutinas` hace que `migrarIndice` pida
  `reconstruir` y el hook lo reconstruye una vez al cargar.
- **Descanso de cada ejercicio** (G3, 25-oct-2026): cada ejercicio de una rutina lleva su `descansoSeg`
  (un número; 0 = sin descanso). Entra con el de su ficha o el de los ajustes (`descansoInicial`) al
  añadirlo a una rutina o a un entreno empezado de cero, y se cambia con el botón del reloj de su tarjeta
  (`BotonDescanso` / `HojaDescanso`, en `descanso.jsx`), en el editor y durante el entreno
  (`descansoEjercicio`, solo para las series siguientes). Cambiar después el descanso por defecto ya no
  mueve las rutinas: `migrarCatalogo` convirtió los `null` antiguos («el de siempre») en el valor que
  tenían ese día. Tras una serie de calentamiento se sigue usando el de los ajustes.
- **Comodidad y progreso** (fase C): en el ⋮ de cada ejercicio de la sesión, sustituir solo hoy
  (`sustituyeA`, no cambia la rutina), subir/bajar, nota de hoy, ver ficha y quitar; ⏸ pausa el cronómetro
  (no el descanso). Al marcar una serie que bate un récord sale una línea discreta (`recordsEnVivo`), y en el
  historial una medalla junto a las series que **tienen hoy** un récord (`seriesConRecord`, a partir del
  índice: se recolocan solas al corregir). Ficha de cada ejercicio (`ficha.jsx`, destino
  `entreno-ejercicio`): Resumen · Historial · Progreso · Récords, con gráficas propias en SVG
  (`graficas.jsx`, reutilizables: `GraficaLineas`, `GraficaBarras`) y rangos 3 meses / 1 año / todo, todos
  gratis; lee todos los meses al abrirse (`useTodasLasSesiones`). El historial tiene calendario con puntos
  en los días entrenados. «Progreso» (`progreso.jsx`, quinta pestaña): series por músculo de esta semana
  frente a la media de las 4 anteriores, y entrenos y volumen de las últimas 12 semanas
  (`semanasRecientes`), sin «zona recomendada». Libras y millas: las conversiones están en
  `entreno-calculo.js` (con sus pruebas) y `comun.jsx` las reexporta. Desde el 26-oct-2026 Progreso sigue el
  criterio de gráficas (cada tarjeta es una pregunta; un solo selector de rango 1 mes · 3 meses · 1 año · Todo
  para entrenos y volumen por semana, con las piezas de `ui/cuerpo/graficas.jsx`; verde lo tuyo, la media del
  rango como referencia mostaza, lectura al tocar y botón «Gráfica»; el volumen pasó de oliva a verde). «¿Datos erróneos o que faltan?» de la
  ficha navega a `feedback` con `params: { categoria: "ejercicio", ejercicioId }`, y `FeedbackView` ofrece
  arriba el correo ya rellenado (nunca lo abre solo).
- **Importar de Hevy y Lyfta** (G10, 25-oct-2026; `ui/entreno/importar.jsx`, en Ajustes → Entrenamiento; desde el
  27-oct-2026 la interfaz no las nombra, habla de «otra app»):
  se elige el CSV exportado, se ve un resumen (entrenos nuevos, los que ya estaban, ejercicios reconocidos y
  los que se crearán como propios, con la opción de elegir uno de la biblioteca) y se importa por el mismo
  camino que un entreno terminado (por meses + `reconstruir`). Las sesiones llevan `origen:
  "importado:hevy|lyfta"` y un `lote`, que guarda `catalogo.importaciones` para **deshacer** la importación
  entera (los propios que creó se archivan). No duplica: mismo nombre y misma hora de inicio (±5 min). El
  emparejamiento usa la biblioteca que haya en cada momento con sus nombres en los cinco idiomas y los alias
  de `ALIAS_EJERCICIOS` (`entreno-nombres.js`): **al añadir un ejercicio a la biblioteca, añade sus alias**.
  RPE de Hevy → RIR = 10 − RPE; pesos de Lyfta en kg. Los CSV del usuario nunca se copian al repositorio: los
  casos de `validacion/` usan filas inventadas con el mismo formato.
- **Opcionales hechos**: calculadora de discos (`discos.jsx` y `discosPorLado`, desde el ⋮ de los ejercicios
  con barra; barra de 20 kg o 45 lb) y carpetas de rutinas (`rutina.carpeta`, texto opcional que solo agrupa
  la lista; sin migración, porque una rutina sin carpeta se ve como siempre). El mapa corporal ya está
  hecho (ver «Mapa corporal»).
- **Gimnasio** (G2, 25-oct-2026): campo opcional al terminar (`sesion.gimnasio`, texto libre, con las cadenas
  habituales en España de `GIMNASIOS_HABITUALES` como sugerencia) y gimnasio habitual en los ajustes
  (`ajustes.gimnasio`), que sale ya puesto. Si un mes tiene entrenos en más de uno, el historial ofrece fichas
  para ver solo los de un sitio. Sin ubicación (ver el registro de la noche para su viabilidad).
- **Superseries** (G11, 25-oct-2026): `superserie: id` en cada ejercicio de la rutina y de la sesión; los
  **seguidos** con el mismo id forman el grupo (2 o más), así que reordenar no deja restos (`gruposSuperserie`,
  `grupoDe`, `unirSuperserie`, `separarSuperserie` en `entreno-sesion.js`). Se crean en el editor de la
  rutina (entre tarjetas, «Superserie con el siguiente») y, desde el 27-oct-2026, con «Superserie con…» en el ⋮
  de cada ejercicio, de la sesión y del editor (`HojaSuperserieCon`, `ui/entreno/superserie.jsx`): se elige el
  otro, esté donde esté, y `superserieCon` lo coloca detrás del grupo; franja mostaza y «Superserie
  N». Al marcar una serie, el foco va por rondas (`ordenDeSeries`/`siguienteSerie`: A1 B1 A2 B2…). Cada
  ejercicio conserva su descanso, como sin superserie. Crear o deshacer una durante el entreno cuenta como
  cambio de la rutina; las importadas (G10) llegan con el mismo modelo.
- **Capas a pantalla completa y hojas inferiores** del módulo: `CapaCompleta` y `HojaInferior` en
  `ui/entreno/comun.jsx` (que también tiene los formatos: números y fechas con el idioma, con tablas propias
  de meses y días para cuando el navegador no trae gallego o euskera, unidades de pantalla y duraciones).

### El gimnasio dibujado de FitDraft

Bloque ENTRENO / FITDRAFT de la parte estética (26-oct-2026; decisiones en `local/ideas/esteticas/registro.md`,
«DECISIONES FINALES»; maquetas `v3-01` a `v3-03` de esa carpeta). Lo puro está en `logica/gimnasio.js` (grupo
«FitDraft: el gimnasio» de `validacion/`); el dibujo, en `ui/entreno/gimnasio-*.jsx`, con sus colores en
`gimnasio-tema.js` (nunca a mano). Todo es solo lectura: no cambia ningún dato de entreno, ni la cola ni el
borrador.

- **Vista Dibujo de Entrenar** (`gimnasio-vista.jsx`): la otra es **Lista**, la pantalla de siempre. La primera
  vez sale el dibujo y luego se recuerda la última (`localStorage` `fooddraft:vista-gimnasio`). El plano ocupa la
  pantalla entre la cabecera y abajo (fijo, z-index 5; la barra de cristal flota encima). Es una planta vista
  desde arriba con canto, de 600 × 1010 unidades: arriba siete zonas (las cinco de los avisos G8, esterillas y
  cardio) con **25 máquinas para los 80 ejercicios** (cada uno en una sola; los propios se dibujan en la de su
  músculo, `ESTACION_POR_MUSCULO`), abajo la oficina y la recepción. **Al añadir un ejercicio a la biblioteca,
  ponlo en una máquina**: un caso de `validacion/` cuenta que estén los 80.
- **Sistema híbrido** (v3-01 · D; `gimnasio.jsx`, `MapaGimnasio`): mapa con arrastre, pellizco, doble toque,
  rueda y + / −, donde el zoom es la jerarquía (de lejos, los rótulos de zona; de cerca, los nombres de las
  máquinas, solo de adorno); «Pasear» cambia a un joystick flotante (nace donde se pone el pulgar, zona muerta
  de 10 px, radio de 46 px) con «Usar · …» junto a cada máquina o sitio; «Ir a…» siempre (zonas y sitios). La
  cámara, el avatar y el joystick se mueven por refs, sin repintar el plano. Recepción: el torno es «Empezar»
  (todas las rutinas y el entreno vacío), la pizarra a tiza es Progreso, el libro es Historial; oficina: la
  estantería es Rutinas, el corcho es la semana (días con entreno y estado de las zonas) y el monitor está
  siempre sentado.
- **Botón fijo «Empezar · (rutina de hoy)»** encima de la barra, un toque: la rutina que hace más que no se
  hace según el índice (`rutinaDeHoy`; antes que ninguna, las que no se han hecho nunca); sin rutinas, un
  entreno vacío. No sale mientras hay un entreno a medias (su sitio es de la pastilla).
- **Al tocar una zona o una máquina** (`hoja-zona.jsx`, también al crear rutinas): una sola lista con todos los
  ejercicios de la zona (los de músculo principal en ella), con filtros por músculo; con máquina, primero su
  ejercicio principal y el resto de su músculo de cerca a lejos (`ejerciciosDeZona`). Sin nombres de máquina:
  el título es la zona y bajo cada ejercicio, «equipo · músculo». Sin «Añadir todos».
- **Zonas teñidas** (v3-03 · A; botón de capas, `fooddraft:capas-gimnasio`): verde con ✓ = entrenada esta
  semana; gris con telarañas = 14 días o más sin entrenar; nunca entrenada, sin tinte. Del índice y la cola,
  sin leer meses (`ultimaVezPorZona`, `estadoZonas`).
- **Monitor**: las 15 frases de la maqueta (`fitdraft.monitor.<situacion>.<n>`, cinco por situación: saludo,
  una zona olvidada 14 días, mucho tiempo sin venir = 14 días sin ninguna sesión), al azar, **como mucho una
  al día** (`fooddraft:monitor-gym`); tocarlo la repite. El grupo va siempre detrás de «de» o «sin»
  (`fitdraft.grupoFrase.*`) para no concordar nada. En el dibujo, el monitor y las zonas hacen de avisos; los
  de actividad y de grupos sin entrenar siguen en la Lista.
- **Puerta de cristal corredera**: solo la primera vez al día (`fooddraft:puerta-gym`), se salta tocando.
- **Crear la rutina** (`mapa-rutina.jsx`): en el editor, «Añadir ejercicio» abre el mapa; la rutina se dibuja
  como ruta con paradas numeradas en su orden (`paradasDeRutina`; dos seguidas en la misma máquina, una parada)
  y la primera iluminada. **Nunca «ordenar por cercanía»**. «Buscar» abre el selector de siempre (buscador y
  ejercicios propios). En mitad de un entreno, «añadir ejercicio» sigue con el selector sencillo.
- **Entre ejercicios** (v3-02 · V2, `mini-mapa.jsx`): al marcar la última serie de un ejercicio, un mini-mapa
  encima de la barra del descanso donde el avatar va a la máquina del siguiente pendiente de la sesión
  (`pasoEntreEjercicios`). Un toque lo salta; `ajustes.paseoDescanso` (Ajustes → FitDraft) lo apaga.
- **Avatar chibi** (`ui/comun/avatar.jsx`): mujer u hombre (solo cambia el pelo). `perfil.avatar`, elegido en
  el paso «Entrenamiento» del asistente de alta y cambiable en Ajustes (sección FitDraft); `migrateData` pone
  el del sexo del perfil a los de antes (sin sexo, el de hombre).
- **Reducir movimiento**: sin puerta, la cámara salta, el avatar aparece donde iba (también en el mini-mapa),
  la siguiente parada no palpita y el monitor no levanta el brazo.
- Textos: bloque `fitdraft.` al final de cada diccionario (nombres de zonas, máquinas y sitios, frases...).

## Área Cuerpo: resumen, informes cruzados, constructor, sueño, pasos y aviso de actividad

Desde el 26-oct-2026 (bloque CUERPO de `local/ideas/esteticas/registro.md`, «DECISIONES FINALES»; maquetas
`v3-04` a `v3-08` de esa carpeta) el área tiene informes cruzados nuevos, un constructor, sueño, pasos, la
báscula y el criterio de gráficas. Todo es **solo lectura**: nada cambia objetivos ni menús. Hambre y energía
están **descartadas** (no existen como variables).

- **Datos nuevos** (`useCuerpo`, `ui/estado/cuerpo.js`; lógica y migraciones en `logica/cuerpo-diario.js`, grupo
  «Cuerpo: sueño, pasos y favoritos» de `validacion/`; **no pasan por `migrateData`**):

  | Clave | Contenido |
  |---|---|
  | `rueda-de-platos:cuerpo-diario-v1` | `{ version, dias: { "AAAA-MM-DD": { sueno?: { horas, calidad }, pasos? } } }` |
  | `rueda-de-platos:informes-favoritos-v1` | `{ version, lista: [{ id, tipo: "pre" \| "cons", spec? }] }` (las estrellas, en la cuenta) |

  El sueño va con la fecha del día en que uno **se despierta** («anoche» = hoy), para cruzarlo con la comida y el
  entreno de ese día. Horas de 3 a 11 de cuarto en cuarto; calidad, cinco caras guardadas como 2, 4, 6, 8 y 10.
  Pasos: vacío = sin dato (no es 0). No se crea ningún documento hasta que se apunta algo.
- **La serie de cada día** (`construirSerie`, `logica/cuerpo-series.js`, grupo «Cuerpo: la serie de cada día y la
  estadística honesta»): peso (sin atípicos), kcal y macros **solo de los días con todas las comidas marcadas y sus
  macros** (como `cumplimientoMacrosMes`), % de comidas hechas, entrenos, volumen (t), esfuerzo, duración, 1RM
  estimado por ejercicio, series por músculo, récords (por la fecha del índice), sueño, pasos y la fase del ciclo
  (**solo si se pasa el período, que vive en el dispositivo**: `leerPeriodoLocal` de `ui/cuerpo/periodo.jsx`, con
  perfil de mujer). Un hueco es `null`, nunca un 0 inventado. Como mucho dos años hacia atrás. **Honestidad**: una
  relación es una «pista»; mínimo 14 días o 6 semanas con las dos cosas; |r| < 0,2 sin relación, 0,2-0,4 débil,
  0,4-0,6 pista, ≥ 0,6 clara; la interfaz siempre dice que no implica causa.
- **Informes cruzados** (`ui/cuerpo/informes.jsx`, destino `cuerpo-informes`, premium; `INFORMES` en `informes.js`,
  grupo «Cuerpo: informes predefinidos y constructor»): los **15** de la v3-04, tres por cruce (comida × entreno,
  peso × comida, peso × entreno, ciclo) y tres de más de dos cosas; los tres que usaban el hambre se cambiaron por
  «¿los días que comes más se nota al día siguiente en la báscula?», «¿comes distinto según la fase?» y «peso, kcal
  y sueño con las fases de fondo». Los del ciclo (cuatro) solo con perfil de mujer. Cada fila: pregunta, cifra,
  mini gráfica, botón «Gráfica» (hoja con rango, lectura al tocar, frase y de qué datos sale) y estrella. Panel de
  **favoritos** arriba. Cada informe devuelve solo números y qué dibujar; las frases están en `textosInforme`. Las
  cuatro tarjetas del mes de antes ya no se ven (`informeCruzadoMes` sigue, con sus casos).
- **Constructor** (`ui/cuerpo/constructor.jsx`, destino `cuerpo-constructor`, cuelga de la pestaña Informes,
  premium; `params.spec` abre un favorito): la interfaz C de la v3-05, **frase con huecos**. 25 preguntas por temas
  (peso, comida, entreno, sueño, ciclo) que son cinco formas (`FORMAS`: tiempo, relación, categoría, tabla, juntas)
  con los huecos ya puestos, más la **pregunta libre** de 3 o 4 variables; con 3 o más, las cinco vistas (apiladas,
  juntas, tabla, color, tiras). Cada hueco enseña su texto en la frase («el sueño») con el `select` nativo invisible
  encima. Las variables con parámetro: `rm:<ejercicioId>` y `series:<músculo>`.
- **Gráficas del área** (`ui/cuerpo/graficas.jsx`): el **criterio de gráficas** (`09-graficas.html`): verde = lo
  tuyo, mostaza = referencia, óxido = fuera de rango, gris = sin dato; varias variables, en verde, naranja, ciruela
  y café; tocar escribe el valor en una línea fija (`Lectura`); botón verde «Gráfica»; un solo selector de rango
  (1 mes · 3 meses · 1 año · Todo). También `useSerieCuerpo` y los nombres de las variables.
- **Sueño** (`ui/cuerpo/sueno.jsx`, destino `cuerpo-sueno`, en el menú lateral y, desde el 27-oct-2026, también
  como pestaña de la barra; con Período, Resúmenes sale de la barra para que quepan, `ocultaConPeriodo`; gratis): la
  opción C de la v3-06: deslizador y cinco caras, apuntar «anoche» de un toque (sale lo de la última vez), «Últimas 7
  noches» (tocar una barra corrige esa noche), «Últimos 30 días» con la raya de 7 h (mínimo recomendado para
  adultos: AASM/SRS, Watson et al., 2015) y enlace al constructor.
- **Pasos** (`ui/cuerpo/pasos.jsx`, al final de Actividad diaria, gratis): la opción A de la v3-06 sin interruptor:
  campo con −1000 / +1000 y barras de la semana. Solo para los informes; no cambian el gasto.
- **Báscula** (`ui/peso/bascula.jsx`, en el registro de peso): la opción A de la v3-08 (cinta bajo la línea roja,
  lupa donde se escribe, pies que se suben) con la ventana algo menos de un tercio más estrecha. Sin nada escrito,
  la cinta descansa en el peso del perfil (no en el del día: el ciclo abierto no enseña cifras). Con «reducir
  movimiento», sin animaciones.

- **Resúmenes** (`ui/peso/resumen-mensual.jsx`, gratis; pestaña «Resúmenes»; con el criterio de gráficas desde el
  26-oct: botón «Gráfica» en Nutrición y Peso, la grasa en oliva y las series por músculo en el mapa corporal): un
  mes cualquiera con un
  selector **Nutrición / Entreno** (B2, 25-oct-2026; el lado elegido se recuerda en `localStorage`,
  `fooddraft:resumen-lado`). Nutrición: comidas hechas y objetivo, **cumplimiento de macros**
  (`cumplimientoMacrosMes`, `logica/resumen-mensual.js`: de los días con todas las comidas marcadas y sus
  macros guardadas —desde B1+B3—, en cuántos se llegó al 90 % del objetivo de proteína, carbohidratos y grasa)
  y Peso (premium, porque sale del seguimiento de peso). Entreno (`resumenEntrenoMes`): entrenos, días,
  volumen, tiempo, récords del mes, músculos más trabajados, comparación con el mes anterior y las series por
  músculo del mes.
- **Informes cruzados de antes** (fase K2, ya no se enseñan; `informeCruzadoMes` en
  `informes.js`, grupo «Informes cruzados» de `validacion/`): entreno y peso, constancia en la comida en días
  con y sin entreno (solo lo marcado como hecho: la app no sabe qué plato se comió), declarado frente a
  registrado (sesiones por semana y kcal de entrenamiento al día, con la misma fórmula MET del objetivo) y
  mes frente a mes. Cada tarjeta, con su gráfica y una frase prudente; **solo lectura**: nunca cambian los
  objetivos (alimentar el gasto con lo registrado tocaría `calcularObjetivosPerfil` y necesitaría antes su
  estudio en los PDFs explicativos).
- **Aviso de actividad** (`ui/entreno/aviso-actividad.jsx`, en Entrenar y arriba de Actividad diaria; regla
  en `evaluarAvisoActividad`, grupo «Aviso de actividad»): mira las 3 últimas semanas completas; «menos» si en
  todas se registra menos de la mitad de lo declarado, «más» si en todas al menos 1,5 veces y 2 sesiones
  más. No avisa con menos de 4 sesiones registradas en total, en semanas de pausa, si está silenciado (28
  días) o si se cerró hace menos de 14 días. El estado vive en `catalogo.aviso` (`pausa`, `silenciadoHasta`,
  `descartadoEl`). Sin push.
- **Período** (I1, 25-oct-2026; `ui/cuerpo/periodo.jsx`, destino `cuerpo-periodo`, gratis): quinta pestaña de
  Cuerpo, **solo si el perfil tiene sexo femenino** (`soloMujer` en `navegacion.js`; la barra y el menú lateral
  filtran con `visibleCon(item, perfil)`). Calendario del mes para marcar días de regla y de relaciones, y
  siguiente inicio previsto = último inicio + distancia entre los dos últimos (28 días con uno solo), sin más
  cálculo (`logica/periodo.js`). **Los datos solo viven en el dispositivo** (`localStorage`,
  `fooddraft:periodo-v1:<uid>`, con el `window.cuentaId` que pone `auth-bootstrap.jsx` para que otra cuenta del
  mismo móvil no los vea); nunca en la nube. Aviso de que no es un método anticonceptivo.
- **Grupos sin entrenar** (G8, 25-oct-2026; `ui/entreno/aviso-grupos.jsx`, solo en Entrenar; regla en
  `gruposSinEntrenar`, grupo «Aviso de actividad» de `validacion/`): pecho, espalda, pierna, hombros y brazos
  (`GRUPO_DE_MUSCULO`; cuenta solo el músculo principal; abdomen y cardio, ninguno). Sale un grupo que se
  entrenaba y lleva 21 días o más sin hacerse, sacando la última vez del índice (y de la cola), sin leer
  meses. No avisa si no se ha entrenado nada en esas 3 semanas ni con una pausa en ellas. La ✕ guarda en
  `catalogo.aviso.grupos[grupo]` el día y ese grupo no vuelve en 14 días. Tarjeta provisional: la
  ilustración es de la parte estética.

## Mapa corporal

El mapa corporal (26-oct-2026; `v3-07-mapa-corporal.html`, camino 1) es la familia «reparto por músculo» del
criterio de gráficas: sustituye a las barras por músculo. Se usa en **Progreso** (grande, series de la semana; al
tocar, también la media de las 4 anteriores), en la **ficha del ejercicio** (principal y secundarios), en la **lista
de rutinas** (pequeño, series previstas) y en las series por músculo del **resumen mensual**.

- **Trazados**: `ui/comun/mapa-trazados.js`, de **react-native-body-highlighter 3.2.0, licencia MIT, Copyright (c)
  2022 ELABBASSI Hicham**, con el aviso MIT entero arriba (texto A aprobado por el usuario el 26-oct). Hombre y
  mujer, frente y espalda, con contorno. **No quites el aviso**; va de la mano de la sección «Licencias de terceros»
  de Ajustes (`ui/ajustes/licencias.jsx`, texto B, con la licencia entera en inglés y las librerías que carga la
  app, con su licencia comprobada), del párrafo de terceros del `LICENSE` (texto C) y de la frase de
  `terminos.propiedadTexto` en los cinco idiomas (texto D). Hay una duda abierta del autor (issue #102 de su
  repositorio); si hubiera una reclamación, el plan B es el redibujado propio (camino 2 de la v3-07), sin construir.
- **Lógica** (`logica/mapa-corporal.js`, grupo «Cuerpo: mapa corporal»): `SLUG_A_GRUPO` lleva cada trazo a uno de
  los 14 grupos de la biblioteca (oblicuos y abdominales → abdomen; «upper-back» → dorsales; trapecio → espalda
  alta); escala de cinco verdes (0 · 1-3 · 4-6 · 7-9 · 10+); hombre o mujer según el sexo del perfil (sin sexo,
  hombre; `entreno.perfil` lo lleva a las pantallas de entreno).
- **Componente** (`ui/comun/mapa-corporal.jsx`, `MapaCorporal`): grande (con rótulos, leyenda y la línea fija de
  lectura al tocar) o pequeño (64 px, sin interacción, lectura en su `aria-label`).

## Internacionalización

La interfaz existe en 5 idiomas: español (por defecto), inglés, catalán, gallego y euskera.
`logica/i18n.js` es un diccionario propio (no una API de traducción en vivo, para que siga
funcionando sin conexión); se usa con `t(idioma, "clave", { variables })`. Si una clave falta en un
idioma, cae a español; si falta también ahí, devuelve la propia clave — así un texto sin registrar
se nota enseguida en pantalla en vez de romper nada.

- **Texto de interfaz nuevo** = clave nueva en los **cinco** diccionarios, no solo en español. Nunca
  escribas texto de interfaz suelto en el JSX.
- **Lo que no se traduce nunca**: los datos del usuario (nombres de sus platos, notas) y los
  identificadores del modelo de datos (`mealType` como "Comida", `DAYS`, los nombres de ingrediente
  con los que enlazan las reglas de afinidad). Se muestran traducidos con `t()` (p. ej.
  `t(idioma, "mealType." + m.mealType)`) pero se guardan siempre en español, porque el motor los
  compara por nombre.
- El idioma vive en `perfil.idioma`; antes de haber perfil (bienvenida, login) se recuerda en
  `localStorage`. `privacidad.html` y `terminos.html` leen el mismo diccionario.
- Los mensajes de las Cloud Functions (errores de cuota, texto del push) están en español o tienen
  su propia tabla mínima dentro de la función — no dependen de `i18n.js`.

## Backend: `functions/`

Cloud Functions de Firebase (2ª generación, Node 22), la única pieza de servidor del proyecto.
Cada función vive en su archivo y `functions/index.js` solo las reexporta:

| Función | Tipo | Qué hace |
|---|---|---|
| `stripeWebhook` | HTTP (lo llama Stripe) | Única pieza que escribe `users/{uid}.premium`; verifica la firma de Stripe |
| `createCheckoutSession` / `createPortalSession` | callable | Devuelven la URL de pago o de gestión de la suscripción |
| `analyzeFoodPhoto` / `suggestRecipes` | callable | Gemini con premium + cuota (ver "Servicios de IA") |
| `suggestMeals` | callable | La versión anterior de «¿Qué cocino?» (combinaciones del catálogo); se conserva para las copias de la app sin actualizar |
| `sendWeighInReminders` | programada, 09:00 Europe/Madrid | Push diario de recordatorio de pesaje (no a quien lo tenga desactivado) |
| `sendDefrostReminders` | programada, 21:30 Europe/Madrid | Push nocturno «revisa las comidas de mañana por si tienes que descongelar algo o comprar» a quien tenga `perfil.avisoDescongelar` (C8, gratis; no lee el menú) |

Puntos que hay que saber antes de tocarlas:

- **Premium**: 2,99 €/mes con Stripe, gestionado en la web (no con Google Play Billing). El campo
  `users/{uid}.premium` es de solo lectura para el cliente (por las reglas de Firestore) y solo lo
  escribe el webhook; la app se entera en vivo con `window.subscribePremiumStatus` (`onSnapshot`).
  Convenio obligatorio al crear un Checkout: `client_reference_id: uid` y
  `subscription_data.metadata.firebaseUID: uid` — sin eso el webhook no sabe de qué usuario es el
  evento y lo descarta. Gratis: generador de menús, objetivos, catálogo, Menú simple, lista de la
  compra, despensa, todo el módulo de entreno (sin límites: rutinas, ejercicios propios, historial,
  gráficas, récords, exportar) y el resumen mensual (nutrición y entreno). Premium: seguimiento de peso
  (y con él el apartado de peso del resumen), las funciones de Gemini y los **informes cruzados** del
  área Cuerpo. Desde octubre de 2026 el resumen ampliado dejó de ser premium (decisión del 23-oct).
- **Secretos** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`): viven en Firebase,
  nunca en el repo. Las funciones callable exigen App Check (`enforceAppCheck: true`); el webhook no,
  porque quien llama es Stripe, no la app.
- **Coste**: `setGlobalOptions({ maxInstances: 10 })` en `index.js` pone un techo duro por función.
- **Código duplicado a mano**: `sendWeighInReminders.js` repite `esDiaSugeridoPeso`, `fechaISO` y la
  tabla de días sugeridos de `logica/peso.js`, porque `peso.js` es un módulo ESM de navegador (usa
  nombres cortos del `importmap`) y esta carpeta es Node CommonJS, sin build que las una. **Si
  cambias la regla de días sugeridos en `peso.js`, cámbiala también ahí.** Esa función también
  descubre a quién avisar leyendo `users/{uid}/keys/rueda-de-platos:push-token-v1` con una
  `collectionGroup` sobre `keys` y filtrando en memoria — barato hoy, pero habría que mantener un
  índice propio si el proyecto llega a tener muchos usuarios.
- **Notificaciones push**: el cliente pide permiso y guarda el token con `window.requestPushPermission`
  (`auth-bootstrap.jsx`); `sw.js` muestra la notificación con la app cerrada (`onBackgroundMessage`, con la
  etiqueta que mande la función en `data.tag`). Hay dos avisos que comparten permiso y token, cada uno con su
  interruptor en Ajustes: el recordatorio de pesaje (`perfil.notificacionesPush`) y el aviso para descongelar
  (`perfil.avisoDescongelar`, C8); el token solo se borra cuando los dos están desactivados.
  En iPhone/Safari solo llegan si la PWA está instalada de verdad — no se puede evitar con código.
- **Despliegue de las funciones**: manual, `firebase deploy --only functions` (a diferencia de la
  app, que se despliega sola — ver la sección siguiente). `functions/node_modules` no se versiona.

## Despliegue

La app se sirve desde **GitHub Pages** (`https://pablodiazblanco.github.io/Rueda-de-platos/`), sin
ningún paso de build ni de despliegue manual: un push a `main` llega a la app real que se usa a
diario en cuestión de minutos. No hay `.github/` ni CI, y `firebase.json` solo configura `functions`
(no hay Firebase Hosting). Consecuencia práctica: **un error de sintaxis o de import en un push
llega directo a producción**, así que no subas nada sin haber pasado antes por `validacion/` y
haber mirado la consola (ver "Cómo verificar un cambio").

## Idioma y estilo

Todo el código (identificadores de dominio, comentarios, texto de interfaz) está en español,
salvo las palabras clave del propio lenguaje. Los comentarios explican el *porqué* (una decisión
de diseño, una referencia científica, un caso límite) con bastante más detalle del que sería
habitual en otro proyecto — es intencionado, este código va de la mano de los PDFs explicativos
(`local/divulgacion/`) y
se espera que se entienda sin tener que releerlos. Mantén ese tono al añadir código nuevo, no lo
recortes a comentarios mínimos por costumbre.

Los estilos de la interfaz se escriben en línea (`style={{...}}`), con los colores como variables
CSS de tema (definidas en `Shell`, `ui/marco/cabecera.jsx`) y las tipografías como constantes de
`ui/estilos.js` (`FUENTE_TEXTO`, `FUENTE_TITULOS`, `FUENTE_MONO`): no escribas el nombre de la
fuente a mano en un componente nuevo.

## Servicios de IA (Gemini)

Hay dos funciones de la app que salen a un servicio de IA (tres Cloud Functions, contando la versión
anterior de «¿Qué cocino?»); el resto de la app es cálculo puramente local. Todas son Cloud Functions "callable" (ver la sección "Backend: `functions/`" más abajo), no llamadas
directas desde el navegador — hasta septiembre de 2026 el lector de etiquetas sí salía directo del
cliente (Firebase AI Logic), pero un límite comprobado solo en el navegador no protege nada cuando
hay varios usuarios y la IA cuesta dinero, así que se movió al servidor:

- **Lector de etiquetas por foto** (`functions/analyzeFoodPhoto.js`, expuesta al cliente como
  `window.analyzeFoodPhoto` en `auth-bootstrap.jsx`): lee una tabla nutricional de una foto.
  Premium, 20 al mes.
- **«¿Qué cocino?»** (`functions/suggestRecipes.js`, `window.suggestRecipes`; pantalla
  `ui/premium/que-cocino.jsx`): desde octubre de 2026 (E2) devuelve **recetas con ingredientes y pasos, sin
  macros**, en dos modos que **comparten la cuota** (premium, 10 al mes, contador `usoCocinar`):
  - **Con lo que tengo**: solo con lo que hay en casa (más sal, aceite y especias), eligiendo con sentido
    gastronómico una combinación coherente en vez de mezclarlo todo.
  - **Tipo restaurante**: parte de lo que hay y sugiere comprar una a tres cosas más elaboradas (una especia,
    una salsa, un queso...); lo que hay que comprar llega marcado (`comprar`).

  Puede mandar, si el usuario lo deja marcado, **la despensa entera** (`resumenDespensaParaIA` en
  `logica/despensa.js`: solo nombre del alimento y cantidad aproximada, nada más), además de la foto y del
  texto. Las recetas pueden llevar ingredientes que no están en el catálogo (lo que hay que comprar, los
  básicos); cuando uno sí es del catálogo o de la despensa trae su `foodId` (el servidor descarta cualquiera
  que no estuviera en lo enviado) y gramos aproximados, y solo con esos se ofrece «Guardar como plato
  cerrado»: las macros, si se guarda, las calcula la app con `composedMacros`, nunca vienen de la IA.
  `functions/suggestMeals.js` (la versión anterior: combinaciones solo con alimentos del catálogo, misma
  cuota) se conserva para las copias de la app que aún no se hayan actualizado; el cliente ya no la llama.

  **Mientras piensa** (parte estética, 26-oct-2026; `PensandoCocina`, `ui/premium/cocinando.jsx`): debajo del
  formulario, la cámara entra desde la cocina entera hasta la vitro (1 s) y se queda en la encimera vista en
  primera persona, con un muñón que corta un tomate a rodajas y otro que saltea un filete, en bucle hasta la
  respuesta; frases que cambian (`queCocino.pensando.*`) y, pasados 8 s, «está tardando un poco más». Espera
  mínima de 1 s de viaje + 1,5 s (`esperaMinimaPensando`) para que no parpadee, también si hay error. Con «reducir
  movimiento», la escena de cerca quieta desde el principio (sin viaje), con la misma espera mínima de 1,5 s.
  Dibujos propios (no reutiliza los de `ui/despensa/`), con los colores de su tema.

Las tres usan `@google/genai` con la clave `GEMINI_API_KEY` guardada como secreto de Firebase (no
está en el repo). **El nombre del modelo (`gemini-3.1-flash-lite`) está hardcodeado en los tres
archivos** — si Google lo retira, hay que cambiarlo en todos. La cuota mensual se reserva en una
transacción de Firestore *antes* de llamar a Gemini y se devuelve si la llamada falla. **Al cambiar lo que
recibe una función, despliégala antes de subir la app** (`firebase deploy --only functions`): si el cliente
nuevo llega a producción sin su función, la pantalla da error al usarla.

## Cómo verificar un cambio antes de darlo por bueno

Nunca abras `index.html` ni `validacion/index.html` con `file://` — los `fetch` e imports
relativos no resuelven igual y algunas cosas fallan en silencio o de forma distinta a producción.

1. Sirve el repo por `http://localhost` con el servidor estático ya configurado en
   `.claude/launch.json` (Python `http.server`, puerto 8420 — usa `preview_start` con `name: "static"`).
2. Abre `http://localhost:8420/validacion/index.html` y comprueba que el contador de arriba dice
   "X / X casos superados" (todos en verde, ninguno por debajo del total). Esa página carga la
   interfaz con el mismo `cargador-ui.js` que la app (`app.jsx` y todo `ui/`), nunca una copia — si
   pasa ahí, el código real funciona. Incluye el grupo "Carga de la interfaz", que comprueba que
   `ui/archivos.json` coincide con lo que se carga de verdad. Los valores "esperado" de cada caso se verifican a mano antes de
   guardarlos como referencia (lee la cabecera de `validacion/tests.js`) — no los cambies para
   que un caso pase, cambia el código.
3. Revisa la consola del navegador por si hay errores de import silenciosos. Ojo con dos trampas
   ya vividas: (a) la caché HTTP y la del service worker pueden servir archivos viejos — antes de
   concluir nada, quita el registro del service worker, vacía sus cachés y pide los archivos con
   `cache: "reload"` desde una página que no controle; (b) Windows no distingue mayúsculas en las
   rutas pero GitHub Pages sí: una ruta `Logica/` que funciona en local da 404 en producción.
4. Si el cambio toca algo que `validacion/` no cubre (por ejemplo `generateMenu`, que es
   aleatorio y no tiene casos con valores fijos), haz una comprobación aparte: desde la consola de
   `validacion/index.html` (que ya tiene el importmap) importa el módulo de `logica/` con
   `await import("menu-generador")` y llama a la función con datos sintéticos; para la interfaz,
   `await (await import("cargador-ui")).cargarApp({ base: "../" })`. O pide confirmación manual
   en la app real autenticada.
5. Añade casos nuevos a `validacion/tests.js` cuando el cambio introduzca lógica de cálculo nueva
   que hoy no esté cubierta.

## Firestore

Reglas revisadas (agosto 2026): un único documento por clave en `users/{uid}/keys/{key}`
(`value` = JSON serializado, como `localStorage` pero en la nube), protegido con
`request.auth != null && request.auth.uid == userId`. App Check aplicado (no solo monitorizando)
para Firestore y Authentication. No hay `firestore.rules` en el repo — las reglas viven solo en la
consola de Firebase del proyecto `rueda-de-platos`.

Aparte de esa subcolección `keys`, el documento padre `users/{uid}` guarda el estado premium
(`premium`) y los contadores de cuota mensual (`usoFotos`, `usoCocinar`). Es de **solo lectura para
el cliente**: únicamente las Cloud Functions, con el Admin SDK, escriben ahí — es la base de todo el
sistema premium (ver "Backend: `functions/`"). El único dato de "keys" que la app no escribe con el
formato habitual es `rueda-de-platos:push-token-v1`, que guarda el token de notificaciones en
`value` como texto plano, no como JSON.

## Higiene de commits

Un commit de código no lleva contenido (documentación, imágenes) y viceversa. Si un cambio
toca ambas cosas, son dos commits separados. (Desde octubre de 2026 casi todo el contenido vive en
`local/` y no se versiona, pero la regla sigue valiendo para `README.md`, `CLAUDE.md` e iconos.)

## Carpeta `local/`: contenido que nunca se sube

El repositorio es **público**, y GitHub Pages publica cualquier archivo versionado (no solo la app:
también se podían descargar los papers y este mismo archivo). Por eso, desde octubre de 2026, todo
lo que no es código de la app vive en `local/`, que está entero en `.gitignore`. Existe solo en la
copia del usuario (dentro de OneDrive, que hace de copia de seguridad), nunca en GitHub.

Convención de nombres dentro de `local/` (y para carpetas nuevas en general): español, minúsculas,
guiones, sin espacios ni tildes.

| Carpeta | Contenido |
|---|---|
| `local/divulgacion/` | PDFs explicativos (Documentación, Fundamentos nutricionales, Evidencia científica, Idea general, Valores nutricionales, Frecuencias y probabilidades) y `mockups/`. Fuente de verdad sobre el porqué de cada fórmula. Más adelante se publicarán dentro de la propia app (pantalla «Documentos»), pero no en el repositorio |
| `local/referencias/` | Papers académicos originales (con DOI) que respaldan esos PDFs, por tema (`g-kg-proteina/`, `g-kg-carbohidrato/`, `split-de-comidas/`...). Son la fuente primaria, no redundantes con los PDFs. Si algún día se añade contenido claramente no académico (volcados de páginas web con trackers, etc.), se elimina |
| `local/investigacion/` | Investigaciones a fondo que respaldan una decisión de cálculo concreta, una carpeta por tema con `informe.md` y `notas/` (hoy: `carbohidrato-minimo-deficit/`). Los PDFs de Evidencia científica y de Fundamentos remiten a ese informe |
| `local/ideas/` | `ideas-futuras.md` (ideas agrupadas por letras A-G, sin diseñar ni priorizar; al retomar una, relee su sección entera) e `investigacion-entrenamiento.md` (estudio previo de la idea de gimnasio) |
| `local/archivo/` | Material ya cerrado: `ideas-originales.docx` (del que salió el rediseño de navegación de septiembre de 2026) y `traducciones/` (revisión de la Fase 5; la fuente real de las traducciones es `logica/i18n.js`) |

Lo que **sí** está en el repositorio y no es la app: `functions/` (backend), `validacion/`
(herramienta de mantenimiento, no se enlaza desde `index.html` ni se registra en el service worker),
`README.md` y este archivo.

**Historial**: hasta octubre de 2026 los papers, PDFs, traducciones e ideas estuvieron versionados, y
siguen en el historial de git (y por tanto se pueden recuperar desde commits antiguos del repositorio
público). Se decidió no reescribir el historial por ahora; si se retoma, es una operación destructiva
(reescritura + push forzado) que solo se hace con permiso explícito.

## Qué no hacer

- No añadir un bundler, `package.json` ni dependencias npm permanentes **a la app** (`functions/`
  tiene el suyo, y es un proyecto aparte).
- No añadir librerías externas fuera de lo ya declarado en el `importmap` (React, Firebase,
  lucide-react, vía esm.sh/CDN).
- No volver a acumular pantallas o componentes en `app.jsx`: cada pantalla va en su archivo de
  `ui/` (y en `ui/archivos.json`), el estado en un hook de `ui/estado/` y la lógica sin React en
  `logica/`. Y nada de `logica/` importa de `ui/` ni de `app.jsx`.
- No hacer commit de nada sin que se pida explícitamente.
- No sacar nada de `local/` al repositorio ni quitar `local/` del `.gitignore`: el repositorio es
  público y GitHub Pages lo publicaría todo.
- No cambiar la licencia (`LICENSE`: todos los derechos reservados) sin actualizar a la vez la sección
  «Propiedad intelectual» de los términos de uso (`terminos.propiedadTexto` en los cinco idiomas de
  `logica/i18n.js`), y viceversa. Son dos mitades del mismo compromiso.
- No dar un cambio en la lógica por terminado sin pasar por `validacion/` primero.
