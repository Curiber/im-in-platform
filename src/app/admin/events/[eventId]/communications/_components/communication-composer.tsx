"use client";

import { CalendarClock, Send } from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/app/admin/_components/submit-button";
import { sendEventCommunication } from "@/app/admin/events/[eventId]/communications/actions";

export function CommunicationComposer({
  eventId,
  reminderSubject,
  reminderBody,
}: {
  eventId: string;
  reminderSubject: string;
  reminderBody: string;
}) {
  const [audience, setAudience] = useState("all_active");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // Una clave por redaccion: identifica este intento de envio para idempotencia
  // server-side (un doble submit reusa la misma clave).
  const [requestId] = useState(() => crypto.randomUUID());

  function applyReminderTemplate() {
    setAudience("all_active");
    setSubject(reminderSubject);
    setBody(reminderBody);
  }

  return (
    <form action={sendEventCommunication} className="space-y-5">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="requestId" type="hidden" value={requestId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="block">
          <span className="text-sm font-medium text-brand-navy-950">
            Audiencia
          </span>
          <select
            className="mt-2 h-11 w-full min-w-60 rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
            name="audience"
            onChange={(event) => setAudience(event.target.value)}
            value={audience}
          >
            <option value="all_active">Todos los inscritos activos</option>
            <option value="confirmed">Confirmados (sin acreditar)</option>
            <option value="checked_in">Acreditados</option>
          </select>
        </label>

        <button
          className="inline-flex h-10 items-center gap-2 self-end rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
          onClick={applyReminderTemplate}
          type="button"
        >
          <CalendarClock className="size-4 text-brand-cyan-500" aria-hidden="true" />
          Usar plantilla de recordatorio
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">Asunto</span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          maxLength={200}
          name="subject"
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Nos vemos manana en..."
          required
          value={subject}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">Mensaje</span>
        <textarea
          className="mt-2 min-h-44 w-full rounded-md border border-brand-border bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-brand-cyan-500"
          maxLength={5000}
          name="body"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escribe el mensaje que recibiran los inscritos."
          required
          value={body}
        />
        <span className="mt-1 block text-xs text-brand-slate-600">
          Cada inscrito recibe su propio correo; no se comparten los emails entre
          asistentes.
        </span>
      </label>

      <SubmitButton className="inline-flex h-11 items-center gap-2 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white transition hover:bg-brand-navy-900 disabled:opacity-60">
        <Send className="size-4" aria-hidden="true" />
        Enviar comunicacion
      </SubmitButton>
    </form>
  );
}
