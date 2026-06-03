create type public.event_status as enum (
  'draft',
  'published',
  'closed'
);

create type public.event_type as enum (
  'open',
  'closed'
);

create type public.event_modality as enum (
  'in_person',
  'online',
  'hybrid'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  starts_at timestamptz not null,
  arrival_starts_at timestamptz,
  ends_at timestamptz,
  location text,
  modality public.event_modality not null default 'in_person',
  capacity integer not null,
  logo_url text,
  status public.event_status not null default 'draft',
  event_type public.event_type not null default 'open',
  networking_enabled boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_name_not_blank check (length(trim(name)) > 0),
  constraint events_slug_not_blank check (length(trim(slug)) > 0),
  constraint events_capacity_positive check (capacity > 0),
  constraint events_ends_after_start check (
    ends_at is null
    or ends_at > starts_at
  ),
  constraint events_arrival_before_end check (
    arrival_starts_at is null
    or ends_at is null
    or arrival_starts_at < ends_at
  ),
  unique (organization_id, slug)
);

create index events_organization_id_status_idx
  on public.events (organization_id, status);

create index events_starts_at_idx
  on public.events (starts_at);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "organization members can read events"
on public.events
for select
to authenticated
using (app_private.is_organization_member(events.organization_id, auth.uid()));

create policy "published open events are publicly readable"
on public.events
for select
to anon
using (
  status = 'published'
  and event_type = 'open'
);

create policy "organization admins can create events"
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and app_private.has_organization_role(
    events.organization_id,
    auth.uid(),
    array['owner', 'admin', 'event_admin']::public.organization_role[]
  )
);

create policy "organization admins can update events"
on public.events
for update
to authenticated
using (
  app_private.has_organization_role(
    events.organization_id,
    auth.uid(),
    array['owner', 'admin', 'event_admin']::public.organization_role[]
  )
)
with check (
  app_private.has_organization_role(
    events.organization_id,
    auth.uid(),
    array['owner', 'admin', 'event_admin']::public.organization_role[]
  )
);

create policy "organization owners and admins can delete draft events"
on public.events
for delete
to authenticated
using (
  status = 'draft'
  and app_private.has_organization_role(
    events.organization_id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
);

grant select, update on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_users to authenticated;

grant select on table public.events to anon;
grant select, insert, update, delete on table public.events to authenticated;
