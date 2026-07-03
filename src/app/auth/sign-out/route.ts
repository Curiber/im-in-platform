import { NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // `next` opcional: el asistente vuelve a /mi/login; el admin cae en /login
  // por defecto. Se valida el origen resuelto (no un prefijo de string) para
  // evitar open redirects.
  const next = safeRedirectPath(
    new URL(request.url).searchParams.get("next"),
    request.url,
    "/login",
  );

  return NextResponse.redirect(new URL(next, request.url));
}
