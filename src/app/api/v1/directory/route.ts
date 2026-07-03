import type { NextRequest } from "next/server";

import {
  authenticateApiRequest,
  jsonData,
  jsonError,
  toDirectoryProfileDto,
} from "@/lib/api/v1";
import {
  filterDirectoryProfiles,
  listDirectoryProfiles,
  rankSuggestedMatches,
  viewerMatchProfile,
} from "@/lib/services/directory-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/directory?q=&industry=&interest= — perfiles visibles del evento
// (mismos filtros que la web) + sugeridos por score con razones (spec 26).

export async function GET(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  if (!viewer.events?.networking_enabled) {
    return jsonError("networking_disabled");
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const industry = request.nextUrl.searchParams.get("industry") ?? undefined;
  const interest = request.nextUrl.searchParams.get("interest") ?? undefined;

  const profiles = await listDirectoryProfiles(
    createSupabaseAdminClient(),
    viewer.event_id,
  );

  const filtered = filterDirectoryProfiles(profiles, { industry, interest, q });
  const suggested = rankSuggestedMatches(
    viewerMatchProfile(viewer),
    viewer.id,
    profiles,
  );

  return jsonData({
    profiles: filtered.map(toDirectoryProfileDto),
    suggested: suggested.map(({ profile, match }) => ({
      profile: toDirectoryProfileDto(profile),
      score: match.score,
      reasons: match.reasons,
    })),
  });
}
