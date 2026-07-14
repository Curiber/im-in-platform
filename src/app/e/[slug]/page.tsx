import {
  ArrowRight,
  Calendar,
  CalendarClock,
  IdCard,
  MapPin,
  QrCode,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";

import { formatDateTime, formatDateTimeRange } from "@/lib/datetime";
import { resolveEventCover } from "@/lib/event-cover";
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
  cover_image_url: string | null;
  organizations: {
    name: string;
    suspended_at: string | null;
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

const includedItems = [
  { icon: QrCode, label: "Credencial QR para check-in" },
  { icon: IdCard, label: "Perfil profesional para el directorio" },
  { icon: UsersRound, label: "Solicitudes de conexion durante el evento" },
];

// Carga del evento publico, memoizada por request con cache(): generateMetadata
// y la pagina comparten la consulta sin duplicarla. Aplica los mismos filtros de
// visibilidad que la pagina (no borrado, publicado/cerrado, org no suspendida).
const loadPublicEvent = cache(
  async (slug: string): Promise<PublicEvent | null> => {
    const supabase = createSupabaseAdminClient();
    const { data: event } = await supabase
      .from("events")
      .select(
        "id, name, description, starts_at, location, capacity, networking_enabled, status, cover_image_url, organizations(name, suspended_at)",
      )
      .eq("slug", slug)
      .is("deleted_at", null)
      .in("status", ["published", "closed"])
      .maybeSingle()
      .returns<PublicEvent>();

    if (!event || event.organizations?.suspended_at) {
      return null;
    }

    return event;
  },
);

// Metadata para compartir el evento (spec 37): al pegar el link en redes o
// mensajeria se ve el nombre, la organizacion y la portada, no el generico del
// sitio. Eventos no publicados/suspendidos (la pagina devuelve 404) caen al
// generico sin filtrar datos.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadPublicEvent(slug);

  if (!event) {
    return { title: "Evento no disponible" };
  }

  const organizer = event.organizations?.name;
  const title = organizer ? `${event.name} — ${organizer}` : event.name;
  const description =
    event.description ??
    `${formatDateTime(event.starts_at)}${
      event.location ? ` · ${event.location}` : ""
    }`;
  const cover = resolveEventCover(event.cover_image_url);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: cover, alt: event.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cover],
    },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await loadPublicEvent(slug);

  // Organizacion suspendida, no publicado o inexistente: no existe pagina publica.
  if (!event) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: agendaItems } = await supabase
    .from("event_agenda_items")
    .select("id, title, description, location, starts_at, ends_at")
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true })
    .returns<PublicAgendaItem[]>();

  const coverUrl = resolveEventCover(event.cover_image_url);

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={event.name}
          className="absolute inset-0 size-full object-cover"
          src={coverUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-950/95 via-brand-navy-950/85 to-brand-navy-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-950/85 via-transparent to-brand-navy-950/30" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_360px] lg:py-20">
          <div>
            <Link className="inline-flex items-center" href="/">
              <Image
                alt="I'M IN"
                className="h-auto w-36"
                height={45}
                priority
                src="/brand/im-in-logo-white.png"
                width={180}
              />
            </Link>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              {event.organizations?.name ?? "I'M IN"}
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-tight text-white sm:text-6xl">
              {event.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              {event.description ||
                "Inscribete y prepara tu networking antes del evento."}
            </p>
            {event.status === "published" ? (
              <Link
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient-accent px-6 text-sm font-semibold text-brand-navy-950 shadow-xl transition hover:-translate-y-0.5"
                href={`/e/${slug}/register`}
              >
                Inscribirme
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <p className="mt-8 inline-flex h-12 items-center rounded-xl border border-white/30 px-6 text-sm font-semibold text-white/80">
                Inscripciones cerradas
              </p>
            )}
          </div>

          <aside className="self-start rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              Detalles
            </p>
            <div className="mt-5 space-y-3">
              <DetailRow
                icon={<Calendar className="size-5" aria-hidden="true" />}
                label="Fecha"
                value={formatDateTime(event.starts_at)}
              />
              <DetailRow
                icon={<MapPin className="size-5" aria-hidden="true" />}
                label="Lugar"
                value={event.location ?? "Por definir"}
              />
              <DetailRow
                icon={<Users className="size-5" aria-hidden="true" />}
                label="Cupos"
                value={`${event.capacity} asistentes`}
              />
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-16 sm:px-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              <Sparkles className="size-4" aria-hidden="true" />
              Tu networking empieza aqui
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-brand-navy-950">
              Llega preparado, conecta con intencion.
            </h2>
            <p className="mt-3 leading-7 text-brand-slate-600">
              Recibe tu QR de acceso, crea un perfil reconocible y descubre
              asistentes con intereses afines antes y durante el evento.
            </p>
          </div>

          {agendaItems?.length ? (
            <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-brand-navy-950">
                <CalendarClock
                  className="size-6 text-brand-cyan-500"
                  aria-hidden="true"
                />
                Agenda
              </h2>
              <div className="mt-6 space-y-3">
                {agendaItems.map((item, index) => (
                  <div
                    className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    key={item.id}
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor:
                        index % 2 === 0 ? "var(--brand-cyan-500)" : "var(--brand-aqua-400)",
                    }}
                  >
                    <p className="text-sm font-semibold text-brand-blue-700">
                      {formatDateTimeRange(item.starts_at, item.ends_at)}
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

        <aside className="self-start rounded-3xl border border-brand-border bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Que incluye
          </p>
          <div className="mt-5 space-y-4">
            {includedItems.map((item) => {
              const Icon = item.icon;

              return (
                <div className="flex items-start gap-3" key={item.label}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-mint-300/40 text-brand-navy-950">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-6 text-brand-slate-600">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>

          {event.status === "published" ? (
            <Link
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
              href={`/e/${slug}/register`}
            >
              Inscribirme
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-mint-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/60">{label}</p>
        <p className="truncate font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
