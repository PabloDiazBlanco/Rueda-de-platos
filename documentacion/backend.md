# Backend: `functions/`, premium, Stripe y notificaciones

Léelo antes de tocar `functions/`, el flujo premium, Stripe, las notificaciones push o el puente de
`auth-bootstrap.jsx` con las funciones (`window.*`). Las funciones de IA tienen su documento (`ia.md`).

## Archivos

`functions/` es un proyecto Node aparte (Cloud Functions de Firebase, 2.ª generación, Node 22) con su propio
`package.json`; es la única pieza de servidor. Cada función vive en su archivo y `functions/index.js` solo las
reexporta y fija `setGlobalOptions({ maxInstances: 10 })`. `functions/node_modules` no se versiona.

| Función | Tipo | Qué hace |
|---|---|---|
| `stripeWebhook` | HTTP (lo llama Stripe) | Única pieza que escribe `users/{uid}.premium`; verifica la firma de Stripe |
| `createCheckoutSession` / `createPortalSession` | callable | Devuelven la URL de pago o de gestión de la suscripción |
| `analyzeFoodPhoto` / `suggestRecipes` | callable | Gemini con premium + cuota (ver `ia.md`) |
| `suggestMeals` | callable | Versión anterior de «¿Qué cocino?»; se conserva para las copias de la app sin actualizar |
| `sendWeighInReminders` | programada, 09:00 Europe/Madrid | Push diario de recordatorio de pesaje (no a quien lo tenga desactivado) |
| `deleteAccount` | callable | Elimina la cuenta de verdad: cancela la suscripción de Stripe, borra `users/{uid}` entero (`recursiveDelete`) y la cuenta de Auth. La llama `window.deleteAccount` tras reautenticar |
| `sendDefrostReminders` | programada, 21:30 Europe/Madrid | Push «revisa las comidas de mañana por si tienes que descongelar algo o comprar» a quien tenga `perfil.avisoDescongelar` (C8, gratis; no lee el menú) |

## Reglas de esta área

- **La app nunca importa nada de `functions/` ni al revés.** Lo único duplicado a mano está abajo.
- **Despliegue manual**: `firebase deploy --only functions`. Si cambia lo que recibe una función (o se crea
  una que la app llama), despliégala **antes** de subir la app: si el cliente nuevo llega a producción sin su
  función, la pantalla da error al usarla.
- **El cliente nunca escribe en `users/{uid}`** (reglas de Firestore): premium y cuotas solo los escriben las
  funciones con el Admin SDK.
- **Convenio obligatorio al crear un Checkout**: `client_reference_id: uid` y
  `subscription_data.metadata.firebaseUID: uid`. Sin eso el webhook no sabe de qué usuario es el evento y lo
  descarta.
- **Secretos** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`): viven en Firebase, nunca en
  el repositorio.
- Las funciones callable exigen App Check (`enforceAppCheck: true`); el webhook no, porque quien llama es
  Stripe.
- **Los mensajes de error de las funciones están en español y la app no los enseña tal cual**: los puentes de
  `auth-bootstrap.jsx` conservan `err.code` y `ui/comun/errores.js` (`mensajeErrorFuncion`) elige el texto por
  código y por función (`errorFuncion.*`, cinco idiomas). Si una función empieza a lanzar un código nuevo o
  con otro significado, añádelo ahí.
- **Código duplicado a mano**: `sendWeighInReminders.js` repite `esDiaSugeridoPeso`, `fechaISO` y la tabla de
  días sugeridos de `logica/peso.js`, porque `peso.js` es un módulo ESM de navegador (usa nombres cortos del
  importmap) y esta carpeta es Node CommonJS, sin build que las una. **Si cambias la regla de días sugeridos
  en `peso.js`, cámbiala también ahí.** La clave `rueda-de-platos:data-v1` y la del token también están
  escritas a mano en las funciones.

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
- `stripeWebhook` no escribe nada para un uid que ya no existe en Auth (si no, el evento de la cancelación
  recrearía `users/{uid}`).
- El cliente limpia después las claves de `localStorage` de esa cuenta (las que acaban en `:<uid>`) y cierra
  la sesión. Si la función falla, no se borra nada: no hay borrado a medias desde el cliente.

## Notificaciones push

- El cliente pide permiso y guarda el token con `window.requestPushPermission` (`auth-bootstrap.jsx`) en
  `rueda-de-platos:push-token-v1` (texto plano). `sw.js` muestra la notificación con la app cerrada
  (`onBackgroundMessage`, con la etiqueta que mande la función en `data.tag`).
- Dos avisos comparten permiso y token, cada uno con su interruptor en Ajustes: el recordatorio de pesaje
  (`perfil.notificacionesPush`) y el aviso para descongelar (`perfil.avisoDescongelar`). El token solo se
  borra cuando los dos están desactivados.
- En iPhone/Safari solo llegan si la PWA está instalada de verdad; no se puede evitar con código.
- Las dos funciones programadas descubren a quién avisar con una `collectionGroup("keys")` sobre todos los
  documentos y filtran en memoria: leen el contenido de todos los documentos de todos los usuarios dos veces
  al día. Barato hoy; **antes de abrir a muchos usuarios** hay que guardar los tokens en un sitio propio y
  consultar solo eso (`local/diagnostico-2026-10/07-datos-y-deuda.md`, D9).

## Coste

`maxInstances: 10` pone un techo duro por función. La cuota mensual de Gemini se reserva en una transacción
antes de llamar y se devuelve si la llamada falla (ver `ia.md`).
