import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccessForm } from "@/app/(auth)/acceso/access-form";
import { getAttendeeUser } from "@/lib/attendee-account";
import { getAppUrl } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  // Se valida el `next` (open redirect): destino interno o /app por defecto.
  const next = safeRedirectPath(rawNext ?? null, getAppUrl(), "/app");

  // Si ya hay sesion, no tiene sentido mostrar el acceso: al destino pedido.
  const user = await getAttendeeUser();
  if (user) {
    redirect(next);
  }

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 md:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <Link className="inline-flex items-center" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-32"
              height={38}
              priority
              src="/brand/im-in-logo.png"
              width={152}
            />
          </Link>
          <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">
            Tu cuenta en I&apos;m IN
          </h1>
          <p className="mt-5 text-lg leading-8 text-brand-slate-600">
            Crea tu cuenta una vez y reutiliza tu perfil en cada evento.
            Descubre eventos, conecta con otros asistentes y conserva tus
            contactos y reuniones en un solo lugar.
          </p>
        </div>

        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Acceso
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Ingresa o crea tu cuenta</h2>
            <p className="mt-2 text-sm leading-6 text-brand-slate-600">
              Con email y contrasena, Google o LinkedIn.
            </p>
          </div>
          <AccessForm next={next} />
        </div>
      </section>
    </main>
  );
}
