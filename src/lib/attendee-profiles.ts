import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RegistrationProfileInput = {
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  company: string;
  industry: string;
  interests: string[];
};

type AttendeeProfileRow = {
  id: string;
  phone: string | null;
};

export async function upsertAttendeeProfileFromRegistration(
  input: RegistrationProfileInput,
): Promise<string | null> {
  const adminClient = createSupabaseAdminClient();
  const { data: existingProfile } = await adminClient
    .from("attendee_profiles")
    .select("id, phone")
    .eq("email", input.email)
    .maybeSingle<AttendeeProfileRow>();

  if (existingProfile) {
    await adminClient
      .from("attendee_profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone ?? existingProfile.phone,
        role: input.role,
        company: input.company,
        industry: input.industry,
        interests: input.interests,
      })
      .eq("id", existingProfile.id);

    return existingProfile.id;
  }

  const { data: createdProfile, error } = await adminClient
    .from("attendee_profiles")
    .insert({
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      role: input.role,
      company: input.company,
      industry: input.industry,
      interests: input.interests,
      profile_slug: buildProfileSlug(input.fullName),
    })
    .select("id")
    .single<{ id: string }>();

  if (createdProfile) {
    return createdProfile.id;
  }

  // 23505: another registration created the profile for this email first.
  if (error?.code === "23505") {
    const { data: racedProfile } = await adminClient
      .from("attendee_profiles")
      .select("id")
      .eq("email", input.email)
      .maybeSingle<{ id: string }>();

    return racedProfile?.id ?? null;
  }

  return null;
}

function buildProfileSlug(fullName: string) {
  const base = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "perfil"}-${crypto.randomUUID().slice(0, 8)}`;
}
