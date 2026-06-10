# 03. Data Model

Modelo conceptual inicial para Supabase/Postgres.

## Tablas MVP

### organizations

- `id`
- `name`
- `type`
- `logo_url`
- `website_url`
- `created_at`
- `updated_at`

### organization_users

- `id`
- `organization_id`
- `user_id`
- `role`: `owner`, `admin`, `event_admin`
- `created_at`

### events

- `id`
- `organization_id`
- `name`
- `slug`
- `description`
- `starts_at`
- `arrival_starts_at`
- `ends_at`
- `location`
- `capacity`
- `logo_url`
- `status`: `draft`, `published`, `closed`
- `event_type`: `open`, `closed`
- `networking_enabled`
- `created_by`
- `deleted_at`
- `deleted_by`
- `delete_reason`
- `created_at`
- `updated_at`

### attendee_profiles

Estado actual: definido conceptualmente, pendiente de migracion. El MVP actual
guarda snapshots en `event_registrations`; la siguiente epica debe materializar
esta tabla para tener perfiles persistentes.

- `id`
- `user_id`
- `email`
- `full_name`
- `headline`
- `description`
- `company`
- `industry`
- `avatar_url`
- `phone`
- `linkedin_url`
- `profile_slug`
- `created_at`
- `updated_at`

### interests

- `id`
- `name`
- `category`

### attendee_profile_interests

- `profile_id`
- `interest_id`

### event_registrations

- `id`
- `event_id`
- `user_id`
- `profile_id`
- `email`
- `full_name_snapshot`
- `company_snapshot`
- `role_snapshot`
- `networking_opt_in`
- `public_profile_enabled`
- `qr_token_hash`
- `status`: `registered`, `checked_in`, `cancelled`, `no_show`
- `registered_at`
- `checked_in_at`

### connection_requests

- `id`
- `event_id`
- `requester_registration_id`
- `receiver_registration_id`
- `status`: `pending`, `accepted`, `rejected`, `cancelled`
- `message`
- `created_at`
- `responded_at`

### consents

- `id`
- `user_id`
- `event_id`
- `registration_id`
- `consent_type`
- `version`
- `accepted`
- `accepted_at`

## Tablas V1.5 candidatas

- `event_form_questions`
- `event_form_answers`
- `event_profile_views`
- `email_events`
- `event_sessions`
- `meeting_requests`

## Reglas de identidad

- `auth.users` de Supabase es la fuente de identidad.
- `attendee_profiles.user_id` referencia al usuario autenticado.
- Email unico por evento en `event_registrations`.
- RUT no se pide por defecto; si un cliente lo exige, debe modelarse como campo
  privado de inscripcion, no como identificador global.

## Reglas de privacidad

- Datos administrativos y datos visibles se separan.
- El directorio lee desde registros con `networking_opt_in = true` y
  `public_profile_enabled = true`.
- Email y telefono no se exponen a otros asistentes hasta que exista conexion
  aceptada y consentimiento correspondiente.
- Las conexiones pertenecen a un evento, no son relaciones globales.

## RLS esperada

- Admin de organizacion puede leer y gestionar eventos de su organizacion.
- Owner/admin puede editar datos de organizacion.
- Owner/admin puede soft-delete eventos de su organizacion.
- Event admin no puede eliminar eventos salvo decision posterior de producto.
- Asistente puede leer sus propias inscripciones.
- Asistente inscrito puede leer perfiles publicos del mismo evento.
- Asistente puede crear solicitudes donde es requester.
- Asistente puede responder solicitudes donde es receiver.
- Service role solo para procesos server-side controlados.
