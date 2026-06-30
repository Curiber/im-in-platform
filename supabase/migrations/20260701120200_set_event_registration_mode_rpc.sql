-- Fase 2.1b (spec 19, Epic 32): cambio atomico de modo de inscripcion.
--
-- Cambiar registration_mode de `approval` a `open` debe, en la MISMA
-- transaccion, promover las inscripciones que esperaban aprobacion
-- (`pending_approval`) a `registered`: en modo abierto no hay cola ni quien las
-- apruebe, y dejarlas pendientes las bloquearia (sin QR ni acceso) y ocultas.
--
-- Hacerlo en dos escrituras desde la server action dejaba una ventana de estado
-- parcial (evento `open` con filas aun pendientes) y usaba el service_role
-- (bypass de RLS) para promover. Esta RPC lo resuelve dentro de una transaccion
-- y valida el rol del llamador con su propia sesion (auth.uid()), sin
-- service_role.

create or replace function public.set_event_registration_mode(
  p_event_id uuid,
  p_mode public.event_registration_mode
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_org_id uuid;
begin
  if v_caller is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  -- Lock del evento (no eliminado): serializa contra inscripciones/aprobaciones
  -- concurrentes y obtiene la organizacion para validar el rol.
  select organization_id
  into v_org_id
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Evento invalido' using errcode = 'P0002';
  end if;

  -- Mismo conjunto de roles que la policy de update de events.
  if not app_private.has_organization_role(
       v_org_id,
       v_caller,
       array['owner', 'admin', 'event_admin']::public.organization_role[]
     ) then
    raise exception 'Sin permisos sobre este evento' using errcode = '42501';
  end if;

  update public.events
    set registration_mode = p_mode
    where id = p_event_id;

  -- Promocion en la misma transaccion al abrir la inscripcion.
  if p_mode = 'open' then
    update public.event_registrations
      set status = 'registered'
      where event_id = p_event_id
        and status = 'pending_approval';
  end if;
end;
$$;

revoke execute on function public.set_event_registration_mode(
  uuid, public.event_registration_mode
) from public, anon;

grant execute on function public.set_event_registration_mode(
  uuid, public.event_registration_mode
) to authenticated;
