"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  type FormState,
  initialFormState,
} from "@/app/admin/_components/form-state";
import {
  formatOrganizationType,
  formatRole,
} from "@/app/admin/_components/org-labels";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import { updateOrganizationSettings } from "@/app/admin/actions";

type Organization = {
  id: string;
  name: string;
  type: string;
  website_url: string | null;
};

export function OrganizationSettingsForm({
  organization,
  role,
}: {
  organization: Organization;
  role: "owner" | "admin" | "event_admin";
}) {
  const canEdit = role === "owner" || role === "admin";
  const [state, formAction] = useActionState<FormState, FormData>(
    updateOrganizationSettings,
    initialFormState,
  );

  return (
    <form
      action={formAction}
      className="rounded-lg border border-brand-border bg-white p-5 shadow-sm"
    >
      <input name="organizationId" type="hidden" value={organization.id} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-cyan-500">
            {formatOrganizationType(organization.type)}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{organization.name}</h3>
          <p className="mt-1 text-sm text-brand-slate-600">
            Rol: {formatRole(role)}
          </p>
        </div>
        {!canEdit ? (
          <span className="inline-flex rounded-md bg-brand-surface-soft px-3 py-1 text-sm font-semibold text-brand-slate-600">
            Solo lectura
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-brand-navy-950">Nombre</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 disabled:bg-brand-surface-soft disabled:text-brand-slate-600"
            defaultValue={organization.name}
            disabled={!canEdit}
            name="name"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-brand-navy-950">
            Sitio web
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 disabled:bg-brand-surface-soft disabled:text-brand-slate-600"
            defaultValue={organization.website_url ?? ""}
            disabled={!canEdit}
            name="websiteUrl"
            placeholder="https://..."
            type="url"
          />
        </label>
      </div>

      {state.error ? (
        <p
          className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {canEdit ? (
        <SubmitButton className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900 disabled:opacity-60">
          <Save className="size-4" aria-hidden="true" />
          Guardar cambios
        </SubmitButton>
      ) : (
        <p className="mt-5 rounded-md bg-brand-surface-soft p-3 text-sm leading-6 text-brand-slate-600">
          Solo owners y admins pueden editar los datos de la organizacion.
        </p>
      )}
    </form>
  );
}
