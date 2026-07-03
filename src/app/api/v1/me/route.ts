import type { NextRequest } from "next/server";

import {
  authenticateApiRequest,
  jsonData,
  jsonError,
  toRegistrationDto,
} from "@/lib/api/v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/me — inscripcion del portador + su perfil persistente.

type AttendeeProfileRow = {
  avatar_url: string | null;
  card_visibility: string;
  description: string | null;
  headline: string | null;
  linkedin_url: string | null;
  phone: string | null;
  profile_slug: string | null;
  role: string | null;
  company: string | null;
};

export async function GET(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  let profile: AttendeeProfileRow | null = null;

  if (viewer.profile_id) {
    const { data } = await createSupabaseAdminClient()
      .from("attendee_profiles")
      .select(
        "avatar_url, card_visibility, description, headline, linkedin_url, phone, profile_slug, role, company",
      )
      .eq("id", viewer.profile_id)
      .single<AttendeeProfileRow>();

    profile = data;
  }

  return jsonData({
    registration: toRegistrationDto(viewer),
    profile: profile
      ? {
          avatarUrl: profile.avatar_url,
          cardVisibility: profile.card_visibility,
          description: profile.description,
          headline: profile.headline,
          linkedinUrl: profile.linkedin_url,
          phone: profile.phone,
          profileSlug: profile.profile_slug,
          role: profile.role,
          company: profile.company,
        }
      : null,
  });
}
