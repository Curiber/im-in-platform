create type public.registration_status as enum (
  'registered',
  'checked_in',
  'cancelled',
  'no_show'
);

create type public.consent_type as enum (
  'event_registration',
  'organizer_data_processing',
  'public_directory',
  'connection_requests',
  'share_contact_on_acceptance'
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name_snapshot text not null,
  phone_snapshot text,
  company_snapshot text,
  role_snapshot text,
  industry_snapshot text,
  interests text[] not null default '{}',
  networking_opt_in boolean not null default false,
  public_profile_enabled boolean not null default false,
  qr_token_hash text not null unique,
  status public.registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_email_not_blank check (length(trim(email)) > 0),
  constraint event_registrations_full_name_not_blank check (
    length(trim(full_name_snapshot)) > 0
  ),
  unique (event_id, email)
);

create index event_registrations_event_id_status_idx
  on public.event_registrations (event_id, status);

create index event_registrations_event_id_networking_idx
  on public.event_registrations (event_id, public_profile_enabled)
  where public_profile_enabled = true;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.event_registrations(id) on delete cascade,
  email text,
  consent_type public.consent_type not null,
  version text not null,
  accepted boolean not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index consents_event_id_registration_id_idx
  on public.consents (event_id, registration_id);

create trigger event_registrations_set_updated_at
before update on public.event_registrations
for each row execute function public.set_updated_at();

alter table public.event_registrations enable row level security;
alter table public.consents enable row level security;

create policy "organization members can read event registrations"
on public.event_registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_registrations.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "organization admins can update event registrations"
on public.event_registrations
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_registrations.event_id
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
    where e.id = event_registrations.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

create policy "users can read their own event registrations"
on public.event_registrations
for select
to authenticated
using (user_id = auth.uid());

create policy "organization members can read consents"
on public.consents
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = consents.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "users can read their own consents"
on public.consents
for select
to authenticated
using (user_id = auth.uid());

grant select, update on table public.event_registrations to authenticated;
grant select on table public.consents to authenticated;
