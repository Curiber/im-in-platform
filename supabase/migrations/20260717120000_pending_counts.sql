-- Contadores de pendientes para los badges de la navegacion de /app (spec 37).
-- Por sesion (SECURITY DEFINER, auth.uid()): cuenta las solicitudes de conexion
-- y las reuniones RECIBIDAS y pendientes del usuario. Sin service_role.

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
  with my_regs as (
    select id from public.event_registrations where user_id = auth.uid()
  )
  select
    (
      select count(*)::integer
      from public.connection_requests c
      where c.status = 'pending'
        and c.receiver_registration_id in (select id from my_regs)
    ),
    (
      select count(*)::integer
      from public.meetings m
      where m.status = 'pending'
        and m.receiver_registration_id in (select id from my_regs)
    );
$$;

revoke all on function public.get_my_pending_counts() from public, anon;
grant execute on function public.get_my_pending_counts() to authenticated;
