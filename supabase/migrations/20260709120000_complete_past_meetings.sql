-- Epic 53 (spec 36): transicion automatica de reuniones a `completed`.
--
-- El estado `completed` existia desde el spec 22 pero nadie lo seteaba: las
-- reuniones aceptadas quedaban "accepted" para siempre y el dashboard/reporte
-- derivaban "realizadas" comparando horarios. Este cron las cierra de verdad.
--
-- Solo transiciona aceptadas cuyo horario YA termino: pending vencidas siguen
-- pendientes (el asistente ve que expiro y la RPC de aceptar ya las rechaza
-- con 'expired', spec 27).

create or replace function public.complete_past_meetings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed integer;
begin
  update public.meetings
  set status = 'completed'
  where status = 'accepted'
    and ends_at < now();

  get diagnostics v_completed = row_count;
  return v_completed;
end;
$$;

revoke execute on function public.complete_past_meetings()
  from public, anon, authenticated;

grant execute on function public.complete_past_meetings() to service_role;

-- Mismo patron que delete-expired-pending-registrations (Epic 23): pg_cron,
-- idempotente por nombre. Cada 15 min es suficiente (es un estado historico,
-- no una senal en vivo).
create extension if not exists pg_cron;

select cron.schedule(
  'complete-past-meetings',
  '*/15 * * * *',
  $$ select public.complete_past_meetings(); $$
);
