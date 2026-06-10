"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { upsertAttendeeProfileFromRegistration } from "@/lib/attendee-profiles";
import { sendRegistrationConfirmationEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/registration-token";

const registrationSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  email: z.string().trim().email("Ingresa un email valido.").toLowerCase(),
  phone: z.string().trim().optional(),
  role: z.string().trim().min(2, "Ingresa tu cargo o rol."),
  company: z.string().trim().min(2, "Ingresa tu empresa u organizacion."),
  industry: z.string().trim().min(2, "Selecciona tu area o industria."),
  interests: z.array(z.string().trim()).min(1).max(5),
  networkingOptIn: z.boolean(),
  publicProfileEnabled: z.boolean(),
  dataConsent: z.literal(true),
});

export type RegistrationActionState = {
  status: "idle" | "error";
  message: string;
};

export async function registerForEvent(
  _state: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const networkingOptIn = formData.get("networkingOptIn") === "on";

  const parsed = registrationSchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    company: formData.get("company"),
    industry: formData.get("industry"),
    interests: formData.getAll("interests"),
    networkingOptIn,
    publicProfileEnabled: networkingOptIn,
    dataConsent: formData.get("dataConsent") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Revisa los campos obligatorios de la inscripcion.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: event } = await adminClient
    .from("events")
    .select("id, capacity, status, slug, name, starts_at")
    .eq("id", parsed.data.eventId)
    .eq("slug", parsed.data.slug)
    .is("deleted_at", null)
    .single<{
      id: string;
      capacity: number;
      status: string;
      slug: string;
      name: string;
      starts_at: string;
    }>();

  if (!event || event.status !== "published") {
    return {
      status: "error",
      message: "Este evento no esta disponible para inscripcion.",
    };
  }

  const { count } = await adminClient
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  if ((count ?? 0) >= event.capacity) {
    return {
      status: "error",
      message: "Este evento ya completo sus cupos.",
    };
  }

  const profileId = await upsertAttendeeProfileFromRegistration({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    company: parsed.data.company,
    industry: parsed.data.industry,
    interests: parsed.data.interests,
  });

  const token = createRegistrationToken();
  const tokenHash = hashRegistrationToken(token);

  const { data: registration, error } = await adminClient
    .from("event_registrations")
    .insert({
      event_id: parsed.data.eventId,
      profile_id: profileId,
      email: parsed.data.email,
      full_name_snapshot: parsed.data.fullName,
      phone_snapshot: parsed.data.phone || null,
      role_snapshot: parsed.data.role,
      company_snapshot: parsed.data.company,
      industry_snapshot: parsed.data.industry,
      interests: parsed.data.interests,
      networking_opt_in: parsed.data.networkingOptIn,
      public_profile_enabled: parsed.data.publicProfileEnabled,
      qr_token_hash: tokenHash,
    })
    .select("id")
    .single<{ id: string }>();

  if (error?.code === "23505") {
    return {
      status: "error",
      message: "Ya existe una inscripcion para este email en el evento.",
    };
  }

  if (error || !registration) {
    return {
      status: "error",
      message: "No pudimos completar la inscripcion. Intentalo nuevamente.",
    };
  }

  await adminClient.from("consents").insert([
    {
      event_id: parsed.data.eventId,
      registration_id: registration.id,
      email: parsed.data.email,
      consent_type: "event_registration",
      version: "2026-06-03",
      accepted: true,
    },
    {
      event_id: parsed.data.eventId,
      registration_id: registration.id,
      email: parsed.data.email,
      consent_type: "organizer_data_processing",
      version: "2026-06-03",
      accepted: true,
    },
    {
      event_id: parsed.data.eventId,
      registration_id: registration.id,
      email: parsed.data.email,
      consent_type: "public_directory",
      version: "2026-06-03",
      accepted: parsed.data.publicProfileEnabled,
    },
    {
      event_id: parsed.data.eventId,
      registration_id: registration.id,
      email: parsed.data.email,
      consent_type: "connection_requests",
      version: "2026-06-03",
      accepted: parsed.data.networkingOptIn,
    },
    {
      event_id: parsed.data.eventId,
      registration_id: registration.id,
      email: parsed.data.email,
      consent_type: "share_contact_on_acceptance",
      version: "2026-06-03",
      accepted: parsed.data.networkingOptIn,
    },
  ]);

  const confirmationPath = `/e/${parsed.data.slug}/registered?registrationId=${registration.id}&token=${token}`;
  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";

  try {
    await sendRegistrationConfirmationEmail({
      attendeeName: parsed.data.fullName,
      confirmationUrl: `${origin}${confirmationPath}`,
      eventDate: formatDate(event.starts_at),
      eventName: event.name,
      to: parsed.data.email,
    });
  } catch {
    // Email delivery should not invalidate a completed registration.
  }

  redirect(confirmationPath);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
