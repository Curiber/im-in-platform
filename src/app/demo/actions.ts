"use server";

import { z } from "zod";

import { sendDemoRequestNotification } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const demoRequestSchema = z.object({
  email: z.string().trim().email("Ingresa un email valido.").toLowerCase(),
  firstName: z.string().trim().min(2, "Ingresa tu nombre."),
  lastName: z.string().trim().min(2, "Ingresa tu apellido."),
  phone: z.string().trim().optional(),
  organizationName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de tu organizacion."),
  country: z.string().trim().optional(),
  organizationType: z.string().trim().optional(),
  annualAttendees: z.string().trim().optional(),
  message: z.string().trim().max(1000).optional(),
  referralSource: z.string().trim().max(200).optional(),
  contactConsent: z.literal(true, {
    message: "Necesitamos tu consentimiento para contactarte.",
  }),
});

export type DemoRequestActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function submitDemoRequest(
  _state: DemoRequestActionState,
  formData: FormData,
): Promise<DemoRequestActionState> {
  const parsed = demoRequestSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    organizationName: formData.get("organizationName"),
    country: formData.get("country"),
    organizationType: formData.get("organizationType"),
    annualAttendees: formData.get("annualAttendees"),
    message: formData.get("message"),
    referralSource: formData.get("referralSource"),
    contactConsent: formData.get("contactConsent") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Revisa los campos obligatorios del formulario.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("demo_requests").insert({
    email: parsed.data.email,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone || null,
    organization_name: parsed.data.organizationName,
    country: parsed.data.country || null,
    organization_type: parsed.data.organizationType || null,
    annual_attendees: parsed.data.annualAttendees || null,
    message: parsed.data.message || null,
    referral_source: parsed.data.referralSource || null,
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos enviar tu solicitud. Intentalo nuevamente.",
    };
  }

  try {
    await sendDemoRequestNotification({
      email: parsed.data.email,
      fullName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      organizationName: parsed.data.organizationName,
      country: parsed.data.country,
      organizationType: parsed.data.organizationType,
      annualAttendees: parsed.data.annualAttendees,
      message: parsed.data.message,
    });
  } catch {
    // La notificacion es best-effort: no debe invalidar un lead ya guardado.
  }

  return {
    status: "success",
    message: "Gracias. Recibimos tu solicitud y te contactaremos muy pronto.",
  };
}
