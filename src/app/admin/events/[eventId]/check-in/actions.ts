"use server";

import { z } from "zod";

import { isRegistrationTokenValid } from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkInPayloadSchema = z.object({
  kind: z.literal("im-in-check-in"),
  registrationId: z.string().uuid(),
  token: z.string().min(16),
});

export type CheckInActionState = {
  status: "idle" | "success" | "error" | "warning";
  message: string;
  attendeeName?: string;
};

export async function checkInAttendee(
  _state: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  const eventId = String(formData.get("eventId") ?? "");
  const rawPayload = String(formData.get("payload") ?? "").trim();

  if (!eventId || !rawPayload) {
    return {
      status: "error",
      message: "Escanea o pega un QR valido.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Debes iniciar sesion para acreditar asistentes.",
    };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organizations(suspended_at)")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<{
      id: string;
      organizations: { suspended_at: string | null } | null;
    }>();

  if (!event) {
    return {
      status: "error",
      message: "No tienes permisos para acreditar este evento.",
    };
  }

  // La acreditacion escribe via service_role: el chequeo de suspension debe
  // vivir aqui (una organizacion suspendida no opera eventos).
  if (event.organizations?.suspended_at) {
    return {
      status: "error",
      message: "La organizacion esta suspendida: check-in deshabilitado.",
    };
  }

  const payload = parsePayload(rawPayload);

  if (!payload) {
    return {
      status: "error",
      message: "El QR no pertenece a I'm IN o esta incompleto.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select(
      "id, event_id, full_name_snapshot, qr_token_hash, status, checked_in_at",
    )
    .eq("id", payload.registrationId)
    .single<{
      id: string;
      event_id: string;
      full_name_snapshot: string;
      qr_token_hash: string;
      status:
        | "pending_verification"
        | "pending_approval"
        | "registered"
        | "checked_in"
        | "cancelled"
        | "no_show";
      checked_in_at: string | null;
    }>();

  if (!registration || registration.event_id !== eventId) {
    return {
      status: "error",
      message: "El QR no corresponde a este evento.",
    };
  }

  if (!isRegistrationTokenValid(payload.token, registration.qr_token_hash)) {
    return {
      status: "error",
      message: "El token del QR no es valido.",
    };
  }

  if (registration.status === "cancelled") {
    return {
      attendeeName: registration.full_name_snapshot,
      status: "error",
      message: "La inscripcion esta cancelada.",
    };
  }

  if (
    registration.status === "pending_verification" ||
    registration.status === "pending_approval"
  ) {
    return {
      attendeeName: registration.full_name_snapshot,
      status: "error",
      message:
        registration.status === "pending_approval"
          ? "Inscripcion pendiente de aprobacion del organizador."
          : "Inscripcion sin verificar el email.",
    };
  }

  if (registration.status === "checked_in") {
    return {
      attendeeName: registration.full_name_snapshot,
      status: "warning",
      message: "Este asistente ya fue acreditado.",
    };
  }

  const { data: checkedIn, error } = await adminClient
    .from("event_registrations")
    .update({
      checked_in_at: new Date().toISOString(),
      status: "checked_in",
    })
    .eq("id", registration.id)
    .eq("status", "registered")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    return {
      status: "error",
      message: "No se pudo registrar el check-in.",
    };
  }

  if (!checkedIn) {
    return {
      attendeeName: registration.full_name_snapshot,
      status: "warning",
      message: "Este asistente ya fue acreditado.",
    };
  }

  return {
    attendeeName: registration.full_name_snapshot,
    status: "success",
    message: "Check-in registrado.",
  };
}

function parsePayload(rawPayload: string) {
  try {
    return checkInPayloadSchema.parse(JSON.parse(rawPayload));
  } catch {
    return null;
  }
}
