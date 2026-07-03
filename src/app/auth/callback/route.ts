import { NextResponse, type NextRequest } from "next/server";

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

  return NextResponse.redirect(new URL(next, request.url));
}
