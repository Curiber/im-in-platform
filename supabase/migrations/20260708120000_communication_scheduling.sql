-- Epic 51 (spec 34): programar comunicaciones (recordatorio pre-evento).
--
-- El outbox del spec 20 ya tiene todo lo dificil (claim atomico, reintentos,
-- idempotencia, cron cada 5 min): programar es una columna `scheduled_at` que
-- el claim ignora hasta que vence. Latencia de entrega <= el periodo del cron.
--
-- Audiencia FRESCA al enviar: el snapshot de destinatarios del encolado se
-- RECOMPUTA en el primer claim de una comunicacion programada (los inscritos
-- de ultima hora reciben el recordatorio). Desde ese primer claim el snapshot
-- queda fijo, preservando la propiedad del spec 20: los reintentos usan el
-- mismo set/orden y las idempotency-keys por indice siguen alineadas.

-- Nota PG: el valor nuevo del enum no puede USARSE en esta transaccion; las
-- funciones de abajo solo lo referencian como texto (se resuelve al ejecutar).
alter type public.communication_status add value if not exists 'cancelled';

alter table public.event_communications
  add column scheduled_at timestamptz;

-- ---------------------------------------------------------------------------
-- Snapshot de audiencia compartido por enqueue (inmediato) y claim (refresh de
-- programadas). Mismo criterio del spec 20: estados activos, orden estable.
-- ---------------------------------------------------------------------------

create or replace function public.communication_audience_snapshot(
  p_event_id uuid,
  p_audience public.communication_audience
)
returns table (recipients jsonb, recipient_count integer)
language sql
security definer
set search_path = ''
as $$
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object('email', r.email, 'name', r.full_name_snapshot)
        order by r.email
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  from public.event_registrations r
  where r.event_id = p_event_id
    and r.status = any(
      case p_audience
        when 'all_active' then
          array['registered', 'checked_in']::public.registration_status[]
        when 'confirmed' then array['registered']::public.registration_status[]
        when 'checked_in' then array['checked_in']::public.registration_status[]
      end
    );
$$;

revoke execute on function public.communication_audience_snapshot(
  uuid, public.communication_audience
) from public, anon, authenticated;

grant execute on function public.communication_audience_snapshot(
  uuid, public.communication_audience
) to service_role;

-- ---------------------------------------------------------------------------
-- enqueue_event_communication: acepta p_scheduled_at (null = envio inmediato).
-- Una fecha en el pasado se trata como inmediata (clamp), no como error: el
-- caso real es un organizador apurando un envio "para ya".
-- Reemplaza la firma de 5 argumentos (con default ambas resolverian la misma
-- llamada).
-- ---------------------------------------------------------------------------

drop function if exists public.enqueue_event_communication(
  uuid, public.communication_audience, text, text, uuid
);

create or replace function public.enqueue_event_communication(
  p_event_id uuid,
  p_audience public.communication_audience,
  p_subject text,
  p_body text,
  p_idempotency_key uuid,
  p_scheduled_at timestamptz default null
)
returns table (result text, recipient_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_org_id uuid;
  v_recipients jsonb;
  v_count integer;
  v_scheduled timestamptz;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select organization_id
  into v_org_id
  from public.events
  where id = p_event_id and deleted_at is null;

  if not found then
    raise exception 'Evento invalido' using errcode = 'P0002';
  end if;

  if not app_private.has_organization_role(
       v_org_id,
       v_caller,
       array['owner', 'admin', 'event_admin']::public.organization_role[]
     ) then
    raise exception 'Sin permisos sobre este evento' using errcode = '42501';
  end if;

  v_scheduled := case
    when p_scheduled_at is not null and p_scheduled_at > now() then p_scheduled_at
    else null
  end;

  -- Snapshot al encolar: autoritativo para el envio inmediato; para el
  -- programado es el conteo de referencia (el claim lo refresca al vencer).
  select s.recipients, s.recipient_count
  into v_recipients, v_count
  from public.communication_audience_snapshot(p_event_id, p_audience) s;

  -- Un envio INMEDIATO sin audiencia no tiene sentido; uno programado si (la
  -- audiencia puede crecer antes del vencimiento).
  if v_count = 0 and v_scheduled is null then
    return query select 'empty'::text, 0;
    return;
  end if;

  begin
    insert into public.event_communications (
      event_id, audience, subject, body, recipients, recipient_count,
      idempotency_key, sent_by, scheduled_at
    )
    values (
      p_event_id, p_audience, p_subject, p_body, v_recipients, v_count,
      p_idempotency_key, v_caller, v_scheduled
    );
  exception when unique_violation then
    -- Mismo idempotency_key: doble submit, no se duplica.
    return query select 'duplicate'::text, 0;
    return;
  end;

  return query select
    case when v_scheduled is null then 'ok' else 'scheduled' end::text,
    v_count;
end;
$$;

revoke execute on function public.enqueue_event_communication(
  uuid, public.communication_audience, text, text, uuid, timestamptz
) from public, anon;

grant execute on function public.enqueue_event_communication(
  uuid, public.communication_audience, text, text, uuid, timestamptz
) to authenticated;

-- ---------------------------------------------------------------------------
-- claim_communications: no reclama programadas sin vencer y refresca el
-- snapshot de una programada en su PRIMER claim (attempts = 1). Cuerpo basado
-- en la version del Epic 37 (filtro de organizaciones suspendidas incluido).
-- ---------------------------------------------------------------------------

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
declare
  v_ids uuid[];
begin
  update public.event_communications
  set status = 'failed',
      last_error = coalesce(last_error, 'agoto reintentos en sending')
  where status = 'sending'
    and attempts >= p_max_attempts
    and claimed_at < now() - make_interval(secs => p_stale_seconds);

  with claimed as (
    update public.event_communications c
    set status = 'sending',
        claimed_at = now(),
        attempts = c.attempts + 1
    where c.id in (
      select c2.id
      from public.event_communications c2
      where (
          c2.status = 'pending'
          or (
            c2.status = 'sending'
            and c2.claimed_at < now() - make_interval(secs => p_stale_seconds)
            and c2.attempts < p_max_attempts
          )
          or (c2.status = 'failed' and c2.attempts < p_max_attempts)
        )
        -- Programadas: solo cuando vencen.
        and (c2.scheduled_at is null or c2.scheduled_at <= now())
        -- Excluye organizaciones suspendidas: sus correos no se despachan.
        and not exists (
          select 1
          from public.events e
          join public.organizations o on o.id = e.organization_id
          where e.id = c2.event_id
            and o.suspended_at is not null
        )
      order by c2.created_at
      limit p_limit
      for update skip locked
    )
    returning c.id
  )
  select array_agg(id) into v_ids from claimed;

  if v_ids is null then
    return;
  end if;

  -- Refresh de audiencia para programadas en su primer intento: los inscritos
  -- posteriores al encolado reciben el correo. Solo attempts = 1: desde ahi el
  -- snapshot queda fijo y los reintentos siguen alineados (idempotencia).
  update public.event_communications c
  set recipients = s.recipients,
      recipient_count = s.recipient_count
  from (
    select c2.id, snap.recipients, snap.recipient_count
    from public.event_communications c2,
         lateral public.communication_audience_snapshot(c2.event_id, c2.audience) snap
    where c2.id = any(v_ids)
      and c2.scheduled_at is not null
      and c2.attempts = 1
  ) s
  where c.id = s.id;

  return query
  select *
  from public.event_communications
  where id = any(v_ids)
  order by created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_scheduled_communication: el organizador cancela una programada que
-- aun no vence. Solo `pending` con `scheduled_at` futuro: una en vuelo o ya
-- enviada no se puede cancelar (el claim toma FOR UPDATE, asi que una
-- cancelacion concurrente espera y falla limpiamente con not_found).
-- ---------------------------------------------------------------------------

create or replace function public.cancel_scheduled_communication(
  p_communication_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_org_id uuid;
  v_updated integer;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select e.organization_id
  into v_org_id
  from public.event_communications c
  join public.events e on e.id = c.event_id
  where c.id = p_communication_id;

  if not found then
    return 'not_found';
  end if;

  if not app_private.has_organization_role(
       v_org_id,
       v_caller,
       array['owner', 'admin', 'event_admin']::public.organization_role[]
     ) then
    raise exception 'Sin permisos sobre este evento' using errcode = '42501';
  end if;

  update public.event_communications
  set status = 'cancelled'
  where id = p_communication_id
    and status = 'pending'
    and scheduled_at is not null
    and scheduled_at > now();

  get diagnostics v_updated = row_count;

  return case when v_updated = 1 then 'ok' else 'not_found' end;
end;
$$;

revoke execute on function public.cancel_scheduled_communication(uuid)
  from public, anon;

grant execute on function public.cancel_scheduled_communication(uuid)
  to authenticated, service_role;
