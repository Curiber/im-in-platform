import {
  ArchiveRestore,
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
  deleteEvent,
  deleteAgendaItem,
  publishEvent,
  restoreEvent,
} from "@/app/admin/events/actions";
import {
  ApprovalQueue,
  type PendingRegistration,
} from "@/app/admin/events/[eventId]/_components/approval-queue";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventDetail = {
  id: string;
  organization_id: string;
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
  registration_mode: "open" | "approval";
  modality: "in_person" | "online" | "hybrid";
  networking_enabled: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
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
      "id, organization_id, name, slug, description, starts_at, arrival_starts_at, ends_at, location, capacity, status, event_type, registration_mode, modality, networking_enabled, deleted_at, deleted_by, delete_reason, organizations(name)",
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
  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  const publicPath = `/e/${event.slug}`;
  const canDelete = membership?.role === "owner" || membership?.role === "admin";

  let pendingApprovals: PendingRegistration[] = [];

  if (event.registration_mode === "approval" && !event.deleted_at) {
    const adminClient = createSupabaseAdminClient();
    const { data } = await adminClient
      .from("event_registrations")
      .select("id, full_name_snapshot, email, role_snapshot, company_snapshot")
      .eq("event_id", event.id)
      .eq("status", "pending_approval")
      .order("registered_at", { ascending: true })
      .returns<PendingRegistration[]>();
    pendingApprovals = data ?? [];
  }

  if (event.deleted_at) {
    let deletedByEmail: string | null = null;

    if (event.deleted_by) {
      const adminClient = createSupabaseAdminClient();
      const { data } = await adminClient.auth.admin.getUserById(
        event.deleted_by,
      );
      deletedByEmail = data.user?.email ?? null;
    }

    return (
      <AdminShell>
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          <article className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-700">
                Este evento fue eliminado el {formatDate(event.deleted_at)}
                {deletedByEmail ? ` por ${deletedByEmail}` : ""}.
              </p>
              <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                Motivo: {event.delete_reason ?? "Sin motivo registrado"}
              </p>
              <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                Los datos historicos se conservan. La pagina publica, el
                registro y el check-in estan bloqueados.
              </p>
            </div>

            <h2 className="mt-6 text-3xl font-semibold">{event.name}</h2>
            <p className="mt-2 text-brand-slate-600">
              {event.organizations?.name ?? "Organizacion"}
            </p>
            <p className="mt-4 max-w-3xl leading-7 text-brand-slate-600">
              {event.description || "Sin descripcion."}
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

            {membership?.role === "owner" ? (
              <form action={restoreEvent} className="mt-8">
                <input name="eventId" type="hidden" value={event.id} />
                <input name="slug" type="hidden" value={event.slug} />
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                  type="submit"
                >
                  <ArchiveRestore className="size-4" aria-hidden="true" />
                  Restaurar evento
                </button>
                <p className="mt-2 text-sm text-brand-slate-600">
                  Al restaurar, el evento vuelve a listados y recupera su
                  operacion normal.
                </p>
              </form>
            ) : (
              <p className="mt-8 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 text-sm leading-6 text-brand-slate-600">
                Solo el owner de la organizacion puede restaurar este evento.
              </p>
            )}
          </article>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <section className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <article className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span
                className={`inline-flex rounded-md px-3 py-1 text-sm font-semibold ${
                  event.status === "published"
                    ? "bg-brand-navy-950 text-brand-mint-300"
                    : "bg-brand-slate-100 text-brand-slate-600"
                }`}
              >
                {formatStatus(event.status)}
              </span>
              <h2 className="mt-4 text-3xl font-semibold">{event.name}</h2>
              <p className="mt-2 text-brand-slate-600">
                {event.organizations?.name ?? "Organizacion"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                className="inline-flex h-10 items-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={`/admin/events/${event.id}/edit`}
              >
                Editar
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={`/admin/events/${event.id}/check-in`}
              >
                Check-in
              </Link>
              <Link
                className="inline-flex h-10 items-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={`/admin/events/${event.id}/dashboard`}
              >
                Dashboard
              </Link>
              {event.status === "draft" ? (
                <form action={publishEvent}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <input name="slug" type="hidden" value={event.slug} />
                  <button
                    className="h-10 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
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
                    className="h-10 rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                    type="submit"
                  >
                    Cerrar
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <p className="mt-6 max-w-3xl leading-7 text-brand-slate-600">
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
                className="size-5 text-brand-cyan-500"
                aria-hidden="true"
              />
              Agenda
            </h3>

            {agendaItems?.length ? (
              <div className="mt-4 space-y-3">
                {agendaItems.map((item) => (
                  <div
                    className="flex items-start justify-between gap-4 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4"
                    key={item.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-blue-700">
                        {formatTimeRange(item.starts_at, item.ends_at)}
                      </p>
                      <p className="mt-1 font-semibold">{item.title}</p>
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
                    <form action={deleteAgendaItem}>
                      <input name="agendaItemId" type="hidden" value={item.id} />
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="slug" type="hidden" value={event.slug} />
                      <button
                        aria-label="Eliminar bloque"
                        className="rounded-md border border-brand-border p-2 text-red-700 hover:bg-white"
                        type="submit"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
                Sin bloques de agenda todavia. Agrega el primero abajo.
              </p>
            )}

            <form
              action={createAgendaItem}
              className="mt-4 grid gap-4 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 sm:grid-cols-2"
            >
              <input name="eventId" type="hidden" value={event.id} />
              <input name="slug" type="hidden" value={event.slug} />

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-brand-navy-950">
                  Titulo
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                  name="title"
                  placeholder="Charla, panel, networking..."
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-brand-navy-950">
                  Inicio
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-brand-navy-950">
                  Termino opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                  name="endsAt"
                  type="datetime-local"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-brand-navy-950">
                  Lugar opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                  name="location"
                  placeholder="Sala, escenario..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-brand-navy-950">
                  Descripcion opcional
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                  name="description"
                  placeholder="Detalle breve del bloque"
                />
              </label>

              <button
                className="h-11 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900 sm:col-span-2 sm:justify-self-start sm:px-6"
                type="submit"
              >
                Agregar bloque
              </button>
            </form>
          </div>

          {event.registration_mode === "approval" ? (
            <ApprovalQueue
              eventId={event.id}
              registrations={pendingApprovals}
            />
          ) : null}
        </article>

        <aside className="space-y-4">
          <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Link de inscripcion</h2>
            <div className="mt-4 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3">
              <p className="break-all font-mono text-sm">{publicPath}</p>
            </div>
            {event.status === "draft" ? (
              <p className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-brand-border text-sm font-semibold text-brand-slate-600">
                Publica el evento para ver la pagina
              </p>
            ) : (
              <Link
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-border text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={publicPath}
              >
                <Link2 className="size-4" aria-hidden="true" />
                Ver pagina publica
              </Link>
            )}
          </div>

          <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Configuracion</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Tipo" value={event.event_type} />
              <Row
                label="Inscripcion"
                value={
                  event.registration_mode === "approval"
                    ? "Con aprobacion"
                    : "Abierta"
                }
              />
              <Row label="Modalidad" value={event.modality} />
              <Row
                label="Networking"
                value={event.networking_enabled ? "Activo" : "Inactivo"}
              />
            </dl>
          </div>

          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700">
              Zona de peligro
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-slate-600">
              Elimina este evento de la operacion normal. Los datos historicos
              se conservan para auditoria.
            </p>
            {canDelete ? (
              <form action={deleteEvent} className="mt-4 space-y-3">
                <input name="eventId" type="hidden" value={event.id} />
                <input name="slug" type="hidden" value={event.slug} />
                <label className="block">
                  <span className="text-sm font-medium text-brand-navy-950">
                    Motivo
                  </span>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-brand-border bg-white px-3 py-3 text-sm outline-none focus:border-red-400"
                    name="reason"
                    placeholder="Duplicado, cancelado, creado por error..."
                    required
                  />
                </label>
                <button
                  className="inline-flex h-10 items-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
                  type="submit"
                >
                  Eliminar evento
                </button>
              </form>
            ) : (
              <p className="mt-4 rounded-md bg-brand-surface-soft p-3 text-sm leading-6 text-brand-slate-600">
                Solo owners y admins pueden eliminar eventos.
              </p>
            )}
          </div>
        </aside>
      </section>
    </AdminShell>
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
    <div className="rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
      <span className="text-brand-cyan-500">{icon}</span>
      <p className="mt-3 text-sm text-brand-slate-600">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-brand-slate-600">{label}</dt>
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
