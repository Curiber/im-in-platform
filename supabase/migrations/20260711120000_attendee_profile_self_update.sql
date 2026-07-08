-- Edicion del perfil global desde /app (spec 37, fase 3).
--
-- El asistente autenticado puede editar su perfil persistente
-- (attendee_profiles) fuera del contexto de un evento. Hasta ahora el perfil
-- solo se actualizaba dentro de un evento (profile-service, event-scoped).
--
-- Se usa un RPC SECURITY DEFINER con whitelist de columnas en vez de un
-- `grant update` amplio: asi el cliente NO puede tocar email, profile_slug,
-- user_id, card_visibility ni los flags de tarjeta publica (esos se gestionan
-- en el flujo de tarjeta del evento). Solo actualiza la fila de auth.uid().

create or replace function public.update_my_attendee_profile(
  p_full_name text,
  p_headline text,
  p_description text,
  p_role text,
  p_company text,
  p_industry text,
  p_interests text[],
  p_goals_seeking text[],
  p_goals_offering text[],
  p_linkedin_url text,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  update public.attendee_profiles
  set full_name = p_full_name,
      headline = p_headline,
      description = p_description,
      role = p_role,
      company = p_company,
      industry = p_industry,
      interests = p_interests,
      goals_seeking = p_goals_seeking,
      goals_offering = p_goals_offering,
      linkedin_url = p_linkedin_url,
      phone = p_phone
  where user_id = v_uid;
end;
$$;

revoke all on function public.update_my_attendee_profile(
  text, text, text, text, text, text, text[], text[], text[], text, text
) from public, anon;

grant execute on function public.update_my_attendee_profile(
  text, text, text, text, text, text, text[], text[], text[], text, text
) to authenticated;
