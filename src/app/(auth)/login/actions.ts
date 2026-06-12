"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getAppUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido."),
});

export type LoginActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function sendMagicLink(
  _state: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa el email.",
    };
  }

  const appUrl = getAppUrl();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/admin`,
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

export async function signInWithLinkedIn() {
  const appUrl = getAppUrl();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/admin`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=linkedin");
  }

  redirect(data.url);
}
