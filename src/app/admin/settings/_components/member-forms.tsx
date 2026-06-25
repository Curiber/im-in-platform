"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useActionState } from "react";

import {
  type FormState,
  initialFormState,
} from "@/app/admin/_components/form-state";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import {
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "@/app/admin/actions";

export function UpdateMemberRoleForm({
  organizationId,
  userId,
  defaultRole,
}: {
  organizationId: string;
  userId: string;
  defaultRole: "admin" | "event_admin";
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateOrganizationMemberRole,
    initialFormState,
  );

  return (
    <form action={formAction}>
      <div className="flex items-center">
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="userId" type="hidden" value={userId} />
        <select
          className="h-9 rounded-lg border border-brand-border bg-white px-2 text-sm outline-none focus:border-brand-cyan-500"
          defaultValue={defaultRole}
          name="role"
        >
          <option value="admin">Admin</option>
          <option value="event_admin">Admin de evento</option>
        </select>
        <SubmitButton className="ml-2 inline-flex h-9 items-center rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-white disabled:opacity-60">
          Guardar
        </SubmitButton>
      </div>
      {state.error ? (
        <p className="mt-1 text-xs text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}

export function RemoveMemberForm({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    removeOrganizationMember,
    initialFormState,
  );

  return (
    <form action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="userId" type="hidden" value={userId} />
      <SubmitButton
        aria-label="Quitar miembro"
        className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-border bg-white text-red-700 transition hover:bg-brand-surface-soft disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </SubmitButton>
      {state.error ? (
        <p className="mt-1 text-xs text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}

export function AddMemberForm({ organizationId }: { organizationId: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    addOrganizationMember,
    initialFormState,
  );

  return (
    <div className="mt-4">
      <form
        action={formAction}
        className="grid gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 sm:grid-cols-[1fr_180px_auto]"
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <input
          className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          name="email"
          placeholder="email@empresa.com"
          required
          type="email"
        />
        <select
          className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          defaultValue="event_admin"
          name="role"
        >
          <option value="admin">Admin</option>
          <option value="event_admin">Admin de evento</option>
        </select>
        <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900 disabled:opacity-60">
          <UserPlus className="size-4" aria-hidden="true" />
          Invitar
        </SubmitButton>
      </form>
      {state.error ? (
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
      ) : null}
    </div>
  );
}
