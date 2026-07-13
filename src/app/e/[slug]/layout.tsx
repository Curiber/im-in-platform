import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/app/_components/service-worker-registration";

// Layout del flujo del asistente: solo agrega el registro del service worker
// de la PWA (spec 28) sobre las paginas del evento.
export default function EventLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ServiceWorkerRegistration />
    </>
  );
}
