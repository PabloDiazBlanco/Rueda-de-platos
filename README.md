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
de la compra y resumen mensual básico. Un plan premium (2,99 €/mes, con Stripe) añade lo que tiene
coste de servidor o valor claramente extra: seguimiento de peso, lector de etiquetas por foto,
«¿qué puedo cocinar con lo que tengo?» y el resumen mensual ampliado. La interfaz está disponible
en español, inglés, catalán, gallego y euskera.

La idea de fondo — por qué existe, qué papel juega la ciencia en cada decisión de diseño — está
desarrollada en `PDFs explicativos/`, no aquí. Este documento es solo el mapa técnico del repo.

## Arquitectura: cero build, a propósito

No hay bundler, no hay `npm install`, no hay `package.json`. El navegador hace todo el trabajo:

```
index.html
  │  <script type="importmap">  → react, firebase y los módulos de Logica/ por nombre corto
  │  Babel Standalone (CDN)     → transforma JSX al vuelo, sin paso de compilación
  ▼
auth-bootstrap.jsx   (login, Firestore, App Check, puente con las Cloud Functions)
  │  fetch + Babel.transform + Blob + import() dinámico
  ▼
app.jsx              (todos los componentes React)
  │  import { ... } from "nombre-corto"     ← resuelto por el importmap
  ▼
Logica/*.js          (10 módulos de lógica pura, sin JSX, sin React)
```

La única pieza de servidor es `functions/` (Cloud Functions de Firebase: pagos con Stripe, Gemini
con cuota mensual y el recordatorio de pesaje por notificación push). Es un proyecto Node aparte,
con su propio `package.json`, y no forma parte de cómo carga el navegador la app.

Esta decisión está documentada con su porqué técnico completo (incluida la razón de que la UI
**no** esté dividida en más archivos) en [`CLAUDE.md`](./CLAUDE.md) — léelo antes de tocar cómo
carga la app.

## Estructura del repositorio

```
Rueda-de-platos/
├── index.html                       entrada de la app + importmap
├── auth-bootstrap.jsx               login, Firestore, App Check, puente con las Cloud Functions
├── app.jsx                          todos los componentes React
├── sw.js                            service worker (offline / PWA / notificaciones push)
├── manifest.json, icon.svg          metadatos de la PWA
├── privacidad.html, terminos.html   páginas legales (con selector de idioma propio)
│
├── Logica/                          lógica de negocio, sin JSX
│   ├── comun.js                       uid(), DAYS
│   ├── macros.js                      cálculo de macros por alimento
│   ├── seleccion.js                   sorteo ponderado + reglas de combinación
│   ├── comida-calculo.js              totales por comida/día, lista de la compra
│   ├── objetivos.js                   BMR/TDEE/macros objetivo, presets de reparto de comidas
│   ├── menu-generador.js              el motor de generación del menú
│   ├── peso.js                        tendencia de peso, cambios atípicos
│   ├── salud-publica.js               sal/azúcares/fibra frente a los umbrales de la OMS
│   ├── resumenMensual.js              resumen del mes (comidas completadas + peso)
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
├── Validacion/                      arnés de pruebas de regresión (no es parte de la app)
│   ├── index.html
│   └── tests.js
│
├── PDFs explicativos/               fundamentos nutricionales y evidencia científica
├── Estudios de apoyo de la aplicacion/   papers académicos originales (con DOI)
├── reports/, research_notes/        investigaciones a fondo tras decisiones de cálculo concretas
├── Traducciones/, Traducciones corregidas/   material de revisión de la internacionalización
├── Ideas futuras.md                 apuntes de mejoras pendientes, sin priorizar
│
├── CLAUDE.md                        convenciones del proyecto
└── README.md                        este archivo
```

## Previsualizar en local

No abras `index.html` con doble clic (`file://`) — los `fetch` y los imports del `importmap` no
resuelven igual y algunas cosas fallan en silencio. Sirve la carpeta por HTTP:

```bash
python -m http.server 8420
```

y abre `http://localhost:8420/`. El inicio de sesión real necesita conexión a Firebase, así que
para probar solo los cálculos (sin login) usa en su lugar `Validacion/index.html` — carga
`app.jsx` tal cual y ejecuta un conjunto de casos de prueba contra resultados ya verificados a
mano. Las Cloud Functions no se pueden probar así: viven en `functions/` y se despliegan aparte
(`firebase deploy --only functions`).

## Despliegue

La app se sirve desde **GitHub Pages**, sin paso de build: un push a `main` llega a la app real en
cuestión de minutos. Como no hay CI que lo frene, conviene pasar por `Validacion/` antes de subir
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

## Documentación relacionada

- [`CLAUDE.md`](./CLAUDE.md) — convenciones técnicas del proyecto (qué hacer, qué no, y por qué)
- [`PDFs explicativos/Idea general.pdf`](<./PDFs explicativos/Idea general.pdf>) — el concepto de la app, para quien no es técnico
- [`PDFs explicativos/Rueda_de_Platos_Documentacion.pdf`](<./PDFs explicativos/Rueda_de_Platos_Documentacion.pdf>) — documentación técnica y funcional completa
- [`Ideas futuras.md`](<./Ideas futuras.md>) — mejoras pendientes
- [`PDFs explicativos/Rueda_de_Platos_Fundamentos_Nutricionales.pdf`](<./PDFs explicativos/Rueda_de_Platos_Fundamentos_Nutricionales.pdf>) — la ciencia detrás de cada fórmula
- [`PDFs explicativos/Rueda_de_Platos_Evidencia_Cientifica.pdf`](<./PDFs explicativos/Rueda_de_Platos_Evidencia_Cientifica.pdf>) — qué estudio concreto respalda cada decisión

<div align="center">

—

<sub>Proyecto independiente. No pretende sustituir la valoración de un profesional de la nutrición o del entrenamiento.</sub>

</div>
