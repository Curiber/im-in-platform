-- Epic 23 (review #22): separar el TTL del link de verificacion de la fecha de
-- inscripcion.
--
-- `registered_at` es la fecha real de inscripcion (export, ordenamiento) y no
-- debe sobrescribirse al reenviar el link. Se agrega `verification_sent_at`
-- como ancla del TTL de 24h: lo setea el registro y lo reinicia cada reenvio.

alter table public.event_registrations
  add column if not exists verification_sent_at timestamptz;

-- register_attendee: ahora setea verification_sent_at en la insercion.
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
  p_request_id uuid
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
begin
  select id
  into v_existing_id
  from public.event_registrations
  where creation_request_id = p_request_id;

  if v_existing_id is not null then
    return query select 'ok'::text, v_existing_id;
    return;
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  v_event_found := found;

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
      networking_opt_in, public_profile_enabled, qr_token_hash,
      creation_request_id, status, verification_sent_at
    )
    values (
      p_event_id, p_email, p_full_name, p_phone,
      p_role, p_company, p_industry, p_interests,
      p_networking_opt_in, p_public_profile_enabled, p_qr_token_hash,
      p_request_id, 'pending_verification', now()
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
  uuid, text, text, text, text, text, text, text[], boolean, boolean, text, uuid
) from public, anon, authenticated;

grant execute on function public.register_attendee(
  uuid, text, text, text, text, text, text, text[], boolean, boolean, text, uuid
) to service_role;

-- Cleanup: el TTL ahora se ancla en verification_sent_at (fallback al
-- registered_at por filas previas a esta columna).
create or replace function public.delete_expired_pending_registrations(
  p_max_age interval default interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.event_registrations
  where status = 'pending_verification'
    and coalesce(verification_sent_at, registered_at) < now() - p_max_age;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.delete_expired_pending_registrations(interval)
  from public, anon, authenticated;

grant execute on function public.delete_expired_pending_registrations(interval)
  to service_role;
