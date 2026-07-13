import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Compass,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EventCard } from "@/app/app/_components/event-card";
import {
  claimAttendeeIdentity,
  getAttendeeProfile,
  getAttendeeRegistrations,
  getAttendeeUser,
  getMyPendingCounts,
  splitRegistrationsByDate,
} from "@/lib/attendee-account";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app");
  }

  // Reclamo idempotente al aterrizar en el hogar del asistente: enlaza perfil e
  // inscripciones del email verificado hechas antes de crear la cuenta (spec 31).
  await claimAttendeeIdentity();

  const [profile, registrations, pending] = await Promise.all([
    getAttendeeProfile(user.id),
    getAttendeeRegistrations(user.id),
    getMyPendingCounts(),
  ]);

  const { upcoming } = splitRegistrationsByDate(registrations);

  const displayName = profile?.full_name ?? user.email ?? "asistente";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-semibold">Hola, {displayName.split(" ")[0]}</h1>
      <p className="mt-2 text-brand-slate-600">
        Tu espacio en I&apos;m IN: tus eventos, tu perfil y tus conexiones.
      </p>

      {pending.connections > 0 || pending.meetings > 0 ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {pending.connections > 0 ? (
            <PendingCard
              cta="Responder"
              href="/app/conexiones"
              icon={<Users className="size-5" aria-hidden="true" />}
              label={`${pending.connections} ${
                pending.connections === 1
                  ? "solicitud de conexion"
                  : "solicitudes de conexion"
              } por responder`}
            />
          ) : null}
          {pending.meetings > 0 ? (
            <PendingCard
              cta="Responder"
              href="/app/reuniones"
              icon={<CalendarClock className="size-5" aria-hidden="true" />}
              label={`${pending.meetings} ${
                pending.meetings === 1
                  ? "invitacion a reunion"
                  : "invitaciones a reunion"
              } por responder`}
            />
          ) : null}
        </section>
      ) : null}

      {!profile ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-brand-slate-100 text-brand-cyan-500">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-brand-navy-950">
                Completa tu perfil
              </p>
              <p className="text-sm text-brand-slate-600">
                Aun no tienes un perfil global. Se creara con tu primera
                inscripcion a un evento.
              </p>
            </div>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            href="/app/explorar"
          >
            Explorar eventos
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-5 text-brand-cyan-500" aria-hidden="true" />
            Proximos eventos
          </h2>
          <Link
            className="text-sm font-semibold text-brand-cyan-500 hover:underline"
            href="/app/eventos"
          >
            Ver todos
          </Link>
        </div>

        {upcoming.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcoming.map((registration) => (
              <EventCard key={registration.id} registration={registration} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
            <Compass
              className="mx-auto size-10 text-brand-cyan-500"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-brand-navy-950">
              No tienes eventos proximos
            </p>
            <p className="mt-1 text-sm text-brand-slate-600">
              Descubre eventos abiertos y unete al que te interese.
            </p>
            <Link
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
              href="/app/explorar"
            >
              Explorar eventos
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function PendingCard({
  cta,
  href,
  icon,
  label,
}: {
  cta: string;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand-cyan-500/30 bg-brand-cyan-500/5 p-5 shadow-sm transition hover:border-brand-cyan-500/60 hover:bg-brand-cyan-500/10"
      href={href}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-cyan-500/15 text-brand-cyan-500">
          {icon}
        </span>
        <span className="text-sm font-semibold text-brand-navy-950">
          {label}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-cyan-500">
        {cta}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
