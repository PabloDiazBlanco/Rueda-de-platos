# Menús: completo y simple

Léelo antes de tocar `ui/menu/`, `ui/estado/menu.js`, `logica/menu-generador.js`, `seleccion.js`,
`comida-calculo.js`, `comida-real.js` o el preentreno.

## Archivos

- `ui/menu/menu-completo.jsx` (`MenuView`) y `ui/menu/menu-simple.jsx` (`MenuSimpleView`).
- `ui/estado/menu.js`: `useMenu`, con `MENU_COMPLETO` y `MENU_SIMPLE`.
- `ui/menu/selector-dia.jsx` (`SelectorDia`, `TarjetaDia`), `estadisticas.jsx` (`DayStatsPanel`),
  `generando.jsx` (animación de generar), `detalle-comida.jsx`, `cambie-algo.jsx`, `lista-compra.jsx`,
  `historial.jsx`, `exportar.js` (`documentoMenu`).
- `ui/perfil/preentreno.jsx` y `recomendacionPreentreno` (`logica/objetivos.js`).
- El motor: `logica/menu-generador.js` (`generateMenu`), `logica/seleccion.js`.

## Reglas de esta área

- **Un solo hook para los dos menús** (`useMenu` con una configuración por menú): una mejora no puede llegar a
  uno y olvidarse en el otro. Generar o deshacer en uno nunca toca al otro.
- **Colores de los macros**, solo con las variables de `Shell`: `--macro-prot`, `--macro-grasa` (oliva, no
  mostaza: mostaza es «objetivo o referencia» en el criterio de gráficas) y `--macro-carb`, con `-texto` y
  `-suave` para las pastillas. Nunca el color a mano.
- «Cambié algo» y «Hecha» **no reajustan nada** del menú ni del ciclo: solo apuntan lo comido.
- El preentreno es una **recomendación** transparente: no toca el reparto de macros.
- `generateMenu` es aleatorio y no tiene casos con valores fijos en `validacion/` (sí sus piezas deterministas,
  como `allocateCounts`): al tocarlo, prueba aparte (ver «Verificar» en el `CLAUDE.md` raíz).
- **Del nombre guardado en el menú al ingrediente, siempre con su carpeta**: `ingredientePorNombre(data, nombre,
  carpeta)` (`comida-calculo.js`; la carpeta de cada hueco, `carpetaDeHueco`). Dos ingredientes de carpetas
  distintas pueden llamarse igual (el cuestionario crea «Tostadas» en desayuno y en merienda); un `find` solo
  por nombre mezcla sus composiciones.
- La lógica no escribe texto de interfaz: las notas de una fila de comida son códigos (`note: "mitad" |
  "ajusteFino"`) que traduce la interfaz (`menu.nota.*`); `mealExportParts` recibe el idioma.
- En el reparto exacto de comidas ligeras (`allocateCounts`), un peso 0 es 0: una opción al 0 % no sale.

## Modelo de datos

| Menú | Ciclo | Historial | Lista de la compra |
|---|---|---|---|
| Completo | `rueda-de-platos:menu-v1` | `rueda-de-platos:history-v1` (máx. 8 ciclos) | neta, calculada con la despensa (ver `despensa.md`) |
| Simple | `rueda-de-platos:menu-simple-v1` | `rueda-de-platos:history-simple-v1` | `data.listaCompraSimple`, con casillas |

Estos cuatro documentos no tienen `version` ni migración: si cambia la forma de un hueco del menú, añade
`version` en ese mismo cambio. Las comidas hechas viven en `data.comidasCompletadas[fecha][tipo]` (ver
«Hecha y Cambié algo»).

## Cómo funciona

- **Menú completo**: kcal, macros, raciones ajustables y comparación con los objetivos del día.
- **Menú simple**: solo el borrador de combinaciones, sin calorías ni gramos. Para no mostrar cantidades,
  `mealExportParts` y `calcularListaCompra` aceptan `{ conCantidades: false }`.
- **Preentreno** (D3): el perfil guarda `diasEntreno`, `horaEntreno` y `entrenoComida: { momento:
  "antes"|"despues", comida }` (se pregunta al final del asistente de alta y se edita en Actividad diaria).
  En los días de entreno, los dos menús enseñan una línea corta (`LineaPreentreno`): comer algo ligero antes,
  o que no hace falta si se entrena después de una comida.
- **Generar no es instantáneo** (C11): `useMenu.generar` calcula el menú igual que siempre pero lo enseña
  tras una espera al azar de 3 a 6 s (`ESPERA_GENERAR_MIN_MS`/`MAX_MS`), con la animación de
  `ui/menu/generando.jsx` en el sitio del menú y el botón desactivado. Con «reducir movimiento» se genera al
  momento. La animación es la cadena de tuppers: siete tuppers en la encimera de la cocina retro (colores de
  `ui/despensa/tema.js`, solo importado), uno por día, que un cucharón va llenando y que se cierran con un
  rebote, con frases (`menu.generando.frase1-4`), los segundos y una barra. Todo va en fracciones de la
  duración; el componente solo recibe `{ inicio, duracion }`.
- **Un día a la vez**: sin ilustración de fondo; `SelectorDia` y `TarjetaDia`. Al abrir, hoy (con un punto
  mostaza en su botón); los botones de día cambian a la vez la tarjeta de macros y las comidas. El día
  elegido vive en el estado de la pantalla, no se guarda.
- **Tarjeta de macros del Menú completo** (`DayStatsPanel`, la «A sin aro»): el anillo cuenta solo el reparto
  de kcal entre macros; debajo, la pastilla del % de kcal; a la derecha, una barra por macro contra su
  objetivo (raya mostaza en el 100 %, escala hasta el 130 %, óxido por encima del 110 %). Sin objetivos, las
  pastillas P/G/C. La tarjeta del día acaba con el total de kcal. Sal, azúcares y fibra son de la semana,
  debajo (`resumenNutrientesSemana`).
- **Hecha y «Cambié algo»** (B1+B3; solo Menú completo, el único que marca comidas): en el detalle de una
  comida, «Hecha» la da por buena y «Cambié algo» deja cambiar cada alimento por otro del catálogo propio
  (primero su carpeta, luego el resto; cantidad propuesta con las mismas kcal, redondeada sin pasar del
  ±10 %, editable) o marcar «no lo comí». Se marca para **hoy**, en `data.comidasCompletadas[fecha][tipo]`,
  con un registro `{ hecha: true, slotId, macros, cambios? }` (`registroComida`); los antiguos `true` los
  convierte `migrateData` en `{ hecha: true }`. Las kcal del día y de cada comida enseñan lo comido de verdad
  en las comidas con cambios (`totalesDiaReal`). La despensa descuenta lo comido de verdad.
- **Compartir** (`BotonCompartir`, `ui/comun/compartir.jsx`): el menú de la semana elegida y las dos listas
  de la compra se comparten como texto o como imagen (PNG dibujado en un `<canvas>`, sin librerías), con
  `navigator.share` y, donde no se puede, copiando el texto o descargando la imagen. Cada pantalla arma un
  «documento» (título, secciones y líneas) y la pieza común lo pasa a texto o lo dibuja. El del menú lo arma
  `documentoMenu`: en texto, cada comida con sus ingredientes (y gramos en el completo); en imagen, solo los
  platos (y las kcal en el completo). La imagen se prepara al abrir las opciones, no al elegir «Imagen»,
  porque Safari solo deja abrir el menú de compartir justo después de un toque. El menú no tiene versión
  imprimible; el seguimiento de peso y el catálogo de alimentos sí (`window.print`).

## Limitaciones conocidas

- Rachas: el motor sortea cada comida por separado y puede repetir el mismo carbohidrato o verdura varias
  veces seguidas (aparcado a propósito; `local/diagnostico-2026-10/07-datos-y-deuda.md`, B2).
