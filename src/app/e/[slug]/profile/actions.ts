"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getEventProfileOptions } from "@/lib/event-profile-options";
import { profileCardVisibilityValues } from "@/lib/profile-card-visibility";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  cardVisibility: z.enum(profileCardVisibilityValues),
  company: z.string().trim().min(2, "Ingresa tu empresa u organizacion."),
  description: z.string().trim().max(500).optional(),
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  headline: z.string().trim().max(120).optional(),
  industry: z.string().trim().min(2, "Selecciona tu area o industria."),
  // La validacion contra el catalogo se hace despues, contra las opciones
  // efectivas del evento (configurables por evento), no contra una lista fija.
  interests: z.array(z.string().trim()).min(1).max(5),
  linkedinUrl: z
    .string()
    .url()
    .nullable()
    .refine(
      (value) => !value || isLinkedInUrl(value),
      "Ingresa una URL de LinkedIn valida.",
    ),
  phone: z.string().trim().optional(),
  publicProfileEnabled: z.boolean(),
  publicEmailEnabled: z.boolean(),
  publicPhoneEnabled: z.boolean(),
  registrationId: z.string().uuid(),
  role: z.string().trim().min(2, "Ingresa tu cargo o rol."),
  slug: z.string().min(1),
  token: z.string().min(16),
});

export async function updateAttendeeProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    cardVisibility: formData.get("cardVisibility"),
    company: String(formData.get("company") ?? ""),
    description: String(formData.get("description") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    interests: formData.getAll("interests"),
    linkedinUrl: normalizeLinkedInUrl(String(formData.get("linkedinUrl") ?? "")),
    phone: String(formData.get("phone") ?? ""),
    publicProfileEnabled: formData.get("publicProfileEnabled") === "on",
    publicEmailEnabled: formData.get("publicEmailEnabled") === "on",
    publicPhoneEnabled: formData.get("publicPhoneEnabled") === "on",
    registrationId: formData.get("registrationId"),
    role: String(formData.get("role") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    token: String(formData.get("token") ?? ""),
  });

  const fallbackPath = `/e/${String(formData.get("slug") ?? "")}/profile?registrationId=${String(formData.get("registrationId") ?? "")}&token=${String(formData.get("token") ?? "")}`;

  if (!parsed.success) {
    redirect(`${fallbackPath}&profileStatus=invalid`);
  }

  const registration = await verifyRegistrationAccess({
    registrationId: parsed.data.registrationId,
    slug: parsed.data.slug,
    token: parsed.data.token,
  });

  if (!registration?.profile_id) {
    redirect(`${fallbackPath}&profileStatus=error`);
  }

  const adminClient = createSupabaseAdminClient();

  // Los intereses enviados deben pertenecer al catalogo efectivo del evento
  // (opciones propias o defaults de plataforma). Evita inyectar etiquetas fuera
  // del vocabulario configurado por el organizador.
  const eventOptions = await getEventProfileOptions(
    adminClient,
    registration.event_id,
  );
  const allowedInterests = new Set(eventOptions.interests);

  if (!parsed.data.interests.every((item) => allowedInterests.has(item))) {
    redirect(`${fallbackPath}&profileStatus=invalid`);
  }

  const { error: profileError } = await adminClient
    .from("attendee_profiles")
    .update({
      company: parsed.data.company,
      card_visibility: parsed.data.cardVisibility,
      description: parsed.data.description || null,
      full_name: parsed.data.fullName,
      headline: parsed.data.headline || null,
      industry: parsed.data.industry,
      interests: parsed.data.interests,
      linkedin_url: parsed.data.linkedinUrl,
      phone: parsed.data.phone || null,
      public_email_enabled:
        parsed.data.cardVisibility === "public_full" &&
        parsed.data.publicEmailEnabled,
      public_phone_enabled:
        parsed.data.cardVisibility === "public_full" &&
        parsed.data.publicPhoneEnabled,
      role: parsed.data.role,
    })
    .eq("id", registration.profile_id);

  if (profileError) {
    redirect(`${fallbackPath}&profileStatus=error`);
  }

  const { error: registrationError } = await adminClient
    .from("event_registrations")
    .update({
      company_snapshot: parsed.data.company,
      full_name_snapshot: parsed.data.fullName,
      industry_snapshot: parsed.data.industry,
      interests: parsed.data.interests,
      networking_opt_in: parsed.data.publicProfileEnabled,
      phone_snapshot: parsed.data.phone || null,
      public_profile_enabled: parsed.data.publicProfileEnabled,
      role_snapshot: parsed.data.role,
    })
    .eq("id", registration.id);

  if (registrationError) {
    redirect(`${fallbackPath}&profileStatus=error`);
  }

  await adminClient.from("consents").insert({
    accepted: parsed.data.cardVisibility !== "private",
    consent_type: "public_card",
    email: registration.email,
    event_id: registration.event_id,
    registration_id: registration.id,
    version: "2026-06-12",
  });

  revalidatePath(`/e/${parsed.data.slug}/profile`);
  revalidatePath(`/e/${parsed.data.slug}/directory`);
  revalidatePath(`/e/${parsed.data.slug}/directory/${registration.id}`);

  if (registration.attendee_profiles?.profile_slug) {
    revalidatePath(`/p/${registration.attendee_profiles.profile_slug}`);
  }

  redirect(
    `/e/${parsed.data.slug}/profile?registrationId=${registration.id}&token=${parsed.data.token}&profileStatus=updated`,
  );
}

function normalizeLinkedInUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(www\.)?linkedin\.com\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function isLinkedInUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().replace(/^www\./, "") === "linkedin.com";
  } catch {
    return false;
  }
}
