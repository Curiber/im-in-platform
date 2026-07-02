"use client";

import { useEffect } from "react";

// Registra el service worker de la PWA (Fase 4.3, spec 28). Montado en el
// layout del flujo del asistente (/e/[slug]): es la superficie que se instala
// como app durante el evento. El scope '/' cubre toda la navegacion una vez
// registrado. `updateViaCache: "none"` evita que el propio SW quede pegado en
// el cache HTTP.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        // La PWA es mejora progresiva: sin SW la web sigue funcionando igual.
        console.error("No se pudo registrar el service worker", error);
      });
  }, []);

  return null;
}
