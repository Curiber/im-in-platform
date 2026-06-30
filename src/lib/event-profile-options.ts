import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_INDUSTRIES,
  DEFAULT_INTERESTS,
  resolveEffectiveOptions,
} from "@/lib/profile-options";

export type ProfileOptionKind = "industry" | "interest";

export type EventProfileOptions = {
  industries: string[];
  interests: string[];
};

type OptionRow = { kind: ProfileOptionKind; label: string };

// Lee las filas personalizadas de un evento (ordenadas por position) y devuelve
// el catalogo efectivo por kind, cayendo a los defaults de plataforma cuando el
// evento no tiene opciones propias para ese kind.
//
// Recibe un cliente Supabase ya construido: las superficies publicas (registro,
// perfil) usan el cliente admin/service_role que ya tienen a mano, evitando una
// segunda conexion.
export async function getEventProfileOptions(
  client: SupabaseClient,
  eventId: string,
): Promise<EventProfileOptions> {
  const { data } = await client
    .from("event_profile_options")
    .select("kind, label")
    .eq("event_id", eventId)
    .order("position", { ascending: true })
    .order("label", { ascending: true })
    .returns<OptionRow[]>();

  const rows = data ?? [];
  const customIndustries = rows
    .filter((row) => row.kind === "industry")
    .map((row) => row.label);
  const customInterests = rows
    .filter((row) => row.kind === "interest")
    .map((row) => row.label);

  return {
    industries: resolveEffectiveOptions(customIndustries, DEFAULT_INDUSTRIES),
    interests: resolveEffectiveOptions(customInterests, DEFAULT_INTERESTS),
  };
}
