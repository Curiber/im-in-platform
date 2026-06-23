import { ArrowLeft, Download, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/app/admin/_components/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventSummary = {
  id: string;
  name: string;
  capacity: number;
};

type RegistrationMetric = {
  status: "registered" | "checked_in" | "cancelled" | "no_show";
  public_profile_enabled: boolean;
  networking_opt_in: boolean;
  industry_snapshot: string | null;
  interests: string[];
};

type ConnectionMetric = {
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

type ProfileViewMetric = {
  viewed: {
    full_name_snapshot: string;
  } | null;
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

  const [{ data: registrations }, { data: connections }, { data: profileViews }] =
    await Promise.all([
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
        .from("profile_views")
        .select(
          "viewed:event_registrations!profile_views_viewed_registration_id_fkey(full_name_snapshot)",
        )
        .eq("event_id", event.id)
        .returns<ProfileViewMetric[]>(),
    ]);

  const activeRegistrations = (registrations ?? []).filter(
    (registration) => registration.status !== "cancelled",
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
  const acceptedConnections = (connections ?? []).filter(
    (connection) => connection.status === "accepted",
  );

  const attendanceRate = activeRegistrations.length
    ? Math.round((checkedIn.length / activeRegistrations.length) * 100)
    : 0;

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
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
            href={`/admin/events/${event.id}/export`}
          >
            <Download className="size-4" aria-hidden="true" />
            Descargar CSV
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Inscritos" value={activeRegistrations.length} />
          <MetricCard label="Acreditados" value={checkedIn.length} />
          <MetricCard label="Asistencia" value={`${attendanceRate}%`} />
          <MetricCard label="Cupos" value={event.capacity} />
          <MetricCard label="Perfiles publicos" value={publicProfiles.length} />
          <MetricCard label="Networking activo" value={networking.length} />
          <MetricCard
            label="Solicitudes"
            value={(connections ?? []).length}
          />
          <MetricCard label="Aceptadas" value={acceptedConnections.length} />
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
            rows={rank(
              (profileViews ?? [])
                .map((view) => view.viewed?.full_name_snapshot)
                .filter((name): name is string => Boolean(name)),
            )}
          />
        </div>
      </section>
    </AdminShell>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-brand-slate-600">
        <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
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

function rank(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}
