"use client";

import { useEffect } from "react";

// Registra el service worker de la PWA (spec 28). Se monta en las superficies
// instalables del asistente: el flujo del evento (/e/[slug]) y el hub /app
// (spec 37, que re-apunta la PWA a /app). El scope '/' cubre toda la navegacion
// una vez registrado; `updateViaCache: "none"` evita que el propio SW quede
// pegado en el cache HTTP. El SW solo cachea navegaciones /e/* (ver public/sw.js):
// las paginas autenticadas de /app no se cachean, solo se hace instalable.
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
