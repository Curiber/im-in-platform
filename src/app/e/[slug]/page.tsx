import { Calendar, CalendarClock, MapPin, Users } from "lucide-react";
import Image from "next/image";
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
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <section className="overflow-hidden bg-[image:var(--brand-gradient-primary)] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_340px] lg:py-16">
          <div>
            <Link className="inline-flex rounded-md bg-white p-2" href="/">
              <Image
                alt="I'M IN"
                className="h-auto w-40"
                height={45}
                priority
                src="/brand/im-in-logo.png"
                width={180}
              />
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              {event.organizations?.name ?? "I'M IN"}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">
              {event.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/85">
              {event.description ||
                "Inscribete y prepara tu networking antes del evento."}
            </p>
            {event.status === "published" ? (
              <Link
                className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={`/e/${slug}/register`}
              >
                Inscribirme
              </Link>
            ) : (
              <p className="mt-8 inline-flex h-12 items-center justify-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white/80">
                Inscripciones cerradas
              </p>
            )}
          </div>

          <aside className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              Detalles
            </p>
            <div className="mt-5 space-y-3">
              <Info
                icon={<Calendar className="size-5" aria-hidden="true" />}
                label="Fecha"
                value={formatDate(event.starts_at)}
                variant="dark"
              />
              <Info
                icon={<MapPin className="size-5" aria-hidden="true" />}
                label="Lugar"
                value={event.location ?? "Por definir"}
                variant="dark"
              />
              <Info
                icon={<Users className="size-5" aria-hidden="true" />}
                label="Cupos"
                value={`${event.capacity}`}
                variant="dark"
              />
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-brand-navy-950">
              Tu experiencia de networking empieza aqui
            </h2>
            <p className="mt-3 leading-7 text-brand-slate-600">
              Recibe tu QR de acceso, crea un perfil reconocible y descubre
              asistentes con intereses afines antes y durante el evento.
            </p>
          </div>

          {agendaItems?.length ? (
            <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-brand-navy-950">
                <CalendarClock
                  className="size-6 text-brand-cyan-500"
                  aria-hidden="true"
                />
                Agenda
              </h2>
              <div className="mt-5 space-y-4">
                {agendaItems.map((item) => (
                  <div
                    className="rounded-md border border-brand-border bg-brand-surface-soft p-4"
                    key={item.id}
                  >
                    <p className="text-sm font-semibold text-brand-blue-700">
                      {formatTimeRange(item.starts_at, item.ends_at)}
                    </p>
                    <p className="mt-1 font-semibold text-brand-navy-950">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                    {item.location ? (
                      <p className="mt-1 text-sm text-brand-slate-600">
                        {item.location}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Que incluye
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-brand-slate-600">
            <p>Credencial QR para check-in.</p>
            <p>Perfil profesional para el directorio.</p>
            <p>Solicitudes de conexion durante el evento.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  variant,
  value,
}: {
  icon: ReactNode;
  label: string;
  variant?: "dark" | "light";
  value: string;
}) {
  if (variant === "dark") {
    return (
      <div className="rounded-md border border-white/15 bg-white/10 p-4">
        <span className="text-brand-mint-300">{icon}</span>
        <p className="mt-3 text-sm text-white/70">{label}</p>
        <p className="mt-1 font-semibold text-white">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
      <span className="text-brand-cyan-500">{icon}</span>
      <p className="mt-3 text-sm text-brand-slate-600">{label}</p>
      <p className="mt-1 font-semibold text-brand-navy-950">{value}</p>
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
