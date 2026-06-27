-- Epic 25 (spec 11, P4): inscripcion atomica con control de capacidad.
--
-- `registerForEvent` hacia count() y luego insert() sin atomicidad: dos
-- inscripciones concurrentes al ultimo cupo podian exceder `capacity`. Tampoco
-- se rechazaba inscribirse a un evento ya terminado.
--
-- Esta RPC toma un lock sobre la fila del evento (`for update`), de modo que las
-- inscripciones concurrentes al mismo evento se serializan: el conteo de cupos
-- se hace bajo el lock y no puede sobrevenderse. Inserta la inscripcion y sus
-- consentimientos en la misma transaccion (atomico). Devuelve un status para
-- que la action muestre el mensaje adecuado.
--
-- Solo el service_role la ejecuta (la server action publica usa el cliente
-- admin del servidor).

create or replace function public.register_attendee(
  p_event_id uuid,
  p_profile_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_company text,
  p_industry text,
  p_interests text[],
  p_networking_opt_in boolean,
  p_public_profile_enabled boolean,
  p_qr_token_hash text
)
returns table (status text, registration_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_count integer;
  v_registration_id uuid;
begin
  -- Lock de la fila del evento: serializa las inscripciones concurrentes.
  select *
  into v_event
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  if not found or v_event.status <> 'published' then
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
  where event_id = p_event_id and status <> 'cancelled';

  if v_count >= v_event.capacity then
    return query select 'capacity_full'::text, null::uuid;
    return;
  end if;

  begin
    insert into public.event_registrations (
      event_id, profile_id, email, full_name_snapshot, phone_snapshot,
      role_snapshot, company_snapshot, industry_snapshot, interests,
      networking_opt_in, public_profile_enabled, qr_token_hash
    )
    values (
      p_event_id, p_profile_id, p_email, p_full_name, p_phone,
      p_role, p_company, p_industry, p_interests,
      p_networking_opt_in, p_public_profile_enabled, p_qr_token_hash
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
  uuid, uuid, text, text, text, text, text, text, text[], boolean, boolean, text
) from public, anon, authenticated;

grant execute on function public.register_attendee(
  uuid, uuid, text, text, text, text, text, text, text[], boolean, boolean, text
) to service_role;
