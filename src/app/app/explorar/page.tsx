import { ArrowRight, Compass, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAttendeeUser } from "@/lib/attendee-account";
import { formatDateTime } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PublicEvent = {
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  location: string | null;
};

export default async function ExplorePage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/explorar");
  }

  // Eventos abiertos y publicados, legibles por el asistente autenticado gracias
  // a la nueva politica RLS. El filtro por "discoverable" (opt-in del
  // organizador) llega en una fase posterior del spec 37.
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("events")
    .select("slug, name, description, starts_at, location")
    .eq("status", "published")
    .eq("event_type", "open")
    .order("starts_at", { ascending: true })
    .returns<PublicEvent[]>();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <Compass className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Explorar eventos
      </h1>
      <p className="mt-2 text-brand-slate-600">
        Eventos abiertos a los que te puedes inscribir.
      </p>

      {events?.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              className="group flex flex-col rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-cyan-500/50 hover:shadow-md"
              href={`/e/${event.slug}`}
              key={event.slug}
            >
              <h3 className="text-lg font-semibold text-brand-navy-950">
                {event.name}
              </h3>
              <p className="mt-2 text-sm text-brand-slate-600">
                {formatDateTime(event.starts_at)}
              </p>
              {event.location ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-slate-600">
                  <MapPin className="size-4 text-brand-cyan-500" aria-hidden="true" />
                  {event.location}
                </p>
              ) : null}
              {event.description ? (
                <p className="mt-3 line-clamp-3 text-sm text-brand-slate-600">
                  {event.description}
                </p>
              ) : null}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-cyan-500">
                Ver e inscribirme
                <ArrowRight
                  className="size-4 transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-brand-navy-950">
            No hay eventos abiertos por ahora
          </p>
          <p className="mt-1 text-sm text-brand-slate-600">
            Vuelve pronto: aqui apareceran los eventos publicos.
          </p>
        </div>
      )}
    </main>
  );
}
