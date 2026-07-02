# 28. PWA instalable del asistente

## Estado

`implementado — Epic 45, Fase 4.3`

Implementa el item 4.3 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
PWA instalable (manifest + service worker). Cierra la Fase 4 y el puente
web/PWA del asistente previo a la app nativa (Fases 5-6).

## Problema

El asistente usa la web caminando por el evento: la friccion de abrir el
navegador y la fragilidad ante cortes de red restan frente a una app. Una PWA
instalable da icono en el home, pantalla completa y tolerancia basica a
perdidas de red, sin esperar a la app Expo.

## Objetivos

- App instalable (manifest valido + HTTPS): icono, nombre y colores de marca,
  `display: standalone`.
- Service worker minimo: la web sigue funcionando exactamente igual, con
  cache de estaticos y fallback de navegacion si se corta la red.

## No objetivos

- Offline completo / precache de rutas: el flujo depende de datos vivos.
- Push notifications (necesitan VAPID + persistencia de suscripciones; van
  con las notificaciones del spec 12 §C.4).
- Prompt de instalacion custom (`beforeinstallprompt` no es cross-browser; la
  guia de Next recomienda no usarlo).

## Decisiones

- **`src/app/manifest.ts`** (convencion de metadata del App Router): nombre,
  `start_url: "/"`, `display: standalone`, colores de marca (`theme_color`
  navy `#071b33`, `background_color` `#f7fafc`). Iconos 192/512 generados
  desde `public/brand/im-in-mark.png`; como el mark trae fondo blanco a sangre
  completa con el logo dentro de la zona segura, sirven como `any` y
  `maskable` sin variantes extra.
- **`public/sw.js`** conservador:
  - `/_next/static`, `/brand`, `/icons`: cache-first (inmutables por hash).
  - Navegaciones GET **solo del flujo del asistente (`/e/*`)**: network-first
    con fallback al cache (sin red, se muestra la ultima copia visitada). Se
    limita a `/e/*` a proposito: `/admin`, `/login` y demas superficies con
    datos sensibles NO se interceptan ni se cachean, para no servirlas offline
    tras cerrar sesion.
  - Todo lo demas (POST/server actions, cross-origin, /admin, /login): directo
    a red.
  - Las escrituras en cache van por `event.waitUntil(cache.put(...))`: el
    worker no termina antes de persistir (sin esto el fallback offline seria
    no determinista).
  - `install` -> `skipWaiting`; `activate` -> borra caches de versiones
    anteriores (`im-in-v1`) y `clients.claim()`.
- **Registro** en un client component (`ServiceWorkerRegistration`) montado en
  el layout nuevo del flujo del asistente (`/e/[slug]/layout.tsx`), con
  `scope: "/"` y `updateViaCache: "none"`. El scope es `/` (el SW vive en la
  raiz) pero solo cachea navegaciones `/e/*`. Mejora progresiva: si falla, la
  web sigue igual.
- **`next.config.ts`**: `Cache-Control: no-cache` para `/sw.js` (una version
  vieja pegada seguiria interceptando fetches tras un deploy).
- **`theme-color`** via `export const viewport` en el layout raiz.

### Privacidad

Las URLs del asistente llevan `registrationId` + `token` en la query y el
cache de navegaciones las almacena como clave. Es el mismo alcance que ya
tienen el historial y el cache HTTP del navegador (mitigado por el
`Referrer-Policy: no-referrer` de `/e/*`); no amplia la superficie. Si se
migra a token en cookie (Epic 26), el cache queda automaticamente sin
credenciales en la clave.

## Criterios de aceptacion

- Chrome/Edge (desktop y Android) ofrecen instalar la app en `/e/[slug]/*`;
  DevTools > Application reconoce manifest y SW sin errores.
- Con el SW activo, recargar una pagina del asistente sin red muestra la
  ultima copia en vez del dinosaurio.
- La web sin soporte de SW funciona exactamente igual que antes.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] `manifest.ts` + iconos 192/512.
- [x] `sw.js` (cache-first estaticos, network-first navegaciones).
- [x] Registro en el layout del flujo del asistente + `theme-color`.
- [x] Header `Cache-Control` para `/sw.js`.
- [ ] Prueba manual: instalar en Android/desktop, corte de red, Lighthouse.

## Riesgos / futuro

- El fallback de navegacion puede mostrar datos levemente desactualizados
  tras un corte de red (aceptable: es mejor que un error).
- Cuando exista auth de asistente (Fase 5), revisar la estrategia de cache
  para respuestas autenticadas por cookie.
