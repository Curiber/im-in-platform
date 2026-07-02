// Fechas y horas canonicas de la plataforma.
//
// El runtime (Vercel) corre en UTC: cualquier formateo sin zona horaria
// explicita muestra horas incorrectas para Chile, y cualquier parseo de un
// <input type="datetime-local"> interpreta la hora de pared del organizador en
// la zona del server. TODO formateo/parseo de fechas de la app pasa por aqui.
//
// El modelo no tiene zona horaria por evento: la plataforma asume Chile
// (locale es-CL en toda la app). Cuando haya eventos en otras zonas, este es el
// unico punto a parametrizar.

export const APP_TIME_ZONE = "America/Santiago";

// Fecha + hora (ej: "15 ene 2026, 12:00"). El formato estandar de la app.
export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(toDate(value));
}

// Solo fecha (ej: "15 ene 2026").
export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeZone: APP_TIME_ZONE,
  }).format(toDate(value));
}

// Solo hora (ej: "12:00").
export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-CL", {
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(toDate(value));
}

// Rango "15 ene 2026, 12:00 - 13:30" (o solo el inicio si no hay termino).
export function formatDateTimeRange(
  startsAt: string | Date,
  endsAt: string | Date | null,
) {
  const start = formatDateTime(startsAt);

  if (!endsAt) {
    return start;
  }

  return `${start} - ${formatTime(endsAt)}`;
}

// Valor para <input type="datetime-local">: la hora de pared en Chile del
// instante almacenado (no la hora UTC, que es lo que mostraba toISOString).
export function toDateTimeLocalValue(value: string | Date | null) {
  if (!value) {
    return "";
  }

  const instant = toDate(value);
  const wall = new Date(instant.getTime() + timeZoneOffsetMs(instant));

  return wall.toISOString().slice(0, 16);
}

// Interpreta lo enviado por un <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
// como hora de pared en Chile y devuelve el instante UTC correspondiente.
// Doble pasada de offset para acertar en los bordes de cambio de horario.
//
// Devuelve null si la hora de pared NO EXISTE: el salto de primavera del DST se
// come una hora (p.ej. 2026-09-06T00:30 en Chile). Sin esta validacion, el
// instante calculado quedaria guardado a una hora distinta a la que el usuario
// escribio. Se detecta por round-trip: si formatear el instante de vuelta no
// reproduce la pared pedida, la hora no existe.
export function parseDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());

  if (!match) {
    return null;
  }

  const normalized = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  const wallUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );

  let offset = timeZoneOffsetMs(new Date(wallUtc));
  offset = timeZoneOffsetMs(new Date(wallUtc - offset));
  const instant = new Date(wallUtc - offset);

  // Round-trip: si el instante no reproduce exactamente la pared pedida, esa
  // hora no existe en la zona (salto de DST) -> se rechaza.
  if (toDateTimeLocalValue(instant) !== normalized) {
    return null;
  }

  return instant;
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

// Offset (ms) de APP_TIME_ZONE respecto de UTC en un instante dado:
// wall(instante en la zona) - instante. Positivo al este de UTC.
function timeZoneOffsetMs(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const wallUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  // El instante truncado a segundos, para comparar contra la pared (que no
  // tiene milisegundos).
  const instantSeconds = Math.floor(instant.getTime() / 1000) * 1000;

  return wallUtc - instantSeconds;
}
