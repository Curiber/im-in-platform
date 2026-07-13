import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "@/app/_components/service-worker-registration";
import { AppNav } from "@/app/app/_components/app-nav";
import {
  getAttendeeUser,
  getMyPendingCounts,
} from "@/lib/attendee-account";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // El proxy ya exige sesion para /app; esto es defensa en profundidad y provee
  // el email para la barra de navegacion.
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app");
  }

  const pending = await getMyPendingCounts();

  return (
    <div className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <AppNav
        email={user.email ?? null}
        pendingConnections={pending.connections}
        pendingMeetings={pending.meetings}
      />
      {children}
      <ServiceWorkerRegistration />
    </div>
  );
}
