import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RegistrationForm } from "@/app/e/[slug]/register/registration-form";
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
  organizations: {
    name: string;
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
      "id, name, description, starts_at, location, capacity, networking_enabled, organizations(name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single()
    .returns<RegistrationEvent>();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="border-b border-brand-border bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <Link className="inline-flex items-center" href="/">
              <Image
                alt="I'M IN"
                className="h-auto w-32"
                height={38}
                src="/brand/im-in-logo.png"
                width={152}
              />
            </Link>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-brand-border px-3 py-2 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
            href={`/e/${slug}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Inscripcion
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-navy-950">
            {event.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-slate-600">
            Te tomara cerca de 2 minutos. Tu email y telefono solo se comparten
            cuando aceptas una conexion.
          </p>
          <div className="mt-6">
            <RegistrationForm eventId={event.id} slug={slug} />
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg bg-brand-gradient-primary p-5 text-white shadow-sm">
            <p className="text-sm text-white/70">Organiza</p>
            <p className="mt-1 font-semibold text-white">
              {event.organizations?.name ?? "Organizacion"}
            </p>
          </div>
          <Info
            icon={<Calendar className="size-5" aria-hidden="true" />}
            label="Fecha"
            value={formatDate(event.starts_at)}
          />
          <Info
            icon={<MapPin className="size-5" aria-hidden="true" />}
            label="Lugar"
            value={event.location ?? "Por definir"}
          />
        </aside>
      </section>
    </main>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
      <span className="text-brand-cyan-500">{icon}</span>
      <p className="mt-3 text-sm text-brand-slate-600">{label}</p>
      <p className="mt-1 font-semibold text-brand-navy-950">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
