-- Fase 2.2 (spec 20, Epic 33): comunicaciones del evento.
--
-- El organizador envia un email a los inscritos del evento, filtrando por
-- audiencia (todos los activos / confirmados / acreditados). Cada envio queda
-- registrado como una fila aqui (asunto, cuerpo, audiencia, cuantos
-- destinatarios, quien lo envio), para historial.
--
-- v1 no guarda una fila por destinatario (communication_deliveries): solo el
-- conteo. La entrega es best-effort via el proveedor de email; el registro es
-- el intento/historial del organizador.

create type public.communication_audience as enum (
  'all_active',
  'confirmed',
  'checked_in'
);

create table public.event_communications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  audience public.communication_audience not null,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_communications_subject_not_blank check (
    length(trim(subject)) > 0
  ),
  constraint event_communications_body_not_blank check (
    length(trim(body)) > 0
  )
);

create index event_communications_event_id_created_idx
  on public.event_communications (event_id, created_at desc);

-- Privilegios de tabla explicitos (no depender de los automaticos de Supabase).
grant select, insert on table public.event_communications to authenticated;
grant select, insert on table public.event_communications to service_role;

alter table public.event_communications enable row level security;

-- Lectura: cualquier miembro de la organizacion dueña del evento.
create policy "org members read event communications"
on public.event_communications
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_communications.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

-- Insercion: owner/admin/event_admin de la organizacion dueña del evento.
create policy "org managers create event communications"
on public.event_communications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_communications.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);
