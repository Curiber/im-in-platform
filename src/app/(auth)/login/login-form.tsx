"use client";

import { ArrowRight, Linkedin, Mail } from "lucide-react";
import { useActionState } from "react";

import {
  type LoginActionState,
  sendMagicLink,
  signInWithLinkedIn,
} from "@/app/(auth)/login/actions";

const initialState: LoginActionState = {
  status: "idle",
  message: "",
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <div className="space-y-5">
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-[#1f2723]">Email</span>
        <span className="mt-2 flex items-center gap-3 rounded-md border border-[#d9d5cb] bg-white px-3 py-3 shadow-sm">
          <Mail className="size-5 text-[#5f625d]" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-base outline-none placeholder:text-[#888b85]"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@empresa.com"
            required
          />
        </span>
      </label>

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white transition hover:bg-[#183b33] disabled:cursor-not-allowed disabled:opacity-65"
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
              ? "rounded-md bg-[#e3f0d9] px-3 py-2 text-sm text-[#2f6f4e]"
              : "rounded-md bg-[#f8ded8] px-3 py-2 text-sm text-[#8a2f24]"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>

    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[#d9d5cb]" aria-hidden="true" />
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#888b85]">
        o
      </span>
      <span className="h-px flex-1 bg-[#d9d5cb]" aria-hidden="true" />
    </div>

    <form action={signInWithLinkedIn}>
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#d9d5cb] bg-white px-4 text-sm font-semibold text-[#1f2723] transition hover:bg-[#f6f4ef]"
        type="submit"
      >
        <Linkedin className="size-4 text-[#0a66c2]" aria-hidden="true" />
        Continuar con LinkedIn
      </button>
    </form>
    </div>
  );
}
