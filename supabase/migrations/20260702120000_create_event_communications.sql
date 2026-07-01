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
--
-- La tabla funciona como OUTBOX durable: cada fila tiene un estado
-- (pending/sending/sent/failed) y se despacha de forma idempotente. Un
-- procesador (inmediato via `after`, y de respaldo via cron) reclama filas de
-- forma atomica (ver claim_communications) y las envia, con reintentos. Asi un
-- crash entre el registro y el envio no pierde el correo: la fila queda
-- `pending`/`sending` y el cron la retoma.

create type public.communication_audience as enum (
  'all_active',
  'confirmed',
  'checked_in'
);

create type public.communication_status as enum (
  'pending',
  'sending',
  'sent',
  'failed'
);

create table public.event_communications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  audience public.communication_audience not null,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  -- Snapshot de destinatarios [{email, name}] capturado al encolar, en orden
  -- estable. El despacho envia contra este snapshot (no recomputa la audiencia),
  -- de modo que altas/bajas o reintentos no cambian el set ni el orden: los
  -- lotes son estables y sus idempotency-keys por indice siguen alineadas.
  recipients jsonb not null default '[]'::jsonb,
  -- Cuantos correos ACEPTO el proveedor (no entrega confirmada; eso requeriria
  -- webhooks). Se llama accepted, no delivered, para no afirmar de mas.
  accepted_count integer not null default 0,
  status public.communication_status not null default 'pending',
  attempts integer not null default 0,
  claimed_at timestamptz,
  last_error text,
  -- Clave de idempotencia generada por el cliente (una por redaccion): un doble
  -- submit/reintento reusa la misma clave y el insert choca (unique), evitando
  -- una segunda fila y un segundo envio.
  idempotency_key uuid not null,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint event_communications_subject_not_blank check (
    length(trim(subject)) > 0
  ),
  constraint event_communications_body_not_blank check (
    length(trim(body)) > 0
  ),
  unique (idempotency_key)
);

create index event_communications_event_id_created_idx
  on public.event_communications (event_id, created_at desc);

-- Indice para el procesador: encuentra rapido lo que hay que despachar.
create index event_communications_dispatch_idx
  on public.event_communications (status, created_at)
  where status in ('pending', 'sending', 'failed');

-- Privilegios de tabla explicitos (no depender de los automaticos de Supabase).
-- authenticated solo lee e inserta (bajo RLS); el conteo de entregados lo
-- actualiza el envio en background via service_role.
grant select, insert on table public.event_communications to authenticated;
grant select, insert, update on table public.event_communications to service_role;

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

-- Claim atomico del outbox: reclama hasta p_limit comunicaciones despachables y
-- las marca `sending` en una sola operacion. `for update skip locked` evita que
-- dos procesadores (el envio inmediato via `after` y el cron de respaldo) tomen
-- la misma fila. Reclama:
--   - pending: aun no despachadas.
--   - sending viejas (claimed_at < now - stale): un intento previo murio a mitad.
--   - failed con intentos < max: reintento con backoff implicito (por schedule).
-- El re-envio es seguro: cada lote lleva una idempotency-key estable hacia el
-- proveedor, que deduplica los correos ya enviados.
create or replace function public.claim_communications(
  p_limit integer default 10,
  p_stale_seconds integer default 600,
  p_max_attempts integer default 5
)
returns setof public.event_communications
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.event_communications c
  set status = 'sending',
      claimed_at = now(),
      attempts = c.attempts + 1
  where c.id in (
    select c2.id
    from public.event_communications c2
    where c2.status = 'pending'
      or (
        c2.status = 'sending'
        and c2.claimed_at < now() - make_interval(secs => p_stale_seconds)
        and c2.attempts < p_max_attempts
      )
      or (c2.status = 'failed' and c2.attempts < p_max_attempts)
    order by c2.created_at
    limit p_limit
    for update skip locked
  )
  returning c.*;
end;
$$;

revoke execute on function public.claim_communications(integer, integer, integer)
  from public, anon, authenticated;

grant execute on function public.claim_communications(integer, integer, integer)
  to service_role;
