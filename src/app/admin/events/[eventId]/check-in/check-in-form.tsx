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
        <span className="text-sm font-medium text-[#1f2723]">Payload QR</span>
        <textarea
          className="mt-2 min-h-36 w-full rounded-md border border-[#d9d5cb] bg-white px-3 py-3 font-mono text-sm outline-none focus:border-[#2f6f4e]"
          name="payload"
          placeholder='{"kind":"im-in-check-in","registrationId":"...","token":"..."}'
          required
        />
      </label>

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#102923] px-5 text-sm font-semibold text-white hover:bg-[#183b33] disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isPending}
        type="submit"
      >
        <ScanLine className="size-4" aria-hidden="true" />
        {isPending ? "Validando..." : "Registrar check-in"}
      </button>

      {state.message ? (
        <div className={resultClass(state.status)}>
          {state.status === "success" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="font-semibold">{state.message}</p>
            {state.attendeeName ? (
              <p className="mt-1 text-sm">{state.attendeeName}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function resultClass(status: CheckInActionState["status"]) {
  const base = "flex gap-3 rounded-md p-4 text-sm";

  if (status === "success") {
    return `${base} bg-[#e3f0d9] text-[#2f6f4e]`;
  }

  if (status === "warning") {
    return `${base} bg-[#fff3cf] text-[#7a5c00]`;
  }

  return `${base} bg-[#f8ded8] text-[#8a2f24]`;
}
