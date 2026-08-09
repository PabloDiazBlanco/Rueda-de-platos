const CACHE_NAME = "rueda-de-platos-v2";
const FILES_TO_CACHE = ["./", "./index.html", "./app.jsx", "./manifest.json", "./icon.svg"];

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
