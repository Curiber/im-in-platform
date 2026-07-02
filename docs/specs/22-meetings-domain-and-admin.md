# 22. Dominio de reuniones y admin

## Estado

`implementado (admin) — Epic 35, Fase 2.4`. El flujo del asistente (Fase 4.2)
esta implementado en el [27-attendee-meetings.md](27-attendee-meetings.md)
(Epic 44), siguiendo el contrato documentado aqui.

Implementa el item 2.4 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md),
separando claramente **2.4 (admin)** de **4.2 (asistente)**.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§F.4 y el modelo de datos de la Etapa 1 (`meeting_locations`, `meetings`).

## Problema

El organizador no tenia forma de definir donde ocurren las reuniones ni de
supervisar las que se agenden. Es la base para que el asistente (4.2) proponga y
acepte reuniones 1:1.

## Alcance 2.4 (este epic, admin)

- `meeting_locations`: CRUD (crear, editar nombre/capacidad/notas) + archivado
  reversible.
- `meetings`: modelo y estados `pending/accepted/declined/cancelled/completed`.
- Restricciones basicas en DB: participantes distintos (check), horario valido
  (check `ends_at > starts_at`) y **mismo evento por FK compuestas**
  `(event_id, id)` hacia `event_registrations` y `meeting_locations` (no un
  trigger): la garantia se mantiene siempre, incluso si se intenta mover el
  `event_id` de un padre. Indices en las columnas FK para las cascadas.
- RLS: managers (owner/admin/event_admin) gestionan ubicaciones; `meetings` es
  **solo lectura** desde el admin (miembros de la organizacion leen).
- Vista admin `/admin/events/[eventId]/meetings`: ubicaciones con CRUD/archivado
  y lista de reuniones (solo lectura) con filtro por estado, participantes,
  horario, lugar y estado.

## Fuera de alcance (Fase 4.2, asistente)

- Disponibilidad, propuesta y aceptacion de reuniones por el asistente.
- Prevencion transaccional de dobles reservas / capacidad por punto (lock +
  chequeo atomico, patron de `register_attendee`).
- Agenda personal, notificaciones, chat y feedback.

## Contrato futuro (para 4.2)

- La escritura de `meetings` la hara el asistente por una via propia (RPC
  `security definer` / policy dedicada), no la Data API directa: hoy `meetings`
  no tiene policy de INSERT/UPDATE para `authenticated`.
- Las FK compuestas ya garantizan integridad de "mismo evento" para cualquier
  via de escritura (sin trigger).
- Los estados y columnas (`starts_at`, `ends_at`, `location_id`, `message`,
  `responded_at`) estan listos para el flujo proponer -> aceptar/rechazar ->
  completar/cancelar.
- La prevencion de dobles reservas y capacidad se resolvera con lock del evento
  o del punto de encuentro dentro de la RPC de agendado (no en 2.4).

## Criterios de aceptacion

- El organizador crea, edita y archiva puntos de encuentro.
- La lista de reuniones (vacia hasta 4.2) filtra por estado sin error.
- La integridad (mismo evento, no-self, horario) se cumple a nivel de DB.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: `meeting_locations`, `meetings`, enum, FK compuestas de mismo
      evento + indices, RLS.
- [x] Acciones CRUD/archivado de ubicaciones.
- [x] Vista admin con ubicaciones y reuniones (read-only) + filtro.
- [x] Link desde el detalle del evento.
- [ ] Prueba manual: crear/editar/archivar ubicaciones; verificar el filtro.

## Riesgos / futuro

- La lista de reuniones no pagina; con volumen alto conviene paginar o filtrar
  por fecha. Aceptable mientras el flujo del asistente no exista.
