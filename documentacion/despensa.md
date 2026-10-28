# Despensa («¿Qué tengo?») y la cocina dibujada

Léelo antes de tocar `ui/despensa/`, `ui/estado/despensa.js`, `logica/despensa.js`, `logica/nevera.js` o
`logica/lista-compra-neta.js`.

## Archivos

- `ui/despensa/despensa.jsx`: la pantalla, con dos vistas del mismo contenido: **Dibujo** y **Lista**
  (`lista.jsx`). La vista elegida se recuerda en `localStorage` (`fooddraft:vista-despensa`).
- `ui/despensa/cocina.jsx` (la escena), `panel.jsx` (interior a pantalla completa, `MarcoPanel`),
  `editar.jsx` (fichas), `anadir.jsx`, `fregadero.jsx`, `detalles.jsx` (frutero, planta, mosca, lámpara),
  `dibujos.jsx` (SVG de la escena, `ESCENA_ANCHO`/`ESCENA_ALTO`, `FondoCocina`), `alimentos.jsx` (dibujo
  propio de los 43 alimentos base), `piezas.jsx` (`MarcaAlimento`, `emojiDe`), `tema.js` (colores).
- `ui/estado/despensa.js`: `useDespensa`. `logica/despensa.js`, `logica/nevera.js`,
  `logica/lista-compra-neta.js`.
- Diseño: `local/ideas/diseno-nevera/` (propuestas originales), `local/ideas/esteticas/v2-07-cocina.html`
  (detalles), `local/ideas/despensa-fase-a-plan.md`.

## Reglas de esta área

- **Clave propia** `rueda-de-platos:despensa-v1`, con su versión y su migración (`migrarDespensa`): **no
  pasa por `migrateData`**. Si cambia su forma, el parche va en `migrarDespensa` y su caso en
  `validacion/tests.js` (grupo «Despensa y lista de la compra neta»).
- **Qué va en cada hueco** (puerta, baldas, cajón, cesta...) **y con qué dibujo** lo decide
  `logica/nevera.js`, con sus casos (grupo «Colocación en la nevera»). La interfaz solo pinta lo que le llega
  de `useDespensa().huecos(zona)`. Si algo es una bebida (va a la puerta) se deduce del nombre: el catálogo
  no tiene carpeta de bebidas.
- **Los colores salen del tema** (`ui/despensa/tema.js`, hoy solo «retro»), nunca escritos a mano en los
  componentes: otro estilo sería una entrada nueva ahí. Dibujos en SVG propio, sin imágenes externas.
- **Al añadir un alimento a `FOODS_SEED`, dibújalo** en `ui/despensa/alimentos.jsx` (con su id como clave,
  caja de 48 × 48): el caso «Dibujo propio» de `validacion/` cuenta que estén todos.
- La fecha de cambio (`actualizado` de cada entrada) la pone **`sellarCambios` en `useDespensa`** con cada
  cambio, nunca cada operación por su cuenta.
- Todo se coloca en unidades del dibujo (`ESCENA_ANCHO` × `ESCENA_ALTO`) sobre un contenedor con esa misma
  proporción: la escena se escala entera con el ancho de la pantalla.
- **Reducir movimiento**: sin animaciones. El interior se abre al instante, la vitro navega sin esperar al
  fuego, el grifo llena la botella sin gota (si se desborda, todo aparece ya en el suelo y al recogerlo
  vuelve de golpe); la fruta no salta, la planta y la lámpara no se mueven (la luz solo parpadea) y la mosca
  aparece y desaparece sin volar; su mancha se quita sin fundido.
- Borrar un alimento del catálogo lo quita también de la despensa: `useCatalogo` recibe el aviso
  `alBorrarAlimento` y `app.jsx` lo conecta con `useDespensa` (los hooks no se importan entre sí).

## Modelo de datos

Lo que hay en casa, por zonas (despensa, nevera, congelador), en gramos aproximados; la verdura y la fruta
solo como «tengo / no tengo». Dentro de la misma clave: el menú confirmado (`menuConfirmadoId`), lo comprado
(`compras`), lo descontado por comida (`consumos`, por fecha y tipo de comida) y la lista de limpieza
(`limpieza`). Cada entrada lleva `actualizado`.

## Cómo funciona

**Relación con el Menú completo** (el Menú simple queda fuera y conserva su `calcularListaCompra` con
casillas en `data.listaCompraSimple`):
- **Un menú recién generado es un borrador** hasta que se confirma. Se guarda el id de `menu[0]`
  (`menuConfirmadoId`): sobrevive a ajustar raciones y vuelve a coincidir con «Deshacer».
- **La lista de la compra es neta** (`calcularListaNeta`): necesidad de las comidas *pendientes* menos lo que
  hay, agrupada por alimento. Antes de confirmar es provisional y sin casillas; después, tachar mete lo
  comprado en la despensa (`despensa.compras`) y destachar lo saca.
- **Completar una comida descuenta** lo que lleva (sin bajar de cero) y desmarcarla devuelve exactamente lo
  descontado (`despensa.consumos`). Una comida con consumo ya no cuenta como pendiente: nada se cuenta dos
  veces. Si se marca con «Cambié algo», se devuelve lo descontado antes y se descuenta lo comido de verdad
  (`necesidadesComidaReal`). Solo se descuenta con un menú confirmado.
- Las dos listas de la compra tienen el botón Compartir (ver `menu.md`).

**Queda poco** (`alertasStock`): lo acabado o con menos de una ración media (la media de los gramos con que
sale en los platos del usuario; si ningún plato lo usa, la cantidad por defecto de su carpeta) sale en rojo,
con un punto en el botón de su zona y un aviso arriba de «¿Qué tengo?» que se cierra hasta el día siguiente
(`localStorage`, `fooddraft:aviso-stock-cerrado`). Solo automático, sin mínimos a mano (decisión de Pablo).

**Limpieza y casa** (`despensa.limpieza`): lista de la compra de lo que no es comida, en texto libre, fuera
del catálogo y del menú. Se ve debajo del fregadero, en la vista de lista y al final de la lista de la
compra del Menú completo.

**Emoji de cada alimento** (F3, `food.emoji`, opcional): los de `FOODS_SEED` traen uno distinto cada uno (lo
completa `migrateData` en las cuentas existentes, sin pisar uno cambiado ni uno borrado a propósito, que se
guarda como `""`); el usuario lo cambia al editar el alimento (se queda el primer emoji de lo que escriba,
`primerEmoji`). Sin emoji, el de su carpeta (`emojiDe`). En la Lista sale en lugar del de la carpeta; en el
Dibujo, como una pegatina encima del dibujo genérico.

**Dibujo propio de los alimentos base**: los 43 de `FOODS_SEED` tienen su dibujo, que sustituye al genérico
de su forma **y** a la pegatina del emoji en la nevera, el estante, la Lista y «Añadir» (`MarcaAlimento`).
Lo decide `dibujoPropio(food, FOODS_SEED)` (`repartirEnHuecos` lo añade como `dibujo` a cada entrada): solo
los de la semilla, y no si el usuario les cambió el emoji (entonces manda el suyo; si lo borró, vuelve el
dibujo). Los que crea el usuario: forma + pegatina, o emoji en la Lista.

**Fecha de cambio**: hoy no la usa nada; es para el futuro aviso de revisar lo que lleva mucho sin tocarse
(idea F2).

**La vista Dibujo** es una cocina en tres capas: la nevera retro con su congelador y el estante de la
despensa (lo que guarda de verdad); la pared, la encimera y los muebles (decorado); y la vitrocerámica y el
grifo. Cada puerta gira sobre su bisagra con un pequeño rebote, se enciende la luz y el interior se abre a
pantalla completa (`panel.jsx`), con fichas que se tocan para cambiar cada cosa. La vitrocerámica enciende un
fuego y lleva a «¿Qué cocino?» al destino `cocinar-desde-cocina` (la misma pantalla que `cocinar`, pero
volviendo a «¿Qué tengo?»); el mueble de debajo del fregadero se abre como la nevera y guarda la lista de
limpieza.

**El grifo** es un juego: cada toque suelta una gota que llena una octava parte (`GOTAS_PARA_LLENAR`, en
`cocina.jsx`) de una botella de detergente verde a la que baja el sifón. Con la octava se desborda
(`derrame`: `"lleno"` → `"charco"`): la puerta del mueble se abre, la botella cae al suelo con hasta dos botes
de limpieza (uno por cosa pendiente de la lista) y queda un charco; tocar el charco (`"recogiendo"`) lo
devuelve todo a su sitio, la botella vacía y la puerta cerrada. El nivel se guarda en `localStorage`
(`fooddraft:agua-fregadero`) y vuelve a cero en cuanto se desborda: si se sale con el charco en el suelo, al
volver ya está recogido.

**Detalles que se tocan** (`detalles.jsx`; juguetes que no abren nada ni guardan nada):
- El **frutero**, en una repisa encima de la vitro (sin taparla: la vitro es el botón de «¿Qué cocino?»),
  enseña la fruta que hay en casa (`frutasDelFrutero`: nevera y despensa, no la congelada ni la acabada, cada
  una una vez, como mucho 5) y da un saltito al tocarlo.
- La **planta** de encima de la nevera solo se mueve si se toca; tras un número de toques al azar entre 4 y 9
  (otro cada vez) sale una **mosca** que vuela alrededor, se mata con un toque y deja una mancha verde oscura
  que se apaga en ~3 s (si no se le da, se esconde a los 6 s).
- La **lámpara** oscila al tocarla y se para sola; cada toque más la mueve más rápido y más amplio, hasta el
  doble (rAF con amortiguación, sin estado de React).
- Sus colores, en el tema (`mimbre`, `hoja`, `mosca`, `mancha`, `cable`...); sus textos, en el bloque
  `cocina.` de `logica/i18n.js`.
