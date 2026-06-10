"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { interests as validInterests } from "@/lib/profile-options";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const profileSchema = z.object({
  company: z.string().trim().min(2, "Ingresa tu empresa u organizacion."),
  description: z.string().trim().max(500).optional(),
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  headline: z.string().trim().max(120).optional(),
  industry: z.string().trim().min(2, "Selecciona tu area o industria."),
  interests: z
    .array(z.string())
    .min(1)
    .max(5)
    .refine(
      (items) => items.every((item) => validInterests.includes(item)),
      "Intereses invalidos.",
    ),
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.string().url().nullable()),
  phone: z.string().trim().optional(),
  publicProfileEnabled: z.boolean(),
  registrationId: z.string().uuid(),
  role: z.string().trim().min(2, "Ingresa tu cargo o rol."),
  slug: z.string().min(1),
  token: z.string().min(16),
});

export async function updateAttendeeProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    company: String(formData.get("company") ?? ""),
    description: String(formData.get("description") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    interests: formData.getAll("interests"),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    publicProfileEnabled: formData.get("publicProfileEnabled") === "on",
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
  const { error: profileError } = await adminClient
    .from("attendee_profiles")
    .update({
      company: parsed.data.company,
      description: parsed.data.description || null,
      full_name: parsed.data.fullName,
      headline: parsed.data.headline || null,
      industry: parsed.data.industry,
      interests: parsed.data.interests,
      linkedin_url: parsed.data.linkedinUrl,
      phone: parsed.data.phone || null,
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

  revalidatePath(`/e/${parsed.data.slug}/profile`);
  revalidatePath(`/e/${parsed.data.slug}/directory`);
  revalidatePath(`/e/${parsed.data.slug}/directory/${registration.id}`);
  redirect(
    `/e/${parsed.data.slug}/profile?registrationId=${registration.id}&token=${parsed.data.token}&profileStatus=updated`,
  );
}
