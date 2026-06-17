"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState } from "react";

import {
  type DemoRequestActionState,
  submitDemoRequest,
} from "@/app/demo/actions";

const initialState: DemoRequestActionState = {
  status: "idle",
  message: "",
};

const inputClass =
  "h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm text-brand-navy-950 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20";

const organizationTypes = [
  ["company", "Empresa"],
  ["university", "Universidad"],
  ["foundation", "Fundacion"],
  ["guild", "Gremio"],
  ["incubator", "Incubadora / aceleradora"],
  ["community", "Comunidad"],
  ["producer", "Productora de eventos"],
  ["public_institution", "Institucion publica"],
  ["other", "Otro"],
] as const;

const countries = [
  "Chile",
  "Argentina",
  "Mexico",
  "Colombia",
  "Peru",
  "Uruguay",
  "Brasil",
  "Espana",
  "Estados Unidos",
  "Otro",
];

const attendeeRanges = [
  "Menos de 100",
  "100 a 500",
  "500 a 2.000",
  "2.000 a 10.000",
  "Mas de 10.000",
];

export function DemoForm() {
  const [state, formAction, isPending] = useActionState(
    submitDemoRequest,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-brand-border bg-white p-8 shadow-xl shadow-brand-blue-700/10">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gradient-accent text-brand-navy-950">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold text-brand-navy-950">
          ¡Solicitud recibida!
        </h2>
        <p className="mt-3 leading-7 text-brand-slate-600">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-brand-border bg-white p-6 shadow-xl shadow-brand-blue-700/10 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Email">
          <input
            autoComplete="email"
            className={inputClass}
            name="email"
            placeholder="tu@empresa.com"
            required
            type="email"
          />
        </Field>

        <Field label="Nombre">
          <input
            autoComplete="given-name"
            className={inputClass}
            name="firstName"
            placeholder="Nombre"
            required
          />
        </Field>

        <Field label="Apellido">
          <input
            autoComplete="family-name"
            className={inputClass}
            name="lastName"
            placeholder="Apellido"
            required
          />
        </Field>

        <Field label="Telefono (opcional)">
          <input
            autoComplete="tel"
            className={inputClass}
            name="phone"
            placeholder="+56 9 ..."
            type="tel"
          />
        </Field>

        <Field label="Organizacion">
          <input
            autoComplete="organization"
            className={inputClass}
            name="organizationName"
            placeholder="Nombre de tu empresa u organizacion"
            required
          />
        </Field>

        <Field label="Pais">
          <select className={inputClass} defaultValue="Chile" name="country">
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de organizacion">
          <select className={inputClass} defaultValue="company" name="organizationType">
            {organizationTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field className="sm:col-span-2" label="Asistentes anuales estimados">
          <select className={inputClass} defaultValue="" name="annualAttendees">
            <option disabled value="">
              Selecciona un rango
            </option>
            {attendeeRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </Field>

        <Field className="sm:col-span-2" label="Cuentanos sobre tu evento (opcional)">
          <textarea
            className={`${inputClass} h-24 resize-none py-2.5`}
            name="message"
            placeholder="Tipo de evento, fechas, objetivos de networking..."
          />
        </Field>

        <Field className="sm:col-span-2" label="¿Como nos conociste? (opcional)">
          <input
            className={inputClass}
            name="referralSource"
            placeholder="Recomendacion, redes, otro evento..."
          />
        </Field>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-brand-border bg-brand-surface-soft p-4">
        <input className="mt-0.5 size-4" name="contactConsent" required type="checkbox" />
        <span className="text-sm leading-6 text-brand-slate-600">
          Acepto que I&apos;m IN use mis datos para contactarme sobre la demo y
          la plataforma.
        </span>
      </label>

      {state.status === "error" && state.message ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Agendar demo"}
        {!isPending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-brand-navy-950">
        {label}
      </span>
      {children}
    </label>
  );
}
