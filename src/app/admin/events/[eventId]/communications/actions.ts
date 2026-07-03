"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { processPendingCommunications } from "@/lib/communications";
import { parseDateTimeLocal } from "@/lib/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const audienceValues = ["all_active", "confirmed", "checked_in"] as const;

const communicationSchema = z.object({
  eventId: z.string().uuid(),
  audience: z.enum(audienceValues),
  subject: z.string().trim().min(3, "Ingresa un asunto.").max(200),
  body: z.string().trim().min(10, "El mensaje es muy corto.").max(5000),
  // Clave de idempotencia generada por el formulario (ver composer). Un doble
  // submit reusa la misma clave -> el insert de la RPC choca y no se reenvia.
  requestId: z.string().uuid(),
  // Opcional (Epic 51): fecha/hora local (zona canonica) para programar el
  // envio. Vacio = enviar ahora.
  scheduledAt: z.string().trim().optional(),
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
    scheduledAt: formData.get("scheduledAt") ?? undefined,
  });

  if (!parsed.success) {
    redirect(`${redirectBase}?status=invalid`);
  }

  // Programacion opcional (Epic 51): la hora de pared se interpreta en la zona
  // canonica de la app (parseDateTimeLocal, Epic 39). Una hora inexistente
  // (salto de DST) o pasada se rechaza aqui con mensaje claro; la RPC ademas
  // hace clamp a inmediato como defensa.
  let scheduledAtIso: string | null = null;

  if (parsed.data.scheduledAt) {
    const scheduledAt = parseDateTimeLocal(parsed.data.scheduledAt);

    if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
      redirect(`${redirectBase}?status=invalid_schedule`);
    }

    scheduledAtIso = scheduledAt.toISOString();
  }

  // Encolado seguro: la RPC (security definer) valida el rol y COMPUTA el
  // snapshot de destinatarios server-side. El cliente no puede inyectar una
  // audiencia arbitraria (no tiene INSERT directo sobre la tabla).
  const { data, error } = await supabase.rpc("enqueue_event_communication", {
    p_event_id: parsed.data.eventId,
    p_audience: parsed.data.audience,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
    p_idempotency_key: parsed.data.requestId,
    p_scheduled_at: scheduledAtIso,
  });

  if (error) {
    if (error.code === "42501") {
      redirect(`${redirectBase}?status=forbidden`);
    }
    console.error("No se pudo encolar la comunicacion", error);
    redirect(`${redirectBase}?status=error`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const result = row?.result as string | undefined;
  const total = (row?.recipient_count as number | undefined) ?? 0;

  if (result === "empty") {
    redirect(`${redirectBase}?status=empty`);
  }

  if (result === "duplicate") {
    redirect(`${redirectBase}?status=duplicate`);
  }

  // Programada: queda pending con scheduled_at; el cron la despacha al vencer
  // (no hay nada que procesar ahora, se omite el despacho inmediato).
  if (result === "scheduled") {
    revalidatePath(redirectBase);
    redirect(`${redirectBase}?status=scheduled&total=${total}`);
  }

  if (result !== "ok") {
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
  redirect(`${redirectBase}?status=queued&total=${total}`);
}

const cancelSchema = z.object({
  eventId: z.string().uuid(),
  communicationId: z.string().uuid(),
});

// Cancela una comunicacion programada que aun no vence. La RPC valida el rol
// y solo toca `pending` con `scheduled_at` futuro (una en vuelo o enviada
// responde not_found).
export async function cancelScheduledCommunication(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = cancelSchema.safeParse({
    eventId: formData.get("eventId"),
    communicationId: formData.get("communicationId"),
  });

  if (!parsed.success) {
    redirect("/admin/events");
  }

  const redirectBase = `/admin/events/${parsed.data.eventId}/communications`;

  const { data, error } = await supabase.rpc(
    "cancel_scheduled_communication",
    { p_communication_id: parsed.data.communicationId },
  );

  if (error) {
    if (error.code === "42501") {
      redirect(`${redirectBase}?status=forbidden`);
    }
    console.error("No se pudo cancelar la comunicacion programada", error);
    redirect(`${redirectBase}?status=cancel_failed`);
  }

  revalidatePath(redirectBase);
  redirect(
    `${redirectBase}?status=${data === "ok" ? "cancelled" : "cancel_failed"}`,
  );
}
