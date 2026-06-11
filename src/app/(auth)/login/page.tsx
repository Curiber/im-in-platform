import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <Link
            className="text-sm font-semibold text-brand-cyan-500"
            href="/"
          >
            I&apos;m IN
          </Link>
          <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">
            Acceso para organizadores de eventos
          </h1>
          <p className="mt-5 text-lg leading-8 text-brand-slate-600">
            Crea eventos, revisa inscritos y prepara la acreditacion desde una
            zona privada pensada para operar el MVP con orden.
          </p>
        </div>

        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Login
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Entra con magic link
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-slate-600">
              Te enviaremos un link seguro al correo asociado a tu cuenta.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
