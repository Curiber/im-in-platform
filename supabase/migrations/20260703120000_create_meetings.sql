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
  ),
  -- Target de la FK compuesta de meetings.location_id y, al liderar por
  -- event_id, indice para la cascada de borrado del evento (cubre TODAS las
  -- filas, archivadas incluidas, a diferencia del indice parcial de abajo).
  constraint meeting_locations_event_id_id_key unique (event_id, id)
);

-- Consulta de ubicaciones activas del evento.
create index meeting_locations_event_id_active_idx
  on public.meeting_locations (event_id)
  where archived_at is null;

create trigger meeting_locations_set_updated_at
before update on public.meeting_locations
for each row execute function public.set_updated_at();

-- event_registrations necesita un unique (event_id, id) para ser target de las
-- FK compuestas de meetings (garantia de "mismo evento" a nivel de FK, no solo
-- por trigger). id ya es PK, asi que es unico trivialmente; el unique compuesto
-- habilita la referencia y sirve de indice para las cascadas.
alter table public.event_registrations
  add constraint event_registrations_event_id_id_key unique (event_id, id);

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
  requester_registration_id uuid not null,
  receiver_registration_id uuid not null,
  location_id uuid,
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
  constraint meetings_valid_schedule check (ends_at > starts_at),
  -- "Mismo evento" garantizado por FK compuestas: ambos participantes (y la
  -- ubicacion, si hay) deben pertenecer al event_id de la reunion. La DB lo
  -- mantiene siempre, incluso si se intenta mover el event_id de un padre
  -- (queda bloqueado por la FK), no solo al escribir meetings.
  constraint meetings_requester_fk
    foreign key (event_id, requester_registration_id)
    references public.event_registrations (event_id, id) on delete cascade,
  constraint meetings_receiver_fk
    foreign key (event_id, receiver_registration_id)
    references public.event_registrations (event_id, id) on delete cascade,
  -- location_id nullable: con MATCH SIMPLE, si es null la FK no se chequea. Las
  -- ubicaciones se archivan, no se borran; on delete no action evita borrar una
  -- referenciada (durante el borrado del evento, meetings ya cayo por su propia
  -- cascada, asi que no bloquea).
  constraint meetings_location_fk
    foreign key (event_id, location_id)
    references public.meeting_locations (event_id, id) on delete no action
);

create index meetings_event_id_status_idx
  on public.meetings (event_id, status);

create index meetings_event_id_starts_at_idx
  on public.meetings (event_id, starts_at);

-- Indices para las columnas FK (cascada de borrado de participantes/ubicacion).
create index meetings_requester_registration_id_idx
  on public.meetings (requester_registration_id);

create index meetings_receiver_registration_id_idx
  on public.meetings (receiver_registration_id);

create index meetings_location_id_idx
  on public.meetings (location_id);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

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
