import type { NextRequest } from "next/server";
import { z } from "zod";

import { authenticateApiRequest, jsonData, jsonError } from "@/lib/api/v1";
import { respondToConnectionRequest } from "@/lib/services/connection-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/connections/{requestId}/respond { accept: boolean } — solo el
// receiver puede responder una solicitud pendiente (regla del servicio).

const bodySchema = z.object({ accept: z.boolean() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  const { requestId } = await params;

  if (!z.string().uuid().safeParse(requestId).success) {
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

  const result = await respondToConnectionRequest(
    createSupabaseAdminClient(),
    viewer,
    requestId,
    parsed.data.accept ? "accepted" : "rejected",
  );

  if (result === "not_found") {
    return jsonError("not_found", "La solicitud no existe o ya fue respondida.");
  }

  return jsonData({ status: parsed.data.accept ? "accepted" : "rejected" });
}
