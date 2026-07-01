-- Fase 2.4 (spec 22, Epic 35): dominio de reuniones — modelo + admin.
--
-- Alcance de esta migracion (admin): las tablas, estados y RLS. El flujo del
-- asistente (proponer/aceptar, disponibilidad, prevencion transaccional de
-- dobles reservas/capacidad) es Fase 4.2 y NO se implementa aqui: por eso
-- `meetings` es de solo lectura para el admin (sin policy de escritura todavia).

-- Ubicaciones / puntos de encuentro del evento.
create table public.meeting_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  capacity integer,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_locations_name_not_blank check (length(trim(name)) > 0),
  constraint meeting_locations_capacity_positive check (
    capacity is null or capacity > 0
  )
);

create index meeting_locations_event_id_idx
  on public.meeting_locations (event_id)
  where archived_at is null;

create trigger meeting_locations_set_updated_at
before update on public.meeting_locations
for each row execute function public.set_updated_at();

-- Reuniones 1:1. Reusa el patron de connection_requests (not_self, mismo evento,
-- estados). starts_at/ends_at y location se llenan cuando se agenda.
create type public.meeting_status as enum (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'completed'
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requester_registration_id uuid not null
    references public.event_registrations(id) on delete cascade,
  receiver_registration_id uuid not null
    references public.event_registrations(id) on delete cascade,
  location_id uuid references public.meeting_locations(id) on delete set null,
  status public.meeting_status not null default 'pending',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_not_self check (
    requester_registration_id <> receiver_registration_id
  ),
  constraint meetings_valid_schedule check (ends_at > starts_at)
);

create index meetings_event_id_status_idx
  on public.meetings (event_id, status);

create index meetings_event_id_starts_at_idx
  on public.meetings (event_id, starts_at);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

-- "Mismo evento": ambos participantes y la ubicacion (si hay) deben pertenecer
-- al event_id de la reunion. Un check no puede cruzar tablas, asi que se hace
-- con un trigger — vale para cualquier via de escritura (incluida la futura del
-- asistente en 4.2).
create or replace function app_private.meetings_enforce_same_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.event_registrations r
    where r.id = new.requester_registration_id and r.event_id = new.event_id
  ) then
    raise exception 'El solicitante no pertenece al evento'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.event_registrations r
    where r.id = new.receiver_registration_id and r.event_id = new.event_id
  ) then
    raise exception 'El receptor no pertenece al evento'
      using errcode = '23514';
  end if;

  if new.location_id is not null and not exists (
    select 1 from public.meeting_locations l
    where l.id = new.location_id and l.event_id = new.event_id
  ) then
    raise exception 'La ubicacion no pertenece al evento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger meetings_enforce_same_event
before insert or update on public.meetings
for each row execute function app_private.meetings_enforce_same_event();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.meeting_locations enable row level security;
alter table public.meetings enable row level security;

grant select, insert, update on table public.meeting_locations to authenticated;
-- meetings: solo lectura desde admin. La escritura del asistente (4.2) definira
-- su propia via (RPC / policy dedicada) cuando exista.
grant select on table public.meetings to authenticated;

-- meeting_locations: miembros leen; owner/admin/event_admin gestionan.
create policy "org members read meeting locations"
on public.meeting_locations
for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = meeting_locations.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "org managers insert meeting locations"
on public.meeting_locations
for insert
to authenticated
with check (
  exists (
    select 1 from public.events e
    where e.id = meeting_locations.event_id
      and app_private.has_organization_role(
        e.organization_id, auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

create policy "org managers update meeting locations"
on public.meeting_locations
for update
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = meeting_locations.event_id
      and app_private.has_organization_role(
        e.organization_id, auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
)
with check (
  exists (
    select 1 from public.events e
    where e.id = meeting_locations.event_id
      and app_private.has_organization_role(
        e.organization_id, auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

-- meetings: miembros de la organizacion leen (admin). Sin policy de escritura.
create policy "org members read meetings"
on public.meetings
for select
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = meetings.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);
