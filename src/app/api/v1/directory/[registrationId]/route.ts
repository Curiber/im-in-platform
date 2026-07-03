import type { NextRequest } from "next/server";

import {
  authenticateApiRequest,
  jsonData,
  jsonError,
  toDirectoryProfileDto,
} from "@/lib/api/v1";
import { scoreMatch } from "@/lib/matchmaking";
import {
  type DirectoryProfile,
  recordProfileView,
  toMatchProfile,
  viewerMatchProfile,
} from "@/lib/services/directory-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/directory/{registrationId} — detalle de un perfil visible del
// mismo evento + razones del match contra el portador + estado de conexion.
// Registra la vista de perfil (igual que la web).

type DirectoryProfileDetail = DirectoryProfile & {
  attendee_profiles: {
    headline: string | null;
    avatar_url: string | null;
    description: string | null;
  } | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> },
) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  if (!viewer.events?.networking_enabled) {
    return jsonError("networking_disabled");
  }

  const { registrationId } = await params;
  const adminClient = createSupabaseAdminClient();

  const { data: profile } = await adminClient
    .from("event_registrations")
    .select(
      "id, full_name_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests, goals_seeking, goals_offering, attendee_profiles(headline, avatar_url, description)",
    )
    .eq("id", registrationId)
    .eq("event_id", viewer.event_id)
    .eq("public_profile_enabled", true)
    .in("status", ["registered", "checked_in"])
    .single<DirectoryProfileDetail>();

  if (!profile) {
    return jsonError("not_found");
  }

  await recordProfileView(adminClient, {
    eventId: viewer.event_id,
    viewedRegistrationId: profile.id,
    viewerRegistrationId: viewer.id,
  });

  const { data: existingConnection } = await adminClient
    .from("connection_requests")
    .select("id, status, requester_registration_id")
    .eq("event_id", viewer.event_id)
    .in("status", ["pending", "accepted"])
    .or(
      [
        `and(requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${profile.id})`,
        `and(requester_registration_id.eq.${profile.id},receiver_registration_id.eq.${viewer.id})`,
      ].join(","),
    )
    .maybeSingle<{
      id: string;
      status: "pending" | "accepted";
      requester_registration_id: string;
    }>();

  const match =
    profile.id !== viewer.id
      ? scoreMatch(viewerMatchProfile(viewer), toMatchProfile(profile))
      : null;

  return jsonData({
    profile: {
      ...toDirectoryProfileDto(profile),
      description: profile.attendee_profiles?.description ?? null,
    },
    match: match ? { score: match.score, reasons: match.reasons } : null,
    connection: existingConnection
      ? {
          id: existingConnection.id,
          status: existingConnection.status,
          direction:
            existingConnection.requester_registration_id === viewer.id
              ? "sent"
              : "received",
        }
      : null,
  });
}
