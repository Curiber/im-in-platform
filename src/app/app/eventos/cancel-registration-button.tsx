"use client";

import { X } from "lucide-react";

import { cancelRegistration } from "@/app/app/eventos/actions";

export function CancelRegistrationButton({
  registrationId,
}: {
  registrationId: string;
}) {
  return (
    <form
      action={cancelRegistration}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Cancelar tu inscripcion a este evento? Se liberara tu cupo y saldras del directorio.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="registrationId" type="hidden" value={registrationId} />
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-slate-600 transition hover:border-red-300 hover:text-red-700"
        type="submit"
      >
        <X className="size-4" aria-hidden="true" />
        Cancelar inscripcion
      </button>
    </form>
  );
}
