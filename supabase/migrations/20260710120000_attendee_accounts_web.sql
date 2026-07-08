-- Cuentas de asistente en la web (spec 37, fase 1). Complementa la identidad de
-- asistente del spec 31 (claim_attendee_identity + /mi OTP) agregando lo que la
-- superficie /app necesita y que el spec 31 no cubria:
--   - Unicidad de la relacion cuenta<->perfil e inscripcion.
--   - Lectura por sesion (RLS) de los eventos que le competen, para /app sin
--     depender del service role.
-- El reclamo por email lo hace el RPC claim_attendee_identity del spec 31; aqui
-- NO se redefine.

-- Un usuario tiene a lo sumo un perfil global.
create unique index if not exists attendee_profiles_user_id_key
  on public.attendee_profiles (user_id)
  where user_id is not null;

-- Una inscripcion por usuario por evento (complementa unique(event_id, email)).
create unique index if not exists event_registrations_event_user_key
  on public.event_registrations (event_id, user_id)
  where user_id is not null;

-- Helper SECURITY DEFINER para evitar recursion de RLS entre events y
-- event_registrations (misma tecnica que app_private.is_organization_member).
create or replace function app_private.user_has_registration(
  target_event_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.event_registrations r
    where r.event_id = target_event_id
      and r.user_id = target_user_id
  );
$$;

-- Acceso de lectura del asistente autenticado a los eventos que le competen.
-- Hoy solo el rol anon puede leer eventos publicados; el asistente con cuenta
-- necesita el mismo acceso (explorar) y ver los eventos donde esta inscrito.
create policy "authenticated can read published open events"
on public.events
for select
to authenticated
using (
  status = 'published'
  and event_type = 'open'
);

create policy "users can read events they registered to"
on public.events
for select
to authenticated
using (app_private.user_has_registration(events.id, auth.uid()));
