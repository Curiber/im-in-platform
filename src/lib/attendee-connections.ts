// Conexiones del asistente a traves de todos sus eventos (spec 37: red
// persistente). Agrega las conexiones aceptadas de todas las inscripciones del
// usuario y muestra el PERFIL VIVO de cada contacto (attendee_profiles), no el
// snapshot del evento; los eventos donde se conocieron quedan como contexto.

import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ConnectionEventContext = {
  eventName: string;
  eventSlug: string;
  startsAt: string;
};

export type MyConnection = {
  key: string;
  fullName: string;
  headline: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  profileSlug: string | null;
  events: ConnectionEventContext[];
};

type AcceptedConnection = {
  requester_registration_id: string;
  receiver_registration_id: string;
  event_id: string;
  responded_at: string | null;
};

type OtherRegistration = {
  id: string;
  email: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  profile_id: string | null;
  events: {
    name: string;
    slug: string;
    starts_at: string;
    deleted_at: string | null;
  } | null;
  attendee_profiles: {
    email: string | null;
    full_name: string | null;
    headline: string | null;
    role: string | null;
    company: string | null;
    phone: string | null;
    linkedin_url: string | null;
    avatar_url: string | null;
    card_visibility: ProfileCardVisibility;
    profile_slug: string | null;
  } | null;
};

// Devuelve las conexiones aceptadas del usuario, deduplicadas por persona (una
// tarjeta por contacto) con la lista de eventos donde se conectaron.
export async function getMyConnections(userId: string): Promise<MyConnection[]> {
  // Las inscripciones propias se leen con la sesion (RLS "own registrations").
  // Asi el resto de la consulta, aunque use el service role, queda acotada a
  // filas del propio usuario.
  const server = await createSupabaseServerClient();
  const { data: myRegs } = await server
    .from("event_registrations")
    .select("id")
    .eq("user_id", userId)
    .returns<{ id: string }[]>();

  const myRegIds = (myRegs ?? []).map((registration) => registration.id);
  if (!myRegIds.length) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const idList = myRegIds.join(",");
  const { data: connections } = await admin
    .from("connection_requests")
    .select(
      "requester_registration_id, receiver_registration_id, event_id, responded_at",
    )
    .eq("status", "accepted")
    .or(
      `requester_registration_id.in.(${idList}),receiver_registration_id.in.(${idList})`,
    )
    .returns<AcceptedConnection[]>();

  if (!connections?.length) {
    return [];
  }

  const mine = new Set(myRegIds);
  const otherIdByConnection = connections.map((connection) =>
    mine.has(connection.requester_registration_id)
      ? connection.receiver_registration_id
      : connection.requester_registration_id,
  );

  const { data: others } = await admin
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, role_snapshot, company_snapshot, profile_id, events(name, slug, starts_at, deleted_at), attendee_profiles(email, full_name, headline, role, company, phone, linkedin_url, avatar_url, card_visibility, profile_slug)",
    )
    .in("id", Array.from(new Set(otherIdByConnection)))
    .returns<OtherRegistration[]>();

  const otherById = new Map<string, OtherRegistration>();
  others?.forEach((registration) => otherById.set(registration.id, registration));

  // Agrupa por persona: la identidad es el profile_id (perfil global) o, si no
  // hay, el email. Una persona conocida en dos eventos aparece una sola vez.
  const byPerson = new Map<string, MyConnection>();

  for (let index = 0; index < connections.length; index += 1) {
    const otherId = otherIdByConnection[index];
    const other = otherById.get(otherId);
    if (!other || other.events?.deleted_at) {
      continue;
    }

    const profile = other.attendee_profiles;
    const key = other.profile_id ?? other.email;

    const eventContext: ConnectionEventContext | null = other.events
      ? {
          eventName: other.events.name,
          eventSlug: other.events.slug,
          startsAt: other.events.starts_at,
        }
      : null;

    const existing = byPerson.get(key);
    if (existing) {
      if (
        eventContext &&
        !existing.events.some((event) => event.eventSlug === eventContext.eventSlug)
      ) {
        existing.events.push(eventContext);
      }
      continue;
    }

    byPerson.set(key, {
      key,
      fullName: profile?.full_name ?? other.full_name_snapshot,
      headline: profile?.headline ?? null,
      role: profile?.role ?? other.role_snapshot,
      company: profile?.company ?? other.company_snapshot,
      avatarUrl: profile?.avatar_url ?? null,
      // Contacto compartido al aceptar la conexion.
      email: profile?.email ?? other.email,
      phone: profile?.phone ?? null,
      linkedinUrl: profile?.linkedin_url ?? null,
      profileSlug:
        profile && profile.card_visibility !== "private"
          ? profile.profile_slug
          : null,
      events: eventContext ? [eventContext] : [],
    });
  }

  // Orden estable: por nombre.
  return Array.from(byPerson.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}
