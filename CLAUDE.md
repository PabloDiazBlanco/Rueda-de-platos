# Rueda de Platos — convenciones del proyecto

PWA de uso personal (un solo usuario, un solo desarrollador). Genera menús semanales variados a
partir de platos propios, con cálculo de objetivos nutricionales y seguimiento de peso. El contexto
completo (por qué existe, la ciencia detrás) está en `PDFs explicativos/` — léelos antes de tocar
cualquier fórmula nutricional.

## Regla más importante: no hay build

No hay bundler, no hay `npm install`, no hay `package.json`. Nunca lo añadas, aunque parezca la
solución obvia a algo. El navegador transforma JSX al vuelo con Babel Standalone (CDN), y los
módulos ES nativos (`import`/`export`) se resuelven con el `importmap` de `index.html`.

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
auth-bootstrap.jsx     → login/Firestore, luego carga app.jsx (fetch+Babel+blob)
app.jsx                → TODOS los componentes React + el componente principal.
                          Importa la capa de lógica de abajo con nombre corto.

Logica/comun.js               → uid(), DAYS — utilidades mínimas compartidas
Logica/macros.js               → getFood, macrosFor, emptyMacros, addMacros, composedMacros, fmt
Logica/seleccion.js            → sorteo ponderado + reglas de combinación (weightedPick, pickWithRules...)
Logica/comida-calculo.js       → mealComponents, mealTotals, dayTotals, mealExportParts, calcularListaCompra
Logica/objetivos.js            → PAL/TDEE/macros objetivo, calcularObjetivosPerfil, objetivosPorComida
Logica/menu-generador.js       → generateMenu, lastPicksFromHistory (el motor de generación completo)
Logica/peso.js                 → seguimiento de peso: tendencia, cambios atípicos, ciclos
```

Todos los módulos de lógica son **sin JSX, sin React**, y solo se importan entre sí (nunca desde
`app.jsx` hacia dentro). `app.jsx` es quien los importa a todos. Viven en `Logica/`, aparte de los
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

`app.jsx` se quedó con toda la capa de componentes (~4.000 líneas) a propósito, tras evaluar
dividirla también. Un componente con JSX que importa a otro componente con JSX no se puede
resolver solo con el `importmap` (ver arriba) — habría hecho falta o bien enseñar al service
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

## Idioma y estilo

Todo el código (identificadores de dominio, comentarios, texto de interfaz) está en español,
salvo las palabras clave del propio lenguaje. Los comentarios explican el *porqué* (una decisión
de diseño, una referencia científica, un caso límite) con bastante más detalle del que sería
habitual en otro proyecto — es intencionado, este código va de la mano de los PDFs explicativos y
se espera que se entienda sin tener que releerlos. Mantén ese tono al añadir código nuevo, no lo
recortes a comentarios mínimos por costumbre.

## Lector de etiquetas por foto (Gemini)

`auth-bootstrap.jsx` expone `window.analyzeFoodPhoto`, que manda una foto a Gemini (Firebase AI
Logic, backend "Gemini Developer API", sin plan de pago) para leer una tabla nutricional. El
nombre del modelo está hardcodeado (`gemini-3.1-flash-lite`) — si Google lo retira, solo hay que
cambiarlo ahí. Es la única parte de la app que sale a un servicio de IA; el resto es cálculo
puramente local.

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
- `Validacion/` — herramienta de mantenimiento, no parte de la app (no se enlaza desde
  `index.html` ni se registra en el service worker).

## Qué no hacer

- No añadir un bundler, `package.json` ni dependencias npm permanentes.
- No añadir librerías externas fuera de lo ya declarado en el `importmap` (React, Firebase,
  lucide-react, vía esm.sh/CDN).
- No dividir los componentes React de `app.jsx` en más archivos sin releer antes la sección
  "Por qué la UI no está dividida".
- No hacer commit de nada sin que se pida explícitamente.
- No dar un cambio en la lógica por terminado sin pasar por `Validacion/` primero.
