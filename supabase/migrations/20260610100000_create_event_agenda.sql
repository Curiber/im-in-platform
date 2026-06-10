create table public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_agenda_items_title_not_blank check (length(trim(title)) > 0),
  constraint event_agenda_items_ends_after_start check (
    ends_at is null
    or ends_at > starts_at
  )
);

create index event_agenda_items_event_id_starts_at_idx
  on public.event_agenda_items (event_id, starts_at);

create trigger event_agenda_items_set_updated_at
before update on public.event_agenda_items
for each row execute function public.set_updated_at();

alter table public.event_agenda_items enable row level security;

create policy "organization members can read agenda items"
on public.event_agenda_items
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

create policy "published open event agendas are publicly readable"
on public.event_agenda_items
for select
to anon
using (
  exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
      and e.status = 'published'
      and e.event_type = 'open'
  )
);

create policy "organization admins can create agenda items"
on public.event_agenda_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

create policy "organization admins can update agenda items"
on public.event_agenda_items
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
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
    where e.id = event_agenda_items.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

create policy "organization admins can delete agenda items"
on public.event_agenda_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);

grant select on table public.event_agenda_items to anon;
grant select, insert, update, delete on table public.event_agenda_items to authenticated;
