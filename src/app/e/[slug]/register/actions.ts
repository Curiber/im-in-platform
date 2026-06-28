"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { sendRegistrationVerificationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/registration-token";

const registrationSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  email: z.string().trim().email("Ingresa un email valido.").toLowerCase(),
  phone: z.string().trim().optional(),
  role: z.string().trim().min(2, "Ingresa tu cargo o rol."),
  company: z.string().trim().min(2, "Ingresa tu empresa u organizacion."),
  industry: z.string().trim().min(2, "Selecciona tu area o industria."),
  interests: z.array(z.string().trim()).min(1).max(5),
  networkingOptIn: z.boolean(),
  publicProfileEnabled: z.boolean(),
  dataConsent: z.literal(true),
});

export type RegistrationActionState = {
  status: "idle" | "error";
  message: string;
};

export async function registerForEvent(
  _state: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const networkingOptIn = formData.get("networkingOptIn") === "on";

  const parsed = registrationSchema.safeParse({
    eventId: formData.get("eventId"),
    slug: formData.get("slug"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    company: formData.get("company"),
    industry: formData.get("industry"),
    interests: formData.getAll("interests"),
    networkingOptIn,
    publicProfileEnabled: networkingOptIn,
    dataConsent: formData.get("dataConsent") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Revisa los campos obligatorios de la inscripcion.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: event } = await adminClient
    .from("events")
    .select("id, capacity, status, slug, name, starts_at, ends_at")
    .eq("id", parsed.data.eventId)
    .eq("slug", parsed.data.slug)
    .is("deleted_at", null)
    .single<{
      id: string;
      capacity: number;
      status: string;
      slug: string;
      name: string;
      starts_at: string;
      ends_at: string | null;
    }>();

  if (!event || event.status !== "published") {
    return {
      status: "error",
      message: "Este evento no esta disponible para inscripcion.",
    };
  }

  // Validaciones baratas ANTES de tocar el perfil, para no persistir datos
  // personales si la inscripcion sera rechazada. La RPC vuelve a validarlas
  // bajo lock (autoritativo); esto solo evita el caso comun. La deferral total
  // del perfil hasta verificar el email es del Epic 23.
  if (event.ends_at && new Date(event.ends_at).getTime() < Date.now()) {
    return { status: "error", message: "Este evento ya termino." };
  }

  const { count } = await adminClient
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  if ((count ?? 0) >= event.capacity) {
    return {
      status: "error",
      message: "Este evento ya completo sus cupos.",
    };
  }

  // No se toca el perfil persistente aqui: la inscripcion nace en
  // `pending_verification` y el perfil global se crea/actualiza solo al
  // verificar el email (ver /verify). Asi una inscripcion con un email ajeno no
  // crea ni corrompe el perfil de otra persona.

  // Token y request_id se generan UNA vez: si la RPC commitea pero la respuesta
  // se pierde, el reintento con el mismo request_id recupera la inscripcion y
  // entrega el MISMO token (su hash ya quedo almacenado).
  const token = createRegistrationToken();
  const tokenHash = hashRegistrationToken(token);
  const requestId = crypto.randomUUID();

  const rpcArgs = {
    p_event_id: parsed.data.eventId,
    p_email: parsed.data.email,
    p_full_name: parsed.data.fullName,
    p_phone: parsed.data.phone || null,
    p_role: parsed.data.role,
    p_company: parsed.data.company,
    p_industry: parsed.data.industry,
    p_interests: parsed.data.interests,
    p_networking_opt_in: parsed.data.networkingOptIn,
    p_public_profile_enabled: parsed.data.publicProfileEnabled,
    p_qr_token_hash: tokenHash,
    p_request_id: requestId,
  };

  const MAX_ATTEMPTS = 3;
  let outcome: { result_status?: string; registration_id?: string } | undefined;
  let definitiveError = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !outcome; attempt += 1) {
    let response;

    try {
      response = await adminClient.rpc("register_attendee", rpcArgs);
    } catch (transportError) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("Error de transporte al inscribir", transportError);
      }
      continue; // ambiguo: reintentar con el mismo request_id (idempotente)
    }

    if (!response.error) {
      outcome = response.data?.[0] ?? {};
      break;
    }

    // status 0 (sin respuesta real, supabase-js no lanza) o 5xx = ambiguo.
    if (response.status === 0 || response.status >= 500) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("Respuesta ambigua al inscribir", response.status, response.error);
      }
      continue;
    }

    definitiveError = true;
    break;
  }

  if (definitiveError || !outcome) {
    return {
      status: "error",
      message: "No pudimos completar la inscripcion. Intentalo nuevamente.",
    };
  }

  const appUrl = getAppUrl();

  // El token viaja SOLO por email, en el link de verificacion. Loguea si el
  // envio no ocurre para no perder el fallo en silencio.
  const sendVerification = async (
    targetRegistrationId: string,
    verifyToken: string,
  ) => {
    const verificationPath = `/e/${parsed.data.slug}/verify?registrationId=${targetRegistrationId}&token=${verifyToken}`;

    try {
      const result = await sendRegistrationVerificationEmail({
        attendeeName: parsed.data.fullName,
        verificationUrl: `${appUrl}${verificationPath}`,
        eventDate: formatDate(event.starts_at),
        eventName: event.name,
        to: parsed.data.email,
      });

      if (!result.sent) {
        console.error(
          "Email de verificacion no enviado (proveedor sin configurar)",
          targetRegistrationId,
        );
      }
    } catch (emailError) {
      console.error("Fallo al enviar el email de verificacion", emailError);
    }
  };

  // Duplicado: mensaje neutro (misma pantalla que el exito) para no enumerar
  // emails. Si la inscripcion existente sigue pendiente, se rota el token y se
  // reenvia el link (recupera a quien no recibio el primer correo o cuyo envio
  // fallo). Una inscripcion ya verificada no se toca.
  if (outcome.result_status === "duplicate") {
    const { data: existing } = await adminClient
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", parsed.data.eventId)
      .eq("email", parsed.data.email)
      .maybeSingle<{ id: string; status: string }>();

    if (existing?.status === "pending_verification") {
      const resendToken = createRegistrationToken();
      const { error: rotateError } = await adminClient
        .from("event_registrations")
        .update({ qr_token_hash: hashRegistrationToken(resendToken) })
        .eq("id", existing.id)
        .eq("status", "pending_verification");

      if (!rotateError) {
        await sendVerification(existing.id, resendToken);
      }
    }

    redirect(`/e/${parsed.data.slug}/check-email`);
  }

  const messagesByStatus: Record<string, string> = {
    unavailable: "Este evento no esta disponible para inscripcion.",
    ended: "Este evento ya termino.",
    capacity_full: "Este evento ya completo sus cupos.",
  };

  if (outcome.result_status !== "ok" || !outcome.registration_id) {
    return {
      status: "error",
      message:
        messagesByStatus[outcome.result_status ?? ""] ??
        "No pudimos completar la inscripcion. Intentalo nuevamente.",
    };
  }

  await sendVerification(outcome.registration_id, token);

  redirect(`/e/${parsed.data.slug}/check-email`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
