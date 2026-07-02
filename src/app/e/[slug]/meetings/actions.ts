"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { MEETING_SLOT_MINUTES } from "@/lib/meeting-slots";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Las escrituras de `meetings` pasan SOLO por las RPCs security definer
// (propose/respond/cancel), que validan bajo el lock del evento (solapes,
// capacidad, participantes). Aqui solo se autentica el token de inscripcion y
// se traduce el resultado a mensajes para la UI.

const proposeSchema = z.object({
  slug: z.string().min(1),
  registrationId: z.string().uuid(),
  token: z.string().min(16),
  receiverRegistrationId: z.string().uuid(),
  startsAt: z.string().datetime(),
  locationId: z.string().uuid().nullable(),
  message: z.string().trim().max(280).optional(),
});

export async function proposeMeeting(formData: FormData) {
  const parsed = proposeSchema.safeParse({
    slug: formData.get("slug"),
    registrationId: formData.get("registrationId"),
    token: formData.get("token"),
    receiverRegistrationId: formData.get("receiverRegistrationId"),
    startsAt: formData.get("startsAt"),
    locationId: emptyToNull(formData.get("locationId")),
    message: String(formData.get("message") ?? ""),
  });

  const fallback = `/e/${String(formData.get("slug") ?? "")}/directory?registrationId=${String(formData.get("registrationId") ?? "")}&token=${String(formData.get("token") ?? "")}`;

  if (!parsed.success) {
    redirect(fallback);
  }

  const viewer = await verifyRegistrationAccess({
    registrationId: parsed.data.registrationId,
    slug: parsed.data.slug,
    token: parsed.data.token,
  });

  if (!viewer) {
    redirect(fallback);
  }

  // La franja del formulario solo trae el inicio; el termino es inicio + 30min
  // (franjas fijas de v1). La RPC valida que caiga dentro del evento.
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + MEETING_SLOT_MINUTES * 60 * 1000);

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("propose_meeting", {
    p_event_id: viewer.event_id,
    p_requester_registration_id: viewer.id,
    p_receiver_registration_id: parsed.data.receiverRegistrationId,
    p_location_id: parsed.data.locationId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_message: parsed.data.message || null,
  });

  const status = error
    ? "error"
    : ((data?.[0]?.result_status as string | undefined) ?? "error");
  const accessQuery = `registrationId=${viewer.id}&token=${parsed.data.token}`;

  redirect(
    `/e/${parsed.data.slug}/meetings?${accessQuery}&meetingStatus=${encodeURIComponent(status)}`,
  );
}

const respondSchema = z.object({
  slug: z.string().min(1),
  registrationId: z.string().uuid(),
  token: z.string().min(16),
  meetingId: z.string().uuid(),
});

export async function acceptMeeting(formData: FormData) {
  await respondToMeeting(formData, true);
}

export async function declineMeeting(formData: FormData) {
  await respondToMeeting(formData, false);
}

async function respondToMeeting(formData: FormData, accept: boolean) {
  const parsed = respondSchema.safeParse({
    slug: formData.get("slug"),
    registrationId: formData.get("registrationId"),
    token: formData.get("token"),
    meetingId: formData.get("meetingId"),
  });

  if (!parsed.success) {
    redirect(`/e/${String(formData.get("slug") ?? "")}`);
  }

  const viewer = await verifyRegistrationAccess({
    registrationId: parsed.data.registrationId,
    slug: parsed.data.slug,
    token: parsed.data.token,
  });

  const accessQuery = `registrationId=${parsed.data.registrationId}&token=${parsed.data.token}`;

  if (!viewer) {
    redirect(`/e/${parsed.data.slug}/meetings?${accessQuery}`);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("respond_meeting", {
    p_meeting_id: parsed.data.meetingId,
    p_registration_id: viewer.id,
    p_accept: accept,
  });

  const status = error
    ? "error"
    : ((data?.[0]?.result_status as string | undefined) ?? "error");
  const meetingStatus =
    status === "ok" ? (accept ? "accepted" : "declined") : status;

  redirect(
    `/e/${parsed.data.slug}/meetings?${accessQuery}&meetingStatus=${encodeURIComponent(meetingStatus)}`,
  );
}

export async function cancelMeeting(formData: FormData) {
  const parsed = respondSchema.safeParse({
    slug: formData.get("slug"),
    registrationId: formData.get("registrationId"),
    token: formData.get("token"),
    meetingId: formData.get("meetingId"),
  });

  if (!parsed.success) {
    redirect(`/e/${String(formData.get("slug") ?? "")}`);
  }

  const viewer = await verifyRegistrationAccess({
    registrationId: parsed.data.registrationId,
    slug: parsed.data.slug,
    token: parsed.data.token,
  });

  const accessQuery = `registrationId=${parsed.data.registrationId}&token=${parsed.data.token}`;

  if (!viewer) {
    redirect(`/e/${parsed.data.slug}/meetings?${accessQuery}`);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("cancel_meeting", {
    p_meeting_id: parsed.data.meetingId,
    p_registration_id: viewer.id,
  });

  const status = error
    ? "error"
    : ((data?.[0]?.result_status as string | undefined) ?? "error");
  const meetingStatus = status === "ok" ? "cancelled" : status;

  redirect(
    `/e/${parsed.data.slug}/meetings?${accessQuery}&meetingStatus=${encodeURIComponent(meetingStatus)}`,
  );
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
