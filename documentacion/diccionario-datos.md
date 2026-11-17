# Diccionario de datos

Qué guarda FoodDraft de cada cuenta, campo a campo: qué es, en qué unidad, qué significa que falte, si es un dato
de salud, de dónde sale y si es una decisión que se sobrescribe o una medida con su fecha. Es la referencia de la
exportación completa de «Descargar mis datos», de los scripts de administración, de la política de privacidad, del
formulario de seguridad de datos de Google Play y de cualquier estudio futuro.

**Está sacado del código, no de la documentación.** Cada nombre de campo aparece aquí tal cual lo escribe la app
(se comprueba con una búsqueda en el código). Las fuentes principales: `firestore.rules` (qué claves y campos
acepta la nube), las semillas (`initialData`, `FOODS_SEED`, `EJERCICIOS_SEMILLA`), las migraciones (`migrateData`,
`migrarDespensa`, `migrarCatalogo`, `migrarIndice`, `migrarBorrador`, `migrarMes`, `migrarDiario`,
`migrarFavoritos`, `migrarPeriodo`), que dicen qué campos pueden faltar en una cuenta antigua, y los hooks de
`ui/estado/`, que dicen cómo se escribe cada cosa. Cómo se guarda físicamente (un JSON por clave, reglas,
migraciones): `datos.md`.

**Si cambia la forma de algo guardado, este documento cambia en el mismo commit.** Un diccionario que no dice lo
que hay es peor que ninguno: la exportación y los estudios se fiarían de él.

---

## Cómo leerlo

Cada tabla tiene una fila por campo. La ruta del campo se escribe como en el código: `perfil.altura`, `series[].kg`
(`[]` = cada elemento de una lista), `dias.<fecha>` (`<…>` = una clave variable de un objeto).

| Columna | Qué dice |
|---|---|
| **Tipo y unidad** | Texto, número, sí/no, lista, objeto. La unidad, siempre que la haya. |
| **Si falta** | Si el campo puede no estar (o ser `null`) y qué significa. **«Sin dato» no es 0**: se dice en cada caso. |
| **Salud** | **S**: dato de salud (RGPD art. 9). **s?**: de salud de forma indirecta o probable en esta app. **—**: no. **VS**: vida sexual (art. 9). Criterio de la auditoría de datos; la palabra final es jurídica. |
| **Origen** | **U**: lo escribe la persona. **A**: lo calcula la app. **I**: importado de otra app. **IA**: propuesto por Gemini y revisado por la persona. **S**: semilla de la app (igual para todos). **F**: lo escriben las funciones del servidor. **Sis**: lo pone el sistema (hora del servidor, ids). |
| **Clase** | **D**: decisión, se sobrescribe y el valor anterior se pierde. **M**: medida, un registro con su fecha que no se pisa. **E**: estado actual (un inventario: se sobrescribe, pero no es una decisión). **C**: calculado o caché, se puede rehacer. **T**: técnico o preferencia de uso. |
| **Para estudios** | Lo que le falta para servir a un estudio sin cambiar cómo guarda la app; «—» si nada. Los huecos con número (H1, H2…) se explican al final. |

### Fechas y horas: cuatro formas, ninguna con zona horaria

| Forma | Ejemplo | Dónde | Qué significa |
|---|---|---|---|
| Día local | `2026-03-03` | pesadas, comidas hechas, sueño, pasos, período, despensa, rutinas | El día del calendario **del aparato** en el momento de apuntarlo (`fechaISO`, `fechaLocal`). No dice en qué zona. |
| Instante ISO en UTC | `2026-03-03T17:55:00.000Z` | inicio y fin de un entreno, pausas, `generatedAt` de un menú | Un instante exacto. La hora local (¿18:55 o 17:55?) solo se puede saber con la zona, que no se guarda. |
| Milisegundos | `1772560500000` | `actualizado` del entreno, descanso en curso | Instante exacto, para decidir qué copia es más nueva. |
| Hora del servidor | marca de tiempo de Firestore | `actualizado` del buzón, `fecha` de las firmas, `premium.updatedAt` | La pone el servidor, no el aparato: no se puede falsear. |

Ningún campo guarda la zona horaria (hueco **H2**).

### Ids

- **Semillas, fijos y nunca reutilizados**: alimentos `f_…` (`FOODS_SEED`) y ejercicios `ex_…`
  (`EJERCICIOS_SEMILLA`). Son iguales en todas las cuentas: lo que permite juntar datos de distintas personas.
- **Creados por la app**, al azar (`uid()`: 8 caracteres en base 36), con un prefijo según lo que son: `f_` alimento
  propio, `exp_` ejercicio propio, `rt_` rutina, `ses_` sesión, `ei_` ejercicio dentro de una sesión, `sr_` serie,
  `ss_` superserie, `lot_` importación. Ingredientes, reglas, menús, pesadas y despensa, sin prefijo. Son únicos
  **dentro de la cuenta**, no en toda la app: dos cuentas pueden tener un `exp_` igual que no tienen nada que ver.
- **La persona**: el uid de Firebase (aleatorio, no se reutiliza aunque se borre la cuenta). No va dentro de ningún
  documento: es la carpeta `users/{uid}`.

---

## Mapa: dónde vive cada cosa

| Sitio | Qué hay | Sección |
|---|---|---|
| Firebase Authentication | Email, contraseña cifrada, proveedor, uid | [1](#1-authentication) |
| `users/{uid}` (Firestore) | Premium y cuotas de IA | [2](#2-usersuid-la-ficha-de-la-cuenta) |
| `users/{uid}/consentimientos/` | Firmas: edad, términos, salud | [3](#3-usersuidconsentimientos-las-firmas) |
| `users/{uid}/avisos/push` | Buzón de las notificaciones | [4](#4-usersuidavisospush-el-buzón-de-avisos) |
| `users/{uid}/keys/rueda-de-platos:data-v1` | Perfil, objetivos, peso, comidas hechas, catálogo de comidas, listas | [5](#5-data-v1-los-datos-principales) |
| `keys/…menu-v1`, `history-v1`, `menu-simple-v1`, `history-simple-v1` | Menús e historial de menús | [6](#6-menús) |
| `keys/…despensa-v1` | Lo que hay en casa | [7](#7-despensa-v1) |
| `keys/…entreno-catalogo-v1`, `entreno-indice-v1`, `entreno-borrador-v1`, `entreno-AAAA-MM-v1` | Todo el entreno | [8](#8-entreno) |
| `keys/…cuerpo-diario-v1`, `informes-favoritos-v1` | Sueño, pasos y favoritos de los informes | [9](#9-cuerpo) |
| `localStorage` del aparato | Período, copias del entreno, firma del buzón, comodidades | [10](#10-solo-en-el-aparato-localstorage) |

Todas las claves de `keys/` llevan delante `rueda-de-platos:` (nombre histórico). Las acepta `firestore.rules`
(`esClaveConocida`); no hay ninguna más.

---

## 1. Authentication

Lo guarda Firebase, no la app. La app solo lee el uid, el email, si está verificado y el proveedor.

| Campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| uid | Identificador de la cuenta | texto, 28 caracteres | nunca | — | Sis · T | Nunca sale a estudios: se sustituye por un seudónimo aleatorio |
| email | Correo de acceso | texto | nunca | — | U · D | Nunca sale a estudios |
| contraseña | Solo su huella cifrada (hash) | — | con Google no hay | — | U · D | Nunca |
| proveedor (`providerData`) | `password` o `google.com` (`window.authProvider` lo traduce a `password` / `google`) | texto | nunca | — | Sis · T | — |
| `emailVerified` | Si el email está comprobado | sí/no | nunca | — | Sis · E | — |
| nombre y foto de Google | Llegan solos al entrar con Google; la app no los usa | texto, URL | sin Google | — | Sis · E | Nunca |
| fechas de alta y último acceso (`metadata`) | `creationTime` se usa al verificar el correo | instante | nunca | — | Sis · M | La fecha de alta serviría como «día 0» de una persona en un estudio |

## 2. `users/{uid}`: la ficha de la cuenta

Solo la escriben las funciones del servidor; la app solo la lee. Si la cuenta nunca ha pagado ni usado la IA, el
documento no existe: **eso significa «nunca premium y cuota a cero»**, no un error.

| Campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| `premium.active` | Si la suscripción está activa | sí/no | sin documento = no | — | F · E | Útil como contexto (sesgo de la muestra). Sin historial de altas y bajas (H1) |
| `premium.pendiente` | Pago lento en curso (domiciliación) | sí/no | = no | — | F · E | — |
| `premium.stripeCustomerId`, `premium.subscriptionId` | Ids de Stripe | texto | sin pago | — | F · E | Nunca salen a estudios |
| `premium.updatedAt` | Última escritura del webhook | hora del servidor | sin pago | — | F · E | — |
| `usoFotos.mes`, `usoFotos.contador` | Fotos leídas por la IA ese mes (`AAAA-MM`, en UTC) | texto, número | nunca usado = 0 | — | F · C | Solo el mes en curso: el de antes se pisa |
| `usoCocinar.mes`, `usoCocinar.contador` | Igual, para «¿Qué cocino?» | texto, número | nunca usado = 0 | — | F · C | Igual |

## 3. `users/{uid}/consentimientos/`: las firmas

Un documento por firma; solo se crean, nunca se cambian ni se borran desde la app (detalle en `datos.md`). Al
retirar el consentimiento de salud se borra la cuenta entera, firmas incluidas.

| Documento · campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| `edad` · `tipo` | Siempre `edad` | texto | — | — | Sis · M | — |
| `edad` · `anioNacimiento` | Año declarado al firmar | número entero | nunca | — | U · M | En estudios, solo en tramos de 5 años |
| `edad` · `cumplidosEsteAnio` | Solo si cumple 18 este año: dijo que ya los ha cumplido | `true` | si no hizo falta preguntarlo | — | U · M | — |
| `edad` · `fecha` | Cuándo firmó | hora del servidor | nunca | — | Sis · M | — |
| `terminos-AAAA-MM-DD`, `salud-AAAA-MM-DD` · `tipo` | `terminos` o `salud` | texto | — | — | Sis · M | — |
| ídem · `version` | Versión del texto aceptado (`VERSIONES`); también va en el nombre del documento | texto `AAAA-MM-DD` | nunca | — | Sis · M | La futura firma de estudios irá igual |
| ídem · `fecha` | Cuándo firmó | hora del servidor | nunca | — | Sis · M | — |

## 4. `users/{uid}/avisos/push`: el buzón de avisos

Lo justo para que las funciones de notificaciones sepan a quién avisar. Es una **copia** de datos del perfil y del
peso: la fuente de verdad está en `data-v1`. Existe solo si hay algún aviso activado. Detalle en `datos.md`.

| Campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| `idioma` | Idioma de los avisos | `es`, `en`, `ca`, `gl`, `eu` | obligatorio | — | A · C | No hace falta: copia de `perfil.idioma` |
| `pesaje`, `descongelar` | Copia de los dos interruptores | sí/no | obligatorio | — | A · C | Copia |
| `tokens` | Hasta 10 aparatos para recibir avisos | lista de texto | obligatorio (puede ir vacía) | — | Sis · E | Nunca salen a estudios |
| `actualizado` | Última escritura de la app | hora del servidor | obligatorio | — | Sis · T | — |
| `pesoVecesSemana` | 2 o 3 pesadas a la semana | número o `null` | buzones antiguos; `null` = sin seguimiento o aviso apagado | — | A · C | Copia de `pesoTracking.vecesSemana` |
| `pesoPausado` | Ciclo de peso en pausa | sí/no | buzones antiguos | — | A · C | Copia |
| `ultimaPesada` | Día de la última pesada (nunca el peso) | día local o `null` | buzones antiguos; `null` = ninguna en el ciclo | s? | A · C | Copia |

---

## 5. `data-v1`: los datos principales

Un solo documento con todo lo que no tiene clave propia. Lleva `version` como las demás claves (era la única sin
ella, H11); su migración, `migrateData`, completa lo que falte mirando campo a campo. Una cuenta nueva empieza con
`initialData()` (versión, catálogo de alimentos, seguimiento de peso vacío y listas vacías); el perfil llega al
terminar el alta.

| Campo de primer nivel | Qué es | Si falta |
|---|---|---|
| `version` | Versión de la forma del documento (`VERSIONES.datos`, `logica/versiones.js`; `datos.md`, «Versiones y copias viejas de la app») | = 1 (lo de antes); `migrateData` la pone |
| `perfil` | Datos personales y decisiones (5.1) | Sin perfil: alta saltada o sin terminar. No se inventa nada |
| `perfilOnboardingDone` | El alta ya se terminó o se saltó | = no (se enseña el alta) |
| `objetivos` | Objetivos de kcal y macros (5.2) | Perfil incompleto: no hay objetivos |
| `pesoTracking` | Seguimiento de peso (5.3) | `migrateData` lo crea vacío |
| `comidasCompletadas` | Comidas hechas, por día (5.4) | `migrateData` lo crea vacío |
| `foods`, `ingredients`, `blocks`, `rules` | Catálogo de comidas y reglas del menú (5.5) | `migrateData` completa |
| `listaCompra`, `listaCompraSimple` | Lo marcado en las dos listas de la compra (5.6) | `migrateData` las crea vacías |

### 5.1 `perfil`

Todo se **sobrescribe** al guardar (Perfil, Actividad diaria, Reparto de comidas, Ajustes, el cierre de un ciclo de
peso): el valor anterior se pierde (H1).

| Campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| `perfil.nombre` | Cómo quiere que la llame la app | texto libre | puede ir vacío | — | U · D | Nunca sale a estudios |
| `perfil.sexo` | Para la fórmula de gasto y para enseñar el período | `mujer`, `hombre` | quien saltó el alta | — | U · D | — |
| `perfil.anioNacimiento` | Año de nacimiento | número entero | quien saltó el alta (entonces vale el de la firma de edad) | — | U · D | En tramos de 5 años |
| `perfil.altura` | Altura | número, **cm** (100-230 en el formulario) | quien saltó el alta | S | U · D | Sin historial (H1) |
| `perfil.peso` | Peso de referencia para los cálculos (no es una pesada) | número, **kg** (30-250, un decimal) | quien saltó el alta | S | U o A · D | Se pisa a mano o al cerrar un ciclo de peso si se acepta (`pesoActualizado`). Las medidas de verdad están en `pesoTracking` |
| `perfil.palBase` | Gasto del día a día sin contar el entreno | `escritorio`, `de_pie`, `exigente` (`PAL_BASE_NIVELES`) | perfiles muy antiguos usan `perfil.actividad` | s? | U · D | Sin historial (H1) |
| `perfil.actividad` | Selector único de antes de separar día a día y entreno | `sedentario`, `ligero`, `moderado`, `alto` | solo perfiles muy antiguos; se deja de usar al guardar con el formulario nuevo | s? | U · D | Heredado: la exportación lo saca tal cual |
| `perfil.entrenamientos[]` | Entrenos habituales: `tipo` (`TIPOS_ENTRENAMIENTO`: `pesas`, `correr`…), `horas` por sesión, `frecuenciaSemanal` | lista; horas en **h**, frecuencia en sesiones/semana | lista vacía = no entrena; las filas a medias no se guardan | s? | U · D | Es lo que se **declara**, no lo que se hace: lo hecho está en el entreno. Sin historial (H1) |
| `perfil.objetivo` | La fase | `mantenimiento`, `volumen`, `definicion` | = `mantenimiento` | s? | U · D | **La decisión más importante como contexto** y hoy no tiene historial (H1) |
| `perfil.calibracionKcal` | Ajuste fino aprobado al cerrar ciclos de peso | número, **kcal/día** | = 0, sin calibrar; se pone a 0 al cambiar de fase | s? | U+A · D | Los cambios quedan en parte en `historialCiclos` (5.3) |
| `perfil.presetComidas` | Reparto elegido | `clasico-4`, `sin-merienda-3`, `sin-desayuno-3`, `intermitente-2`, `cinco-5` | perfiles de antes: `clasico-4` | — | U · D | Sin historial (H1) |
| `perfil.repartoComidas` | Peso de cada comida en el día; las claves son los `mealType` en español (`Desayuno`, `Media mañana`, `Comida`, `Merienda`, `Cena`) | objeto, fracciones que suman 1 | perfiles de antes: el clásico | — | U · D | Sin historial (H1) |
| `perfil.diasEntreno` | Días de la semana en que entrena (nombres de `DAYS`, en español) | lista | lista vacía = no lo ha dicho | — | U · D | Es lo que se declara; sin historial (H1) |
| `perfil.horaEntreno` | Franja | `manana`, `tarde`, `noche` | `null` = no lo ha dicho (nunca se inventa) | — | U · D | Sin historial (H1) |
| `perfil.entrenoComida` | Antes o después de qué comida: `{ momento: antes \| despues, comida }` | objeto | `null` = no lo ha dicho | — | U · D | Sin historial (H1) |
| `perfil.avatar` | Dibujo del gimnasio | `mujer`, `hombre` | se pone según el sexo | — | U · T | — |
| `perfil.idioma` | Idioma de la app | `es`, `en`, `ca`, `gl`, `eu` | perfiles de antes: `es` | — | U · T | — |
| `perfil.notificacionesPush` | Recordatorio de pesaje activado | sí/no | = no | — | U · T | — |
| `perfil.avisoDescongelar` | Aviso para descongelar activado | sí/no | = no | — | U · T | — |

### 5.2 `objetivos`

**Calculado** por `calcularObjetivosPerfil` cada vez que se guarda el perfil o se cierra un ciclo de peso con
cambios. No se edita a mano. Se sobrescribe entero (H1), y no dice con qué versión de las fórmulas se calculó (H12).
Si el perfil está incompleto no hay objetivos (no se calcula «a medias»). Todos son por día.

| Campo | Qué es | Unidad |
|---|---|---|
| `objetivos.kcal`, `prot`, `fat`, `carb` | Objetivo diario | kcal; g |
| `objetivos.bmr`, `kcalBase`, `kcalEntrenamiento`, `kcalMantenimiento` | Pasos del cálculo (metabolismo basal, día a día, entreno, mantenimiento) | kcal |
| `objetivos.objetivo` | Fase con la que se calculó | como `perfil.objetivo` |
| `objetivos.ajustePct` | Ajuste total aplicado (fase + calibración, con su tope) | % |
| `objetivos.calibracionKcal` | Calibración usada | kcal |
| `objetivos.fatFloor`, `carbMin` | Suelo de grasa y mínimo de carbohidrato | g (`carbMin` es `null` sin entreno habitual) |
| `objetivos.carbMinNotMet` | No se pudo llegar al mínimo de carbohidrato | sí/no |

Salud: s?. Origen: A. Clase: C (se puede rehacer desde el perfil **de ese momento**, que no se guarda).

### 5.3 `pesoTracking`

Las pesadas son **medidas**: no se borran nunca (al cerrar un ciclo pasan de `entradas` a `historial`). Todo lo
demás es configuración (decisión) o estado del ciclo en curso.

| Campo | Qué es | Tipo y unidad | Si falta | Salud | Origen · clase | Para estudios |
|---|---|---|---|---|---|---|
| `vecesSemana` | Pesadas a la semana | 2 o 3 | = 3 | — | U · D | Sin historial (H1) |
| `duracionSemanas` | Semanas de cada ciclo | 2, 3 o 4 | = 3 | — | U · D | Sin historial (H1) |
| `cicloInicio` | Primer día del ciclo en curso | día local | `null` = sin ciclo abierto | — | A · E | — |
| `entradas[]` | Pesadas del ciclo en curso (misma forma que `historial[]`) | lista | vacía | S | U · M | — |
| `historial[]` | Todas las pesadas de los ciclos ya cerrados | lista | `migrateData` la crea vacía | S | U · M | — |
| ↳ `id` | Id de la pesada | texto | — | — | Sis | — |
| ↳ `fecha` | Día de la pesada: **siempre hoy**, no se puede apuntar un día pasado | día local | — | S | Sis · M | Sin hora ni zona (H2, H10) |
| ↳ `peso` | El peso | número, **kg** | — | S | U · M | Sin campo de fuente: hoy siempre a mano (H5). Corregir la de hoy la sobrescribe |
| ↳ `atipico` | Marcada como atípica al guardarla (más de un 1,5 % de cambio) | sí/no | — | S | U · M | — |
| ↳ `motivo` | Motivo de la atípica: clave fija (`Enfermedad`, `Viaje`, `Regla / retención de líquidos`, `Comida muy copiosa o salada`, `Otro`, `Sin especificar`), en español y traducida al mostrarla | texto | `""` si no es atípica | S | U · M | Utilizable (no es texto libre) |
| `pausas[]` | Pausas del ciclo en curso: `inicio`, `fin`, `motivo` | días locales; `motivo` **texto libre** | `fin: null` = pausa abierta | s? | U · M | El motivo, fuera de los estudios (texto libre) |
| `historialCiclos[]` | Resumen de cada ciclo cerrado, el más reciente primero | lista | — | s? | A+U · M | **Solo guarda los 12 últimos** (H9) |
| ↳ `inicio`, `fin` | Primer y último día del ciclo | días locales | — | — | A · M | — |
| ↳ `pctSemana` | Tendencia calculada | % del peso por semana | `null` = menos de 2 pesadas normales | S | A · M | — |
| ↳ `nivel` | Evaluación (`optimo`, `aviso`, `accion`, `ineficaz`, `direccion-contraria`) | texto | `null` en mantenimiento o sin tendencia | s? | A · M | — |
| ↳ `ajusteKcalAplicado` | Calibración que la persona aceptó | kcal/día | 0 = no aceptó o no había sugerencia | s? | U · M | Es lo más parecido a un historial de decisiones que hay hoy |
| ↳ `pesoActualizado` | Si se cambió `perfil.peso` con la última pesada | sí/no | — | — | U · M | — |
| ↳ `pausas` | Las pausas de ese ciclo | lista | — | s? | U · M | — |
| `recordatorioDescartadoFecha` | Día en que se cerró el aviso de pesarse | día local | `null` | — | U · T | — |

### 5.4 `comidasCompletadas`

`comidasCompletadas.<fecha>.<mealType>`: una entrada por comida marcada como hecha. `<fecha>` es el día local **en
que se marcó** (la app solo deja marcar hoy) y `<mealType>`, el tipo de comida en español. Salud: S (ingesta real).
Origen: U (y A para las macros). Clase: M. Crece unos 150 KB al año dentro de `data-v1` (H8).

| Campo | Qué es | Tipo y unidad | Si falta | Para estudios |
|---|---|---|---|---|
| `hecha` | Comida hecha | `true` | — | **No existe el «no la hice»**: una comida sin entrada puede ser no comida o no apuntada (H7) |
| `slotId` | Qué comida del menú era | id del menú | registros antiguos (`{ hecha: true }` a secas) | Apunta a un menú que puede haber desaparecido (H3) |
| `macros.kcal`, `macros.prot`, `macros.fat`, `macros.carb` | **Lo comido de verdad**, con los cambios aplicados | kcal; g (un decimal) | registros antiguos: sin detalle | No guarda lo planificado al lado (H7) |
| `cambios.<línea>` | Lo cambiado en cada línea de la comida: `{ foodId, gramos }` o `{ omitido: true }` | objeto; g | solo si hubo cambios | `foodId` apunta al catálogo propio de la cuenta |

### 5.5 Catálogo de comidas: `foods`, `ingredients`, `blocks`, `rules`

Todo **decisión** (se sobrescribe) y nada de salud directa, aunque una dieta puede revelar de forma indirecta
religión o salud (alergias, celiaquía).

**`foods[]`, alimentos con sus macros por 100 g.** Los de la semilla (`FOODS_SEED`, ids `f_…` fijos) llegan a todas
las cuentas y `migrateData` añade los nuevos sin pisar los editados. Los propios llevan `f_` + `uid()`.

| Campo | Qué es | Tipo y unidad | Si falta | Para estudios |
|---|---|---|---|---|
| `id` | Id del alimento | texto | — | Los de la semilla son comunes a todas las cuentas; los propios, no |
| `name` | Nombre (dato del usuario, no se traduce) | texto | — | Los nombres propios identifican: fuera de los estudios |
| `categoria` | Carpeta (`CATEGORIAS_ALIMENTOS`: `proteinas`, `carbohidratos`…) | texto | alimentos propios muy antiguos | Sirve para agrupar sin nombres |
| `emoji` | Dibujo propio | texto | `""` = el de la carpeta | — |
| `kcal`, `prot`, `fat`, `carb` | Por 100 g | kcal; g | **un campo vacío se guarda como 0** (H4) | No distingue «0» de «no lo sé» |
| `grasaSaturada`, `azucares`, `fibra`, `sal` | Por 100 g | g | sin el campo = sin dato (bien) | — |
| `fuente` | De dónde sale el dato: `Estándar`, `Etiqueta`, `Manual`, `Foto (IA) — revisar` o lo que escriba la persona | **texto libre** | — | Útil, pero no es una lista cerrada (H5) |

**`ingredients[]`, lo que el motor sortea en cada carpeta del menú.**

| Campo | Qué es |
|---|---|
| `id`, `name` | Id y nombre (dato del usuario) |
| `category` | Carpeta del menú (proteína, carbo, verdura, plato cerrado, desayuno…) |
| `ruleType` | `frecuencia`, `probabilidad` o `bloque_miembro` |
| `freqCantidad`, `freqPeriodo` | Veces por `semana` o por `ciclo` (dos semanas), con `frecuencia` |
| `probabilidad` | % de salir, con `probabilidad` |
| `active` | Si entra en el sorteo |
| `foodId`, `gramos` | Alimento del catálogo y gramos por ración (g) |
| `composicion[]` | Plato compuesto: `{ id, foodId, gramos }` por alimento |
| `cantidad` | Texto libre de la cantidad («una lata») |
| `blockId`, `peso` | Bloque al que pertenece y un peso heredado que hoy no usa el motor |

**`blocks[]`, grupos que se reparten juntos** (heredados: las cuentas nuevas no los crean): `id`, `name`,
`category`, `cicloFrecuencia`, `weeklyPattern`, `distribucion`.

**`rules[]`, reglas de combinación**: `id`, `itemIds` (2 a 4 ids de ingredientes) y `level` (`nula`, `baja`,
`alta`, `maxima`).

Para estudios: el catálogo no sale (como mucho, sus carpetas). Sin historial (H1).

### 5.6 `listaCompra`, `listaCompraSimple`

`marcados` (las filas tachadas: `{ <fila>: true }`) y `generadoEn` (el `generatedAt` del menú al que pertenece).
Una por cada menú. Clase T. Sin interés para estudios.

---

## 6. Menús

Cuatro claves: el menú completo (`menu-v1`) y su historial (`history-v1`), y lo mismo del menú simple
(`menu-simple-v1`, `history-simple-v1`). Son **lo planificado** de la nutrición. Se guardan como una lista suelta,
sin campo `version` (cuenta como la 1) ni migración (H3); la app ya lee también el sobre `{ version, slots }` (menú) y
`{ version, lista }` (historial), pero aún no lo escribe (`datos.md`, «Versiones y copias viejas de la app»). Salud:
s? (una dieta). Origen: A (el motor, con lo que decide la persona). Clase: C para el menú
en curso (se rehace al generar) y M para el historial.

**El menú** es una lista de huecos (dos semanas × los días × las comidas del reparto). No lleva fecha: el
`generatedAt` está solo en el historial.

| Campo de cada hueco | Qué es | Tipo y unidad | Si falta |
|---|---|---|---|
| `id` | Id del hueco (lo que guarda `slotId` al marcarlo hecho) | texto | — |
| `week`, `day`, `mealType` | Semana 1 o 2, día (`DAYS`, en español) y comida | número, texto | — |
| `protein`, `carbo`, `verdura`, `closedDish`, `item` | Lo que sale, **por nombre** de ingrediente | texto | `null` = esa parte no va |
| `garbanzos` | Lleva garbanzos | sí/no | — |
| `grasaExtra` | Grasa añadida para cuadrar: `{ nombre, foodId, gramos }` | objeto; g | sin grasa extra |
| `raciones` | Raciones ajustadas a los objetivos (`protein`, `carbo`, `closedDish`, `item`); la persona puede cambiarlas | objeto, número de raciones | = 1 ración |

**El historial**: lista de `{ id, generatedAt, slots }`, el más reciente primero, **con los 8 últimos** (H9).
`generatedAt` es un instante ISO en UTC. Los huecos guardan cómo se generó el menú, sin los cambios de raciones
posteriores.

Para estudios: lo planificado se identifica por nombres que la persona puede cambiar (H3), y lo comido no lleva al
lado lo que se planificó (H7).

---

## 7. `despensa-v1`

Qué hay en casa. **Estado** (se sobrescribe), no medidas: sirve para la lista de la compra neta, no como registro de
consumo. Salud: —. Origen: U (y A al descontar comidas). `version: 1`, migración `migrarDespensa`.

| Campo | Qué es | Tipo y unidad |
|---|---|---|
| `items[]` | `{ id, foodId, zona, gramos, actualizado }` o, para verdura y fruta, `{ id, foodId, zona, tengo, actualizado }` | `zona`: `despensa`, `nevera`, `congelador`; **g** aproximados; `tengo` sí/no; `actualizado`: día local del último cambio |
| `menuConfirmadoId` | Menú con el que cuadran los descuentos | id o `null` |
| `consumos.<fecha>.<mealType>` | Lo descontado al marcar una comida: `{ slotId, items: [{ itemId, foodId, zona, gramos }] }` | g; se recorta al confirmar otro menú |
| `compras.<fila>` | Lo sumado al tachar en la lista: `{ itemId, delta, creado }` | g |
| `limpieza[]` | Lista de la compra de lo que no es comida: `{ id, nombre, comprado }` | texto libre |

Para estudios: no sale (ni la limpieza, que es texto libre).

---

## 8. Entreno

Cuatro tipos de clave, cada una con `version: 1` y su migración (`migrarCatalogo`, `migrarIndice`,
`migrarBorrador`, `migrarMes`). Unidades: **siempre kg, km y segundos**; las libras y millas son solo de pantalla
(`ajustes.unidadPeso`). Salud: s? en general (rendimiento físico), **S** cuando se cruza con peso o sueño; las notas
libres pueden contener cualquier cosa.

### 8.1 Respuestas cortas

- **Ids de ejercicio.** Los de la biblioteca común (`ex_…`, 80, `EJERCICIOS_SEMILLA`) son fijos y no se reutilizan:
  para quitar uno habría que ocultarlo, no borrarlo. Los propios (`exp_` + `uid()`) son únicos dentro de la cuenta;
  un propio con sesiones **no se borra, se archiva** (`archivado`), así que su id tampoco se reutiliza.
- **Propios frente a comunes.** Un propio no guarda ninguna relación con un común (H6): lleva su `nombre`, su
  `tipo`, su `musculo`, sus `secundarios` y su `equipo`, pero no «se parece a `ex_…`». Al importar de otra app, lo
  que se empareja por nombre usa el id común; lo que no, se crea como propio con `musculo: null` y `equipo: otro`.
- **Planificado frente a hecho.** Hoy **no se guarda lo planificado** (H7):
  - Al terminar, se guardan solo las series hechas; las planificadas que no se hicieron desaparecen.
  - La sesión guarda `rutinaId`, pero no copia la plantilla de la rutina, y la rutina se puede sobrescribir después
    con los valores del día (`aplicarARutina`).
  - Con `ajustes.precargar` las series salen rellenas con lo de la última vez: no se sabe si la persona tecleó el
    valor o lo dejó como estaba.
  - Sí se guarda «sustituir solo hoy» (`sustituyeA`).
- **Fechas.** `inicio`, `fin` y las pausas son instantes ISO en UTC: el instante es exacto, pero **la zona no se
  guarda** (H2). El día y el mes del entreno (y la clave del mes) se calculan en la hora del aparato. Lo importado
  se interpreta en la zona del aparato que importa.

### 8.2 `entreno-AAAA-MM-v1`: las sesiones terminadas

Un documento por mes: `{ version, mes, sesiones }`. El mes es el del inicio, en hora local. **Medidas**: cada sesión
es un registro con fecha que solo cambia si la persona la edita (`actualizado` dice cuándo).

| Campo de la sesión | Qué es | Tipo y unidad | Si falta | Origen · clase | Para estudios |
|---|---|---|---|---|---|
| `id` | Id de la sesión | `ses_…` | — | Sis | — |
| `nombre` | Nombre (el de la rutina o el que se escriba) | texto libre | puede ir vacío | U · M | Fuera de los estudios |
| `rutinaId` | Rutina de la que salió | `rt_…` | `null` = entreno libre o importado | U · M | Sin la plantilla de entonces (H7) |
| `inicio`, `fin` | Comienzo y final | instante ISO (UTC) | nunca; importado sin fin: **`fin` = `inicio`** (duración 0, H4) | Sis/U · M | Sin zona (H2) |
| `pausas[]` | `{ inicio, fin }` del cronómetro | instantes ISO | lista vacía | Sis · M | — |
| `esfuerzo` | «¿Qué tal ha ido?» | 1 a 5 | `null` = no contestado | U · M | — |
| `nota` | Nota de la sesión | texto libre | `""` | U · M | Fuera de los estudios |
| `gimnasio` | Dónde se entrenó | texto libre | `null` | U · M | Ubicación aproximada: fuera de los estudios |
| `origen` | `app`, `importado:hevy`, `importado:lyfta` | texto | — | Sis · M | Es el campo de fuente que pide H5: ya está |
| `lote` | Importación de la que vino | `lot_…` | `null` = de la app | Sis · M | — |
| `actualizado` | Última escritura (para fusionar copias) | ms | — | Sis · T | — |
| `ejercicios[]` | Los ejercicios, en orden | lista | — | | |

| Campo de cada ejercicio | Qué es | Tipo y unidad | Si falta |
|---|---|---|---|
| `inst` | Id de esta aparición (el mismo ejercicio puede salir dos veces) | `ei_…` | — |
| `ejercicioId` | Qué ejercicio | `ex_…` o `exp_…` | — |
| `sustituyeA` | El que se cambió «solo hoy» | id | `null` |
| `nota` | Nota del ejercicio | texto libre | `""` |
| `descansoSeg` | Descanso que tocaba | s | `null` en lo importado |
| `superserie` | Grupo de superserie (los seguidos con el mismo id) | `ss_…` | `null` |
| `series[]` | Las series **hechas** | lista | — |

| Campo de cada serie | Qué es | Tipo y unidad | Si falta | Para estudios |
|---|---|---|---|---|
| `id` | Id de la serie | `sr_…` | — | — |
| `tipo` | `normal`, `calentamiento`, `fallo`, `drop` | texto | — | El calentamiento no cuenta para volumen ni récords |
| `kg` | Peso. **Ojo**: en ejercicios `pareja` (dos mancuernas) es el de **una**; en `asistido_reps` es la **ayuda** (más kg = más fácil); en `lastre_reps`, el lastre | **kg** | `null` = ese tipo no lleva peso | La conversión a carga real depende del ejercicio: va en la exportación |
| `reps` | Repeticiones; en una serie unilateral, las del **lado más débil** | número | `null` = ese tipo no las lleva | — |
| `seg` | Duración | s | `null` | — |
| `km` | Distancia | km | `null` | — |
| `rir` | Repeticiones en reserva | número | `null` = no anotado; **sin la columna activada (`ajustes.mostrarEsfuerzo`) nunca se anota** | `null` no es 0 |
| `hecha` | Siempre `true` en lo guardado | sí/no | — | Las no hechas no se guardan (H7) |
| `lados`, `repsIzq`, `repsDer` | Serie unilateral con las repeticiones de cada lado | sí/no; número | sin el campo = no dividida | — |

### 8.3 `entreno-catalogo-v1`: ejercicios propios, rutinas y ajustes

Todo **decisión** (se sobrescribe; H1).

| Campo | Qué es | Tipo y unidad | Si falta |
|---|---|---|---|
| `propios[]` | Ejercicios propios: `id`, `nombre` (texto libre), `tipo` (`TIPOS_EJERCICIO`), `musculo` y `secundarios` (`GRUPOS_MUSCULARES`), `equipo` (`EQUIPOS`), `pareja`, `unilateral`, `creado` (día local), `archivado`, y si se importaron, `importado` y `lote` | lista | `musculo: null` en los importados sin emparejar |
| `personalizados.<id>` | Lo cambiado de cualquier ejercicio: `favorito`, `notaFija`, `descansoSeg` (s) | objeto | sin personalizar |
| `rutinas[]` | `id`, `nombre`, `carpeta`, `actualizado` (día local) y `ejercicios[]`: `{ ejercicioId, descansoSeg, nota, superserie, series[] }`, con cada serie como plantilla `{ tipo, kg, reps, seg, km }` | lista | `carpeta: null` = sin carpeta |
| `ajustes` | `unidadPeso` (`kg`/`lb`), `unidadDistancia`, `precargar`, `mostrarEsfuerzo`, `descansoSeg`, `descansoCalentamientoSeg` (s), `inicioSemana` (1 lunes, 0 domingo), `sonido`, `vibracion`, `gimnasio` (habitual, texto libre), `paseoDescanso` | objeto | `migrarCatalogo` completa |
| `aviso` | Aviso de «sin entrenar»: `pausa` (`{ desde, hasta }`, días locales), `silenciadoHasta`, `descartadoEl`, `grupos` (por grupo muscular, el día en que se cerró) | objeto | `null` = nada |
| `importaciones[]` | `{ lote, app, fecha, sesiones }` de cada importación | lista | vacía |

Para estudios: `aviso.pausa` dice cuándo alguien declaró un parón (contexto útil), pero solo el último. Las rutinas
son lo planificado y se pisan (H1, H7).

### 8.4 `entreno-indice-v1`: el índice (caché)

**Calculado** a partir de los meses: se puede reconstruir siempre (Ajustes → «Recalcular récords e historial»). Sirve para
saber qué meses existen sin listar la colección. La exportación no lo necesita para nada salvo para encontrar los
meses.

| Campo | Qué es |
|---|---|
| `version`, `calculo` | Versión del documento y de la regla de los récords (`CALCULO_INDICE`) |
| `meses.<AAAA-MM>` | Sesiones de cada mes |
| `ejercicios.<id>` | `ultima` (`{ sesionId, fecha, inicio, series }`), `records` (por clave: `pesoMax`, `e1rm`, `mejorSerie`, `volumenSesion`, `repsSerie`, `repsSesion`, `segMax`, `kmMax`, cada uno con `valor`, `fecha` y `sesionId`) y `sesiones` |
| `rutinas.<id>` | La última sesión de cada rutina: `{ sesionId, fecha, inicio, ejercicios }` |

Ojo: los récords con peso corporal usan `perfil.peso` de **hoy**, no el de aquel día.

### 8.5 `entreno-borrador-v1` y las copias del aparato

`{ version, sesion }`, con `sesion: null` si no hay entreno en curso. La sesión en curso tiene la forma de 8.2 más
`descanso` (`{ inicio, hasta, inst, avisado }`, en ms) y series aún sin hacer (`hecha: false`). Es lo único donde lo
planificado convive con lo hecho, y se pierde al terminar (H7). Copias en el aparato: sección 10.

---

## 9. Cuerpo

### 9.1 `cuerpo-diario-v1`: sueño y pasos

`{ version, dias }`, con `dias.<fecha>` = `{ sueno?, pasos? }`. Un día sin nada no se guarda. **Medidas**, a mano.
Salud: S. Migración `migrarDiario`.

| Campo | Qué es | Tipo y unidad | Si falta | Para estudios |
|---|---|---|---|---|
| `<fecha>` | Día. El sueño va en el día en que uno **se despierta** | día local | — | Sin zona (H2) |
| `sueno.horas` | Horas dormidas | h, de cuarto en cuarto, **recortadas a 3-11** | sin `sueno` = sin dato | Lo de fuera del rango se guarda como el borde (H4). Sin fuente (H5) |
| `sueno.calidad` | Cara elegida | 2, 4, 6, 8 o 10 (escala 1-10) | `null` = no la puso | — |
| `pasos` | Pasos del día | entero, 0-100 000 | sin el campo = sin dato; **0 es «no anduve»** | Sin fuente (H5) |

### 9.2 `informes-favoritos-v1`

`{ version, lista }`: informes con estrella, `{ id, tipo: pre | cons, spec? }`, con `spec` = `{ pregunta, huecos,
periodo, vista }` en los montados en el constructor. Preferencia (T); sin interés para estudios.

---

## 10. Solo en el aparato (`localStorage`)

No llegan a la nube: una exportación hecha desde otro aparato no los tiene. Las que llevan `:<uid>` son de una
cuenta y se borran con «Eliminar cuenta» en ese aparato.

| Clave | Qué es | Salud | Para estudios |
|---|---|---|---|
| `fooddraft:periodo-v1:<uid>` | Período: `{ version, regla, relaciones }`, dos listas de días locales (`migrarPeriodo`) | **S** (regla) y **VS** (`relaciones`: días con relaciones sexuales) | La regla, solo con un consentimiento propio; `relaciones`, nunca |
| `fooddraft:entreno-borrador:<uid>` | Copia inmediata del borrador del entreno | s? | Copia |
| `fooddraft:entreno-pendientes:<uid>` | Sesiones terminadas aún sin confirmar en la nube (misma forma que 8.2) | s? | Copia: lo que haya aquí aún no está en la nube |
| `fooddraft:buzon-avisos:<uid>` | Lo último que este aparato escribió en el buzón | — | Técnica |
| `fooddraft:verificacion-enviada:<uid>`, `fooddraft:push-token-v1-borrado:<uid>`, `rueda-de-platos:migrated:<uid>` | Marcas técnicas | — | — |
| `fooddraft:avisos-estrenar-token`, `fooddraft:idioma`, `fooddraft:ultima-pantalla`, vistas, avisos y juegos | Comodidades del navegador, sin cuenta (lista en `datos.md`) | — | — |

---

## 11. Fuera de este diccionario

Solo se nombran: **Stripe** (cliente, pagos y facturas, en su portal), los **registros de las Cloud Functions**
(Cloud Logging) y las **copias de seguridad** de Firestore. Tampoco la clave retirada `push-token-v1`, que la app
solo borra.

---

## 12. Huecos encontrados

Lo que obliga a cambiar algo **antes del lanzamiento** si se quiere que los datos sirvan para estudios. La columna
§4.3 los enlaza con la tabla de huecos de la auditoría de datos (`local/auditoria-2026-11/04-datos-para-estudios.md`,
§4.3, fuera del repositorio): **1** decisiones sobrescritas · **2** zona horaria · **3** `version` de los menús ·
**4** «sin dato» frente a 0 · **5** fuente de la medida · **6** propios frente a comunes · **7** planificado frente a
hecho · **8** `comidasCompletadas` en `data-v1`. «Nuevo» = no estaba en esa tabla.

| Hueco | Qué pasa hoy | §4.3 |
|---|---|---|
| **H1** Decisiones sin historial | Se sobrescriben: todo `perfil` (fase, `calibracionKcal`, `palBase`, `entrenamientos`, días y hora de entreno, reparto), `objetivos`, configuración del peso, rutinas, ajustes del entreno, catálogo y reglas del menú, estado premium. Solo `historialCiclos` guarda algo del pasado (las calibraciones aceptadas). | 1 |
| **H2** Sin zona horaria | Ningún campo la guarda. Los días locales no dicen de qué zona; los instantes UTC del entreno no dicen qué hora local era. Lo importado se interpreta en la zona del aparato. | 2 |
| **H3** Menús sin `version` y frágiles | Las cuatro claves de menú se guardan sin `version` ni migración: la app ya sabe leer el sobre con versión, pero no lo escribe hasta el paso 2 de R13. El menú en curso no tiene fecha. Los huecos nombran los ingredientes por **nombre** (renombrar uno rompe el vínculo). `slotId` apunta a un menú que desaparece tras 8 generaciones. | 3 |
| **H4** «Sin dato» guardado como algo | kcal y macros vacíos de un alimento se guardan como 0; un entreno importado sin hora de fin queda con duración 0; las horas de sueño fuera de 3-11 se guardan como 3 u 11. (Bien resueltos: pasos, RIR, esfuerzo, calidad del sueño, `horaEntreno`.) | 4 |
| **H5** Sin fuente de la medida | Pesadas, sueño y pasos no dicen si son a mano, de báscula o de un reloj (hoy todo es a mano). `foods[].fuente` existe, pero es texto libre. El entreno sí la tiene (`origen`). | 5 |
| **H6** Propios sin equivalencia | Un `exp_…` no dice a qué `ex_…` se parece; los importados sin emparejar no tienen músculo. | 6 |
| **H7** Planificado frente a hecho | **Entreno**: solo se guardan las series hechas; no se copia la plantilla de la rutina; no se sabe si un valor se tecleó o se precargó. **Nutrición**: el registro de una comida guarda lo comido pero no las macros planificadas, y no existe el «no la hice» (una comida sin marcar puede ser no comida o no apuntada). | 7 |
| **H8** Comidas hechas en `data-v1` | Tope de 1 MiB por documento (R3). | 8 |
| **H9** Recortes que pierden pasado | `historialCiclos` guarda 12 ciclos; el historial de menús, 8. | Nuevo (relacionado con 1 y 7) |
| **H10** Pesadas solo de hoy y sin hora | No se puede apuntar una pesada de un día pasado ni se sabe a qué hora fue (en ayunas o no). | Nuevo (relacionado con 2) |
| **H11** `data-v1` sin `version` | **Resuelto** (R12): lleva `version: 1`, y una copia de la app que lea una versión mayor que la suya no escribe nada (`datos.md`). | Nuevo (relacionado con 3) |
| **H12** Fórmulas sin versión | `objetivos` no dice con qué versión de las fórmulas se calculó (cambian cuando se recalibran). | Nuevo (relacionado con 1) |

Lo que **ya está bien** para estudios: el entreno en kg, km y segundos; ids fijos de la semilla de alimentos y
ejercicios; los propios archivados en vez de borrados; las pesadas que nunca se borran; `origen` y `lote` en el
entreno; el texto libre (notas, gimnasio, nombres, motivos de pausa) en campos propios, separado de los números; y
las claves con `version` y migración (datos principales, despensa, entreno, cuerpo, período), que no dejan a una copia
vieja de la app escribir encima de una versión más nueva y conservan los campos que no conocen.

---

## 13. La exportación («Descargar mis datos»)

Ajustes → Privacidad descarga un ZIP con todo lo de este documento (`logica/exportacion.js`; cómo funciona, en
`datos.md`). Es la forma de llevarse los datos, y la misma pieza que algún día alimentaría una base de estudios.

**`datos.json`**: los mismos campos que guarda la app, con estos nombres de primer nivel:

| En `datos.json` | Qué es | Sección |
|---|---|---|
| `formato`, `versionFormato` | `fooddraft-exportacion` y la versión de esta forma (`VERSION_EXPORTACION`) | — |
| `exportadoEn`, `zonaHorariaDelAparato`, `idioma`, `unidades` | Cuándo (UTC), la zona del aparato **en ese momento** (no la de cada dato), el idioma y las unidades | — |
| `cuenta.autenticacion` | `email`, `proveedor`, `emailVerificado`, `creada`, `ultimoAcceso` (ISO 8601) | 1 |
| `cuenta.ficha` | `users/{uid}` tal cual, o `null` | 2 |
| `cuenta.consentimientos` | Cada firma por el nombre de su documento | 3 |
| `cuenta.avisosPush` | El buzón, o `null` | 4 |
| `datos` | `data-v1` entero | 5 |
| `menus.completo`, `menus.simple` | `{ menu, historial }` de cada uno | 6 |
| `despensa` | `despensa-v1` | 7 |
| `entreno.catalogo` | `entreno-catalogo-v1` | 8.3 |
| `entreno.sesiones` | Todas las sesiones de todos los meses, más las de la cola de este aparato, por inicio | 8.2 |
| `entreno.pendientesDeSubir` | Ids de las que este aparato aún no ha confirmado en la nube | 10 |
| `entreno.enCurso` | El entreno a medias, o `null` | 8.5 |
| `cuerpo.diario`, `cuerpo.favoritos` | `cuerpo-diario-v1` e `informes-favoritos-v1` | 9 |
| `soloEsteAparato.periodo` | El período de este aparato (`regla`, `relaciones`) | 10 |

Las marcas de tiempo de Firestore salen como texto ISO 8601. No van: el índice del entreno (se rehace a partir de
las sesiones) ni las comodidades del aparato.

**Las tablas**, una fila por medida, en dos formatos con los mismos datos (casilla vacía = sin dato; 1 y 0 = sí y
no):
- **`datos.xlsx`**: un libro de Excel con una hoja por tabla (la hoja se llama como el CSV, sin «.csv»), números como
  números y fechas como texto AAAA-MM-DD. Se abre bien en cualquier Excel, LibreOffice o Google Sheets, sea cual sea
  el idioma del ordenador.
- **Un CSV por tabla**, en el formato internacional (RFC 4180), igual en todos los idiomas de la app: separador «,»,
  punto decimal, comillas solo cuando hace falta, BOM y CRLF. Es el formato para los programas; un Excel con Windows
  en español lo abre todo en la columna A (para eso está el `.xlsx`).

| Archivo | Una fila por | Columnas → campo |
|---|---|---|
| `pesadas.csv` | pesada | `fecha`, `peso_kg` (`peso`), `atipica`, `motivo`, `ciclo` (`cerrado` si viene de `historial`, `en_curso` si de `entradas`) |
| `ciclos-peso.csv` | ciclo cerrado | `inicio`, `fin`, `tendencia_pct_semana` (`pctSemana`), `nivel`, `ajuste_kcal_aplicado`, `peso_actualizado` |
| `comidas-hechas.csv` | comida marcada | `fecha`, `comida` (el `mealType`), `hecha`, `kcal`, `prot_g`, `grasa_g`, `carb_g` (`macros`), `con_cambios`, `id_menu` (`slotId`) |
| `entrenos.csv` | sesión | `sesion_id`, `inicio_local`, `fin_local`, `inicio_utc`, `fin_utc`, `duracion_seg` (sin pausas), `nombre`, `rutina_id`, `esfuerzo`, `gimnasio`, `origen`, `lote`, `nota` |
| `series.csv` | serie hecha | `sesion_id`, `inicio_local`, `orden_ejercicio`, `ejercicio_id`, `ejercicio` (nombre en el idioma de la app), `tipo_ejercicio`, `pareja`, `serie`, `tipo_serie`, `kg`, `reps`, `reps_izq`, `reps_der`, `segundos`, `km`, `rir`, `sustituye_a`, `superserie`, `nota_ejercicio` |
| `sueno-pasos.csv` | día con algo | `fecha`, `sueno_horas`, `sueno_calidad`, `pasos` |
| `periodo.csv` | día apuntado | `fecha`, `dato` (`regla` o `relaciones`) |
| `alimentos.csv` | alimento del catálogo | `id`, `nombre`, `categoria`, `kcal_100g`, `prot_100g`, `grasa_100g`, `carb_100g`, `grasa_saturada_100g`, `azucares_100g`, `fibra_100g`, `sal_100g`, `fuente` |

Las horas locales de los CSV salen en la zona del aparato que exporta (hueco H2): por eso cada entreno lleva
también su hora en UTC, que es la que se guarda.
