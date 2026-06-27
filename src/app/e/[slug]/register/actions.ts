"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { upsertAttendeeProfileFromRegistration } from "@/lib/attendee-profiles";
import { sendRegistrationConfirmationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
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

  // Inscripcion atomica: la RPC toma un lock sobre el evento y verifica
  // capacidad/estado/fin de evento antes de insertar la inscripcion y sus
  // consentimientos en una sola transaccion (sin race de sobreventa).
  const { data: result, error } = await adminClient.rpc("register_attendee", {
    p_event_id: parsed.data.eventId,
    p_profile_id: profileId,
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
    p_phone: parsed.data.phone || null,
    p_role: parsed.data.role,
    p_company: parsed.data.company,
    p_industry: parsed.data.industry,
    p_interests: parsed.data.interests,
    p_networking_opt_in: parsed.data.networkingOptIn,
    p_public_profile_enabled: parsed.data.publicProfileEnabled,
    p_qr_token_hash: tokenHash,
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos completar la inscripcion. Intentalo nuevamente.",
    };
  }

  const outcome = result?.[0];

  const messagesByStatus: Record<string, string> = {
    unavailable: "Este evento no esta disponible para inscripcion.",
    ended: "Este evento ya termino.",
    capacity_full: "Este evento ya completo sus cupos.",
    duplicate: "Ya existe una inscripcion para este email en el evento.",
  };

  if (!outcome || outcome.status !== "ok" || !outcome.registration_id) {
    return {
      status: "error",
      message:
        messagesByStatus[outcome?.status ?? ""] ??
        "No pudimos completar la inscripcion. Intentalo nuevamente.",
    };
  }

  const confirmationPath = `/e/${parsed.data.slug}/registered?registrationId=${outcome.registration_id}&token=${token}`;
  const appUrl = getAppUrl();

  try {
    await sendRegistrationConfirmationEmail({
      attendeeName: parsed.data.fullName,
      confirmationUrl: `${appUrl}${confirmationPath}`,
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
