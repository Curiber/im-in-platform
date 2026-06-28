import { NextResponse, type NextRequest } from "next/server";

import { upsertAttendeeProfileFromRegistration } from "@/lib/attendee-profiles";
import { getAppUrl } from "@/lib/env";
import { isRegistrationTokenValid } from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type VerifyRegistration = {
  id: string;
  email: string;
  full_name_snapshot: string;
  phone_snapshot: string | null;
  role_snapshot: string | null;
  company_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
  status: string;
  qr_token_hash: string;
  events: { slug: string } | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const appUrl = getAppUrl();
  const registrationId = request.nextUrl.searchParams.get("registrationId") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";

  const invalid = NextResponse.redirect(
    `${appUrl}/e/${slug}/check-email?status=invalid`,
  );

  if (!registrationId || !token) {
    return invalid;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, phone_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests, status, qr_token_hash, events(slug)",
    )
    .eq("id", registrationId)
    .single<VerifyRegistration>();

  if (
    !registration ||
    registration.events?.slug !== slug ||
    !isRegistrationTokenValid(token, registration.qr_token_hash)
  ) {
    return invalid;
  }

  const credentialUrl = `${appUrl}/e/${slug}/registered?registrationId=${registrationId}&token=${token}`;

  // Ya verificada: idempotente, llevar directo a la credencial.
  if (registration.status !== "pending_verification") {
    return NextResponse.redirect(credentialUrl);
  }

  // Verificacion confirmada: recien aqui se crea/actualiza el perfil global y se
  // activa la inscripcion (el perfil estuvo diferido hasta probar el email).
  const profileId = await upsertAttendeeProfileFromRegistration({
    email: registration.email,
    fullName: registration.full_name_snapshot,
    phone: registration.phone_snapshot,
    role: registration.role_snapshot ?? "",
    company: registration.company_snapshot ?? "",
    industry: registration.industry_snapshot ?? "",
    interests: registration.interests ?? [],
  });

  const { error } = await adminClient
    .from("event_registrations")
    .update({ status: "registered", profile_id: profileId })
    .eq("id", registrationId)
    .eq("status", "pending_verification");

  if (error) {
    return invalid;
  }

  return NextResponse.redirect(credentialUrl);
}
