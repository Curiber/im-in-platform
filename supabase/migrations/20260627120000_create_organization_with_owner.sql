-- Epic 28 (spec 11, P9): creacion atomica de organizaciones.
--
-- `createOrganization` insertaba la organizacion y el membership owner en dos
-- pasos sin transaccion: si fallaba el segundo, quedaba una organizacion sin
-- ningun owner (invisible para el cliente, solo detectable por platform admin).
--
-- Esta RPC inserta ambos en una sola transaccion (el cuerpo plpgsql es atomico:
-- si falla el insert del membership, el insert de la organizacion tambien se
-- revierte). La resolucion/invitacion del usuario owner sigue en la server
-- action (requiere la Admin API de Auth).
--
-- `creation_request_id` es una clave de idempotencia generada por la action
-- antes de llamar la RPC: si la RPC commitea pero la respuesta falla (red), la
-- action consulta esta columna para saber si hubo commit y evitar una
-- compensacion erronea (borrar al owner recien creado).
--
-- Solo el service_role la ejecuta (el cliente admin del servidor, tras validar
-- platform admin en la action). No se expone a anon/authenticated.

alter table public.organizations
  add column if not exists creation_request_id uuid;

-- Indice unico NO parcial: Postgres trata los NULL como distintos, asi que las
-- filas existentes (creation_request_id NULL) conviven sin conflicto. Debe ser
-- no parcial para que `on conflict (creation_request_id)` lo infiera (un indice
-- parcial requiere repetir el predicado en el ON CONFLICT y si no falla 42P10).
create unique index if not exists organizations_creation_request_id_key
  on public.organizations (creation_request_id);

-- Reemplaza una version previa de 4 argumentos si llego a aplicarse.
drop function if exists public.create_organization_with_owner(
  text, public.organization_type, text, uuid
);

create or replace function public.create_organization_with_owner(
  p_name text,
  p_type public.organization_type,
  p_website_url text,
  p_owner_user_id uuid,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  -- Idempotente por creation_request_id: un reintento con el mismo request_id
  -- (p.ej. tras un error de transporte) no crea duplicados ni un segundo
  -- membership. `on conflict` serializa contra inserts concurrentes del mismo
  -- request_id (espera al commit del primero y luego no hace nada).
  insert into public.organizations (name, type, website_url, creation_request_id)
  values (p_name, p_type, p_website_url, p_request_id)
  on conflict (creation_request_id) do nothing
  returning id into v_organization_id;

  if v_organization_id is null then
    -- Ya existia (reintento): el membership owner tambien se inserto en el
    -- intento que gano. Devolver el id existente sin reinsertar.
    select id
    into v_organization_id
    from public.organizations
    where creation_request_id = p_request_id;

    return v_organization_id;
  end if;

  insert into public.organization_users (organization_id, user_id, role)
  values (v_organization_id, p_owner_user_id, 'owner');

  return v_organization_id;
end;
$$;

revoke execute on function public.create_organization_with_owner(
  text, public.organization_type, text, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.create_organization_with_owner(
  text, public.organization_type, text, uuid, uuid
) to service_role;
