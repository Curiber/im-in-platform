import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Handshake,
  Network,
  PlayCircle,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const steps = [
  {
    title: "Crea tu perfil",
    description:
      "Completa tus datos profesionales, intereses y que buscas para llegar preparado al evento.",
    icon: BadgeCheck,
    accent: "from-brand-cyan-500 to-brand-mint-300 text-brand-navy-950",
  },
  {
    title: "Entra al evento",
    description:
      "Inscribete, recibe tu QR y accede al directorio privado de asistentes.",
    icon: CalendarDays,
    accent: "from-brand-blue-700 to-brand-aqua-400 text-white",
  },
  {
    title: "Conecta mejor",
    description:
      "Descubre personas relevantes por intereses, pide conectar y conserva el vinculo despues.",
    icon: Handshake,
    accent: "from-brand-navy-950 to-brand-cyan-500 text-white",
  },
];

const benefits = [
  "Networking mas eficiente antes, durante y despues del evento.",
  "Acreditacion simple con QR y datos claros para el organizador.",
  "Directorio privado con intereses, cargo, empresa y foto.",
  "Tarjeta virtual para compartir contacto profesional.",
];

const audiences = [
  "Asistentes que quieren conocer personas relevantes.",
  "Organizadores que necesitan registro, check-in y metricas.",
  "Empresas y comunidades que activan redes profesionales.",
];

const partners = ["Universidades", "Fundaciones", "Comunidades", "Productoras"];

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="sticky top-0 z-40 border-b border-brand-border/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link className="inline-flex items-center" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-36"
              height={45}
              priority
              src="/brand/im-in-logo.png"
              width={180}
            />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950 md:inline-flex"
              href="#como-funciona"
            >
              Como funciona
            </a>
            <a
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950 md:inline-flex"
              href="#beneficios"
            >
              Beneficios
            </a>
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950"
              href="/login"
            >
              Ingresar
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
              href="/demo"
            >
              Agenda una demo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="overflow-hidden border-b border-brand-border/60 bg-brand-gradient-soft">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_480px] lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              Networking que si conecta
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-tight text-brand-navy-950 sm:text-6xl">
              Conoce a las personas correctas en cada evento.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-slate-600">
              I&apos;M IN une inscripcion, acreditacion QR y networking con
              intencion en una sola experiencia: descubre quien asiste, conecta
              antes y conserva el vinculo despues.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient-primary px-6 text-sm font-semibold text-white shadow-lg shadow-brand-blue-700/25 transition hover:-translate-y-0.5"
                href="/demo"
              >
                Agenda una demo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-brand-border bg-white px-6 text-sm font-semibold text-brand-navy-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                href="#como-funciona"
              >
                <PlayCircle className="size-4 text-brand-cyan-500" aria-hidden="true" />
                Ver como funciona
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-brand-slate-600">
              <li className="inline-flex items-center gap-2">
                <BadgeCheck className="size-4 text-brand-cyan-500" aria-hidden="true" />
                QR de acceso incluido
              </li>
              <li className="inline-flex items-center gap-2">
                <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
                Directorio privado por evento
              </li>
              <li className="inline-flex items-center gap-2">
                <Network className="size-4 text-brand-cyan-500" aria-hidden="true" />
                Conexiones con consentimiento
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 size-36 rounded-full bg-brand-aqua-400/25 blur-3xl" />
            <div className="absolute -right-8 bottom-10 size-36 rounded-full bg-brand-blue-700/20 blur-3xl" />
            <div className="relative rounded-3xl border border-brand-border bg-white p-6 shadow-2xl shadow-brand-blue-700/15">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-navy-950">
                  Directorio del evento
                </p>
                <span className="rounded-lg bg-brand-gradient-accent px-3 py-1 text-xs font-semibold text-brand-navy-950">
                  En vivo
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <ProfileCard
                  company="Directora de Innovacion · UAI"
                  gradient="from-brand-blue-700 to-brand-aqua-400"
                  initials="MT"
                  match="92% match"
                  matchTone="teal"
                  name="Marcela Tapia"
                />
                <ProfileCard
                  company="Founder · busca inversion"
                  gradient="from-brand-navy-950 to-brand-cyan-500"
                  initials="JM"
                  match="Conectar"
                  matchTone="solid"
                  name="Javier Munoz"
                />
                <ProfileCard
                  company="Head of Talent · ofrece mentoria"
                  gradient="from-brand-aqua-400 to-brand-mint-300"
                  initials="SH"
                  match="78% match"
                  matchTone="blue"
                  name="Sofia Herrera"
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric icon={<Users className="size-4" />} label="Asisten" value="128" />
                <MiniMetric icon={<QrCode className="size-4" />} label="Check-in" value="94" />
                <MiniMetric icon={<Network className="size-4" />} label="Conexiones" value="37" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-border/50 bg-white/40">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 sm:px-8">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-slate-600/70">
              Pensado para
            </span>
            {partners.map((partner) => (
              <span
                className="text-sm font-semibold text-brand-slate-600/80"
                key={partner}
              >
                {partner}
              </span>
            ))}
            <span className="border-l border-brand-border pl-10 text-sm font-medium text-brand-slate-600">
              Networking real en cada evento
            </span>
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8"
        id="como-funciona"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Como funciona
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy-950">
            Llega, encuentrate y continua.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue-700/10"
                key={step.title}
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent}`}
                >
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-brand-navy-950">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-brand-slate-600">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="scroll-mt-20 bg-white" id="beneficios">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_440px]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              <Sparkles className="size-4" aria-hidden="true" />
              Beneficios
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy-950">
              Menos azar, mas conexiones con sentido.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  className="rounded-2xl border border-brand-border bg-brand-surface-soft p-5 transition hover:-translate-y-1 hover:border-brand-cyan-500/40 hover:shadow-md"
                  key={benefit}
                >
                  <BadgeCheck
                    className="size-5 text-brand-cyan-500"
                    aria-hidden="true"
                  />
                  <p className="mt-3 leading-7 text-brand-slate-600">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl bg-brand-navy-950 p-8 text-white shadow-xl shadow-brand-navy-950/20">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              Casos de uso
            </p>
            <div className="mt-6 space-y-4">
              {audiences.map((audience) => (
                <p
                  className="rounded-2xl bg-white/10 p-5 leading-7 ring-1 ring-white/10"
                  key={audience}
                >
                  {audience}
                </p>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient-primary px-8 py-14 text-white shadow-2xl shadow-brand-blue-700/25 sm:px-14">
          <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-brand-mint-300/20 blur-3xl" />
          <div className="relative">
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight">
              Activa networking real en tu proximo evento.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/85">
              Te mostramos como funciona con tus propios objetivos. Agenda una
              demo y deja que I&apos;M IN conecte a las personas correctas.
            </p>
            <Link
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-brand-navy-950 shadow-lg transition hover:-translate-y-0.5"
              href="/demo"
            >
              Agenda una demo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-brand-navy-950 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto]">
          <div>
            <Image
              alt="I'M IN"
              className="h-auto w-36"
              height={45}
              src="/brand/im-in-logo-white.png"
              width={180}
            />
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Conectar. Compartir. Crear impacto.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm md:text-right">
            <a className="text-white/80 transition hover:text-white" href="#como-funciona">
              Como funciona
            </a>
            <a className="text-white/80 transition hover:text-white" href="#beneficios">
              Beneficios
            </a>
            <Link className="text-white/80 transition hover:text-white" href="/login">
              Ingresar
            </Link>
            <Link className="text-white/80 transition hover:text-white" href="/demo">
              Agenda una demo
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto w-full max-w-7xl px-5 py-5 text-xs text-white/50 sm:px-8">
            I&apos;M IN. Plataforma de inscripcion, acreditacion y networking
            para eventos.
          </p>
        </div>
      </footer>
    </main>
  );
}

function ProfileCard({
  company,
  gradient,
  initials,
  match,
  matchTone,
  name,
}: {
  company: string;
  gradient: string;
  initials: string;
  match: string;
  matchTone: "teal" | "blue" | "solid";
  name: string;
}) {
  const matchClass =
    matchTone === "teal"
      ? "bg-brand-mint-300/40 text-brand-navy-950"
      : matchTone === "blue"
        ? "bg-brand-blue-700/10 text-brand-blue-700"
        : "bg-brand-navy-950 text-white";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-surface-soft p-3.5">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-brand-navy-950">{name}</p>
        <p className="truncate text-sm text-brand-slate-600">{company}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${matchClass}`}
      >
        {match}
      </span>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface-soft p-3 text-center">
      <span className="mx-auto flex size-8 items-center justify-center rounded-xl bg-white text-brand-cyan-500">
        {icon}
      </span>
      <p className="mt-2 text-base font-semibold text-brand-navy-950">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand-slate-600/70">
        {label}
      </p>
    </div>
  );
}
