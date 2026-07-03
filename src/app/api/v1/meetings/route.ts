import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  authenticateApiRequest,
  jsonData,
  jsonError,
  toMeetingDto,
} from "@/lib/api/v1";
import { loadRegistrationContacts } from "@/lib/services/connection-service";
import {
  listMeetings,
  loadMeetingLocations,
  type MeetingActionStatus,
  proposeMeeting,
} from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/meetings — reuniones del portador con contraparte y lugar.
// POST /api/v1/meetings — propone una reunion (la RPC valida bajo el lock).

export async function GET(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  const adminClient = createSupabaseAdminClient();
  const meetings = await listMeetings(adminClient, viewer);

  const [contacts, locations] = await Promise.all([
    loadRegistrationContacts(
      adminClient,
      meetings.map((meeting) =>
        meeting.requester_registration_id === viewer.id
          ? meeting.receiver_registration_id
          : meeting.requester_registration_id,
      ),
    ),
    loadMeetingLocations(
      adminClient,
      meetings
        .map((meeting) => meeting.location_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]);

  return jsonData({
    meetings: meetings.map((meeting) =>
      toMeetingDto(meeting, {
        contact: contacts.get(
          meeting.requester_registration_id === viewer.id
            ? meeting.receiver_registration_id
            : meeting.requester_registration_id,
        ),
        locationName: meeting.location_id
          ? (locations.get(meeting.location_id) ?? null)
          : null,
        viewerId: viewer.id,
      }),
    ),
  });
}

const proposeSchema = z.object({
  receiverRegistrationId: z.string().uuid(),
  startsAt: z.string().datetime(),
  locationId: z.string().uuid().nullish(),
  message: z.string().trim().max(280).nullish(),
});

// Mapea el result_status de la RPC al codigo de error del envelope.
const proposeErrors: Partial<Record<MeetingActionStatus, Parameters<typeof jsonError>[0]>> = {
  unavailable: "unavailable",
  invalid_participant: "not_found",
  invalid_slot: "invalid_request",
  invalid_location: "invalid_request",
  conflict: "conflict",
  expired: "expired",
  not_found: "not_found",
  error: "internal",
};

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

  const parsed = proposeSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Cuerpo invalido.",
    );
  }

  const status = await proposeMeeting(
    createSupabaseAdminClient(),
    viewer,
    {
      locationId: parsed.data.locationId ?? null,
      message: parsed.data.message ?? null,
      startsAt: new Date(parsed.data.startsAt),
    },
    parsed.data.receiverRegistrationId,
  );

  if (status !== "ok") {
    return jsonError(proposeErrors[status] ?? "internal");
  }

  return jsonData({ status: "proposed" }, { status: 201 });
}
