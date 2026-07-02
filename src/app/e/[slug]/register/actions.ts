"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { sendRegistrationVerificationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { getEventProfileOptions } from "@/lib/event-profile-options";
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
    .select("id, status, name, starts_at, organizations(suspended_at)")
    .eq("id", parsed.data.eventId)
    .eq("slug", parsed.data.slug)
    .is("deleted_at", null)
    .single<{
      id: string;
      status: string;
      name: string;
      starts_at: string;
      organizations: { suspended_at: string | null } | null;
    }>();

  // Fast-fail uniforme. La RPC `register_attendee` es la validacion autoritativa
  // bajo lock (estado, suspension de la organizacion, fin del evento, capacidad,
  // duplicado), asi que aqui no se mira el email del que se inscribe (sin
  // enumeracion) ni se valida capacidad.
  if (
    !event ||
    event.status !== "published" ||
    event.organizations?.suspended_at
  ) {
    return {
      status: "error",
      message: "Este evento no esta disponible para inscripcion.",
    };
  }

  // El catalogo de opciones no es solo de UI: se valida el area y los intereses
  // enviados contra las opciones efectivas del evento (propias o defaults). El
  // Server Action es invocable directo, asi que no se confia en el formulario.
  const eventOptions = await getEventProfileOptions(adminClient, event.id);
  const industryValid = eventOptions.industries.includes(parsed.data.industry);
  const interestsValid = parsed.data.interests.every((interest) =>
    eventOptions.interests.includes(interest),
  );

  if (!industryValid || !interestsValid) {
    return {
      status: "error",
      message: "Selecciona un area y unos intereses validos para este evento.",
    };
  }

  // El perfil persistente NO se toca aqui: la inscripcion nace en
  // `pending_verification` y el perfil se crea/enlaza solo al verificar el email
  // (ver /verify). Asi una inscripcion con un email ajeno no crea ni corrompe el
  // perfil de otra persona.

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

  // Duplicado por carrera concurrente (otra inscripcion del mismo email se creo
  // entre el pre-chequeo y la RPC): respuesta neutra, igual que el exito.
  if (outcome.result_status === "duplicate") {
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

  // El email se envia DESPUES de la respuesta (after): no bloquea la respuesta
  // ni introduce un canal lateral por tiempo. after() no es una cola durable ni
  // reintenta, por eso se loguea cualquier fallo de envio.
  const registrationId = outcome.registration_id;
  after(async () => {
    try {
      const result = await sendRegistrationVerificationEmail({
        attendeeName: parsed.data.fullName,
        verificationUrl: `${getAppUrl()}/e/${parsed.data.slug}/verify?registrationId=${registrationId}&token=${token}`,
        eventDate: formatDate(event.starts_at),
        eventName: event.name,
        to: parsed.data.email,
      });

      if (!result.sent) {
        console.error(
          "Email de verificacion no enviado",
          registrationId,
          "error" in result ? result.error : undefined,
        );
      }
    } catch (emailError) {
      console.error("Fallo al enviar el email de verificacion", emailError);
    }
  });

  redirect(`/e/${parsed.data.slug}/check-email`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
