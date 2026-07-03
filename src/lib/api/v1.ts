// Utilidades de la API v1 (Fase 5.1, spec 30; sesion: spec 33).
//
// Autenticacion, dos esquemas sobre el mismo header:
//   1. `Authorization: Bearer <registrationId>:<token>` — las credenciales del
//      link/QR del asistente, validadas con las mismas reglas de la web
//      (`verifyRegistrationToken`).
//   2. `Authorization: Bearer <supabase_access_token>` (+ header
//      `X-Registration-Id` para los endpoints con contexto de inscripcion) —
//      la sesion OTP del asistente (spec 31); la inscripcion debe haber sido
//      reclamada por ese usuario (`verifyRegistrationOwnership`).
//   El separador ':' desambigua: el token de inscripcion es base64url y el id
//   un UUID (ninguno contiene ':'); un JWT tampoco.
//
// Envelope: exito `{ data }`; error `{ error: { code, message } }` con el
// status HTTP correspondiente. Los mappers DTO exponen camelCase y CUIDAN LA
// PRIVACIDAD: el email de un contacto solo viaja en conexiones aceptadas
// (misma regla que la web).

import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { VerifiedRegistration } from "@/lib/registrations";
import {
  verifyRegistrationOwnership,
  verifyRegistrationToken,
} from "@/lib/registrations";
import type { RegistrationContact } from "@/lib/services/connection-service";
import type { DirectoryProfile } from "@/lib/services/directory-service";
import type { MeetingRow } from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

function bearerValue(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);

  return match ? match[1] : null;
}

// Resuelve el usuario de Supabase Auth desde un access token (sin cookies).
export async function authenticateApiUser(
  request: NextRequest,
): Promise<User | null> {
  const bearer = bearerValue(request);

  // Un bearer con ':' son credenciales de inscripcion, no un access token.
  if (!bearer || bearer.includes(":")) {
    return null;
  }

  const {
    data: { user },
  } = await createSupabaseAdminClient().auth.getUser(bearer);

  return user;
}

// Autenticacion con contexto de inscripcion: credenciales de inscripcion
// (id:token) o sesion OTP (access token + X-Registration-Id de una
// inscripcion reclamada por ese usuario).
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<VerifiedRegistration | null> {
  const bearer = bearerValue(request);

  if (!bearer) {
    return null;
  }

  const credentials = /^([^:\s]+):([^:\s]+)$/.exec(bearer);

  if (credentials) {
    return verifyRegistrationToken({
      registrationId: credentials[1],
      token: credentials[2],
    });
  }

  const user = await authenticateApiUser(request);

  if (!user) {
    return null;
  }

  return verifyRegistrationOwnership({
    registrationId: request.headers.get("x-registration-id") ?? undefined,
    userId: user.id,
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
