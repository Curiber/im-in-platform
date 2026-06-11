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
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <AdminHeader />
      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
              Eventos
            </p>
            <h1 className="mt-1 text-3xl font-semibold">Administracion</h1>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
            href="/admin/events/new"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Nuevo evento
          </Link>
        </div>

        <div className="rounded-lg border border-[#d9d5cb] bg-white shadow-sm">
          {error ? (
            <p className="p-5 text-sm text-[#8a2f24]">
              No se pudieron cargar los eventos.
            </p>
          ) : null}

          {!error && events?.length ? (
            <div className="divide-y divide-[#e5e0d6]">
              {events.map((event) => (
                <Link
                  className="grid gap-4 p-5 hover:bg-[#fbfaf7] md:grid-cols-[1fr_160px_120px_120px]"
                  href={`/admin/events/${event.id}`}
                  key={event.id}
                >
                  <div>
                    <p className="font-semibold">{event.name}</p>
                    <p className="mt-1 text-sm text-[#5f625d]">
                      {event.organizations?.name ?? "Organizacion"} /{" "}
                      {event.slug}
                    </p>
                  </div>
                  <p className="text-sm text-[#4a4d49]">
                    {formatDate(event.starts_at)}
                  </p>
                  <p className="text-sm text-[#4a4d49]">
                    {event.capacity} cupos
                  </p>
                  <span className="inline-flex h-8 items-center justify-center rounded-md bg-[#eef6e9] px-3 text-sm font-semibold text-[#2f6f4e]">
                    {formatStatus(event.status)}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {!error && !events?.length ? (
            <div className="p-8 text-center">
              <CalendarPlus
                className="mx-auto size-10 text-[#2f6f4e]"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold">
                Crea tu primer evento
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5f625d]">
                El MVP parte con eventos simples: fecha, lugar, cupos y link de
                inscripcion.
              </p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
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
    <header className="border-b border-[#d9d5cb] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/admin">
          <p className="text-sm font-semibold text-[#2f6f4e]">I&apos;m IN</p>
          <p className="text-xl font-semibold">Panel organizador</p>
        </Link>
        <Link
          className="rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
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
