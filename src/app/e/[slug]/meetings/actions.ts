"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyRegistrationAccess } from "@/lib/registrations";
import {
  cancelMeeting as cancelMeetingService,
  proposeMeeting as proposeMeetingService,
  respondMeeting as respondMeetingService,
} from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Actions delgadas (Fase 5.0, spec 29): autentican el token, delegan en el
// servicio de reuniones (las RPCs validan bajo el lock del evento) y traducen
// el resultado al query param `meetingStatus` de la agenda.

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

  const status = await proposeMeetingService(
    createSupabaseAdminClient(),
    viewer,
    {
      locationId: parsed.data.locationId,
      message: parsed.data.message || null,
      startsAt: new Date(parsed.data.startsAt),
    },
    parsed.data.receiverRegistrationId,
  );

  redirect(
    `/e/${parsed.data.slug}/meetings?registrationId=${viewer.id}&token=${parsed.data.token}&meetingStatus=${encodeURIComponent(status)}`,
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

  const status = await respondMeetingService(
    createSupabaseAdminClient(),
    viewer,
    parsed.data.meetingId,
    accept,
  );

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

  const status = await cancelMeetingService(
    createSupabaseAdminClient(),
    viewer,
    parsed.data.meetingId,
  );

  const meetingStatus = status === "ok" ? "cancelled" : status;

  redirect(
    `/e/${parsed.data.slug}/meetings?${accessQuery}&meetingStatus=${encodeURIComponent(meetingStatus)}`,
  );
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
