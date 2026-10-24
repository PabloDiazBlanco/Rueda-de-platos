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
de la compra, despensa, un módulo de entreno completo (rutinas, registro de series con descanso,
historial, récords, gráficas, exportación) y el resumen mensual de nutrición y entreno. Un plan premium
(2,99 €/mes, con Stripe) añade lo que tiene coste de servidor o valor claramente extra: seguimiento de
peso, lector de etiquetas por foto, «¿qué puedo cocinar con lo que tengo?» y los informes cruzados de
entreno, comida y peso. La app se organiza en tres áreas — FoodDraft (nutrición), Entrenamiento y
Cuerpo —, cada una con su barra inferior. La interfaz está disponible en español, inglés, catalán,
gallego y euskera.

La idea de fondo — por qué existe, qué papel juega la ciencia en cada decisión de diseño — está
desarrollada en los documentos explicativos del proyecto, que no se publican en este repositorio
(se incorporarán a la propia app). Este documento es solo el mapa técnico del repo.

## Arquitectura: cero build, a propósito

No hay bundler, no hay `npm install`, no hay `package.json`. El navegador hace todo el trabajo:

```
index.html
  │  <script type="importmap">  → react, firebase y los módulos de logica/ por nombre corto
  │  Babel Standalone (CDN)     → transforma JSX al vuelo, sin paso de compilación
  ▼
auth-bootstrap.jsx   (login, Firestore, App Check, puente con las Cloud Functions)
  │  cargador-ui.js: descarga, pasa por Babel y enlaza app.jsx + ui/ (import/export normales)
  ▼
app.jsx + ui/        (componente principal + 72 archivos de interfaz, por pantalla)
  │  import { ... } from "nombre-corto"     ← resuelto por el importmap
  ▼
logica/*.js          (22 módulos de lógica pura, sin JSX, sin React)
```

La única pieza de servidor es `functions/` (Cloud Functions de Firebase: pagos con Stripe, Gemini
con cuota mensual y el recordatorio de pesaje por notificación push). Es un proyecto Node aparte,
con su propio `package.json`, y no forma parte de cómo carga el navegador la app.

Esta decisión está documentada con su porqué técnico completo (incluido cómo se reparte la
interfaz en varios archivos sin build) en [`CLAUDE.md`](./CLAUDE.md) — léelo antes de tocar cómo
carga la app.

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
│   ├── estado/                        hooks: datos, menú, catálogo, perfil, peso, despensa, entreno
│   ├── comun/                         piezas reutilizadas
│   ├── marco/                         Shell, cabecera, menú lateral, barra inferior de cristal y
│   │                                  navegacion.js (áreas FoodDraft · Entrenamiento · Cuerpo)
│   └── menu/, catalogo/, perfil/, onboarding/, peso/, premium/, ajustes/, despensa/, entreno/, cuerpo/
│
├── logica/                          lógica de negocio, sin JSX ni React
│   ├── comun.js                       uid(), DAYS
│   ├── macros.js                      cálculo de macros por alimento
│   ├── seleccion.js                   sorteo ponderado + reglas de combinación
│   ├── comida-calculo.js              totales por comida/día, lista de la compra
│   ├── objetivos.js                   BMR/TDEE/macros objetivo, presets de reparto de comidas
│   ├── menu-generador.js              el motor de generación del menú
│   ├── peso.js                        tendencia de peso, cambios atípicos
│   ├── salud-publica.js               sal/azúcares/fibra frente a los umbrales de la OMS
│   ├── resumen-mensual.js             resumen del mes (comidas completadas + peso)
│   ├── datos-iniciales.js             catálogo base de alimentos y datos de una cuenta nueva
│   ├── cuestionario.js                cuestionario de catálogo del alta
│   ├── migraciones.js                 migrateData (datos guardados de versiones anteriores)
│   ├── despensa.js                    lo que hay en casa: zonas, consumos y compras
│   ├── lista-compra-neta.js           lista de la compra menos lo que ya tienes
│   ├── nevera.js                      dónde va cada cosa en la nevera dibujada y con qué dibujo
│   ├── entreno-ejercicios.js          biblioteca de ejercicios (80 de serie) y su búsqueda
│   ├── entreno-nombres.js             nombres de los ejercicios en los cinco idiomas
│   ├── entreno-calculo.js             1RM, volumen, récords, series por músculo, validación
│   ├── entreno-sesion.js              el entreno en curso: series, descanso, pausa, terminar
│   ├── entreno-almacen.js             entrenos por meses, índice, borrador, cola y CSV
│   ├── informes.js                    informes cruzados y aviso de actividad (área Cuerpo)
│   └── i18n.js                        diccionario de textos ES/EN/CA/GL/EU
│
├── functions/                       Cloud Functions de Firebase (Node 22, proyecto aparte)
│   ├── stripeWebhook.js               activa/desactiva el premium según Stripe
│   ├── createCheckoutSession.js       inicia la suscripción
│   ├── createPortalSession.js         gestión de la suscripción
│   ├── analyzeFoodPhoto.js            lector de etiquetas por foto (Gemini, con cuota)
│   ├── suggestMeals.js                «qué puedo cocinar» (Gemini, con cuota)
│   └── sendWeighInReminders.js        push diario de recordatorio de pesaje
│
├── validacion/                      arnés de pruebas de regresión (no es parte de la app)
│   ├── index.html
│   └── tests.js
│
├── CLAUDE.md                        convenciones del proyecto
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
python -m http.server 8420
```

y abre `http://localhost:8420/`. El inicio de sesión real necesita conexión a Firebase, así que
para probar solo los cálculos (sin login) usa en su lugar `validacion/index.html` — carga
`app.jsx` tal cual y ejecuta un conjunto de casos de prueba contra resultados ya verificados a
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
| **Gemini (`@google/genai`)** | lee tablas nutricionales de una foto y sugiere platos con lo que hay en casa |
| **Firebase Cloud Messaging** | notificaciones push del recordatorio de pesaje |
| **GitHub Pages** | hosting de la app |
| **lucide-react** | iconos |

## Licencia

Todos los derechos reservados — ver [`LICENSE`](./LICENSE). El repositorio es público para poder servir
la app desde GitHub Pages, pero eso no concede ninguna licencia de uso del código. Los términos de uso
de la app lo recogen en su sección «Propiedad intelectual».

## Documentación relacionada

- [`CLAUDE.md`](./CLAUDE.md) — convenciones técnicas del proyecto (qué hacer, qué no, y por qué)
- [Política de privacidad](./privacidad.html) y [términos de uso](./terminos.html)

<div align="center">

—

<sub>Proyecto independiente. No pretende sustituir la valoración de un profesional de la nutrición o del entrenamiento.</sub>

</div>
