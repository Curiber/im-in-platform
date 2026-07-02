// Service worker minimo de la PWA (Fase 4.3, spec 28).
//
// Estrategia conservadora v1:
//   - Assets estaticos versionados (/_next/static, /brand, /icons): cache-first
//     (son inmutables por hash o cambian casi nunca).
//   - Navegaciones DEL FLUJO DEL ASISTENTE (/e/*): network-first con fallback
//     al cache (si ya visitaste la pagina y te quedaste sin red dentro del
//     evento, se muestra la ultima copia). Se limita a /e/* a proposito: NO se
//     cachean /admin, /login ni otras superficies con datos sensibles, para no
//     servirlas offline despues de cerrar sesion.
//   - Todo lo demas (server actions, POST, cross-origin, /admin, /login): pasa
//     directo a red.
//
// Las credenciales del asistente van en la query del URL, que forma parte de
// la clave del cache (mismo alcance que el historial del navegador).
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
    event.respondWith(cacheFirst(request, event));
    return;
  }

  // Solo se cachean navegaciones del flujo del asistente. El resto (/admin,
  // /login, etc.) no se intercepta: va directo a red y nunca queda en cache.
  if (request.mode === "navigate" && url.pathname.startsWith("/e/")) {
    event.respondWith(networkFirst(request, event));
  }
});

async function cacheFirst(request, event) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    // waitUntil mantiene vivo el worker hasta que la escritura en cache
    // termina; sin esto el put podria quedar a medias.
    event.waitUntil(putInCache(request, response.clone()));
  }

  return response;
}

async function networkFirst(request, event) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      event.waitUntil(putInCache(request, response.clone()));
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function putInCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}
