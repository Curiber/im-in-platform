"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState } from "react";

import {
  type RegistrationActionState,
  registerForEvent,
} from "@/app/e/[slug]/register/actions";
import { industries, interests } from "@/lib/profile-options";

const initialState: RegistrationActionState = {
  status: "idle",
  message: "",
};

export function RegistrationForm({
  eventId,
  slug,
}: {
  eventId: string;
  slug: string;
}) {
  const [state, formAction, isPending] = useActionState(
    registerForEvent,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="slug" type="hidden" value={slug} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre">
          <input
            className={inputClass}
            name="fullName"
            placeholder="Nombre y apellido"
            required
          />
        </Field>

        <Field label="Email">
          <input
            autoComplete="email"
            className={inputClass}
            name="email"
            placeholder="tu@email.com"
            required
            type="email"
          />
        </Field>

        <Field label="Telefono opcional">
          <input
            autoComplete="tel"
            className={inputClass}
            name="phone"
            placeholder="+56 9..."
          />
        </Field>

        <Field label="Cargo o rol">
          <input
            className={inputClass}
            name="role"
            placeholder="Gerente, founder, estudiante..."
            required
          />
        </Field>

        <Field label="Empresa u organizacion">
          <input
            className={inputClass}
            name="company"
            placeholder="Empresa, UAI, comunidad..."
            required
          />
        </Field>

        <Field label="Area o industria">
          <select
            className={inputClass}
            name="industry"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Selecciona una opcion
            </option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy-950">
          Intereses
        </legend>
        <p className="mt-1 text-sm text-brand-slate-600">
          Selecciona hasta 5 temas para ayudarte a descubrir personas afines.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {interests.map((interest) => (
            <label
              className="flex items-center gap-3 rounded-md border border-brand-border bg-brand-surface-soft p-3 text-sm"
              key={interest}
            >
              <input name="interests" type="checkbox" value={interest} />
              <span>{interest}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-md border border-brand-border bg-brand-surface-soft p-4">
        <label className="flex items-start gap-3">
          <input className="mt-1 size-4" name="networkingOptIn" type="checkbox" />
          <span>
            <span className="block text-sm font-semibold text-brand-navy-950">
              Quiero participar en networking y aparecer en el directorio
            </span>
            <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
              Otros asistentes inscritos podran ver tu nombre, cargo, empresa,
              area e intereses. Tu email y telefono solo se comparten si aceptas
              una conexion.
            </span>
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-brand-border bg-white p-4">
        <input className="mt-1 size-4" name="dataConsent" required type="checkbox" />
        <span className="text-sm leading-6 text-brand-slate-600">
          Acepto que el organizador use mis datos para gestionar la inscripcion,
          acreditacion y experiencia del evento.
        </span>
      </label>

      {state.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Inscribiendo..." : "Confirmar inscripcion"}
        {isPending ? null : <ArrowRight className="size-4" aria-hidden="true" />}
      </button>

      <p className="flex items-start gap-2 text-sm leading-6 text-brand-slate-600">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-cyan-500" />
        Al finalizar recibiras tu credencial QR para entrar al evento.
      </p>
    </form>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-navy-950">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500";
