# 33. Sesion OTP en la API v1

## Estado

`implementado — Epic 50`

Completa el par [30-api-v1.md](30-api-v1.md) + [31-attendee-identity.md](31-attendee-identity.md):
la API v1 acepta la sesion OTP del asistente, cerrando el flujo completo que
la app nativa (Fase 6) necesita: login OTP -> mis inscripciones -> operar un
evento.

## Problema

La API v1 solo aceptaba `registrationId:token` (el link/QR). La app, tras el
login OTP, tiene un access token de Supabase pero ninguna forma de descubrir
las inscripciones del usuario ni de operar con la sesion.

## Objetivos

- `authenticateApiRequest` acepta ademas un **access token de Supabase** (+
  header `X-Registration-Id` para elegir el contexto de inscripcion),
  verificando que esa inscripcion fue **reclamada por ese usuario**.
- Endpoint de descubrimiento `GET /api/v1/registrations`: las inscripciones
  del usuario (espejo de `/mi`), ejecutando el reclamo idempotente antes.

## No objetivos

- Deprecar el esquema `id:token` (sigue siendo la via de quien no tiene
  cuenta y el payload del QR).
- Refresh de tokens: lo maneja el SDK de Supabase en el cliente.

## Decisiones

- **Desambiguacion por forma del bearer**: `<uuid>:<token>` contiene `:`
  (UUID y base64url no lo contienen); un JWT no. Un solo header para ambos
  esquemas, sin versionado nuevo.
- **Ownership, no solo identidad**: con sesion, el contexto de inscripcion
  exige `registration.user_id === user.id` (`verifyRegistrationOwnership`,
  mismas reglas de estado que el resto: activa, evento vivo, org no
  suspendida). Un access token valido NO da acceso a inscripciones no
  reclamadas.
- **El claim corre con la identidad del portador**: `/api/v1/registrations`
  ejecuta `claim_attendee_identity` con un cliente user-scoped
  (`createSupabaseUserClient`, anon key + Authorization del access token),
  porque la RPC lee `auth.uid()`/`auth.jwt()`. El listado posterior usa el
  admin client filtrando por `user_id`.
- El access token se valida con `auth.getUser(jwt)` (verificacion contra
  Supabase, no un decode local).

## Criterios de aceptacion

- `GET /api/v1/registrations` con access token devuelve las inscripciones
  reclamadas (sin eventos borrados/suspendidos); con `id:token` responde 401.
- Cualquier endpoint de la API funciona con `Bearer <access_token>` +
  `X-Registration-Id` de una inscripcion propia; con una ajena responde 401.
- El esquema `id:token` sigue funcionando identico.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] `verifyRegistrationOwnership` en `registrations.ts`.
- [x] `authenticateApiUser` + doble esquema en `authenticateApiRequest`.
- [x] `createSupabaseUserClient` (RPCs con identidad del portador).
- [x] `GET /api/v1/registrations` con claim previo.
- [ ] Prueba manual: login OTP -> listar inscripciones -> operar un endpoint
      con X-Registration-Id propio y ajeno.

## Riesgos / futuro

- El flujo OTP de la app usara `signInWithOtp` + `verifyOtp` del SDK contra
  el mismo proyecto Supabase; esta capa no necesita cambios para eso.
- Si algun dia hay endpoints de usuario sin contexto de inscripcion (perfil
  global, preferencias), `authenticateApiUser` ya es el bloque de base.
