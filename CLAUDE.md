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
                          despensa.js (useDespensa), entreno.js (useEntreno)
  comun/                piezas reutilizadas: modal, tarjetas, idioma, categorias (iconos/colores)
  marco/                Shell (variables de tema y estilos de impresión), cabecera, menú lateral,
                          navegacion.js (áreas, pestañas y menú) y barra-inferior.jsx (barra de cristal)
  menu/ catalogo/ perfil/ onboarding/ peso/ premium/ ajustes/ despensa/ entreno/ cuerpo/   una carpeta por área

logica/comun.js               → uid(), DAYS — utilidades mínimas compartidas
logica/macros.js               → getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt
logica/seleccion.js            → sorteo ponderado + reglas de combinación (weightedPick, pickWithRules...)
logica/comida-calculo.js       → mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra
logica/objetivos.js            → PAL/TDEE/macros objetivo, calcularObjetivosPerfil, objetivosPorComida,
                                  presets de reparto de comidas (PRESETS_COMIDAS)
logica/menu-generador.js       → generateMenu, lastPicksFromHistory (el motor de generación completo)
logica/peso.js                 → seguimiento de peso: tendencia, cambios atípicos, ciclos
logica/salud-publica.js        → resumenNutrientesSemana: sal/azúcares/fibra contra umbrales de la OMS
logica/resumen-mensual.js      → calcularResumenMensual, pesoEnMes (comidas completadas + peso del mes)
logica/i18n.js                 → diccionario de textos por idioma (ES/EN/CA/GL/EU) y la función t()
logica/datos-iniciales.js      → FOODS_SEED, CATEGORIAS_ALIMENTOS, initialData (cuenta nueva)
logica/cuestionario.js         → opciones del cuestionario de alta y construirIngredientesDesdeCuestionario
logica/migraciones.js          → migrateData
logica/despensa.js             → stock de la despensa: zonas, menú confirmado, descontar/devolver comidas,
                                  tachar/destachar compras, queda poco (alertasStock), limpieza,
                                  fecha de cambio (sellarCambios), migrarDespensa
logica/lista-compra-neta.js    → necesidadesComida, calcularListaNeta (lista de la compra menos lo que hay)
logica/nevera.js               → colocación de la nevera dibujada: huecoDe, formaDe, esBebida, repartirEnHuecos
logica/entreno-ejercicios.js   → tipos de ejercicio y de serie, músculos, equipos, biblioteca semilla (80),
                                  listaEjercicios, ejercicioPorId, buscarEjercicios, posibleDuplicado
logica/entreno-nombres.js      → nombres de los 80 ejercicios en ES/EN/CA/GL/EU y nombreEjercicio
logica/entreno-calculo.js      → 1RM (Epley), volumen, duración con pausas, récords, «anterior», series
                                  por músculo, validarSerie, semanas
logica/entreno-sesion.js       → operaciones puras de la sesión en curso (series, descanso, sustituir hoy,
                                  pausa, terminar) y de rutinas (aplicarARutina, rutinaDesdeSesion)
logica/entreno-almacen.js      → claves, migraciones, meses, índice, borrador, cola de envíos y CSV
logica/informes.js             → informes cruzados del área Cuerpo (informeCruzadoMes, declaradoPorSemana)
                                  y aviso de actividad (sesionesPorSemana, evaluarAvisoActividad)
```

Todos los módulos de `logica/` son **sin JSX, sin React**, y solo se importan entre sí, nunca nada
de `ui/` ni de `app.jsx`. Los cruces que existen hoy: `peso.js` → `i18n.js` (mensaje de
`evaluarTendencia` y meses de `formatFechaCorta`), `datos-iniciales.js` → `peso.js`,
`cuestionario.js` → `comun.js` y `datos-iniciales.js`, `migraciones.js` → `datos-iniciales.js`,
`objetivos.js`, `peso.js` e `i18n.js`, `despensa.js` → `comun.js` y `datos-iniciales.js`, y `lista-compra-neta.js` →
`macros.js`, `comida-calculo.js` y `despensa.js` (`nevera.js` no importa nada). Del entreno:
`entreno-sesion.js` → `comun.js`, `entreno-almacen.js` → `entreno-calculo.js` e `informes.js` →
`entreno-calculo.js`, `resumen-mensual.js` y `objetivos.js` (solo lee de él); `entreno-ejercicios.js`,
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
(nutrición), **Entrenamiento** y **Cuerpo** (peso, medidas, actividad diaria, resúmenes) — y una zona
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
  `--cristal` al 72 % con desenfoque; fondo sólido sin `backdrop-filter` o con «reducir transparencia»),
  solo en las pantallas de un área. Solo la pestaña activa enseña su nombre (las demás, como
  `aria-label` y `title`); tocar una pestaña lleva a su raíz. Se esconde mientras hay un campo de texto
  con el foco (el teclado del móvil la subiría encima), y `<main>` deja libre abajo lo que ocupa
  (`RELLENO_BARRA`). Las variables del cristal están en `Shell`.
- **Cabecera**: el título grande dice el área («Tu recetario», «Tu entreno», «Tu cuerpo»; «Tu cuenta» en
  la zona común); el rótulo pequeño sigue siendo «FoodDraft».
- **Capas (`z-index`)**: barra inferior 30 · pastilla de entreno en curso 31 · menú lateral 40/41 ·
  sesión de entreno y paneles de la nevera 45 · modales 50 · botón «Cerrar sesión» de
  `auth-bootstrap.jsx` 9999, arriba a la derecha: cualquier barra superior a pantalla completa deja
  libres ~110 px a la derecha (como `MarcoPanel`).

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
  ya no cuenta como pendiente, así que nada se cuenta dos veces.
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
  desborda, todo aparece ya en el suelo, y al recogerlo vuelve de golpe).
- Todo se coloca en unidades del dibujo de la cocina (`ESCENA_ANCHO` × `ESCENA_ALTO`) sobre un
  contenedor con esa misma proporción, así que la escena se escala entera con el ancho de la pantalla.
- El panel deja libre la esquina de arriba a la derecha, donde flota el botón de cerrar sesión que añade
  `auth-bootstrap.jsx` fuera de React.
- La vista elegida (Dibujo o Lista) se recuerda en `localStorage` (`fooddraft:vista-despensa`), como
  comodidad del dispositivo, no como dato de la cuenta.

## Entrenamiento

Módulo de entreno al estilo Hevy/Lyfta con la estética de FoodDraft (octubre de 2026), en el área
Entrenamiento. Diseño y porqué: `local/ideas/gimnasio/03-diseno-modulo-entreno.md`; plan de construcción
y decisiones cerradas: `04-plan-de-ejecucion.md` (§3 y §4.3). Toda la lógica está en los cinco módulos
`logica/entreno-*.js`, con sus casos en `validacion/` (grupos «Entreno: …»).

**Modelo de datos** (claves nuevas, cada una con su `version` y su migración en `entreno-almacen.js`; como la
despensa, **no pasan por `migrateData`**):

| Clave | Contenido |
|---|---|
| `rueda-de-platos:entreno-catalogo-v1` | ejercicios propios, personalización de los de fábrica (favorito, nota fija, descanso), rutinas, ajustes, estado del aviso de actividad |
| `rueda-de-platos:entreno-AAAA-MM-v1` | las sesiones **terminadas** de ese mes |
| `rueda-de-platos:entreno-indice-v1` | caché reconstruible: sesiones por mes y, por ejercicio, la última vez y sus récords |
| `rueda-de-platos:entreno-borrador-v1` | `{ version, sesion }`: la sesión en curso (o `null`) |
| `localStorage` `fooddraft:entreno-borrador` / `fooddraft:entreno-pendientes` | copia inmediata del borrador y cola de sesiones terminadas sin confirmar en la nube |

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

**Interfaz** (`ui/entreno/` y `ui/estado/entreno.js`):
- **`useEntreno(data)`** lleva todo: catálogo, índice, borrador, meses (se leen **bajo demanda** con
  `cargarMes`; `sesionesDeMes` junta los del mes con los que esperan en la cola), cola y las acciones, que
  envuelven las operaciones puras de `entreno-sesion.js`. Todo cambio del borrador pasa por
  `fijarBorrador` (sella `actualizado`, guarda en `localStorage` y programa la subida). Si la carga del
  catálogo o del índice falla (sin conexión al abrir), no se escribe encima hasta haberlos leído bien. No
  crea ningún documento hasta que se usa. `nube === "pendiente"` solo si una subida falló.
- **Pantallas** (destinos del área Entrenamiento en `ui/pantallas.jsx`): `entreno` (inicio.jsx: empezar
  vacío o con una rutina, seguir uno a medias, últimos entrenos), `entreno-rutinas` y `entreno-rutina`
  (`params: { id }`, editor), `entreno-ejercicios` (biblioteca), `entreno-historial` y `entreno-sesion`
  (`params: { id, inicio }`, detalle corregible), `entreno-ajustes` (unidades, interruptores, descansos,
  exportar CSV/JSON, recalcular el índice).
- **El entreno en curso no es un destino**: es una capa a pantalla completa (`sesion.jsx`, z-index 45) que
  pinta `app.jsx` cuando `entreno.sesionVisible`; ˅ la minimiza y queda la **pastilla** (`pastilla.jsx`,
  z-index 31, encima de la barra o abajo del todo en la zona común). Mientras se ve: Wake Lock, cronómetro y
  descanso repintados cada segundo en piezas aparte (la tabla no), y la pantalla de debajo inmóvil.
- **La tabla** (`fila-serie.jsx`): columnas según `camposDeTipo`; cada campo guarda su propio texto mientras
  se escribe (coma decimal, unidades de pantalla) y manda el valor convertido en cada cambio; ✓ valida con
  `validarSerie` (aviso con «Corregir» / «Es correcto»), marca, arranca el descanso y pasa el foco a la
  siguiente serie. El descanso (`descanso.jsx`) se calcula con `descanso.hasta` y avisa una vez con un
  pitido de Web Audio (el contexto se crea con el primer toque) y vibración donde exista.
- **Terminar** (`terminar.jsx`): resumen, esfuerzo 1-5, nota, fecha (solo cambia si se toca), récords
  batidos, «actualizar la rutina» si cambió su estructura, guardar, compartir (`documentoSesion` con
  `BotonCompartir`) y descartar con confirmación.
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
  `entreno-calculo.js` (con sus pruebas) y `comun.jsx` las reexporta. «¿Datos erróneos o que faltan?» de la
  ficha navega a `feedback` con `params: { categoria: "ejercicio", ejercicioId }`, y `FeedbackView` ofrece
  arriba el correo ya rellenado (nunca lo abre solo).
- **Opcionales hechos**: calculadora de discos (`discos.jsx` y `discosPorLado`, desde el ⋮ de los ejercicios
  con barra; barra de 20 kg o 45 lb) y carpetas de rutinas (`rutina.carpeta`, texto opcional que solo agrupa
  la lista; sin migración, porque una rutina sin carpeta se ve como siempre). Quedan sin hacer las
  superseries y el mapa corporal.
- **Capas a pantalla completa y hojas inferiores** del módulo: `CapaCompleta` y `HojaInferior` en
  `ui/entreno/comun.jsx` (que también tiene los formatos: números y fechas con el idioma, con tablas propias
  de meses y días para cuando el navegador no trae gallego o euskera, unidades de pantalla y duraciones).

## Área Cuerpo: resumen, informes cruzados y aviso de actividad

- **Resumen mensual** (`ui/peso/resumen-mensual.jsx`, gratis): un mes cualquiera en tres apartados —
  Nutrición (comidas hechas y objetivo), Entreno (`resumenEntrenoMes`: entrenos, días, volumen, tiempo,
  récords del mes, músculos más trabajados y comparación con el mes anterior) y Peso (premium, porque sale
  del seguimiento de peso).
- **Informes cruzados** (`ui/cuerpo/informes.jsx`, destino `cuerpo-informes`, premium; cálculos en
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
| `analyzeFoodPhoto` / `suggestMeals` | callable | Gemini con premium + cuota (ver "Servicios de IA") |
| `sendWeighInReminders` | programada, 09:00 Europe/Madrid | Push diario de recordatorio de pesaje |

Puntos que hay que saber antes de tocarlas:

- **Premium**: 2,99 €/mes con Stripe, gestionado en la web (no con Google Play Billing). El campo
  `users/{uid}.premium` es de solo lectura para el cliente (por las reglas de Firestore) y solo lo
  escribe el webhook; la app se entera en vivo con `window.subscribePremiumStatus` (`onSnapshot`).
  Convenio obligatorio al crear un Checkout: `client_reference_id: uid` y
  `subscription_data.metadata.firebaseUID: uid` — sin eso el webhook no sabe de qué usuario es el
  evento y lo descarta. Gratis: generador de menús, objetivos, catálogo, Menú simple, lista de la
  compra, despensa, todo el módulo de entreno (sin límites: rutinas, ejercicios propios, historial,
  gráficas, récords, exportar) y el resumen mensual (nutrición y entreno). Premium: seguimiento de peso
  (y con él el apartado de peso del resumen), las dos funciones de Gemini y los **informes cruzados** del
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
  (`auth-bootstrap.jsx`); `sw.js` muestra la notificación con la app cerrada (`onBackgroundMessage`).
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

Hay dos funciones que salen a un servicio de IA; el resto de la app es cálculo puramente local.
Ambas son Cloud Functions "callable" (ver la sección "Backend: `functions/`" más abajo), no llamadas
directas desde el navegador — hasta septiembre de 2026 el lector de etiquetas sí salía directo del
cliente (Firebase AI Logic), pero un límite comprobado solo en el navegador no protege nada cuando
hay varios usuarios y la IA cuesta dinero, así que se movió al servidor:

- **Lector de etiquetas por foto** (`functions/analyzeFoodPhoto.js`, expuesta al cliente como
  `window.analyzeFoodPhoto` en `auth-bootstrap.jsx`): lee una tabla nutricional de una foto.
  Premium, 20 al mes.
- **"¿Qué puedo cocinar con lo que tengo?"** (`functions/suggestMeals.js`, `window.suggestMeals`):
  foto y/o texto de ingredientes → combinaciones hechas solo con alimentos del catálogo del propio
  usuario. Premium, 10 al mes. La IA solo identifica alimentos (por `foodId`, y el servidor descarta
  cualquiera que no exista en el catálogo enviado); las macros las calcula siempre la app con
  `composedMacros`, nunca vienen de la IA.

Las dos usan `@google/genai` con la clave `GEMINI_API_KEY` guardada como secreto de Firebase (no
está en el repo). **El nombre del modelo (`gemini-3.1-flash-lite`) está hardcodeado en los dos
archivos** — si Google lo retira, hay que cambiarlo en ambos. La cuota mensual se reserva en una
transacción de Firestore *antes* de llamar a Gemini y se devuelve si la llamada falla.

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
