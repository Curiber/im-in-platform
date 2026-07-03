import {
  ArrowRight,
  CalendarDays,
  LogOut,
  MapPin,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { formatDateTime } from "@/lib/datetime";
import { resolveEventCover } from "@/lib/event-cover";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// "Mis eventos" (Fase 5.2, spec 31): home del asistente con sesion.
//
// En cada carga se re-ejecuta el reclamo (claim_attendee_identity, idempotente
// y acotado por el email del JWT): asi una inscripcion hecha DESPUES de crear
// la cuenta tambien queda enlazada. El acceso a las superficies del evento va
// SIN token: verifyRegistrationAccess acepta la sesion del dueño (puente 5.2).

type MyRegistration = {
  id: string;
  status: "pending_verification" | "pending_approval" | "registered" | "checked_in" | "cancelled" | "no_show";
  events: {
    slug: string;
    name: string;
    starts_at: string;
    location: string | null;
    cover_image_url: string | null;
    networking_enabled: boolean;
    deleted_at: string | null;
    organizations: { suspended_at: string | null } | null;
  } | null;
};

const statusLabels: Record<MyRegistration["status"], string> = {
  pending_verification: "Email sin verificar",
  pending_approval: "En revision del organizador",
  registered: "Inscrito",
  checked_in: "Acreditado",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

export default async function MyEventsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mi/login");
  }

  // Reclamo idempotente: enlaza perfil e inscripciones del email verificado
  // que aun no tengan dueño. Corre con la sesion (el email sale del JWT).
  await supabase.rpc("claim_attendee_identity");

  const adminClient = createSupabaseAdminClient();
  const { data: registrations } = await adminClient
    .from("event_registrations")
    .select(
      "id, status, events(slug, name, starts_at, location, cover_image_url, networking_enabled, deleted_at, organizations(suspended_at))",
    )
    .eq("user_id", user.id)
    .order("registered_at", { ascending: false })
    .returns<MyRegistration[]>();

  // Eventos borrados o de organizaciones suspendidas no se muestran.
  const visible = (registrations ?? []).filter(
    (registration) =>
      registration.events &&
      !registration.events.deleted_at &&
      !registration.events.organizations?.suspended_at,
  );

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="border-b border-brand-border/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="inline-flex items-center" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-32"
              height={38}
              src="/brand/im-in-logo.png"
              width={152}
            />
          </Link>
          <form action="/auth/sign-out?next=/mi/login" method="post">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              type="submit"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
          <Sparkles className="size-4" aria-hidden="true" />
          Mis eventos
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy-950">
          Hola de nuevo
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate-600">
          Estas son tus inscripciones con el email {user.email}. Entra al
          networking de cada evento sin buscar el link en tu correo.
        </p>

        {visible.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visible.map((registration) => {
              const event = registration.events!;
              const isActive =
                registration.status === "registered" ||
                registration.status === "checked_in";

              return (
                <article
                  className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  key={registration.id}
                >
                  <div className="relative h-28 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={event.name}
                      className="size-full object-cover"
                      src={resolveEventCover(event.cover_image_url)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-950/80 to-transparent" />
                    <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-navy-950">
                      {statusLabels[registration.status]}
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="truncate text-lg font-semibold text-brand-navy-950">
                      {event.name}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-brand-slate-600">
                      <CalendarDays
                        className="size-4 text-brand-cyan-500"
                        aria-hidden="true"
                      />
                      {formatDateTime(event.starts_at)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-brand-slate-600">
                      <MapPin
                        className="size-4 text-brand-cyan-500"
                        aria-hidden="true"
                      />
                      {event.location ?? "Lugar por definir"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isActive && event.networking_enabled ? (
                        <Link
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                          href={`/e/${event.slug}/directory?registrationId=${registration.id}`}
                        >
                          <Users className="size-4" aria-hidden="true" />
                          Networking
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                      <Link
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
                        href={`/e/${event.slug}`}
                      >
                        Ver evento
                      </Link>
                    </div>

                    {isActive ? (
                      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-brand-slate-600">
                        <QrCode
                          className="mt-0.5 size-3.5 shrink-0 text-brand-cyan-500"
                          aria-hidden="true"
                        />
                        Tu credencial QR sigue en el link de tu email de
                        confirmacion.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-brand-border bg-white p-10 text-center shadow-sm">
            <CalendarDays
              className="mx-auto size-10 text-brand-cyan-500"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-brand-navy-950">
              Aun no encontramos inscripciones con este email
            </p>
            <p className="mt-2 text-sm leading-6 text-brand-slate-600">
              Si te inscribiste con otro correo, entra con ese. Las nuevas
              inscripciones con {user.email} apareceran aqui automaticamente.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
