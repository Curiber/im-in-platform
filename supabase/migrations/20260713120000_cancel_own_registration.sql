-- Cancelacion de la propia inscripcion desde /app (spec 37).
--
-- Hasta ahora solo el organizador podia cancelar una inscripcion. El asistente
-- puede cancelar la suya desde "Mis eventos": libera el cupo (register_attendee
-- cuenta status <> 'cancelled') y lo retira del directorio (que filtra
-- registered/checked_in).
--
-- RPC SECURITY DEFINER con scope a auth.uid(): solo cancela una inscripcion del
-- propio usuario y solo desde un estado cancelable. checked_in NO se auto-cancela
-- (ya asististe); tampoco cancelled/no_show.

create or replace function public.cancel_my_registration(p_registration_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_status public.registration_status;
begin
  if v_uid is null then
    return 'unauthenticated';
  end if;

  select status
  into v_status
  from public.event_registrations
  where id = p_registration_id
    and user_id = v_uid;

  if not found then
    return 'not_found';
  end if;

  if v_status not in (
    'registered',
    'pending_approval',
    'pending_verification'
  ) then
    return 'not_cancellable';
  end if;

  update public.event_registrations
  set status = 'cancelled'
  where id = p_registration_id
    and user_id = v_uid;

  return 'cancelled';
end;
$$;

revoke all on function public.cancel_my_registration(uuid) from public, anon;
grant execute on function public.cancel_my_registration(uuid) to authenticated;
