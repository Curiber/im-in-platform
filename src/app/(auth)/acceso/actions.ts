"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { claimAttendeeIdentity } from "@/lib/attendee-account";
import { getAppUrl } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ATTENDEE_HOME = "/app";

// Resuelve el destino post-login desde el `next` del formulario, validando el
// origen (no un prefijo de string) para evitar open redirects. Fallback: /app.
function resolveNext(formData: FormData) {
  return safeRedirectPath(
    (formData.get("next") as string | null) ?? null,
    getAppUrl(),
    ATTENDEE_HOME,
  );
}

// El callback de OAuth/magic link vuelve al destino elegido (?next=...).
function callbackUrl(next: string) {
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

const credentialsSchema = z.object({
  email: z.string().trim().email("Ingresa un email valido.").toLowerCase(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

const signUpSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
});

export type AccessActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function signInWithPassword(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa tus datos.",
    };
  }

  const next = resolveNext(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mensaje neutro: no distingue entre email inexistente y contrasena
    // incorrecta (evita enumeracion de cuentas).
    return {
      status: "error",
      message: "Email o contrasena incorrectos.",
    };
  }

  await claimAttendeeIdentity();
  redirect(next);
}

export async function signUpWithPassword(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa tus datos.",
    };
  }

  const next = resolveNext(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl(next),
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return {
      status: "error",
      message: "No pudimos crear la cuenta. Intentalo nuevamente.",
    };
  }

  // Con confirmacion de email activada (requisito de seguridad, ver
  // claimAttendeeIdentity), signUp no crea sesion: se avisa que revise el
  // correo. El reclamo de datos historicos ocurre recien tras confirmar.
  if (!data.session) {
    return {
      status: "success",
      message:
        "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja.",
    };
  }

  await claimAttendeeIdentity();
  redirect(next);
}

export async function sendMagicLink(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const parsed = z
    .string()
    .trim()
    .email("Ingresa un email valido.")
    .toLowerCase()
    .safeParse(formData.get("email"));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el email.",
    };
  }

  const next = resolveNext(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: callbackUrl(next) },
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

export async function signInWithGoogle(formData: FormData) {
  const next = resolveNext(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(next) },
  });

  if (error || !data.url) {
    redirect("/acceso?error=google");
  }

  redirect(data.url);
}

export async function signInWithLinkedIn(formData: FormData) {
  const next = resolveNext(formData);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: callbackUrl(next) },
  });

  if (error || !data.url) {
    redirect("/acceso?error=linkedin");
  }

  redirect(data.url);
}
