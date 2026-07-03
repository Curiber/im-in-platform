import type { NextRequest } from "next/server";
import { z } from "zod";

import { authenticateApiRequest, jsonData, jsonError } from "@/lib/api/v1";
import {
  type MeetingActionStatus,
  respondMeeting,
} from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/meetings/{meetingId}/respond { accept: boolean } — solo el
// receiver; al aceptar la RPC revalida evento/participantes/solapes/capacidad
// bajo el lock (spec 27).

const bodySchema = z.object({ accept: z.boolean() });

const responseErrors: Partial<Record<MeetingActionStatus, Parameters<typeof jsonError>[0]>> = {
  unavailable: "unavailable",
  invalid_participant: "conflict",
  invalid_location: "conflict",
  conflict: "conflict",
  expired: "expired",
  not_found: "not_found",
  error: "internal",
};

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", "El cuerpo debe ser JSON.");
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("invalid_request");
  }

  const status = await respondMeeting(
    createSupabaseAdminClient(),
    viewer,
    meetingId,
    parsed.data.accept,
  );

  if (status !== "ok") {
    return jsonError(responseErrors[status] ?? "internal");
  }

  return jsonData({ status: parsed.data.accept ? "accepted" : "declined" });
}
