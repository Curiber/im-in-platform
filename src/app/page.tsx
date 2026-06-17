import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Handshake,
  Network,
  PlayCircle,
  QrCode,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const UNSPLASH = "https://images.unsplash.com";

const photos = {
  hero: `${UNSPLASH}/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1920&q=80`,
  matchmaking: `${UNSPLASH}/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80`,
  operations: `${UNSPLASH}/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80`,
  community: `${UNSPLASH}/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=80`,
};

const awards = [
  { icon: Award, label: "Setup mas simple" },
  { icon: Star, label: "Los usuarios nos aman" },
  { icon: ThumbsUp, label: "Facil de usar" },
];

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

const matchmakingPoints = [
  "Recomendaciones por objetivos e intereses, no por azar.",
  "Reuniones 1:1 con hora y punto de encuentro.",
  "Conexiones con consentimiento: el contacto se comparte al aceptar.",
];

const operationPoints = [
  "Inscripcion publica con tu propio link.",
  "Acreditacion en segundos escaneando el QR.",
  "Metricas de asistencia y networking en vivo.",
];

const partners = ["Universidades", "Fundaciones", "Comunidades", "Productoras"];

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <section className="relative isolate flex min-h-[680px] flex-col overflow-hidden lg:min-h-[760px]">
        <Image
          alt="Profesionales conectando en un evento"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={photos.hero}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy-950/95 via-brand-navy-950/85 to-brand-navy-950/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-950/80 via-transparent to-brand-navy-950/40" />

        <div className="relative z-10 flex flex-1 flex-col">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
            <Link className="inline-flex items-center" href="/">
              <Image
                alt="I'M IN"
                className="h-auto w-36"
                height={45}
                priority
                src="/brand/im-in-logo-white.png"
                width={180}
              />
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <a
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white md:inline-flex"
                href="#producto"
              >
                Producto
              </a>
              <a
                className="hidden rounded-md px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white md:inline-flex"
                href="#como-funciona"
              >
                Como funciona
              </a>
              <Link
                className="rounded-md px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white"
                href="/login"
              >
                Ingresar
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-gradient-accent px-4 text-sm font-semibold text-brand-navy-950 shadow-lg transition hover:-translate-y-0.5"
                href="/demo"
              >
                Agenda una demo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </nav>
          </header>

          <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-16 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-mint-300">
                Plataforma de networking para eventos
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-7xl">
                Eventos que generan conexiones reales.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
                Conecta a las personas correctas con networking por intencion,
                acreditacion QR y metricas que tus sponsors valoran. Todo en una
                experiencia.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient-accent px-6 text-sm font-semibold text-brand-navy-950 shadow-xl transition hover:-translate-y-0.5"
                  href="/demo"
                >
                  Agenda una demo
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                  href="#producto"
                >
                  <PlayCircle className="size-4" aria-hidden="true" />
                  Ver como funciona
                </a>
              </div>
              <div className="mt-9 flex items-center gap-4">
                <div className="flex">
                  <span className="size-9 rounded-full border-2 border-brand-navy-950 bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400" />
                  <span className="-ml-2.5 size-9 rounded-full border-2 border-brand-navy-950 bg-gradient-to-br from-brand-aqua-400 to-brand-mint-300" />
                  <span className="-ml-2.5 size-9 rounded-full border-2 border-brand-navy-950 bg-gradient-to-br from-brand-navy-950 to-brand-cyan-500" />
                </div>
                <p className="text-sm font-medium text-white/75">
                  +10.000 conexiones en eventos reales
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-brand-navy-950/30 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 sm:px-8">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Reconocido por
              </span>
              {awards.map((award) => {
                const Icon = award.icon;

                return (
                  <span
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
                    key={award.label}
                  >
                    <Icon className="size-4 text-brand-mint-300" aria-hidden="true" />
                    {award.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-brand-border/50 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-7 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-slate-600/70">
            Pensado para
          </span>
          {partners.map((partner) => (
            <span className="text-base font-semibold text-brand-slate-600/80" key={partner}>
              {partner}
            </span>
          ))}
        </div>
      </section>

      <section className="scroll-mt-20 bg-white" id="producto">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              Matchmaking por intencion
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy-950">
              No es azar. Es la persona correcta.
            </h2>
            <p className="mt-5 text-lg leading-8 text-brand-slate-600">
              Cruzamos lo que cada persona busca con lo que ofrece, para que cada
              reunion tenga sentido y cada conexion valga la pena.
            </p>
            <ul className="mt-8 space-y-4">
              {matchmakingPoints.map((point) => (
                <li className="flex items-start gap-3" key={point}>
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-mint-300/40 text-brand-navy-950">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                  </span>
                  <span className="leading-7 text-brand-slate-600">{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -right-6 -top-6 size-40 rounded-full bg-brand-aqua-400/20 blur-3xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-brand-border shadow-2xl shadow-brand-blue-700/20">
              <Image
                alt="Dos profesionales conversando en un evento"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                src={photos.matchmaking}
              />
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-sm font-semibold text-white">
                  MT
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-navy-950">
                    92% de afinidad
                  </p>
                  <p className="text-xs text-brand-slate-600">3 intereses en comun</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-surface-soft">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-6 -bottom-6 size-40 rounded-full bg-brand-blue-700/15 blur-3xl" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-brand-border shadow-2xl shadow-brand-blue-700/20">
              <Image
                alt="Asistentes en un evento profesional"
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                src={photos.operations}
              />
              <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-2">
                <MiniMetric icon={<Users className="size-4" />} label="Asisten" value="128" />
                <MiniMetric icon={<QrCode className="size-4" />} label="Check-in" value="94" />
                <MiniMetric icon={<Network className="size-4" />} label="Conexiones" value="37" />
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              <TrendingUp className="size-4" aria-hidden="true" />
              Operacion sin friccion
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-navy-950">
              Del registro a las metricas, en orden.
            </h2>
            <p className="mt-5 text-lg leading-8 text-brand-slate-600">
              I&apos;M IN une inscripcion, acreditacion y networking para que tu
              equipo opere el evento con datos claros y los sponsors vean retorno.
            </p>
            <ul className="mt-8 space-y-4">
              {operationPoints.map((point) => (
                <li className="flex items-start gap-3" key={point}>
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-mint-300/40 text-brand-navy-950">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                  </span>
                  <span className="leading-7 text-brand-slate-600">{point}</span>
                </li>
              ))}
            </ul>
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

      <section className="relative isolate overflow-hidden">
        <Image
          alt="Comunidad profesional en un evento"
          className="object-cover"
          fill
          sizes="100vw"
          src={photos.community}
        />
        <div className="absolute inset-0 bg-brand-navy-950/85" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 text-center sm:px-8">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
            <Sparkles className="size-4" aria-hidden="true" />
            Comunidad
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white">
            El networking no termina cuando termina el evento.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/80">
            Los asistentes conservan su perfil, sus contactos y su tarjeta
            virtual entre eventos. Tu comunidad sigue conectada.
          </p>
          <Link
            className="mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient-accent px-6 text-sm font-semibold text-brand-navy-950 shadow-xl transition hover:-translate-y-0.5"
            href="/demo"
          >
            Agenda una demo
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
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
            <a className="text-white/80 transition hover:text-white" href="#producto">
              Producto
            </a>
            <a className="text-white/80 transition hover:text-white" href="#como-funciona">
              Como funciona
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
    <div className="rounded-xl bg-white/95 p-2.5 text-center shadow-md backdrop-blur">
      <span className="mx-auto flex size-7 items-center justify-center rounded-lg bg-brand-surface-soft text-brand-cyan-500">
        {icon}
      </span>
      <p className="mt-1.5 text-sm font-semibold text-brand-navy-950">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-brand-slate-600/70">
        {label}
      </p>
    </div>
  );
}
