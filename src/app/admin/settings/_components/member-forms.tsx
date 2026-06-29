"use client";

import { Crown, Trash2, UserPlus } from "lucide-react";
import { useActionState } from "react";

import {
  type FormState,
  initialFormState,
} from "@/app/admin/_components/form-state";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import {
  addOrganizationMember,
  removeOrganizationMember,
  transferOrganizationOwnership,
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
        <p className="mt-1 text-xs text-red-700" role="alert">
          {state.error}
        </p>
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
        <p className="mt-1 text-xs text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function TransferOwnershipForm({
  organizationId,
  members,
}: {
  organizationId: string;
  members: { userId: string; label: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    transferOrganizationOwnership,
    initialFormState,
  );

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-300/70 bg-amber-50/60 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Crown className="size-4" aria-hidden="true" />
        Transferir propiedad
      </h4>
      <p className="mt-1 text-sm text-amber-900/80">
        El nuevo owner toma el control total de la organizacion y tu pasas a ser
        admin. Esta accion no se puede deshacer desde aqui.
      </p>
      <form
        action={formAction}
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Vas a transferir la propiedad de la organizacion. Perderas el rol de owner. ¿Continuar?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <select
          className="h-10 rounded-lg border border-amber-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
          defaultValue=""
          name="newOwnerUserId"
          required
        >
          <option disabled value="">
            Elige al nuevo owner
          </option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.label}
            </option>
          ))}
        </select>
        <SubmitButton className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
          <Crown className="size-4" aria-hidden="true" />
          Transferir
        </SubmitButton>
      </form>
      {state.error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
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
        <p className="mt-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
