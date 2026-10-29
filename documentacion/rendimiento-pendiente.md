# Rendimiento: lo que queda por mejorar

Léelo antes de tocar el arranque (`index.html`, `auth-bootstrap.jsx`, `cargador-ui.js`, `sw.js`), el
tamaño de `logica/i18n.js` o `ui/comun/mapa-trazados.js`, o si alguien dice que la app «tarda en
encenderse». Es una lista de **ideas documentadas, no aplicadas**: ninguna está hecha. Lo que ya se ha hecho
y cómo funciona está en `arquitectura.md` (arranque, `cargador-ui.js`, service worker). El análisis completo
con todas las cifras (que no está en el repositorio) es `local/diagnostico-2026-10/04-rendimiento.md`.

## Regla de oro: medir antes de tocar

Todas las cifras de abajo se midieron **en un ordenador de escritorio** (Chrome, 8 núcleos, CPU libre). No se
ha medido en un móvil, que es donde más se nota (CPU varias veces más lenta, red peor) y donde más usuarios
van a estar. Antes de empezar cualquiera de estas mejoras:

1. Medir en un móvil real, con datos móviles: apertura **en frío** (la primera vez, o tras actualizar el
   código) y **en caliente**, y qué tarda hasta que se ve el menú.
2. Con eso, atacar lo que de verdad pese. Sin medir se puede arreglar lo que no era.

Los tiempos de la app en un móvil de gama media pueden ser varias veces los del escritorio. Con la CPU
ocupada, la transformación con Babel llegó a pasar de 6 s en el escritorio.

## Lo que ya está hecho (para no repetirlo)

| Mejora | Efecto medido (escritorio) |
|---|---|
| Caché del código ya transformado en IndexedDB (`cargador-ui.js`) | Arranque en caliente: de ~1,2 s de Babel a ~0,2 s |
| Carga inicial de Firestore en paralelo (`useCargaInicial`, y dentro de menús y entreno) | De ~11 idas y vueltas en serie a una sola antes de pintar: de ~840 ms a ~125 ms con 80 ms por lectura |
| Babel fijado (`7.29.11` con `integrity`), `defer`, marcador en `#root` y `preconnect` | El HTML se pinta antes (de 29-67 ms a 13-15 ms hasta poder interactuar) y no hay redirección bloqueante |
| El service worker pide con `no-cache` (revalida; los archivos sin cambios vuelven como 304) | Ya no se descargan enteros ~140 archivos propios en cada apertura |
| El service worker guarda una copia de las librerías de los CDN (`CACHE_CDN`) | La app arranca sin conexión aunque la caché del navegador haya caducado |

## Pendiente, de más a menos recomendable

Cada punto: qué es, ahorro estimado, riesgo y esfuerzo (S pequeño, M mediano).

### 1. Babel solo bajo demanda · ahorro grande · riesgo medio · esfuerzo M
Hoy Babel Standalone (3,15 MB, unos 660 KB por la red) se descarga y se analiza en **cada** arranque, aunque
con la caché del código transformado no haya nada que transformar. Es el 39 % de todo el JavaScript sin
comprimir. Idea: pasar también `auth-bootstrap.jsx` por `cargador-ui.js` (desde un `<script type="module">` de
`index.html`, sin el `<script src=babel>` ni el `text/babel`) y cargar Babel solo si la caché falla o el
archivo ha cambiado. Con todo en caché, Babel ni se pide ni se analiza, y desaparece el aviso de consola «You
are using the in-browser Babel transformer». `auth-bootstrap.jsx` no cambia por dentro.
- Cuidado: si Babel solo se carga cuando falta caché, la primera apertura tras un despliegue sigue siendo la
  lenta. Siempre cae a «transformar como hoy» si falta IndexedDB o la clave no coincide.
- `validacion/` debe seguir probando siempre la transformación real (`cacheTransformado: false`).

### 2. `logica/i18n.js` partido por idioma · ahorro medio en datos · riesgo bajo-medio · esfuerzo M
Son ~647 KB (unos 187 KB por la red) con los cinco idiomas en un solo archivo, y se descargan antes de pintar
nada aunque se use uno. El coste de CPU es pequeño (~21 ms); el problema son los bytes. Idea:
`logica/i18n-es.js` … `i18n-eu.js` (cada uno un `export default { … }`); `i18n.js` conserva la API, trae `es`
de forma estática (la reserva actual) y carga el idioma activo con `import()` antes de pintar.
- `t()` sigue siendo síncrona: si un idioma aún no ha llegado, cae a español, como con una clave que falta.
- Esperar la carga: con *top-level await* dentro de `i18n.js` (todos los que lo importan esperan solos), al
  leer el perfil en `useDatos.cargar`, y en los selectores de idioma (Ajustes, bienvenida, `privacidad.html`
  y `terminos.html`).
- `import("./i18n-" + id + ".js")` relativo dentro de `i18n.js` funciona desde las cuatro páginas sin tocar sus
  importmaps. Hay que añadir los cinco a `FILES_TO_CACHE` de `sw.js` y subir `CACHE_NAME`.
- `validacion/tests.js` recorre los cinco idiomas: necesitará cargarlos todos antes.
- Ahorro: usuario en español ~513 KB sin comprimir (~146 KB por la red) menos por arranque; en otro idioma,
  ~389 KB (~110 KB). Descartado: separar solo los textos legales (~6 %) o partir por área (más riesgo, menos
  ahorro, porque `t` es síncrona).

### 3. Trazados del mapa corporal bajo demanda · ahorro pequeño-medio · riesgo bajo · esfuerzo S-M
`ui/comun/mapa-trazados.js` (131 KB, ~57 KB por la red) se descarga y se evalúa en cada arranque, y solo se
usa al pintar un mapa (Progreso, ficha de ejercicio, rutinas, resumen del entreno), nunca en el menú de
arranque. Idea: moverlo a `logica/mapa-trazados.js` **sin cambiar su contenido ni su aviso MIT**, cargarlo con
`import()` desde `logica/mapa-corporal.js` y que `MapaCorporal` pinte un hueco del mismo tamaño hasta tenerlo.
- Hay que registrarlo en los importmaps (`index.html` y `validacion/index.html`), en `FILES_TO_CACHE`, quitarlo
  de `ui/archivos.json`, subir `CACHE_NAME`, y revisar que los textos de licencia (`licencias.jsx`, `LICENSE`,
  `terminos.propiedadTexto`, `mapa-corporal.md`) no citen la ruta antigua.
- No sirve un `import()` relativo desde un archivo de `ui/`: corre dentro de `new Function` y se resolvería
  contra otro sitio. Con nombre corto del importmap sí.

### 4. Preparar la interfaz sin esperar a que Auth resuelva la sesión · ahorro medio · riesgo bajo-medio · S-M
Hoy `loadMainApp()` espera a `onAuthStateChanged`, y dentro, a `migrateLocalDataIfNeeded`. Ningún archivo de
`ui/` lee `window.storage` ni `window.cuentaId` al cargarse (solo dentro de funciones), así que se podría
**preparar** (descargar, transformar, importar) desde el principio y solo **ejecutar y pintar** al tener
usuario. También se podrían lanzar las lecturas iniciales de Firestore en cuanto haya usuario, solapando App
Check, Firestore y la transformación.
- Cuidado: con la sesión cerrada se transformaría en segundo plano mientras se ve el login; es trabajo que luego
  se aprovecha, pero gasta batería.

### 5. Descubrir antes lo que se descarga · ahorro pequeño · riesgo bajo · S
- `cargador-ui.js` empieza a importar los módulos externos (React, lucide, los de `logica/`) **después** de
  transformar toda la interfaz; podría lanzar cada `import()` en cuanto se descubre y guardar la promesa.
- Pide `ui/archivos.json` y espera a tenerlo antes de pedir `app.jsx`: una ida y vuelta en serie que se puede
  solapar pidiendo la entrada a la vez.
- `modulepreload` en `index.html` para `cargador-ui.js`, `logica/i18n.js`, los seis de Firebase y las URL
  finales de esm.sh. Sin soporte (Safari antiguo) se ignora sin daño.
- `?deps=scheduler@0.23.2` en el importmap de `react-dom/client` quitaría la pieza con rango que caduca a los
  10 minutos y un nivel de la cascada; con `CACHE_CDN` ya no hace falta para arrancar sin red, pero acorta la
  cascada.

### 6. `firebase/messaging` y `firebase/functions` bajo demanda · ahorro mínimo · riesgo bajo · S
Se cargan siempre y solo se usan al pedir notificaciones o llamar a una función. `await import(...)` dentro de
`requestPushPermission`, `disablePushNotifications` y los puentes de las funciones: ~53 KB sin comprimir
(~16 KB por la red) menos en el camino crítico.

### 7. Un `iconos.js` propio en lugar de `lucide-react` entero · ahorro medio · riesgo medio · esfuerzo M
La app usa 91 iconos y descarga el paquete de 1.464 (558 KB, ~130 KB por la red); `?exports=` de esm.sh no lo
recorta. Idea: un archivo propio con los nodos SVG de esos 91, apuntado por el **mismo nombre corto**
`lucide-react` en los importmaps, de modo que ninguna pantalla cambia. Ahorro estimado ~520 KB sin comprimir
(~100 KB por la red) y no crear 1.464 componentes al evaluar.
- Exige un caso de `validacion/` que compruebe que todo nombre importado existe (si falta uno, esa pantalla
  falla al pintar) y añadir la licencia de lucide (ISC) a «Licencias de terceros».

## Cosas que no se pueden quitar

- **reCAPTCHA (App Check)**: ~850 KB de JavaScript de Google (~354 KB por la red) más un iframe. Con App Check
  aplicado no se puede evitar; solo se puede solapar con otras descargas (puntos 4 y 5).
- **Firestore**: el módulo pesa ~683 KB sin comprimir; no hay una versión más pequeña en el CDN que se use.

## Cómo comprobar cualquiera de estas mejoras

1. `validacion/` en verde.
2. Antes y después, en las mismas condiciones y con el panel de DevTools visible (con el panel oculto, el
   navegador frena la página y los tiempos salen inflados): tiempo hasta ver el menú en frío y en caliente, y
   bytes por la red en caliente (pestaña Network).
3. Probar el arranque sin conexión (ver «Service worker» en `arquitectura.md`).
4. Si se añade o mueve un archivo: registrarlo como dice `CLAUDE.md` y subir `CACHE_NAME`.
