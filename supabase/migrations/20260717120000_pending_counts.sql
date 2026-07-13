-- Contadores de pendientes para los badges de la navegacion de /app (spec 37).
-- Por sesion (SECURITY DEFINER, auth.uid()): cuenta las solicitudes de conexion
-- y las reuniones RECIBIDAS y pendientes del usuario. Sin service_role.

-- Inscripciones del usuario que estan en un contexto OPERABLE: activas
-- (registered/checked_in), con networking, evento vigente y organizacion no
-- suspendida. Es el mismo criterio que la superficie por evento
-- (verifyRegistrationAccess): sin esto, una inscripcion cancelada o de un evento
-- borrado/suspendido/sin-networking seguiria contando/operando pendientes.
-- create or replace idempotente: se define aqui y en la migracion de respond
-- para no depender del orden de merge entre PRs.
create or replace function app_private.my_active_registration_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  join public.organizations o on o.id = e.organization_id
  where r.user_id = auth.uid()
    and r.status in ('registered', 'checked_in')
    and e.deleted_at is null
    and e.networking_enabled
    and o.suspended_at is null;
$$;

create or replace function public.get_my_pending_counts()
returns table (
  pending_connections integer,
  pending_meetings integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      select count(*)::integer
      from public.connection_requests c
      where c.status = 'pending'
        and c.receiver_registration_id in (
          select app_private.my_active_registration_ids()
        )
    ),
    (
      select count(*)::integer
      from public.meetings m
      where m.status = 'pending'
        and m.receiver_registration_id in (
          select app_private.my_active_registration_ids()
        )
    );
$$;

revoke all on function public.get_my_pending_counts() from public, anon;
grant execute on function public.get_my_pending_counts() to authenticated;
