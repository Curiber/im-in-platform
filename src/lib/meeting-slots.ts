// Franjas de reunion (Fase 4.2, spec 27). Puro (sin DB) para testear la
// generacion de forma aislada.
//
// v1 simple: franjas de 30 minutos alineadas al inicio del evento, dentro de
// su ventana. La validacion autoritativa de la franja vive en la RPC
// `propose_meeting` (bajo lock); esto solo genera las opciones del formulario.

export const MEETING_SLOT_MINUTES = 30;

// Si el evento no declara termino, se ofrecen franjas durante esta ventana
// desde el inicio (mismo espiritu que un evento de jornada completa).
const FALLBACK_WINDOW_HOURS = 8;

export type MeetingSlot = {
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
};

export function generateMeetingSlots({
  eventStartsAt,
  eventEndsAt,
  slotMinutes = MEETING_SLOT_MINUTES,
}: {
  eventStartsAt: string | Date;
  eventEndsAt: string | Date | null;
  slotMinutes?: number;
}): MeetingSlot[] {
  const start = toTime(eventStartsAt);
  const end = eventEndsAt
    ? toTime(eventEndsAt)
    : start + FALLBACK_WINDOW_HOURS * 60 * 60 * 1000;

  if (!Number.isFinite(start) || !Number.isFinite(end) || slotMinutes <= 0) {
    return [];
  }

  const slotMs = slotMinutes * 60 * 1000;
  const slots: MeetingSlot[] = [];

  // Solo franjas completas: una franja que se pasa del termino no se ofrece.
  for (let cursor = start; cursor + slotMs <= end; cursor += slotMs) {
    slots.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(cursor + slotMs).toISOString(),
    });
  }

  return slots;
}

// Deja solo las franjas que aun no comienzan (para no proponer en el pasado).
export function filterUpcomingSlots(
  slots: MeetingSlot[],
  now: Date = new Date(),
): MeetingSlot[] {
  const nowMs = now.getTime();
  return slots.filter((slot) => toTime(slot.startsAt) > nowMs);
}

function toTime(value: string | Date) {
  return (value instanceof Date ? value : new Date(value)).getTime();
}
