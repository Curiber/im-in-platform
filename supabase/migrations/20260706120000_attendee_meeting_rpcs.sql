-- Fase 4.2 (spec 27, Epic 44): flujo de reuniones 1:1 del asistente.
--
-- Implementa el "contrato futuro" del spec 22: `meetings` NO tiene policy de
-- escritura; el asistente escribe unicamente via estas RPCs `security definer`
-- (solo service_role: las server actions del asistente validan el token de
-- inscripcion con verifyRegistrationAccess y usan el cliente admin).
--
-- Prevencion de dobles reservas y capacidad: todas las transiciones toman el
-- lock de la fila del evento (patron de register_attendee), de modo que dos
-- propuestas/aceptaciones concurrentes del mismo evento se serializan y los
-- chequeos de solape/capacidad son autoritativos.

-- ---------------------------------------------------------------------------
-- propose_meeting: crea una reunion 'pending' validando bajo lock.
--
-- result_status: ok | unavailable | invalid_participant | invalid_slot |
--                invalid_location | conflict
-- ---------------------------------------------------------------------------

create or replace function public.propose_meeting(
  p_event_id uuid,
  p_requester_registration_id uuid,
  p_receiver_registration_id uuid,
  p_location_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_message text
)
returns table (result_status text, meeting_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_org_suspended boolean;
  v_participants integer;
  v_location_ok boolean;
  v_meeting_id uuid;
  -- Debe coincidir con generateMeetingSlots (src/lib/meeting-slots.ts):
  -- franjas fijas de 30 min y, cuando el evento no declara termino, una
  -- ventana de respaldo de 8 horas desde el inicio.
  v_slot constant interval := interval '30 minutes';
  v_window_end timestamptz;
begin
  if p_requester_registration_id = p_receiver_registration_id then
    return query select 'invalid_participant'::text, null::uuid;
    return;
  end if;

  -- Lock del evento: serializa propuestas y aceptaciones concurrentes.
  select *
  into v_event
  from public.events
  where id = p_event_id and deleted_at is null
  for update;

  if not found
    or v_event.status <> 'published'
    or not v_event.networking_enabled
  then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  -- Organizacion suspendida: networking congelado (mismo criterio que el
  -- resto de las superficies del asistente).
  select o.suspended_at is not null
  into v_org_suspended
  from public.organizations o
  where o.id = v_event.organization_id
  for share;

  if coalesce(v_org_suspended, false) then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  -- Evento terminado: no se agendan reuniones despues del termino.
  if v_event.ends_at is not null and v_event.ends_at < now() then
    return query select 'unavailable'::text, null::uuid;
    return;
  end if;

  -- Franja valida y autoritativa: no se confia en el termino que envia la
  -- action (el Server Action es invocable directo). Debe ser exactamente una
  -- de las franjas que ofreceria generateMeetingSlots:
  --   * duracion fija de 30 min (no horarios arbitrarios),
  --   * alineada al inicio del evento en pasos de 30 min,
  --   * dentro de la ventana del evento (o de la de respaldo de 8h si el
  --     evento no declara termino).
  v_window_end := coalesce(
    v_event.ends_at,
    v_event.starts_at + interval '8 hours'
  );

  if p_starts_at is null
    or p_ends_at is null
    or p_ends_at - p_starts_at <> v_slot
    or p_starts_at < v_event.starts_at
    or p_ends_at > v_window_end
    or mod(
         extract(epoch from (p_starts_at - v_event.starts_at))::bigint,
         extract(epoch from v_slot)::bigint
       ) <> 0
  then
    return query select 'invalid_slot'::text, null::uuid;
    return;
  end if;

  -- No se propone en el pasado: la UI ya filtra franjas vencidas, pero el
  -- Server Action es invocable directo.
  if p_starts_at <= now() then
    return query select 'expired'::text, null::uuid;
    return;
  end if;

  -- Ambos participantes: inscripcion activa del evento y visible en el
  -- directorio (opt-in de networking).
  select count(*)
  into v_participants
  from public.event_registrations r
  where r.event_id = p_event_id
    and r.id in (p_requester_registration_id, p_receiver_registration_id)
    and r.status in ('registered', 'checked_in')
    and r.public_profile_enabled;

  if v_participants <> 2 then
    return query select 'invalid_participant'::text, null::uuid;
    return;
  end if;

  -- Ubicacion (opcional): del evento y no archivada.
  if p_location_id is not null then
    select exists (
      select 1
      from public.meeting_locations l
      where l.id = p_location_id
        and l.event_id = p_event_id
        and l.archived_at is null
    )
    into v_location_ok;

    if not v_location_ok then
      return query select 'invalid_location'::text, null::uuid;
      return;
    end if;
  end if;

  -- Conflicto: solape con reuniones aceptadas de cualquiera de los dos, o una
  -- propuesta pendiente entre la misma pareja que se solape (evita duplicar la
  -- misma invitacion). Solape: starts < otherEnd AND ends > otherStart.
  if exists (
    select 1
    from public.meetings m
    where m.event_id = p_event_id
      and m.starts_at < p_ends_at
      and m.ends_at > p_starts_at
      and (
        (
          m.status = 'accepted'
          and (
            m.requester_registration_id in (p_requester_registration_id, p_receiver_registration_id)
            or m.receiver_registration_id in (p_requester_registration_id, p_receiver_registration_id)
          )
        )
        or (
          m.status = 'pending'
          and m.requester_registration_id in (p_requester_registration_id, p_receiver_registration_id)
          and m.receiver_registration_id in (p_requester_registration_id, p_receiver_registration_id)
        )
      )
  ) then
    return query select 'conflict'::text, null::uuid;
    return;
  end if;

  insert into public.meetings (
    event_id, requester_registration_id, receiver_registration_id,
    location_id, starts_at, ends_at, message
  )
  values (
    p_event_id, p_requester_registration_id, p_receiver_registration_id,
    p_location_id, p_starts_at, p_ends_at, nullif(trim(p_message), '')
  )
  returning id into v_meeting_id;

  return query select 'ok'::text, v_meeting_id;
end;
$$;

revoke execute on function public.propose_meeting(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) from public, anon, authenticated;

grant execute on function public.propose_meeting(
  uuid, uuid, uuid, uuid, timestamptz, timestamptz, text
) to service_role;

-- ---------------------------------------------------------------------------
-- respond_meeting: el receiver acepta o rechaza una reunion 'pending'.
--
-- Al aceptar se re-chequean bajo el lock del evento los solapes de ambos
-- participantes y la capacidad del punto de encuentro (reuniones aceptadas
-- solapadas en el mismo punto). Si hay conflicto la reunion queda 'pending'
-- (el proponente puede cancelarla y proponer otra franja).
--
-- result_status: ok | not_found | conflict
-- ---------------------------------------------------------------------------

create or replace function public.respond_meeting(
  p_meeting_id uuid,
  p_registration_id uuid,
  p_accept boolean
)
returns table (result_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.meetings%rowtype;
  v_event public.events%rowtype;
  v_org_suspended boolean;
  v_active_participants integer;
  v_location_ok boolean;
  v_capacity integer;
  v_occupied integer;
begin
  -- Localizar la reunion para conocer su evento (sin lock todavia).
  select *
  into v_meeting
  from public.meetings
  where id = p_meeting_id
    and receiver_registration_id = p_registration_id;

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  -- Lock del evento y re-lectura del estado bajo el lock: serializa contra
  -- otras aceptaciones/propuestas del mismo evento.
  select *
  into v_event
  from public.events
  where id = v_meeting.event_id
  for update;

  select *
  into v_meeting
  from public.meetings
  where id = p_meeting_id
    and receiver_registration_id = p_registration_id
    and status = 'pending';

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  -- Rechazar es siempre valido (no re-abre el networking): se procesa antes de
  -- revalidar el estado del evento.
  if not p_accept then
    update public.meetings
    set status = 'declined', responded_at = now()
    where id = v_meeting.id;

    return query select 'ok'::text;
    return;
  end if;

  -- Aceptar SI reactiva una reunion: entre proponer y aceptar el evento pudo
  -- terminar, deshabilitar networking, borrarse o suspenderse la org. Se
  -- revalida bajo el lock (mismo criterio que propose_meeting); sin esto un
  -- token valido podria confirmar una reunion en un evento ya cerrado.
  if v_event.id is null  -- evento inexistente (defensa; la FK lo garantiza)
    or v_event.deleted_at is not null
    or v_event.status <> 'published'
    or not v_event.networking_enabled
    or (v_event.ends_at is not null and v_event.ends_at < now())
  then
    return query select 'unavailable'::text;
    return;
  end if;

  select o.suspended_at is not null
  into v_org_suspended
  from public.organizations o
  where o.id = v_event.organization_id
  for share;

  if coalesce(v_org_suspended, false) then
    return query select 'unavailable'::text;
    return;
  end if;

  -- La franja ya paso: no se confirma una reunion despues de su horario
  -- (la UI no la ofrece, pero el Server Action es invocable directo).
  if v_meeting.starts_at <= now() then
    return query select 'expired'::text;
    return;
  end if;

  -- Ambos participantes siguen activos y visibles en el directorio: uno pudo
  -- cancelar su inscripcion o salir del networking tras la propuesta.
  select count(*)
  into v_active_participants
  from public.event_registrations r
  where r.event_id = v_meeting.event_id
    and r.id in (
      v_meeting.requester_registration_id,
      v_meeting.receiver_registration_id
    )
    and r.status in ('registered', 'checked_in')
    and r.public_profile_enabled;

  if v_active_participants <> 2 then
    return query select 'invalid_participant'::text;
    return;
  end if;

  -- La ubicacion (si hay) sigue activa: pudo archivarse tras la propuesta.
  if v_meeting.location_id is not null then
    select exists (
      select 1
      from public.meeting_locations l
      where l.id = v_meeting.location_id
        and l.event_id = v_meeting.event_id
        and l.archived_at is null
    )
    into v_location_ok;

    if not v_location_ok then
      return query select 'invalid_location'::text;
      return;
    end if;
  end if;

  -- Solape con reuniones aceptadas de cualquiera de los dos participantes.
  if exists (
    select 1
    from public.meetings m
    where m.event_id = v_meeting.event_id
      and m.id <> v_meeting.id
      and m.status = 'accepted'
      and m.starts_at < v_meeting.ends_at
      and m.ends_at > v_meeting.starts_at
      and (
        m.requester_registration_id in (v_meeting.requester_registration_id, v_meeting.receiver_registration_id)
        or m.receiver_registration_id in (v_meeting.requester_registration_id, v_meeting.receiver_registration_id)
      )
  ) then
    return query select 'conflict'::text;
    return;
  end if;

  -- Capacidad del punto de encuentro: reuniones aceptadas solapadas en el
  -- mismo punto < capacity (si el punto define capacidad).
  if v_meeting.location_id is not null then
    select l.capacity
    into v_capacity
    from public.meeting_locations l
    where l.id = v_meeting.location_id;

    if v_capacity is not null then
      select count(*)
      into v_occupied
      from public.meetings m
      where m.event_id = v_meeting.event_id
        and m.id <> v_meeting.id
        and m.status = 'accepted'
        and m.location_id = v_meeting.location_id
        and m.starts_at < v_meeting.ends_at
        and m.ends_at > v_meeting.starts_at;

      if v_occupied >= v_capacity then
        return query select 'conflict'::text;
        return;
      end if;
    end if;
  end if;

  update public.meetings
  set status = 'accepted', responded_at = now()
  where id = v_meeting.id;

  return query select 'ok'::text;
end;
$$;

revoke execute on function public.respond_meeting(uuid, uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.respond_meeting(uuid, uuid, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- cancel_meeting: cualquiera de los dos participantes cancela una reunion
-- 'pending' o 'accepted'.
--
-- result_status: ok | not_found
-- ---------------------------------------------------------------------------

create or replace function public.cancel_meeting(
  p_meeting_id uuid,
  p_registration_id uuid
)
returns table (result_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_updated integer;
begin
  select event_id
  into v_event_id
  from public.meetings
  where id = p_meeting_id
    and (
      requester_registration_id = p_registration_id
      or receiver_registration_id = p_registration_id
    );

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  -- Mismo lock que el resto de las transiciones, para no cruzar una
  -- cancelacion con una aceptacion en vuelo.
  perform 1
  from public.events
  where id = v_event_id
  for update;

  update public.meetings
  set status = 'cancelled', responded_at = now()
  where id = p_meeting_id
    and status in ('pending', 'accepted')
    and (
      requester_registration_id = p_registration_id
      or receiver_registration_id = p_registration_id
    );

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return query select 'not_found'::text;
    return;
  end if;

  return query select 'ok'::text;
end;
$$;

revoke execute on function public.cancel_meeting(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.cancel_meeting(uuid, uuid)
  to service_role;
