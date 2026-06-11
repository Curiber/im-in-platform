import { CalendarPlus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/app/admin/sign-out-button";
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

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id, name, slug, status, starts_at, capacity, networking_enabled, organizations(name)",
    )
    .is("deleted_at", null)
    .order("starts_at", { ascending: true })
    .returns<AdminEvent[]>();

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

        <div className="rounded-lg border border-brand-border bg-white shadow-sm">
          {error ? (
            <p className="p-5 text-sm text-red-700">
              No se pudieron cargar los eventos.
            </p>
          ) : null}

          {!error && events?.length ? (
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
                  <span className="inline-flex h-8 items-center justify-center rounded-md bg-brand-slate-100 px-3 text-sm font-semibold text-brand-cyan-500">
                    {formatStatus(event.status)}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {!error && !events?.length ? (
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
    <header className="border-b border-brand-border bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/admin">
          <p className="text-sm font-semibold text-brand-cyan-500">I&apos;m IN</p>
          <p className="text-xl font-semibold">Panel organizador</p>
        </Link>
        <Link
          className="rounded-md border border-brand-border px-3 py-2 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
          href="/admin"
        >
          Volver
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
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
