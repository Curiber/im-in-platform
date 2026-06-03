create type public.connection_request_status as enum (
  'pending',
  'accepted',
  'rejected',
  'cancelled'
);

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requester_registration_id uuid not null references public.event_registrations(id) on delete cascade,
  receiver_registration_id uuid not null references public.event_registrations(id) on delete cascade,
  status public.connection_request_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint connection_requests_not_self check (
    requester_registration_id <> receiver_registration_id
  ),
  unique (event_id, requester_registration_id, receiver_registration_id)
);

create index connection_requests_event_id_status_idx
  on public.connection_requests (event_id, status);

create index connection_requests_receiver_status_idx
  on public.connection_requests (receiver_registration_id, status);

create trigger connection_requests_set_updated_at
before update on public.connection_requests
for each row execute function public.set_updated_at();

alter table public.connection_requests enable row level security;

create policy "organization members can read connection requests"
on public.connection_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = connection_requests.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "organization admins can update connection requests"
on public.connection_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = connection_requests.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = connection_requests.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

grant select, update on table public.connection_requests to authenticated;
