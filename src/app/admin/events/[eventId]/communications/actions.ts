"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { sendEventBroadcastEmails } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const audienceValues = ["all_active", "confirmed", "checked_in"] as const;

// Cada audiencia mapea a los estados de inscripcion que la componen. Solo
// inscripciones activas (verificadas y, si aplica, aprobadas): nunca se escribe
// a pending_verification / pending_approval / cancelled.
const statusByAudience: Record<(typeof audienceValues)[number], string[]> = {
  all_active: ["registered", "checked_in"],
  confirmed: ["registered"],
  checked_in: ["checked_in"],
};

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
    .select("id, name, organization_id")
    .eq("id", parsed.data.eventId)
    .is("deleted_at", null)
    .single<{ id: string; name: string; organization_id: string }>();

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

  // Destinatarios segun audiencia (lectura bajo RLS de miembro). Un error de
  // RLS/DB NO debe degradarse en una audiencia vacia que igual se registra como
  // envio exitoso: se aborta explicitamente.
  const { data: recipientRows, error: recipientsError } = await supabase
    .from("event_registrations")
    .select("email, full_name_snapshot")
    .eq("event_id", parsed.data.eventId)
    .in("status", statusByAudience[parsed.data.audience])
    .returns<{ email: string; full_name_snapshot: string }[]>();

  if (recipientsError) {
    redirect(`${redirectBase}?status=error`);
  }

  const recipients = (recipientRows ?? []).map((row) => ({
    email: row.email,
    name: row.full_name_snapshot,
  }));

  if (recipients.length === 0) {
    redirect(`${redirectBase}?status=empty`);
  }

  // Registra el envio (historial) ANTES de despachar, con la clave de
  // idempotencia: un doble submit con el mismo requestId choca contra el unique
  // y no genera una segunda fila ni un segundo envio.
  const { data: inserted, error: insertError } = await supabase
    .from("event_communications")
    .insert({
      event_id: parsed.data.eventId,
      audience: parsed.data.audience,
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipient_count: recipients.length,
      idempotency_key: parsed.data.requestId,
      sent_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError) {
    // 23505 = misma idempotency_key: ya se proceso este envio, no se reenvia.
    if (insertError.code === "23505") {
      redirect(`${redirectBase}?status=duplicate`);
    }
    redirect(`${redirectBase}?status=error`);
  }

  // El envio real ocurre DESPUES de responder (after): no bloquea la respuesta.
  // No se reporta "entregado a N" de antemano; `delivered_count` se persiste al
  // terminar y se muestra en el historial. La actualizacion va por service_role
  // (escritura de sistema post-envio). No es una cola durable: se loguea fallo.
  const communicationId = inserted.id;
  const subject = parsed.data.subject;
  const body = parsed.data.body;
  const eventName = event.name;

  after(async () => {
    try {
      const result = await sendEventBroadcastEmails({
        recipients,
        subject,
        body,
        eventName,
        communicationId,
      });

      if (!result.sent) {
        console.error(
          "Comunicacion no entregada: proveedor de email no configurado",
          communicationId,
        );
        return;
      }

      const adminClient = createSupabaseAdminClient();
      await adminClient
        .from("event_communications")
        .update({ delivered_count: result.delivered })
        .eq("id", communicationId);
    } catch (broadcastError) {
      console.error("Fallo el envio de la comunicacion", broadcastError);
    }
  });

  revalidatePath(redirectBase);
  redirect(`${redirectBase}?status=queued&total=${recipients.length}`);
}
