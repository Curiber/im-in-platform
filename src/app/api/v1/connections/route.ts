import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  authenticateApiRequest,
  jsonData,
  jsonError,
  toContactDto,
} from "@/lib/api/v1";
import {
  createConnectionRequest,
  listConnections,
} from "@/lib/services/connection-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/connections — recibidas y enviadas del portador. El email del
// contacto SOLO viaja en conexiones aceptadas (regla de privacidad de la web).
// POST /api/v1/connections — crea una solicitud hacia un perfil visible.

export async function GET(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  const { received, sent, contacts } = await listConnections(
    createSupabaseAdminClient(),
    viewer,
  );

  return jsonData({
    received: received.map((request_) => ({
      id: request_.id,
      status: request_.status,
      createdAt: request_.created_at,
      contact: toContactDto(contacts.get(request_.requester_registration_id), {
        includeEmail: request_.status === "accepted",
      }),
    })),
    sent: sent.map((request_) => ({
      id: request_.id,
      status: request_.status,
      createdAt: request_.created_at,
      contact: toContactDto(contacts.get(request_.receiver_registration_id), {
        includeEmail: request_.status === "accepted",
      }),
    })),
  });
}

const createSchema = z.object({
  receiverRegistrationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  if (!viewer.events?.networking_enabled) {
    return jsonError("networking_disabled");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", "El cuerpo debe ser JSON.");
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("invalid_request");
  }

  const result = await createConnectionRequest(
    createSupabaseAdminClient(),
    viewer,
    parsed.data.receiverRegistrationId,
  );

  if (result === "invalid") {
    return jsonError("not_found", "El receptor no esta disponible.");
  }

  // "exists" es idempotente: ya hay una solicitud viva entre la pareja.
  return jsonData({ status: result }, { status: result === "created" ? 201 : 200 });
}
