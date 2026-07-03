import type { NextRequest } from "next/server";
import { z } from "zod";

import { authenticateApiRequest, jsonData, jsonError } from "@/lib/api/v1";
import { cancelMeeting } from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/meetings/{meetingId}/cancel — cualquiera de los dos
// participantes cancela una reunion pendiente o aceptada.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  const { meetingId } = await params;

  if (!z.string().uuid().safeParse(meetingId).success) {
    return jsonError("invalid_request");
  }

  const status = await cancelMeeting(
    createSupabaseAdminClient(),
    viewer,
    meetingId,
  );

  if (status === "not_found") {
    return jsonError("not_found", "La reunion no existe o ya no es cancelable.");
  }

  if (status !== "ok") {
    return jsonError("internal");
  }

  return jsonData({ status: "cancelled" });
}
