-- Epic 28 (spec 11, P9): creacion atomica de organizaciones.
--
-- `createOrganization` insertaba la organizacion y el membership owner en dos
-- pasos sin transaccion: si fallaba el segundo, quedaba una organizacion sin
-- ningun owner (invisible para el cliente, solo detectable por platform admin).
--
-- Esta RPC inserta ambos en una sola transaccion (el cuerpo plpgsql es atomico:
-- si falla el insert del membership, el insert de la organizacion tambien se
-- revierte). La resolucion/invitacion del usuario owner sigue en la server
-- action (requiere la Admin API de Auth); la compensacion del usuario huerfano
-- tambien.
--
-- Solo el service_role la ejecuta (el cliente admin del servidor, tras validar
-- platform admin en la action). No se expone a anon/authenticated.

create or replace function public.create_organization_with_owner(
  p_name text,
  p_type public.organization_type,
  p_website_url text,
  p_owner_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  insert into public.organizations (name, type, website_url)
  values (p_name, p_type, p_website_url)
  returning id into v_organization_id;

  insert into public.organization_users (organization_id, user_id, role)
  values (v_organization_id, p_owner_user_id, 'owner');

  return v_organization_id;
end;
$$;

revoke execute on function public.create_organization_with_owner(
  text, public.organization_type, text, uuid
) from public, anon, authenticated;

grant execute on function public.create_organization_with_owner(
  text, public.organization_type, text, uuid
) to service_role;
