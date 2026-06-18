import { QrCode } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { CheckInForm } from "@/app/admin/events/[eventId]/check-in/check-in-form";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckInEvent = {
  id: string;
  name: string;
  starts_at: string;
  event_registrations: { count: number }[];
};

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, starts_at, event_registrations(count)")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single()
    .returns<CheckInEvent>();

  if (!event) {
    notFound();
  }

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Acreditacion
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{event.name}</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-brand-slate-100 text-brand-cyan-500">
              <QrCode className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">Escanear QR</h2>
              <p className="mt-2 text-sm leading-6 text-brand-slate-600">
                Usa un lector QR externo o pega el payload del QR para registrar
                la llegada del asistente.
              </p>
            </div>
          </div>
          <CheckInForm eventId={event.id} />
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
            <p className="text-sm text-brand-slate-600">Fecha</p>
            <p className="mt-1 font-semibold">{formatDate(event.starts_at)}</p>
          </div>
          <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
            <p className="text-sm text-brand-slate-600">Inscritos</p>
            <p className="mt-1 text-3xl font-semibold">
              {event.event_registrations[0]?.count ?? 0}
            </p>
          </div>
        </aside>
        </div>
      </section>
    </AdminShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
