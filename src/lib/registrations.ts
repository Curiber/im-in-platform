import { hashRegistrationToken } from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type VerifiedRegistration = {
  id: string;
  event_id: string;
  profile_id: string | null;
  email: string;
  full_name_snapshot: string;
  interests: string[];
  status: "registered" | "checked_in" | "cancelled" | "no_show";
  qr_token_hash: string;
  events: {
    id: string;
    slug: string;
    name: string;
    networking_enabled: boolean;
    deleted_at: string | null;
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
      "id, event_id, profile_id, email, full_name_snapshot, interests, status, qr_token_hash, events(id, slug, name, networking_enabled, deleted_at)",
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

  if (registration.qr_token_hash !== hashRegistrationToken(token)) {
    return null;
  }

  if (registration.status === "cancelled") {
    return null;
  }

  return registration;
}
