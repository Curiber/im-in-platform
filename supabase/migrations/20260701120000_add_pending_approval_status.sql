-- Fase 2.1b (spec 19, Epic 32): modo aprobacion para eventos cerrados.
--
-- Nuevo estado `pending_approval`: cuando un evento exige aprobacion, la
-- inscripcion verificada por email queda a la espera de que el organizador la
-- apruebe (-> registered) o la rechace (-> cancelled). Reserva cupo igual que
-- cualquier estado no cancelado.
--
-- El ADD VALUE de un enum no puede usarse en la misma transaccion que lo crea,
-- por eso vive en su propia migracion (mismo patron que pending_verification).

alter type public.registration_status
  add value if not exists 'pending_approval';
