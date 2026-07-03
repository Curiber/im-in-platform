import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { isRegistrationTokenValid } from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VerifiedRegistration = {
  id: string;
  event_id: string;
  profile_id: string | null;
  user_id: string | null;
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
    starts_at: string;
    ends_at: string | null;
    deleted_at: string | null;
    cover_image_url: string | null;
    organizations: { suspended_at: string | null } | null;
  } | null;
};

// Carga y valida el estado base de una inscripcion (evento vivo, organizacion
// no suspendida, inscripcion activa). La AUTENTICACION (token o sesion) la
// aplican los wrappers de abajo.
async function loadActiveRegistration(
  registrationId: string,
): Promise<VerifiedRegistration | null> {
  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select(
      "id, event_id, profile_id, user_id, email, full_name_snapshot, interests, goals_seeking, goals_offering, industry_snapshot, public_profile_enabled, status, qr_token_hash, attendee_profiles(card_visibility, profile_slug), events(id, slug, name, networking_enabled, starts_at, ends_at, deleted_at, cover_image_url, organizations(suspended_at))",
    )
    .eq("id", registrationId)
    .single()
    .returns<VerifiedRegistration>();

  if (!registration || !registration.events) {
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

// Verificacion por DUEÑO (API v1 con sesion, Fase 5.2/spec 33): la inscripcion
// debe estar activa y haber sido reclamada por ese usuario
// (claim_attendee_identity). Sin token: la identidad ya la probo el access
// token de Supabase que resolvio el userId.
export async function verifyRegistrationOwnership({
  registrationId,
  userId,
}: {
  registrationId?: string;
  userId: string;
}): Promise<VerifiedRegistration | null> {
  if (!registrationId) {
    return null;
  }

  const registration = await loadActiveRegistration(registrationId);

  if (!registration || registration.user_id !== userId) {
    return null;
  }

  return registration;
}

// Verificacion por token SIN slug: la usa la API v1 (el cliente mobile conoce
// registrationId + token, no la URL del evento). Solo token: la API no tiene
// cookies de sesion.
export async function verifyRegistrationToken({
  registrationId,
  token,
}: {
  registrationId?: string;
  token?: string;
}): Promise<VerifiedRegistration | null> {
  if (!registrationId || !token) {
    return null;
  }

  const registration = await loadActiveRegistration(registrationId);

  if (
    !registration ||
    !isRegistrationTokenValid(token, registration.qr_token_hash)
  ) {
    return null;
  }

  return registration;
}

export async function verifyRegistrationAccess({
  registrationId,
  slug,
  token,
}: {
  registrationId?: string;
  slug: string;
  token?: string;
}) {
  if (!registrationId) {
    return null;
  }

  const registration = await loadActiveRegistration(registrationId);

  // El slug de la URL debe corresponder al evento de la inscripcion.
  if (!registration || registration.events?.slug !== slug) {
    return null;
  }

  // Con token se valida el token (flujo del link/QR). SIN token se acepta la
  // sesion de asistente (Fase 5.2) cuando la inscripcion fue reclamada por el
  // usuario logueado: es el puente que permite entrar desde "Mis eventos" sin
  // el link del email. Un token presente pero invalido NUNCA cae a sesion.
  if (token) {
    return isRegistrationTokenValid(token, registration.qr_token_hash)
      ? registration
      : null;
  }

  if (!registration.user_id) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user && user.id === registration.user_id ? registration : null;
}
