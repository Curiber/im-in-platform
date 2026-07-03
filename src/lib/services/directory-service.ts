// Servicio de directorio (Fase 5.0, spec 29).
//
// Extraido de las paginas de directorio para compartir consulta, filtros y
// ranking de sugeridos entre la web y la API v1. Los filtros y el ranking son
// puros (testeables sin DB).

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type MatchProfile,
  type MatchResult,
  scoreMatch,
} from "@/lib/matchmaking";
import type { VerifiedRegistration } from "@/lib/registrations";

export type DirectoryProfile = {
  id: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
  goals_seeking: string[];
  goals_offering: string[];
  attendee_profiles: {
    headline: string | null;
    avatar_url: string | null;
  } | null;
};

export type DirectoryFilters = {
  q?: string;
  industry?: string;
  interest?: string;
};

export type SuggestedMatch = {
  profile: DirectoryProfile;
  match: MatchResult;
};

export const SUGGESTED_MATCHES_LIMIT = 4;

// Perfiles visibles del evento (opt-in de networking + inscripcion activa).
export async function listDirectoryProfiles(
  client: SupabaseClient,
  eventId: string,
): Promise<DirectoryProfile[]> {
  const { data } = await client
    .from("event_registrations")
    .select(
      "id, full_name_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests, goals_seeking, goals_offering, attendee_profiles(headline, avatar_url)",
    )
    .eq("event_id", eventId)
    .eq("public_profile_enabled", true)
    .in("status", ["registered", "checked_in"])
    .order("full_name_snapshot", { ascending: true })
    .returns<DirectoryProfile[]>();

  return data ?? [];
}

// Filtro por texto/area/interes (puro, mismo comportamiento que la pagina).
export function filterDirectoryProfiles(
  profiles: DirectoryProfile[],
  { industry, interest, q }: DirectoryFilters,
): DirectoryProfile[] {
  const query = q?.trim().toLowerCase();

  return profiles.filter((profile) => {
    const matchesQuery = query
      ? [
          profile.full_name_snapshot,
          profile.role_snapshot,
          profile.company_snapshot,
          profile.industry_snapshot,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query))
      : true;

    const matchesIndustry = industry
      ? profile.industry_snapshot === industry
      : true;
    const matchesInterest = interest
      ? profile.interests.includes(interest)
      : true;

    return matchesQuery && matchesIndustry && matchesInterest;
  });
}

export function toMatchProfile(profile: {
  goals_seeking: string[];
  goals_offering: string[];
  interests: string[];
  industry_snapshot: string | null;
}): MatchProfile {
  return {
    goalsSeeking: profile.goals_seeking,
    goalsOffering: profile.goals_offering,
    interests: profile.interests,
    industry: profile.industry_snapshot,
  };
}

// Ranking de sugeridos por score compuesto (spec 26): top-N con score > 0,
// empates por nombre. Puro.
export function rankSuggestedMatches(
  viewer: MatchProfile,
  viewerId: string,
  profiles: DirectoryProfile[],
  limit: number = SUGGESTED_MATCHES_LIMIT,
): SuggestedMatch[] {
  return profiles
    .filter((profile) => profile.id !== viewerId)
    .map((profile) => ({
      profile,
      match: scoreMatch(viewer, toMatchProfile(profile)),
    }))
    .filter(({ match }) => match.score > 0)
    .sort(
      (a, b) =>
        b.match.score - a.match.score ||
        a.profile.full_name_snapshot.localeCompare(b.profile.full_name_snapshot),
    )
    .slice(0, limit);
}

export function viewerMatchProfile(
  viewer: VerifiedRegistration,
): MatchProfile {
  return {
    goalsSeeking: viewer.goals_seeking,
    goalsOffering: viewer.goals_offering,
    interests: viewer.interests,
    industry: viewer.industry_snapshot,
  };
}

// Registra la vista de perfil (alimenta el dashboard de networking). No
// registra auto-vistas.
export async function recordProfileView(
  client: SupabaseClient,
  {
    eventId,
    viewedRegistrationId,
    viewerRegistrationId,
  }: {
    eventId: string;
    viewedRegistrationId: string;
    viewerRegistrationId: string;
  },
): Promise<void> {
  if (viewerRegistrationId === viewedRegistrationId) {
    return;
  }

  await client.from("profile_views").insert({
    event_id: eventId,
    viewer_registration_id: viewerRegistrationId,
    viewed_registration_id: viewedRegistrationId,
  });
}
