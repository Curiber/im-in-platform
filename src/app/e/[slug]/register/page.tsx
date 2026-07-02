import { ArrowLeft, Calendar, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RegistrationForm } from "@/app/e/[slug]/register/registration-form";
import { formatDateTime } from "@/lib/datetime";
import { resolveEventCover } from "@/lib/event-cover";
import { getEventProfileOptions } from "@/lib/event-profile-options";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RegistrationEvent = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  capacity: number;
  networking_enabled: boolean;
  cover_image_url: string | null;
  organizations: {
    name: string;
    suspended_at: string | null;
  } | null;
};

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, description, starts_at, location, capacity, networking_enabled, cover_image_url, organizations(name, suspended_at)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single()
    .returns<RegistrationEvent>();

  // Organizacion suspendida: la inscripcion queda bloqueada.
  if (!event || event.organizations?.suspended_at) {
    notFound();
  }

  const coverUrl = resolveEventCover(event.cover_image_url);
  const profileOptions = await getEventProfileOptions(supabase, event.id);

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="border-b border-brand-border/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="inline-flex items-center" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-32"
              height={38}
              src="/brand/im-in-logo.png"
              width={152}
            />
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            href={`/e/${slug}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Inscripcion
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy-950">
            {event.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-brand-slate-600">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-brand-cyan-500"
              aria-hidden="true"
            />
            Te tomara cerca de 2 minutos. Tu email y telefono solo se comparten
            cuando aceptas una conexion.
          </p>
          <div className="mt-7">
            <RegistrationForm
              eventId={event.id}
              goals={profileOptions.goals}
              industries={profileOptions.industries}
              interests={profileOptions.interests}
              slug={slug}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
            <div className="relative h-32 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={event.name}
                className="size-full object-cover"
                src={coverUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-950/80 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-mint-300">
                  Organiza
                </p>
                <p className="truncate font-semibold text-white">
                  {event.organizations?.name ?? "Organizacion"}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
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
            </div>
          </div>
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
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-mint-300/40 text-brand-navy-950">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-brand-slate-600">{label}</p>
        <p className="truncate font-semibold text-brand-navy-950">{value}</p>
      </div>
    </div>
  );
}

