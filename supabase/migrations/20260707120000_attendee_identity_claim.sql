-- Fase 5.2 (spec 31, Epic 48): identidad de asistente — reclamo por email.
--
-- El asistente ahora puede iniciar sesion con OTP por email (Supabase Auth).
-- Esta RPC enlaza su cuenta (auth.uid()) con el perfil persistente y las
-- inscripciones que registro con ese email ANTES de tener cuenta.
--
-- Seguridad:
--   - El email sale del JWT de la sesion (verificado por el OTP), no de un
--     parametro: nadie puede reclamar un email ajeno.
--   - Solo se reclaman filas SIN dueño (user_id is null): si otro usuario ya
--     reclamo ese perfil/inscripcion, no se roba (email reasignado, etc.).
--   - Idempotente: re-ejecutar no cambia nada (las filas ya tienen user_id).
--
-- Se ejecuta con la sesion del asistente (grant a authenticated); el enlace
-- habilita las policies existentes "users can read their own ..." y el acceso
-- por sesion del puente web (spec 31).

create or replace function public.claim_attendee_identity()
returns table (claimed_profiles integer, claimed_registrations integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_email text;
  v_profiles integer;
  v_registrations integer;
begin
  v_uid := auth.uid();
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if v_uid is null or v_email = '' then
    return query select 0, 0;
    return;
  end if;

  -- attendee_profiles.email es citext; se compara via text para no depender
  -- del esquema donde este instalada la extension.
  update public.attendee_profiles
  set user_id = v_uid
  where lower(email::text) = v_email
    and user_id is null;

  get diagnostics v_profiles = row_count;

  update public.event_registrations
  set user_id = v_uid
  where lower(email) = v_email
    and user_id is null;

  get diagnostics v_registrations = row_count;

  return query select v_profiles, v_registrations;
end;
$$;

revoke execute on function public.claim_attendee_identity() from public, anon;

grant execute on function public.claim_attendee_identity()
  to authenticated, service_role;
