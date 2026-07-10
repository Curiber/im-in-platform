import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las Server Actions limitan el body a 1 MB por defecto. La subida de foto
    // de perfil admite hasta 5 MB; se eleva el limite para que archivos entre
    // 1 y 5 MB lleguen a la action (con margen para el overhead del multipart).
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
        source: "/:path*",
      },
      {
        // Rutas de asistente que llevan registrationId + token en la query:
        // no enviar Referer (defensa en profundidad sobre el strict-origin
        // global, que ya evita filtrar la query cross-origin). El ultimo header
        // que matchea el mismo path gana, asi que este sobreescribe al global.
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
        ],
        source: "/e/:path*",
      },
      {
        // El service worker no debe quedar cacheado: una version vieja pegada
        // seguiria interceptando fetches aunque se despliegue una nueva.
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
        source: "/sw.js",
      },
    ];
  },
};

export default nextConfig;
