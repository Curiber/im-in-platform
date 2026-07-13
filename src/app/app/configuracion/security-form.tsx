"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";

import {
  changePassword,
  type PasswordActionState,
} from "@/app/app/configuracion/actions";

const initialState: PasswordActionState = { status: "idle", message: "" };

export function SecurityForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {hasPassword ? (
        <Field label="Contrasena actual">
          <input
            autoComplete="current-password"
            className={inputClass}
            name="currentPassword"
            required
            type="password"
          />
        </Field>
      ) : null}

      <Field label="Nueva contrasena">
        <input
          autoComplete="new-password"
          className={inputClass}
          minLength={8}
          name="newPassword"
          placeholder="Al menos 8 caracteres"
          required
          type="password"
        />
      </Field>

      <Field label="Confirmar nueva contrasena">
        <input
          autoComplete="new-password"
          className={inputClass}
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </Field>

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
        <KeyRound className="size-4" aria-hidden="true" />
        {isPending
          ? "Guardando..."
          : hasPassword
            ? "Cambiar contrasena"
            : "Establecer contrasena"}
      </button>
    </form>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
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
