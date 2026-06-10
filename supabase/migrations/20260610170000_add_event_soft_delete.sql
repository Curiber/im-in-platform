alter table public.events
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null,
  add column delete_reason text;

create index events_active_organization_status_starts_at_idx
  on public.events (organization_id, status, starts_at)
  where deleted_at is null;

create index events_deleted_organization_deleted_at_idx
  on public.events (organization_id, deleted_at)
  where deleted_at is not null;

drop policy if exists "published open events are publicly readable"
on public.events;

create policy "published open events are publicly readable"
on public.events
for select
to anon
using (
  deleted_at is null
  and status = 'published'
  and event_type = 'open'
);

drop policy if exists "published open event agendas are publicly readable"
on public.event_agenda_items;

create policy "published open event agendas are publicly readable"
on public.event_agenda_items
for select
to anon
using (
  exists (
    select 1
    from public.events e
    where e.id = event_agenda_items.event_id
      and e.deleted_at is null
      and e.status = 'published'
      and e.event_type = 'open'
  )
);
