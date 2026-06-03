import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { RegistrationForm } from "@/app/e/[slug]/register/registration-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, description, starts_at, location, capacity, networking_enabled, organizations(name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .eq("event_type", "open")
    .single()
    .returns<RegistrationEvent>();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Inscripcion
            </p>
            <h1 className="text-xl font-semibold">{event.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/e/${slug}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Completa tus datos</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f625d]">
            Te tomara cerca de 2 minutos. Solo compartiremos tu perfil con otros
            asistentes si activas networking y directorio.
          </p>
          <div className="mt-6">
            <RegistrationForm eventId={event.id} slug={slug} />
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#5f625d]">Organiza</p>
            <p className="mt-1 font-semibold">
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
    <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
      <span className="text-[#2f6f4e]">{icon}</span>
      <p className="mt-3 text-sm text-[#5f625d]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
