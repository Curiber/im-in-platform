"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { profileCardVisibilityValues } from "@/lib/profile-card-visibility";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { updateAttendeeProfile as updateProfileService } from "@/lib/services/profile-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Action delgada (Fase 5.0, spec 29): parseo del formulario y navegacion; la
// validacion contra el catalogo y la persistencia doble (perfil global +
// snapshot) viven en el servicio compartido con la API v1.

const profileSchema = z.object({
  cardVisibility: z.enum(profileCardVisibilityValues),
  company: z.string().trim().min(2, "Ingresa tu empresa u organizacion."),
  description: z.string().trim().max(500).optional(),
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  goalsSeeking: z.array(z.string().trim()).max(3),
  goalsOffering: z.array(z.string().trim()).max(3),
  headline: z.string().trim().max(120).optional(),
  industry: z.string().trim().min(2, "Selecciona tu area o industria."),
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
    goalsSeeking: formData.getAll("goalsSeeking"),
    goalsOffering: formData.getAll("goalsOffering"),
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

  const result = await updateProfileService(
    createSupabaseAdminClient(),
    registration,
    {
      cardVisibility: parsed.data.cardVisibility,
      company: parsed.data.company,
      description: parsed.data.description || null,
      fullName: parsed.data.fullName,
      goalsSeeking: parsed.data.goalsSeeking,
      goalsOffering: parsed.data.goalsOffering,
      headline: parsed.data.headline || null,
      industry: parsed.data.industry,
      interests: parsed.data.interests,
      linkedinUrl: parsed.data.linkedinUrl,
      phone: parsed.data.phone || null,
      publicProfileEnabled: parsed.data.publicProfileEnabled,
      publicEmailEnabled: parsed.data.publicEmailEnabled,
      publicPhoneEnabled: parsed.data.publicPhoneEnabled,
      role: parsed.data.role,
    },
  );

  if (result !== "updated") {
    redirect(`${fallbackPath}&profileStatus=${result}`);
  }

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
