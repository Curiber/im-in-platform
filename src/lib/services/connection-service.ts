// Servicio de conexiones (Fase 5.0, spec 29).
//
// Extraido de las actions/pagina de conexiones para compartir reglas entre la
// web y la API v1. El email de conexion aceptada se envia aqui (lib/email no
// depende de Next); nunca bloquea la aceptacion.

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendConnectionAcceptedEmail } from "@/lib/email";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import type { VerifiedRegistration } from "@/lib/registrations";

export type ConnectionRequestRow = {
  id: string;
  requester_registration_id: string;
  receiver_registration_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
};

export type RegistrationContact = {
  id: string;
  email: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  attendee_profiles: {
    avatar_url: string | null;
    card_visibility: ProfileCardVisibility;
    profile_slug: string | null;
  } | null;
};

export type CreateConnectionResult = "created" | "exists" | "invalid";

export async function createConnectionRequest(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  receiverRegistrationId: string,
): Promise<CreateConnectionResult> {
  if (!receiverRegistrationId || viewer.id === receiverRegistrationId) {
    return "invalid";
  }

  // El receptor debe ser un perfil visible del mismo evento.
  const { data: receiver } = await client
    .from("event_registrations")
    .select("id")
    .eq("id", receiverRegistrationId)
    .eq("event_id", viewer.event_id)
    .eq("public_profile_enabled", true)
    .single<{ id: string }>();

  if (!receiver) {
    return "invalid";
  }

  // Una sola solicitud viva por pareja (en cualquier direccion).
  const { data: existingRequest } = await client
    .from("connection_requests")
    .select("id")
    .eq("event_id", viewer.event_id)
    .in("status", ["pending", "accepted"])
    .or(
      [
        `and(requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${receiver.id})`,
        `and(requester_registration_id.eq.${receiver.id},receiver_registration_id.eq.${viewer.id})`,
      ].join(","),
    )
    .maybeSingle<{ id: string }>();

  if (existingRequest) {
    return "exists";
  }

  await client.from("connection_requests").insert({
    event_id: viewer.event_id,
    requester_registration_id: viewer.id,
    receiver_registration_id: receiver.id,
  });

  return "created";
}

export type RespondConnectionResult = "ok" | "not_found";

export async function respondToConnectionRequest(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
  requestId: string,
  status: "accepted" | "rejected",
): Promise<RespondConnectionResult> {
  const { data: request } = await client
    .from("connection_requests")
    .select(
      "id, event_id, requester_registration_id, receiver_registration_id, status",
    )
    .eq("id", requestId)
    .eq("receiver_registration_id", viewer.id)
    .single<ConnectionRequestRow & { event_id: string }>();

  if (!request || request.status !== "pending") {
    return "not_found";
  }

  await client
    .from("connection_requests")
    .update({
      responded_at: new Date().toISOString(),
      status,
    })
    .eq("id", request.id);

  if (status === "accepted") {
    await notifyAcceptedConnection(client, {
      eventName: viewer.events?.name ?? "evento",
      receiverId: request.receiver_registration_id,
      requesterId: request.requester_registration_id,
    });
  }

  return "ok";
}

export async function listConnections(
  client: SupabaseClient,
  viewer: VerifiedRegistration,
): Promise<{
  received: ConnectionRequestRow[];
  sent: ConnectionRequestRow[];
  contacts: Map<string, RegistrationContact>;
}> {
  const [{ data: received }, { data: sent }] = await Promise.all([
    client
      .from("connection_requests")
      .select(
        "id, requester_registration_id, receiver_registration_id, status, created_at",
      )
      .eq("event_id", viewer.event_id)
      .eq("receiver_registration_id", viewer.id)
      .order("created_at", { ascending: false })
      .returns<ConnectionRequestRow[]>(),
    client
      .from("connection_requests")
      .select(
        "id, requester_registration_id, receiver_registration_id, status, created_at",
      )
      .eq("event_id", viewer.event_id)
      .eq("requester_registration_id", viewer.id)
      .order("created_at", { ascending: false })
      .returns<ConnectionRequestRow[]>(),
  ]);

  const contacts = await loadRegistrationContacts(client, [
    ...(received ?? []).map((request) => request.requester_registration_id),
    ...(sent ?? []).map((request) => request.receiver_registration_id),
  ]);

  return { received: received ?? [], sent: sent ?? [], contacts };
}

export async function loadRegistrationContacts(
  client: SupabaseClient,
  ids: string[],
): Promise<Map<string, RegistrationContact>> {
  const uniqueIds = Array.from(new Set(ids));
  const contacts = new Map<string, RegistrationContact>();

  if (!uniqueIds.length) {
    return contacts;
  }

  const { data } = await client
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, role_snapshot, company_snapshot, attendee_profiles(avatar_url, card_visibility, profile_slug)",
    )
    .in("id", uniqueIds)
    .returns<RegistrationContact[]>();

  data?.forEach((contact) => contacts.set(contact.id, contact));

  return contacts;
}

async function notifyAcceptedConnection(
  client: SupabaseClient,
  {
    eventName,
    receiverId,
    requesterId,
  }: {
    eventName: string;
    receiverId: string;
    requesterId: string;
  },
) {
  const { data: contacts } = await client
    .from("event_registrations")
    .select("id, email, full_name_snapshot")
    .in("id", [requesterId, receiverId])
    .returns<Pick<RegistrationContact, "id" | "email" | "full_name_snapshot">[]>();

  const requester = contacts?.find((contact) => contact.id === requesterId);
  const receiver = contacts?.find((contact) => contact.id === receiverId);

  if (!requester || !receiver) {
    return;
  }

  try {
    await sendConnectionAcceptedEmail({
      eventName,
      receiverEmail: receiver.email,
      receiverName: receiver.full_name_snapshot,
      requesterEmail: requester.email,
      requesterName: requester.full_name_snapshot,
    });
  } catch {
    // El email no bloquea la conexion aceptada.
  }
}
