-- Fase 3.1 (spec 25, Epic 38): metricas globales de plataforma.
--
-- El platform admin necesita el pulso de toda la plataforma, pero la RLS es
-- por organizacion: un platform admin no es miembro de todas. Esta RPC agrega
-- en la DB (counts, sin exponer filas) y valida platform admin desde el JWT
-- (app_private.is_platform_admin, igual que suspend/reactivate). Devuelve una
-- sola fila pequeña; el costo son counts indexados por tabla.

create or replace function public.platform_stats()
returns table (
  organizations_total bigint,
  organizations_active bigint,
  organizations_suspended bigint,
  events_total bigint,
  events_published bigint,
  registrations_active bigint,
  registrations_checked_in bigint,
  connections_total bigint,
  connections_accepted bigint,
  meetings_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.is_platform_admin() then
    raise exception 'Solo platform admins pueden ver metricas de plataforma'
      using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.organizations),
    (select count(*) from public.organizations where suspended_at is null),
    (select count(*) from public.organizations where suspended_at is not null),
    (select count(*) from public.events where deleted_at is null),
    (select count(*) from public.events
      where deleted_at is null and status = 'published'),
    -- Activas = confirmadas (mismo criterio que dashboard/reporte de evento).
    (select count(*) from public.event_registrations
      where status in ('registered', 'checked_in')),
    (select count(*) from public.event_registrations
      where status = 'checked_in'),
    (select count(*) from public.connection_requests),
    (select count(*) from public.connection_requests
      where status = 'accepted'),
    (select count(*) from public.meetings);
end;
$$;

revoke execute on function public.platform_stats() from public, anon;

grant execute on function public.platform_stats() to authenticated;
