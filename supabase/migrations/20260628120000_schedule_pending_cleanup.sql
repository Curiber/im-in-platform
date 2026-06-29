-- Epic 23 (spec 11, P2): programar la limpieza de inscripciones nunca
-- verificadas. Definir la funcion no crea el Cron Job; aqui se agenda con
-- pg_cron para que corra cada hora y libere los cupos retenidos por
-- inscripciones `pending_verification` vencidas.
--
-- La expiracion de seguridad (24h) ya se aplica en /verify validando
-- registered_at; este cron es la limpieza fisica de filas abandonadas.
--
-- Si pg_cron no estuviera disponible en el proyecto, esta migracion fallaria:
-- en ese caso, agendar `select public.delete_expired_pending_registrations();`
-- como Supabase Scheduled Function (dashboard) en su lugar.

create extension if not exists pg_cron;

-- cron.schedule hace upsert por nombre, asi que es idempotente.
select cron.schedule(
  'delete-expired-pending-registrations',
  '0 * * * *',
  $$ select public.delete_expired_pending_registrations(); $$
);
