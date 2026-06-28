import { MailCheck, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CheckEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  const { status } = await searchParams;
  const isInvalid = status === "invalid";

  return (
    <main className="min-h-screen bg-brand-gradient-soft text-brand-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-xl items-center px-5 py-12 sm:px-8">
        <div className="w-full rounded-3xl border border-brand-border bg-white p-8 shadow-xl shadow-brand-blue-700/10">
          <Link className="inline-flex" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-36"
              height={45}
              src="/brand/im-in-logo.png"
              width={180}
            />
          </Link>

          {isInvalid ? (
            <>
              <span className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <TriangleAlert className="size-7" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-brand-navy-950">
                Link de verificacion invalido o vencido
              </h1>
              <p className="mt-3 leading-7 text-brand-slate-600">
                El link no es valido o ya expiro. Vuelve a inscribirte para
                recibir un nuevo correo de confirmacion.
              </p>
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white hover:bg-brand-navy-900"
                href={`/e/${slug}/register`}
              >
                Volver a inscribirme
              </Link>
            </>
          ) : (
            <>
              <span className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-brand-gradient-accent text-brand-navy-950">
                <MailCheck className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
                Revisa tu correo
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy-950">
                Casi listo: confirma tu email
              </h1>
              <p className="mt-3 leading-7 text-brand-slate-600">
                Si el email es valido, te enviamos un link de confirmacion.
                Abrelo para activar tu inscripcion y ver tu credencial QR.
              </p>
              <p className="mt-4 text-sm leading-6 text-brand-slate-600">
                Revisa tambien spam o promociones. El link vence en 24 horas.
              </p>
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-5 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href={`/e/${slug}`}
              >
                Volver al evento
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
