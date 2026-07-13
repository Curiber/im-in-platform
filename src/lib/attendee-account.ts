import { cache } from "react";

import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Datos minimos del perfil global del asistente (spec 37). El perfil es
// propiedad de la cuenta (attendee_profiles.user_id) y se reutiliza entre
// eventos; aqui solo se leen los campos que muestra la superficie /app.
export type AttendeeProfile = {
  id: string;
  full_name: string;
  headline: string | null;
  description: string | null;
  role: string | null;
  company: string | null;
  industry: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  interests: string[];
  goals_seeking: string[];
  goals_offering: string[];
  profile_slug: string | null;
  card_visibility: ProfileCardVisibility;
  public_email_enabled: boolean;
  public_phone_enabled: boolean;
};

export type AttendeeRegistration = {
  id: string;
  status: string;
  public_profile_enabled: boolean;
  qr_token_hash: string;
  events: {
    slug: string;
    name: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    status: string;
    networking_enabled: boolean;
    cover_image_url: string | null;
  } | null;
};

// getUser() valida el token contra Supabase Auth en cada request; se memoiza por
// render con cache() para no repetir la llamada entre layout y page.
export const getAttendeeUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export type PendingCounts = {
  connections: number;
  meetings: number;
};

// Solicitudes recibidas pendientes (conexiones y reuniones) para los badges de
// la navegacion. Memoizado por render (lo usa el layout de /app).
export const getMyPendingCounts = cache(async (): Promise<PendingCounts> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_my_pending_counts");

  if (error) {
    return { connections: 0, meetings: 0 };
  }

  const row = (
    data as
      | { pending_connections: number; pending_meetings: number }[]
      | null
  )?.[0];

  return {
    connections: row?.pending_connections ?? 0,
    meetings: row?.pending_meetings ?? 0,
  };
});

// Reclama el perfil y las inscripciones historicas (por email) para la cuenta
// autenticada, reusando el RPC del spec 31 (claim_attendee_identity, que toma el
// email del JWT y solo enlaza filas sin dueño). Idempotente y silencioso.
//
// Guard de seguridad (review PR45): solo se reclama si el email de la cuenta
// esta verificado (`email_confirmed_at`). Sin este guard, una cuenta creada por
// contrasena con la confirmacion de email desactivada podria reclamar los datos
// historicos de otra persona con solo escribir su email. Requiere, ademas, que
// la confirmacion de email este habilitada en Supabase Auth.
export async function claimAttendeeIdentity() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email_confirmed_at) {
    return;
  }

  const { error } = await supabase.rpc("claim_attendee_identity");

  if (error) {
    console.error("No se pudo reclamar la identidad del asistente", error);
  }
}

export const getAttendeeProfile = cache(
  async (userId: string): Promise<AttendeeProfile | null> => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("attendee_profiles")
      .select(
        "id, full_name, headline, description, role, company, industry, email, phone, linkedin_url, avatar_url, interests, goals_seeking, goals_offering, profile_slug, card_visibility, public_email_enabled, public_phone_enabled",
      )
      .eq("user_id", userId)
      .maybeSingle<AttendeeProfile>();

    return data ?? null;
  },
);

export async function getAttendeeRegistrations(
  userId: string,
): Promise<AttendeeRegistration[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("event_registrations")
    .select(
      "id, status, public_profile_enabled, qr_token_hash, events(slug, name, starts_at, ends_at, location, status, networking_enabled, cover_image_url)",
    )
    .eq("user_id", userId)
    .order("registered_at", { ascending: false })
    .returns<AttendeeRegistration[]>();

  return data ?? [];
}

// Particiona por fecha usando el termino del evento (o su inicio si no hay
// termino). Vive fuera de los componentes para que "ahora" no se calcule
// durante el render (regla de pureza de React).
export function splitRegistrationsByDate(
  registrations: AttendeeRegistration[],
) {
  const now = Date.now();
  const isPast = (registration: AttendeeRegistration) => {
    const reference =
      registration.events?.ends_at ?? registration.events?.starts_at;
    return reference ? new Date(reference).getTime() < now : false;
  };

  return {
    upcoming: registrations.filter((registration) => !isPast(registration)),
    past: registrations.filter(isPast),
  };
}
