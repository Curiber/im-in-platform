create extension if not exists citext;

create table public.attendee_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email citext not null unique,
  full_name text not null,
  headline text,
  description text,
  phone text,
  role text,
  company text,
  industry text,
  linkedin_url text,
  avatar_url text,
  interests text[] not null default '{}',
  profile_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendee_profiles_full_name_not_blank check (
    length(trim(full_name)) > 0
  ),
  constraint attendee_profiles_linkedin_url_format check (
    linkedin_url is null
    or linkedin_url ~* '^https?://'
  )
);

create index attendee_profiles_user_id_idx
  on public.attendee_profiles (user_id);

create trigger attendee_profiles_set_updated_at
before update on public.attendee_profiles
for each row execute function public.set_updated_at();

alter table public.event_registrations
  add column profile_id uuid references public.attendee_profiles(id) on delete set null;

create index event_registrations_profile_id_idx
  on public.event_registrations (profile_id);

alter table public.attendee_profiles enable row level security;

create policy "organization members can read attendee profiles"
on public.attendee_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.event_registrations r
    join public.events e on e.id = r.event_id
    where r.profile_id = attendee_profiles.id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "users can read their own attendee profile"
on public.attendee_profiles
for select
to authenticated
using (user_id = auth.uid());

grant select on table public.attendee_profiles to authenticated;
