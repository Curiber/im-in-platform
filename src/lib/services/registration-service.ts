// Servicio de inscripcion (Fase 5.0, spec 29).
//
// Logica extraida de la server action de registro para que la web y la API v1
// compartan exactamente las mismas reglas. El cliente Supabase se inyecta
// (patron de getEventProfileOptions); el servicio no conoce Next (el envio de
// email post-respuesta con after() queda en el caller).

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEventProfileOptions } from "@/lib/event-profile-options";
import { validateProfileSelections } from "@/lib/profile-options";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/registration-token";
import { callRpcWithRetry } from "@/lib/services/rpc-retry";

export type RegisterAttendeeInput = {
  eventId: string;
  slug: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  company: string;
  industry: string;
  interests: string[];
  goalsSeeking: string[];
  goalsOffering: string[];
  networkingOptIn: boolean;
  publicProfileEnabled: boolean;
};

export type RegisterAttendeeResult =
  | {
      status: "ok";
      registrationId: string;
      // El token en claro solo existe aqui (su hash queda en DB): el caller lo
      // usa para armar el link de verificacion y luego se descarta.
      token: string;
      event: { name: string; startsAt: string };
    }
  // Duplicado por carrera: respuesta neutra, el caller responde igual que el
  // exito (sin enumeracion de emails).
  | { status: "duplicate" }
  | { status: "unavailable" | "ended" | "capacity_full" | "invalid_selection" | "error" };

type RegistrationEvent = {
  id: string;
  status: string;
  name: string;
  starts_at: string;
  organizations: { suspended_at: string | null } | null;
};

type RegisterRpcRow = { result_status?: string; registration_id?: string };

export async function registerAttendee(
  client: SupabaseClient,
  input: RegisterAttendeeInput,
): Promise<RegisterAttendeeResult> {
  const { data: event } = await client
    .from("events")
    .select("id, status, name, starts_at, organizations(suspended_at)")
    .eq("id", input.eventId)
    .eq("slug", input.slug)
    .is("deleted_at", null)
    .single<RegistrationEvent>();

  // Fast-fail uniforme. La RPC `register_attendee` es la validacion
  // autoritativa bajo lock (estado, suspension, fin del evento, capacidad,
  // duplicado); aqui no se mira el email (sin enumeracion) ni la capacidad.
  if (
    !event ||
    event.status !== "published" ||
    event.organizations?.suspended_at
  ) {
    return { status: "unavailable" };
  }

  // El catalogo no es solo de UI: area/intereses/objetivos se validan contra
  // las opciones efectivas del evento.
  const catalog = await getEventProfileOptions(client, event.id);

  if (
    !validateProfileSelections(catalog, {
      industry: input.industry,
      interests: input.interests,
      goalsSeeking: input.goalsSeeking,
      goalsOffering: input.goalsOffering,
    })
  ) {
    return { status: "invalid_selection" };
  }

  // Token y request_id se generan UNA vez: si la RPC commitea pero la
  // respuesta se pierde, el reintento con el mismo request_id recupera la
  // inscripcion y entrega el MISMO token (su hash ya quedo almacenado).
  const token = createRegistrationToken();
  const requestId = crypto.randomUUID();

  const rpcArgs = {
    p_event_id: input.eventId,
    p_email: input.email,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_role: input.role,
    p_company: input.company,
    p_industry: input.industry,
    p_interests: input.interests,
    p_goals_seeking: input.goalsSeeking,
    p_goals_offering: input.goalsOffering,
    p_networking_opt_in: input.networkingOptIn,
    p_public_profile_enabled: input.publicProfileEnabled,
    p_qr_token_hash: hashRegistrationToken(token),
    p_request_id: requestId,
  };

  const result = await callRpcWithRetry<RegisterRpcRow[]>(
    // client.rpc devuelve un thenable (builder), no una Promise: se envuelve
    // en una funcion async para materializar la respuesta.
    async () => await client.rpc("register_attendee", rpcArgs),
    {
      onExhausted: (failure) =>
        console.error("Inscripcion sin resultado tras reintentos", failure),
    },
  );

  if (result.kind === "error") {
    return { status: "error" };
  }

  const outcome = result.data?.[0] ?? {};

  if (outcome.result_status === "duplicate") {
    return { status: "duplicate" };
  }

  if (outcome.result_status !== "ok" || !outcome.registration_id) {
    if (
      outcome.result_status === "unavailable" ||
      outcome.result_status === "ended" ||
      outcome.result_status === "capacity_full"
    ) {
      return { status: outcome.result_status };
    }

    return { status: "error" };
  }

  return {
    status: "ok",
    registrationId: outcome.registration_id,
    token,
    event: { name: event.name, startsAt: event.starts_at },
  };
}
