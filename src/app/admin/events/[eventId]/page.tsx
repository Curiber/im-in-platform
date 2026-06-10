import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Link2,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  closeEvent,
  createAgendaItem,
  deleteAgendaItem,
  publishEvent,
} from "@/app/admin/events/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string;
  arrival_starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  capacity: number;
  status: "draft" | "published" | "closed";
  event_type: "open" | "closed";
  modality: "in_person" | "online" | "hybrid";
  networking_enabled: boolean;
  organizations: {
    name: string;
  } | null;
};

type AgendaItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
};

export default async function AdminEventDetailPage({
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
    .select(
      "id, name, slug, description, starts_at, arrival_starts_at, ends_at, location, capacity, status, event_type, modality, networking_enabled, organizations(name)",
    )
    .eq("id", eventId)
    .single()
    .returns<EventDetail>();

  if (!event) {
    notFound();
  }

  const { data: agendaItems } = await supabase
    .from("event_agenda_items")
    .select("id, title, description, location, starts_at, ends_at")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true })
    .returns<AgendaItem[]>();

  const publicPath = `/e/${event.slug}`;

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">Evento</p>
            <h1 className="text-xl font-semibold">{event.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href="/admin/events"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <article className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-md bg-[#e3f0d9] px-3 py-1 text-sm font-semibold text-[#2f6f4e]">
                {formatStatus(event.status)}
              </span>
              <h2 className="mt-4 text-3xl font-semibold">{event.name}</h2>
              <p className="mt-2 text-[#5f625d]">
                {event.organizations?.name ?? "Organizacion"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                className="inline-flex h-10 items-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
                href={`/admin/events/${event.id}/edit`}
              >
                Editar
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
                href={`/admin/events/${event.id}/check-in`}
              >
                Check-in
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
                href={`/admin/events/${event.id}/dashboard`}
              >
                Dashboard
              </Link>
              {event.status === "draft" ? (
                <form action={publishEvent}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="slug" type="hidden" value={event.slug} />
                  <button
                    className="h-10 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
                    type="submit"
                  >
                    Publicar
                  </button>
                </form>
              ) : null}
              {event.status === "published" ? (
                <form action={closeEvent}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="slug" type="hidden" value={event.slug} />
                  <button
                    className="h-10 rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
                    type="submit"
                  >
                    Cerrar
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <p className="mt-6 max-w-3xl leading-7 text-[#4a4d49]">
            {event.description || "Sin descripcion por ahora."}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoBlock
              icon={<Calendar className="size-5" aria-hidden="true" />}
              label="Fecha"
              value={formatDate(event.starts_at)}
            />
            <InfoBlock
              icon={<MapPin className="size-5" aria-hidden="true" />}
              label="Lugar"
              value={event.location ?? "Por definir"}
            />
            <InfoBlock
              icon={<Users className="size-5" aria-hidden="true" />}
              label="Cupos"
              value={`${event.capacity}`}
            />
          </div>

          <div className="mt-10">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <CalendarClock
                className="size-5 text-[#2f6f4e]"
                aria-hidden="true"
              />
              Agenda
            </h3>

            {agendaItems?.length ? (
              <div className="mt-4 space-y-3">
                {agendaItems.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4"
                    key={item.id}
                  >
                    <div>
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
                    <form action={deleteAgendaItem}>
                      <input name="agendaItemId" type="hidden" value={item.id} />
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="slug" type="hidden" value={event.slug} />
                      <button
                        aria-label="Eliminar bloque"
                        className="rounded-md border border-[#d9d5cb] p-2 text-[#8a2f24] hover:bg-white"
                        type="submit"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4 text-sm text-[#5f625d]">
                Sin bloques de agenda todavia. Agrega el primero abajo.
              </p>
            )}

            <form
              action={createAgendaItem}
              className="mt-4 grid gap-4 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4 sm:grid-cols-2"
            >
              <input name="eventId" type="hidden" value={event.id} />
              <input name="slug" type="hidden" value={event.slug} />

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-[#1f2723]">
                  Titulo
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                  name="title"
                  placeholder="Charla, panel, networking..."
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#1f2723]">
                  Inicio
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#1f2723]">
                  Termino opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                  name="endsAt"
                  type="datetime-local"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#1f2723]">
                  Lugar opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                  name="location"
                  placeholder="Sala, escenario..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#1f2723]">
                  Descripcion opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                  name="description"
                  placeholder="Detalle breve del bloque"
                />
              </label>

              <button
                className="h-11 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33] sm:col-span-2 sm:justify-self-start sm:px-6"
                type="submit"
              >
                Agregar bloque
              </button>
            </form>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Link de inscripcion</h2>
            <div className="mt-4 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-3">
              <p className="break-all font-mono text-sm">{publicPath}</p>
            </div>
            {event.status === "draft" ? (
              <p className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#d9d5cb] text-sm font-semibold text-[#5f625d]">
                Publica el evento para ver la pagina
              </p>
            ) : (
              <Link
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d9d5cb] text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
                href={publicPath}
              >
                <Link2 className="size-4" aria-hidden="true" />
                Ver pagina publica
              </Link>
            )}
          </div>

          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Configuracion</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Tipo" value={event.event_type} />
              <Row label="Modalidad" value={event.modality} />
              <Row
                label="Networking"
                value={event.networking_enabled ? "Activo" : "Inactivo"}
              />
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
      <span className="text-[#2f6f4e]">{icon}</span>
      <p className="mt-3 text-sm text-[#5f625d]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#5f625d]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
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

function formatStatus(status: EventDetail["status"]) {
  const labels = {
    draft: "Borrador",
    published: "Publicado",
    closed: "Cerrado",
  };

  return labels[status];
}
