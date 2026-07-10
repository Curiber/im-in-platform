"use server";

import { revalidatePath } from "next/cache";

import { getAttendeeUser } from "@/lib/attendee-account";
import { formatDateTime } from "@/lib/datetime";
import { sendMeetingAcceptedEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RespondRow = {
  result: string;
  requester_email: string | null;
  requester_name: string | null;
  accepter_name: string | null;
  event_name: string | null;
  starts_at: string | null;
  location_name: string | null;
};

// Acepta o rechaza una reunion recibida, desde el hub /app. El wrapper
// respond_meeting_as_user valida por sesion que el usuario sea el receptor y
// delega en respond_meeting (logica de slots/estado). Al aceptar, notifica al
// proponente (best-effort, misma plantilla que el flujo por evento).
async function respond(formData: FormData, accept: boolean) {
  const meetingId = String(formData.get("meetingId") ?? "");
  if (!meetingId) {
    return;
  }

  const user = await getAttendeeUser();
  if (!user) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("respond_meeting_as_user", {
    p_meeting_id: meetingId,
    p_accept: accept,
  });

  if (error) {
    console.error("No se pudo responder la reunion", error);
    return;
  }

  const outcome = (data as RespondRow[] | null)?.[0];

  if (
    outcome?.result === "accepted" &&
    outcome.requester_email &&
    outcome.starts_at
  ) {
    try {
      await sendMeetingAcceptedEmail({
        requesterEmail: outcome.requester_email,
        requesterName: outcome.requester_name ?? "Asistente",
        accepterName: outcome.accepter_name ?? "Asistente",
        eventName: outcome.event_name ?? "un evento",
        meetingWhen: formatDateTime(outcome.starts_at),
        locationName: outcome.location_name,
        myEventsUrl: `${getAppUrl()}/app`,
      });
    } catch {
      // El email no bloquea la respuesta.
    }
  }

  revalidatePath("/app/reuniones");
}

export async function acceptMeeting(formData: FormData) {
  await respond(formData, true);
}

export async function declineMeeting(formData: FormData) {
  await respond(formData, false);
}
