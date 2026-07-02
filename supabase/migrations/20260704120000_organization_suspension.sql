-- Fase 3.0 (spec 24, Epic 37): suspension de organizaciones (platform admin).
--
-- Una organizacion suspendida queda congelada: sus paginas publicas e
-- inscripcion se bloquean y su panel admin pasa a solo lectura. Los datos se
-- conservan intactos y la suspension es reversible (reactivar).
--
-- Enforcement en tres capas:
--   1. app_private.has_organization_role devuelve false si la organizacion esta
--      suspendida: TODAS las policies de escritura role-gated (eventos, agenda,
--      opciones, ubicaciones, miembros, inscripciones) y las RPCs que validan
--      rol (soft delete/restore, modo de inscripcion, comunicaciones) quedan
--      bloqueadas en un solo punto. is_organization_member NO cambia: los
--      miembros siguen leyendo su panel.
--   2. Las RPCs publicas de inscripcion/verificacion chequean la suspension
--      bajo el lock del evento (autoritativo).
--   3. Los helpers de las server actions que escriben via service_role
--      (authorizeEventManager, requireOrgManager, check-in) validan la
--      suspension en codigo (el service_role ignora RLS).

alter table public.organizations
  add column suspended_at timestamptz,
  add column suspended_by uuid references auth.users(id) on delete set null,
  add column suspend_reason text;

-- Platform admin segun el JWT (app_metadata.platform_role la firma Supabase;
-- el usuario no puede editarla). Mismo criterio que isPlatformAdmin en codigo.
create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'platform_admin',
    false
  );
$$;

-- Punto unico de bloqueo de escrituras: rol valido REQUIERE organizacion no
-- suspendida. Mantiene la firma; todas las policies/RPCs existentes lo heredan.
create or replace function app_private.has_organization_role(
  target_organization_id uuid,
  target_user_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_users ou
    join public.organizations o on o.id = ou.organization_id
    where ou.organization_id = target_organization_id
      and ou.user_id = target_user_id
      and ou.role = any(allowed_roles)
      and o.suspended_at is null
  );
$$;

-- Suspender / reactivar: solo platform admin, con motivo obligatorio.
create or replace function public.suspend_organization(
  p_organization_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_platform_admin() then
    raise exception 'Solo platform admins pueden suspender organizaciones'
      using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Ingresa un motivo de suspension' using errcode = '22023';
  end if;

  update public.organizations
    set suspended_at = now(),
        suspended_by = auth.uid(),
        suspend_reason = p_reason
    where id = p_organization_id
      and suspended_at is null;

  if not found then
    raise exception 'Organizacion invalida o ya suspendida'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.reactivate_organization(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_platform_admin() then
    raise exception 'Solo platform admins pueden reactivar organizaciones'
      using errcode = '42501';
  end if;

  update public.organizations
    set suspended_at = null,
        suspended_by = null,
        suspend_reason = null
    where id = p_organization_id
      and suspended_at is not null;

  if not found then
    raise exception 'Organizacion invalida o no suspendida'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.suspend_organization(uuid, text)
  from public, anon;
revoke execute on function public.reactivate_organization(uuid)
  from public, anon;

grant execute on function public.suspend_organization(uuid, text)
  to authenticated;
grant execute on function public.reactivate_organization(uuid)
  to authenticated;

-- transfer_organization_ownership valida el rol consultando organization_users
-- directo (no via has_organization_role): se agrega el chequeo de suspension
-- para que un owner suspendido no pueda transferir via Data API directa.
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

  if exists (
    select 1 from public.organizations
    where id = p_organization_id and suspended_at is not null
  ) then
    raise exception 'La organizacion esta suspendida' using errcode = '42501';
  end if;

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

  update public.organization_users
    set role = 'admin'
    where organization_id = p_organization_id
      and user_id = v_caller;

  update public.organization_users
    set role = 'owner'
    where organization_id = p_organization_id
      and user_id = p_new_owner_user_id;

  get diagnostics v_promoted = row_count;

  if v_promoted <> 1 then
    raise exception 'El nuevo owner debe ser un miembro de la organizacion'
      using errcode = '22023';
  end if;
end;
$$;

-- register_attendee: rechaza inscripciones de organizaciones suspendidas bajo
-- el lock del evento (autoritativo). Cuerpo identico al de
-- 20260627150000_register_pending_verification + el chequeo de suspension.
create or replace function public.register_attendee(
  p_event_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_company text,
  p_industry text,
  p_interests text[],
  p_networking_opt_in boolean,
  p_public_profile_enabled boolean,
  p_qr_token_hash text,
  p_request_id uuid
)
returns table (result_status text, registration_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_event_found boolean;
  v_count integer;
  v_registration_id uuid;
  v_existing_id uuid;
begin
  select id
  into v_existing_id
  from public.event_registrations
  where creation_request_id = p_request_id;

  if v_existing_id is not null then
    return query select 'ok'::text, v_existing_id;
    return;
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  v_event_found := found;

  select id
  into v_existing_id
  from public.event_registrations
  where creation_request_id = p_request_id;

  if v_existing_id is not null then
    return query select 'ok'::text, v_existing_id;
    return;
  end if;

  if not v_event_found or v_event.status <> 'published' then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  -- Organizacion suspendida: la inscripcion queda bloqueada.
  if exists (
    select 1 from public.organizations o
    where o.id = v_event.organization_id and o.suspended_at is not null
  ) then
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
  where event_registrations.event_id = p_event_id
    and event_registrations.status <> 'cancelled';

  if v_count >= v_event.capacity then
    return query select 'capacity_full'::text, null::uuid;
    return;
  end if;

  begin
    insert into public.event_registrations (
      event_id, email, full_name_snapshot, phone_snapshot,
      role_snapshot, company_snapshot, industry_snapshot, interests,
      networking_opt_in, public_profile_enabled, qr_token_hash,
      creation_request_id, status
    )
    values (
      p_event_id, p_email, p_full_name, p_phone,
      p_role, p_company, p_industry, p_interests,
      p_networking_opt_in, p_public_profile_enabled, p_qr_token_hash,
      p_request_id, 'pending_verification'
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

-- activate_verified_registration: no activa inscripciones de organizaciones
-- suspendidas. Cuerpo identico al de 20260701120300 + el chequeo de suspension
-- bajo el mismo lock del evento.
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
  v_org_id uuid;
  v_status public.registration_status;
  v_target public.registration_status;
begin
  select event_id
  into v_event_id
  from public.event_registrations
  where id = p_registration_id;

  if not found then
    raise exception 'Inscripcion invalida' using errcode = 'P0002';
  end if;

  select registration_mode, organization_id
  into v_mode, v_org_id
  from public.events
  where id = v_event_id
  for update;

  if exists (
    select 1 from public.organizations o
    where o.id = v_org_id and o.suspended_at is not null
  ) then
    raise exception 'La organizacion esta suspendida' using errcode = '42501';
  end if;

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
