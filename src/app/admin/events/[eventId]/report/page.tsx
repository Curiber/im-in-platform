import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/app/admin/events/[eventId]/report/_components/print-button";
import {
  type EventReport,
  formatReportDateTime,
  getEventReport,
} from "@/lib/event-report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const meetingStatusLabels: Record<string, string> = {
  pending: "Pendientes",
  accepted: "Aceptadas",
  declined: "Rechazadas",
  cancelled: "Canceladas",
  completed: "Completadas",
};

export default async function EventReportPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const report = await getEventReport(supabase, eventId);

  if (!report) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-brand-surface-soft py-8 text-brand-slate-900 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        {/* Controles (solo pantalla) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-slate-600 transition hover:text-brand-navy-950"
            href={`/admin/events/${report.event.id}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {report.event.name}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              href={`/admin/events/${report.event.id}/report/download`}
            >
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Descargar resumen (CSV)
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* Documento */}
        <article className="rounded-2xl border border-brand-border bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <header className="border-b border-brand-border pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Reporte post-evento
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-brand-navy-950">
              {report.event.name}
            </h1>
            <p className="mt-2 text-sm text-brand-slate-600">
              {formatReportDateTime(report.event.starts_at)}
              {report.event.location ? ` · ${report.event.location}` : ""}
            </p>
          </header>

          <Section title="Asistencia">
            <Stat label="Inscritos confirmados" value={report.attendance.registered} />
            <Stat label="Acreditados" value={report.attendance.checkedIn} />
            <Stat
              label="Tasa de asistencia"
              value={`${report.attendance.attendanceRate}%`}
            />
            <Stat label="Cupos" value={report.event.capacity} />
          </Section>

          <Section title="Networking">
            <Stat
              label="Opt-in networking"
              value={`${report.networking.optIn} (${report.networking.optInRate}%)`}
            />
            <Stat label="Perfiles publicos" value={report.networking.publicProfiles} />
            <Stat
              label="Solicitudes de conexion"
              value={report.networking.connectionsTotal}
            />
            <Stat
              label="Conexiones aceptadas"
              value={`${report.networking.connectionsAccepted} (${report.networking.acceptanceRate}%)`}
            />
            <Stat label="Perfiles vistos" value={report.networking.profileViews} />
            <Stat label="Visitantes unicos" value={report.networking.uniqueViewers} />
          </Section>

          <Section title="Reuniones">
            <Stat label="Total" value={report.meetings.total} />
            {Object.entries(report.meetings.byStatus).map(([status, count]) => (
              <Stat
                key={status}
                label={meetingStatusLabels[status] ?? status}
                value={count}
              />
            ))}
          </Section>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            <RankingTable title="Intereses mas frecuentes" rows={report.topInterests} />
            <RankingTable title="Distribucion por area" rows={report.topAreas} />
            {report.topViewed.length ? (
              <RankingTable
                title="Perfiles mas vistos"
                rows={report.topViewed}
              />
            ) : null}
          </div>

          <footer className="mt-8 border-t border-brand-border pt-4 text-xs text-brand-slate-600">
            Generado el {formatReportDateTime(new Date().toISOString())} ·
            I&apos;m IN
          </footer>
        </article>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-slate-600">
        {title}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-brand-border/60 bg-brand-surface-soft p-3 print:bg-white">
      <dt className="text-xs text-brand-slate-600">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-brand-navy-950">{value}</dd>
    </div>
  );
}

function RankingTable({ title, rows }: { title: string; rows: EventReport["topInterests"] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-navy-950">{title}</h3>
      <div className="mt-2 space-y-1.5">
        {rows.length ? (
          rows.map((row) => (
            <div
              className="flex items-center justify-between rounded-md bg-brand-surface-soft px-3 py-1.5 text-sm print:bg-white print:px-0"
              key={row.label}
            >
              <span>{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-brand-slate-600">Sin datos.</p>
        )}
      </div>
    </div>
  );
}

