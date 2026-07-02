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
  goals_seeking: string[];
  goals_offering: string[];
  industry_snapshot: string | null;
  public_profile_enabled: boolean;
  status:
    | "pending_verification"
    | "pending_approval"
    | "registered"
    | "checked_in"
    | "cancelled"
    | "no_show";
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
    organizations: { suspended_at: string | null } | null;
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
      "id, event_id, profile_id, email, full_name_snapshot, interests, goals_seeking, goals_offering, industry_snapshot, public_profile_enabled, status, qr_token_hash, attendee_profiles(card_visibility, profile_slug), events(id, slug, name, networking_enabled, deleted_at, cover_image_url, organizations(suspended_at))",
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

  // Organizacion suspendida: el networking del evento queda congelado (perfil,
  // directorio, conexiones), igual que sus superficies publicas.
  if (registration.events.organizations?.suspended_at) {
    return null;
  }

  if (!isRegistrationTokenValid(token, registration.qr_token_hash)) {
    return null;
  }

  // Las superficies de networking (perfil, directorio, conexiones) solo se
  // habilitan para inscripciones activas. `pending_verification` (email sin
  // verificar) y `pending_approval` (a la espera del organizador) aun no
  // participan; `cancelled`/`no_show` tampoco.
  if (
    registration.status !== "registered" &&
    registration.status !== "checked_in"
  ) {
    return null;
  }

  return registration;
}
