-- Configuracion de privacidad de la tarjeta publica desde /app (spec 37,
-- seccion "Configuracion: cuentas conectadas, contrasena, privacidad").
--
-- Hasta ahora la visibilidad de la tarjeta virtual (card_visibility y los flags
-- public_email_enabled / public_phone_enabled) solo se podia cambiar dentro del
-- contexto de un evento (e/[slug]/profile -> profile-service). El perfil global
-- de /app la deja fuera a proposito (update_my_attendee_profile no la toca).
--
-- Este RPC permite que el asistente autenticado gestione la privacidad de su
-- tarjeta desde /app/configuracion, sin evento. Igual que el resto del dominio
-- de /app: SECURITY DEFINER, scope estricto a auth.uid(), whitelist de columnas.
-- El email/telefono publicos solo tienen sentido en la tarjeta completa, asi que
-- se normalizan a false fuera de public_full a nivel de base (no se confia en el
-- cliente): el enforcement no depende del UI.

create or replace function public.update_my_card_visibility(
  p_card_visibility public.profile_card_visibility,
  p_public_email_enabled boolean,
  p_public_phone_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_full boolean := p_card_visibility = 'public_full';
begin
  if v_uid is null then
    return;
  end if;

  update public.attendee_profiles
  set card_visibility = p_card_visibility,
      public_email_enabled = v_full and coalesce(p_public_email_enabled, false),
      public_phone_enabled = v_full and coalesce(p_public_phone_enabled, false)
  where user_id = v_uid;
end;
$$;

revoke all on function public.update_my_card_visibility(
  public.profile_card_visibility, boolean, boolean
) from public, anon;

grant execute on function public.update_my_card_visibility(
  public.profile_card_visibility, boolean, boolean
) to authenticated;
