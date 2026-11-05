# Backend: `functions/`, premium, Stripe y notificaciones

Léelo antes de tocar `functions/`, el flujo premium, Stripe, las notificaciones push o el puente de
`auth-bootstrap.jsx` con las funciones (`window.*`). Las funciones de IA tienen su documento (`ia.md`).

## Archivos

`functions/` es un proyecto Node aparte (Cloud Functions de Firebase, 2.ª generación, Node 22) con su propio
`package.json`; es la única pieza de servidor. Cada función vive en su archivo y `functions/index.js` solo las
reexporta y fija `setGlobalOptions({ maxInstances: 10 })`. `functions/node_modules` no se versiona.

`functions/pruebas-reglas/` no es una función: son las pruebas de `firestore.rules` (`npm run test:reglas`,
ver `datos.md`). Viven aquí porque es el único proyecto Node; `firebase.json` las excluye del despliegue y
sus dependencias (`@firebase/rules-unit-testing`, `firebase`) son solo de desarrollo.

| Función | Tipo | Qué hace |
|---|---|---|
| `stripeWebhook` | HTTP (lo llama Stripe) | Única pieza que escribe `users/{uid}.premium`; verifica la firma de Stripe |
| `createCheckoutSession` / `createPortalSession` | callable | Devuelven la URL de pago o de gestión de la suscripción |
| `analyzeFoodPhoto` / `suggestRecipes` | callable | Gemini con premium + cuota (ver `ia.md`) |
| `suggestMeals` | callable | Versión anterior de «¿Qué cocino?»; se conserva para las copias de la app sin actualizar |
| `sendWeighInReminders` | programada, 09:00 Europe/Madrid | Push diario de recordatorio de pesaje a quien le toca ese día, a todos sus aparatos. Parte de los buzones de avisos y solo abre `data-v1` de quien lo tiene activado |
| `deleteAccount` | callable | Elimina la cuenta de verdad: cancela la suscripción de Stripe, borra `users/{uid}` entero (`recursiveDelete`) y la cuenta de Auth. La llama `window.deleteAccount` tras reautenticar |
| `sendDefrostReminders` | programada, 21:30 Europe/Madrid | Push «revisa las comidas de mañana por si tienes que descongelar algo o comprar» a quien tenga el aviso activado (C8, gratis). Solo lee los buzones de avisos: ningún dato de la cuenta |

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
  arregla pasando a `firebase-admin` 14, versión mayor que pide su propia revisión.
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
  `buzonAvisos.js` repite los cinco idiomas de `logica/i18n.js`.

## Premium

- 2,99 €/mes con Stripe, gestionado en la web (no con Google Play Billing). El precio real lo fija
  `PREMIUM_PRICE_ID` en Stripe; el texto de la app solo lo enseña.
- La app se entera en vivo con `window.subscribePremiumStatus` (`onSnapshot` sobre `users/{uid}`).
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
  las devuelve. Después limpia las claves de `localStorage` de esa cuenta (las que acaban en `:<uid>`) y
  cierra la sesión. Si la función falla, no se borra nada: no hay borrado a medias desde el cliente.
- Las simulaciones con Stripe, Firestore y Auth falsos que se usaron para comprobar estos casos no están en el
  repositorio; `validacion/` no cubre `functions/`.

## Notificaciones push

- **Cliente** (`auth-bootstrap.jsx`): `window.requestPushPermission` pide el permiso y el token de FCM;
  `window.sincronizarBuzonAvisos` (llamado desde `app.jsx` al abrirse la app y al cambiar los avisos o el
  idioma) mantiene el **buzón de avisos** `users/{uid}/avisos/push` (forma y reglas en `datos.md`);
  `window.disablePushNotifications` lo borra al quitar los dos avisos; al cerrar sesión, ese aparato sale de la
  lista. `sw.js` muestra la notificación con la app cerrada (`onBackgroundMessage`, con la etiqueta que mande
  la función en `data.tag`).
- Dos avisos comparten permiso, cada uno con su interruptor en Ajustes: el recordatorio de pesaje
  (`perfil.notificacionesPush`) y el aviso para descongelar (`perfil.avisoDescongelar`). Son de la cuenta: el
  buzón lleva los dos y la lista de aparatos, y llegan a todos los aparatos con el permiso concedido.
- En iPhone/Safari solo llegan si la PWA está instalada de verdad; no se puede evitar con código.
- **Funciones** (`buzonAvisos.js`, compartido): leen todos los buzones con `collectionGroup("avisos")` y filtran
  en memoria. Sin `where` a propósito: en una `collectionGroup` cada campo filtrado necesita un índice creado a
  mano, y los buzones son pocos (solo cuentas con avisos) y pequeños. `sendDefrostReminders` no lee nada más;
  `sendWeighInReminders` abre `data-v1` solo de quien tiene el recordatorio activado (día sugerido, pausa,
  pesada de hoy) y, si el perfil dice que está desactivado, manda el perfil. Envían a todos los aparatos a la
  vez (`sendEachForMulticast`) y quitan del buzón los tokens que FCM da por caducados. El día del pesaje es el
  de la ejecución programada (`scheduleTime`), no el del reloj.
- **Registro de diagnóstico, a propósito**: cada ejecución deja una línea con cuántas cuentas tocan
  («Recordatorio de pesaje: N candidato(s)…», «Aviso para descongelar: N buzón(es)…») y, por cuenta, el uid y
  por qué se envía («enviado a N de M aparato(s)») o se omite («…, se omite»). Sin datos de salud. Se consulta
  en Google Cloud → Logging → Explorador de registros, buscando `candidato`, `omite` o `enviado`.
- **Pruebas**: `npm run test:avisos` en `functions/` (`pruebas-funciones/avisos.test.js`), con el emulador de
  Firestore y un FCM falso: a quién se avisa, en qué idioma, que no se lee nada de más y que los tokens
  caducados salen. Las funciones no se pueden desplegar en el proyecto de pruebas, así que esta es su prueba
  antes de producción.

### Paso del token de antes al buzón (R8, en curso)

Antes, cada cuenta guardaba un único token en `rueda-de-platos:push-token-v1` y las funciones lo buscaban
leyendo todos los documentos de todas las cuentas. Para que nadie se quede sin avisos ni un día, el cambio va
en este orden:

1. Reglas con el buzón: `--project dev`, probar en `localhost`, `--project prod`.
2. Subir la app. Escribe el buzón **y** sigue escribiendo el token de antes, así que las funciones viejas siguen
   avisando. Cada cuenta con avisos crea su buzón sola la primera vez que abre la app.
3. Comprobar en Firestore (producción) que las cuentas que tenían token tienen ya `avisos/push` (cuántas son
   lo dice la línea «candidato(s)» del registro de las funciones viejas).
4. Desplegar solo las dos funciones:
   `firebase deploy --only functions:sendWeighInReminders,functions:sendDefrostReminders`, y mirar el registro
   de la siguiente ejecución.
5. Limpieza, en otra tanda: la app deja de escribir `push-token-v1` y lo borra de cada cuenta al abrirse;
   después se quita de `firestore.rules` (lista de claves y tamaño de 4096) y de sus pruebas.

## Coste

`maxInstances: 10` pone un techo duro por función. La cuota mensual de Gemini se reserva en una transacción
antes de llamar y se devuelve si la llamada falla (ver `ia.md`).
