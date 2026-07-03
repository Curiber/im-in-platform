import { ArrowLeft, Download, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AutoRefresh } from "@/app/admin/events/[eventId]/dashboard/_components/auto-refresh";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventSummary = {
  id: string;
  name: string;
  capacity: number;
};

type RegistrationMetric = {
  status:
    | "pending_verification"
    | "pending_approval"
    | "registered"
    | "checked_in"
    | "cancelled"
    | "no_show";
  public_profile_enabled: boolean;
  networking_opt_in: boolean;
  industry_snapshot: string | null;
  interests: string[];
};

type ConnectionMetric = {
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

type MeetingMetric = {
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  starts_at: string;
  ends_at: string;
  location_id: string | null;
};

type ProfileViewStats = {
  total_views: number;
  unique_viewers: number;
  top_viewed: { name: string; views: number }[];
};

export default async function EventDashboardPage({
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
    .select("id, name, capacity")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single()
    .returns<EventSummary>();

  if (!event) {
    notFound();
  }

  const [
    { data: registrations },
    { data: connections },
    { data: meetings },
    { data: locations },
    { data: viewStatsRows },
  ] = await Promise.all([
    supabase
      .from("event_registrations")
      .select(
        "status, public_profile_enabled, networking_opt_in, industry_snapshot, interests",
      )
      .eq("event_id", event.id)
      .returns<RegistrationMetric[]>(),
    supabase
      .from("connection_requests")
      .select("status")
      .eq("event_id", event.id)
      .returns<ConnectionMetric[]>(),
    supabase
      .from("meetings")
      .select("status, starts_at, ends_at, location_id")
      .eq("event_id", event.id)
      .returns<MeetingMetric[]>(),
    supabase
      .from("meeting_locations")
      .select("id, name")
      .eq("event_id", event.id)
      .returns<{ id: string; name: string }[]>(),
    // Agregacion en la DB (count, count distinct, ranking top-8): evita bajar
    // toda profile_views (tabla sin limite) en cada refresco.
    supabase.rpc("event_profile_view_stats", { p_event_id: event.id }),
  ]);

  const viewStats: ProfileViewStats =
    (viewStatsRows as ProfileViewStats[] | null)?.[0] ?? {
      total_views: 0,
      unique_viewers: 0,
      top_viewed: [],
    };

  // "Activas" = ya confirmadas (verificadas y, si el evento lo exige, aprobadas).
  // Excluye pending_verification / pending_approval / cancelled / no_show para
  // que las metricas no se inflen con inscripciones no confirmadas.
  const activeRegistrations = (registrations ?? []).filter(
    (registration) =>
      registration.status === "registered" ||
      registration.status === "checked_in",
  );
  const checkedIn = activeRegistrations.filter(
    (registration) => registration.status === "checked_in",
  );
  const publicProfiles = activeRegistrations.filter(
    (registration) => registration.public_profile_enabled,
  );
  const networking = activeRegistrations.filter(
    (registration) => registration.networking_opt_in,
  );
  const totalConnections = (connections ?? []).length;
  const acceptedConnections = (connections ?? []).filter(
    (connection) => connection.status === "accepted",
  );

  const attendanceRate = activeRegistrations.length
    ? Math.round((checkedIn.length / activeRegistrations.length) * 100)
    : 0;

  // Networking: opt-in sobre inscripciones activas; aceptacion sobre el total de
  // solicitudes; alcance del directorio via profile_views.
  const optInRate = activeRegistrations.length
    ? Math.round((networking.length / activeRegistrations.length) * 100)
    : 0;
  const acceptanceRate = totalConnections
    ? Math.round((acceptedConnections.length / totalConnections) * 100)
    : 0;
  const totalViews = viewStats.total_views;
  const uniqueViewers = viewStats.unique_viewers;

  // Reuniones 1:1 (spec 27): la unidad de valor medible del networking
  // (spec 12 §B.2). "Realizadas" = aceptadas cuyo horario ya paso (el estado
  // `completed` no se setea automaticamente); "proximas" = aceptadas futuras.
  const allMeetings = meetings ?? [];
  const { accepted: acceptedMeetings, held: heldMeetings, upcoming: upcomingMeetings } =
    splitMeetings(allMeetings);
  const meetingAcceptanceRate = allMeetings.length
    ? Math.round((acceptedMeetings.length / allMeetings.length) * 100)
    : 0;

  const locationNames = new Map(
    (locations ?? []).map((location) => [location.id, location.name]),
  );
  const topLocations = rank(
    acceptedMeetings.map((meeting) =>
      meeting.location_id
        ? (locationNames.get(meeting.location_id) ?? "Punto eliminado")
        : "Por definir",
    ),
  );

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950"
          href={`/admin/events/${event.id}`}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {event.name}
        </Link>
        <div className="mb-6 mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Metricas del evento
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              Inscripcion, asistencia y networking
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <AutoRefresh />
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
              href={`/admin/events/${event.id}/export`}
            >
              <Download className="size-4" aria-hidden="true" />
              Descargar CSV
            </Link>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-slate-600">
          Asistencia
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Inscritos" value={activeRegistrations.length} />
          <MetricCard label="Acreditados" value={checkedIn.length} />
          <MetricCard label="Asistencia" value={`${attendanceRate}%`} />
          <MetricCard label="Cupos" value={event.capacity} />
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-brand-slate-600">
          Networking
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            hint={`${publicProfiles.length} perfiles publicos`}
            label="Opt-in networking"
            value={`${optInRate}%`}
          />
          <MetricCard label="Solicitudes de conexion" value={totalConnections} />
          <MetricCard
            hint={`${acceptanceRate}% de aceptacion`}
            label="Conexiones aceptadas"
            value={acceptedConnections.length}
          />
          <MetricCard
            hint={`${uniqueViewers} visitantes unicos`}
            label="Perfiles vistos"
            value={totalViews}
          />
        </div>

        <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-brand-slate-600">
          Reuniones 1:1
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Propuestas" value={allMeetings.length} />
          <MetricCard
            hint={`${meetingAcceptanceRate}% de aceptacion`}
            label="Aceptadas"
            value={acceptedMeetings.length}
          />
          <MetricCard label="Proximas" value={upcomingMeetings.length} />
          <MetricCard
            hint="aceptadas cuyo horario ya paso"
            label="Realizadas"
            value={heldMeetings.length}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Ranking
            title="Intereses frecuentes"
            rows={rank(
              activeRegistrations.flatMap(
                (registration) => registration.interests,
              ),
            )}
          />
          <Ranking
            title="Distribucion por area"
            rows={rank(
              activeRegistrations.map(
                (registration) =>
                  registration.industry_snapshot ?? "No informado",
              ),
            )}
          />
          <Ranking
            title="Perfiles mas vistos"
            rows={viewStats.top_viewed.map((item) => ({
              label: item.name,
              value: item.views,
            }))}
          />
          <Ranking
            title="Puntos de encuentro mas usados"
            rows={topLocations}
          />
        </div>
      </section>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <article className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-brand-slate-600">
        <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-brand-slate-600">{hint}</p>
      ) : null}
    </article>
  );
}

function Ranking({
  rows,
  title,
}: {
  rows: Array<{ label: string; value: number }>;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div
              className="flex items-center justify-between rounded-md bg-brand-surface-soft px-3 py-2"
              key={row.label}
            >
              <span className="text-sm">{row.label}</span>
              <span className="text-sm font-semibold">{row.value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-brand-slate-600">Sin datos todavia.</p>
        )}
      </div>
    </article>
  );
}

// Corta las reuniones aceptadas en proximas/realizadas respecto del momento
// del render (pagina force-dynamic con polling: cada refresco recorta).
function splitMeetings(meetings: MeetingMetric[]) {
  const now = Date.now();
  const accepted = meetings.filter((meeting) => meeting.status === "accepted");

  return {
    accepted,
    upcoming: accepted.filter(
      (meeting) => new Date(meeting.starts_at).getTime() > now,
    ),
    held: accepted.filter(
      (meeting) => new Date(meeting.ends_at).getTime() <= now,
    ),
  };
}

function rank(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
