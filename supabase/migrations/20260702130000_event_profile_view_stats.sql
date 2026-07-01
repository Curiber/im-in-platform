-- Fase 2.3 (spec 21, Epic 34): agregacion de vistas de perfil para el dashboard.
--
-- El dashboard traia TODAS las filas de profile_views (tabla que crece sin
-- limite con cada vista) cada 15s para contar total, visitantes unicos y el
-- ranking de mas vistos. Esta RPC hace la agregacion en la DB y devuelve un
-- resultado pequeño y constante.
--
-- security definer: valida que el llamador sea miembro de la organizacion dueña
-- del evento (misma regla que la policy de lectura de profile_views), y agrega
-- sin exponer filas.

-- Indice para el count distinct de visitantes por evento (el existente cubre
-- viewed, no viewer).
create index if not exists profile_views_event_id_viewer_idx
  on public.profile_views (event_id, viewer_registration_id);

create or replace function public.event_profile_view_stats(p_event_id uuid)
returns table (
  total_views bigint,
  unique_viewers bigint,
  top_viewed jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  ) then
    raise exception 'Sin permisos sobre este evento' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    count(distinct pv.viewer_registration_id)::bigint,
    coalesce(
      (
        select jsonb_agg(t)
        from (
          select
            r.full_name_snapshot as name,
            count(*)::int as views
          from public.profile_views pv2
          join public.event_registrations r
            on r.id = pv2.viewed_registration_id
          where pv2.event_id = p_event_id
          group by r.full_name_snapshot
          order by count(*) desc, r.full_name_snapshot
          limit 8
        ) t
      ),
      '[]'::jsonb
    )
  from public.profile_views pv
  where pv.event_id = p_event_id;
end;
$$;

revoke execute on function public.event_profile_view_stats(uuid)
  from public, anon;

grant execute on function public.event_profile_view_stats(uuid) to authenticated;
