# FoodDraft — convenciones del proyecto

PWA que genera menús semanales variados a partir de platos propios, con cálculo de objetivos
nutricionales y seguimiento de peso. Nació como app de uso personal (un solo usuario, un solo
desarrollador); desde septiembre de 2026 está en proceso de abrirse a más usuarios y publicarse en
Google Play, con una capa de suscripción premium (ver `functions/`, y la hoja de ruta de
publicación si la tienes a mano). El contexto completo (por qué existe, la ciencia detrás) está en
`PDFs explicativos/` — léelos antes de tocar cualquier fórmula nutricional.

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

Esto tiene una consecuencia técnica concreta que hay que respetar: **el `importmap` decide dónde
buscar un archivo, no lo transforma**. Un módulo sin JSX se puede importar con nombre corto sin
más. Un archivo con JSX necesita pasar por Babel antes de que el navegador lo toque — por eso
`auth-bootstrap.jsx` carga `app.jsx` a mano (`fetch` + `Babel.transform` + `Blob` +
`import()` dinámico) en vez de un `import` normal. No repliques ese patrón para dividir
componentes React en varios archivos sin pensarlo — ver la sección "Por qué la UI no está
dividida" más abajo.

## Arquitectura de módulos

```
index.html            → importmap + carga auth-bootstrap.jsx
auth-bootstrap.jsx     → login/Firestore/App Check, puente con las Cloud Functions (window.*),
                          luego carga app.jsx (fetch+Babel+blob)
app.jsx                → TODOS los componentes React + el componente principal.
                          Importa la capa de lógica de abajo con nombre corto.

Logica/comun.js               → uid(), DAYS — utilidades mínimas compartidas
Logica/macros.js               → getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt
Logica/seleccion.js            → sorteo ponderado + reglas de combinación (weightedPick, pickWithRules...)
Logica/comida-calculo.js       → mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra
Logica/objetivos.js            → PAL/TDEE/macros objetivo, calcularObjetivosPerfil, objetivosPorComida,
                                  presets de reparto de comidas (PRESETS_COMIDAS)
Logica/menu-generador.js       → generateMenu, lastPicksFromHistory (el motor de generación completo)
Logica/peso.js                 → seguimiento de peso: tendencia, cambios atípicos, ciclos
Logica/salud-publica.js        → resumenNutrientesSemana: sal/azúcares/fibra contra umbrales de la OMS
Logica/resumenMensual.js       → calcularResumenMensual, pesoEnMes (comidas completadas + peso del mes)
Logica/i18n.js                 → diccionario de textos por idioma (ES/EN/CA/GL/EU) y la función t()
```

Todos los módulos de lógica son **sin JSX, sin React**, y solo se importan entre sí (nunca desde
`app.jsx` hacia dentro). El único cruce que existe hoy es `peso.js` → `i18n.js`, solo para traducir
el mensaje de `evaluarTendencia` y los meses de `formatFechaCorta`. `app.jsx` es quien los importa
a todos. Viven en `Logica/`, aparte de los
archivos de arranque de la raíz (`index.html`, `auth-bootstrap.jsx`, `sw.js`, `manifest.json`,
`icon.svg` — estos sí tienen que quedarse en la raíz: `sw.js` en concreto necesita estar ahí para
que su "scope" cubra toda la app).

**Al crear un módulo nuevo de lógica**, ponlo en `Logica/` y registra su nombre corto en **dos**
sitios, o `Validacion/` dejará de cargar sin avisar con un error claro:
- `index.html` → `"nombre": "./Logica/archivo.js"`
- `Validacion/index.html` → `"nombre": "../Logica/archivo.js"` (un nivel arriba)

Como todo se importa por nombre corto (nunca por ruta relativa) entre los propios módulos y desde
`app.jsx`, mover un archivo de sitio no obliga a tocar nada dentro de él — solo estas dos entradas
del `importmap` y la de `sw.js` de abajo.

Y si alguna función del módulo debe seguir siendo accesible desde `Validacion/tests.js` (que la
coge del objeto exportado por `app.jsx`, no del módulo directamente), añade también
`export { nombreFuncion };` en `app.jsx` después del `import`. Mira los imports actuales al
principio de `app.jsx` para ver el patrón exacto.

## Por qué la UI no está dividida

`app.jsx` se quedó con toda la capa de componentes (~7.200 líneas a septiembre de 2026 — empezó
en ~4.000 cuando se tomó esta decisión, y ha crecido con premium, i18n y el rediseño de navegación)
a propósito, tras evaluar dividirla también. Un componente con JSX que importa a otro componente
con JSX no se puede resolver solo con el `importmap` (ver arriba) — habría hecho falta o bien enseñar al service
worker (`sw.js`) a transformar `.jsx` al vuelo en cada fetch (arriesgado: toca el arranque offline
de una PWA que se usa a diario, con problemas conocidos de sincronización en la primera
instalación), o bien un loader manual con imports dinámicos en vez de `import` normal (cambia
cómo se escribe el código en todos los componentes, para un beneficio dudoso). Se decidió que no
compensaba: la parte con más lógica de negocio y más riesgo de bugs ya está fuera y con tests; lo
que queda en `app.jsx` es "solo" UI, más plano y con menos responsabilidades mezcladas.

Si en el futuro `app.jsx` vuelve a crecer mucho y se quiere retomar esto, empieza releyendo esta
sección — el análisis ya está hecho, no hay que repetirlo desde cero.

## Al añadir un archivo `.js`/`.jsx` nuevo que la app carga siempre

Además de registrarlo en los dos `importmap` (ver arriba), añádelo a `FILES_TO_CACHE` en
`sw.js` y sube en uno la versión de `CACHE_NAME`. Si no lo haces, el archivo nuevo solo queda
disponible offline después de haberlo pedido con conexión al menos una vez — la estrategia de
`sw.js` es "red primero con cacheo de paso", así que en el uso normal no se nota, pero falla si
alguien instala la PWA estando ya sin conexión. Se nos olvidó al crear los 7 módulos de la capa
de lógica; quedó corregido después, pero es fácil que vuelva a pasar.

## Migraciones de datos guardados

`migrateData` (en `app.jsx`) se ejecuta sobre cualquier dato cargado desde Firestore/localStorage
antes de usarlo. Si cambias la forma de los datos guardados (un campo nuevo, un catálogo que
crece, una estructura que cambia), añade aquí el parche correspondiente — nunca asumas que los
datos ya guardados de antes tienen la forma nueva. El patrón siempre es el mismo: comprobar si
falta algo y completarlo sin pisar lo que el usuario ya haya editado a mano (mira los bloques
existentes como ejemplo, especialmente el de `FOODS_SEED` y los campos añadidos después).

## Menú completo y Menú simple

Hay dos pantallas de menú que conviven, y las dos usan el mismo `generateMenu`:

- **Menú completo** (`MenuView`): con kcal, macros, raciones ajustables y comparación contra los
  objetivos del día. Ciclo en `menu-v1`, historial en `history-v1`, lista de la compra en
  `data.listaCompra`.
- **Menú simple** (`MenuSimpleView`): solo el borrador de combinaciones, sin calorías ni gramos.
  Tiene su propio ciclo (`menu-simple-v1`), su propio historial (`history-simple-v1`) y su propia
  lista de la compra (`data.listaCompraSimple`), independientes de los de arriba — generar o
  deshacer en uno nunca toca al otro. Para no mostrar cantidades, `mealExportParts` y
  `calcularListaCompra` aceptan `{ conCantidades: false }`.

Todas las claves de almacenamiento (`STORAGE_KEY`, `MENU_STORAGE_KEY`...) empiezan por
`rueda-de-platos:` — ver la nota sobre el nombre al principio de este archivo.

## Internacionalización

La interfaz existe en 5 idiomas: español (por defecto), inglés, catalán, gallego y euskera.
`Logica/i18n.js` es un diccionario propio (no una API de traducción en vivo, para que siga
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
  compra y resumen mensual básico. Premium: seguimiento de peso, las dos funciones de Gemini y el
  resumen mensual ampliado.
- **Secretos** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`): viven en Firebase,
  nunca en el repo. Las funciones callable exigen App Check (`enforceAppCheck: true`); el webhook no,
  porque quien llama es Stripe, no la app.
- **Coste**: `setGlobalOptions({ maxInstances: 10 })` en `index.js` pone un techo duro por función.
- **Código duplicado a mano**: `sendWeighInReminders.js` repite `esDiaSugeridoPeso`, `fechaISO` y la
  tabla de días sugeridos de `Logica/peso.js`, porque `peso.js` es un módulo ESM de navegador (usa
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
llega directo a producción**, así que no subas nada sin haber pasado antes por `Validacion/` y
haber mirado la consola (ver "Cómo verificar un cambio").

## Idioma y estilo

Todo el código (identificadores de dominio, comentarios, texto de interfaz) está en español,
salvo las palabras clave del propio lenguaje. Los comentarios explican el *porqué* (una decisión
de diseño, una referencia científica, un caso límite) con bastante más detalle del que sería
habitual en otro proyecto — es intencionado, este código va de la mano de los PDFs explicativos y
se espera que se entienda sin tener que releerlos. Mantén ese tono al añadir código nuevo, no lo
recortes a comentarios mínimos por costumbre.

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

Nunca abras `index.html` ni `Validacion/index.html` con `file://` — los `fetch` e imports
relativos no resuelven igual y algunas cosas fallan en silencio o de forma distinta a producción.

1. Sirve el repo por `http://localhost` con el servidor estático ya configurado en
   `.claude/launch.json` (Python `http.server`, puerto 8420 — usa `preview_start` con `name: "static"`).
2. Abre `http://localhost:8420/Validacion/index.html` y comprueba que el contador de arriba dice
   "X / X casos superados" (todos en verde, ninguno por debajo del total). Esa página carga
   `app.jsx` tal cual (mismo mecanismo que `auth-bootstrap.jsx`), nunca una copia — si pasa ahí,
   el código real funciona. Los valores "esperado" de cada caso se verifican a mano antes de
   guardarlos como referencia (lee la cabecera de `Validacion/tests.js`) — no los cambies para
   que un caso pase, cambia el código.
3. Revisa la consola del navegador por si hay errores de import silenciosos.
4. Si el cambio toca algo que `Validacion` no cubre (por ejemplo `generateMenu`, que es
   aleatorio y no tiene casos con valores fijos), haz una comprobación aparte: importa el módulo
   directamente en la consola con el mismo patrón fetch+Babel+blob y llama a la función con datos
   sintéticos, o pide confirmación manual en la app real autenticada.
5. Añade casos nuevos a `Validacion/tests.js` cuando el cambio introduzca lógica de cálculo nueva
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

Un commit de código no lleva contenido (PDFs, imágenes, documentación) y viceversa. Si un cambio
toca ambas cosas, son dos commits separados.

## Carpetas de contenido

- `PDFs explicativos/` — documentación de fundamentos nutricionales y evidencia científica.
  Fuente de verdad sobre el porqué de cada fórmula.
- `Estudios de apoyo de la aplicacion/` — papers académicos originales (con DOI) que respaldan
  esos PDFs, organizados por carpeta temática. Se mantienen versionados a propósito (no son
  redundantes con los PDFs — son la fuente primaria). Si algún día se añade contenido claramente
  no académico (volcados de páginas web con trackers, etc.), se elimina en vez de mantenerlo.
- `reports/` y `research_notes/` — investigaciones a fondo que respaldan una decisión de cálculo
  concreta (hoy, el suelo de carbohidrato en déficit calórico): el informe final en `reports/` y
  las notas de trabajo por subtema en `research_notes/`. Los PDFs de Evidencia Científica y de
  Fundamentos remiten al informe de `reports/` para el detalle completo.
- `Traducciones/` y `Traducciones corregidas/` — material de trabajo de la internacionalización
  (PDFs de solo texto para revisar cada idioma y las correcciones que se aplicaron a catalán,
  gallego y euskera). No los lee la app: la fuente real de las traducciones es `Logica/i18n.js`.
- `Ideas futuras.md` — apuntes de mejoras sin diseñar ni priorizar. No es una hoja de ruta cerrada;
  al retomar una idea, relee su sección entera en vez de fiarte de un resumen.
- `Ideas para la aplicación.docx` — documento de ideas original del que salió el rediseño de
  navegación y onboarding de septiembre de 2026.
- `Validacion/` — herramienta de mantenimiento, no parte de la app (no se enlaza desde
  `index.html` ni se registra en el service worker).

## Qué no hacer

- No añadir un bundler, `package.json` ni dependencias npm permanentes **a la app** (`functions/`
  tiene el suyo, y es un proyecto aparte).
- No añadir librerías externas fuera de lo ya declarado en el `importmap` (React, Firebase,
  lucide-react, vía esm.sh/CDN).
- No dividir los componentes React de `app.jsx` en más archivos sin releer antes la sección
  "Por qué la UI no está dividida".
- No hacer commit de nada sin que se pida explícitamente.
- No dar un cambio en la lógica por terminado sin pasar por `Validacion/` primero.
