// Reuniones 1:1 del asistente a traves de todos sus eventos (spec 37: red
// persistente). Agrega las reuniones relevantes (solicitadas, confirmadas y
// realizadas) de todas las inscripciones del usuario, con el perfil vivo de la
// contraparte y el contexto del evento.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  other: {
    fullName: string;
    role: string | null;
    company: string | null;
    avatarUrl: string | null;
  };
};

type MeetingRow = {
  id: string;
  status: MyMeetingStatus;
  starts_at: string;
  ends_at: string;
  location_id: string | null;
  requester_registration_id: string;
  receiver_registration_id: string;
  events: { name: string; slug: string; deleted_at: string | null } | null;
};

type OtherRegistration = {
  id: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  attendee_profiles: {
    full_name: string | null;
    role: string | null;
    company: string | null;
    avatar_url: string | null;
  } | null;
};

const RELEVANT_STATUSES: MyMeetingStatus[] = ["pending", "accepted", "completed"];

export async function getMyMeetings(userId: string): Promise<MyMeeting[]> {
  // Inscripciones propias por sesion (RLS); el resto queda acotado a ellas.
  const server = await createSupabaseServerClient();
  const { data: myRegs } = await server
    .from("event_registrations")
    .select("id")
    .eq("user_id", userId)
    .returns<{ id: string }[]>();

  const myRegIds = (myRegs ?? []).map((registration) => registration.id);
  if (!myRegIds.length) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const idList = myRegIds.join(",");
  const { data: meetings } = await admin
    .from("meetings")
    .select(
      "id, status, starts_at, ends_at, location_id, requester_registration_id, receiver_registration_id, events(name, slug, deleted_at)",
    )
    .in("status", RELEVANT_STATUSES)
    .or(
      `requester_registration_id.in.(${idList}),receiver_registration_id.in.(${idList})`,
    )
    .order("starts_at", { ascending: true })
    .returns<MeetingRow[]>();

  if (!meetings?.length) {
    return [];
  }

  const mine = new Set(myRegIds);
  const otherIds = meetings.map((meeting) =>
    mine.has(meeting.requester_registration_id)
      ? meeting.receiver_registration_id
      : meeting.requester_registration_id,
  );
  const locationIds = meetings
    .map((meeting) => meeting.location_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: others }, { data: locations }] = await Promise.all([
    admin
      .from("event_registrations")
      .select(
        "id, full_name_snapshot, role_snapshot, company_snapshot, attendee_profiles(full_name, role, company, avatar_url)",
      )
      .in("id", Array.from(new Set(otherIds)))
      .returns<OtherRegistration[]>(),
    locationIds.length
      ? admin
          .from("meeting_locations")
          .select("id, name")
          .in("id", Array.from(new Set(locationIds)))
          .returns<{ id: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const otherById = new Map<string, OtherRegistration>();
  others?.forEach((registration) => otherById.set(registration.id, registration));
  const locationById = new Map<string, string>();
  locations?.forEach((location) => locationById.set(location.id, location.name));

  const result: MyMeeting[] = [];

  for (let index = 0; index < meetings.length; index += 1) {
    const meeting = meetings[index];
    if (meeting.events?.deleted_at) {
      continue;
    }

    const other = otherById.get(otherIds[index]);
    const profile = other?.attendee_profiles;

    result.push({
      id: meeting.id,
      status: meeting.status,
      startsAt: meeting.starts_at,
      endsAt: meeting.ends_at,
      locationName: meeting.location_id
        ? (locationById.get(meeting.location_id) ?? null)
        : null,
      eventName: meeting.events?.name ?? "Evento",
      eventSlug: meeting.events?.slug ?? "",
      other: {
        fullName: profile?.full_name ?? other?.full_name_snapshot ?? "Asistente",
        role: profile?.role ?? other?.role_snapshot ?? null,
        company: profile?.company ?? other?.company_snapshot ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    });
  }

  return result;
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
