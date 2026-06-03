import {
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  IdCard,
  Link2,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";

const mvpModules = [
  {
    title: "Creacion de eventos",
    description:
      "El organizador define nombre, fecha, lugar, cupos y formulario simple. Al publicar, obtiene un link publico de inscripcion.",
    icon: CalendarPlus,
  },
  {
    title: "Inscripcion de asistentes",
    description:
      "Formulario mobile-first con datos base, intereses seleccionables, consentimiento y opcion de perfil publico para networking.",
    icon: CheckCircle2,
  },
  {
    title: "Perfil del asistente",
    description:
      "Foto opcional, nombre, cargo, organizacion, descripcion breve y hasta cinco intereses visibles por evento.",
    icon: IdCard,
  },
  {
    title: "Directorio del evento",
    description:
      "Lista privada de asistentes que aceptaron networking, con busqueda y filtros por area, organizacion e intereses.",
    icon: Users,
  },
  {
    title: "QR de acceso",
    description:
      "Cada inscripcion genera un token unico para acreditar llegada y separar inscritos, asistentes reales y no show.",
    icon: QrCode,
  },
  {
    title: "Solicitud de conexion",
    description:
      "Boton conectar, solicitud pendiente, aceptacion o rechazo. Sin chat: el intercambio de contacto ocurre al aceptar.",
    icon: Link2,
  },
];

const nextModules = [
  "Match simple por interseccion de intereses",
  "Dashboard basico de inscritos, check-ins y conexiones",
  "Descarga CSV para organizadores",
  "Notificaciones por email transaccional",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <section className="border-b border-[#d9d5cb] bg-[#102923] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-14">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#9bd8b5]">
              Spec-driven MVP
            </p>
            <h1 className="text-4xl font-semibold sm:text-5xl">I&apos;m IN</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#d9efe2]">
              Inscripcion, acreditacion y networking inteligente en una sola
              experiencia web para eventos.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-96">
            <Metric label="Stack" value="Next + Supabase" />
            <Metric label="Deploy" value="Vercel" />
            <Metric label="Formato" value="PWA responsive" />
            <Metric label="Estado" value="Specs v0.1" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px] lg:py-10">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-[#2f6f4e] text-white">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">Debe tener</h2>
              <p className="text-sm text-[#5f625d]">
                Sin estos modulos no hay producto validable.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mvpModules.map((module) => {
              const Icon = module.icon;

              return (
                <article
                  className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm"
                  key={module.title}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-[#eef6e9] text-[#2f6f4e]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="rounded-md bg-[#e3f0d9] px-3 py-1 text-sm font-semibold text-[#2f6f4e]">
                      MVP
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold">{module.title}</h3>
                  <p className="mt-3 leading-7 text-[#4a4d49]">
                    {module.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-[#254f74] text-white">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">Siguiente capa</h2>
          </div>

          <div className="space-y-3">
            {nextModules.map((module) => (
              <div
                className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4"
                key={module}
              >
                <p className="text-sm font-medium leading-6">{module}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md bg-[#102923] p-4 text-white">
            <p className="text-sm font-semibold text-[#9bd8b5]">
              Decision inicial
            </p>
            <p className="mt-2 text-sm leading-6 text-[#d9efe2]">
              Partir como web app responsive/PWA. Login LinkedIn queda como
              mejora evaluada, no bloqueo del MVP.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/8 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9bd8b5]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
