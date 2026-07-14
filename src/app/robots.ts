import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

// robots.txt (convencion de metadata del App Router). Mantiene fuera de los
// indices de busqueda las superficies autenticadas o privadas: el panel del
// organizador (/admin), el hub del asistente (/app), las APIs, el callback de
// auth y las paginas de acceso. Lo publico y pensado para compartirse (landing
// /, pagina de evento /e/[slug], tarjetas /p/[slug], demo) queda indexable.
//
// Dentro de un evento SOLO la landing /e/[slug] es publica: las sub-rutas del
// asistente (register, registered, check-email, verify, directory, connections,
// meetings, profile) llevan registrationId + token en la URL y muestran datos
// privados (nombres, QR de credencial, contactos). Se bloquean explicitamente
// con patrones /e/*/<segmento> para que un crawler no las liste ni cachee.
//
// Es solo higiene: esas rutas ya exigen sesion/token o redirigen. No expone
// nada nuevo (no declara sitemap de eventos/tarjetas: listar contenido en
// buscadores es una decision aparte).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/app",
        "/api",
        "/auth",
        "/acceso",
        "/login",
        "/mi",
        "/e/*/register",
        "/e/*/registered",
        "/e/*/check-email",
        "/e/*/verify",
        "/e/*/directory",
        "/e/*/connections",
        "/e/*/meetings",
        "/e/*/profile",
      ],
    },
    host: getAppUrl(),
  };
}
