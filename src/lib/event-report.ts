import type { SupabaseClient } from "@supabase/supabase-js";

// Capa de agregacion compartida por la pagina de reporte (imprimible) y la
// descarga de resumen CSV. Reutiliza las mismas fuentes que el dashboard
// (inscripciones, conexiones, reuniones) y la RPC agregada de vistas de perfil.

export type RankRow = { label: string; value: number };

export type EventReport = {
  event: {
    id: string;
    name: string;
    starts_at: string;
    location: string | null;
    capacity: number;
  };
  attendance: {
    registered: number;
    checkedIn: number;
    attendanceRate: number;
  };
  networking: {
    optIn: number;
    optInRate: number;
    publicProfiles: number;
    connectionsTotal: number;
    connectionsAccepted: number;
    acceptanceRate: number;
    profileViews: number;
    uniqueViewers: number;
  };
  meetings: {
    total: number;
    byStatus: Record<string, number>;
  };
  topInterests: RankRow[];
  topAreas: RankRow[];
  topViewed: RankRow[];
};

type RegistrationRow = {
  status: string;
  public_profile_enabled: boolean;
  networking_opt_in: boolean;
  industry_snapshot: string | null;
  interests: string[];
};

type ProfileViewStats = {
  total_views: number;
  unique_viewers: number;
  top_viewed: { name: string; views: number }[];
};

const MEETING_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
  "completed",
] as const;

export async function getEventReport(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventReport | null> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, starts_at, location, capacity")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<EventReport["event"]>();

  // PGRST116 = no rows (evento inexistente/eliminado) -> notFound. Cualquier otro
  // error es una falla real: no se degrada en un reporte vacio.
  if (eventError && eventError.code !== "PGRST116") {
    throw new Error(`No se pudo cargar el evento: ${eventError.message}`);
  }

  if (!event) {
    return null;
  }

  const [registrationsRes, connectionsRes, meetingsRes, viewStatsRes] =
    await Promise.all([
    supabase
      .from("event_registrations")
      .select(
        "status, public_profile_enabled, networking_opt_in, industry_snapshot, interests",
      )
      .eq("event_id", event.id)
      .returns<RegistrationRow[]>(),
    supabase
      .from("connection_requests")
      .select("status")
      .eq("event_id", event.id)
      .returns<{ status: string }[]>(),
    supabase
      .from("meetings")
      .select("status")
      .eq("event_id", event.id)
      .returns<{ status: string }[]>(),
    supabase.rpc("event_profile_view_stats", { p_event_id: event.id }),
  ]);

  // Un error en cualquiera de las fuentes NO se degrada en ceros: el reporte
  // (PDF/CSV) presentaria datos falsos como validos. Se falla explicitamente.
  if (
    registrationsRes.error ||
    connectionsRes.error ||
    meetingsRes.error ||
    viewStatsRes.error
  ) {
    throw new Error("No se pudieron cargar los datos del reporte.");
  }

  const registrations = registrationsRes.data;
  const connections = connectionsRes.data;
  const meetings = meetingsRes.data;

  const viewStats: ProfileViewStats = (viewStatsRes.data as
    | ProfileViewStats[]
    | null)?.[0] ?? {
    total_views: 0,
    unique_viewers: 0,
    top_viewed: [],
  };

  // Activas = confirmadas (verificadas y, si el evento lo exige, aprobadas).
  const active = (registrations ?? []).filter(
    (r) => r.status === "registered" || r.status === "checked_in",
  );
  const checkedIn = active.filter((r) => r.status === "checked_in");
  const publicProfiles = active.filter((r) => r.public_profile_enabled);
  const optIn = active.filter((r) => r.networking_opt_in);

  const connectionsTotal = (connections ?? []).length;
  const connectionsAccepted = (connections ?? []).filter(
    (c) => c.status === "accepted",
  ).length;

  const meetingsByStatus: Record<string, number> = Object.fromEntries(
    MEETING_STATUSES.map((status) => [status, 0]),
  );
  for (const meeting of meetings ?? []) {
    meetingsByStatus[meeting.status] =
      (meetingsByStatus[meeting.status] ?? 0) + 1;
  }

  return {
    event,
    attendance: {
      registered: active.length,
      checkedIn: checkedIn.length,
      attendanceRate: rate(checkedIn.length, active.length),
    },
    networking: {
      optIn: optIn.length,
      optInRate: rate(optIn.length, active.length),
      publicProfiles: publicProfiles.length,
      connectionsTotal,
      connectionsAccepted,
      acceptanceRate: rate(connectionsAccepted, connectionsTotal),
      profileViews: viewStats.total_views,
      uniqueViewers: viewStats.unique_viewers,
    },
    meetings: {
      total: (meetings ?? []).length,
      byStatus: meetingsByStatus,
    },
    topInterests: rank(active.flatMap((r) => r.interests)),
    topAreas: rank(active.map((r) => r.industry_snapshot ?? "No informado")),
    topViewed: viewStats.top_viewed.map((item) => ({
      label: item.name,
      value: item.views,
    })),
  };
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function rank(values: string[]): RankRow[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 10);
}
