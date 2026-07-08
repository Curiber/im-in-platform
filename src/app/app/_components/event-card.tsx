import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";

import type { AttendeeRegistration } from "@/lib/attendee-account";
import { formatDateTime } from "@/lib/datetime";

const STATUS_LABELS: Record<string, string> = {
  registered: "Inscrito",
  checked_in: "Acreditado",
  pending_approval: "En revision",
  pending_verification: "Sin verificar",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

export function EventCard({
  registration,
}: {
  registration: AttendeeRegistration;
}) {
  const event = registration.events;
  if (!event) {
    return null;
  }

  const statusLabel = STATUS_LABELS[registration.status] ?? registration.status;

  return (
    <Link
      className="group flex flex-col rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-cyan-500/50 hover:shadow-md"
      href={`/e/${event.slug}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-brand-navy-950">
          {event.name}
        </h3>
        <span className="shrink-0 rounded-full bg-brand-slate-100 px-2.5 py-1 text-xs font-semibold text-brand-navy-900">
          {statusLabel}
        </span>
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

      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-cyan-500">
        Ver evento
        <ArrowRight
          className="size-4 transition group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
