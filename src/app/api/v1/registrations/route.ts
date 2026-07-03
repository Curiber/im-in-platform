import type { NextRequest } from "next/server";

import { authenticateApiUser, jsonData, jsonError } from "@/lib/api/v1";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseUserClient } from "@/lib/supabase/user";

// GET /api/v1/registrations — inscripciones del usuario de la sesion OTP
// (espejo de /mi para la app): requiere un access token de Supabase (no
// credenciales de inscripcion). Ejecuta el reclamo idempotente
// (claim_attendee_identity, spec 31) antes de listar, para enlazar
// inscripciones posteriores a la creacion de la cuenta.

type MyRegistration = {
  id: string;
  status: string;
  registered_at: string;
  events: {
    id: string;
    slug: string;
    name: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    cover_image_url: string | null;
    networking_enabled: boolean;
    deleted_at: string | null;
    organizations: { suspended_at: string | null } | null;
  } | null;
};

export async function GET(request: NextRequest) {
  const user = await authenticateApiUser(request);

  if (!user) {
    return jsonError(
      "unauthorized",
      "Este endpoint requiere un access token de sesion.",
    );
  }

  // El claim corre con la identidad del portador (auth.uid()/email del JWT):
  // cliente user-scoped, no el admin.
  const bearer = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  await createSupabaseUserClient(bearer).rpc("claim_attendee_identity");

  const { data: registrations } = await createSupabaseAdminClient()
    .from("event_registrations")
    .select(
      "id, status, registered_at, events(id, slug, name, starts_at, ends_at, location, cover_image_url, networking_enabled, deleted_at, organizations(suspended_at))",
    )
    .eq("user_id", user.id)
    .order("registered_at", { ascending: false })
    .returns<MyRegistration[]>();

  // Eventos borrados o de organizaciones suspendidas no se exponen.
  const visible = (registrations ?? []).filter(
    (registration) =>
      registration.events &&
      !registration.events.deleted_at &&
      !registration.events.organizations?.suspended_at,
  );

  return jsonData({
    registrations: visible.map((registration) => ({
      id: registration.id,
      status: registration.status,
      registeredAt: registration.registered_at,
      event: registration.events
        ? {
            id: registration.events.id,
            slug: registration.events.slug,
            name: registration.events.name,
            startsAt: registration.events.starts_at,
            endsAt: registration.events.ends_at,
            location: registration.events.location,
            coverImageUrl: registration.events.cover_image_url,
            networkingEnabled: registration.events.networking_enabled,
          }
        : null,
    })),
  });
}
