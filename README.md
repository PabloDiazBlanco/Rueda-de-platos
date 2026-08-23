<div align="center">

# 🍽️ Rueda de Platos

### *Come variado, sin pensarlo cada día.*

![Sin build](https://img.shields.io/badge/build-ninguno-1f4d38?style=flat-square)
![PWA](https://img.shields.io/badge/PWA-instalable-1f4d38?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Firebase-1f4d38?style=flat-square)
![Uso](https://img.shields.io/badge/uso-personal-d9a441?style=flat-square)
![Idioma](https://img.shields.io/badge/idioma-español-d9a441?style=flat-square)

</div>

---

## Qué es esto

Rueda de Platos es una PWA de uso personal que genera menús semanales variados a partir de **tus
propios platos** — tú decides qué comidas son válidas y con qué frecuencia; la app solo organiza
la variedad y las cantidades dentro de esa estructura. Calcula automáticamente tus objetivos
nutricionales (BMR, TDEE, macros) a partir de tu perfil, y lleva un seguimiento de peso con ciclos
ocultos (no ves el número día a día, solo la tendencia al cerrar el ciclo) y calibración asistida.

La idea de fondo — por qué existe, qué papel juega la ciencia en cada decisión de diseño — está
desarrollada en `PDFs explicativos/`, no aquí. Este documento es solo el mapa técnico del repo.

## Arquitectura: cero build, a propósito

No hay bundler, no hay `npm install`, no hay `package.json`. El navegador hace todo el trabajo:

```
index.html
  │  <script type="importmap">  → react, firebase y los módulos de Logica/ por nombre corto
  │  Babel Standalone (CDN)     → transforma JSX al vuelo, sin paso de compilación
  ▼
auth-bootstrap.jsx   (login, Firestore, arranque)
  │  fetch + Babel.transform + Blob + import() dinámico
  ▼
app.jsx              (todos los componentes React)
  │  import { ... } from "nombre-corto"     ← resuelto por el importmap
  ▼
Logica/*.js          (7 módulos de lógica pura, sin JSX, sin React)
```

Esta decisión está documentada con su porqué técnico completo (incluida la razón de que la UI
**no** esté dividida en más archivos) en [`CLAUDE.md`](./CLAUDE.md) — léelo antes de tocar cómo
carga la app.

## Estructura del repositorio

```
Rueda-de-platos/
├── index.html                       entrada de la app + importmap
├── auth-bootstrap.jsx               login, Firestore, arranque
├── app.jsx                          todos los componentes React
├── sw.js                            service worker (offline / PWA)
├── manifest.json, icon.svg          metadatos de la PWA
│
├── Logica/                          lógica de negocio, sin JSX
│   ├── comun.js                       uid(), DAYS
│   ├── macros.js                      cálculo de macros por alimento
│   ├── seleccion.js                   sorteo ponderado + reglas de combinación
│   ├── comida-calculo.js              totales por comida/día, lista de la compra
│   ├── objetivos.js                   BMR/TDEE/macros objetivo (Mifflin-St Jeor)
│   ├── menu-generador.js              el motor de generación del menú
│   └── peso.js                        tendencia de peso, cambios atípicos
│
├── Validacion/                      arnés de pruebas de regresión (no es parte de la app)
│   ├── index.html
│   └── tests.js
│
├── PDFs explicativos/               fundamentos nutricionales y evidencia científica
├── Estudios de apoyo de la aplicacion/   papers académicos originales (con DOI)
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
mano.

## Stack técnico

| Pieza | Uso |
|---|---|
| **React 18** | UI, vía [esm.sh](https://esm.sh) — sin instalar nada |
| **Babel Standalone** | transforma JSX en el navegador, en tiempo real |
| **Firebase Auth** | login (email/contraseña y Google) |
| **Firestore** | guardado de datos, un documento por usuario y clave |
| **Firebase App Check** | protege Firestore y Auth de tráfico que no venga de la propia app |
| **Firebase AI Logic (Gemini)** | lee tablas nutricionales a partir de una foto |
| **lucide-react** | iconos |

## Documentación relacionada

- [`CLAUDE.md`](./CLAUDE.md) — convenciones técnicas del proyecto (qué hacer, qué no, y por qué)
- [`PDFs explicativos/Rueda_de_Platos_Fundamentos_Nutricionales.pdf`](<./PDFs explicativos/Rueda_de_Platos_Fundamentos_Nutricionales.pdf>) — la ciencia detrás de cada fórmula
- [`PDFs explicativos/Rueda_de_Platos_Evidencia_Cientifica.pdf`](<./PDFs explicativos/Rueda_de_Platos_Evidencia_Cientifica.pdf>) — qué estudio concreto respalda cada decisión

<div align="center">

—

<sub>Proyecto personal. No pretende sustituir la valoración de un profesional de la nutrición o del entrenamiento.</sub>

</div>
