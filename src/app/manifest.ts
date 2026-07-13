import type { MetadataRoute } from "next";

// PWA del asistente (spec 28, re-apuntada a /app por el spec 37). Los iconos
// 192/512 se generan desde el mark de marca (fondo blanco a sangre completa,
// logo dentro de la zona segura, asi que sirven como `any` y `maskable`).
//
// start_url/id apuntan a /app: el hub del asistente con cuenta es la superficie
// instalable (si no hay sesion, /app redirige a /acceso). El scope sigue en '/'
// para que la app instalada navegue tambien las paginas publicas de eventos.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "I'M IN — Eventos y networking",
    short_name: "I'M IN",
    description:
      "Plataforma de inscripcion, acreditacion y networking para eventos.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f7fafc", // --brand-surface-soft
    theme_color: "#071b33",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
