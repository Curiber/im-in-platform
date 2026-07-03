import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // `next` opcional (mismo criterio seguro que /auth/callback): el asistente
  // vuelve a /mi/login; el admin sigue cayendo en /login por defecto.
  const next = getSafeNextPath(new URL(request.url).searchParams.get("next"));

  return NextResponse.redirect(new URL(next, request.url));
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/login";
  }

  return next;
}
