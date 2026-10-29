const CACHE_NAME = "fooddraft-v36";
// Las páginas legales van también: se enlazan desde la app (Ajustes, alta) y tienen que abrirse sin conexión
// (solo usan logica/i18n.js, que ya está en la lista).
const FILES_TO_CACHE = [
  "./", "./index.html", "./app.jsx", "./auth-bootstrap.jsx", "./cargador-ui.js", "./ui/archivos.json",
  "./manifest.json", "./icon.svg", "./privacidad.html", "./terminos.html",
  "./logica/comun.js", "./logica/macros.js", "./logica/seleccion.js", "./logica/comida-calculo.js",
  "./logica/objetivos.js", "./logica/menu-generador.js", "./logica/peso.js", "./logica/salud-publica.js",
  "./logica/resumen-mensual.js", "./logica/i18n.js", "./logica/datos-iniciales.js", "./logica/cuestionario.js",
  "./logica/migraciones.js", "./logica/despensa.js", "./logica/lista-compra-neta.js",
  "./logica/nevera.js", "./logica/entreno-ejercicios.js", "./logica/entreno-nombres.js",
  "./logica/entreno-calculo.js", "./logica/entreno-sesion.js", "./logica/entreno-almacen.js",
  "./logica/informes.js", "./logica/comida-real.js", "./logica/entreno-importar.js", "./logica/periodo.js",
  "./logica/cuerpo-diario.js", "./logica/cuerpo-series.js", "./logica/mapa-corporal.js", "./logica/gimnasio.js",
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
      // La etiqueta la manda la función (C8: «aviso-descongelar»), para que un aviso no sustituya a otro;
      // sin ella, la de siempre.
      tag: (payload.data && payload.data.tag) || "recordatorio-pesaje",
    });
  });
} catch (e) {
  // No pasa nada: el resto del service worker (caché offline) sigue funcionando sin notificaciones.
}

// Los archivos de la interfaz (ui/) no se listan aquí a mano: se leen de ui/archivos.json, la misma
// lista que usa cargador-ui.js, para que no se pueda olvidar ninguno (ver CLAUDE.md). Si algún
// archivo de la lista no existe, la instalación falla entera y se queda la versión anterior del
// service worker — mejor eso que una versión nueva que no funcione sin conexión.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(FILES_TO_CACHE);
      const lista = await (await fetch("./ui/archivos.json", { cache: "no-store" })).json();
      await cache.addAll(lista.map((ruta) => "./" + ruta));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== CACHE_CDN).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------- Librerías de los CDN (React, lucide, Babel, Firebase) ----------
// La app no arranca sin React, Babel y Firebase, que no son archivos nuestros: los sirven esm.sh, unpkg y
// gstatic. Hasta octubre de 2026 este service worker los dejaba pasar sin guardar copia, y solo estaban en la
// caché HTTP del navegador, que caduca: esm.sh sirve algunas piezas intermedias (p. ej. el `scheduler` que
// importa react-dom) con max-age=600. Comprobado a mano el 29-oct-2026: con la app abierta por última vez hacía
// más de 10 minutos y sin red, esa pieza fallaba y la app se quedaba en el marcador de arranque, sin llegar
// siquiera a la pantalla de «No se han podido cargar tus datos».
//
// Ahora se guardan en una caché propia, con la misma estrategia que lo nuestro (red primero, la copia solo sin
// conexión), así que con red nada cambia. Va aparte de CACHE_NAME para que subir de versión no la vacíe: sus
// direcciones llevan la versión de la librería, así que una copia vieja nunca se confunde con una nueva.
// Lo que sí hace falta es podarla: nadie más sabe qué copias han dejado de usarse, y cada versión nueva de una
// librería añadiría las suyas para siempre. **Al cambiar la versión de una librería en los importmaps (o la de
// Babel o la de Firebase de este archivo), sube CACHE_CDN**: activate borra entonces la caché anterior entera
// y la nueva se rellena sola en la siguiente apertura con red (una apertura sin red justo después de ese cambio
// no tendría copias: el mismo caso que la primera vez que se abre la app). Solo
// los hosts de la lista (nunca Firestore, Authentication ni App Check, que son datos y llamadas en vivo), solo
// GET y solo respuestas correctas y legibles (CORS: las de módulos y la de Babel con `crossorigin` lo son; el
// `integrity` de Babel se sigue comprobando igual sobre la copia).
const CACHE_CDN = "fooddraft-cdn-v1";
function esLibreriaDeCDN(url) {
  if (url.hostname === "esm.sh" || url.hostname === "unpkg.com") return true;
  return url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
}

// Estrategia "red primero": si hay conexión, siempre coge la versión más reciente del servidor
// (y la guarda en caché de paso). Solo usa la copia guardada si no hay conexión.
// Así, cada vez que actualices los archivos en GitHub, se refleja solo la próxima vez que abras
// la app con internet, sin tener que borrar nada a mano.
// { cache: "no-cache" } es la parte que hace esto de verdad "red primero": sin esto, un fetch()
// normal puede devolver la copia que el propio navegador tenga en su caché HTTP (GitHub Pages
// sirve estos archivos con Cache-Control: max-age=600) sin llegar a tocar el servidor — el service
// worker "cree" que pidió lo último, pero recibe una copia de hasta 10 minutos de antigüedad.
// «no-cache» pregunta siempre al servidor, pero con la copia que tenga (If-None-Match / ETag): si el
// archivo no ha cambiado, la respuesta es un 304 de unos bytes y se usa esa copia. Hasta octubre de 2026
// era «no-store», que también iba siempre al servidor pero sin preguntar nada: cada apertura descargaba
// enteros los ~140 archivos propios (~2,3 MB), aunque no hubiera cambiado ninguno.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    if (event.request.method !== "GET" || !esLibreriaDeCDN(url)) return;
    // Sin `cache: "no-cache"`: estas direcciones llevan la versión, así que la caché HTTP del navegador
    // puede servirlas mientras le dure (como hasta ahora). `ignoreVary`: esm.sh varía la respuesta por
    // cabeceras que el service worker no ve (User-Agent, Origin), y sin esto la copia podría no encontrarse.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.type === "cors") {
            const clone = response.clone();
            caches.open(CACHE_CDN).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request, { ignoreVary: true }).then((copia) => copia || Promise.reject(new Error("sin red y sin copia")))
        )
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
