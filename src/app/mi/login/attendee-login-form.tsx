"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useActionState } from "react";

import {
  type AttendeeLoginState,
  sendAttendeeMagicLink,
} from "@/app/mi/login/actions";

const initialState: AttendeeLoginState = {
  status: "idle",
  message: "",
};

export function AttendeeLoginForm() {
  const [state, formAction, isPending] = useActionState(
    sendAttendeeMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">Email</span>
        <span className="mt-2 flex items-center gap-3 rounded-md border border-brand-border bg-white px-3 py-3 shadow-sm">
          <Mail className="size-5 text-brand-slate-600" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-base outline-none placeholder:text-brand-slate-600/60"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
          />
        </span>
      </label>

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-65"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Enviando..." : "Enviar link de acceso"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-md bg-brand-slate-100 px-3 py-2 text-sm text-brand-cyan-500"
              : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
