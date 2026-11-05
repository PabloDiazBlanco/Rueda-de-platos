# Arquitectura: módulos, carga de la interfaz y arranque

Léelo antes de tocar módulos de `logica/`, `cargador-ui.js`, el arranque (`index.html`,
`auth-bootstrap.jsx`, `sw.js`) o el rendimiento. Las reglas generales (sin build, dónde se registra cada
archivo nuevo, cómo se escribe en `ui/`) están en el `CLAUDE.md` de la raíz y no se repiten aquí.

## Archivos de arranque (en la raíz)

```
index.html             → importmap + carga auth-bootstrap.jsx (Babel Standalone 7.29.11 desde unpkg, versión
                          exacta con integrity y `defer`; validacion/index.html usa la misma URL y el mismo
                          hash). #root trae un marcador sin texto que React sustituye; preconnect a los CDN
auth-bootstrap.jsx     → login, Firestore, App Check, puente con las Cloud Functions (window.*),
                          notificaciones y buzón de avisos; luego carga la interfaz con cargador-ui.js
cargador-ui.js         → carga app.jsx y ui/ (Babel + registro de módulos propio, sin build)
app.jsx                → componente principal: reúne los hooks de ui/estado/, decide si toca carga,
                          alta o app, lleva la navegación (destino, datos y última pantalla de cada
                          área) y pinta la pantalla elegida con su cabecera y su barra inferior
sw.js                  → service worker; tiene que estar en la raíz para que su alcance cubra toda la app
manifest.json, icon.svg, privacidad.html, terminos.html
```

## Dos proyectos de Firebase: producción y pruebas

`auth-bootstrap.jsx` elige la configuración de Firebase por `location.hostname`:

| Dónde se abre la app | Proyecto | App Check |
|---|---|---|
| `localhost`, `127.0.0.1` o `[::1]` (desarrollo, `validacion/`) | `rueda-de-platos-dev`: cuentas y datos inventados | No (el proyecto no lo exige) |
| Cualquier otro host (GitHub Pages) | `rueda-de-platos`: las cuentas reales | Sí (reCAPTCHA v3) |

- Cualquier host desconocido cae en producción, nunca al revés: ningún usuario real puede acabar en pruebas.
- **Nunca se copian datos reales al proyecto de pruebas**: son datos de salud y deben quedarse en su sitio.
- El proyecto de pruebas está en el plan Spark (sin Cloud Functions desplegadas ni copias de seguridad) y su
  Firestore en `eur3`, igual que producción. Sus reglas son las mismas que las de producción: las dos se
  publican desde `firestore.rules` (`datos.md`). `.firebaserc` tiene los alias `dev` y `prod`; el proyecto
  por defecto sigue siendo producción, así que el de pruebas se elige siempre con `--project dev`.
- **La clave web de cada proyecto está restringida por sitio web** (Google Cloud → Credenciales → «Browser
  key»): producción, a `pablodiazblanco.github.io`, `rueda-de-platos.firebaseapp.com` y
  `rueda-de-platos.web.app`; pruebas, a `localhost:8420`, `127.0.0.1:8420`, `rueda-de-platos-dev.firebaseapp.com`
  y `rueda-de-platos-dev.web.app`. **El dominio `*.firebaseapp.com` de cada proyecto no se quita nunca**: desde
  él funcionan la página a la que llevan los enlaces de los correos (verificar el email, cambiar la contraseña)
  y la ventana de «Continuar con Google»; sin él, las dos fallan con `API_KEY_HTTP_REFERRER_BLOCKED`.
- **Qué no funciona aún en local**: las funciones (premium, Gemini, Stripe, borrar la cuenta), porque el
  proyecto de pruebas no tiene ninguna desplegada. Las dos de notificaciones se prueban con el emulador
  (`npm run test:avisos` en `functions/`, `backend.md`).
- **Las notificaciones sí funcionan en local**: cada proyecto tiene su clave VAPID (`VAPID_PRODUCCION` y
  `VAPID_PRUEBAS` en `auth-bootstrap.jsx`, de Firebase → Configuración → Cloud Messaging → Certificados push
  web) y `sw.js` elige la configuración de Firebase con la misma regla de `location.hostname`. Así se prueba
  el buzón de avisos con una cuenta de pruebas. Si Chrome bloquea el permiso en `localhost` («Notificaciones
  bloqueadas» en la barra de direcciones), se permite desde ese mismo aviso.

## Cuentas: entrar, recuperar la contraseña y verificar el email

Todo vive en `auth-bootstrap.jsx`, antes de cargar la interfaz: `WelcomeScreen` → `LoginScreen`, con tres
modos (iniciar sesión, crear cuenta y recuperar la contraseña) y «Continuar con Google»; con sesión, o
`VerificarCorreoScreen` o la app (`entrarEnLaApp`).

- **Verificación estricta del email**: una cuenta de correo y contraseña sin verificar (`necesitaVerificar`) no
  entra en la app ni lee nada: ve `VerificarCorreoScreen` hasta abrir el enlace del correo. Las de Google
  llegan verificadas. Las reglas de Firestore exigen lo mismo (`datos.md`).
  - Una cuenta **recién creada** (menos de 10 minutos) recibe el primer correo sola; una de antes de que
    existiera la verificación no recibe nada hasta pulsar «Enviarme el correo». El texto dice «te hemos
    enviado» solo si se envió desde ese dispositivo (`fooddraft:verificacion-enviada:<uid>`, que también
    marca el minuto de espera antes de reenviar).
  - «Ya lo he verificado» recarga el usuario y, si ya lo está, **renueva el token** antes de entrar: las reglas
    miran `email_verified` en el token, y sin renovarlo la primera lectura fallaría. Al volver a la pestaña
    (desde el correo) se comprueba solo. Al verificar no salta `onAuthStateChanged`, así que es la pantalla la
    que abre la app.
  - Los mensajes se guardan como clave o código de error y se traducen al pintar, para que sigan al cambio de
    idioma.

- **«¿Olvidaste tu contraseña?»** (modo `recuperar`) manda el correo de Firebase para cambiarla
  (`sendPasswordResetEmail`). Contesta siempre lo mismo, exista o no la cuenta (`login.enlaceEnviado`), para
  que la pantalla no sirva para averiguar qué correos usan la app. El enlace del correo vuelve a la app
  (`urlVueltaCorreos`: la dirección donde esté abierta, que tiene que ser un dominio autorizado de su proyecto).
- **Los correos de Firebase salen en el idioma de la app**: `LoggedOutFlow` pone `auth.languageCode` con el
  idioma elegido. Remitente, asunto y textos son las plantillas de Firebase (consola → Authentication →
  Plantillas); el nombre que enseñan es el **nombre público del proyecto**, que se cambia en la consola
  (Configuración del proyecto → General), no en el código.
- Los errores de Firebase se traducen en `traducirError` (`error.*`); uno sin traducir sale con su código
  (`error.generico`).
- Los colores de estas pantallas van escritos a mano, no con las variables de tema: se pintan antes de que
  exista `Shell`, que es quien las define. Está anotado para la revisión de producto.

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
                          cerrar-sesion, compartir (BotonCompartir), bloqueo-scroll (useBloqueoScroll), error-carga
                          (pantalla de reintento), errores (mensajeErrorFuncion),
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
comida-calculo.js      mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra,
                         ingredientePorNombre y carpetaDeHueco (nombre del menú → ingrediente, por carpeta)
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
buzon-avisos.js        el buzón de avisos sin Firebase (R8): quiereAvisos, firmaBuzon y buzonAlDia (si hace
                         falta reescribirlo), tokensConSitio (hacer sitio con la lista llena) y
                         MAX_DISPOSITIVOS (el mismo tope que firestore.rules). Lo importa auth-bootstrap.jsx
```

### Imports entre módulos de `logica/`

Los imports reales mandan (`grep -n 'from "' logica/*.js`). Hoy son estos; los que no salen no importan
nada:

| Módulo | Importa |
|---|---|
| `comida-calculo` | macros, i18n (las notas «mitad» / «ajuste fino» de `mealExportParts`) |
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
| `buzon-avisos` | peso (`fechaISO`) |

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
- **Caché del código transformado** (IndexedDB `fooddraft-codigo-transformado`): cada archivo se guarda con la
  clave `babel-<versión>|opciones-<VERSION_OPCIONES>|<SHA-256 de la fuente>`. La fuente se pide siempre (la
  caché nunca decide qué versión se usa) y solo se guarda tras ejecutarse la interfaz sin errores; sin
  IndexedDB o sin `crypto.subtle`, se transforma como siempre. **Si cambian las opciones de Babel o lo que se
  hace con el resultado, sube `VERSION_OPCIONES`.** `validacion/` carga con `cacheTransformado: false` para
  probar siempre la transformación real.
- **Coste de arranque** (escritorio, 8 núcleos): sin caché, 1,1-1,2 s; con la caché llena, ~0,2 s. En frío
  (primera visita o tras cambiar todos los archivos) cuesta lo mismo que sin caché (las huellas SHA-256 de los
  106 archivos, ~10 ms). Medidas en `local/diagnostico-2026-10/13-informe-fase-2.md` (bloque 9).
- **Pendiente**: no descargar ni analizar Babel (3,15 MB) cuando todo está en caché, pasando
  `auth-bootstrap.jsx` por el cargador (`04-rendimiento.md` § 5, paso 2). Ésta y el resto de mejoras de
  rendimiento sin aplicar (traducciones por idioma, trazados del mapa y iconos bajo demanda...), con ahorro,
  riesgo y esfuerzo de cada una, están en `rendimiento-pendiente.md`.

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
- Las librerías de los CDN (`esm.sh`, `unpkg.com` y `www.gstatic.com/firebasejs/`) van a una caché aparte,
  `CACHE_CDN`, con la misma estrategia (red primero, la copia solo sin conexión) pero sin `no-cache`: sus
  direcciones llevan la versión. Esa caché no se vacía al subir `CACHE_NAME`; **al cambiar la versión de una
  librería (importmaps, Babel, Firebase de `sw.js`) se sube `CACHE_CDN`**, y activate borra la anterior (si
  no, cada versión dejaría sus copias para siempre en cada dispositivo). Solo GET y solo respuestas CORS
  correctas; Firestore, Authentication y reCAPTCHA (App Check) no pasan por ahí, porque necesitan red. Hace
  falta porque la caché HTTP no basta: `esm.sh/scheduler@^0.23.2` (lo pide `react-dom` con un rango) caduca a
  los 10 minutos y, sin copia, la app se quedaba en el marcador de arranque. Sin conexión, con la sesión ya
  iniciada, lo esperable es la pantalla «No se han podido cargar tus datos» (Firestore no tiene caché
  persistente).
- Para probar el arranque sin conexión: DevTools → Network → «Disable cache» (simula la caché HTTP caducada) y
  «Offline», tras haber cargado la app con red con el service worker ya activo. El navegador del panel de
  Claude no registra service workers: esta prueba se hace en Chrome.
- Para cambiar la versión de Babel: URL nueva y su `sha384` en `index.html` y `validacion/index.html` a la vez.
- Si no se sube `CACHE_NAME` al añadir archivos, el service worker instalado no se reinstala y el archivo
  nuevo solo queda disponible sin conexión después de haberse pedido con conexión una vez (falla si alguien
  instala la PWA estando ya sin conexión). Basta una subida de versión por push que añada archivos.
- Muestra las notificaciones push con la app cerrada (`onBackgroundMessage`, ver `backend.md`), con el proyecto
  de Firebase que toca según el host (el de pruebas en `localhost`).
