// Utilidades de la API v1 (Fase 5.1, spec 30).
//
// Autenticacion: `Authorization: Bearer <registrationId>:<token>` — las mismas
// credenciales del flujo web (el QR/link del asistente), validadas con las
// mismas reglas (`verifyRegistrationToken`). Cuando exista la sesion OTP
// (Fase 5.2) se sumara ese esquema sin romper este.
//
// Envelope: exito `{ data }`; error `{ error: { code, message } }` con el
// status HTTP correspondiente. Los mappers DTO exponen camelCase y CUIDAN LA
// PRIVACIDAD: el email de un contacto solo viaja en conexiones aceptadas
// (misma regla que la web).

import { NextResponse, type NextRequest } from "next/server";

import type { VerifiedRegistration } from "@/lib/registrations";
import { verifyRegistrationToken } from "@/lib/registrations";
import type { RegistrationContact } from "@/lib/services/connection-service";
import type { DirectoryProfile } from "@/lib/services/directory-service";
import type { MeetingRow } from "@/lib/services/meeting-service";

export function jsonData(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

const API_ERRORS = {
  unauthorized: {
    status: 401,
    message: "Credenciales invalidas o inscripcion inactiva.",
  },
  networking_disabled: {
    status: 403,
    message: "El networking de este evento no esta habilitado.",
  },
  invalid_request: { status: 400, message: "Solicitud invalida." },
  invalid_selection: {
    status: 422,
    message: "Area, intereses u objetivos fuera del catalogo del evento.",
  },
  not_found: { status: 404, message: "Recurso no encontrado." },
  conflict: { status: 409, message: "Conflicto con el estado actual." },
  expired: { status: 409, message: "La franja elegida ya paso." },
  unavailable: {
    status: 409,
    message: "El evento no permite esta accion en este momento.",
  },
  internal: { status: 500, message: "Error interno." },
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

export function jsonError(code: ApiErrorCode, message?: string) {
  const entry = API_ERRORS[code];

  return NextResponse.json(
    { error: { code, message: message ?? entry.message } },
    { status: entry.status },
  );
}

// Extrae y valida las credenciales del header Authorization. El token es
// base64url y el id un UUID: ':' no aparece en ninguno.
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<VerifiedRegistration | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([^:\s]+):([^:\s]+)$/i.exec(header);

  if (!match) {
    return null;
  }

  return verifyRegistrationToken({
    registrationId: match[1],
    token: match[2],
  });
}

// --- DTOs (snake_case de DB -> camelCase de API) ---

export function toRegistrationDto(viewer: VerifiedRegistration) {
  return {
    id: viewer.id,
    status: viewer.status,
    fullName: viewer.full_name_snapshot,
    industry: viewer.industry_snapshot,
    interests: viewer.interests,
    goalsSeeking: viewer.goals_seeking,
    goalsOffering: viewer.goals_offering,
    publicProfileEnabled: viewer.public_profile_enabled,
    event: viewer.events
      ? {
          id: viewer.events.id,
          slug: viewer.events.slug,
          name: viewer.events.name,
          networkingEnabled: viewer.events.networking_enabled,
          startsAt: viewer.events.starts_at,
          endsAt: viewer.events.ends_at,
          coverImageUrl: viewer.events.cover_image_url,
        }
      : null,
  };
}

export function toDirectoryProfileDto(profile: DirectoryProfile) {
  return {
    registrationId: profile.id,
    fullName: profile.full_name_snapshot,
    role: profile.role_snapshot,
    company: profile.company_snapshot,
    industry: profile.industry_snapshot,
    interests: profile.interests,
    goalsSeeking: profile.goals_seeking,
    goalsOffering: profile.goals_offering,
    headline: profile.attendee_profiles?.headline ?? null,
    avatarUrl: profile.attendee_profiles?.avatar_url ?? null,
  };
}

// Contacto de conexiones/reuniones. `includeEmail` SOLO para conexiones
// aceptadas: es el momento en que ambos consintieron compartir contacto.
export function toContactDto(
  contact: RegistrationContact | undefined,
  { includeEmail = false }: { includeEmail?: boolean } = {},
) {
  if (!contact) {
    return null;
  }

  return {
    registrationId: contact.id,
    fullName: contact.full_name_snapshot,
    role: contact.role_snapshot,
    company: contact.company_snapshot,
    avatarUrl: contact.attendee_profiles?.avatar_url ?? null,
    email: includeEmail ? contact.email : undefined,
  };
}

export function toMeetingDto(
  meeting: MeetingRow,
  {
    contact,
    locationName,
    viewerId,
  }: {
    contact: RegistrationContact | undefined;
    locationName: string | null;
    viewerId: string;
  },
) {
  return {
    id: meeting.id,
    status: meeting.status,
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    message: meeting.message,
    locationName,
    direction:
      meeting.requester_registration_id === viewerId ? "sent" : "received",
    counterpart: toContactDto(contact),
  };
}
