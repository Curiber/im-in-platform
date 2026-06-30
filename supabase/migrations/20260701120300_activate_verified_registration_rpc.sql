-- Fase 2.1b (spec 19, Epic 32): transicion atomica de verificacion.
--
-- La ruta /verify leia `registration_mode` sin bloquear el evento y luego
-- escribia el estado. Eso podia intercalarse con set_event_registration_mode:
--   1. /verify lee 'approval'.
--   2. set_event_registration_mode cambia el evento a 'open' y promueve las
--      pending_approval existentes.
--   3. /verify escribe una NUEVA pending_approval.
-- Resultado: evento 'open' con una solicitud bloqueada y oculta (sin cola).
--
-- Esta RPC lee el modo y fija el estado destino bajo el MISMO lock del evento
-- (`for update`), con el mismo orden event-first que register_attendee y
-- set_event_registration_mode (sin riesgo de deadlock). Asi /verify se serializa
-- con el cambio de modo: o ve el modo nuevo y escribe 'registered', o escribe
-- 'pending_approval' antes del cambio y set_event_registration_mode la promueve.
--
-- Es publica y token-autenticada (la ruta valida el token del QR antes de
-- llamarla); no usa auth.uid(). Solo service_role la ejecuta, igual que
-- register_attendee.

create or replace function public.activate_verified_registration(
  p_registration_id uuid,
  p_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_mode public.event_registration_mode;
  v_status public.registration_status;
  v_target public.registration_status;
begin
  -- event_id es inmutable: se puede leer sin lock para luego bloquear el evento.
  select event_id
  into v_event_id
  from public.event_registrations
  where id = p_registration_id;

  if not found then
    raise exception 'Inscripcion invalida' using errcode = 'P0002';
  end if;

  -- Lock del evento (event-first) + lectura del modo bajo el lock.
  select registration_mode
  into v_mode
  from public.events
  where id = v_event_id
  for update;

  -- Re-lee el estado con el lock tomado (otra verificacion concurrente pudo
  -- transicionarla): guard de idempotencia.
  select status
  into v_status
  from public.event_registrations
  where id = p_registration_id;

  if v_status <> 'pending_verification' then
    return 'unchanged';
  end if;

  v_target := case
    when v_mode = 'approval' then 'pending_approval'::public.registration_status
    else 'registered'::public.registration_status
  end;

  update public.event_registrations
    set status = v_target, profile_id = p_profile_id
    where id = p_registration_id
      and status = 'pending_verification';

  return v_target::text;
end;
$$;

revoke execute on function public.activate_verified_registration(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.activate_verified_registration(uuid, uuid)
  to service_role;
