import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

// Cliente Supabase autenticado con el ACCESS TOKEN del usuario (sin cookies):
// lo usa la API v1 para ejecutar RPCs que dependen de auth.uid()/auth.jwt()
// (p. ej. claim_attendee_identity) con la identidad del portador del token.
export function createSupabaseUserClient(accessToken: string) {
  const env = getPublicEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}
