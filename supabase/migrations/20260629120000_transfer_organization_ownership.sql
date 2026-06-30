-- Fase 2.0 (spec 16 / spec 10 Epic 29): transferencia de ownership.
--
-- Hasta ahora el owner inicial de una organizacion no se podia cambiar: las
-- acciones de equipo protegen las filas `owner` con `neq('role','owner')`, asi
-- que no habia forma de ceder la organizacion a otro miembro. Si el owner se iba
-- de la empresa, la organizacion quedaba sin administrador efectivo.
--
-- Esta RPC transfiere la propiedad de forma atomica: degrada al owner actual a
-- `admin` y promueve a un miembro existente a `owner` en una sola transaccion.
-- El cuerpo plpgsql es atomico: si el segundo update falla, el primero tambien
-- se revierte, evitando dejar la organizacion con cero o dos owners.
--
-- Seguridad: `security definer` pero valida `auth.uid()` contra el owner actual,
-- por lo que es segura aun invocada directamente. Se concede a `authenticated`
-- (el owner la ejecuta con su propia sesion), no a `anon`.

-- Invariante de un solo owner por organizacion. Indice unico parcial: solo
-- restringe las filas con role='owner'. Los datos actuales cumplen (cada org se
-- crea con exactamente un owner via create_organization_with_owner), por lo que
-- el indice se crea sin conflicto. La RPC respeta el indice degradando primero y
-- promoviendo despues (nunca hay dos owners simultaneos en la transaccion).
create unique index if not exists organization_users_one_owner_per_org
  on public.organization_users (organization_id)
  where role = 'owner';

create or replace function public.transfer_organization_ownership(
  p_organization_id uuid,
  p_new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_promoted integer;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  -- El llamador debe ser el owner actual de la organizacion.
  if not exists (
    select 1
    from public.organization_users
    where organization_id = p_organization_id
      and user_id = v_caller
      and role = 'owner'
  ) then
    raise exception 'Solo el owner puede transferir la propiedad'
      using errcode = '42501';
  end if;

  if p_new_owner_user_id = v_caller then
    raise exception 'El nuevo owner debe ser un miembro distinto'
      using errcode = '22023';
  end if;

  -- Degradar-luego-promover: respeta el indice unico parcial de un solo owner
  -- (entre ambos updates hay cero owners, nunca dos).
  update public.organization_users
    set role = 'admin'
    where organization_id = p_organization_id
      and user_id = v_caller;

  update public.organization_users
    set role = 'owner'
    where organization_id = p_organization_id
      and user_id = p_new_owner_user_id;

  -- El ROW_COUNT del promote es el guard autoritativo, no un exists previo: si
  -- el candidato fue eliminado (p.ej. removeOrganizationMember concurrente)
  -- entre la validacion y este UPDATE, afectaria cero filas sin error y la
  -- organizacion quedaria sin owner (el degrade de arriba ya ejecuto). Exigir
  -- exactamente una fila y lanzar excepcion revierte toda la transaccion,
  -- incluido el degrade, dejando al owner original intacto.
  get diagnostics v_promoted = row_count;

  if v_promoted <> 1 then
    raise exception 'El nuevo owner debe ser un miembro de la organizacion'
      using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.transfer_organization_ownership(uuid, uuid)
  from public, anon;

grant execute on function public.transfer_organization_ownership(uuid, uuid)
  to authenticated;
