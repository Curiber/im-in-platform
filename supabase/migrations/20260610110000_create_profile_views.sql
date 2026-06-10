create table public.profile_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  viewer_registration_id uuid not null references public.event_registrations(id) on delete cascade,
  viewed_registration_id uuid not null references public.event_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_views_no_self_view check (
    viewer_registration_id <> viewed_registration_id
  )
);

create index profile_views_event_id_viewed_idx
  on public.profile_views (event_id, viewed_registration_id);

alter table public.profile_views enable row level security;

create policy "organization members can read profile views"
on public.profile_views
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = profile_views.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

grant select on table public.profile_views to authenticated;
