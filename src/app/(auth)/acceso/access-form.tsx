"use client";

import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useActionState, useState } from "react";

import {
  type AccessActionState,
  sendMagicLink,
  signInWithGoogle,
  signInWithLinkedIn,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/(auth)/acceso/actions";

const initialState: AccessActionState = { status: "idle", message: "" };

type Mode = "signin" | "signup";

export function AccessForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [magicLink, setMagicLink] = useState(false);

  return (
    <div className="space-y-5">
      {magicLink ? (
        <MagicLinkForm next={next} onBack={() => setMagicLink(false)} />
      ) : mode === "signin" ? (
        <SignInForm next={next} />
      ) : (
        <SignUpForm next={next} />
      )}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-brand-border" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-slate-600/60">
          o
        </span>
        <span className="h-px flex-1 bg-brand-border" aria-hidden="true" />
      </div>

      <form action={signInWithGoogle}>
        <input name="next" type="hidden" value={next} />
        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
          type="submit"
        >
          <GoogleIcon className="size-4" />
          Continuar con Google
        </button>
      </form>

      <form action={signInWithLinkedIn}>
        <input name="next" type="hidden" value={next} />
        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
          type="submit"
        >
          <LinkedInIcon className="size-4 text-[#0a66c2]" />
          Continuar con LinkedIn
        </button>
      </form>

      {!magicLink ? (
        <button
          className="w-full text-center text-sm font-semibold text-brand-cyan-500 hover:underline"
          onClick={() => setMagicLink(true)}
          type="button"
        >
          Entrar con un link al correo
        </button>
      ) : null}

      <p className="text-center text-sm text-brand-slate-600">
        {mode === "signin" ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
        <button
          className="font-semibold text-brand-navy-950 hover:underline"
          onClick={() => {
            setMagicLink(false);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          type="button"
        >
          {mode === "signin" ? "Crear cuenta" : "Ingresar"}
        </button>
      </p>
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    signInWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={next} />
      <EmailField />
      <PasswordField autoComplete="current-password" />
      <SubmitButton isPending={isPending} label="Ingresar" />
      <FormMessage state={state} />
    </form>
  );
}

function SignUpForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    signUpWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={next} />
      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">
          Nombre y apellido
        </span>
        <span className="mt-2 flex items-center gap-3 rounded-md border border-brand-border bg-white px-3 py-3 shadow-sm">
          <User className="size-5 text-brand-slate-600" aria-hidden="true" />
          <input
            autoComplete="name"
            className="w-full bg-transparent text-base outline-none placeholder:text-brand-slate-600/60"
            name="fullName"
            placeholder="Tu nombre"
            required
          />
        </span>
      </label>
      <EmailField />
      <PasswordField autoComplete="new-password" />
      <SubmitButton isPending={isPending} label="Crear cuenta" />
      <FormMessage state={state} />
    </form>
  );
}

function MagicLinkForm({
  next,
  onBack,
}: {
  next: string;
  onBack: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={next} />
      <EmailField />
      <SubmitButton isPending={isPending} label="Enviar link de acceso" />
      <FormMessage state={state} />
      <button
        className="w-full text-center text-sm font-semibold text-brand-slate-600 hover:underline"
        onClick={onBack}
        type="button"
      >
        Volver
      </button>
    </form>
  );
}

function EmailField() {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-navy-950">Email</span>
      <span className="mt-2 flex items-center gap-3 rounded-md border border-brand-border bg-white px-3 py-3 shadow-sm">
        <Mail className="size-5 text-brand-slate-600" aria-hidden="true" />
        <input
          autoComplete="email"
          className="w-full bg-transparent text-base outline-none placeholder:text-brand-slate-600/60"
          name="email"
          placeholder="tu@email.com"
          required
          type="email"
        />
      </span>
    </label>
  );
}

function PasswordField({ autoComplete }: { autoComplete: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-brand-navy-950">Contrasena</span>
      <span className="mt-2 flex items-center gap-3 rounded-md border border-brand-border bg-white px-3 py-3 shadow-sm">
        <Lock className="size-5 text-brand-slate-600" aria-hidden="true" />
        <input
          autoComplete={autoComplete}
          className="w-full bg-transparent text-base outline-none placeholder:text-brand-slate-600/60"
          minLength={8}
          name="password"
          placeholder="Minimo 8 caracteres"
          required
          type="password"
        />
      </span>
    </label>
  );
}

function SubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900 disabled:cursor-not-allowed disabled:opacity-65"
      disabled={isPending}
      type="submit"
    >
      {isPending ? "Procesando..." : label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  );
}

function FormMessage({ state }: { state: AccessActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "success"
          ? "rounded-md bg-brand-slate-100 px-3 py-2 text-sm text-brand-cyan-500"
          : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
    </svg>
  );
}
