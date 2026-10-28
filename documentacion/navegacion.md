# Navegación por áreas

Léelo antes de tocar `ui/marco/` (navegación, cabecera, menú lateral, barra inferior), `ui/pantallas.jsx`
o la navegación de `app.jsx`. El diseño y su porqué están en `local/ideas/gimnasio/03-diseno-modulo-entreno.md` (§3).

## Archivos

- `ui/marco/navegacion.js` (sin JSX): la única descripción de la navegación.
- `ui/pantallas.jsx`: `PANTALLAS`, la tabla destino → pantalla.
- `ui/marco/menu-lateral.jsx`, `ui/marco/barra-inferior.jsx`, `ui/marco/cabecera.jsx` (con `Shell`).
- `app.jsx`: estado `{ tab, params }`, última pantalla de cada área y la vuelta «← Gimnasio».

## Reglas de esta área

- **Al añadir una pantalla**: su destino en `PANTALLAS` y su sitio en `navegacion.js` (en el `incluye` de
  una pestaña, en el `menu` de un área o en `COMUNES`). Si se olvida, `validacion/` (grupo «Navegación por
  áreas») la marca como huérfana.
- **Al añadir una pestaña**: entrada en `pestanas` con icono de `lucide-react` (monocromo, de línea) y su
  etiqueta `barra.*` en los cinco idiomas. Caben cinco por área. El mismo grupo de `validacion/` comprueba
  que todas las claves de la navegación (y las de los prefijos `area.`, `barra.`, `entreno.`, `cuerpo.`...)
  existen en los cinco diccionarios.
- **Ninguna pantalla cambia por dentro** por la navegación: los destinos son los `tab` de siempre.
- Capas a pantalla completa: `useBloqueoScroll` (regla en el `CLAUDE.md` raíz). Las capas `z-index` están
  abajo.

## Cómo funciona

La app son tres **áreas** y una zona **común** sin área:

| Área | Clave | Qué tiene |
|---|---|---|
| FoodDraft | `fooddraft` | Nutrición: menús, catálogo, despensa, «¿Qué cocino?» |
| FitDraft | `entreno` | Entreno (la clave interna sigue siendo `entreno`) |
| Cuerpo | `cuerpo` | Peso, actividad diaria (con los pasos), sueño, informes, período, resúmenes. «Medidas» es solo un aviso de «próximamente» (`MedidasPlaceholderView`) |
| Común | — | Compartir, Ayuda y comentarios, Documentos, Premium, Ajustes, Perfil |

- `AREAS` (cada una con sus `pestanas` y su `menu`) y `COMUNES`. Una pestaña tiene un destino raíz y la
  lista de destinos que cuelgan de ella (`incluye`), escrita a mano. `areaDe(destino)` y
  `pestanaDe(destino)` dicen dónde cae cualquier pantalla. De aquí leen el menú lateral, la barra inferior y
  la cabecera.
- `navegar(destino, params)` abre una pantalla con datos (la ficha de un ejercicio concreto...);
  `setTab(destino)` navega sin datos. Las dos van en `ctx`, junto con `params`.
- **Última pantalla de cada área**: al tocar un área en el menú lateral se vuelve adonde se estaba
  (`localStorage`, `fooddraft:ultima-pantalla`); si no hay, a su primera pestaña. Una última pantalla
  recordada que ya no sea de su área se ignora. La app abre siempre en `menu`.
- **Solo con perfil de mujer**: lo marcado con `soloMujer` (la pestaña Período). La barra y el menú lateral
  filtran con `visibleCon(item, perfil)`. Con Período visible, Resúmenes sale de la barra de Cuerpo para que
  quepan cinco (`ocultaConPeriodo`); sigue en el menú lateral.
- **Menú lateral**: arriba las áreas, desplegables con todas sus funciones (la actual, resaltada y
  desplegada); abajo lo común, con Premium en mostaza. Un área sin pantallas no se lista.
- **Barra inferior**: píldora flotante de cristal claro (fondo `--cristal` al 60 % con desenfoque; fondo
  sólido sin `backdrop-filter` o con «reducir transparencia»), solo en las pantallas de un área. Solo la
  pestaña activa enseña su nombre (las demás, como `aria-label` y `title`); tocar una pestaña lleva a su
  raíz. Se esconde mientras un campo de texto tiene el foco (`useEscribiendo`: el teclado del móvil la
  subiría encima), y `<main>` deja libre abajo lo que ocupa (`RELLENO_BARRA`). Las variables del cristal
  están en `Shell`.
- **Cabecera**: el título grande dice el área («Tu recetario», «Tu entreno», «Tu cuerpo»; «Tu cuenta» en la
  zona común); el rótulo pequeño es «FoodDraft», salvo en FitDraft, que dice «FitDraft» (el `rotulo` de su
  entrada en `AREAS`; es una marca, no se traduce).
- **«← Gimnasio»**: `navegar(destino, params, { volver: true })` recuerda de dónde se viene, y `app.jsx`
  pinta arriba la vuelta mientras se siga en esa pestaña. Hoy solo lo usa el gimnasio dibujado (Progreso,
  Historial, Rutinas y la ficha de un ejercicio).
- **Cerrar sesión** (`ui/comun/cerrar-sesion.jsx`, con una confirmación breve) está en Ajustes y, en
  pequeño arriba a la derecha, en la pantalla de alta (asistente de perfil y cuestionario), por si se ha
  entrado con otra cuenta. Lo cierra `window.signOutUser` (`auth-bootstrap.jsx`).

## Capas (`z-index`)

| Capa | `z-index` |
|---|---|
| Gimnasio dibujado de Entrenar (fijo bajo la cabecera) · sus botones | 5 · 6-7 |
| Barra inferior · botón de cerrar sesión de la pantalla de alta (donde no hay barra) | 30 |
| Pastilla de entreno en curso | 31 |
| Menú lateral | 40 / 41 |
| Sesión de entreno, `CapaCompleta`, paneles de la nevera | 45 |
| Modales y mapa de la rutina (`ui/entreno/mapa-rutina.jsx`) | 50 |
| `HistoriaScreen` de `auth-bootstrap.jsx` («Por qué existe esta app») | 9999 |

Las capas a pantalla completa (sesión, `CapaCompleta`, paneles de la nevera) bloquean el scroll con
`useBloqueoScroll` (`ui/comun/bloqueo-scroll.js`), un contador común. El mapa de la rutina es también a
pantalla completa y todavía no lo usa (pendiente de la limpieza). El resto de `z-index` del código (cabecera
2, frutero y mosca 3, desplegable de idioma 5, piezas del gimnasio 4-7, puertas 1-2) son contextos locales.
