"use server";

import { revalidatePath } from "next/cache";

import { getAttendeeUser } from "@/lib/attendee-account";
import { sendConnectionAcceptedEmail } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RespondRow = {
  result: string;
  requester_email: string | null;
  requester_name: string | null;
  receiver_email: string | null;
  receiver_name: string | null;
  event_name: string | null;
};

// Acepta o rechaza una solicitud de conexion recibida, desde el hub /app. El
// RPC valida por sesion que el usuario sea el receptor y que siga pendiente;
// aqui solo se invoca, se notifica (al aceptar) y se revalida.
async function respond(formData: FormData, accept: boolean) {
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) {
    return;
  }

  const user = await getAttendeeUser();
  if (!user) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("respond_to_connection_request", {
    p_request_id: requestId,
    p_accept: accept,
  });

  if (error) {
    console.error("No se pudo responder la solicitud de conexion", error);
    return;
  }

  const outcome = (data as RespondRow[] | null)?.[0];

  // Al aceptar, notificar (best-effort, misma plantilla que el flujo por evento).
  if (
    outcome?.result === "accepted" &&
    outcome.requester_email &&
    outcome.receiver_email
  ) {
    try {
      await sendConnectionAcceptedEmail({
        eventName: outcome.event_name ?? "un evento",
        receiverEmail: outcome.receiver_email,
        receiverName: outcome.receiver_name ?? "Asistente",
        requesterEmail: outcome.requester_email,
        requesterName: outcome.requester_name ?? "Asistente",
      });
    } catch {
      // El email no bloquea la respuesta.
    }
  }

  revalidatePath("/app/conexiones");
}

export async function acceptConnection(formData: FormData) {
  await respond(formData, true);
}

export async function rejectConnection(formData: FormData) {
  await respond(formData, false);
}
