// Service worker minimo de la PWA (Fase 4.3, spec 28).
//
// Estrategia conservadora v1:
//   - Assets estaticos versionados (/_next/static, /brand, /icons): cache-first
//     (son inmutables por hash o cambian casi nunca).
//   - Navegaciones: network-first con fallback al cache (si ya visitaste la
//     pagina y te quedaste sin red dentro del evento, se muestra la ultima
//     copia). Las credenciales van en la query del URL, que es la clave del
//     cache del propio navegador (mismo alcance que el historial).
//   - Todo lo demas (server actions, POST, cross-origin): pasa directo a red.
//
// Sin precache: no hay lista de rutas estables que valga la pena precargar y
// el flujo del asistente depende de datos vivos.

const CACHE_NAME = "im-in-v1";

const STATIC_PREFIXES = ["/_next/static/", "/brand/", "/icons/"];

self.addEventListener("install", (event) => {
  // Activar de inmediato la version nueva del SW.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borrar caches de versiones anteriores.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}
