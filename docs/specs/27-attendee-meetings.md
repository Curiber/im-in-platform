# 27. Reuniones 1:1 del asistente

## Estado

`implementado — Epic 44, Fase 4.2`

Implementa el item 4.2 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md)
sobre el dominio creado en el
[22-meetings-domain-and-admin.md](22-meetings-domain-and-admin.md) (Epic 35):
proponer franja + punto de encuentro, aceptar/rechazar y agenda personal.

## Problema

El modelo `meetings`/`meeting_locations` existia y el admin podia supervisar,
pero el asistente no tenia forma de agendar. La reunion con horario y lugar es
la unidad de valor del networking (spec 12 §B.2); sin el flujo del asistente el
dominio estaba vacio.

## Objetivos

- Que un asistente proponga una reunion 1:1 a otro (franja de 30 min + punto de
  encuentro opcional + mensaje), la contraparte acepte/rechace, y ambos vean su
  agenda del evento.
- Prevencion **transaccional** de dobles reservas y capacidad por punto
  (contrato futuro del spec 22).

## No objetivos

- Disponibilidad configurable por asistente (bloques "no disponible").
- Notificaciones por email/push al proponer/aceptar (futuro; hoy el badge de la
  pestaña Agenda cumple ese rol dentro de la web).
- Chat, feedback post-reunion, `completed` automatico.

## Decisiones

### Escritura solo por RPC (migracion `20260706120000_attendee_meeting_rpcs.sql`)

`meetings` sigue sin policy de escritura: el asistente escribe unicamente via
RPCs `security definer` solo-`service_role` (las server actions validan el
token de inscripcion con `verifyRegistrationAccess` y usan el cliente admin),
como preveia el spec 22. Todas toman el **lock de la fila del evento** (patron
`register_attendee`) para serializar propuestas/aceptaciones concurrentes:

- `propose_meeting`: valida evento publicado + networking habilitado + org no
  suspendida (FOR SHARE) + evento no terminado; **franja autoritativa** (no se
  confia en el termino que envia la action: duracion fija de 30 min, alineada
  al inicio del evento y dentro de la ventana del evento o de la de respaldo de
  8h si no hay termino, igual que `generateMeetingSlots`); ambos participantes
  activos y visibles en el directorio; ubicacion del evento no archivada; sin
  solape con aceptadas de cualquiera de los dos ni propuesta pendiente
  duplicada entre la pareja. Inserta `pending`.
- `respond_meeting`: solo el receiver, solo `pending`. Rechazar es siempre
  valido. **Aceptar re-valida bajo el lock todo el estado del evento** (no
  borrado, publicado, networking habilitado, no terminado, org no suspendida),
  que ambos participantes sigan activos y visibles, y que la ubicacion no se
  haya archivado, ademas de los solapes de ambos y la **capacidad del punto**
  (aceptadas solapadas en el mismo punto < `capacity`). Sin esto un token
  valido podria confirmar una reunion en un evento ya cerrado. Con conflicto
  responde `conflict` y la reunion queda `pending`.
- `cancel_meeting`: requester o receiver, sobre `pending`/`accepted`.

Ambas rechazan franjas en el pasado (`p_starts_at > now()` al proponer y
`v_meeting.starts_at > now()` al aceptar): la UI ya filtra franjas vencidas,
pero el Server Action es invocable directo.

Los estados de resultado (`ok`/`unavailable`/`invalid_slot`/`invalid_location`/
`invalid_participant`/`conflict`/`expired`/`not_found`) se traducen a mensajes
en la UI (query param `meetingStatus`).

### Franjas (`src/lib/meeting-slots.ts`, puro y testeado)

Franjas fijas de 30 min alineadas al inicio del evento, dentro de su ventana
(`generateMeetingSlots`); si el evento no declara termino se ofrecen 8 horas.
`filterUpcomingSlots` deja solo las futuras. La validacion autoritativa vive en
la RPC; el helper solo genera las opciones del formulario.

### UI

- Pestaña **Agenda** en `NetworkingNav` (todas las superficies de networking),
  con badge de propuestas pendientes recibidas.
- Pagina `/e/[slug]/meetings`: agenda de aceptadas (orden por hora, con lugar),
  recibidas pendientes (aceptar/rechazar) y enviadas pendientes (cancelar).
- "Proponer reunion" en el detalle de perfil del directorio: franja + punto de
  encuentro (opcional, "Por definir") + mensaje. Solo si quedan franjas futuras.
- Los contactos y ubicaciones se cargan por ids (patron de conexiones), sin
  depender de embeds de FKs compuestas.

### Fix colateral

La vista admin de reuniones usaba hints de embed con nombres de FK
inexistentes (`meetings_requester_registration_id_fkey`); con reuniones reales
la consulta fallaria. Se corrigen a los nombres de constraint reales
(`meetings_requester_fk`/`meetings_receiver_fk`/`meetings_location_fk`).

## Criterios de aceptacion

- A propone a B (franja + lugar + mensaje); B ve la propuesta en Agenda y al
  aceptar aparece en la agenda de ambos y en la vista admin.
- Aceptar una segunda reunion solapada para el mismo participante responde
  `conflict` y no se agenda.
- Un punto con `capacity = 1` no acepta dos reuniones solapadas.
- Cancelar (cualquiera de los dos) libera la franja.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: RPCs propose/respond/cancel con lock + chequeos.
- [x] Helper `meeting-slots` + tests.
- [x] Actions del asistente (proponer/aceptar/rechazar/cancelar).
- [x] Pagina Agenda + pestaña en `NetworkingNav` con badge.
- [x] Formulario de propuesta en el detalle de perfil.
- [x] Fix de hints de embed en la vista admin de reuniones.
- [ ] Prueba manual: flujo completo A propone -> B acepta -> agenda/admin;
      conflicto por solape y por capacidad.

## Riesgos / futuro

- Sin notificacion por email, una propuesta puede pasar inadvertida si el
  asistente no vuelve a abrir la web: mitigado por el badge, se resolvera con
  las notificaciones (spec 12 §C.4).
- `completed`: transicion automatica implementada en el
  [36-complete-past-meetings.md](36-complete-past-meetings.md) (Epic 53,
  pg_cron cada 15 min).
