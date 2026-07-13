"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  currentUserHasPassword,
  getAttendeeUser,
} from "@/lib/attendee-account";
import { profileCardVisibilityValues } from "@/lib/profile-card-visibility";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  cardVisibility: z.enum(profileCardVisibilityValues),
  publicEmailEnabled: z.boolean(),
  publicPhoneEnabled: z.boolean(),
});

export type PrivacyActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

// Gestiona la privacidad de la tarjeta publica desde /app/configuracion (spec
// 37). Delega en el RPC update_my_card_visibility, que corre con la sesion del
// usuario y solo toca la fila de auth.uid(); el RPC normaliza email/telefono a
// false fuera de public_full, asi que el enforcement no depende de este action.
export async function updateCardVisibility(
  _state: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const user = await getAttendeeUser();
  if (!user) {
    return { status: "error", message: "Tu sesion expiro. Vuelve a ingresar." };
  }

  const parsed = schema.safeParse({
    cardVisibility: formData.get("cardVisibility"),
    publicEmailEnabled: formData.get("publicEmailEnabled") === "on",
    publicPhoneEnabled: formData.get("publicPhoneEnabled") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Selecciona una opcion de visibilidad valida.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_my_card_visibility", {
    p_card_visibility: parsed.data.cardVisibility,
    p_public_email_enabled: parsed.data.publicEmailEnabled,
    p_public_phone_enabled: parsed.data.publicPhoneEnabled,
  });

  if (error) {
    console.error("No se pudo actualizar la visibilidad de la tarjeta", error);
    return {
      status: "error",
      message: "No pudimos guardar los cambios. Intentalo nuevamente.",
    };
  }

  revalidatePath("/app/configuracion");
  revalidatePath("/app/perfil");
  return { status: "success", message: "Privacidad actualizada." };
}

export type PasswordActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const passwordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(8, "La contrasena debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });

// Establece o cambia la contrasena de la cuenta desde /app/configuracion (spec
// 37, "Configuracion: ... contrasena"). Corre con la sesion del usuario.
//
// Si la cuenta ya tiene contrasena, se exige la actual y se re-autentica antes
// de cambiarla: sin esto, cualquiera con una sesion abierta (equipo compartido,
// sesion robada) podria cambiarla sin conocer la vigente. Las cuentas solo
// social / magic link aun no tienen contrasena y la establecen sin ese paso: ya
// probaron identidad con el proveedor. Si tiene contrasena se decide server-side
// con current_user_has_password (lee auth.users.encrypted_password), no del
// formulario ni de las identidades (el provider `email` no distingue
// contrasena de magic link/OTP).
export async function changePassword(
  _state: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const user = await getAttendeeUser();
  if (!user) {
    return { status: "error", message: "Tu sesion expiro. Vuelve a ingresar." };
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa los campos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const hasPassword = await currentUserHasPassword();

  if (hasPassword) {
    if (!parsed.data.currentPassword) {
      return {
        status: "error",
        message: "Ingresa tu contrasena actual.",
      };
    }

    // Re-autenticacion: verifica la contrasena vigente. signInWithPassword no
    // borra la sesion si falla; si acierta, reemite la sesion del mismo usuario.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: parsed.data.currentPassword,
    });

    if (reauthError) {
      return {
        status: "error",
        message: "La contrasena actual es incorrecta.",
      };
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    // Supabase rechaza contrasenas filtradas o iguales a la actual.
    return {
      status: "error",
      message:
        "No pudimos actualizar la contrasena. Usa una distinta y mas segura.",
    };
  }

  revalidatePath("/app/configuracion");
  return {
    status: "success",
    message: hasPassword
      ? "Contrasena actualizada."
      : "Contrasena establecida. Ya puedes iniciar sesion con ella.",
  };
}
