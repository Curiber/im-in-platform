create type public.organization_type as enum (
  'university',
  'company',
  'foundation',
  'guild',
  'incubator',
  'community',
  'producer',
  'public_institution',
  'other'
);

create type public.organization_role as enum (
  'owner',
  'admin',
  'event_admin'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.organization_type not null default 'other',
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (length(trim(name)) > 0),
  constraint organizations_website_url_format check (
    website_url is null
    or website_url ~* '^https?://'
  )
);

create table public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'event_admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_users_user_id_idx
  on public.organization_users (user_id);

create index organization_users_organization_id_role_idx
  on public.organization_users (organization_id, role);

create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_users_set_updated_at
before update on public.organization_users
for each row execute function public.set_updated_at();

create or replace function app_private.has_organization_role(
  target_organization_id uuid,
  target_user_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = target_organization_id
      and ou.user_id = target_user_id
      and ou.role = any(allowed_roles)
  );
$$;

create or replace function app_private.is_organization_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = target_organization_id
      and ou.user_id = target_user_id
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;

create policy "members can read their organizations"
on public.organizations
for select
to authenticated
using (app_private.is_organization_member(organizations.id, auth.uid()));

create policy "organization owners and admins can update organizations"
on public.organizations
for update
to authenticated
using (
  app_private.has_organization_role(
    organizations.id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  app_private.has_organization_role(
    organizations.id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "members can read organization users"
on public.organization_users
for select
to authenticated
using (user_id = auth.uid());

create policy "organization owners and admins can add members"
on public.organization_users
for insert
to authenticated
with check (
  app_private.has_organization_role(
    organization_users.organization_id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "organization owners and admins can update members"
on public.organization_users
for update
to authenticated
using (
  app_private.has_organization_role(
    organization_users.organization_id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  app_private.has_organization_role(
    organization_users.organization_id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "organization owners can remove members"
on public.organization_users
for delete
to authenticated
using (
  app_private.has_organization_role(
    organization_users.organization_id,
    auth.uid(),
    array['owner']::public.organization_role[]
  )
);
