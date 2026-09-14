const CACHE_NAME = "fooddraft-v3";
const FILES_TO_CACHE = [
  "./", "./index.html", "./app.jsx", "./auth-bootstrap.jsx", "./manifest.json", "./icon.svg",
  "./Logica/comun.js", "./Logica/macros.js", "./Logica/seleccion.js", "./Logica/comida-calculo.js",
  "./Logica/objetivos.js", "./Logica/menu-generador.js", "./Logica/peso.js", "./Logica/salud-publica.js",
  "./Logica/resumenMensual.js", "./Logica/i18n.js",
];

// ---------- Notificaciones push en segundo plano (Fase 6) ----------
// Se usa el SDK "compat" de Firebase por importScripts en vez de los módulos ES que usa el resto
// de la app (ver auth-bootstrap.jsx e index.html): es la forma que documenta Firebase para
// service workers clásicos como este (registrado sin {type:"module"} en index.html), y funciona
// igual en todos los navegadores sin depender de que soporten "module workers". Solo se activa si
// el navegador soporta FCM — si falla la carga (sin conexión la primera vez, navegador sin
// soporte), el resto del service worker (caché offline de arriba) sigue funcionando igual.
try {
  importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js");

  firebase.initializeApp({
    apiKey: "AIzaSyDFTu5zVLHA7KjXiW7tKM1Ufa-vY2L8A_o",
    authDomain: "rueda-de-platos.firebaseapp.com",
    projectId: "rueda-de-platos",
    storageBucket: "rueda-de-platos.firebasestorage.app",
    messagingSenderId: "477523566905",
    appId: "1:477523566905:web:130cdede8cb500cbdac8e8",
  });

  // Se dispara solo cuando la app está cerrada o en segundo plano (con la app abierta y en
  // primer plano, Firebase entrega el mensaje directo al cliente, sin pasar por aquí) — por eso
  // hace falta mostrar la notificación a mano con showNotification, cosa que el navegador no hace
  // solo para un mensaje "data-only"/en segundo plano.
  firebase.messaging().onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    self.registration.showNotification(title || "FoodDraft", {
      body: body || "",
      // Sin icono en PNG todavía (ver la hoja de ruta de publicación, Fase 7) — el navegador usa
      // su icono por defecto mientras tanto. Cuando exista ./icon-192.png, añadirlo aquí.
      tag: "recordatorio-pesaje",
    });
  });
} catch (e) {
  // No pasa nada: el resto del service worker (caché offline) sigue funcionando sin notificaciones.
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia "red primero": si hay conexión, siempre coge la versión más reciente del servidor
// (y la guarda en caché de paso). Solo usa la copia guardada si no hay conexión.
// Así, cada vez que actualices los archivos en GitHub, se refleja solo la próxima vez que abras
// la app con internet, sin tener que borrar nada a mano.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
