# Datos guardados: claves, migraciones y Firestore

Léelo antes de cambiar la forma de algo guardado, de añadir una clave o de tocar `window.storage`
(`auth-bootstrap.jsx`), `logica/migraciones.js` o cualquier hook de `ui/estado/`.

Lo que guarda cada clave, campo a campo (qué es, unidad, si puede faltar, si es de salud, de dónde sale, si es
decisión o medida, y lo que le falta para estudios), está en `diccionario-datos.md`. Es la referencia de «Descargar
mis datos» y de los estudios: **si cambias la forma de algo guardado, actualízalo en el mismo commit.**

## Reglas de esta área

- **Si cambia la forma de algo guardado**: parche de migración que compruebe si falta algo y lo complete **sin
  pisar lo que el usuario haya editado a mano**, y su caso en `validacion/tests.js`. Nunca supongas que los
  datos de antes tienen la forma nueva. Mira los bloques existentes de `migrateData` como ejemplo (sobre todo
  el de `FOODS_SEED` y los campos añadidos después).
- `migrateData` solo cubre la clave principal (`data-v1`). Despensa, entreno y Cuerpo tienen su propia clave,
  su `version` y su migración: **no pasan por `migrateData`**.
- **Toda clave lleva `version`**, y la que conoce cada copia de la app está en una sola tabla, `VERSIONES` de
  `logica/versiones.js` (las migraciones la toman de ahí). Una copia que lee una versión mayor que la suya no
  guarda nada y enseña «Actualiza FoodDraft». **Subir una versión** tiene sus reglas (entre ellas, que no se
  deshace volviendo al código anterior): «Versiones y copias viejas de la app», abajo.
- Las migraciones **conservan lo que no conocen**: una copia vieja de la app no borra un campo que haya añadido
  una más nueva. Al escribir una migración nueva, copia el documento entero (`...guardado`) y limpia solo lo que
  conoce.
- **Nunca `window.storage.list()`**: en Firestore lee la colección entera, con contenido.
- Todas las claves de la cuenta empiezan por `rueda-de-platos:` (nombre histórico, no se cambia). Las
  comodidades del dispositivo, por `fooddraft:` en `localStorage`, siempre con try/catch.
- Un dato de una cuenta que se guarde en el dispositivo lleva el uid en la clave (como el período), para que
  otra cuenta del mismo móvil no lo vea.
- **Clave nueva en la nube**: añádela a la lista de `esClaveConocida` en `firestore.rules`, pasa
  `npm run test:reglas` y **publica las reglas antes de subir la app** (primero en pruebas, luego en
  producción). Si no, su guardado falla en todas las cuentas. La prueba «acepta cada clave que el código de la
  app guarda en la nube» lee el código y lo avisa, siempre que la clave aparezca escrita entera en `ui/`,
  `logica/`, `app.jsx` o `auth-bootstrap.jsx`; una clave formada con una plantilla (como los meses del
  entreno) necesita además su patrón en las reglas y su caso en las pruebas.

## `window.storage` y Firestore

- `window.storage` lo crea `auth-bootstrap.jsx` al iniciar sesión (`makeFirestoreStorage`), envuelto en
  `protegerVersiones` (`logica/versiones.js`: no deja guardar nada si lee datos de una versión más nueva, abajo).
  Solo habla con Firestore: `get` (`getDoc`; `null` si no existe; cualquier error se propaga), `set` (`setDoc` del
  documento entero, sin fusión ni reintentos) y `delete`.
- Un único documento por clave en `users/{uid}/keys/{clave}`, con `value` = JSON serializado (como
  `localStorage`, pero en la nube). App Check aplicado para Firestore y Authentication en producción.
- **Reglas de Firestore**: `firestore.rules`, en la raíz, es la única fuente (nunca se editan en la consola:
  el siguiente despliegue lo pisaría). Cada persona solo lee y escribe lo suyo, y solo con el **email
  verificado** (`request.auth.token.email_verified`: verificación estricta, la misma que aplica la app con
  `VerificarCorreoScreen`, `arquitectura.md`; las de Google llegan verificadas); `users/{uid}` es de solo
  lectura; en `keys/` solo se aceptan las claves de la tabla de abajo (y los meses del entreno de 1970 a 2099,
  el mismo rango que `ANIO_MIN_ENTRENO`/`ANIO_MAX_ENTRENO` de `entreno-calculo.js`), con un único
  campo `value` de texto, de hasta 1 048 000 caracteres (justo por debajo del tope de 1 MiB de Firestore, para
  no bloquear nunca a una cuenta con muchos datos). Listar la colección está
  denegado, lo que garantiza que nadie use `storage.list()`. Se puede leer y borrar una clave propia que no
  esté en la lista, pero no reescribirla. Aparte, el buzón de avisos `users/{uid}/avisos/push` y las firmas de
  consentimiento `users/{uid}/consentimientos/` (abajo), cada uno con su propia forma. Todo lo demás, denegado.
- **Índices**: `firestore.indexes.json`, en la raíz, también es la única fuente. Solo tiene los de las dos
  consultas de las funciones de notificaciones sobre todos los buzones (`backend.md`, «Escala e índices»). Se
  publican aparte (`firebase deploy --only firestore:indexes --project dev` y luego `--project prod`); el emulador
  no los exige, así que las pruebas no notan si falta uno.
- Pruebas de las reglas: `functions/pruebas-reglas/reglas.test.js`, con el emulador de Firestore
  (`cd functions` y `npm run test:reglas`; necesita Java, sin conexión ni sesión de Firebase, proyecto
  `demo-rueda-de-platos`). Publicarlas: `firebase deploy --only firestore:rules --project dev` y, tras probar
  la app en local, `--project prod` (alias de `.firebaserc`).
- Firestore se inicializa **sin caché persistente** (caché en memoria, decisión de Pablo): sin red, una
  lectura falla y una escritura queda en cola en memoria hasta que vuelve la conexión (si se cierra la app
  antes, se pierde).
- **«No existe» no es «no se pudo leer».** `get` devuelve `null` si el documento no existe (cuenta nueva o
  función sin usar: se empieza vacío) y **lanza** si no se puede leer. Los cargadores de `useDatos`,
  `useMenu`, `useDespensa` y `useCuerpo` dejan pasar ese error; `useCargaInicial` (`ui/estado/datos.js`), que lanza todos los cargadores
  a la vez (no dependen entre sí), lo
  recoge y `app.jsx` enseña «No se han podido cargar tus datos · Reintentar» (`ui/comun/error-carga.jsx`),
  que reintenta solo lo que falló. Mientras tanto no se guarda nada. Un hook nuevo que lea de la nube tiene
  que seguir el mismo patrón: lanzar en el cargador y no autoguardar sin haber leído bien. El entreno se
  puede usar sin conexión y lleva sus propias reglas (`entreno.md`), pero su cargador también lanza si no ha
  podido leer el catálogo o el índice, para que «Reintentar» los vuelva a leer.
- **Leído pero inservible** (JSON roto, una migración que falla) tampoco es una cuenta nueva, y tampoco es la
  conexión: el cargador marca el error con `error.ilegible = true` (datos principales, despensa y cuerpo) y la
  pantalla de reintento lo dice así, con el correo de contacto (`carga.error.textoIlegible`). No se escribe
  nada encima. Los menús son la excepción: un menú o un historial ilegibles, o con una forma que no es ni la lista
  suelta ni el sobre (abajo), se ignoran (el historial se empieza de nuevo), porque no hay nada que proteger en
  ellos.
- **Datos de una versión más nueva** de la app tampoco son una cuenta nueva ni algo dañado: la lectura falla, no
  se guarda nada y la app enseña «Actualiza FoodDraft» en vez de «Reintentar» (abajo).
- Si un guardado de los datos principales falla, la cabecera dice «Sin guardar» y se reintenta al volver la
  conexión; despensa y cuerpo lo dejan en la consola y lo reintentan con el siguiente cambio.
- El documento padre `users/{uid}` guarda el estado premium (`premium { active, pendiente, stripeCustomerId,
  subscriptionId, updatedAt }`) y los contadores de cuota (`usoFotos`, `usoCocinar`). Es de **solo lectura
  para el cliente**: solo lo escriben las Cloud Functions con el Admin SDK (ver `backend.md`).
- `rueda-de-platos:push-token-v1` guardaba el token de notificaciones en `value` como **texto plano**, no JSON.
  **Retirado** (R8): lo leían las funciones de notificaciones de antes; las de ahora leen el buzón de avisos
  y no lo miran. La app ya no lo escribe y las reglas ya no lo aceptan; la app lo borra una sola vez por cuenta
  y aparato (marca `fooddraft:push-token-v1-borrado:<uid>`) en las cuentas que aún lo tengan (`backend.md`,
  «Paso del token de antes al buzón»).

## Claves en la nube (`users/{uid}/keys/`)

| Clave | Lo lleva | `version` | Migración | Casos en `validacion/` |
|---|---|---|---|---|
| `rueda-de-platos:data-v1` | `useDatos` (`ui/estado/datos.js`, `STORAGE_KEY`); también lo leen `auth-bootstrap.jsx` y `sendWeighInReminders` (solo de quien tiene el recordatorio de pesaje activado y un buzón sin los datos de pesaje, `backend.md`) | 1 (sin campo = 1: la añade `migrateData`) | `migrateData` | sí, grupos «migrateData» y «Versiones» |
| `rueda-de-platos:menu-v1`, `history-v1` | `useMenu` (`MENU_COMPLETO`) | 1, sin campo: lista suelta (el sobre se lee, aún no se escribe) | ninguna (`leerMenuGuardado`, `leerHistorialGuardado`) | sí, grupo «Versiones» |
| `rueda-de-platos:menu-simple-v1`, `history-simple-v1` | `useMenu` (`MENU_SIMPLE`) | ídem | ídem | ídem |
| `rueda-de-platos:despensa-v1` | `useDespensa` | 1 | `migrarDespensa` (`logica/despensa.js`) | sí |
| `rueda-de-platos:entreno-catalogo-v1` | `useEntreno` | 1 | `migrarCatalogo` (`entreno-almacen.js`) | sí |
| `rueda-de-platos:entreno-indice-v1` | `useEntreno` | 1 + `calculo` (`CALCULO_INDICE`) | `migrarIndice` | sí |
| `rueda-de-platos:entreno-borrador-v1` | `useEntreno` | 1 | `migrarBorrador` | no |
| `rueda-de-platos:entreno-AAAA-MM-v1` | `useEntreno` (un documento por mes) | 1 | `migrarMes` | no |
| `rueda-de-platos:cuerpo-diario-v1` | `useCuerpo` | 1 | `migrarDiario` (`logica/cuerpo-diario.js`) | sí |
| `rueda-de-platos:informes-favoritos-v1` | `useCuerpo` | 1 | `migrarFavoritos` | sí |
| `rueda-de-platos:push-token-v1` | nadie: `auth-bootstrap.jsx` solo lo borra (texto plano; retirado, R8: las reglas ya no lo aceptan) | — | — | no |

`data-v1` lleva `{ version, foods, ingredients, blocks, rules, perfil, perfilOnboardingDone, objetivos, pesoTracking,
listaCompra, listaCompraSimple, comidasCompletadas }` y crece con `comidasCompletadas` (≈ 150 KB al año
marcando todas las comidas; el límite de un documento es 1 MiB). Las cuatro claves del entreno tienen cada una su
versión en `VERSIONES` (`entrenoCatalogo`, `entrenoIndice`, `entrenoBorrador`, `entrenoMes`), para poder subir
una sin las otras.

## Versiones y copias viejas de la app

Un Word antiguo que abre un documento de un Word nuevo pierde, al guardar, lo que no entiende. Con la app pasaba
lo mismo sin pulsar nada: al cargar, una migración que encontraba una `version` mayor la rebajaba a la suya, y el
hook la reescribía (auditoría de noviembre de 2026, R12 y el primer paso de R13; el detalle, en la cabecera de
`logica/versiones.js`).

- **La regla**: una copia de la app nunca escribe encima de datos de una versión mayor que la que conoce. Al
  encontrar uno, deja de guardar **todo** (cualquier clave) y la app entera se cambia por «Actualiza FoodDraft»
  (`ActualizaApp`, `ui/comun/error-carga.jsx`): «Actualizar» recarga (el service worker es «red primero», así
  que con conexión eso trae la versión nueva) y una nota da el correo por si sigue saliendo. Leer sigue
  permitido. Bloquear la app entera (y no solo dejar de guardar esa parte) y el texto son decisiones de Pablo.
- **Qué es «mayor»** (`esVersionMayor`): solo un número estrictamente mayor que el conocido. Sin `version`, una
  lista suelta (los menús), 0 o un texto como `"2"` no bloquean: el riesgo de esta pieza no es perder datos,
  sino un bloqueo falso para todas las cuentas.
- **Capa 1, `window.storage`** (`protegerVersiones`, puesto por `auth-bootstrap.jsx`): cada lectura de una clave
  de `CLAVES` (y de los meses del entreno, por su forma) se comprueba. Con una versión mayor, esa lectura falla
  (`error.versionMayor`), desde entonces fallan todas las escrituras y borrados (también los guardados con
  retardo que estaban esperando), y se avisa una vez con `EVENTO_VERSION_MAYOR`, que escucha `useVersionMayor`
  (`ui/estado/datos.js`). Cubre también lo que el entreno lee a mitad de uso (meses, índice): la app pasa a la
  pantalla de actualizar en ese momento. El buzón de avisos no pasa por `window.storage`: con el bloqueo,
  `app.jsx` deja de sincronizarlo.
- **Capa 2, las migraciones**: todas (`migrateData`, `migrarDespensa`, las cuatro del entreno, `migrarDiario`,
  `migrarFavoritos`, `migrarPeriodo`) llaman a `exigirVersionConocida`: con una versión mayor lanzan en vez de
  rebajarla. Con la capa 1 no les llega ninguna; están por si alguna vez se lee por otro camino.
- **El período**, que vive en `localStorage` y no pasa por `window.storage`: `ui/cuerpo/periodo.jsx` mira la
  versión al leer y otra vez justo antes de escribir, y bloquea con `window.storage.bloquearPorVersion`.
  «Descargar mis datos» lo lee en modo estricto: con una versión mayor, falla en vez de exportarlo vacío.
- **Lo que no se conoce, se conserva**: sueño y pasos, favoritos y período ya no rehacen el documento solo con
  lo que conocen (las demás claves ya copiaban el documento entero). Así, añadir un campo opcional no obliga a
  subir la versión.
- **`data-v1`** lleva `version: 1` (era la única clave sin ella, H11 del diccionario): `migrateData` la añade una
  vez y `initialData` la trae de serie. Las copias de antes la conservan, porque copian el documento entero.
- **Menús (R13)**: se guardan como siempre, en una lista suelta (versión 1, sin campo). La app ya lee también el
  sobre (`{ version: 1, slots }` el menú y `{ version: 1, lista }` el historial; `leerMenuGuardado` y
  `leerHistorialGuardado`), pero no lo escribe todavía: una copia anterior a esta protección no sabría abrirlo.
  **Paso 2, pendiente**: escribir el sobre, con el primer cambio de forma de los menús y cuando esta protección
  lleve su tiempo en producción. Su versión será la 1, porque estas copias ya lo entienden entero.
- **Lo que no cubre**: una copia vieja que ya leyó los datos antes de que la nueva los cambiara y guarda desde
  la memoria (una pestaña o una PWA abierta en segundo plano desde antes de actualizar, en un segundo aparato).
  Es el caso de dos aparatos que se pisan (R4, punto 15 del plan), que se cierra comprobando antes de escribir.

### Subir una versión

1. Solo si una copia anterior estropearía la forma nueva al guardarla. Un campo opcional nuevo no la necesita:
   las migraciones conservan lo que no conocen.
2. Antes, esta protección tiene que llevar **al menos una semana en producción**: solo protege en los aparatos
   que ya la tienen.
3. Se cambia en `VERSIONES` (`logica/versiones.js`), con el parche de migración de la versión anterior a la
   nueva (sin pisar lo editado) y sus casos en `validacion/`.
4. Si la clave la leen las Cloud Functions (`data-v1`: `sendWeighInReminders`), revisa la función en el mismo
   cambio.
5. **No se deshace volviendo al código anterior**: esa copia vería la versión nueva y se bloquearía sin tener a
   qué actualizar. Si algo falla, se arregla hacia delante, con otra versión nueva. Un cambio que no sube ninguna
   versión (como esta protección misma) se puede deshacer como siempre.
6. Una clave nueva en la nube entra en `CLAVES` (`logica/versiones.js`): el grupo «Versiones» de `validacion/`
   busca en el código todas las `rueda-de-platos:…-v1` y avisa si falta alguna.

## Buzón de avisos (`users/{uid}/avisos/push`)

Lo único que leen las funciones de notificaciones para saber a quién avisar (auditoría de noviembre de 2026, R8
y R17). No es una clave de `window.storage`: tiene campos propios y lo escribe directamente `auth-bootstrap.jsx`
(`window.sincronizarBuzonAvisos`, llamado desde `app.jsx`; las decisiones sin Firebase, en
`logica/buzon-avisos.js`).

- **Forma**: `{ idioma, pesaje, descongelar, tokens, actualizado }`, los cinco obligatorios, más tres
  opcionales del seguimiento de peso, y ninguno más (`hasOnly` con los ocho, `hasAll` con los cinco).
  `idioma` es uno de los cinco de la app; `pesaje` y `descongelar` son copia de `perfil.notificacionesPush` y
  `perfil.avisoDescongelar`; `tokens`, hasta 10 aparatos (`MAX_DISPOSITIVOS`, el mismo tope en las reglas y en
  la app: una prueba de las reglas lo vigila); `actualizado`, la hora del servidor de la última escritura de la
  app (`serverTimestamp()`; las reglas no aceptan otra).
- **Datos de pesaje** (opcionales, tanda B): lo justo para que el recordatorio de pesaje decida sin abrir
  `data-v1` (`backend.md`). Los calcula `datosPesajeBuzon` (`logica/buzon-avisos.js`) a partir de `pesoTracking`:
  - `pesoVecesSemana`: 2 o 3 (entero; las de `PESO_FRECUENCIAS`, y una prueba de las reglas comprueba que las
    acepta todas), o `null` sin seguimiento. Una frecuencia rara cuenta como 3, como en `esDiaSugeridoPeso`. Con
    el recordatorio activado, la app siempre manda 2 o 3 (`migrateData` crea el seguimiento si falta): la función
    no se fía de un `null` con el pesaje activado (solo sale de un buzón a medias, abajo) y abre `data-v1`.
  - `pesoPausado`: sí/no, si hay una pausa sin `fin`.
  - `ultimaPesada`: `AAAA-MM-DD` de la pesada más reciente del ciclo actual (`pesoTracking.entradas`), o `null`.
    Sin contar las posteriores a hoy en este aparato: una guardada por un aparato con el reloj adelantado taparía
    la de hoy, y la función avisaría a quien ya se ha pesado.
  - **Nunca el peso** (las reglas no aceptan ningún otro campo). Con el recordatorio de pesaje apagado van vacíos
    (`null`, `false`, `null`): a la función no le sirven y así no hay en el buzón datos de quien no lo ha pedido.
  - Opcionales porque los buzones de antes no los tienen y tienen que seguir valiendo, y porque una copia de la
    app sin actualizar reescribe el buzón sin ellos: con `merge` se quedan los que había (pueden quedar viejos
    hasta que un aparato con la app nueva lo reescriba, como mucho al día siguiente); al reescribirlo entero
    (lista llena) desaparecen y la función vuelve a abrir `data-v1`. Si una copia así activa el pesaje encima de
    los vacíos que dejó la app nueva con el pesaje apagado, el buzón queda con el pesaje activado y
    `pesoVecesSemana: null`, y la función también abre `data-v1`. No hay migración aparte: la firma de antes no
    tiene estos datos, así que la primera apertura con la app nueva reescribe el buzón con ellos.
- **Uno por cuenta, no por aparato**, porque los interruptores de Ajustes son de la cuenta. Existe solo si hay
  algún aviso activado.
- **La firma** (`localStorage`, `fooddraft:buzon-avisos:<uid>`): lo que este aparato escribió la última vez,
  `{ token, idioma, pesaje, descongelar, pesoVecesSemana, pesoPausado, ultimaPesada, dia }` (`token: null` si
  escribió sin token). Evita reescribir en cada apertura, dice qué token quitar al renovarse o al cerrar sesión y
  hace de tarea pendiente: solo se borra cuando el servidor confirma que el buzón se ha borrado. Al quitar los dos
  avisos se cambia al momento por una que conserva el token pero con `dia: null` y `borrar: true`
  (`firmaAlQuitarAvisos`): si el borrado no se confirma, la próxima apertura lo repite, y si ese mismo día los
  avisos vuelven a estar activados, este aparato se vuelve a apuntar (una firma «al día» lo impedía hasta mañana).
- **Cuándo se escribe**: al abrirse la app (como mucho una vez al día por aparato si nada cambia), al activar o
  quitar un aviso y al cambiar el idioma. Con el recordatorio de pesaje activado, también con la primera pesada
  de cada día, al pausar o reanudar el ciclo, al cambiar la frecuencia y al cerrar el ciclo (no al corregir el
  peso de hoy: la fecha no cambia). Siempre se escriben los seis campos (`camposBuzon`), también los de pesaje
  vacíos, para que un `merge` no conserve unos viejos. Un aparato con el permiso de notificaciones concedido se apunta en la
  lista; si el navegador renueva el token, el nuevo entra y el viejo sale; con la lista llena, se reescribe
  entera quitando los más antiguos. Un aparato **sin permiso** (o sin token) pone al día igualmente `idioma`,
  `pesaje`, `descongelar` y los datos de pesaje con `updateDoc`, sin tocar `tokens`; si no hay buzón, no hace
  nada (lo creará el primer aparato con permiso). En Ajustes, ese aparato ve «En este dispositivo no te llegan»
  con el botón «Recibirlos aquí», que pide el permiso y lo apunta sin tocar los interruptores; pulsar «Activadas»
  en uno de los dos avisos también lo apunta, aunque ya estuviera activado.
- **Cuándo se borra**: al quitar los dos avisos (entero, en todos los aparatos: primero el buzón y al final la
  revocación del token) y con «Eliminar cuenta» (`recursiveDelete` de `users/{uid}`; mientras se borra, y después,
  la app no escribe nada más en ese buzón, para no volver a crearlo). Al cerrar sesión, ese aparato sale de la
  lista.
- **Las funciones** solo quitan tokens que FCM da por caducados o inválidos (`arrayRemove`), sin tocar
  `actualizado`. Un fallo pasajero de FCM no quita nada.
- **Cómo se corrige solo un buzón que no dice lo que el perfil** (no pasa por ninguna migración): al abrir la app
  en un aparato de la cuenta. Con algún aviso, se reescribe como mucho una vez al día (con o sin permiso). Sin
  ninguno, se borra si ese aparato tiene firma: un borrado que no llegó (quitar los dos avisos y cerrar la app
  enseguida) se repite. Un aparato sin firma que no tenga avisos no lo toca, para no gastar una escritura en
  cada apertura de cada cuenta.
- **Cerrar sesión sin conexión**: el aparato puede quedarse en la lista de esa cuenta. Para que la cuenta que
  entre después en ese navegador no reciba sus avisos, al cerrar sesión se pone siempre la marca
  `fooddraft:avisos-estrenar-token` (del navegador, sin uid): la próxima vez que cualquier cuenta abra la app ahí
  con el permiso concedido, el navegador revoca su token y pide uno nuevo. El viejo muere y las funciones lo
  quitan en su siguiente envío. Y lo que quedara pendiente en la fila de esa sesión ya no toca nada aunque se
  resuelva después (por ejemplo, si la misma cuenta vuelve a entrar en esa visita): cada tarea comprueba antes de
  escribir que su sesión sigue siendo la de ahora (`backend.md`).
- **`updateDoc` sin buzón da `permission-denied`, no `not-found`**: las reglas miran el documento resultante, y
  sin buzón solo tiene los campos de la escritura. La app lo distingue de un rechazo de verdad leyendo el buzón
  (solo cuando falla). Hay una prueba de las reglas que lo vigila.
- Pruebas: reglas en `functions/pruebas-reglas/` (`npm run test:reglas`: también los datos de pesaje, buenos,
  malos y ausentes), decisiones de la app en `validacion/` (grupo «Avisos: el buzón de las notificaciones») y
  funciones en `functions/pruebas-funciones/` (`npm run test:avisos`).

## Consentimientos y edad mínima (`users/{uid}/consentimientos/`)

El libro de firmas de la cuenta (auditoría de noviembre de 2026, etapa 2: consentimiento explícito para los datos de
salud, aceptación de los términos y edad mínima). Casi todo lo que guarda la app son datos de salud, y la única base
legal que encaja es el consentimiento explícito (RGPD, art. 9.2.a), que hay que poder demostrar: quién, cuándo y a
qué texto. Las decisiones, sin Firebase, en `logica/consentimientos.js`; la forma y los límites, en `firestore.rules`.
Las lee y las escribe `auth-bootstrap.jsx` (`asegurarConsentimientos`) al entrar, antes de montar la app; si falta
alguna, enseña «Antes de empezar» (`ui/onboarding/antes-de-empezar.jsx`) con solo lo que falte (`arquitectura.md`,
«Cuentas»). Las 20 cuentas de antes la ven una vez, como las nuevas.

- **Tres firmas, un documento cada una**:
  - `edad`: `{ tipo: "edad", anioNacimiento, fecha }`, más `cumplidosEsteAnio: true` solo cuando el año no basta
    (quien cumple 18 este año puede tener aún 17: la app lo pregunta y esto es la prueba de que lo hizo). Una sola
    vez por cuenta. El asistente de perfil reutiliza ese año (`anioDeclarado`) y no lo pregunta; Perfil parte de él
    si el perfil no tiene año (quien se saltó el asistente) y no deja guardar un año de menos de 18
    (`rangoAnioNacimiento`, con el año de hoy).
  - `terminos-AAAA-MM-DD` y `salud-AAAA-MM-DD`: `{ tipo, version, fecha }`. La versión del texto aceptado va en el
    nombre del documento.
- **Edad mínima: 18 años** (`EDAD_MINIMA`; hasta 120, `EDAD_MAXIMA`). Las reglas la comprueban con el año del
  servidor: 19 años o más, siempre; 18 justos, solo con `cumplidosEsteAnio: true`. Una prueba de las reglas lee las
  dos constantes de la app y comprueba los bordes. Borde conocido: entre las 00:00 y la 01:00 del 1 de enero en España
  (aún 31 de diciembre en UTC), quien cumple 18 ese año todavía no puede firmar.
- **Es una prueba, no una casilla**: la hora la pone el servidor (`fecha == request.time`); solo se puede **crear**,
  nunca cambiar ni borrar desde la app (reescribir una firma, aunque sea igual, es un `update` y se rechaza); no se
  lista (la app lee las tres vigentes por su nombre, `idsConsentimientos`). Se escriben en un lote: o se guardan
  todas las pendientes o ninguna (`documentosAFirmar`).
- **Sin Cloud Function** a propósito: una app modificada podría llamarla igual que escribe aquí, así que no protegería
  más, y en `localhost` no se podría probar (el proyecto de pruebas no tiene funciones).
- **Versiones** (`VERSIONES`): la fecha en que un texto cambió de fondo. Subirla hace que todas las cuentas vuelvan a
  firmar **solo ese texto**; la firma anterior se queda como prueba de lo que se aceptó entonces. Las reglas aceptan
  cualquier versión con forma `AAAA-MM-DD` (no una lista), para que subirla no obligue a publicar también las reglas;
  una prueba de las reglas comprueba que las de la app tienen esa forma. Un **tipo** nuevo (el de estudios, cuando haya
  un estudio concreto) sí va en las reglas y se publica antes de subir la app. **Al subir una versión, la que había
  pasa a `VERSIONES_ANTERIORES`**: las reglas no dejan listar, así que sin esa lista «Descargar mis datos» no sabría
  el nombre de las firmas de antes (`idsFirmasGuardadas`).
- **Ajustes → «Privacidad»** (`ui/ajustes/privacidad.jsx`) enseña lo firmado, con su fecha (como número: día/mes/año;
  en euskera, año/mes/día, `fechaDeFirma`) y su versión (`resumenFirmas`), y los enlaces a los términos y la política.
- **Retirar el consentimiento de salud equivale a eliminar la cuenta** (sin esos datos la app no funciona): el botón
  de «Privacidad» lo explica, ofrece descargar antes una copia de los datos y abre la misma ventana de «Eliminar
  cuenta» de Ajustes, que borra `users/{uid}` entero, firmas incluidas. No hay un borrado aparte.
- Una lectura de las firmas que falla no es «no ha firmado nada»: no se enseña la pantalla de firma, sino el error
  con «Reintentar», como en la carga de datos.
- Pruebas: reglas en `functions/pruebas-reglas/` (`npm run test:reglas`) y decisiones de la app en `validacion/`
  (grupo «Consentimientos y edad mínima»).

## «Descargar mis datos» (Ajustes → Privacidad)

El único sitio de la app que descarga los datos de la cuenta (derechos de acceso y portabilidad; auditoría de
noviembre de 2026, etapa 4, punto 12b): un ZIP `fooddraft-datos-AAAA-MM-DD.zip` con `datos.json` (todo, con las
secciones de `diccionario-datos.md`, §13), las tablas de medidas en un `datos.xlsx` (una hoja por tabla: se abre bien
en cualquier Excel) y en un CSV por tabla (formato internacional: comas y punto decimal, para los programas), y un
`LEEME.txt` en el idioma de la app. Gratis para todos. Piezas: `logica/exportacion.js` (qué va y con qué forma),
`logica/xlsx.js` (el Excel), `logica/zip.js` (el ZIP, sin comprimir),
`ui/ajustes/exportar.js` (reunir, empaquetar, releer y descargar) y el puente `window.leerCuentaParaExportar`
(`auth-bootstrap.jsx`).

- **De dónde sale**: casi todo, de lo que ya tienen cargado los hooks (lo mismo que se ve en pantalla). Los meses del
  entreno, con `cargarTodosLosMeses` (estricto); la ficha `users/{uid}`, las firmas, el buzón y lo de Authentication,
  del servidor en el momento; el período y la cola del entreno, de este aparato. El índice del entreno no va (es una
  caché).
- **Si una lectura falla, no se descarga nada** y la pantalla lo dice: una copia incompleta presentada como completa
  es peor que un error. Antes de entregar el ZIP se relee entero (cada CRC-32) y se compara con lo que se quería meter.
- **Nada se escribe**: la descarga no guarda ni migra nada en la nube.
- **Al añadir una clave o un campo**: si es de la cuenta, tiene que llegar a la exportación (en `datos.json` sale
  solo si lo lleva un hook que ya se exporta; una clave nueva necesita su sitio en `construirExportacion`) y a su
  tabla en `diccionario-datos.md`. Si cambia la forma de `datos.json` o de una tabla (CSV y hoja del Excel), sube `VERSION_EXPORTACION`.
- Pruebas: `validacion/`, grupos «Descargar mis datos: el ZIP», «… la exportación completa» y «… el Excel (.xlsx)».

La primera vez que una cuenta entra en un navegador con datos antiguos en `localStorage`,
`migrateLocalDataIfNeeded` (`auth-bootstrap.jsx`) ofrece copiar a la nube las claves `rueda-de-platos:*` que
haya (sin contar las marcas `:migrated:`), y deja la marca `rueda-de-platos:migrated:<uid>` en el
dispositivo. Nunca bloquea la carga de la app: si falla, se queda en un aviso de consola.

Eliminar la cuenta borra `users/{uid}` entero en el servidor (`functions/deleteAccount.js`, ver `backend.md`) y,
en el dispositivo desde el que se elimina, las claves de esa cuenta (las que acaban en `:<uid>`).

## Claves en el dispositivo (`localStorage`)

| Clave | Qué es | ¿Por cuenta? |
|---|---|---|
| `fooddraft:entreno-borrador:<uid>`, `fooddraft:entreno-pendientes:<uid>` | Copia inmediata del borrador y cola de sesiones sin confirmar en la nube | sí |
| `fooddraft:periodo-v1:<uid>` | Período (`migrarPeriodo`, `logica/periodo.js`); nunca va a la nube | sí |
| `rueda-de-platos:migrated:<uid>` | Marca de la migración única desde `localStorage` | sí |
| `fooddraft:verificacion-enviada:<uid>` | Cuándo se mandó desde aquí el último correo de verificación (`VerificarCorreoScreen`) | sí |
| `fooddraft:buzon-avisos:<uid>` | Firma de lo último que este aparato escribió en el buzón de avisos (arriba) | sí |
| `fooddraft:push-token-v1-borrado:<uid>` | El token de antes ya se borró de esta cuenta desde aquí | sí |
| `fooddraft:avisos-estrenar-token` | Se cerró sesión en este navegador: revocar su token antes de volver a usar los avisos | no (es del navegador) |
| `fooddraft:idioma` | Idioma antes de haber perfil | no |
| `fooddraft:ultima-pantalla` | Última pantalla de cada área | no |
| `fooddraft:resumen-lado`, `fooddraft:vista-despensa`, `fooddraft:vista-gimnasio`, `fooddraft:capas-gimnasio` | Vistas elegidas | no |
| `fooddraft:aviso-stock-cerrado`, `fooddraft:agua-fregadero`, `fooddraft:puerta-gym`, `fooddraft:monitor-gym` | Avisos y juegos | no |

## Limitaciones conocidas

- **Última escritura gana**: cada hook lee una vez al montar y luego escribe el documento entero. Dos
  dispositivos (o dos pestañas) abiertos a la vez se pisan. Las sesiones de entreno sí se fusionan por `id`.
- Una copia vieja de la app que guarda desde la memoria lo que leyó antes de una versión nueva no se detecta
  (ver «Versiones y copias viejas de la app»): es el caso de dos aparatos (R4).
- Detalle de todos los riesgos: `local/diagnostico-2026-10/07-datos-y-deuda.md`.
