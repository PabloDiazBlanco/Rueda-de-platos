<div align="center">

# 🍽️ FoodDraft

### *Come variado, sin pensarlo cada día.*

![Sin build](https://img.shields.io/badge/build-ninguno-1f4d38?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-instalable-1f4d38?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Firebase-1f4d38?style=flat-square)
![Plan](https://img.shields.io/badge/plan-gratis%20%2B%20premium-d9a441?style=flat-square)
![Idiomas](https://img.shields.io/badge/idiomas-ES%20%C2%B7%20EN%20%C2%B7%20CA%20%C2%B7%20GL%20%C2%B7%20EU-d9a441?style=flat-square)

</div>

---

## Qué es esto

FoodDraft es una PWA que genera menús semanales variados a partir de **tus propios platos** — tú
decides qué comidas son válidas y con qué frecuencia; la app solo organiza la variedad y las
cantidades dentro de esa estructura. Calcula automáticamente tus objetivos nutricionales (BMR,
TDEE, macros) a partir de tu perfil, y lleva un seguimiento de peso con ciclos ocultos (no ves el
número día a día, solo la tendencia al cerrar el ciclo) y calibración asistida.

Nació como herramienta de uso personal y desde septiembre de 2026 se está abriendo a más usuarios
(registro por email o Google) con vistas a publicarla en Google Play. El núcleo es gratis para
siempre — generador de menús, objetivos nutricionales, catálogo de alimentos, Menú simple, lista
de la compra, despensa con su cocina dibujada, un módulo de entreno completo (rutinas, registro de
series con descanso y superseries, historial, récords, gráficas, mapa corporal, un gimnasio dibujado
por el que se pasea, importar entrenos de otras apps, exportación), sueño, pasos, período y el resumen
mensual de nutrición y entreno. Un plan premium (2,99 €/mes, con Stripe) añade lo que tiene coste de
servidor o valor claramente extra: seguimiento de peso (con su báscula), lector de etiquetas por foto,
«¿Qué cocino?» (recetas con lo que hay en casa) y los informes cruzados y el constructor de preguntas de
entreno, comida, peso, sueño y ciclo. La app se organiza en tres áreas — FoodDraft (nutrición), FitDraft
(entreno) y Cuerpo —, cada una con su barra inferior. La interfaz está disponible en español, inglés,
catalán, gallego y euskera.

La idea de fondo — por qué existe, qué papel juega la ciencia en cada decisión de diseño — está
desarrollada en los documentos explicativos del proyecto, que no se publican en este repositorio
(se incorporarán a la propia app). Este documento es solo el mapa técnico del repo.

## Arquitectura: cero build, a propósito

La app no tiene bundler, ni `npm install`, ni `package.json`. El navegador hace todo el trabajo:

```
index.html
  │  <script type="importmap">  → react, firebase y los módulos de logica/ por nombre corto
  │  Babel Standalone (CDN)     → transforma JSX al vuelo, sin paso de compilación
  ▼
auth-bootstrap.jsx   (login, Firestore, App Check, puente con las Cloud Functions)
  │  cargador-ui.js: descarga, pasa por Babel y enlaza app.jsx + ui/ (import/export normales)
  ▼
app.jsx + ui/        (componente principal + la interfaz, un archivo por pantalla o pieza)
  │  import { ... } from "nombre-corto"     ← resuelto por el importmap
  ▼
logica/*.js          (módulos de lógica pura, sin JSX, sin React)
```

La única pieza de servidor es `functions/` (Cloud Functions de Firebase: pagos con Stripe, Gemini
con cuota mensual y dos avisos programados por notificación push). Es un proyecto Node aparte, con su
propio `package.json`, y no forma parte de cómo carga el navegador la app.

Las reglas del proyecto están en [`CLAUDE.md`](./CLAUDE.md), y el porqué técnico completo (incluido
cómo se reparte la interfaz en varios archivos sin build) en
[`documentacion/arquitectura.md`](./documentacion/arquitectura.md) — léelos antes de tocar cómo carga
la app.

## Estructura del repositorio

```
Rueda-de-platos/
├── index.html                       entrada de la app + importmap
├── auth-bootstrap.jsx               login, Firestore, App Check, puente con las Cloud Functions
├── cargador-ui.js                   carga app.jsx + ui/ con Babel, sin build
├── app.jsx                          componente principal (estado, navegación y pantalla actual)
├── sw.js                            service worker (offline / PWA / notificaciones push)
├── manifest.json, icon.svg          metadatos de la PWA
├── privacidad.html, terminos.html   páginas legales (con selector de idioma propio)
│
├── ui/                              la interfaz (React), un archivo por pantalla o pieza
│   ├── archivos.json                  lista de archivos de ui/ (cargador + modo sin conexión)
│   ├── estilos.js, pantallas.jsx      tipografías; tabla destino → pantalla
│   ├── estado/                        hooks: datos, menú, catálogo, perfil, peso, despensa, entreno, cuerpo
│   ├── comun/                         piezas reutilizadas (modal, compartir, mapa corporal, avatar...)
│   ├── marco/                         Shell, cabecera, menú lateral, barra inferior de cristal y
│   │                                  navegacion.js (áreas FoodDraft · FitDraft · Cuerpo)
│   └── menu/, catalogo/, perfil/, onboarding/, peso/, premium/, ajustes/, despensa/, entreno/, cuerpo/
│
├── logica/                          lógica de negocio, sin JSX ni React
│   ├── comun.js, macros.js, seleccion.js         utilidades, macros por alimento, sorteo ponderado
│   ├── comida-calculo.js, comida-real.js         totales por comida y día; lo comido de verdad
│   ├── objetivos.js, menu-generador.js           BMR/TDEE/macros objetivo; el motor del menú
│   ├── peso.js, salud-publica.js                 tendencia de peso; sal/azúcares/fibra (OMS)
│   ├── resumen-mensual.js, informes.js           resumen del mes; informes cruzados y avisos
│   ├── cuerpo-series.js, cuerpo-diario.js        series diarias y estadística; sueño, pasos y favoritos
│   ├── periodo.js, mapa-corporal.js              período; mapa corporal por músculos
│   ├── datos-iniciales.js, cuestionario.js       catálogo base; cuestionario del alta
│   ├── migraciones.js                            migrateData (datos de versiones anteriores)
│   ├── despensa.js, lista-compra-neta.js         lo que hay en casa; lista de la compra neta
│   ├── nevera.js                                 dónde va cada cosa en la nevera dibujada
│   ├── entreno-ejercicios.js, entreno-nombres.js biblioteca de 80 ejercicios y sus nombres
│   ├── entreno-calculo.js, entreno-sesion.js     1RM, volumen, récords; el entreno en curso
│   ├── entreno-almacen.js, entreno-importar.js   entrenos por meses, índice y cola; importar CSV
│   ├── gimnasio.js                               el gimnasio dibujado de FitDraft
│   └── i18n.js                                   diccionario de textos ES/EN/CA/GL/EU
│
├── functions/                       Cloud Functions de Firebase (Node 22, proyecto aparte)
│   ├── index.js                       reexporta las funciones y fija el techo de instancias
│   ├── stripeWebhook.js               activa/desactiva el premium según Stripe
│   ├── createCheckoutSession.js       inicia la suscripción
│   ├── createPortalSession.js         gestión de la suscripción
│   ├── analyzeFoodPhoto.js            lector de etiquetas por foto (Gemini, con cuota)
│   ├── suggestRecipes.js              «¿Qué cocino?»: recetas en dos modos (Gemini, con cuota)
│   ├── suggestMeals.js                versión anterior de «¿Qué cocino?» (para copias sin actualizar)
│   ├── sendWeighInReminders.js        push diario de recordatorio de pesaje (09:00)
│   └── sendDefrostReminders.js        push nocturno para descongelar o comprar (21:30)
│
├── validacion/                      arnés de pruebas de regresión (no es parte de la app)
│   ├── index.html
│   └── tests.js
│
├── documentacion/                   un documento por área (arquitectura, menú, despensa, entreno...)
├── CLAUDE.md                        reglas del proyecto (y uno corto en cada carpeta de área)
├── LICENSE                          todos los derechos reservados
└── README.md                        este archivo
```

La documentación de trabajo (fundamentos nutricionales, papers de referencia, investigaciones,
ideas) vive en una carpeta `local/` que está en `.gitignore`: GitHub Pages publica todo lo que esté
versionado, así que en el repositorio solo está el código.

## Previsualizar en local

No abras `index.html` con doble clic (`file://`) — los `fetch` y los imports del `importmap` no
resuelven igual y algunas cosas fallan en silencio. Sirve la carpeta por HTTP:

```bash
py -3 -m http.server 8420
```

(en Windows; en macOS o Linux, `python3 -m http.server 8420`)

y abre `http://localhost:8420/`. El inicio de sesión real necesita conexión a Firebase, así que
para probar solo los cálculos (sin login) usa en su lugar `validacion/index.html` — carga
`app.jsx` y `ui/` con el mismo cargador que la app y ejecuta un conjunto de casos de prueba contra resultados ya verificados a
mano. Las Cloud Functions no se pueden probar así: viven en `functions/` y se despliegan aparte
(`firebase deploy --only functions`).

## Despliegue

La app se sirve desde **GitHub Pages**, sin paso de build: un push a `main` llega a la app real en
cuestión de minutos. Como no hay CI que lo frene, conviene pasar por `validacion/` antes de subir
nada. Las Cloud Functions, en cambio, se despliegan a mano.

## Stack técnico

| Pieza | Uso |
|---|---|
| **React 18** | UI, vía [esm.sh](https://esm.sh) — sin instalar nada |
| **Babel Standalone** | transforma JSX en el navegador, en tiempo real |
| **Firebase Auth** | login (email/contraseña y Google) |
| **Firestore** | guardado de datos, un documento por usuario y clave |
| **Firebase App Check** | protege Firestore, Auth y las funciones callable de tráfico que no venga de la propia app |
| **Cloud Functions (Node 22)** | pagos, Gemini con cuota mensual y recordatorios programados |
| **Stripe** | suscripción premium (Checkout y portal de facturación) |
| **Gemini (`@google/genai`)** | lee tablas nutricionales de una foto y sugiere recetas con lo que hay en casa |
| **Firebase Cloud Messaging** | notificaciones push: recordatorio de pesaje y aviso para descongelar |
| **GitHub Pages** | hosting de la app |
| **lucide-react** | iconos |

## Licencia

Todos los derechos reservados — ver [`LICENSE`](./LICENSE). El repositorio es público para poder servir
la app desde GitHub Pages, pero eso no concede ninguna licencia de uso del código. Los términos de uso
de la app lo recogen en su sección «Propiedad intelectual».

## Documentación relacionada

- [`CLAUDE.md`](./CLAUDE.md) — reglas técnicas del proyecto (qué hacer, qué no, y por qué)
- [`documentacion/`](./documentacion/) — cómo funciona cada área por dentro
- [Política de privacidad](./privacidad.html) y [términos de uso](./terminos.html)

<div align="center">

—

<sub>Proyecto independiente. No pretende sustituir la valoración de un profesional de la nutrición o del entrenamiento.</sub>

</div>
