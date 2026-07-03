import { CalendarClock, Megaphone, Users, X } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { CommunicationComposer } from "@/app/admin/events/[eventId]/communications/_components/communication-composer";
import { cancelScheduledCommunication } from "@/app/admin/events/[eventId]/communications/actions";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { formatDateTime } from "@/lib/datetime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CommunicationsEvent = {
  id: string;
  name: string;
  starts_at: string;
  location: string | null;
};

type Communication = {
  id: string;
  audience: "all_active" | "confirmed" | "checked_in";
  subject: string;
  body: string;
  recipient_count: number;
  accepted_count: number;
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  scheduled_at: string | null;
  sent_by: string | null;
  created_at: string;
};

const audienceLabels: Record<Communication["audience"], string> = {
  all_active: "Todos los inscritos activos",
  confirmed: "Confirmados",
  checked_in: "Acreditados",
};

const statusLabels: Record<Communication["status"], string> = {
  pending: "En cola",
  sending: "Enviando",
  sent: "Enviado",
  failed: "Con fallos",
  cancelled: "Cancelada",
};

// Una pending con scheduled_at futuro esta "Programada" (aun no entra al
// despacho); vencida, vuelve a leerse como "En cola" hasta que el cron la tome.
// Devuelve la fecha programada o null.
function scheduledFor(communication: Communication): string | null {
  return communication.status === "pending" &&
    communication.scheduled_at &&
    new Date(communication.scheduled_at).getTime() > Date.now()
    ? communication.scheduled_at
    : null;
}

export default async function EventCommunicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ status?: string; total?: string }>;
}) {
  const { eventId } = await params;
  const { status, total } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, starts_at, location")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<CommunicationsEvent>();

  if (!event) {
    notFound();
  }

  const { data: communications } = await supabase
    .from("event_communications")
    .select(
      "id, audience, subject, body, recipient_count, accepted_count, status, scheduled_at, sent_by, created_at",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .returns<Communication[]>();

  // Resuelve los emails de quien envio cada comunicacion (servicio admin, igual
  // que el panel de equipo).
  const senderEmails = new Map<string, string>();
  const senderIds = Array.from(
    new Set((communications ?? []).map((c) => c.sent_by).filter(Boolean)),
  ) as string[];

  if (senderIds.length) {
    const adminClient = createSupabaseAdminClient();
    await Promise.all(
      senderIds.map(async (id) => {
        const { data } = await adminClient.auth.admin.getUserById(id);
        if (data.user?.email) {
          senderEmails.set(id, data.user.email);
        }
      }),
    );
  }

  const eventDate = formatDateTime(event.starts_at);
  const reminderSubject = `Recordatorio: ${event.name} es el ${eventDate}`;
  const reminderBody = [
    `Te esperamos en ${event.name}.`,
    "",
    `Fecha: ${eventDate}`,
    `Lugar: ${event.location ?? "Por confirmar"}`,
    "",
    "Recuerda llevar tu credencial con el QR para acreditar tu llegada.",
    "Nos vemos pronto.",
  ].join("\n");

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-4xl space-y-6 px-5 py-8 sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Comunicaciones
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{event.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate-600">
            Envia un correo a tus inscritos. Elige la audiencia, redacta el
            mensaje y envia. Cada envio queda registrado abajo.
          </p>
        </div>

        {status ? <StatusBanner status={status} total={total} /> : null}

        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Megaphone className="size-5 text-brand-cyan-500" aria-hidden="true" />
            Nueva comunicacion
          </h2>
          <div className="mt-4">
            <CommunicationComposer
              eventId={event.id}
              reminderBody={reminderBody}
              reminderSubject={reminderSubject}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Historial de envios</h2>
          {communications?.length ? (
            <div className="mt-4 space-y-3">
              {communications.map((communication) => {
                const scheduledAt = scheduledFor(communication);

                return (
                <article
                  className="rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4"
                  key={communication.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-brand-navy-950">
                      {communication.subject}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {scheduledAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-navy-950 px-2.5 py-1 text-xs font-semibold text-brand-mint-300">
                          <CalendarClock className="size-3.5" aria-hidden="true" />
                          Programada: {formatDateTime(scheduledAt)}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                            communication.status,
                          )}`}
                        >
                          {statusLabels[communication.status]}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-slate-600">
                        <Users className="size-3.5" aria-hidden="true" />
                        {communication.accepted_count}/
                        {communication.recipient_count} aceptados ·{" "}
                        {audienceLabels[communication.audience]}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-slate-600">
                    {communication.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-brand-slate-600">
                      {formatDateTime(communication.created_at)}
                      {communication.sent_by &&
                      senderEmails.get(communication.sent_by)
                        ? ` · ${senderEmails.get(communication.sent_by)}`
                        : ""}
                    </p>
                    {scheduledAt ? (
                      <form action={cancelScheduledCommunication}>
                        <input name="eventId" type="hidden" value={event.id} />
                        <input
                          name="communicationId"
                          type="hidden"
                          value={communication.id}
                        />
                        <button
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-xs font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft hover:text-red-700"
                          type="submit"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          Cancelar envio
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
              Aun no enviaste comunicaciones para este evento.
            </p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function StatusBanner({
  status,
  total,
}: {
  status: string;
  total?: string;
}) {
  const positive =
    status === "queued" ||
    status === "duplicate" ||
    status === "scheduled" ||
    status === "cancelled";
  const messages: Record<string, string> = {
    queued: `En cola: enviando a ${total ?? 0} destinatario(s). El detalle de entrega aparece en el historial.`,
    scheduled: `Programada (audiencia actual: ${total ?? 0} destinatario(s); se recalcula al enviar). Puedes cancelarla desde el historial mientras no venza.`,
    cancelled: "Envio programado cancelado.",
    cancel_failed:
      "No se pudo cancelar: el envio ya vencio o esta en curso.",
    duplicate: "Esta comunicacion ya se habia enviado; evitamos duplicarla.",
    empty: "No hay inscritos en esa audiencia; no se envio nada.",
    invalid: "Revisa el asunto y el mensaje antes de enviar.",
    invalid_schedule:
      "La fecha programada no es valida: debe ser una hora futura (y existente).",
    forbidden: "No tienes permisos para enviar comunicaciones de este evento.",
    error: "No se pudo enviar la comunicacion. Intentalo nuevamente.",
  };

  return (
    <p
      className={`rounded-md p-4 text-sm font-semibold ${
        positive
          ? "bg-brand-mint-300/30 text-brand-navy-950"
          : "bg-red-50 text-red-700"
      }`}
    >
      {messages[status] ?? messages.error}
    </p>
  );
}

function statusBadgeClass(status: Communication["status"]) {
  if (status === "sent") {
    return "bg-brand-mint-300/30 text-brand-navy-950";
  }
  if (status === "failed") {
    return "bg-red-50 text-red-700";
  }
  if (status === "cancelled") {
    return "bg-brand-slate-100 text-brand-slate-600";
  }
  return "bg-brand-surface-soft text-brand-slate-600";
}

