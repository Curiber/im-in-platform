-- Red persistente del asistente por sesion (spec 37): mis conexiones y mis
-- reuniones a traves de todos los eventos, SIN service_role.
--
-- Las superficies de /app deben leer con la sesion del asistente y ver solo las
-- partes involucradas. connection_requests y meetings no tienen politica RLS de
-- lectura para asistentes (solo miembros de la organizacion), asi que la lectura
-- se hace con RPCs SECURITY DEFINER que derivan la identidad de auth.uid() (del
-- JWT, jamas de un parametro) y devuelven exclusivamente las conexiones/reuniones
-- del usuario y los datos de su contraparte. Mismo patron que platform_stats /
-- claim_attendee_identity. Se ejecutan con la sesion (grant a authenticated).

create or replace function public.get_my_connections()
returns table (
  other_profile_id uuid,
  other_email text,
  full_name text,
  headline text,
  role text,
  company text,
  avatar_url text,
  phone text,
  linkedin_url text,
  card_visibility text,
  profile_slug text,
  event_name text,
  event_slug text,
  event_starts_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_regs as (
    select id from public.event_registrations where user_id = auth.uid()
  ),
  accepted as (
    select
      case
        when c.requester_registration_id in (select id from my_regs)
          then c.receiver_registration_id
        else c.requester_registration_id
      end as other_reg_id
    from public.connection_requests c
    where c.status = 'accepted'
      and (
        c.requester_registration_id in (select id from my_regs)
        or c.receiver_registration_id in (select id from my_regs)
      )
  )
  select
    r.profile_id,
    r.email,
    coalesce(p.full_name, r.full_name_snapshot),
    p.headline,
    coalesce(p.role, r.role_snapshot),
    coalesce(p.company, r.company_snapshot),
    p.avatar_url,
    p.phone,
    p.linkedin_url,
    p.card_visibility::text,
    p.profile_slug,
    e.name,
    e.slug,
    e.starts_at
  from accepted a
  join public.event_registrations r on r.id = a.other_reg_id
  join public.events e on e.id = r.event_id and e.deleted_at is null
  left join public.attendee_profiles p on p.id = r.profile_id;
$$;

revoke all on function public.get_my_connections() from public, anon;
grant execute on function public.get_my_connections() to authenticated;

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
  other_avatar_url text
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
    p.avatar_url
  from mine
  join public.event_registrations r on r.id = mine.other_reg_id
  join public.events e on e.id = mine.event_id and e.deleted_at is null
  left join public.attendee_profiles p on p.id = r.profile_id
  left join public.meeting_locations loc on loc.id = mine.location_id
  order by mine.starts_at;
$$;

revoke all on function public.get_my_meetings() from public, anon;
grant execute on function public.get_my_meetings() to authenticated;
