-- Fase 2.1b (spec 19, Epic 32): modo de inscripcion por evento.
--
-- `open` (default): la inscripcion verificada por email queda activa de
-- inmediato (comportamiento actual). `approval`: la inscripcion verificada
-- queda en `pending_approval` hasta que el organizador la apruebe o rechace.
--
-- Es ortogonal a `event_type` (open/closed, que describe el tipo de evento): un
-- evento puede ser cerrado y aun asi de inscripcion abierta, o al reves.

create type public.event_registration_mode as enum ('open', 'approval');

alter table public.events
  add column registration_mode public.event_registration_mode
    not null default 'open';
