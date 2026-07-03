import { Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AttendeeLoginForm } from "@/app/mi/login/attendee-login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AttendeeLoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/mi");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-surface-soft px-5 py-10 text-brand-slate-900">
      <div className="w-full max-w-md">
        <Link className="mb-8 flex justify-center" href="/">
          <Image
            alt="I'M IN"
            className="h-auto w-36"
            height={45}
            src="/brand/im-in-logo.png"
            width={180}
          />
        </Link>

        <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            <Sparkles className="size-4" aria-hidden="true" />
            Asistentes
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy-950">
            Entra a tus eventos
          </h1>
          <p className="mt-2 text-sm leading-6 text-brand-slate-600">
            Usa el mismo email con el que te inscribiste: te enviaremos un link
            de acceso y encontraras todas tus inscripciones en un solo lugar.
          </p>
          <div className="mt-6">
            <AttendeeLoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-brand-slate-600">
          ¿Organizas eventos?{" "}
          <Link
            className="font-semibold text-brand-navy-950 underline-offset-4 hover:underline"
            href="/login"
          >
            Entra al panel de administracion
          </Link>
        </p>
      </div>
    </main>
  );
}
