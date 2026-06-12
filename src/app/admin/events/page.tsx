import { Archive, CalendarPlus, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/app/admin/sign-out-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminEvent = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "closed";
  starts_at: string;
  capacity: number;
  networking_enabled: boolean;
  organizations: {
    name: string;
  } | null;
};

type DeletedAdminEvent = AdminEvent & {
  deleted_at: string;
  deleted_by: string | null;
  delete_reason: string | null;
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const showDeleted = filter === "deleted";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = supabase
    .from("events")
    .select(
      showDeleted
        ? "id, name, slug, status, starts_at, capacity, networking_enabled, deleted_at, deleted_by, delete_reason, organizations(name)"
        : "id, name, slug, status, starts_at, capacity, networking_enabled, organizations(name)",
    );

  const { data: events, error } = await (showDeleted
    ? query.not("deleted_at", "is", null).order("deleted_at", {
        ascending: false,
      })
    : query.is("deleted_at", null).order("starts_at", { ascending: true })
  ).returns<DeletedAdminEvent[]>();

  const deletedByEmails = showDeleted
    ? await loadUserEmails(
        (events ?? [])
          .map((event) => event.deleted_by)
          .filter((value): value is string => Boolean(value)),
      )
    : new Map<string, string>();

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <AdminHeader />
      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Eventos
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Administracion</h1>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
            href="/admin/events/new"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Nuevo evento
          </Link>
        </div>

        <div className="mb-5 inline-flex rounded-md border border-brand-border bg-white p-1">
          <Link
            className={`rounded px-4 py-2 text-sm font-semibold transition ${
              showDeleted
                ? "text-brand-slate-600 hover:text-brand-navy-950"
                : "bg-brand-navy-950 text-white"
            }`}
            href="/admin/events"
          >
            Activos
          </Link>
          <Link
            className={`rounded px-4 py-2 text-sm font-semibold transition ${
              showDeleted
                ? "bg-brand-navy-950 text-white"
                : "text-brand-slate-600 hover:text-brand-navy-950"
            }`}
            href="/admin/events?filter=deleted"
          >
            Eliminados
          </Link>
        </div>

        <div className="rounded-lg border border-brand-border bg-white shadow-sm">
          {error ? (
            <p className="p-5 text-sm text-red-700">
              No se pudieron cargar los eventos.
            </p>
          ) : null}

          {!error && events?.length && !showDeleted ? (
            <div className="divide-y divide-brand-border/60">
              {events.map((event) => (
                <Link
                  className="grid gap-4 p-5 hover:bg-brand-surface-soft md:grid-cols-[1fr_160px_120px_120px]"
                  href={`/admin/events/${event.id}`}
                  key={event.id}
                >
                  <div>
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-brand-slate-600">
                      {event.organizations?.name ?? "Organizacion"} /{" "}
                      {event.slug}
                    </p>
                  </div>
                  <p className="text-sm text-brand-slate-600">
                    {formatDate(event.starts_at)}
                  </p>
                  <p className="text-sm text-brand-slate-600">
                    {event.capacity} cupos
                  </p>
                  <StatusBadge status={event.status} />
                </Link>
              ))}
            </div>
          ) : null}

          {!error && events?.length && showDeleted ? (
            <div className="divide-y divide-brand-border/60">
              {events.map((event) => (
                <Link
                  className="grid gap-4 p-5 hover:bg-brand-surface-soft md:grid-cols-[1fr_200px_220px]"
                  href={`/admin/events/${event.id}`}
                  key={event.id}
                >
                  <div>
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-brand-slate-600">
                      {event.organizations?.name ?? "Organizacion"} /{" "}
                      {formatDate(event.starts_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      Eliminado {formatDate(event.deleted_at)}
                    </p>
                    <p className="mt-1 text-sm text-brand-slate-600">
                      {event.deleted_by
                        ? (deletedByEmails.get(event.deleted_by) ??
                          "Usuario desconocido")
                        : "Usuario desconocido"}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-brand-slate-600">
                    {event.delete_reason ?? "Sin motivo registrado"}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}

          {!error && !events?.length && showDeleted ? (
            <div className="p-8 text-center">
              <Archive
                className="mx-auto size-10 text-brand-cyan-500"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold">
                No hay eventos eliminados
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-slate-600">
                Cuando un owner o admin elimine un evento, quedara visible aqui
                con su motivo y podra restaurarse.
              </p>
            </div>
          ) : null}

          {!error && !events?.length && !showDeleted ? (
            <div className="p-8 text-center">
              <CalendarPlus
                className="mx-auto size-10 text-brand-cyan-500"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold">
                Crea tu primer evento
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-slate-600">
                El MVP parte con eventos simples: fecha, lugar, cupos y link de
                inscripcion.
              </p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
                href="/admin/events/new"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Crear evento
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link className="flex items-center gap-3" href="/admin">
          <Image
            alt="I'M IN"
            className="h-auto w-28"
            height={35}
            src="/brand/im-in-logo.png"
            width={140}
          />
          <span className="hidden border-l border-brand-border pl-3 text-sm font-semibold text-brand-slate-600 sm:inline">
            Panel organizador
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            href="/admin"
          >
            Volver
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: AdminEvent["status"] }) {
  const styles = {
    draft: "bg-brand-slate-100 text-brand-slate-600",
    published: "bg-brand-navy-950 text-brand-mint-300",
    closed: "bg-white text-brand-slate-600 ring-1 ring-brand-border",
  };

  return (
    <span
      className={`inline-flex h-8 items-center justify-center self-start rounded-md px-3 text-sm font-semibold md:self-center ${styles[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

async function loadUserEmails(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds));
  const emails = new Map<string, string>();

  if (!uniqueIds.length) {
    return emails;
  }

  const adminClient = createSupabaseAdminClient();
  await Promise.all(
    uniqueIds.map(async (id) => {
      const { data } = await adminClient.auth.admin.getUserById(id);

      if (data.user?.email) {
        emails.set(id, data.user.email);
      }
    }),
  );

  return emails;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(status: AdminEvent["status"]) {
  const labels = {
    draft: "Borrador",
    published: "Publicado",
    closed: "Cerrado",
  };

  return labels[status];
}
