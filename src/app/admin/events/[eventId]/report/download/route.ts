import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { escapeCsvValue } from "@/lib/csv";
import { type EventReport, getEventReport } from "@/lib/event-report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Resumen post-evento como CSV (metricas agregadas + rankings), complemento del
// CSV de inscritos crudo (/export). Reutiliza la misma capa de agregacion que la
// pagina de reporte.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

  const csv = toSummaryCsv(report);
  const filename = `${slugify(report.event.name) || "evento"}-resumen`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function toSummaryCsv(report: EventReport) {
  const rows: [string, string, string | number][] = [
    ["Evento", "Nombre", report.event.name],
    ["Evento", "Fecha", report.event.starts_at],
    ["Evento", "Lugar", report.event.location ?? ""],
    ["Evento", "Cupos", report.event.capacity],
    ["Asistencia", "Inscritos confirmados", report.attendance.registered],
    ["Asistencia", "Acreditados", report.attendance.checkedIn],
    ["Asistencia", "Tasa de asistencia %", report.attendance.attendanceRate],
    ["Networking", "Opt-in", report.networking.optIn],
    ["Networking", "Opt-in %", report.networking.optInRate],
    ["Networking", "Perfiles publicos", report.networking.publicProfiles],
    ["Networking", "Solicitudes de conexion", report.networking.connectionsTotal],
    ["Networking", "Conexiones aceptadas", report.networking.connectionsAccepted],
    ["Networking", "Aceptacion %", report.networking.acceptanceRate],
    ["Networking", "Perfiles vistos", report.networking.profileViews],
    ["Networking", "Visitantes unicos", report.networking.uniqueViewers],
    ["Reuniones", "Total", report.meetings.total],
    ...Object.entries(report.meetings.byStatus).map(
      ([status, count]) => ["Reuniones", status, count] as [string, string, number],
    ),
    ...report.topInterests.map(
      (row) => ["Interes", row.label, row.value] as [string, string, number],
    ),
    ...report.topAreas.map(
      (row) => ["Area", row.label, row.value] as [string, string, number],
    ),
    ...report.topViewed.map(
      (row) =>
        ["Perfil mas visto", row.label, row.value] as [string, string, number],
    ),
  ];

  return [
    ["seccion", "metrica", "valor"].join(","),
    ...rows.map((row) =>
      row.map((value) => escapeCsvValue(String(value))).join(","),
    ),
  ].join("\n");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
