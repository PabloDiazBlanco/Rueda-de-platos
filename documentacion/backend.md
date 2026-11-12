# Backend: `functions/`, premium, Stripe y notificaciones

Léelo antes de tocar `functions/`, el flujo premium, Stripe, las notificaciones push o el puente de
`auth-bootstrap.jsx` con las funciones (`window.*`). Las funciones de IA tienen su documento (`ia.md`).

## Archivos

`functions/` es un proyecto Node aparte (Cloud Functions de Firebase, 2.ª generación, Node 22) con su propio
`package.json`; es la única pieza de servidor. Cada función vive en su archivo y `functions/index.js` solo las
reexporta y fija `setGlobalOptions({ maxInstances: 10 })`. `functions/node_modules` no se versiona.

`functions/pruebas-reglas/` no es una función: son las pruebas de `firestore.rules` (`npm run test:reglas`,
ver `datos.md`); `functions/pruebas-funciones/` tampoco: son las de las dos funciones de notificaciones
(`npm run test:avisos`, con el emulador) y las de la decisión del premium (`npm run test:premium`, sin emulador). Viven aquí porque es el único proyecto Node; `firebase.json` las excluye del
despliegue y sus dependencias (`@firebase/rules-unit-testing`, `firebase`) son solo de desarrollo. Los índices
que necesitan las funciones de notificaciones están en `firestore.indexes.json`, en la raíz («Escala e
índices», abajo).

| Función | Tipo | Qué hace |
|---|---|---|
| `stripeWebhook` | HTTP (lo llama Stripe) | Única pieza que escribe `users/{uid}.premium`; verifica la firma de Stripe |
| `createCheckoutSession` / `createPortalSession` | callable | Devuelven la URL de pago o de gestión de la suscripción |
| `analyzeFoodPhoto` / `suggestRecipes` | callable | Gemini con premium + cuota (ver `ia.md`) |
| `sendWeighInReminders` | programada, 09:00 Europe/Madrid | Push diario de recordatorio de pesaje a quien le toca ese día, a todos sus aparatos. Lee solo los buzones con el recordatorio activado y decide con lo que traen; solo abre `data-v1` si el buzón es de una app sin actualizar o está a medias |
| `deleteAccount` | callable | Elimina la cuenta de verdad: cancela la suscripción de Stripe, borra `users/{uid}` entero (`recursiveDelete`) y la cuenta de Auth. La llama `window.deleteAccount` tras reautenticar |
| `sendDefrostReminders` | programada, 21:30 Europe/Madrid | Push «revisa las comidas de mañana por si tienes que descongelar algo o comprar» a quien tenga el aviso activado (C8, gratis). Solo lee los buzones con ese aviso activado: ningún dato de la cuenta |

## Reglas de esta área

- **La app nunca importa nada de `functions/` ni al revés.** Lo único duplicado a mano está abajo.
- **Despliegue manual**: `firebase deploy --only functions`. Si cambia lo que recibe una función (o se crea
  una que la app llama), despliégala **antes** de subir la app: si el cliente nuevo llega a producción sin su
  función, la pantalla da error al usarla.
- **Dependencias al día**: `npm audit --omit=dev` mira solo lo que se despliega. Los arreglos compatibles se
  aplican con `npm audit fix` (nunca `--force`, que sube versiones mayores sin revisarlas) y después se
  comprueba que `node -e "require('./index.js')"` carga y que `npm run test:reglas` sigue en verde; el
  `package-lock.json` nuevo no llega a producción hasta el siguiente `firebase deploy --only functions`. Queda
  abierto a propósito un aviso moderado de `uuid@9` dentro de `firebase-admin` 13 (vía `google-gax` y
  `@google-cloud/storage`): afecta a `v3`/`v5`/`v6` con un búfer propio y esas librerías solo usan `v4`. Se
  arregla pasando a `firebase-admin` 14, versión mayor que pide su propia revisión: **quita la forma de escribir
  con espacios de nombres** (`admin.firestore()`, `admin.messaging()`, `admin.auth()`, `admin.firestore.FieldValue`),
  que usan todas las funciones; hay que pasarlas antes a la modular (`getFirestore`, `FieldValue` de
  `firebase-admin/firestore`, `getMessaging`, `getAuth`) y probar a mano las que no tienen pruebas (pagos, borrar la
  cuenta, IA). Pide además Node 22, que ya es el de las funciones.
- **Región: Bélgica (`europe-west1`)**, junto a Firestore (`eur3`). La fijan `setGlobalOptions` en `functions/index.js`
  y `REGION_FUNCIONES` en `auth-bootstrap.jsx` (el SDK sin región llama a `us-central1`): **si cambia una, cambia la
  otra**. El webhook de Stripe apunta a la URL de esta región (la que escribe `firebase deploy` junto a
  `stripeWebhook(europe-west1)`); se cambia **editando el destino que ya existe** en Stripe, para que siga valiendo su
  secreto de firma (`STRIPE_WEBHOOK_SECRET`). Hasta noviembre de 2026 todas estaban en
  `us-central1`. Para mudarlas sin corte: desplegar (las nuevas conviven con las viejas; a la pregunta de borrar las de
  la otra región, «No»), borrar enseguida las dos programadas de la región vieja (si no, cada aviso llega dos veces),
  cambiar la URL del webhook en Stripe, subir la app y, días después, borrar el resto de la región vieja.
  **Ojo con un primer despliegue a medias en una región nueva** (pasó en noviembre de 2026: un 409 al crear el almacén
  de la región dejó 6 funciones a medio crear): la CLI solo da a una callable el permiso público de Cloud Run al
  **crearla**; si se repite el despliegue, las «actualiza» sin ese permiso y rechazan todas las llamadas (la app ve un
  error `internal`). `invoker: "public"` en `onCall` no lo arregla (el endpoint de una callable no lo lleva). Lo que
  funciona: borrarlas en esa región (`firebase functions:delete … --region …`) y volver a desplegarlas. Para
  comprobarlo sin sesión: un POST vacío tiene que contestar 401 «Unauthenticated», no fallar por CORS.
- **El cliente nunca escribe en `users/{uid}`** (`firestore.rules`, con su prueba): premium y cuotas solo los
  escriben las funciones con el Admin SDK, que no pasa por las reglas.
- **Convenio obligatorio al crear un Checkout**: `client_reference_id: uid` y
  `subscription_data.metadata.firebaseUID: uid`. Sin eso el webhook no sabe de qué usuario es el evento y lo
  descarta.
- **Secretos** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`): viven en Firebase, nunca en
  el repositorio.
- Las funciones callable exigen App Check (`enforceAppCheck: true`); el webhook no, porque quien llama es
  Stripe. En `localhost` la app usa el proyecto de pruebas, sin App Check y sin funciones desplegadas
  (`arquitectura.md`, «Dos proyectos de Firebase»).
- **Los mensajes de error de las funciones están en español y la app no los enseña tal cual**: los puentes de
  `auth-bootstrap.jsx` conservan `err.code` y `ui/comun/errores.js` (`mensajeErrorFuncion`) elige el texto por
  código y por función (`errorFuncion.*`, cinco idiomas). Si una función empieza a lanzar un código nuevo o
  con otro significado, añádelo ahí.
- **Código duplicado a mano**: `sendWeighInReminders.js` repite `esDiaSugeridoPeso`, `fechaISO` y la tabla de
  días sugeridos de `logica/peso.js`, porque `peso.js` es un módulo ESM de navegador (usa nombres cortos del
  importmap) y esta carpeta es Node CommonJS, sin build que las una. **Si cambias la regla de días sugeridos
  en `peso.js`, cámbiala también ahí.** La clave `rueda-de-platos:data-v1` también está escrita a mano, y
  `buzonAvisos.js` repite los cinco idiomas de `logica/i18n.js`. Las frecuencias de pesaje (2 y 3,
  `PESO_FRECUENCIAS` de `peso.js`) están también en `firestore.rules` (una prueba de las reglas comprueba que
  acepta todas las de la app) y en `buzonAvisos.js` (`pesajeDelBuzon`): una frecuencia nueva toca los tres sitios.

## Premium

- 2,99 €/mes con Stripe, gestionado en la web (no con Google Play Billing). El precio real lo fija
  `PREMIUM_PRICE_ID` en Stripe; el texto de la app solo lo enseña.
- La app se entera en vivo con `window.subscribePremiumStatus` (`onSnapshot` sobre `users/{uid}`). Si la escucha
  falla, se apunta en la consola y se vuelve a escuchar sola (5 s, 15 s, 30 s y luego cada minuto); mientras tanto se
  mantiene lo último que se sabía, así que un corte de red no quita el premium.
- **Qué premium toca lo decide Stripe, no el aviso** (`functions/estadoPremium.js`, con sus pruebas: `npm run
  test:premium`). Ante cualquiera de los avisos atendidos, `stripeWebhook` pide a Stripe la suscripción tal como está
  ahora (`subscriptions.retrieve` con `latest_invoice`) y escribe `premium { active, pendiente, … }`. Así da igual el
  orden en que lleguen los avisos (Stripe no lo garantiza) o que se repitan. La regla:
  - suscripción `active`/`trialing` con la primera factura pagada, o ya en renovaciones → premium;
  - **primera factura aún sin cobrar** (domiciliación y otros pagos que tardan) → `pendiente: true`, sin premium: la
    pantalla de Premium explica que se activará solo cuando el banco confirme el cobro (y, antes de pagar, avisa de que
    esos pagos tardan unos días). Con un pago así, Stripe puede dejar la suscripción `active` desde el principio y, si el
    cobro falla, anula la factura **sin** cancelar la suscripción: por eso se mira la primera factura;
  - **una renovación que aún se está cobrando no quita el premium** (sería quitárselo unos días cada mes);
  - primera factura anulada, o `past_due`, `unpaid`, `canceled`, `incomplete_expired`, `paused` → sin premium.
  - No se da premium «mientras tanto» (decisión de Pablo: quitárselo luego a quien creía tenerlo es peor).
- **Avisos que tiene que tener marcados el destino del webhook en Stripe** (`AVISOS_ATENDIDOS`):
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`. Uno que
  falte es un caso que nunca llega (por ejemplo, sin `invoice.paid` un pago por domiciliación se quedaría «pendiente»
  hasta el siguiente cambio de la suscripción).
- Los métodos de pago del Checkout los decide el panel de Stripe (Configuración → Métodos de pago); el código no los fija.
- **Gratis**: generador de menús, objetivos, catálogo, Menú simple, lista de la compra, despensa, todo el
  entreno (sin límites: rutinas, ejercicios propios, historial, gráficas, récords, exportar e importar), el
  resumen mensual (nutrición y entreno), sueño, pasos y período.
- **Premium**: seguimiento de peso (y con él el apartado de peso del resumen), las funciones de Gemini y los
  informes cruzados y el constructor del área Cuerpo.

## Eliminar la cuenta

- Lo hace `deleteAccount` en el servidor, porque el cliente no puede borrar `users/{uid}` ni cancelar Stripe.
  Exige sesión de menos de 5 minutos (el cliente reautentica antes). Orden: cancelar en Stripe las
  suscripciones vivas del cliente (si falla, no se borra nada) → `recursiveDelete(users/{uid})` → borrar el
  usuario de Auth → `recursiveDelete` otra vez (escrituras tardías). El cliente de Stripe no se borra (la
  facturación se conserva por ley).
- Si Stripe responde `resource_missing` (el cliente o la suscripción guardados ya no existen: borrados en el
  panel o de otra cuenta de Stripe), no hay nada que cancelar y el borrado sigue. Cualquier otro error de
  Stripe para el borrado entero.
- `stripeWebhook` no escribe nada para un uid que ya no existe en Auth, y **desactivar el premium solo
  actualiza un `users/{uid}` que ya existe, nunca lo crea** (`update`, no `set`): el aviso de la cancelación
  puede llegar justo después de que `deleteAccount` haya borrado el documento, cuando el usuario aún está en
  Auth. Activar (checkout) sí lo crea.
- El cliente (`window.deleteAccount`) bloquea las escrituras de `window.storage` mientras la función trabaja,
  para que un guardado automático pendiente no recree documentos de la cuenta borrada; si la función falla,
  las devuelve. Lo mismo con el buzón de avisos, que no pasa por `window.storage`: la marca `cuentaBorrandose`
  para la fila del buzón de esa cuenta («Notificaciones push», abajo). Después limpia las claves de
  `localStorage` de esa cuenta (las que acaban en `:<uid>`) y cierra la sesión. Si la función falla, no se borra
  nada: no hay borrado a medias desde el cliente.
- Las simulaciones con Stripe, Firestore y Auth falsos que se usaron para comprobar estos casos no están en el
  repositorio; `validacion/` no cubre `functions/`.

## Notificaciones push

- **Cliente** (`auth-bootstrap.jsx`; las decisiones, sin Firebase, en `logica/buzon-avisos.js`, con casos en
  `validacion/`):
  - `window.requestPushPermission` pide el permiso y comprueba que FCM da un token. No escribe nada.
  - `window.sincronizarBuzonAvisos` (llamado desde `app.jsx` al abrirse la app y al cambiar los avisos o el
    idioma, también con los dos apagados) mantiene el **buzón de avisos** `users/{uid}/avisos/push` (forma,
    firma y cuándo se escribe o se borra, en `datos.md`).
  - `window.disablePushNotifications`, al quitar los dos avisos: primero el buzón y al final la revocación del
    token, que es lo que puede tardar.
  - `window.signOutUser`: el aparato sale de la lista (3 s como mucho) y el navegador queda marcado para estrenar
    token la próxima vez.
  - `window.estadoAvisosEsteAparato` dice si este aparato puede recibirlos («concedido», «bloqueado»,
    «sin-pedir», «sin-soporte»).
  - Las operaciones del buzón van en fila; la de cerrar sesión tiene un límite de 3 s, porque una escritura de la
    cuenta que sale puede no resolverse nunca y dejaría atascadas las de la siguiente.
  - **Sesión del buzón** (`sesionBuzon`): sube en `onAuthStateChanged` y al acabar el turno de cerrar sesión. Cada
    tarea apunta la de cuando se pidió y, al empezar y antes de cada escritura y de guardar la firma, comprueba
    que es la misma, que la cuenta es la de ahora y que no se está borrando (`sigueVigente`). Comparar solo la
    cuenta no bastaba: Firestore guarda las escrituras pendientes de una cuenta hasta que vuelve a entrar, así que
    si se cierra sesión sin conexión y la misma cuenta vuelve a entrar en esa visita, lo que esperaba detrás se
    ejecutaba en la sesión nueva (por ejemplo, sacar del buzón el token recién apuntado).
  - **«Eliminar cuenta»** (`cuentaBorrandose`): mientras la función borra, y después, la fila no escribe nada en
    el buzón de esa cuenta; si no, una tarea que escribiera después del borrado volvería a crear `avisos/push` y
    las funciones seguirían avisando a ese aparato. No se espera a la fila (puede estar atascada sin conexión).
  - `deleteToken` no acepta el service worker: si en esa visita no se ha llamado antes a `getToken`, intenta
    registrar `/firebase-messaging-sw.js` (que no existe) y falla. Por eso la revocación llama antes a
    `getToken` con el nuestro (solo con el permiso concedido: si no, `getToken` lanzaría la pregunta del
    navegador) y, si FCM no contesta, se da de baja de la suscripción push del navegador.
- `sw.js` muestra la notificación con la app cerrada (`onBackgroundMessage`, con la etiqueta que mande la
  función en `data.tag`).
- Dos avisos comparten permiso, cada uno con su interruptor en Ajustes: el recordatorio de pesaje
  (`perfil.notificacionesPush`) y el aviso para descongelar (`perfil.avisoDescongelar`). Son de la cuenta: el
  buzón lleva los dos y la lista de aparatos, y llegan a todos los aparatos con el permiso concedido. Un aparato
  sin permiso ve en Ajustes «En este dispositivo no te llegan» con el botón «Recibirlos aquí» (o, si el navegador
  las tiene bloqueadas, cómo desbloquearlas). Pulsar «Activadas» en un aviso también apunta el aparato, aunque el
  aviso ya estuviera activado (el perfil no cambia y el efecto de `app.jsx` no se lanzaría).
- En iPhone/Safari solo llegan si la PWA está instalada de verdad; no se puede evitar con código.
- **Funciones** (`buzonAvisos.js`, compartido, `recorrerBuzones`): piden solo los buzones con su aviso activado
  (`collectionGroup("avisos").where("pesaje" | "descongelar", "==", true)`), por páginas y unas pocas cuentas a
  la vez («Escala e índices», abajo). `sendDefrostReminders` no lee nada más. `sendWeighInReminders` decide con
  los datos de pesaje del buzón (`pesoVecesSemana`, `pesoPausado`, `ultimaPesada`, `datos.md`) **sin abrir nada
  de la cuenta**; si el buzón no los trae (lo escribió una app sin actualizar, o un dato no tiene la forma
  esperada) o dice «sin seguimiento» (`pesoVecesSemana: null`: con el recordatorio activado la app de ahora nunca
  lo escribe, así que es un buzón a medias, `pesajeDelBuzon`), abre `data-v1` como antes (día sugerido, pausa,
  pesada de hoy) y, si el perfil dice que está
  desactivado, manda el perfil. Los dos caminos deciden igual (`motivoParaNoAvisar`, con una prueba que lo
  compara). Por el camino del buzón, el buzón es la única fuente, como en el de descongelar: la app lo pone al
  día al cambiar el interruptor (también sin permiso, F4) y lo borra al quitar los dos avisos. Envían a todos los
  aparatos a la vez (`sendEachForMulticast`) y quitan del buzón los tokens que FCM da por caducados o inválidos
  (`registration-token-not-registered`, `invalid-registration-token`); cualquier otro fallo se deja para el
  siguiente aviso. El día del pesaje es el de la ejecución programada (`scheduleTime`), no el del reloj.
- **Registro de diagnóstico, a propósito**: cada ejecución deja, al final (con páginas, el total no se sabe hasta
  leer la última), una línea con cuántas cuentas tocaban («Recordatorio de pesaje: N candidato(s) con el
  recordatorio activado (A decidido(s) con el buzón y B abriendo sus datos)», «Aviso para descongelar: N
  buzón(es)…») y, por cuenta, el uid y por qué se envía («enviado a N de M aparato(s)») o se omite («…, se
  omite»); en el pesaje, con «(según el buzón)» o «(según sus datos)». Cuando «abriendo sus datos» se quede en 0
  de forma estable, ya no quedan buzones de antes. Si falta un índice, una línea de aviso (`WARNING`) «falta el
  índice de «pesaje»…» (plan B, abajo); si hay que volver a pedir una página, otra «fallo pasajero al leer una
  página de buzones…». Sin datos de salud. Se consulta en Google Cloud → Logging → Explorador de registros,
  buscando `candidato`, `omite`, `enviado`, `índice` o `pasajero`.
- **Pruebas**: `npm run test:avisos` en `functions/` (`pruebas-funciones/avisos.test.js`), con el emulador de
  Firestore y un FCM falso: a quién se avisa, en qué idioma, que no se lee nada de más (un espía apunta cada
  documento y cada página que se pide), que los tokens caducados o inválidos salen y que un fallo pasajero no
  quita a nadie; la escala (páginas de 2, tandas de 2, el plan B al principio y a mitad, el reintento de una
  página tras un fallo pasajero) y los dos caminos del pesaje (con los datos en el buzón no se abre `data-v1`; sin
  ellos, o con «sin seguimiento», sí; y deciden igual). Las funciones no se
  pueden desplegar en el proyecto de pruebas, así que esta es su prueba antes de producción.

### Escala e índices (tanda B)

Hasta la tanda B las dos funciones leían todos los buzones de golpe y los trataban con un solo `Promise.all`, y
el recordatorio de pesaje abría a la vez el `data-v1` (hasta 1 MiB) de todas las cuentas con el recordatorio.
Con unas pocas cuentas daba igual; con miles, se quedaría sin memoria o lanzaría miles de peticiones a la vez.

- **Solo los buzones con su aviso** (`where`): el de descongelar no lee los de quien solo tiene el de pesaje, ni
  al revés. En memoria se vuelve a filtrar (en el plan B es el único filtro).
- **Por páginas** de 300 (`ESCALA.tamanoPagina`), con cursor: cada página empieza justo después del último
  documento de la anterior, en el orden de su ruta (`orderBy(FieldPath.documentId())`). Solo hay una página en
  memoria.
- **20 cuentas a la vez** (`ESCALA.aLaVez`): cada página se reparte entre 20 «trabajadores» que cogen la
  siguiente cuenta en cuanto acaban la suya. Nunca hay más de 20 `data-v1` abiertos ni más de 20 envíos a FCM en
  marcha. Un fallo de una cuenta queda en el registro y no para a las demás. `ESCALA` es un objeto que las
  pruebas ponen pequeño (páginas de 2) para probarlo con pocos buzones; en producción no se toca.
- **Un reintento por página** (`leerPagina`): si leer una página falla por algo pasajero (códigos de gRPC 4,
  `DEADLINE_EXCEEDED`, y 14, `UNAVAILABLE`), se deja un aviso (`WARNING`) en el registro y se vuelve a pedir una vez
  tras 2 s (`ESCALA.esperaReintentoMs`). Sin él, un corte breve dejaba sin aviso a todas las cuentas que quedaban.
  Volver a pedir la misma página no repite a nadie (de ella aún no se ha tratado ninguna cuenta). Otros códigos no
  se reintentan, y si el reintento también falla, sigue como abajo.
- **540 s y 512 MiB** para las dos (lo de serie es 60 s y 256 MiB): con unas décimas de segundo por cuenta y 20
  a la vez, decenas de miles de cuentas por ejecución. No cuesta más con pocas cuentas: se paga el tiempo que
  corre. Firebase pone ese mismo plazo al trabajo de Cloud Scheduler que las lanza (si no, la daría por fallida
  a los 3 minutos aunque siguiera bien). Sin reintentos, los de serie: repetir una ejecución cortada mandaría el
  aviso dos veces a quien ya lo recibió. Si algún día no bastara (lo diría un `timeout` en el registro), habría
  que repartir el trabajo entre varias ejecuciones.
- **Índices** (`firestore.indexes.json`, apuntado en `firebase.json`): en una consulta sobre todas las cuentas
  (`collectionGroup`), Firestore exige un índice de campo con ámbito «grupo de colecciones» para cada campo
  filtrado, y no lo crea solo. El archivo tiene `"indexes": []` y dos `fieldOverrides`, `avisos` / `pesaje` y
  `avisos` / `descongelar`, cada uno con **los tres índices de serie de ámbito colección** (ascendente,
  descendente y `array-contains`: un `fieldOverride` sustituye la configuración automática del campo, así que si
  no se listan se perderían) **más el ascendente de ámbito grupo de colecciones**, que es el que usa la
  consulta. La paginación no pide nada más: cada entrada de un índice de un campo ya va ordenada por valor y,
  a igualdad, por la ruta del documento (y Firestore rechaza un índice compuesto que no hace falta).
- **Plan B si falta el índice**: si la consulta filtrada falla con `FAILED_PRECONDITION` (código 9: el índice no
  existe o aún se está creando), la función lo deja en el registro con `logger.warn` (con el enlace que da
  Firestore) y sigue leyendo **todos** los buzones, también por páginas, y filtrando en memoria, como antes.
  Sigue desde el mismo cursor, así que nadie se queda sin aviso ni lo recibe dos veces. Cubre un despliegue en
  mal orden y los minutos que tarda en crearse un índice. Cualquier otro error al leer (pasado el reintento, si
  era pasajero) no activa el plan B: se registra como error y esa ejecución termina ahí. **El emulador no exige
  índices**: las pruebas no notarían uno que falta; por eso el plan B se prueba simulando el error.
- **Publicar los índices**: antes, `firebase firestore:indexes --project prod` (y `--project dev`) para ver qué
  índices y *field overrides* tiene ya el proyecto. Después, `firebase deploy --only firestore:indexes --project
  dev` y luego `--project prod`. Si el CLI dice que el proyecto tiene índices o *field overrides* que no están en
  el archivo y pregunta si borrarlos, la respuesta es **no** (los de este archivo son los únicos que usa el código,
  pero los otros pueden ser de algo que no está aquí). **Nunca `--force`**: borra sin preguntar todo lo que no esté
  en el archivo (sin él, el CLI solo borra si se contesta que sí, y en modo no interactivo solo avisa). Crearlos
  tarda unos minutos; se ve en la consola de Firebase → Firestore → Índices, en los de un solo campo. Ojo:
  `firebase deploy --only firestore` (sin `:rules`) publica ya las reglas **y** los índices.

### Orden de publicación de la tanda B

1. **Reglas**: `firebase deploy --only firestore:rules --project dev`, probar la app en `localhost`, y
   `--project prod`. Van primero porque la app nueva escribe los datos de pesaje en el buzón: con las reglas de
   antes, esa escritura se rechaza entera (no se apuntarían aparatos nuevos ni llegarían los cambios de idioma
   o de interruptores; los avisos seguirían saliendo con el buzón que hubiera).
2. **Índices**: mirar antes lo que hay (`firebase firestore:indexes --project prod`), `firebase deploy --only
   firestore:indexes --project dev` y `--project prod` (sin `--force`; «Publicar los índices», arriba), y esperar a
   que estén habilitados. Si las funciones llegan antes, no pasa nada grave: plan B (leen todos los buzones, como
   hoy) y un aviso en el registro.
3. **Funciones**: `firebase deploy --only functions:sendWeighInReminders,functions:sendDefrostReminders`. Con
   los buzones de antes abren `data-v1`, como hoy, así que pueden ir antes que la app; y la app nueva con las
   funciones de antes tampoco rompe nada (ignoran los campos nuevos y siguen abriendo `data-v1`).
4. **La app**: `git push`. Desde ahí, cada cuenta pasa sola al camino del buzón la primera vez que abre la app
   nueva con el recordatorio activado.

### Paso del token de antes al buzón (R8)

Antes, cada cuenta guardaba un único token en `rueda-de-platos:push-token-v1` y las funciones lo buscaban
leyendo todos los documentos de todas las cuentas. Para que nadie se quedara sin avisos ni un día, el cambio fue
en este orden, ya hecho: reglas con el buzón (`dev`, prueba en `localhost`, `prod`) → la app escribe el buzón y
sigue escribiendo el token de antes → comprobar que las cuentas con token tienen ya su buzón → desplegar solo las
dos funciones (`firebase deploy --only functions:sendWeighInReminders,functions:sendDefrostReminders`).

Después vino la limpieza, también hecha:

- **La app** deja de escribir `push-token-v1` y lo borra una sola vez por cuenta y aparato, al abrirse (marca
  `fooddraft:push-token-v1-borrado:<uid>`; borrarlo en cada apertura costaría una escritura aunque el documento
  ya no exista). Las funciones no lo leen, así que no hay orden que respetar con ellas.
- **Las reglas** ya no aceptan la clave (ni el caso especial de 4096 caracteres que tenía en `tamanoMaximo`). Se
  quitó a la vez que la app dejaba de escribirla, sin esperar: el service worker pide los archivos de la app a la
  red primero, así que cada aparato estrena la versión nueva la próxima vez que abre la app con conexión. Solo
  una copia vieja que siguiera abierta (o sin conexión) haría su `await setDoc(push-token-v1)` sin proteger al
  activar los avisos; fallaría esa vez y funcionaría al volver a abrir la app. No se pierde nada.
- **Lo que se queda a propósito**: el borrado de la app (`limpiarTokenDeAntes`, su marca y su paso en
  `planSincronizacion`). Borrar sigue permitido (las reglas dejan borrar cualquier clave propia, también una
  desconocida, con su prueba), y es lo que quita el token de las cuentas que aún no han abierto la app nueva.
  Cuesta una escritura por cuenta y aparato, una sola vez. Se podrá quitar cuando ya no quede ninguno; si no, el
  que quede no lo lee nadie y se va con «Eliminar cuenta». La prueba de las reglas que lee el código de la app
  salta esta clave (`CLAVES_QUE_SOLO_BORRA`), porque la app la nombra solo para borrarla.

## Coste

`maxInstances: 10` pone un techo duro por función. La cuota mensual de Gemini se reserva en una transacción
antes de llamar y se devuelve si la llamada falla (ver `ia.md`).
