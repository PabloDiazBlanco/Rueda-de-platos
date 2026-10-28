# Área Cuerpo

Léelo antes de tocar `ui/cuerpo/`, `ui/peso/`, `ui/estado/cuerpo.js`, `ui/estado/peso.js`,
`logica/informes.js`, `cuerpo-series.js`, `cuerpo-diario.js`, `periodo.js`, `peso.js` o
`resumen-mensual.js`. Decisiones: `local/ideas/esteticas/registro.md` («DECISIONES FINALES», bloque
CUERPO); maquetas `local/ideas/esteticas/v3-04-informes.html` a `v3-08-bascula.html` y el criterio de
gráficas, `local/ideas/esteticas/09-graficas.html`. El mapa corporal tiene su propio documento
(`mapa-corporal.md`).

## Archivos

- `ui/cuerpo/`: `informes.jsx` (`textosInforme`), `constructor.jsx`, `graficas.jsx`, `sueno.jsx`,
  `pasos.jsx`, `periodo.jsx` (`leerPeriodoLocal`).
- `ui/peso/`: `seguimiento.jsx` (seguimiento de peso, premium), `bascula.jsx`, `grafica.jsx`,
  `resumen-mensual.jsx`, `medidas.jsx` (solo el aviso de «próximamente»).
- `ui/entreno/aviso-actividad.jsx` y `aviso-grupos.jsx` (los avisos, que se ven en Entrenar).
- Estado: `ui/estado/cuerpo.js` (`useCuerpo`), `ui/estado/peso.js`.
- Lógica: `informes.js`, `cuerpo-series.js`, `cuerpo-diario.js`, `periodo.js`, `peso.js`,
  `resumen-mensual.js`.

## Reglas de esta área

- **Todo es solo lectura**: nada cambia objetivos ni menús. Alimentar el gasto con lo registrado tocaría
  `calcularObjetivosPerfil` y necesitaría antes su estudio en los PDF divulgativos.
- **Honestidad estadística**: una relación es una «pista»; mínimo 14 días o 6 semanas con las dos cosas;
  |r| < 0,2 sin relación, 0,2-0,4 débil, 0,4-0,6 pista, ≥ 0,6 clara. La interfaz siempre dice que no implica
  causa.
- **Un hueco es `null`, nunca un 0 inventado** (pasos vacíos = sin dato).
- **El período solo vive en el dispositivo** (`localStorage`), nunca en la nube.
- **Criterio de gráficas**: verde = lo tuyo, mostaza = referencia, óxido = fuera de rango, gris = sin dato;
  varias variables, en verde, naranja, ciruela y café. Tocar escribe el valor en una línea fija (`Lectura`);
  botón verde «Gráfica»; un solo selector de rango (1 mes · 3 meses · 1 año · Todo).
- Hambre y energía están **descartadas**: no existen como variables.
- Claves propias con su versión y migración en `logica/cuerpo-diario.js` (grupo «Cuerpo: sueño, pasos y
  favoritos» de `validacion/`): **no pasan por `migrateData`**.
- Si cambias la regla de días sugeridos de pesaje (`esDiaSugeridoPeso` en `logica/peso.js`), cámbiala también
  en `functions/sendWeighInReminders.js` (ver `backend.md`).

## Modelo de datos

| Clave | Contenido |
|---|---|
| `rueda-de-platos:cuerpo-diario-v1` | `{ version, dias: { "AAAA-MM-DD": { sueno?: { horas, calidad }, pasos? } } }` |
| `rueda-de-platos:informes-favoritos-v1` | `{ version, lista: [{ id, tipo: "pre" \| "cons", spec? }] }` (las estrellas, en la cuenta) |
| `localStorage` `fooddraft:periodo-v1:<uid>` | `{ version, regla[], relaciones[] }` (con el `window.cuentaId` que pone `auth-bootstrap.jsx`, para que otra cuenta del mismo móvil no lo vea) |

El peso vive en `data.pesoTracking` (clave principal, ver `datos.md`).

- El sueño va con la fecha del día en que uno **se despierta** («anoche» = hoy), para cruzarlo con la comida y
  el entreno de ese día. Horas de 3 a 11 de cuarto en cuarto; calidad, cinco caras guardadas como 2, 4, 6, 8
  y 10.
- No se crea ningún documento hasta que se apunta algo.

## Cómo funciona

- **La serie de cada día** (`construirSerie`, grupo «Cuerpo: la serie de cada día y la estadística honesta»):
  peso (sin atípicos), kcal y macros **solo de los días con todas las comidas marcadas y sus macros** (como
  `cumplimientoMacrosMes`), % de comidas hechas, entrenos, volumen (t), esfuerzo, duración, 1RM estimado por
  ejercicio, series por músculo, récords (por la fecha del índice), sueño, pasos y la fase del ciclo (**solo
  si se pasa el período**, que vive en el dispositivo: `leerPeriodoLocal`, con perfil de mujer). Como mucho
  dos años hacia atrás.
- **Informes cruzados** (`informes.jsx`, destino `cuerpo-informes`, premium; `INFORMES` en `informes.js`,
  grupo «Cuerpo: informes predefinidos y constructor»): 15, tres por cruce (comida × entreno, peso × comida,
  peso × entreno, ciclo) y tres de más de dos cosas. Los del ciclo (cuatro) solo con perfil de mujer
  (`informesVisibles`). Cada fila: pregunta, cifra, mini gráfica, botón «Gráfica» (hoja con rango, lectura al
  tocar, frase y de qué datos sale) y estrella. Panel de **favoritos** arriba. Cada informe devuelve solo
  números y qué dibujar; las frases están en `textosInforme`.
- **Constructor** (`constructor.jsx`, destino `cuerpo-constructor`, cuelga de la pestaña Informes, premium;
  `params.spec` abre un favorito): **frase con huecos**. 25 preguntas por temas (peso, comida, entreno,
  sueño, ciclo) que son cinco formas (`FORMAS`: tiempo, relación, categoría, tabla, juntas) con los huecos ya
  puestos, más la **pregunta libre** de 3 o 4 variables; con 3 o más, cinco vistas (apiladas, juntas, tabla,
  color, tiras). Cada hueco enseña su texto en la frase («el sueño») con el `select` nativo invisible encima.
  Las variables con parámetro: `rm:<ejercicioId>` y `series:<músculo>`.
- **Gráficas del área** (`ui/cuerpo/graficas.jsx`): las piezas del criterio de gráficas, `useSerieCuerpo` y
  los nombres de las variables. Las usa también Progreso del entreno.
- **Sueño** (`sueno.jsx`, destino `cuerpo-sueno`, en el menú lateral y como pestaña de la barra; gratis):
  deslizador y cinco caras, apuntar «anoche» de un toque (sale lo de la última vez), «Últimas 7 noches»
  (tocar una barra corrige esa noche), «Últimos 30 días» con la raya de 7 h (mínimo recomendado para
  adultos: AASM/SRS, Watson et al., 2015) y enlace al constructor.
- **Pasos** (`pasos.jsx`, al final de Actividad diaria, gratis): campo con −1000 / +1000 y barras de la
  semana. Solo para los informes; no cambian el gasto.
- **Báscula** (`ui/peso/bascula.jsx`, en el registro de peso): cinta bajo la línea roja, lupa donde se
  escribe, pies que se suben. Sin nada escrito, la cinta descansa en el peso del perfil (no en el del día: el
  ciclo abierto no enseña cifras). Con «reducir movimiento», sin animaciones.
- **Resúmenes** (`ui/peso/resumen-mensual.jsx`, gratis; pestaña «Resúmenes»): un mes cualquiera con un
  selector **Nutrición / Entreno** (B2; el lado elegido se recuerda en `localStorage`,
  `fooddraft:resumen-lado`). Nutrición: comidas hechas y objetivo, **cumplimiento de macros**
  (`cumplimientoMacrosMes`: de los días con todas las comidas marcadas y sus macros guardadas, en cuántos se
  llegó al 90 % del objetivo de proteína, carbohidratos y grasa) y Peso (premium, porque sale del
  seguimiento de peso), con botón «Gráfica» en Nutrición y Peso y la grasa en oliva. Entreno
  (`resumenEntrenoMes`, `entreno-calculo.js`): entrenos, días, volumen, tiempo, récords del mes, músculos más
  trabajados, comparación con el mes anterior y las series por músculo del mes en el mapa corporal.
- **Informes cruzados de antes** (K2): ya no se enseñan, pero `informeCruzadoMes` sigue en `informes.js` con
  sus casos (grupo «Informes cruzados»): entreno y peso, constancia en la comida en días con y sin entreno,
  declarado frente a registrado y mes frente a mes.
- **Aviso de actividad** (`ui/entreno/aviso-actividad.jsx`, en Entrenar y arriba de Actividad diaria; regla
  en `evaluarAvisoActividad`, grupo «Aviso de actividad»): mira las 3 últimas semanas completas; «menos» si
  en todas se registra menos de la mitad de lo declarado, «más» si en todas al menos 1,5 veces y 2 sesiones
  más. No avisa con menos de 4 sesiones registradas en total, en semanas de pausa, si está silenciado (28
  días) o si se cerró hace menos de 14 días. El estado vive en `catalogo.aviso` (`pausa`, `silenciadoHasta`,
  `descartadoEl`). Sin push.
- **Período** (I1; `ui/cuerpo/periodo.jsx`, destino `cuerpo-periodo`, gratis): pestaña de Cuerpo **solo si
  el perfil tiene sexo femenino** (`soloMujer`, ver `navegacion.md`). Calendario del mes para marcar días de
  regla y de relaciones, y siguiente inicio previsto = último inicio + distancia entre los dos últimos (28
  días con uno solo), sin más cálculo (`logica/periodo.js`). Aviso de que no es un método anticonceptivo.
- **Grupos sin entrenar** (G8; `ui/entreno/aviso-grupos.jsx`, solo en Entrenar; regla en `gruposSinEntrenar`,
  grupo «Aviso de actividad»): pecho, espalda, pierna, hombros y brazos (`GRUPO_DE_MUSCULO`; cuenta solo el
  músculo principal; abdomen y cardio, ninguno). Sale un grupo que se entrenaba y lleva 21 días o más sin
  hacerse, sacando la última vez del índice (y de la cola), sin leer meses. No avisa si no se ha entrenado
  nada en esas 3 semanas ni con una pausa en ellas. La ✕ guarda en `catalogo.aviso.grupos[grupo]` el día, y
  ese grupo no vuelve en 14 días. La ilustración de la tarjeta es provisional.
