import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CheckInForm } from "@/app/admin/events/[eventId]/check-in/check-in-form";
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
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Acreditacion
            </p>
            <h1 className="text-xl font-semibold">{event.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/admin/events/${event.id}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
              <QrCode className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">Escanear QR</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f625d]">
                Usa un lector QR externo o pega el payload del QR para registrar
                la llegada del asistente.
              </p>
            </div>
          </div>
          <CheckInForm eventId={event.id} />
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#5f625d]">Fecha</p>
            <p className="mt-1 font-semibold">{formatDate(event.starts_at)}</p>
          </div>
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#5f625d]">Inscritos</p>
            <p className="mt-1 text-3xl font-semibold">
              {event.event_registrations[0]?.count ?? 0}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
