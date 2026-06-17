import { ArrowLeft, CalendarCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { DemoForm } from "@/app/demo/demo-form";

export const metadata: Metadata = {
  title: "Agenda una demo",
  description:
    "Conoce como I'm IN potencia el networking, la acreditacion y las metricas de tu proximo evento. Agenda una demo con nuestro equipo.",
};

const valueProps = [
  {
    icon: Users,
    title: "Mejores reuniones",
    description: "Conecta a tus asistentes y sponsors con las personas correctas.",
  },
  {
    icon: Sparkles,
    title: "Networking con intencion",
    description: "Recomendaciones que cruzan lo que cada persona busca y ofrece.",
  },
  {
    icon: TrendingUp,
    title: "Mas valor para sponsors",
    description: "Patrocinios con leads y retorno medible para tus auspiciadores.",
  },
  {
    icon: CalendarCheck,
    title: "Operacion sin friccion",
    description: "Inscripcion, acreditacion QR y metricas en una sola plataforma.",
  },
];

const trustBadges = ["Setup rapido", "Soporte en espanol", "Datos con consentimiento"];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
        <section className="relative overflow-hidden bg-brand-gradient-primary px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -left-10 top-20 size-48 rounded-full bg-brand-aqua-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 size-48 rounded-full bg-brand-mint-300/20 blur-3xl" />

          <div className="relative mx-auto flex h-full w-full max-w-xl flex-col">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center">
                <Image
                  alt="I'M IN"
                  className="h-auto w-32"
                  height={45}
                  priority
                  src="/brand/im-in-logo-white.png"
                  width={180}
                />
              </Link>
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
                href="/"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver
              </Link>
            </div>

            <div className="mt-12 lg:mt-16">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
                Agenda una demo
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Crea eventos que generan conexiones reales.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-8 text-white/85">
                Te mostramos como I&apos;m IN potencia el networking, simplifica
                la operacion y entrega metricas que tus sponsors valoran.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {valueProps.map((prop) => {
                  const Icon = prop.icon;

                  return (
                    <div
                      className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur"
                      key={prop.title}
                    >
                      <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-brand-mint-300">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <h2 className="mt-3 text-base font-semibold text-white">
                        {prop.title}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-white/75">
                        {prop.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 flex flex-wrap gap-2">
                {trustBadges.map((badge) => (
                  <span
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-white/15"
                    key={badge}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              Hablemos de tu evento
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-navy-950">
              Cuentanos un poco y te contactamos.
            </h2>
            <p className="mt-2 text-sm leading-6 text-brand-slate-600">
              Respondemos en horario habil. Sin compromiso.
            </p>

            <div className="mt-6">
              <DemoForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
