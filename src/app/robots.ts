import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

// robots.txt (convencion de metadata del App Router). Mantiene fuera de los
// indices de busqueda las superficies autenticadas o privadas: el panel del
// organizador (/admin), el hub del asistente (/app), las APIs, el callback de
// auth y las paginas de acceso. Lo publico y pensado para compartirse (landing,
// paginas de evento /e/[slug], tarjetas /p/[slug], demo) queda indexable.
//
// Es solo higiene: esas rutas ya exigen sesion o redirigen; esto evita ademas
// que un crawler las liste o guarde. No expone nada nuevo (no declara sitemap
// de eventos/tarjetas: listar contenido en buscadores es una decision aparte).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/app", "/api", "/auth", "/acceso", "/login", "/mi"],
    },
    host: getAppUrl(),
  };
}
