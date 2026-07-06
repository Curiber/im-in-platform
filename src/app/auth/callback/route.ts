import { NextResponse, type NextRequest } from "next/server";

import { claimAttendeeIdentity } from "@/lib/attendee-account";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Se valida el origen resuelto (no un prefijo de string): `/%5Cevil.com` y
  // similares pasarian un chequeo `startsWith("/")` pero resuelven a otro
  // origen (open redirect).
  const next = safeRedirectPath(
    requestUrl.searchParams.get("next"),
    request.url,
    "/admin",
  );

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Reclamo de identidad AQUI, no en la pagina de destino: magic link, Google y
  // LinkedIn entran por este callback y `next` puede ser una ruta profunda
  // (/app/eventos, /app/perfil, /e/[slug]/register) que lee perfil/inscripciones
  // de inmediato. Reclamar tras el intercambio garantiza que esos datos ya esten
  // enlazados por email antes de la primera lectura. Idempotente y con guard de
  // email verificado; inofensivo para el login de organizador (next=/admin).
  await claimAttendeeIdentity();

  return NextResponse.redirect(new URL(next, request.url));
}
