-- Epic 24 (spec 11): alinear RLS con las reglas de roles para soft delete /
-- restore de eventos.
--
-- Problema: la policy de update de `events` permite owner/admin/event_admin
-- sobre cualquier columna, asi que un event_admin podia setear deleted_at /
-- deleted_by / delete_reason directo via PostgREST, saltandose las reglas
-- "solo owner/admin elimina" y "solo owner restaura" que vivian solo en las
-- server actions.
--
-- Solucion:
--   1. Trigger de guardia que bloquea cambios directos a las columnas de
--      auditoria de borrado, salvo cuando el flag transaccional lo habilita.
--   2. RPCs security definer (soft_delete_event / restore_event) que verifican
--      el rol, habilitan el flag y aplican el cambio. Las server actions las
--      invocan en vez de hacer update directo.

-- 1. Trigger de guardia sobre columnas de auditoria ---------------------------

create or replace function app_private.guard_event_audit_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- En INSERT, un evento nunca nace con auditoria de borrado: la policy de
  -- insert solo valida rol, asi que sin esto un event_admin podria crear via
  -- PostgREST un evento con deleted_at/deleted_by/delete_reason falsificados.
  if tg_op = 'INSERT' then
    if new.deleted_at is not null
      or new.deleted_by is not null
      or new.delete_reason is not null
    then
      raise exception
        'Un evento no puede crearse con columnas de auditoria de borrado.';
    end if;

    return new;
  end if;

  -- Caso legitimo del FK `deleted_by ... on delete set null`: al borrar el
  -- usuario referenciado, Postgres pone deleted_by = NULL via cascade. Se
  -- permite solo esa transicion exacta (deleted_by no-nulo -> nulo, sin tocar
  -- deleted_at/delete_reason) y solo si el usuario ya no existe; de lo contrario
  -- el cascade abortaria el borrado del usuario.
  if old.deleted_by is not null
    and new.deleted_by is null
    and new.deleted_at is not distinct from old.deleted_at
    and new.delete_reason is not distinct from old.delete_reason
    and not exists (
      select 1 from auth.users u where u.id = old.deleted_by
    )
  then
    return new;
  end if;

  -- En UPDATE, las columnas de auditoria solo cambian via las RPCs, que
  -- habilitan el flag transaccional.
  if (
    new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by
    or new.delete_reason is distinct from old.delete_reason
  )
  and coalesce(
    current_setting('app.audit_change_allowed', true),
    ''
  ) <> 'on'
  then
    raise exception
      'Las columnas de auditoria de borrado solo se modifican via soft_delete_event/restore_event.';
  end if;

  return new;
end;
$$;

create trigger events_guard_audit_columns
before insert or update on public.events
for each row
execute function app_private.guard_event_audit_columns();

-- 2. RPCs de soft delete / restore -------------------------------------------

create or replace function public.soft_delete_event(
  p_event_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id
  into v_organization_id
  from public.events
  where id = p_event_id
    and deleted_at is null;

  if v_organization_id is null then
    raise exception 'Evento invalido.';
  end if;

  if not app_private.has_organization_role(
    v_organization_id,
    auth.uid(),
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'No tienes permisos para eliminar este evento.';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Ingresa un motivo de eliminacion.';
  end if;

  perform set_config('app.audit_change_allowed', 'on', true);

  update public.events
  set deleted_at = now(),
      deleted_by = auth.uid(),
      delete_reason = p_reason
  where id = p_event_id
    and deleted_at is null;
end;
$$;

create or replace function public.restore_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id
  into v_organization_id
  from public.events
  where id = p_event_id
    and deleted_at is not null;

  if v_organization_id is null then
    raise exception 'Evento invalido.';
  end if;

  if not app_private.has_organization_role(
    v_organization_id,
    auth.uid(),
    array['owner']::public.organization_role[]
  ) then
    raise exception 'Solo el owner puede restaurar eventos eliminados.';
  end if;

  perform set_config('app.audit_change_allowed', 'on', true);

  update public.events
  set deleted_at = null,
      deleted_by = null,
      delete_reason = null
  where id = p_event_id;
end;
$$;

-- Solo usuarios autenticados invocan las RPCs (el rol fino se valida adentro).
revoke execute on function public.soft_delete_event(uuid, text)
  from public, anon;
grant execute on function public.soft_delete_event(uuid, text) to authenticated;

revoke execute on function public.restore_event(uuid)
  from public, anon;
grant execute on function public.restore_event(uuid) to authenticated;
