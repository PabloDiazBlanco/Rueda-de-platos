# Mapa corporal

Léelo antes de tocar `ui/comun/mapa-corporal.jsx`, `ui/comun/mapa-trazados.js`, `logica/mapa-corporal.js`,
`ui/ajustes/licencias.jsx`, el `LICENSE` o `terminos.propiedadTexto`. Diseño:
`local/ideas/esteticas/v3-07-mapa-corporal.html` (camino 1).

Es la familia «reparto por músculo» del criterio de gráficas (sustituye a las barras por músculo). Se usa en
**Progreso** (grande, series de la semana; al tocar, también la media de las 4 anteriores), en la **ficha del
ejercicio** (principal y secundarios), en la **lista de rutinas** (pequeño, series previstas), en las series
por músculo del **resumen mensual** y al **terminar un entreno** y en su detalle (`MapaSesion`).

## Reglas de esta área (licencia)

- Los trazados de `ui/comun/mapa-trazados.js` son de **react-native-body-highlighter 3.2.0, licencia MIT,
  Copyright (c) 2022 ELABBASSI Hicham**, con el aviso MIT entero arriba. **No quites el aviso.**
- Ese aviso (texto A, aprobado por Pablo) va de la mano de otros tres textos que hay que mantener coherentes:
  - B: la sección «Licencias de terceros» de Ajustes (`ui/ajustes/licencias.jsx`), con la licencia MIT entera
    en inglés y las librerías que carga la app, con su licencia comprobada.
  - C: el párrafo de terceros del `LICENSE`.
  - D: la frase de `terminos.propiedadTexto` en los cinco idiomas.
- Hay una duda abierta con el autor (issue #102 de su repositorio). Si hubiera una reclamación, el plan B es
  el redibujado propio (camino 2 de la v3-07), sin construir: quitar los trazados y dibujar los propios.

## Cómo funciona

- **Trazados**: hombre y mujer, frente y espalda, con contorno.
- **Lógica** (`logica/mapa-corporal.js`, grupo «Cuerpo: mapa corporal»): `SLUG_A_GRUPO` lleva cada trazo a
  uno de los 14 grupos de la biblioteca (oblicuos y abdominales → abdomen; «upper-back» → dorsales; trapecio →
  espalda alta); escala de cinco verdes (0 · 1-3 · 4-6 · 7-9 · 10+); hombre o mujer según el sexo del perfil
  (sin sexo, hombre; `entreno.perfil` lo lleva a las pantallas de entreno). También `seriesDeRutina`,
  `valoresDeEjercicio` y `generoMapa`.
- **Componente** (`MapaCorporal`): grande (con rótulos, leyenda y la línea fija de lectura al tocar) o
  pequeño (64 px, sin interacción, lectura en su `aria-label`).
