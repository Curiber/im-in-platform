-- Epic 23 (spec 11, P2): verificacion de email en el registro.
--
-- Nuevo estado `pending_verification`: la inscripcion nace en este estado y solo
-- pasa a `registered` cuando se abre el link de verificacion enviado por email.
-- Va en su propia migracion porque un valor de enum recien agregado no puede
-- usarse en la misma transaccion que lo crea.

alter type public.registration_status
  add value if not exists 'pending_verification';
