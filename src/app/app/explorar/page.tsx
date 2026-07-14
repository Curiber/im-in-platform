import { ArrowRight, Check, Compass, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAttendeeRegistrations,
  getAttendeeUser,
} from "@/lib/attendee-account";
import { formatDateTime } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Estados en los que el asistente cuenta como "ya inscrito" a un evento (no se
// le ofrece inscribirse de nuevo). Excluye cancelled/no_show.
const REGISTERED_STATUSES = new Set([
  "registered",
  "checked_in",
  "pending_approval",
  "pending_verification",
]);

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

  // Solo eventos abiertos, publicados y marcados como `discoverable` por su
  // organizador (opt-in). Los demas siguen siendo accesibles solo por link.
  // Legibles por el asistente autenticado gracias a la politica RLS del spec 37.
  //
  // Se excluyen los eventos ya terminados: explorar es para inscribirse, no
  // tiene sentido ofrecer eventos pasados (que ademas, al ordenar por starts_at
  // asc, aparecerian primero). "Terminado" = ends_at < ahora, o (sin ends_at)
  // starts_at < ahora; misma definicion que splitRegistrationsByDate.
  const nowIso = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
  const [{ data: events }, registrations] = await Promise.all([
    supabase
      .from("events")
      .select("slug, name, description, starts_at, location")
      .eq("status", "published")
      .eq("event_type", "open")
      .eq("discoverable", true)
      .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`)
      .order("starts_at", { ascending: true })
      .returns<PublicEvent[]>(),
    getAttendeeRegistrations(user.id),
  ]);

  // Slugs donde el usuario ya tiene una inscripcion activa: se marcan como "ya
  // inscrito" en vez de ofrecer inscribirse otra vez.
  const registeredSlugs = new Set(
    registrations
      .filter((registration) =>
        REGISTERED_STATUSES.has(registration.status),
      )
      .map((registration) => registration.events?.slug)
      .filter((slug): slug is string => Boolean(slug)),
  );

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
          {events.map((event) => {
            const isRegistered = registeredSlugs.has(event.slug);
            return (
              <Link
                className="group flex flex-col rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-cyan-500/50 hover:shadow-md"
                href={`/e/${event.slug}`}
                key={event.slug}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-brand-navy-950">
                    {event.name}
                  </h3>
                  {isRegistered ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-mint-300/40 px-2 py-0.5 text-xs font-semibold text-brand-navy-950">
                      <Check className="size-3" aria-hidden="true" />
                      Inscrito
                    </span>
                  ) : null}
                </div>
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
                  {isRegistered ? "Ver evento" : "Ver e inscribirme"}
                  <ArrowRight
                    className="size-4 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
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
