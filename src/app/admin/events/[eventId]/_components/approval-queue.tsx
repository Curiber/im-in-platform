import { Check, UserCheck, X } from "lucide-react";

import {
  approveRegistration,
  rejectRegistration,
} from "@/app/admin/events/actions";

export type PendingRegistration = {
  id: string;
  full_name_snapshot: string;
  email: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
};

export function ApprovalQueue({
  eventId,
  registrations,
}: {
  eventId: string;
  registrations: PendingRegistration[];
}) {
  return (
    <div className="mt-10">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        <UserCheck className="size-5 text-brand-cyan-500" aria-hidden="true" />
        Solicitudes por aprobar
        {registrations.length ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-navy-950 px-2 text-xs font-semibold text-brand-mint-300">
            {registrations.length}
          </span>
        ) : null}
      </h3>
      <p className="mt-1 text-sm leading-6 text-brand-slate-600">
        Este evento requiere aprobacion. Las inscripciones que ya verificaron su
        email esperan tu decision; al rechazar se libera el cupo.
      </p>

      {registrations.length ? (
        <div className="mt-4 space-y-3">
          {registrations.map((registration) => (
            <div
              className="flex flex-col gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 sm:flex-row sm:items-center sm:justify-between"
              key={registration.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-brand-navy-950">
                  {registration.full_name_snapshot}
                </p>
                <p className="truncate text-sm text-brand-slate-600">
                  {[
                    registration.role_snapshot,
                    registration.company_snapshot,
                  ]
                    .filter(Boolean)
                    .join(" · ") || registration.email}
                </p>
                <p className="truncate text-xs text-brand-slate-600">
                  {registration.email}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={approveRegistration}>
                  <input name="eventId" type="hidden" value={eventId} />
                  <input
                    name="registrationId"
                    type="hidden"
                    value={registration.id}
                  />
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                    type="submit"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Aprobar
                  </button>
                </form>
                <form action={rejectRegistration}>
                  <input name="eventId" type="hidden" value={eventId} />
                  <input
                    name="registrationId"
                    type="hidden"
                    value={registration.id}
                  />
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-brand-border px-4 text-sm font-semibold text-red-700 transition hover:bg-white"
                    type="submit"
                  >
                    <X className="size-4" aria-hidden="true" />
                    Rechazar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
          No hay solicitudes pendientes por ahora.
        </p>
      )}
    </div>
  );
}
