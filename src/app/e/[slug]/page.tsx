import { Calendar, CalendarClock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PublicEvent = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  capacity: number;
  networking_enabled: boolean;
  status: "published" | "closed";
  organizations: {
    name: string;
  } | null;
};

type PublicAgendaItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
};

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, description, starts_at, location, capacity, networking_enabled, status, organizations(name)",
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .in("status", ["published", "closed"])
    .single()
    .returns<PublicEvent>();

  if (!event) {
    notFound();
  }

  const { data: agendaItems } = await supabase
    .from("event_agenda_items")
    .select("id, title, description, location, starts_at, ends_at")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true })
    .returns<PublicAgendaItem[]>();

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
        <div className="space-y-6">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">Inscripcion</h2>
            <p className="mt-3 leading-7 text-[#4a4d49]">
              Completa tu inscripcion para recibir tu credencial QR de acceso
              y activar el networking del evento.
            </p>
            {event.status === "published" ? (
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#102923] px-5 text-sm font-semibold text-white hover:bg-[#183b33]"
                href={`/e/${slug}/register`}
              >
                Inscribirme
              </Link>
            ) : (
              <p className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-[#d9d5cb] px-5 text-sm font-semibold text-[#5f625d]">
                Inscripciones cerradas
              </p>
            )}
          </div>

          {agendaItems?.length ? (
            <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-semibold">
                <CalendarClock
                  className="size-6 text-[#2f6f4e]"
                  aria-hidden="true"
                />
                Agenda
              </h2>
              <div className="mt-5 space-y-4">
                {agendaItems.map((item) => (
                  <div
                    className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4"
                    key={item.id}
                  >
                    <p className="text-sm font-semibold text-[#254f74]">
                      {formatTimeRange(item.starts_at, item.ends_at)}
                    </p>
                    <p className="mt-1 font-semibold">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-6 text-[#5f625d]">
                        {item.description}
                      </p>
                    ) : null}
                    {item.location ? (
                      <p className="mt-1 text-sm text-[#5f625d]">
                        {item.location}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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

function formatTimeRange(startsAt: string, endsAt: string | null) {
  const start = formatDate(startsAt);

  if (!endsAt) {
    return start;
  }

  const end = new Intl.DateTimeFormat("es-CL", {
    timeStyle: "short",
  }).format(new Date(endsAt));

  return `${start} - ${end}`;
}
