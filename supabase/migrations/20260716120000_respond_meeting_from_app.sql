-- Responder reuniones desde /app (spec 37). Simetrico a las conexiones: el hub
-- /app/reuniones muestra las reuniones recibidas pendientes y permite
-- aceptarlas/rechazarlas por sesion, reusando la logica atomica de slots del
-- respond_meeting existente (spec 27) sin exponer service_role.

-- get_my_meetings + is_incoming: distingue si el usuario es el RECEPTOR de la
-- reunion (puede responder) o el proponente (espera respuesta).
create or replace function public.get_my_meetings()
returns table (
  meeting_id uuid,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  event_name text,
  event_slug text,
  other_full_name text,
  other_role text,
  other_company text,
  other_avatar_url text,
  is_incoming boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_regs as (
    select id from public.event_registrations where user_id = auth.uid()
  ),
  mine as (
    select
      m.id,
      m.status,
      m.starts_at,
      m.ends_at,
      m.location_id,
      m.event_id,
      m.receiver_registration_id in (select id from my_regs) as is_incoming,
      case
        when m.requester_registration_id in (select id from my_regs)
          then m.receiver_registration_id
        else m.requester_registration_id
      end as other_reg_id
    from public.meetings m
    where m.status in ('pending', 'accepted', 'completed')
      and (
        m.requester_registration_id in (select id from my_regs)
        or m.receiver_registration_id in (select id from my_regs)
      )
  )
  select
    mine.id,
    mine.status::text,
    mine.starts_at,
    mine.ends_at,
    loc.name,
    e.name,
    e.slug,
    coalesce(p.full_name, r.full_name_snapshot),
    coalesce(p.role, r.role_snapshot),
    coalesce(p.company, r.company_snapshot),
    p.avatar_url,
    mine.is_incoming
  from mine
  join public.event_registrations r on r.id = mine.other_reg_id
  join public.events e on e.id = mine.event_id and e.deleted_at is null
  left join public.attendee_profiles p on p.id = r.profile_id
  left join public.meeting_locations loc on loc.id = mine.location_id
  order by mine.starts_at;
$$;

revoke all on function public.get_my_meetings() from public, anon;
grant execute on function public.get_my_meetings() to authenticated;

-- Wrapper por sesion: resuelve la inscripcion receptora del usuario (auth.uid())
-- para la reunion y delega en respond_meeting (que trae toda la logica de
-- estado/slots/capacidad). Al aceptar devuelve los datos para notificar al
-- proponente (el caller es parte y puede recibirlos).
create or replace function public.respond_meeting_as_user(
  p_meeting_id uuid,
  p_accept boolean
)
returns table (
  result text,
  requester_email text,
  requester_name text,
  accepter_name text,
  event_name text,
  starts_at timestamptz,
  location_name text
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_receiver_reg uuid;
  v_requester_reg uuid;
  v_event_id uuid;
  v_result text;
begin
  if v_uid is null then
    return query
      select 'unauthenticated'::text, null::text, null::text, null::text,
             null::text, null::timestamptz, null::text;
    return;
  end if;

  select m.receiver_registration_id, m.requester_registration_id, m.event_id
  into v_receiver_reg, v_requester_reg, v_event_id
  from public.meetings m
  join public.event_registrations r on r.id = m.receiver_registration_id
  where m.id = p_meeting_id
    and r.user_id = v_uid;

  if v_receiver_reg is null then
    return query
      select 'not_found'::text, null::text, null::text, null::text,
             null::text, null::timestamptz, null::text;
    return;
  end if;

  select rm.result_status
  into v_result
  from public.respond_meeting(p_meeting_id, v_receiver_reg, p_accept) rm;

  -- respond_meeting devuelve 'ok' tanto para aceptar como para rechazar.
  if v_result <> 'ok' then
    return query
      select v_result, null::text, null::text, null::text, null::text,
             null::timestamptz, null::text;
    return;
  end if;

  if not p_accept then
    return query
      select 'declined'::text, null::text, null::text, null::text, null::text,
             null::timestamptz, null::text;
    return;
  end if;

  return query
  select
    'accepted'::text,
    reqr.email,
    coalesce(reqp.full_name, reqr.full_name_snapshot),
    coalesce(rcvp.full_name, rcvr.full_name_snapshot),
    e.name,
    m.starts_at,
    loc.name
  from public.meetings m
  join public.event_registrations reqr on reqr.id = v_requester_reg
  join public.event_registrations rcvr on rcvr.id = v_receiver_reg
  join public.events e on e.id = v_event_id
  left join public.attendee_profiles reqp on reqp.id = reqr.profile_id
  left join public.attendee_profiles rcvp on rcvp.id = rcvr.profile_id
  left join public.meeting_locations loc on loc.id = m.location_id
  where m.id = p_meeting_id;
end;
$$;

revoke all on function public.respond_meeting_as_user(uuid, boolean)
  from public, anon;
grant execute on function public.respond_meeting_as_user(uuid, boolean)
  to authenticated;
