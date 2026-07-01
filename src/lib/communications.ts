import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEventBroadcastEmails } from "@/lib/email";

export type CommunicationAudience = "all_active" | "confirmed" | "checked_in";

// Cada audiencia mapea a los estados de inscripcion ACTIVOS que la componen.
// Nunca se escribe a pending_verification / pending_approval / cancelled.
export const audienceStatuses: Record<CommunicationAudience, string[]> = {
  all_active: ["registered", "checked_in"],
  confirmed: ["registered"],
  checked_in: ["checked_in"],
};

type SnapshotRecipient = { email: string; name: string };

type ClaimedCommunication = {
  id: string;
  event_id: string;
  audience: CommunicationAudience;
  subject: string;
  body: string;
  recipients: SnapshotRecipient[] | null;
};

type StatusPatch = {
  status: "sent" | "failed";
  accepted_count?: number;
  last_error?: string | null;
};

// Reclama hasta `limit` comunicaciones despachables (atomico, via RPC) y las
// envia. Lo usan tanto el despacho inmediato (`after` de la accion) como el cron
// de respaldo; el claim con SKIP LOCKED evita que se pisen.
export async function processPendingCommunications(
  adminClient: SupabaseClient,
  limit: number,
) {
  const { data, error } = await adminClient.rpc("claim_communications", {
    p_limit: limit,
  });

  if (error) {
    console.error("No se pudieron reclamar comunicaciones", error);
    return { claimed: 0, processed: 0 };
  }

  const rows = (data ?? []) as ClaimedCommunication[];

  for (const communication of rows) {
    await dispatchCommunication(adminClient, communication);
  }

  return { claimed: rows.length, processed: rows.length };
}

async function dispatchCommunication(
  adminClient: SupabaseClient,
  communication: ClaimedCommunication,
) {
  const { data: event } = await adminClient
    .from("events")
    .select("name")
    .eq("id", communication.event_id)
    .single<{ name: string }>();

  // Se envia contra el snapshot capturado al encolar (orden y set estables), no
  // recomputando la audiencia: asi los lotes y sus idempotency-keys por indice
  // son identicos entre reintentos.
  const recipients = communication.recipients ?? [];

  if (recipients.length === 0) {
    await markCommunication(adminClient, communication.id, {
      status: "sent",
      accepted_count: 0,
    });
    return;
  }

  const result = await sendEventBroadcastEmails({
    recipients,
    subject: communication.subject,
    body: communication.body,
    eventName: event?.name ?? "el evento",
    communicationId: communication.id,
  });

  if (!result.sent) {
    await markCommunication(adminClient, communication.id, {
      status: "failed",
      last_error: "proveedor de email no configurado",
    });
    return;
  }

  await markCommunication(adminClient, communication.id, {
    status: result.allSucceeded ? "sent" : "failed",
    accepted_count: result.accepted,
    last_error: result.allSucceeded ? null : "algunos lotes fallaron",
  });
}

// Persiste el estado final. Reintenta: si tras varios intentos no se pudo
// escribir, la fila queda `sending` y el cron la retomara como stale (los
// correos ya enviados no se duplican por la idempotency-key). Nunca se ignora
// el fallo en silencio ni se reporta una entrega que no se registro.
async function markCommunication(
  adminClient: SupabaseClient,
  id: string,
  patch: StatusPatch,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await adminClient
      .from("event_communications")
      .update(patch)
      .eq("id", id);

    if (!error) {
      return;
    }

    console.error(
      "No se pudo persistir el estado de la comunicacion",
      id,
      error,
    );
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }

  console.error(
    "Estado de la comunicacion no persistido tras reintentos; se retomara como stale",
    id,
  );
}
