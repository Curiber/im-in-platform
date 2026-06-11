import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Handshake,
  Network,
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
      "Completa tus datos profesionales, intereses y una foto reconocible para llegar preparado.",
    icon: BadgeCheck,
  },
  {
    title: "Encuentra eventos",
    description:
      "Inscribete, recibe tu QR y entra al directorio privado de asistentes del evento.",
    icon: CalendarDays,
  },
  {
    title: "Conecta mejor",
    description:
      "Descubre personas relevantes, pide conectar y conserva el vinculo despues del encuentro.",
    icon: Handshake,
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

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="border-b border-brand-border/70 bg-white/90">
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
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 hover:text-brand-navy-950"
              href="/login"
            >
              Ingresar
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
              href="/admin/events/new"
            >
              Crear evento
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="overflow-hidden border-b border-brand-border/70 bg-brand-gradient-soft">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_460px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              Networking inteligente para eventos
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight text-brand-navy-950 sm:text-6xl">
              I&apos;M IN
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-slate-600">
              Una plataforma para que profesionales descubran eventos, conecten
              con personas relevantes y generen oportunidades reales de
              networking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white hover:bg-brand-navy-900"
                href="/login"
              >
                Explorar plataforma
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                className="inline-flex h-12 items-center rounded-md border border-brand-border bg-white px-5 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
                href="/admin/events/new"
              >
                Crear evento
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-brand-aqua-400/20 blur-3xl" />
            <div className="absolute -right-8 bottom-10 h-32 w-32 rounded-full bg-brand-blue-700/20 blur-3xl" />
            <div className="relative rounded-lg border border-brand-border bg-white p-5 shadow-xl shadow-brand-blue-700/10">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-navy-950">
                  Directorio del evento
                </p>
                <span className="rounded-md bg-brand-gradient-accent px-3 py-1 text-xs font-semibold text-brand-navy-950">
                  En vivo
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <ProfileCard
                  company="UAI"
                  name="Marcela Tapia"
                  tags={["Liderazgo", "Impacto"]}
                />
                <ProfileCard
                  company="Founder"
                  name="Javier Munoz"
                  tags={["Datos", "Innovacion"]}
                />
                <ProfileCard
                  company="Comunidad"
                  name="Sofia Herrera"
                  tags={["Marketing", "Talento"]}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric icon={<Users className="size-4" />} value="128" />
                <MiniMetric icon={<QrCode className="size-4" />} value="94" />
                <MiniMetric icon={<Network className="size-4" />} value="37" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Como funciona
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-brand-navy-950">
            Una experiencia simple para llegar, encontrarse y continuar.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                className="rounded-lg border border-brand-border bg-white p-5 shadow-sm"
                key={step.title}
              >
                <span className="flex size-11 items-center justify-center rounded-md bg-brand-gradient-accent text-brand-navy-950">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-brand-navy-950">
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

      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
              <Sparkles className="size-4" aria-hidden="true" />
              Beneficios
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-brand-navy-950">
              Menos azar, mas conexiones con sentido.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  className="rounded-lg border border-brand-border bg-brand-surface-soft p-4"
                  key={benefit}
                >
                  <p className="leading-7 text-brand-slate-600">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg bg-brand-navy-950 p-6 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              Casos de uso
            </p>
            <div className="mt-5 space-y-4">
              {audiences.map((audience) => (
                <p className="rounded-md bg-white/10 p-4 leading-7" key={audience}>
                  {audience}
                </p>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="rounded-lg bg-brand-gradient-primary px-6 py-10 text-white sm:px-10">
          <h2 className="max-w-3xl text-3xl font-semibold">
            Activa networking real en tu proximo evento.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-white/85">
            Crea el evento, comparte el link de inscripcion y deja que I&apos;M
            IN conecte a las personas correctas.
          </p>
          <Link
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
            href="/admin/events/new"
          >
            Crear evento
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProfileCard({
  company,
  name,
  tags,
}: {
  company: string;
  name: string;
  tags: string[];
}) {
  return (
    <div className="rounded-md border border-brand-border bg-brand-surface-soft p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-brand-navy-950 text-sm font-semibold text-white">
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <div>
          <p className="font-semibold text-brand-navy-950">{name}</p>
          <p className="text-sm text-brand-slate-600">{company}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-blue-700"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="rounded-md border border-brand-border bg-brand-surface-soft p-3 text-center">
      <span className="mx-auto flex size-8 items-center justify-center rounded-md bg-white text-brand-cyan-500">
        {icon}
      </span>
      <p className="mt-2 text-sm font-semibold text-brand-navy-950">{value}</p>
    </div>
  );
}
