# Datos guardados: claves, migraciones y Firestore

Léelo antes de cambiar la forma de algo guardado, de añadir una clave o de tocar `window.storage`
(`auth-bootstrap.jsx`), `logica/migraciones.js` o cualquier hook de `ui/estado/`.

## Reglas de esta área

- **Si cambia la forma de algo guardado**: parche de migración que compruebe si falta algo y lo complete **sin
  pisar lo que el usuario haya editado a mano**, y su caso en `validacion/tests.js`. Nunca supongas que los
  datos de antes tienen la forma nueva. Mira los bloques existentes de `migrateData` como ejemplo (sobre todo
  el de `FOODS_SEED` y los campos añadidos después).
- `migrateData` solo cubre la clave principal (`data-v1`). Despensa, entreno y Cuerpo tienen su propia clave,
  su `version` y su migración: **no pasan por `migrateData`**.
- **Nunca `window.storage.list()`**: en Firestore lee la colección entera, con contenido.
- Todas las claves de la cuenta empiezan por `rueda-de-platos:` (nombre histórico, no se cambia). Las
  comodidades del dispositivo, por `fooddraft:` en `localStorage`, siempre con try/catch.
- Un dato de una cuenta que se guarde en el dispositivo lleva el uid en la clave (como el período), para que
  otra cuenta del mismo móvil no lo vea.

## `window.storage` y Firestore

- `window.storage` lo crea `auth-bootstrap.jsx` al iniciar sesión (`makeFirestoreStorage`). Solo habla con
  Firestore: `get` (`getDoc`; `null` si no existe; cualquier error se propaga), `set` (`setDoc` del documento
  entero, sin fusión ni reintentos) y `delete`.
- Un único documento por clave en `users/{uid}/keys/{clave}`, con `value` = JSON serializado (como
  `localStorage`, pero en la nube). Protegido por las reglas de Firestore con `request.auth.uid == userId`. App
  Check aplicado para Firestore y Authentication. No hay `firestore.rules` en el repositorio: las reglas viven
  solo en la consola de Firebase del proyecto `rueda-de-platos`.
- Firestore se inicializa **sin caché persistente** (caché en memoria, decisión de Pablo): sin red, una
  lectura falla y una escritura queda en cola en memoria hasta que vuelve la conexión (si se cierra la app
  antes, se pierde).
- **«No existe» no es «no se pudo leer».** `get` devuelve `null` si el documento no existe (cuenta nueva o
  función sin usar: se empieza vacío) y **lanza** si no se puede leer. Los cargadores de `useDatos`,
  `useMenu`, `useDespensa` y `useCuerpo` dejan pasar ese error; `useCargaInicial` (`ui/estado/datos.js`) lo
  recoge y `app.jsx` enseña «No se han podido cargar tus datos · Reintentar» (`ui/comun/error-carga.jsx`),
  que reintenta solo lo que falló. Mientras tanto no se guarda nada. Un hook nuevo que lea de la nube tiene
  que seguir el mismo patrón: lanzar en el cargador y no autoguardar sin haber leído bien. El entreno es la
  excepción: se puede usar sin conexión y lleva sus propias reglas (`entreno.md`).
- Si un guardado de los datos principales falla, la cabecera dice «Sin guardar» y se reintenta al volver la
  conexión; despensa y cuerpo lo dejan en la consola y lo reintentan con el siguiente cambio.
- El documento padre `users/{uid}` guarda el estado premium (`premium { active, stripeCustomerId,
  subscriptionId, updatedAt }`) y los contadores de cuota (`usoFotos`, `usoCocinar`). Es de **solo lectura
  para el cliente**: solo lo escriben las Cloud Functions con el Admin SDK (ver `backend.md`).
- `rueda-de-platos:push-token-v1` guarda el token de notificaciones en `value` como **texto plano**, no JSON.

## Claves en la nube (`users/{uid}/keys/`)

| Clave | Lo lleva | `version` | Migración | Casos en `validacion/` |
|---|---|---|---|---|
| `rueda-de-platos:data-v1` | `useDatos` (`ui/estado/datos.js`, `STORAGE_KEY`); también lo leen `auth-bootstrap.jsx` y las dos funciones programadas | no | `migrateData` | sí, grupo «migrateData» |
| `rueda-de-platos:menu-v1`, `history-v1` | `useMenu` (`MENU_COMPLETO`) | no | ninguna | no |
| `rueda-de-platos:menu-simple-v1`, `history-simple-v1` | `useMenu` (`MENU_SIMPLE`) | no | ninguna | no |
| `rueda-de-platos:despensa-v1` | `useDespensa` | 1 | `migrarDespensa` (`logica/despensa.js`) | sí |
| `rueda-de-platos:entreno-catalogo-v1` | `useEntreno` | 1 | `migrarCatalogo` (`entreno-almacen.js`) | sí |
| `rueda-de-platos:entreno-indice-v1` | `useEntreno` | 1 + `calculo` (`CALCULO_INDICE`) | `migrarIndice` | sí |
| `rueda-de-platos:entreno-borrador-v1` | `useEntreno` | 1 | `migrarBorrador` | no |
| `rueda-de-platos:entreno-AAAA-MM-v1` | `useEntreno` (un documento por mes) | 1 | `migrarMes` | no |
| `rueda-de-platos:cuerpo-diario-v1` | `useCuerpo` | 1 | `migrarDiario` (`logica/cuerpo-diario.js`) | sí |
| `rueda-de-platos:informes-favoritos-v1` | `useCuerpo` | 1 | `migrarFavoritos` | sí |
| `rueda-de-platos:push-token-v1` | `auth-bootstrap.jsx` (texto plano) | — | — | no |

`data-v1` lleva `{ foods, ingredients, blocks, rules, perfil, perfilOnboardingDone, objetivos, pesoTracking,
listaCompra, listaCompraSimple, comidasCompletadas }` y crece con `comidasCompletadas` (≈ 150 KB al año
marcando todas las comidas; el límite de un documento es 1 MiB).

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
| `fooddraft:idioma` | Idioma antes de haber perfil | no |
| `fooddraft:ultima-pantalla` | Última pantalla de cada área | no |
| `fooddraft:resumen-lado`, `fooddraft:vista-despensa`, `fooddraft:vista-gimnasio`, `fooddraft:capas-gimnasio` | Vistas elegidas | no |
| `fooddraft:aviso-stock-cerrado`, `fooddraft:agua-fregadero`, `fooddraft:puerta-gym`, `fooddraft:monitor-gym` | Avisos y juegos | no |

## Limitaciones conocidas

- **Última escritura gana**: cada hook lee una vez al montar y luego escribe el documento entero. Dos
  dispositivos (o dos pestañas) abiertos a la vez se pisan. Las sesiones de entreno sí se fusionan por `id`.
- Las migraciones no distinguen una `version` mayor que la conocida: el día que algo pase a `version: 2`, un
  cliente viejo lo reescribiría como 1. Antes de subir una versión, haz que las migraciones no escriban un
  documento de versión mayor.
- Detalle de todos los riesgos: `local/diagnostico-2026-10/07-datos-y-deuda.md`.
