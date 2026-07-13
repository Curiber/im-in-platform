"use client";

import { Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  type PrivacyActionState,
  updateCardVisibility,
} from "@/app/app/configuracion/actions";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";

const initialState: PrivacyActionState = { status: "idle", message: "" };

const options: {
  value: ProfileCardVisibility;
  title: string;
  description: string;
}[] = [
  {
    value: "private",
    title: "Privada",
    description: "No se publica una tarjeta accesible por link.",
  },
  {
    value: "public_limited",
    title: "Publica limitada",
    description:
      "Muestra nombre, cargo, empresa, descripcion, intereses y LinkedIn si lo completaste.",
  },
  {
    value: "public_full",
    title: "Publica completa",
    description:
      "Ademas puedes sumar email y telefono con consentimiento explicito.",
  },
];

export function PrivacyForm({
  cardVisibility,
  publicEmailEnabled,
  publicPhoneEnabled,
}: {
  cardVisibility: ProfileCardVisibility;
  publicEmailEnabled: boolean;
  publicPhoneEnabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCardVisibility,
    initialState,
  );
  const [visibility, setVisibility] =
    useState<ProfileCardVisibility>(cardVisibility);

  const showContactToggles = visibility === "public_full";

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="grid gap-2">
        {options.map((option) => (
          <label
            className="flex items-start gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3 has-[:checked]:border-brand-navy-950"
            key={option.value}
          >
            <input
              checked={visibility === option.value}
              className="mt-1 size-4"
              name="cardVisibility"
              onChange={() => setVisibility(option.value)}
              type="radio"
              value={option.value}
            />
            <span>
              <span className="block text-sm font-semibold text-brand-navy-950">
                {option.title}
              </span>
              <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {showContactToggles ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3 text-sm">
            <input
              defaultChecked={publicEmailEnabled}
              name="publicEmailEnabled"
              type="checkbox"
            />
            <span>Mostrar email en la tarjeta completa</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3 text-sm">
            <input
              defaultChecked={publicPhoneEnabled}
              name="publicPhoneEnabled"
              type="checkbox"
            />
            <span>Mostrar telefono en la tarjeta completa</span>
          </label>
        </div>
      ) : null}

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-xl bg-brand-mint-300/30 px-3.5 py-2.5 text-sm font-semibold text-brand-navy-950"
              : "rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-navy-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isPending}
        type="submit"
      >
        <Save className="size-4" aria-hidden="true" />
        {isPending ? "Guardando..." : "Guardar privacidad"}
      </button>
    </form>
  );
}
