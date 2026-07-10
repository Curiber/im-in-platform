-- Responder solicitudes de conexion desde /app (spec 37: "aceptar/rechazar
-- solicitudes recibidas" como capacidad del usuario). Hasta ahora solo se podia
-- dentro de cada evento (token). Estos RPCs lo llevan al hub /app/conexiones,
-- por sesion: SECURITY DEFINER que derivan auth.uid() y limitan el acceso a las
-- solicitudes de las que el usuario es RECEPTOR. Sin service_role.

-- Solicitudes de conexion recibidas y pendientes, con el perfil vivo de quien
-- las envio.
create or replace function public.get_my_pending_connection_requests()
returns table (
  request_id uuid,
  event_name text,
  created_at timestamptz,
  requester_full_name text,
  requester_role text,
  requester_company text,
  requester_avatar_url text
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
    c.id,
    e.name,
    c.created_at,
    coalesce(p.full_name, r.full_name_snapshot),
    coalesce(p.role, r.role_snapshot),
    coalesce(p.company, r.company_snapshot),
    p.avatar_url
  from public.connection_requests c
  join public.event_registrations r on r.id = c.requester_registration_id
  join public.events e on e.id = c.event_id and e.deleted_at is null
  left join public.attendee_profiles p on p.id = r.profile_id
  where c.status = 'pending'
    and c.receiver_registration_id in (select id from my_regs)
  order by c.created_at desc;
$$;

revoke all on function public.get_my_pending_connection_requests()
  from public, anon;
grant execute on function public.get_my_pending_connection_requests()
  to authenticated;

-- Responde (acepta/rechaza) una solicitud de la que el usuario es receptor. Al
-- aceptar devuelve los datos de ambas partes para la notificacion (el caller es
-- parte y puede recibirlos). Atomico: bloquea la fila y valida estado bajo el
-- lock, para no pisar una respuesta concurrente.
create or replace function public.respond_to_connection_request(
  p_request_id uuid,
  p_accept boolean
)
returns table (
  result text,
  requester_email text,
  requester_name text,
  receiver_email text,
  receiver_name text,
  event_name text
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.connection_request_status;
  v_requester_id uuid;
  v_receiver_id uuid;
  v_event_id uuid;
begin
  if v_uid is null then
    return query
      select 'unauthenticated'::text, null::text, null::text, null::text,
             null::text, null::text;
    return;
  end if;

  select c.status, c.requester_registration_id, c.receiver_registration_id,
         c.event_id
  into v_status, v_requester_id, v_receiver_id, v_event_id
  from public.connection_requests c
  join public.event_registrations rr on rr.id = c.receiver_registration_id
  where c.id = p_request_id
    and rr.user_id = v_uid
  for update of c;

  if not found or v_status <> 'pending' then
    return query
      select 'not_found'::text, null::text, null::text, null::text,
             null::text, null::text;
    return;
  end if;

  update public.connection_requests
  set status = case when p_accept then 'accepted' else 'rejected' end,
      responded_at = now()
  where id = p_request_id
    and status = 'pending';

  if not p_accept then
    return query
      select 'rejected'::text, null::text, null::text, null::text,
             null::text, null::text;
    return;
  end if;

  return query
  select
    'accepted'::text,
    reqr.email,
    coalesce(reqp.full_name, reqr.full_name_snapshot),
    rcvr.email,
    coalesce(rcvp.full_name, rcvr.full_name_snapshot),
    e.name
  from public.event_registrations reqr
  join public.event_registrations rcvr on rcvr.id = v_receiver_id
  join public.events e on e.id = v_event_id
  left join public.attendee_profiles reqp on reqp.id = reqr.profile_id
  left join public.attendee_profiles rcvp on rcvp.id = rcvr.profile_id
  where reqr.id = v_requester_id;
end;
$$;

revoke all on function public.respond_to_connection_request(uuid, boolean)
  from public, anon;
grant execute on function public.respond_to_connection_request(uuid, boolean)
  to authenticated;
