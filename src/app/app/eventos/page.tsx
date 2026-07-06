import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EventCard } from "@/app/app/_components/event-card";
import {
  getAttendeeRegistrations,
  getAttendeeUser,
  splitRegistrationsByDate,
} from "@/lib/attendee-account";

export const dynamic = "force-dynamic";

export default async function MyEventsPage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/eventos");
  }

  const registrations = await getAttendeeRegistrations(user.id);
  const { upcoming, past } = splitRegistrationsByDate(registrations);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <CalendarDays className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Mis eventos
      </h1>

      {registrations.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-brand-navy-950">
            Todavia no te has inscrito a ningun evento
          </p>
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            href="/app/explorar"
          >
            Explorar eventos
          </Link>
        </div>
      ) : null}

      {upcoming.length ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Proximos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((registration) => (
              <EventCard key={registration.id} registration={registration} />
            ))}
          </div>
        </section>
      ) : null}

      {past.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Pasados</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((registration) => (
              <EventCard key={registration.id} registration={registration} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
