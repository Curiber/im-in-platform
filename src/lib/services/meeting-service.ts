// Servicio de reuniones 1:1 (Fase 5.0, spec 29).
//
// Envuelve las RPCs security definer del spec 27 (la validacion autoritativa
// vive alla, bajo el lock del evento) y las lecturas de agenda, para que web
// y API v1 compartan el mismo contrato.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  filterUpcomingSlots,
  generateMeetingSlots,
  MEETING_SLOT_MINUTES,
  type MeetingSlot,
} from "@/lib/meeting-slots";
import type { VerifiedRegistration } from "@/lib/registrations";

export type MeetingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type MeetingRow = {
  id: string;
  requester_registration_id: string;
  receiver_registration_id: string;
  location_id: string | null;
  status: MeetingStatus;
  starts_at: string;
  ends_at: string;
  message: string | null;
};

export type MeetingLocation = { id: string; name: string };

// result_status de las RPCs, mas 'error' (fallo de transporte/DB).
export type MeetingActionStatus =
  | "ok"
  | "unavailable"
  | "invalid_participant"
  | "invalid_slot"
  | "invalid_location"
  | "conflict"
  | "expired"
  | "not_found"
  | "error";

export async function proposeMeeting(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  {
    locationId,
    message,
    startsAt,
  }: {
    locationId: string | null;
    message: string | null;
    startsAt: Date;
  },
  receiverRegistrationId: string,
): Promise<MeetingActionStatus> {
  // La franja del caller solo trae el inicio; el termino es inicio + 30 min
  // (franjas fijas de v1). La RPC valida que sea una franja legitima.
  const endsAt = new Date(startsAt.getTime() + MEETING_SLOT_MINUTES * 60 * 1000);

  const { data, error } = await client.rpc("propose_meeting", {
    p_event_id: viewer.event_id,
    p_requester_registration_id: viewer.id,
    p_receiver_registration_id: receiverRegistrationId,
    p_location_id: locationId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_message: message,
  });

  return toActionStatus(error, data);
}

export async function respondMeeting(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  meetingId: string,
  accept: boolean,
): Promise<MeetingActionStatus> {
  const { data, error } = await client.rpc("respond_meeting", {
    p_meeting_id: meetingId,
    p_registration_id: viewer.id,
    p_accept: accept,
  });

  return toActionStatus(error, data);
}

export async function cancelMeeting(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  meetingId: string,
): Promise<MeetingActionStatus> {
  const { data, error } = await client.rpc("cancel_meeting", {
    p_meeting_id: meetingId,
    p_registration_id: viewer.id,
  });

  return toActionStatus(error, data);
}

// Reuniones del viewer (como requester o receiver), ordenadas por hora.
export async function listMeetings(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
): Promise<MeetingRow[]> {
  const { data } = await client
    .from("meetings")
    .select(
      "id, requester_registration_id, receiver_registration_id, location_id, status, starts_at, ends_at, message",
    )
    .eq("event_id", viewer.event_id)
    .or(
      `requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${viewer.id}`,
    )
    .order("starts_at", { ascending: true })
    .returns<MeetingRow[]>();

  return data ?? [];
}

export async function loadMeetingLocations(
  client: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids));
  const locations = new Map<string, string>();

  if (!uniqueIds.length) {
    return locations;
  }

  const { data } = await client
    .from("meeting_locations")
    .select("id, name")
    .in("id", uniqueIds)
    .returns<MeetingLocation[]>();

  data?.forEach((location) => locations.set(location.id, location.name));

  return locations;
}

// Opciones para proponer: franjas futuras + puntos de encuentro activos.
export async function getMeetingProposalOptions(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  now: Date = new Date(),
): Promise<{ slots: MeetingSlot[]; locations: MeetingLocation[] }> {
  if (!viewer.events) {
    return { slots: [], locations: [] };
  }

  const slots = filterUpcomingSlots(
    generateMeetingSlots({
      eventStartsAt: viewer.events.starts_at,
      eventEndsAt: viewer.events.ends_at,
    }),
    now,
  );

  if (!slots.length) {
    return { slots: [], locations: [] };
  }

  const { data: locations } = await client
    .from("meeting_locations")
    .select("id, name")
    .eq("event_id", viewer.event_id)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .returns<MeetingLocation[]>();

  return { slots, locations: locations ?? [] };
}

export async function countPendingMeetings(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
): Promise<number> {
  const { count } = await client
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", viewer.event_id)
    .eq("receiver_registration_id", viewer.id)
    .eq("status", "pending");

  return count ?? 0;
}

function toActionStatus(
  error: { message: string } | null,
  data: unknown,
): MeetingActionStatus {
  if (error) {
    return "error";
  }

  const status = (data as { result_status?: string }[] | null)?.[0]
    ?.result_status;

  const known: MeetingActionStatus[] = [
    "ok",
    "unavailable",
    "invalid_participant",
    "invalid_slot",
    "invalid_location",
    "conflict",
    "expired",
    "not_found",
  ];

  return known.includes(status as MeetingActionStatus)
    ? (status as MeetingActionStatus)
    : "error";
}
