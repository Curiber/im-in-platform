"use server";

import { z } from "zod";

import { getAppUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Login OTP del ASISTENTE (Fase 5.2, spec 31). Mismo mecanismo que el admin
// (Supabase Auth, magic link por email) pero aterrizando en /mi. No requiere
// invitacion: cualquier email puede crear cuenta; el reclamo de inscripciones
// (claim_attendee_identity) solo enlaza lo que ese email inscribio.

const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido."),
});

export type AttendeeLoginState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function sendAttendeeMagicLink(
  _state: AttendeeLoginState,
  formData: FormData,
): Promise<AttendeeLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el email.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/mi`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos enviar el link. Intentalo nuevamente.",
    };
  }

  return {
    status: "success",
    message: "Te enviamos un link de acceso. Revisa tu correo.",
  };
}
