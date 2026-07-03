// Servicio de perfil del asistente (Fase 5.0, spec 29).
//
// Extraido de la server action de perfil: valida contra el catalogo efectivo
// del evento y persiste en el perfil global Y en el snapshot de la
// inscripcion (mismas reglas para web y API v1).

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEventProfileOptions } from "@/lib/event-profile-options";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { validateProfileSelections } from "@/lib/profile-options";
import type { VerifiedRegistration } from "@/lib/registrations";

export type UpdateAttendeeProfileInput = {
  cardVisibility: ProfileCardVisibility;
  company: string;
  description: string | null;
  fullName: string;
  goalsSeeking: string[];
  goalsOffering: string[];
  headline: string | null;
  industry: string;
  interests: string[];
  linkedinUrl: string | null;
  phone: string | null;
  publicProfileEnabled: boolean;
  publicEmailEnabled: boolean;
  publicPhoneEnabled: boolean;
  role: string;
};

export type UpdateAttendeeProfileResult = "updated" | "invalid" | "error";

export async function updateAttendeeProfile(
  client: SupabaseClient,
  registration: VerifiedRegistration,
  input: UpdateAttendeeProfileInput,
): Promise<UpdateAttendeeProfileResult> {
  if (!registration.profile_id) {
    return "error";
  }

  // Area/intereses/objetivos deben pertenecer al catalogo efectivo del evento
  // (propio o defaults). El caller es invocable directo: no se confia en el
  // formulario ni en el cliente mobile.
  const catalog = await getEventProfileOptions(client, registration.event_id);

  if (
    !validateProfileSelections(catalog, {
      industry: input.industry,
      interests: input.interests,
      goalsSeeking: input.goalsSeeking,
      goalsOffering: input.goalsOffering,
    })
  ) {
    return "invalid";
  }

  const { error: profileError } = await client
    .from("attendee_profiles")
    .update({
      company: input.company,
      card_visibility: input.cardVisibility,
      description: input.description,
      full_name: input.fullName,
      goals_seeking: input.goalsSeeking,
      goals_offering: input.goalsOffering,
      headline: input.headline,
      industry: input.industry,
      interests: input.interests,
      linkedin_url: input.linkedinUrl,
      phone: input.phone,
      // Email/telefono publicos solo tienen sentido en la tarjeta completa.
      public_email_enabled:
        input.cardVisibility === "public_full" && input.publicEmailEnabled,
      public_phone_enabled:
        input.cardVisibility === "public_full" && input.publicPhoneEnabled,
      role: input.role,
    })
    .eq("id", registration.profile_id);

  if (profileError) {
    return "error";
  }

  const { error: registrationError } = await client
    .from("event_registrations")
    .update({
      company_snapshot: input.company,
      full_name_snapshot: input.fullName,
      goals_seeking: input.goalsSeeking,
      goals_offering: input.goalsOffering,
      industry_snapshot: input.industry,
      interests: input.interests,
      networking_opt_in: input.publicProfileEnabled,
      phone_snapshot: input.phone,
      public_profile_enabled: input.publicProfileEnabled,
      role_snapshot: input.role,
    })
    .eq("id", registration.id);

  if (registrationError) {
    return "error";
  }

  // Consentimiento de tarjeta publica: se registra cada cambio (historial).
  await client.from("consents").insert({
    accepted: input.cardVisibility !== "private",
    consent_type: "public_card",
    email: registration.email,
    event_id: registration.event_id,
    registration_id: registration.id,
    version: "2026-06-12",
  });

  return "updated";
}
