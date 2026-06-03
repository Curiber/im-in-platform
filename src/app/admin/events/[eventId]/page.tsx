import { ArrowLeft, Calendar, Link2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { closeEvent, publishEvent } from "@/app/admin/events/actions";
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
        </article>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Link de inscripcion</h2>
            <div className="mt-4 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-3">
              <p className="break-all font-mono text-sm">{publicPath}</p>
            </div>
            <Link
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d9d5cb] text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
              href={publicPath}
            >
              <Link2 className="size-4" aria-hidden="true" />
              Ver pagina publica
            </Link>
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

function formatStatus(status: EventDetail["status"]) {
  const labels = {
    draft: "Borrador",
    published: "Publicado",
    closed: "Cerrado",
  };

  return labels[status];
}
