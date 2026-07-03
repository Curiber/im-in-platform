// Servicio de verificacion de email (Fase 5.0, spec 29).
//
// Extraido del route handler /e/[slug]/verify. La decision de elegibilidad es
// pura (testeable sin DB); el servicio orquesta la creacion/enlace del perfil
// global y la activacion transaccional (RPC bajo lock del evento, Epic 32).

import type { SupabaseClient } from "@supabase/supabase-js";

import { upsertAttendeeProfileFromRegistration } from "@/lib/attendee-profiles";
import { isRegistrationTokenValid } from "@/lib/registration-token";

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export type VerificationEligibility =
  // Ya verificada (o pendiente de aprobacion): idempotente, mostrar credencial.
  | "already_active"
  // Verificable ahora.
  | "verifiable"
  // Invalida: cancelada/no_show, token malo, evento equivocado, terminado o
  // link vencido. Respuesta uniforme (sin filtrar el motivo).
  | "invalid";

// Decision pura de elegibilidad, en el mismo orden que aplicaba el route:
// idempotencia primero (una inscripcion activa se muestra aunque el evento
// haya terminado o el link tenga mas de 24h).
export function evaluateVerificationEligibility({
  eventEndsAt,
  now,
  registeredAt,
  status,
}: {
  eventEndsAt: string | null;
  now: Date;
  registeredAt: string;
  status: string;
}): VerificationEligibility {
  if (
    status === "registered" ||
    status === "checked_in" ||
    status === "pending_approval"
  ) {
    return "already_active";
  }

  if (status !== "pending_verification") {
    return "invalid";
  }

  // Evento terminado: no se verifica despues del termino (igual que no se
  // permite inscribirse).
  if (eventEndsAt && new Date(eventEndsAt).getTime() < now.getTime()) {
    return "invalid";
  }

  // Expiracion del link (24h desde la inscripcion): se aplica aqui, no
  // depende del cron de limpieza.
  if (now.getTime() - new Date(registeredAt).getTime() > VERIFICATION_TTL_MS) {
    return "invalid";
  }

  return "verifiable";
}

export type VerifyRegistrationResult = "verified" | "already_active" | "invalid";

type VerifyRegistrationRow = {
  id: string;
  email: string;
  full_name_snapshot: string;
  phone_snapshot: string | null;
  role_snapshot: string | null;
  company_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
  goals_seeking: string[];
  goals_offering: string[];
  status: string;
  qr_token_hash: string;
  registered_at: string;
  events: { slug: string; ends_at: string | null } | null;
};

export async function verifyRegistration(
  client: SupabaseClient,
  {
    now = new Date(),
    registrationId,
    slug,
    token,
  }: {
    now?: Date;
    registrationId: string;
    slug: string;
    token: string;
  },
): Promise<VerifyRegistrationResult> {
  const { data: registration } = await client
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, phone_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests, goals_seeking, goals_offering, status, qr_token_hash, registered_at, events(slug, ends_at)",
    )
    .eq("id", registrationId)
    .single<VerifyRegistrationRow>();

  if (
    !registration ||
    registration.events?.slug !== slug ||
    !isRegistrationTokenValid(token, registration.qr_token_hash)
  ) {
    return "invalid";
  }

  const eligibility = evaluateVerificationEligibility({
    eventEndsAt: registration.events?.ends_at ?? null,
    now,
    registeredAt: registration.registered_at,
    status: registration.status,
  });

  if (eligibility !== "verifiable") {
    return eligibility === "already_active" ? "already_active" : "invalid";
  }

  // Verificacion confirmada: recien aqui se crea/actualiza el perfil global
  // (estuvo diferido hasta probar el email).
  const profileId = await upsertAttendeeProfileFromRegistration({
    email: registration.email,
    fullName: registration.full_name_snapshot,
    phone: registration.phone_snapshot,
    role: registration.role_snapshot ?? "",
    company: registration.company_snapshot ?? "",
    industry: registration.industry_snapshot ?? "",
    interests: registration.interests ?? [],
    goalsSeeking: registration.goals_seeking ?? [],
    goalsOffering: registration.goals_offering ?? [],
  });

  // No marcar `registered` sin perfil: dejaria la inscripcion sin poder
  // editar perfil ni sincronizar. Reabrir el link reintenta.
  if (!profileId) {
    console.error(
      "No se pudo crear/enlazar el perfil al verificar la inscripcion",
      registrationId,
    );
    return "invalid";
  }

  // La transicion lee el modo del evento y fija el estado destino
  // (`registered` u `pending_approval`) bajo el lock del evento, en una sola
  // transaccion (ver RPC del Epic 32).
  const { error } = await client.rpc("activate_verified_registration", {
    p_registration_id: registrationId,
    p_profile_id: profileId,
  });

  if (error) {
    return "invalid";
  }

  return "verified";
}
