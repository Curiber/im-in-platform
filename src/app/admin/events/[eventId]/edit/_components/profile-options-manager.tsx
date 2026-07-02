import { ListChecks, Plus, RotateCcw, Tags, X } from "lucide-react";

import {
  addEventProfileOption,
  customizeEventProfileOptions,
  removeEventProfileOption,
  resetEventProfileOptions,
} from "@/app/admin/events/actions";
import {
  DEFAULT_GOALS,
  DEFAULT_INDUSTRIES,
  DEFAULT_INTERESTS,
} from "@/lib/profile-options";

export type ProfileOptionRow = { id: string; label: string };

export function EventProfileOptionsManager({
  eventId,
  goals,
  industries,
  interests,
}: {
  eventId: string;
  goals: ProfileOptionRow[];
  industries: ProfileOptionRow[];
  interests: ProfileOptionRow[];
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-mint-300/40 text-brand-navy-950">
          <Tags className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-brand-navy-950">
            Opciones de networking
          </h2>
          <p className="mt-1 text-sm leading-6 text-brand-slate-600">
            Personaliza las areas, intereses y objetivos de networking que los
            asistentes pueden elegir al inscribirse y en su perfil. Si no
            personalizas, se usan las opciones por defecto de la plataforma.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <OptionGroup
          defaults={DEFAULT_INDUSTRIES}
          eventId={eventId}
          kind="industry"
          options={industries}
          title="Areas o industrias"
        />
        <OptionGroup
          defaults={DEFAULT_INTERESTS}
          eventId={eventId}
          kind="interest"
          options={interests}
          title="Intereses"
        />
        <OptionGroup
          defaults={DEFAULT_GOALS}
          eventId={eventId}
          kind="goal"
          options={goals}
          title="Objetivos de networking (busco/ofrezco)"
        />
      </div>
    </div>
  );
}

function OptionGroup({
  eventId,
  kind,
  title,
  options,
  defaults,
}: {
  eventId: string;
  kind: "industry" | "interest" | "goal";
  title: string;
  options: ProfileOptionRow[];
  defaults: string[];
}) {
  const isCustomized = options.length > 0;

  return (
    <div className="rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
          <ListChecks className="size-4 text-brand-cyan-500" aria-hidden="true" />
          {title}
        </h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-slate-600">
          {isCustomized ? "Personalizado" : "Por defecto"}
        </span>
      </div>

      {isCustomized ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((option) => (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white py-1 pl-3 pr-1 text-sm font-medium text-brand-navy-950"
                key={option.id}
              >
                {option.label}
                <form action={removeEventProfileOption}>
                  <input name="eventId" type="hidden" value={eventId} />
                  <input name="optionId" type="hidden" value={option.id} />
                  <button
                    aria-label={`Quitar ${option.label}`}
                    className="inline-flex size-6 items-center justify-center rounded-md text-brand-slate-600 transition hover:bg-brand-surface-soft hover:text-red-700"
                    type="submit"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </form>
              </span>
            ))}
          </div>

          <form
            action={addEventProfileOption}
            className="mt-3 flex items-center gap-2"
          >
            <input name="eventId" type="hidden" value={eventId} />
            <input name="kind" type="hidden" value={kind} />
            <input
              className="h-9 flex-1 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
              maxLength={60}
              name="label"
              placeholder="Nueva opcion"
              required
            />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-navy-950 px-3 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              Agregar
            </button>
          </form>

          <form action={resetEventProfileOptions} className="mt-2">
            <input name="eventId" type="hidden" value={eventId} />
            <input name="kind" type="hidden" value={kind} />
            <button
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-slate-600 transition hover:text-brand-navy-950"
              type="submit"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Restaurar opciones por defecto
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {defaults.map((label) => (
              <span
                className="inline-flex items-center rounded-lg border border-brand-border bg-white px-3 py-1 text-sm font-medium text-brand-slate-600"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>

          <form action={customizeEventProfileOptions} className="mt-3">
            <input name="eventId" type="hidden" value={eventId} />
            <input name="kind" type="hidden" value={kind} />
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-white"
              type="submit"
            >
              <Plus className="size-4" aria-hidden="true" />
              Personalizar opciones
            </button>
          </form>
        </>
      )}
    </div>
  );
}
