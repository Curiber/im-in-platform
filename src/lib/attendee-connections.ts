// Conexiones del asistente a traves de todos sus eventos (spec 37: red
// persistente). Lee por sesion via el RPC SECURITY DEFINER get_my_connections
// (acotado a auth.uid() y a las partes involucradas): NO usa service_role.
// Muestra el PERFIL VIVO de cada contacto; los eventos donde se conocieron
// quedan como contexto.

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

type ConnectionRow = {
  other_profile_id: string | null;
  other_email: string;
  full_name: string | null;
  headline: string | null;
  role: string | null;
  company: string | null;
  avatar_url: string | null;
  phone: string | null;
  linkedin_url: string | null;
  card_visibility: string;
  profile_slug: string | null;
  event_name: string;
  event_slug: string;
  event_starts_at: string;
};

// Devuelve las conexiones aceptadas del usuario, deduplicadas por persona (una
// tarjeta por contacto) con la lista de eventos donde se conectaron.
export async function getMyConnections(): Promise<MyConnection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_my_connections");

  if (error) {
    console.error("No se pudieron cargar las conexiones", error);
    return [];
  }

  const rows = (data as ConnectionRow[] | null) ?? [];

  // Agrupa por persona: la identidad es el profile_id (perfil global) o, si no
  // hay, el email. Una persona conocida en dos eventos aparece una sola vez.
  const byPerson = new Map<string, MyConnection>();

  for (const row of rows) {
    const key = row.other_profile_id ?? row.other_email;
    const eventContext: ConnectionEventContext = {
      eventName: row.event_name,
      eventSlug: row.event_slug,
      startsAt: row.event_starts_at,
    };

    const existing = byPerson.get(key);
    if (existing) {
      if (
        !existing.events.some(
          (event) => event.eventSlug === eventContext.eventSlug,
        )
      ) {
        existing.events.push(eventContext);
      }
      continue;
    }

    byPerson.set(key, {
      key,
      fullName: row.full_name ?? "Asistente",
      headline: row.headline,
      role: row.role,
      company: row.company,
      avatarUrl: row.avatar_url,
      // Contacto compartido al aceptar la conexion.
      email: row.other_email,
      phone: row.phone,
      linkedinUrl: row.linkedin_url,
      profileSlug: row.card_visibility !== "private" ? row.profile_slug : null,
      events: [eventContext],
    });
  }

  return Array.from(byPerson.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}

export type PendingConnectionRequest = {
  requestId: string;
  eventName: string;
  createdAt: string;
  requesterName: string;
  requesterRole: string | null;
  requesterCompany: string | null;
  requesterAvatarUrl: string | null;
};

type PendingRow = {
  request_id: string;
  event_name: string;
  created_at: string;
  requester_full_name: string | null;
  requester_role: string | null;
  requester_company: string | null;
  requester_avatar_url: string | null;
};

// Solicitudes de conexion recibidas y pendientes (por sesion). El usuario las
// acepta o rechaza desde el hub sin entrar a cada evento.
export async function getMyPendingConnections(): Promise<
  PendingConnectionRequest[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "get_my_pending_connection_requests",
  );

  if (error) {
    console.error("No se pudieron cargar las solicitudes pendientes", error);
    return [];
  }

  const rows = (data as PendingRow[] | null) ?? [];

  return rows.map((row) => ({
    requestId: row.request_id,
    eventName: row.event_name,
    createdAt: row.created_at,
    requesterName: row.requester_full_name ?? "Asistente",
    requesterRole: row.requester_role,
    requesterCompany: row.requester_company,
    requesterAvatarUrl: row.requester_avatar_url,
  }));
}
