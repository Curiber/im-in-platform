"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { sendEventBroadcastEmails } from "@/lib/email";
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

  // Destinatarios segun audiencia (lectura bajo RLS de miembro).
  const { data: recipientRows } = await supabase
    .from("event_registrations")
    .select("email, full_name_snapshot")
    .eq("event_id", parsed.data.eventId)
    .in("status", statusByAudience[parsed.data.audience])
    .returns<{ email: string; full_name_snapshot: string }[]>();

  const recipients = (recipientRows ?? []).map((row) => ({
    email: row.email,
    name: row.full_name_snapshot,
  }));

  // Registra el envio (historial) antes de despachar. recipient_count es el
  // tamaño de la audiencia al momento del envio.
  const { error: insertError } = await supabase
    .from("event_communications")
    .insert({
      event_id: parsed.data.eventId,
      audience: parsed.data.audience,
      subject: parsed.data.subject,
      body: parsed.data.body,
      recipient_count: recipients.length,
      sent_by: user.id,
    });

  if (insertError) {
    redirect(`${redirectBase}?status=error`);
  }

  // El envio real ocurre DESPUES de responder (after): no bloquea la respuesta
  // ni depende de cuantos destinatarios haya. No es una cola durable: se loguea
  // cualquier fallo.
  if (recipients.length > 0) {
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
        });

        if (!result.sent) {
          console.error(
            "Comunicacion no enviada: proveedor de email no configurado",
            parsed.data.eventId,
          );
        }
      } catch (broadcastError) {
        console.error("Fallo el envio de la comunicacion", broadcastError);
      }
    });
  }

  revalidatePath(redirectBase);
  redirect(`${redirectBase}?status=sent&count=${recipients.length}`);
}
