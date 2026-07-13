// Reuniones 1:1 del asistente a traves de todos sus eventos (spec 37: red
// persistente). Lee por sesion via el RPC SECURITY DEFINER get_my_meetings
// (acotado a auth.uid() y a las partes involucradas): NO usa service_role.
// Agrega las reuniones relevantes (solicitadas, confirmadas y realizadas) con
// el perfil vivo de la contraparte y el contexto del evento.

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MyMeetingStatus = "pending" | "accepted" | "completed";

export type MyMeeting = {
  id: string;
  status: MyMeetingStatus;
  startsAt: string;
  endsAt: string;
  locationName: string | null;
  eventName: string;
  eventSlug: string;
  isIncoming: boolean;
  other: {
    fullName: string;
    role: string | null;
    company: string | null;
    avatarUrl: string | null;
  };
};

type MeetingRow = {
  meeting_id: string;
  status: MyMeetingStatus;
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  event_name: string;
  event_slug: string;
  other_full_name: string | null;
  other_role: string | null;
  other_company: string | null;
  other_avatar_url: string | null;
  is_incoming: boolean;
};

export async function getMyMeetings(): Promise<MyMeeting[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_my_meetings");

  if (error) {
    console.error("No se pudieron cargar las reuniones", error);
    return [];
  }

  const rows = (data as MeetingRow[] | null) ?? [];

  return rows.map((row) => ({
    id: row.meeting_id,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name,
    eventName: row.event_name,
    eventSlug: row.event_slug,
    isIncoming: row.is_incoming,
    other: {
      fullName: row.other_full_name ?? "Asistente",
      role: row.other_role,
      company: row.other_company,
      avatarUrl: row.other_avatar_url,
    },
  }));
}

// Particiona por fecha fuera del render (regla de pureza): proximas vs pasadas
// segun el inicio de la reunion.
export function splitMeetingsByDate(meetings: MyMeeting[]) {
  const now = Date.now();
  const upcoming = meetings.filter(
    (meeting) => new Date(meeting.startsAt).getTime() >= now,
  );
  const past = meetings.filter(
    (meeting) => new Date(meeting.startsAt).getTime() < now,
  );

  return { upcoming, past };
}
