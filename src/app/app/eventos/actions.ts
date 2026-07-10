"use server";

import { revalidatePath } from "next/cache";

import { getAttendeeUser } from "@/lib/attendee-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Cancela la propia inscripcion (spec 37). La RPC valida por sesion que la
// inscripcion sea del usuario y este en un estado cancelable; aqui solo se
// invoca y se revalida. Respuesta neutra: la UI refleja el estado tras recargar.
export async function cancelRegistration(formData: FormData) {
  const registrationId = String(formData.get("registrationId") ?? "");
  if (!registrationId) {
    return;
  }

  const user = await getAttendeeUser();
  if (!user) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("cancel_my_registration", {
    p_registration_id: registrationId,
  });

  revalidatePath("/app/eventos");
  revalidatePath("/app");
}
