import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { isRegistrationTokenValid } from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type VerifiedRegistration = {
  id: string;
  event_id: string;
  profile_id: string | null;
  email: string;
  full_name_snapshot: string;
  interests: string[];
  public_profile_enabled: boolean;
  status: "registered" | "checked_in" | "cancelled" | "no_show";
  qr_token_hash: string;
  attendee_profiles: {
    card_visibility: ProfileCardVisibility;
    profile_slug: string | null;
  } | null;
  events: {
    id: string;
    slug: string;
    name: string;
    networking_enabled: boolean;
    deleted_at: string | null;
    cover_image_url: string | null;
  } | null;
};

export async function verifyRegistrationAccess({
  registrationId,
  slug,
  token,
}: {
  registrationId?: string;
  slug: string;
  token?: string;
}) {
  if (!registrationId || !token) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select(
      "id, event_id, profile_id, email, full_name_snapshot, interests, public_profile_enabled, status, qr_token_hash, attendee_profiles(card_visibility, profile_slug), events(id, slug, name, networking_enabled, deleted_at, cover_image_url)",
    )
    .eq("id", registrationId)
    .single()
    .returns<VerifiedRegistration>();

  if (!registration || registration.events?.slug !== slug) {
    return null;
  }

  if (registration.events.deleted_at) {
    return null;
  }

  if (!isRegistrationTokenValid(token, registration.qr_token_hash)) {
    return null;
  }

  if (registration.status === "cancelled") {
    return null;
  }

  return registration;
}
