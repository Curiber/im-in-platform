"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import {
  audienceStatuses,
  processPendingCommunications,
} from "@/lib/communications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const audienceValues = ["all_active", "confirmed", "checked_in"] as const;

const communicationSchema = z.object({
  eventId: z.string().uuid(),
  audience: z.enum(audienceValues),
  subject: z.string().trim().min(3, "Ingresa un asunto.").max(200),
  body: z.string().trim().min(10, "El mensaje es muy corto.").max(5000),
  // Clave de idempotencia generada por el formulario (ver composer). Un doble
  // submit reusa la misma clave -> el insert choca y no se reenvia.
  requestId: z.string().uuid(),
});

export async function sendEventCommunication(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = String(formData.get("eventId") ?? "");
  const redirectBase = `/admin/events/${eventId}/communications`;

  const parsed = communicationSchema.safeParse({
    eventId,
    audience: formData.get("audience"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    redirect(`${redirectBase}?status=invalid`);
  }

  // Autorizacion: debe ser miembro de la organizacion dueña del evento (los tres
  // roles gestionan eventos). La RLS de event_communications exige el mismo rol
  // al insertar.
  const { data: event } = await supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", parsed.data.eventId)
    .is("deleted_at", null)
    .single<{ id: string; organization_id: string }>();

  if (!event) {
    redirect(`${redirectBase}?status=error`);
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: string }>();

  if (!membership) {
    redirect(`${redirectBase}?status=forbidden`);
  }

  // Tamaño de la audiencia (para el chequeo de vacio y recipient_count). Un
  // error de RLS/DB NO se degrada en audiencia vacia: se aborta.
  const { count, error: countError } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", parsed.data.eventId)
    .in("status", audienceStatuses[parsed.data.audience]);

  if (countError) {
    redirect(`${redirectBase}?status=error`);
  }

  if (!count || count === 0) {
    redirect(`${redirectBase}?status=empty`);
  }

  // Registra la comunicacion como `pending` (outbox) con su idempotency_key: un
  // doble submit con el mismo requestId choca contra el unique y no genera una
  // segunda fila ni un segundo envio.
  const { error: insertError } = await supabase
    .from("event_communications")
    .insert({
      event_id: parsed.data.eventId,
      audience: parsed.data.audience,
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipient_count: count,
      idempotency_key: parsed.data.requestId,
      sent_by: user.id,
    });

  if (insertError) {
    // 23505 = misma idempotency_key: ya se registro este envio, no se duplica.
    if (insertError.code === "23505") {
      redirect(`${redirectBase}?status=duplicate`);
    }
    redirect(`${redirectBase}?status=error`);
  }

  // Despacho inmediato (baja latencia) DESPUES de responder. No es la unica
  // garantia: la comunicacion quedo `pending` en el outbox, asi que si este
  // proceso muere, el cron de respaldo la retoma. El claim atomico evita que
  // ambos la procesen a la vez.
  after(async () => {
    try {
      const adminClient = createSupabaseAdminClient();
      await processPendingCommunications(adminClient, 3);
    } catch (dispatchError) {
      console.error("Fallo el despacho inmediato de comunicaciones", dispatchError);
    }
  });

  revalidatePath(redirectBase);
  redirect(`${redirectBase}?status=queued&total=${count}`);
}
