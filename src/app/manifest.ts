import type { MetadataRoute } from "next";

// PWA del asistente (Fase 4.3, spec 28): manifest instalable. Los iconos
// 192/512 se generan desde el mark de marca (fondo blanco a sangre completa,
// logo dentro de la zona segura, asi que sirven como `any` y `maskable`).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "I'M IN — Eventos y networking",
    short_name: "I'M IN",
    description:
      "Plataforma de inscripcion, acreditacion y networking para eventos.",
    start_url: "/",
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
