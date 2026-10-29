# FoodDraft — reglas del proyecto

PWA que genera menús semanales a partir de platos propios, calcula objetivos nutricionales y lleva el
entreno, el peso y otros datos del cuerpo. Nació para un solo usuario y se está abriendo a más (Google Play
y suscripción premium). Tres áreas: **FoodDraft** (nutrición), **FitDraft** (entreno; su clave interna es
`entreno`) y **Cuerpo**, más una zona común (Ajustes, Perfil, Premium...).

Este archivo tiene solo lo que vale para cualquier cambio. **Antes de tocar un área, lee su documento**
(tabla al final; las carpetas de `ui/` y `functions/` con documento lo cargan solas con su `CLAUDE.md`, pero
tocar solo `logica/` no). Antes de tocar una fórmula nutricional, lee los PDF divulgativos de
`local/divulgacion/` (no están en el repositorio: si no los tienes, pídeselos a Pablo en vez de suponer su
contenido).

## Nombre
La app se llama «FoodDraft» (y «FitDraft» el área de entreno: son marcas, no se traducen). Por debajo,
Firebase, el repositorio de GitHub y **todas** las claves de almacenamiento se llaman `rueda-de-platos`. No lo
cambies ahí aunque parezca inconsistente: rompería la app desplegada o haría que los datos guardados
parecieran perdidos.

## No hay build
- Nada de bundler, `npm install` ni `package.json` en la app. Nunca, aunque parezca la solución obvia.
- El JSX lo transforma Babel Standalone en el navegador; los módulos se resuelven con el `importmap` de
  `index.html`. El importmap dice dónde está un archivo, **no lo transforma**: por eso los `.jsx` los carga
  `cargador-ui.js`.
- Excepción: `functions/` (Cloud Functions, proyecto Node aparte con su `package.json`). La app nunca importa
  nada de `functions/` ni al revés.
- Ninguna librería externa fuera de las del importmap (React, Firebase, lucide-react) y Babel.

## Dónde va cada cosa
- `logica/`: cálculo puro, sin JSX ni React. Solo importa otros módulos de `logica/` (por nombre corto),
  nunca `ui/` ni `app.jsx`.
- `ui/`: la interfaz, una carpeta por área (`.jsx` si lleva JSX, `.js` si no); el estado, en hooks de
  `ui/estado/`. Los hooks no se importan entre sí: se conectan en `app.jsx`.
- `app.jsx`: reúne los hooks, decide carga/alta/app y lleva la navegación. No acumules pantallas ahí: cada
  pantalla en su archivo de `ui/`, el estado en un hook y la lógica sin React en `logica/`.
- Raíz: arranque (`index.html`, `auth-bootstrap.jsx`, `cargador-ui.js`, `manifest.json`, `icon.svg` y
  `sw.js`, que tiene que estar en la raíz por su alcance).
- `validacion/`: pruebas en el navegador (herramienta de mantenimiento: no se enlaza desde la app ni la
  cachea el service worker). `documentacion/`: un documento por área.

Mapa completo de módulos e imports reales: `documentacion/arquitectura.md`.

## Archivo nuevo: dónde se registra
| Qué | Dónde |
|---|---|
| Módulo de `logica/` | `index.html` → `"x": "./logica/x.js"` · `validacion/index.html` → `"x": "../logica/x.js"` · `FILES_TO_CACHE` de `sw.js` |
| Archivo de `ui/` | `ui/archivos.json` (no se toca ningún importmap) |
| Cualquiera de los dos | Sube en uno `CACHE_NAME` de `sw.js` (una vez por push que añada archivos) |
| Otra versión de una librería (importmaps, Babel, Firebase de `sw.js`) | Los dos importmaps a la vez y sube en uno `CACHE_CDN` de `sw.js` (si no, las copias viejas se quedan en cada dispositivo) |
| Pantalla nueva | Su destino en `PANTALLAS` (`ui/pantallas.jsx`) y su sitio en `ui/marco/navegacion.js` |
| Pestaña nueva | Entrada en `pestanas` con icono de `lucide-react` y etiqueta `barra.*` en los 5 idiomas (máx. 5 por área) |

`validacion/` marca en rojo casi todos los olvidos (un módulo sin registrar hace que deje de cargar; un
archivo de `ui/` fuera de `archivos.json`, el grupo «Carga de la interfaz»; una pantalla huérfana, el grupo
«Navegación por áreas»). `CACHE_NAME` no lo comprueba nadie. Mover un archivo de `logica/` solo obliga a
cambiar esas entradas: dentro, todo se importa por nombre corto.

## Al escribir en `ui/`
- Todo archivo con JSX: `import React from "react"`.
- Entre archivos de la interfaz, ruta relativa **con extensión** (`"../comun/modal.jsx"`); `logica/`, React y
  lucide, por nombre corto.
- Nada importado de otro archivo de `ui/` se usa al cargarse el módulo (fuera de funciones): así los ciclos
  entre archivos no dan problemas.
- Estilos en línea; colores **siempre** como variables de tema (`Shell` en `ui/marco/cabecera.jsx`; dibujos:
  `ui/despensa/tema.js`, `ui/entreno/gimnasio-tema.js`); macros con `--macro-prot`, `--macro-grasa` (oliva) y
  `--macro-carb`; tipografías con `FUENTE_TEXTO`, `FUENTE_TITULOS` y `FUENTE_MONO` de `ui/estilos.js` (nunca
  el nombre de la fuente a mano). Gráficas: verde lo tuyo, mostaza la referencia, óxido fuera de rango, gris
  sin dato.
- Capas a pantalla completa: `useBloqueoScroll` (`ui/comun/bloqueo-scroll.js`). Nunca guardes y devuelvas
  `document.body.style.overflow` a mano (al cerrarse en otro orden, la página se queda sin scroll).
- `z-index`: gimnasio 5 (botones 6-7) · barra 30 · pastilla de entreno 31 · menú lateral 40/41 · capas a
  pantalla completa 45 · modales 50 · `HistoriaScreen` 9999 (detalle en `documentacion/navegacion.md`).
- Toda animación tiene versión para «reducir movimiento».
- Comodidades del dispositivo en `localStorage` con prefijo `fooddraft:` (siempre con try/catch); datos de la
  cuenta, en `window.storage` con prefijo `rueda-de-platos:`.

## Datos guardados
- Si cambia la forma de algo guardado: parche de migración que complete lo que falta **sin pisar lo editado
  por el usuario** + su caso en `validacion/tests.js`. Nunca supongas que los datos viejos tienen la forma
  nueva: ese caso es lo que protege los datos de todas las cuentas.
- `migrateData` (`logica/migraciones.js`) solo cubre la clave principal. Despensa, entreno y Cuerpo tienen su
  propia clave y su propia migración: **no pasan por `migrateData`**.
- Nunca `window.storage.list()` (en Firestore lee la colección entera).
- Una lectura que falla no es una cuenta vacía: no escribas encima de un documento que no se ha podido leer.
- Claves, versiones, migraciones y Firestore: `documentacion/datos.md`.

## Textos en 5 idiomas
- Texto de interfaz nuevo = clave en los **cinco** diccionarios de `logica/i18n.js` (es, en, ca, gl, eu).
  Nunca texto suelto en el JSX. Se usa con `t(idioma, "clave", { variables })`. Si una clave falta en un
  idioma cae a español, y si falta también ahí devuelve la propia clave (se nota en pantalla).
- Los datos del usuario (nombres de platos, notas) no se traducen nunca. Los identificadores del modelo
  (`mealType`, `DAYS`, nombres de ingrediente de las reglas) se guardan en español y solo se traducen al
  mostrarlos (`t(idioma, "mealType." + m.mealType)`): el motor los compara por nombre.
- El idioma vive en `perfil.idioma`; antes de haber perfil, en `localStorage`. `privacidad.html` y
  `terminos.html` leen el mismo diccionario. Los mensajes de las Cloud Functions no dependen de `i18n.js`.

## Estilo del código
Todo en español (identificadores, comentarios, textos), salvo las palabras clave. Los comentarios explican el
**porqué** (una decisión de diseño, una referencia científica, un caso límite) con más detalle de lo
habitual: van de la mano de los PDF divulgativos. Mantén ese tono; no lo recortes a comentarios mínimos.

## Verificar antes de dar algo por bueno
1. Sirve el repo con `.claude/launch.json` (`preview_start` con `name: "static"`, puerto 8420). Nunca
   `file://`: los `fetch` y los imports relativos no resuelven igual.
2. `http://localhost:8420/validacion/index.html` → «X / X casos superados», todo en verde. Los valores
   esperados se calculan a mano antes de guardarlos (cabecera de `validacion/tests.js`): si un caso falla, se
   arregla el código, nunca el valor esperado.
3. Consola sin errores (solo el aviso de Babel). Antes de concluir nada, desregistra el service worker, vacía
   sus cachés y pide los archivos con `cache: "reload"` desde una página que no controle.
4. Mayúsculas de las rutas exactas: Windows no las distingue, GitHub Pages sí.
5. Lo que `validacion/` no cubre (p. ej. `generateMenu`, aleatorio): desde la consola de
   `validacion/index.html`, `await import("menu-generador")` con datos sintéticos; para la interfaz,
   `await (await import("cargador-ui")).cargarApp({ base: "../" })`. O pide a Pablo que lo pruebe en la app
   real.
6. Lógica de cálculo nueva sin casos → caso nuevo en `tests.js`, con el valor esperado calculado a mano.

No des un cambio de lógica por terminado sin pasar por `validacion/`.

## Despliegue
- Un push a `main` llega a producción (GitHub Pages) en minutos, sin CI ni paso de build. Un error de
  sintaxis o de import llega directo a todos los usuarios: nada se sube sin el paso anterior.
- `functions/` se despliega a mano (`firebase deploy --only functions`). Si cambia lo que recibe una función,
  despliégala **antes** de subir la app.

## Git
- Ningún commit sin que Pablo lo pida, y sin línea `Co-Authored-By`.
- Código y contenido (documentación, `CLAUDE.md`, `README.md`, iconos) en commits separados.
- El historial público conserva los papers, PDF y traducciones que estuvieron versionados. Reescribirlo
  (reescritura + push forzado) es destructivo: solo con permiso explícito de Pablo.

## `local/`
Lo que no es código de la app (PDF divulgativos, papers, investigación, ideas, maquetas, arneses de prueba)
vive en `local/`, que está en `.gitignore` porque el repositorio es público y GitHub Pages publica todo lo
versionado (también este archivo y `documentacion/`: nada privado aquí). No saques nada de `local/` al
repositorio ni quites esa línea del `.gitignore`. Qué hay y en qué estado: `local/LEEME.md`. Nombres:
español, minúsculas, guiones, sin espacios ni tildes. Antes de mover algo de `local/`, busca quién lo cita
(`git grep "local/<ruta>"`).

## Licencia
`LICENSE` (todos los derechos reservados) y `terminos.propiedadTexto` (5 idiomas) son dos mitades del mismo
compromiso: no cambies una sin la otra. El aviso MIT de `ui/comun/mapa-trazados.js` no se quita
(`documentacion/mapa-corporal.md`).

## Antes de tocar un área, lee
| Si tocas... | Lee |
|---|---|
| Módulos, `cargador-ui.js`, arranque, `sw.js`, rendimiento | `documentacion/arquitectura.md` |
| Navegación, barra inferior, menú lateral, cabecera, capas | `documentacion/navegacion.md` |
| Menús, generar, preentreno, «Hecha»/«Cambié algo», compartir | `documentacion/menu.md` |
| Despensa, nevera, cocina dibujada, lista de la compra neta | `documentacion/despensa.md` |
| Entreno (`logica/entreno-*`, `ui/entreno/`, `ui/estado/entreno.js`) | `documentacion/entreno.md` |
| Gimnasio dibujado de FitDraft (`logica/gimnasio.js`, `ui/entreno/gimnasio-*`) | `documentacion/fitdraft-gimnasio.md` |
| Área Cuerpo: peso, informes, constructor, sueño, pasos, período, báscula, resúmenes, avisos | `documentacion/cuerpo.md` |
| Mapa corporal y su licencia | `documentacion/mapa-corporal.md` |
| Claves de almacenamiento, migraciones, Firestore, `window.storage` | `documentacion/datos.md` |
| `functions/`, premium, Stripe, notificaciones push | `documentacion/backend.md` |
| Gemini: lector de etiquetas, «¿Qué cocino?» | `documentacion/ia.md` |

Al terminar un cambio de un área, actualiza **su** documento (sin fechas ni «hasta el...»: la historia va en
el mensaje del commit). Este archivo solo cambia si cambia una regla general; si pasa de 200 líneas, algo de
él es de un área y se mueve. La versión larga anterior está en git (`f1c2ed3`) y en
`local/archivo/claude-md-2026-10-28.md`.
