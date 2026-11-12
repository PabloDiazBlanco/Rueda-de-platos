# Servicios de IA (Gemini)

Léelo antes de tocar `functions/analyzeFoodPhoto.js`, `suggestRecipes.js`,
`ui/premium/que-cocino.jsx`, `ui/premium/cocinando.jsx` o el lector de etiquetas. El resto de la app es
cálculo puramente local.

## Archivos

- `functions/analyzeFoodPhoto.js` → `window.analyzeFoodPhoto` (`auth-bootstrap.jsx`): lector de etiquetas
  por foto.
- `functions/suggestRecipes.js` → `window.suggestRecipes`; pantalla `ui/premium/que-cocino.jsx`; animación
  `ui/premium/cocinando.jsx` (`PensandoCocina`).
- La versión anterior de «¿Qué cocino?» (`suggestMeals`) se retiró en noviembre de 2026: ni la función ni su puente
  existen ya. Las claves de i18n y el componente conservan el nombre `suggestMeals` / `SuggestMealsView`.

## Reglas de esta área

- **Todas son Cloud Functions callable**, nunca llamadas directas desde el navegador: un límite comprobado
  solo en el navegador no protege nada cuando hay varios usuarios y la IA cuesta dinero.
- Usan `@google/genai` con `GEMINI_API_KEY` (secreto de Firebase). **El nombre del modelo
  (`gemini-3.1-flash-lite`) está escrito en los dos archivos** (`analyzeFoodPhoto.js` y `suggestRecipes.js`): si Google lo retira, cámbialo en los dos.
- La cuota mensual se reserva en una transacción de Firestore **antes** de llamar a Gemini y se devuelve si la
  llamada falla.
- **Las macros nunca vienen de la IA**: si se guarda una receta, las calcula la app con `composedMacros`.
- Al cambiar lo que recibe una función, despliégala antes de subir la app (ver `backend.md`).
- Lo que se manda a Gemini tiene que estar en la política de privacidad (`privacidad.*` en `logica/i18n.js`).
- **Las fotos nunca van tal cual salen del móvil**: `reducirFoto` (`ui/comun/reducir-foto.js`) las vuelve a dibujar en
  un `<canvas>` (como mucho 1600 px por el lado largo, JPEG al 0,85, fondo blanco para los PNG transparentes) antes de
  mandarlas, en el lector de etiquetas y en «¿Qué cocino?». Así no viajan los datos ocultos del archivo (EXIF: la
  ubicación GPS, el móvil, la hora), una foto de 3-8 MB no choca con el tope de 10 MB de las funciones callable y
  Gemini procesa menos. La orientación del EXIF la aplica el navegador al abrir la foto en una `<img>`, así que sale
  derecha. Si el navegador no puede abrir el archivo, la pantalla dice `foto.errorPreparar` y no se manda nada (nunca el
  original). Un sitio nuevo que mande fotos tiene que pasar por `reducirFoto`; la política lo promete.

## Cómo funciona

- **Lector de etiquetas**: lee una tabla nutricional de una foto. Premium, 20 al mes (`usoFotos`).
- **«¿Qué cocino?»** (E2): devuelve **recetas con ingredientes y pasos, sin macros**, en dos modos que
  **comparten la cuota** (premium, 10 al mes, `usoCocinar`):
  - **Con lo que tengo**: solo con lo que hay en casa (más sal, aceite y especias), eligiendo con sentido
    gastronómico una combinación coherente en vez de mezclarlo todo.
  - **Tipo restaurante**: parte de lo que hay y sugiere comprar de una a tres cosas más elaboradas (una
    especia, una salsa, un queso...); lo que hay que comprar llega marcado (`comprar`).
- Se manda siempre el **catálogo de alimentos** (id y nombre; la función se queda con 400), para enlazar la
  receta con ellos; si el usuario lo deja marcado, **la despensa entera** (`resumenDespensaParaIA`: solo
  nombre y cantidad aproximada); y la foto y el texto que quiera.
- Las recetas pueden llevar ingredientes que no están en el catálogo (lo que hay que comprar, los básicos).
  Cuando uno sí es del catálogo o de la despensa trae su `foodId` (el servidor descarta cualquiera que no
  estuviera en lo enviado) y gramos aproximados, y solo con esos se ofrece «Guardar como plato cerrado».
- **Mientras piensa** (`PensandoCocina`): debajo del formulario, la cámara entra desde la cocina entera hasta
  la vitro (1 s) y se queda en la encimera vista en primera persona, con un muñón que corta un tomate a
  rodajas y otro que saltea un filete, en bucle hasta la respuesta; frases que cambian
  (`queCocino.pensando.*`) y, pasados 8 s, «está tardando un poco más». Espera mínima de 1 s de viaje + 1,5 s
  (`esperaMinimaPensando`) para que no parpadee, también si hay error. Con «reducir movimiento», la escena de
  cerca quieta desde el principio (sin viaje), con la misma espera mínima de 1,5 s. Dibujos propios (no
  reutiliza los de `ui/despensa/`), con los colores de su tema.
