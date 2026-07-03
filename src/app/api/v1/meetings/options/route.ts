import type { NextRequest } from "next/server";

import { authenticateApiRequest, jsonData, jsonError } from "@/lib/api/v1";
import { getMeetingProposalOptions } from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/meetings/options — franjas futuras de 30 min y puntos de
// encuentro activos para proponer una reunion.

export async function GET(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  if (!viewer.events?.networking_enabled) {
    return jsonError("networking_disabled");
  }

  const { slots, locations } = await getMeetingProposalOptions(
    createSupabaseAdminClient(),
    viewer,
  );

  return jsonData({ slots, locations });
}
