"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAttendeeUser } from "@/lib/attendee-account";
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
