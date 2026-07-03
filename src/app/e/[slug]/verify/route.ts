import { NextResponse, type NextRequest } from "next/server";

import { getAppUrl } from "@/lib/env";
import { verifyRegistration } from "@/lib/services/verification-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Route delgado (Fase 5.0, spec 29): la elegibilidad, el upsert del perfil
// global y la activacion transaccional viven en el servicio de verificacion.

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

  const result = await verifyRegistration(createSupabaseAdminClient(), {
    registrationId,
    slug,
    token,
  });

  if (result === "invalid") {
    return invalid;
  }

  // Verificada ahora o ya activa (idempotente): a la credencial.
  return NextResponse.redirect(
    `${appUrl}/e/${slug}/registered?registrationId=${registrationId}&token=${token}`,
  );
}
