"use client";

import { CheckCircle2, ScanLine, TriangleAlert } from "lucide-react";
import { useActionState } from "react";

import {
  type CheckInActionState,
  checkInAttendee,
} from "@/app/admin/events/[eventId]/check-in/actions";

const initialState: CheckInActionState = {
  status: "idle",
  message: "",
};

export function CheckInForm({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(
    checkInAttendee,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input name="eventId" type="hidden" value={eventId} />
      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">Payload QR</span>
        <textarea
          className="mt-2 min-h-36 w-full rounded-md border border-brand-border bg-white px-3 py-3 font-mono text-sm outline-none focus:border-brand-cyan-500"
          name="payload"
          placeholder='{"kind":"im-in-check-in","registrationId":"...","token":"..."}'
          required
        />
      </label>

      <button
        className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-5 text-base font-semibold text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isPending}
        type="submit"
      >
        <ScanLine className="size-5" aria-hidden="true" />
        {isPending ? "Validando..." : "Registrar check-in"}
      </button>

      {state.message ? (
        <div aria-live="polite" className={resultClass(state.status)}>
          {state.status === "success" ? (
            <CheckCircle2 className="mt-0.5 size-7 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert
              className="mt-0.5 size-7 shrink-0"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="text-lg font-semibold leading-6">{state.message}</p>
            {state.attendeeName ? (
              <p className="mt-1 text-2xl font-semibold">
                {state.attendeeName}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function resultClass(status: CheckInActionState["status"]) {
  const base = "flex gap-4 rounded-lg p-5";

  if (status === "success") {
    return `${base} bg-brand-navy-950 text-brand-mint-300`;
  }

  if (status === "warning") {
    return `${base} bg-amber-50 text-amber-700`;
  }

  return `${base} bg-red-50 text-red-700`;
}
