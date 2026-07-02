import { ArrowLeft, CalendarClock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  createMeetingLocation,
  setMeetingLocationArchived,
  updateMeetingLocation,
} from "@/app/admin/events/[eventId]/meetings/actions";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { formatDateTimeRange } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MeetingLocation = {
  id: string;
  name: string;
  capacity: number | null;
  notes: string | null;
  archived_at: string | null;
};

type MeetingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

type MeetingRow = {
  id: string;
  status: MeetingStatus;
  starts_at: string;
  ends_at: string;
  requester: { full_name_snapshot: string } | null;
  receiver: { full_name_snapshot: string } | null;
  location: { name: string } | null;
};

const statusLabels: Record<MeetingStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  declined: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completada",
};

const statusFilters: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "accepted", label: "Aceptadas" },
  { value: "completed", label: "Completadas" },
  { value: "declined", label: "Rechazadas" },
  { value: "cancelled", label: "Canceladas" },
];

export default async function EventMeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { eventId } = await params;
  const { status } = await searchParams;
  const activeFilter = status ?? "all";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<{ id: string; name: string }>();

  if (!event) {
    notFound();
  }

  let meetingsQuery = supabase
    .from("meetings")
    .select(
      "id, status, starts_at, ends_at, requester:event_registrations!meetings_requester_registration_id_fkey(full_name_snapshot), receiver:event_registrations!meetings_receiver_registration_id_fkey(full_name_snapshot), location:meeting_locations(name)",
    )
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  if (activeFilter !== "all") {
    meetingsQuery = meetingsQuery.eq("status", activeFilter);
  }

  const [{ data: locations }, { data: meetings }] = await Promise.all([
    supabase
      .from("meeting_locations")
      .select("id, name, capacity, notes, archived_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .returns<MeetingLocation[]>(),
    meetingsQuery.returns<MeetingRow[]>(),
  ]);

  const activeLocations = (locations ?? []).filter((l) => !l.archived_at);
  const archivedLocations = (locations ?? []).filter((l) => l.archived_at);

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950"
            href={`/admin/events/${event.id}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {event.name}
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Reuniones
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Puntos de encuentro y agenda</h1>
        </div>

        {/* Ubicaciones */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-5 text-brand-cyan-500" aria-hidden="true" />
            Puntos de encuentro
          </h2>
          <p className="mt-1 text-sm text-brand-slate-600">
            Mesas o salas donde los asistentes se reuniran. Define capacidad y
            notas; archiva los que no uses.
          </p>

          <div className="mt-4 space-y-2">
            {activeLocations.length ? (
              activeLocations.map((location) => (
                <LocationRow
                  eventId={event.id}
                  key={location.id}
                  location={location}
                />
              ))
            ) : (
              <p className="rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
                Aun no hay puntos de encuentro. Agrega el primero abajo.
              </p>
            )}
          </div>

          <form
            action={createMeetingLocation}
            className="mt-4 grid gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 sm:grid-cols-[1fr_140px]"
          >
            <input name="eventId" type="hidden" value={event.id} />
            <input
              className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 sm:col-span-2"
              maxLength={120}
              name="name"
              placeholder="Nombre (Mesa 1, Sala Norte...)"
              required
            />
            <input
              className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
              min="1"
              name="capacity"
              placeholder="Capacidad"
              type="number"
            />
            <input
              className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 sm:col-span-2"
              maxLength={500}
              name="notes"
              placeholder="Notas opcionales"
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900 sm:col-span-2 sm:justify-self-start"
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar punto de encuentro
            </button>
          </form>

          {archivedLocations.length ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand-slate-600">
                Archivados ({archivedLocations.length})
              </summary>
              <div className="mt-3 space-y-2">
                {archivedLocations.map((location) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3"
                    key={location.id}
                  >
                    <span className="text-sm text-brand-slate-600">
                      {location.name}
                    </span>
                    <form action={setMeetingLocationArchived}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="locationId" type="hidden" value={location.id} />
                      <input name="archived" type="hidden" value="false" />
                      <button
                        className="text-sm font-semibold text-brand-navy-950 hover:underline"
                        type="submit"
                      >
                        Restaurar
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {/* Reuniones */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock
              className="size-5 text-brand-cyan-500"
              aria-hidden="true"
            />
            Reuniones agendadas
          </h2>
          <p className="mt-1 text-sm text-brand-slate-600">
            Vista de solo lectura. Los asistentes proponen y aceptan reuniones
            desde su experiencia (proximamente); aqui las supervisas.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Link
                className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-brand-navy-950 text-white"
                    : "border border-brand-border bg-white text-brand-slate-600 hover:bg-brand-surface-soft"
                }`}
                href={`/admin/events/${event.id}/meetings?status=${filter.value}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {meetings?.length ? (
              meetings.map((meeting) => (
                <div
                  className="flex flex-col gap-2 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={meeting.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-navy-950">
                      {meeting.requester?.full_name_snapshot ?? "?"} ·{" "}
                      {meeting.receiver?.full_name_snapshot ?? "?"}
                    </p>
                    <p className="text-sm text-brand-slate-600">
                      {formatDateTimeRange(meeting.starts_at, meeting.ends_at)}
                      {meeting.location ? ` · ${meeting.location.name}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex h-7 shrink-0 items-center self-start rounded-full bg-white px-3 text-xs font-semibold text-brand-navy-950">
                    {statusLabels[meeting.status]}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
                No hay reuniones {activeFilter === "all" ? "" : "con ese estado"}{" "}
                todavia.
              </p>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function LocationRow({
  eventId,
  location,
}: {
  eventId: string;
  location: MeetingLocation;
}) {
  return (
    <div className="rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-brand-navy-950">
            {location.name}
            {location.capacity ? (
              <span className="ml-2 text-sm text-brand-slate-600">
                cap. {location.capacity}
              </span>
            ) : null}
          </p>
          {location.notes ? (
            <p className="text-sm text-brand-slate-600">{location.notes}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <details className="text-right">
            <summary className="cursor-pointer text-sm font-semibold text-brand-navy-950">
              Editar
            </summary>
            <form
              action={updateMeetingLocation}
              className="mt-3 grid gap-2 text-left"
            >
              <input name="eventId" type="hidden" value={eventId} />
              <input name="locationId" type="hidden" value={location.id} />
              <input
                className="h-9 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={location.name}
                maxLength={120}
                name="name"
                required
              />
              <input
                className="h-9 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={location.capacity ?? ""}
                min="1"
                name="capacity"
                placeholder="Capacidad"
                type="number"
              />
              <input
                className="h-9 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={location.notes ?? ""}
                maxLength={500}
                name="notes"
                placeholder="Notas"
              />
              <button
                className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-navy-950 px-3 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                type="submit"
              >
                Guardar
              </button>
            </form>
          </details>
          <form action={setMeetingLocationArchived}>
            <input name="eventId" type="hidden" value={eventId} />
            <input name="locationId" type="hidden" value={location.id} />
            <input name="archived" type="hidden" value="true" />
            <button
              className="text-sm font-semibold text-brand-slate-600 hover:text-red-700"
              type="submit"
            >
              Archivar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
