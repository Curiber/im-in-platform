"use client";

import { Save } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState } from "react";

import {
  type ProfileActionState,
  updateGlobalProfile,
} from "@/app/app/perfil/actions";
import type { AttendeeProfile } from "@/lib/attendee-account";

const initialState: ProfileActionState = { status: "idle", message: "" };

export function ProfileEditForm({
  profile,
  industries,
  interests,
  goals,
}: {
  profile: AttendeeProfile;
  industries: string[];
  interests: string[];
  goals: string[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateGlobalProfile,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre">
          <input
            className={inputClass}
            defaultValue={profile.full_name}
            name="fullName"
            required
          />
        </Field>

        <Field label="Cargo o rol">
          <input
            className={inputClass}
            defaultValue={profile.role ?? ""}
            name="role"
            placeholder="Gerente, founder, estudiante..."
          />
        </Field>

        <Field label="Empresa u organizacion">
          <input
            className={inputClass}
            defaultValue={profile.company ?? ""}
            name="company"
            placeholder="Empresa, comunidad..."
          />
        </Field>

        <Field label="Area o industria">
          <select
            className={inputClass}
            defaultValue={
              profile.industry && industries.includes(profile.industry)
                ? profile.industry
                : ""
            }
            name="industry"
          >
            <option value="">Sin especificar</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Telefono">
          <input
            autoComplete="tel"
            className={inputClass}
            defaultValue={profile.phone ?? ""}
            name="phone"
            placeholder="+56 9..."
          />
        </Field>

        <Field label="LinkedIn">
          <input
            className={inputClass}
            defaultValue={profile.linkedin_url ?? ""}
            name="linkedinUrl"
            placeholder="https://linkedin.com/in/..."
            type="url"
          />
        </Field>
      </div>

      <Field label="Titular (una linea)">
        <input
          className={inputClass}
          defaultValue={profile.headline ?? ""}
          maxLength={120}
          name="headline"
          placeholder="Ej: Ayudo a startups a escalar su operacion"
        />
      </Field>

      <Field label="Sobre ti">
        <textarea
          className={`${inputClass} min-h-24 py-2.5`}
          defaultValue={profile.description ?? ""}
          maxLength={280}
          name="description"
          placeholder="Una breve descripcion para otros asistentes."
        />
      </Field>

      <CheckboxGroup
        legend="Intereses"
        hint="Hasta 5 temas para descubrir personas afines."
        name="interests"
        options={interests}
        selected={profile.interests}
      />

      <CheckboxGroup
        legend="¿Que buscas?"
        hint="Hasta 3 objetivos que buscas en los eventos."
        name="goalsSeeking"
        options={goals}
        selected={profile.goals_seeking}
      />

      <CheckboxGroup
        legend="¿Que ofreces?"
        hint="Hasta 3 cosas que puedes aportar."
        name="goalsOffering"
        options={goals}
        selected={profile.goals_offering}
      />

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
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function CheckboxGroup({
  legend,
  hint,
  name,
  options,
  selected,
}: {
  legend: string;
  hint: string;
  name: string;
  options: string[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-brand-navy-950">
        {legend}
      </legend>
      <p className="mt-1 text-sm text-brand-slate-600">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label className="cursor-pointer" key={option}>
            <input
              className="peer sr-only"
              defaultChecked={selected.includes(option)}
              name={name}
              type="checkbox"
              value={option}
            />
            <span className="inline-flex items-center rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-medium text-brand-slate-600 transition hover:border-brand-cyan-500/50 peer-checked:border-brand-navy-950 peer-checked:bg-brand-navy-950 peer-checked:text-white">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-brand-navy-950">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy-950 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20";
