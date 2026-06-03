import { Calendar, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicEvent = {
  name: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  capacity: number;
  networking_enabled: boolean;
  organizations: {
    name: string;
  } | null;
};

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "name, description, starts_at, location, capacity, networking_enabled, organizations(name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("event_type", "open")
    .single()
    .returns<PublicEvent>();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <section className="border-b border-[#d9d5cb] bg-[#102923] text-white">
        <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9bd8b5]">
            {event.organizations?.name ?? "I'm IN"}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            {event.name}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#d9efe2]">
            {event.description ||
              "Inscribete y prepara tu networking antes del evento."}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-8 md:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Inscripcion</h2>
          <p className="mt-3 leading-7 text-[#4a4d49]">
            El formulario publico de inscripcion sera la siguiente tarea del
            MVP. Este link ya queda generado desde el panel organizador y
            preparado para recibir asistentes.
          </p>
          <button
            className="mt-6 h-11 rounded-md bg-[#102923] px-5 text-sm font-semibold text-white disabled:opacity-65"
            disabled
            type="button"
          >
            Formulario en construccion
          </button>
        </div>

        <aside className="space-y-3">
          <Info
            icon={<Calendar className="size-5" aria-hidden="true" />}
            label="Fecha"
            value={formatDate(event.starts_at)}
          />
          <Info
            icon={<MapPin className="size-5" aria-hidden="true" />}
            label="Lugar"
            value={event.location ?? "Por definir"}
          />
          <Info
            icon={<Users className="size-5" aria-hidden="true" />}
            label="Cupos"
            value={`${event.capacity}`}
          />
        </aside>
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
      <span className="text-[#2f6f4e]">{icon}</span>
      <p className="mt-3 text-sm text-[#5f625d]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
