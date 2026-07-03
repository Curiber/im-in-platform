"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { sendRegistrationVerificationEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { formatDateTime } from "@/lib/datetime";
import { registerAttendee } from "@/lib/services/registration-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Action delgada (Fase 5.0, spec 29): parsea el formulario, delega en el
// servicio compartido con la API v1 y traduce el resultado a UI. El envio del
// email queda aqui porque usa after() (primitiva de Next que el servicio no
// conoce).

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
  goalsSeeking: z
    .array(z.string().trim())
    .max(3, "Selecciona hasta 3 objetivos que buscas."),
  goalsOffering: z
    .array(z.string().trim())
    .max(3, "Selecciona hasta 3 objetivos que ofreces."),
  networkingOptIn: z.boolean(),
  publicProfileEnabled: z.boolean(),
  dataConsent: z.literal(true),
});

export type RegistrationActionState = {
  status: "idle" | "error";
  message: string;
};

const errorMessages: Record<string, string> = {
  unavailable: "Este evento no esta disponible para inscripcion.",
  ended: "Este evento ya termino.",
  capacity_full: "Este evento ya completo sus cupos.",
  invalid_selection:
    "Selecciona un area, intereses y objetivos validos para este evento.",
  error: "No pudimos completar la inscripcion. Intentalo nuevamente.",
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
    goalsSeeking: formData.getAll("goalsSeeking"),
    goalsOffering: formData.getAll("goalsOffering"),
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

  const result = await registerAttendee(createSupabaseAdminClient(), {
    eventId: parsed.data.eventId,
    slug: parsed.data.slug,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    company: parsed.data.company,
    industry: parsed.data.industry,
    interests: parsed.data.interests,
    goalsSeeking: parsed.data.goalsSeeking,
    goalsOffering: parsed.data.goalsOffering,
    networkingOptIn: parsed.data.networkingOptIn,
    publicProfileEnabled: parsed.data.publicProfileEnabled,
  });

  // Duplicado por carrera: respuesta neutra, igual que el exito (sin
  // enumeracion de emails).
  if (result.status === "duplicate") {
    redirect(`/e/${parsed.data.slug}/check-email`);
  }

  if (result.status !== "ok") {
    return {
      status: "error",
      message: errorMessages[result.status] ?? errorMessages.error,
    };
  }

  // El email se envia DESPUES de la respuesta (after): no bloquea la respuesta
  // ni introduce un canal lateral por tiempo. after() no es una cola durable ni
  // reintenta, por eso se loguea cualquier fallo de envio.
  const { registrationId, token, event } = result;
  after(async () => {
    try {
      const emailResult = await sendRegistrationVerificationEmail({
        attendeeName: parsed.data.fullName,
        verificationUrl: `${getAppUrl()}/e/${parsed.data.slug}/verify?registrationId=${registrationId}&token=${token}`,
        eventDate: formatDateTime(event.startsAt),
        eventName: event.name,
        to: parsed.data.email,
      });

      if (!emailResult.sent) {
        console.error(
          "Email de verificacion no enviado",
          registrationId,
          "error" in emailResult ? emailResult.error : undefined,
        );
      }
    } catch (emailError) {
      console.error("Fallo al enviar el email de verificacion", emailError);
    }
  });

  redirect(`/e/${parsed.data.slug}/check-email`);
}
