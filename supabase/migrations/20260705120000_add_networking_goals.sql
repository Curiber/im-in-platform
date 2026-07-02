-- Fase 4.1 (spec 26, Epic 43): objetivos de networking (busco/ofrezco).
--
-- El matchmaking por intencion (spec 12 §B.1) cruza lo que un asistente BUSCA
-- con lo que otro OFRECE. Para eso cada inscripcion/perfil guarda dos listas
-- (`goals_seeking`, `goals_offering`) que comparten un mismo catalogo de
-- etiquetas: sin vocabulario comun no hay cruce posible.
--
-- El catalogo es configurable por evento reutilizando `event_profile_options`
-- con un kind nuevo `goal` (mismo mecanismo que areas/intereses del Epic 31,
-- con fallback a defaults de plataforma en codigo).

-- Nota PG: el valor nuevo del enum no puede USARSE dentro de esta misma
-- transaccion; aqui solo se declara (nadie inserta filas 'goal' en la
-- migracion, las crea el admin en runtime).
alter type public.profile_option_kind add value if not exists 'goal';

alter table public.event_registrations
  add column goals_seeking text[] not null default '{}',
  add column goals_offering text[] not null default '{}';

alter table public.attendee_profiles
  add column goals_seeking text[] not null default '{}',
  add column goals_offering text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- register_attendee: acepta los objetivos en la inscripcion.
--
-- Cuerpo identico al de 20260704120000_organization_suspension (lock del
-- evento, idempotencia por request_id, chequeo de suspension con FOR SHARE,
-- estado inicial pending_verification y consentimientos en la misma
-- transaccion) + los dos parametros nuevos. Llevan default '{}' para que el
-- codigo desplegado que aun llama con 12 argumentos siga funcionando durante
-- la ventana de deploy; por el cambio de firma hay que dropear la version
-- anterior (con defaults, ambas firmas resolverian la misma llamada).
-- ---------------------------------------------------------------------------

drop function if exists public.register_attendee(
  uuid, text, text, text, text, text, text, text[], boolean, boolean, text, uuid
);

create or replace function public.register_attendee(
  p_event_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_company text,
  p_industry text,
  p_interests text[],
  p_networking_opt_in boolean,
  p_public_profile_enabled boolean,
  p_qr_token_hash text,
  p_request_id uuid,
  p_goals_seeking text[] default '{}',
  p_goals_offering text[] default '{}'
)
returns table (result_status text, registration_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_event_found boolean;
  v_count integer;
  v_registration_id uuid;
  v_existing_id uuid;
  v_org_suspended boolean;
begin
  -- Idempotencia (fast path, sin lock).
  select id
  into v_existing_id
  from public.event_registrations
  where creation_request_id = p_request_id;

  if v_existing_id is not null then
    return query select 'ok'::text, v_existing_id;
    return;
  end if;

  -- Lock de la fila del evento: serializa las inscripciones concurrentes.
  select *
  into v_event
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  v_event_found := found;

  -- Re-chequeo de idempotencia con el lock tomado (intento concurrente que
  -- commiteo mientras esperabamos): antes de validar estado/capacidad.
  select id
  into v_existing_id
  from public.event_registrations
  where creation_request_id = p_request_id;

  if v_existing_id is not null then
    return query select 'ok'::text, v_existing_id;
    return;
  end if;

  if not v_event_found or v_event.status <> 'published' then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  -- Organizacion suspendida: bloqueada. FOR SHARE serializa contra
  -- suspend_organization (UPDATE organizations): cierra la carrera entre el lock
  -- del evento (arriba) y la suspension de la org, que tocan filas distintas.
  select o.suspended_at is not null
  into v_org_suspended
  from public.organizations o
  where o.id = v_event.organization_id
  for share;

  if coalesce(v_org_suspended, false) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  if v_event.ends_at is not null and v_event.ends_at < now() then
    return query select 'ended'::text, null::uuid;
    return;
  end if;

  select count(*)
  into v_count
  from public.event_registrations
  where event_registrations.event_id = p_event_id
    and event_registrations.status <> 'cancelled';

  if v_count >= v_event.capacity then
    return query select 'capacity_full'::text, null::uuid;
    return;
  end if;

  begin
    insert into public.event_registrations (
      event_id, email, full_name_snapshot, phone_snapshot,
      role_snapshot, company_snapshot, industry_snapshot, interests,
      goals_seeking, goals_offering,
      networking_opt_in, public_profile_enabled, qr_token_hash,
      creation_request_id, status
    )
    values (
      p_event_id, p_email, p_full_name, p_phone,
      p_role, p_company, p_industry, p_interests,
      coalesce(p_goals_seeking, '{}'), coalesce(p_goals_offering, '{}'),
      p_networking_opt_in, p_public_profile_enabled, p_qr_token_hash,
      p_request_id, 'pending_verification'
    )
    returning id into v_registration_id;
  exception when unique_violation then
    return query select 'duplicate'::text, null::uuid;
    return;
  end;

  insert into public.consents (
    event_id, registration_id, email, consent_type, version, accepted
  )
  values
    (p_event_id, v_registration_id, p_email, 'event_registration', '2026-06-03', true),
    (p_event_id, v_registration_id, p_email, 'organizer_data_processing', '2026-06-03', true),
    (p_event_id, v_registration_id, p_email, 'public_directory', '2026-06-03', p_public_profile_enabled),
    (p_event_id, v_registration_id, p_email, 'connection_requests', '2026-06-03', p_networking_opt_in),
    (p_event_id, v_registration_id, p_email, 'share_contact_on_acceptance', '2026-06-03', p_networking_opt_in);

  return query select 'ok'::text, v_registration_id;
end;
$$;

revoke execute on function public.register_attendee(
  uuid, text, text, text, text, text, text, text[], boolean, boolean, text, uuid, text[], text[]
) from public, anon, authenticated;

grant execute on function public.register_attendee(
  uuid, text, text, text, text, text, text, text[], boolean, boolean, text, uuid, text[], text[]
) to service_role;
