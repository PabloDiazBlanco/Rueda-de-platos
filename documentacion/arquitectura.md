# Arquitectura: módulos, carga de la interfaz y arranque

Léelo antes de tocar módulos de `logica/`, `cargador-ui.js`, el arranque (`index.html`,
`auth-bootstrap.jsx`, `sw.js`) o el rendimiento. Las reglas generales (sin build, dónde se registra cada
archivo nuevo, cómo se escribe en `ui/`) están en el `CLAUDE.md` de la raíz y no se repiten aquí.

## Archivos de arranque (en la raíz)

```
index.html             → importmap + carga auth-bootstrap.jsx (Babel Standalone 7.29.11 desde unpkg, versión
                          exacta con integrity; validacion/index.html usa la misma URL y el mismo hash)
auth-bootstrap.jsx     → login, Firestore, App Check, puente con las Cloud Functions (window.*);
                          luego carga la interfaz con cargador-ui.js
cargador-ui.js         → carga app.jsx y ui/ (Babel + registro de módulos propio, sin build)
app.jsx                → componente principal: reúne los hooks de ui/estado/, decide si toca carga,
                          alta o app, lleva la navegación (destino, datos y última pantalla de cada
                          área) y pinta la pantalla elegida con su cabecera y su barra inferior
sw.js                  → service worker; tiene que estar en la raíz para que su alcance cubra toda la app
manifest.json, icon.svg, privacidad.html, terminos.html
```

## `ui/`: la interfaz (React)

`.jsx` si lleva JSX, `.js` si no. Todos los archivos están listados en `ui/archivos.json` (lo usan el
cargador y `sw.js`).

```
ui/archivos.json        lista de TODOS los archivos de ui/
ui/estilos.js           tipografías (FUENTE_TEXTO, FUENTE_TITULOS, FUENTE_MONO)
ui/pantallas.jsx        tabla destino (`tab`) → pantalla (PANTALLAS)
ui/estado/              hooks: datos.js (useDatos, usePremium, useCargaInicial), menu.js (useMenu, el mismo
                          para Menú completo y simple), catalogo.js, perfil.js, peso.js, despensa.js
                          (useDespensa), entreno.js (useEntreno), cuerpo.js (useCuerpo)
ui/comun/               piezas reutilizadas: modal, tarjetas, idioma, categorias (iconos y colores),
                          cerrar-sesion, compartir (BotonCompartir), bloqueo-scroll (useBloqueoScroll),
                          mapa-corporal.jsx y sus trazados MIT (mapa-trazados.js), avatar.jsx (el chibi
                          de FitDraft y el monitor)
ui/marco/               Shell (variables de tema y estilos de impresión, en cabecera.jsx), cabecera, menú
                          lateral, navegacion.js (áreas, pestañas y menú) y barra-inferior.jsx
ui/menu/ catalogo/ perfil/ onboarding/ peso/ premium/ ajustes/ despensa/ entreno/ cuerpo/
                        una carpeta por pantalla o grupo de pantallas
```

Las carpetas `ui/entreno/`, `ui/despensa/`, `ui/cuerpo/`, `ui/peso/`, `ui/menu/`, `ui/marco/` y
`ui/premium/` tienen un `CLAUDE.md` que importa el documento de su área. No los carga el cargador ni los
cachea `sw.js` (no están en `ui/archivos.json`).

## `logica/`: cálculo puro

Sin JSX ni React. Se importan entre sí por **nombre corto** (el del importmap), nunca nada de `ui/` ni de
`app.jsx`.

```
comun.js               uid(), DAYS, primerEmoji: utilidades mínimas compartidas
macros.js              getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt
seleccion.js           sorteo ponderado y reglas de combinación (weightedPick, pickWithRules, allocateCounts...)
comida-calculo.js      mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra
objetivos.js           PAL/TDEE/macros objetivo, calcularObjetivosPerfil, objetivosPorComida, presets de
                         reparto de comidas (PRESETS_COMIDAS) y la recomendación de preentreno
                         (recomendacionPreentreno: no toca ninguna fórmula)
menu-generador.js      generateMenu, lastPicksFromHistory: el motor de generación completo
peso.js                seguimiento de peso: tendencia, cambios atípicos, ciclos, días sugeridos
salud-publica.js       resumenNutrientesSemana: sal, azúcares y fibra contra los umbrales de la OMS
resumen-mensual.js     calcularResumenMensual, pesoEnMes, cumplimientoMacrosMes
i18n.js                diccionario de textos por idioma (es, en, ca, gl, eu) y la función t()
datos-iniciales.js     FOODS_SEED, CATEGORIAS_ALIMENTOS, initialData (cuenta nueva)
cuestionario.js        opciones del cuestionario de alta y construirIngredientesDesdeCuestionario (con la
                         proteína predeterminada, que pasa a ser la «base» del motor, A9)
migraciones.js         migrateData
despensa.js            stock de la despensa: zonas, menú confirmado, descontar y devolver comidas, tachar y
                         destachar compras, queda poco (alertasStock), limpieza, fecha de cambio
                         (sellarCambios), migrarDespensa, lo que se manda a «¿Qué cocino?»
                         (resumenDespensaParaIA)
lista-compra-neta.js   necesidadesComida, calcularListaNeta (lista de la compra menos lo que hay)
comida-real.js         lo comido de verdad («Cambié algo»): lineasComida, propuestaGramos, comidaReal,
                         registroComida, totalesDiaReal, necesidadesComidaReal
periodo.js             período: inicios de regla y predicción del siguiente
nevera.js              colocación de la nevera dibujada: huecoDe, formaDe, esBebida, repartirEnHuecos,
                         dibujoPropio, frutasDelFrutero
entreno-ejercicios.js  tipos de ejercicio y de serie, músculos, equipos, biblioteca semilla (80),
                         listaEjercicios, ejercicioPorId, buscarEjercicios, posibleDuplicado, camposDeTipo,
                         GIMNASIOS_HABITUALES
entreno-nombres.js     nombres de los 80 ejercicios en los cinco idiomas, nombreEjercicio, ALIAS_EJERCICIOS
entreno-calculo.js     1RM (Epley), volumen, duración con pausas, récords, «anterior», series por músculo,
                         validarSerie, semanas, resumenEntrenoMes, conversiones de libras y millas
entreno-sesion.js      operaciones puras de la sesión en curso (series, descanso, sustituir hoy, pausa,
                         terminar), superseries y rutinas (aplicarARutina, rutinaDesdeSesion)
entreno-almacen.js     claves, migraciones, meses, índice, borrador, cola de envíos y CSV
entreno-importar.js    importar de Hevy y Lyfta: leerCSV, adaptadores, emparejar con la biblioteca,
                         prepararImportacion (vista previa) y construirImportacion
informes.js            informes cruzados del área Cuerpo: los 15 predefinidos (INFORMES, informesVisibles)
                         y los de antes (informeCruzadoMes, declaradoPorSemana), aviso de actividad
                         (sesionesPorSemana, evaluarAvisoActividad) y de grupos sin entrenar
                         (ultimaVezPorGrupo, gruposSinEntrenar)
cuerpo-diario.js       sueño y pasos de cada día (migrarDiario, apuntarSueno, apuntarPasos...) y favoritos
                         de los informes (migrarFavoritos, alternarFavorito, idDeConstructor)
cuerpo-series.js       la serie de cada día con los datos reales (construirSerie), VARIABLES, valores por día
                         o semana, estadística honesta (pearson, pista, relacion, porCategoria, tablaXYZ) y
                         las preguntas del constructor (PREGUNTAS, FORMAS, resolverMontaje)
mapa-corporal.js       SLUG_A_GRUPO (trazo → 14 grupos), escala de verdes, seriesDeRutina,
                         valoresDeEjercicio, generoMapa
gimnasio.js            el gimnasio dibujado de FitDraft: plano, zonas y 25 máquinas (ZONAS, ESTACIONES),
                         ejerciciosDeZona, rutas A* (aEstrella, puntoDe), paradas de una rutina, paso entre
                         ejercicios, estadoZonas, fraseMonitor, rutinaDeHoy y días de la semana
```

### Imports entre módulos de `logica/`

Los imports reales mandan (`grep -n 'from "' logica/*.js`). Hoy son estos; los que no salen no importan
nada:

| Módulo | Importa |
|---|---|
| `comida-calculo` | macros |
| `menu-generador` | comida-calculo, comun, macros, objetivos, seleccion |
| `salud-publica` | comida-calculo, comun, macros |
| `peso` | i18n (mensaje de `evaluarTendencia` y meses de `formatFechaCorta`) |
| `datos-iniciales` | peso |
| `cuestionario` | comun, datos-iniciales |
| `migraciones` | datos-iniciales, i18n, objetivos, peso |
| `despensa` | comun, datos-iniciales |
| `lista-compra-neta` | comida-calculo, despensa, macros |
| `comida-real` | comida-calculo, datos-iniciales, despensa, macros |
| `entreno-sesion` | comun |
| `entreno-importar` | comun, entreno-ejercicios |
| `entreno-almacen` | entreno-calculo |
| `informes` | entreno-calculo, objetivos (solo lee), resumen-mensual |
| `cuerpo-series` | entreno-calculo, periodo |
| `gimnasio` | entreno-calculo (fechas) |

No importan nada: `comun`, `macros`, `seleccion`, `objetivos`, `resumen-mensual`, `i18n`, `nevera`,
`periodo`, `cuerpo-diario`, `mapa-corporal`, `entreno-ejercicios`, `entreno-nombres` y `entreno-calculo`.
Los tres últimos del entreno reciben `ejercicioDe(id)` y `nombreDe` como funciones, para no depender de la
biblioteca ni de los nombres. No hay ciclos.

Única excepción de E/S en `logica/`: `i18n.js` lee y escribe el idioma en `localStorage` (con try/catch).

## Cómo se carga la interfaz (`cargador-ui.js`)

Un archivo con JSX que importa a otro con JSX no se puede resolver solo con el importmap (el importmap dice
dónde está un archivo, no lo transforma). Las alternativas descartadas eran enseñar a `sw.js` a transformar
`.jsx` (arriesgado para el arranque sin conexión) o `import()` dinámico (cambia cómo se escribe todo).

`cargador-ui.js` descarga `app.jsx` y los archivos de `ui/archivos.json`, los pasa por Babel con el plugin
`transform-modules-commonjs` (incluido en Babel Standalone), que convierte sus `import`/`export` en llamadas
a un registro propio, y los enlaza entre sí en el navegador. Los nombres cortos (`react`, `lucide-react`,
los módulos de `logica/`) se siguen resolviendo con el importmap. Lo usan `auth-bootstrap.jsx` y
`validacion/index.html`, así que las pruebas cargan exactamente la misma interfaz que la app.

- Pide los archivos con `cache: "no-cache"` para no mezclar archivos nuevos y viejos tras un despliegue.
- Un error de sintaxis dice en qué archivo está, y en las herramientas del navegador cada archivo aparece
  con su nombre real.
- **Coste de arranque**: Babel transforma toda la interfaz en cada carga: **1,2-1,5 s de CPU en
  escritorio** (más en móvil), medido con Babel 7.29.11 (`local/diagnostico-2026-10/04-rendimiento.md`).
- **Mejora pendiente**: guardar el código transformado entre visitas (IndexedDB), invalidándolo bien tras
  cada despliegue. Es el mayor ahorro posible sin build.

## Cómo usa `validacion/tests.js` las funciones

Lo más directo es importar la función en `tests.js` por su nombre corto (así lo hacen los casos de
`migrateData` y del cuestionario). Las más antiguas las recoge del objeto exportado por `app.jsx`
(`export { ... }` al principio de `app.jsx`); ese patrón sigue funcionando. `validacion/index.html` tiene su
propio importmap, con las rutas un nivel arriba (`"../logica/x.js"`), y carga la interfaz con
`cargarApp({ base: "../" })`.

## Service worker (`sw.js`)

- Estrategia «red primero con cacheo de paso», con `fetch(..., { cache: "no-cache" })`: siempre pregunta al
  servidor, pero un archivo sin cambios vuelve como 304. `FILES_TO_CACHE` lleva los archivos de arranque,
  las páginas legales y los 29 módulos de `logica/`; los de `ui/` los lee de `ui/archivos.json`.
- Los CDN no pasan por el SW: sin conexión dependen de la caché HTTP del navegador. Todos se cachean un año
  salvo `esm.sh/scheduler@^0.23.2` (lo pide `react-dom` con un rango; caduca a los 10 min) y reCAPTCHA (App
  Check), que necesita red. Sin conexión, con la sesión ya iniciada, lo esperable es la pantalla «No se han
  podido cargar tus datos» (Firestore no tiene caché persistente).
- Para cambiar la versión de Babel: URL nueva y su `sha384` en `index.html` y `validacion/index.html` a la vez.
- Si no se sube `CACHE_NAME` al añadir archivos, el service worker instalado no se reinstala y el archivo
  nuevo solo queda disponible sin conexión después de haberse pedido con conexión una vez (falla si alguien
  instala la PWA estando ya sin conexión). Basta una subida de versión por push que añada archivos.
- Muestra las notificaciones push con la app cerrada (`onBackgroundMessage`, ver `backend.md`).
