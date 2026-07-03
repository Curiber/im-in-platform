# 36. Cierre automatico de reuniones

## Estado

`implementado — Epic 53`

Cierra el riesgo anotado en los specs
[27](27-attendee-meetings.md) y [35](35-meeting-metrics-dashboard.md): el
estado `completed` existia desde el spec 22 pero nadie lo seteaba.

## Problema

Una reunion aceptada quedaba "accepted" para siempre. El dashboard y el
reporte derivaban "realizadas" comparando horarios en cada render, la agenda
del asistente mostraba como vigentes reuniones ya celebradas, y el historial
admin filtraba por un estado (`completed`) que nunca ocurria.

## Objetivos

- Transicionar automaticamente a `completed` las aceptadas cuyo horario
  termino.
- Que dashboard, agenda del asistente y filtros admin lean ese estado de
  forma coherente.

## No objetivos

- Cerrar `pending` vencidas: siguen pendientes (aceptarlas ya responde
  `expired`, spec 27) y el proponente puede cancelarlas.
- Feedback post-reunion (`meeting_feedback`): Etapa 3 del spec 12.

## Decisiones

- **`complete_past_meetings()`** (security definer, solo service_role):
  `accepted` con `ends_at < now()` pasa a `completed`. Programada con
  **pg_cron cada 15 min** (mismo patron que la limpieza de inscripciones del
  Epic 23; `cron.schedule` es idempotente por nombre). Es un estado
  historico, no una señal en vivo: 15 min de latencia es suficiente.
- **Dashboard (spec 35)**: `completed` cuenta como aceptada realizada; el
  fallback por horario se mantiene para cubrir la ventana entre el termino y
  la pasada del cron.
- **Agenda del asistente**: incluye las completadas como historial (badge
  "Completada" ya existia), sin boton de cancelar. Cancelar solo aplica a
  `accepted` (la RPC de cancelar igual lo rechazaria: solo toca
  pending/accepted).
- Los chequeos de solape de las RPCs (spec 27) siguen contando solo
  `accepted`: una `completed` es pasada por definicion y las franjas pasadas
  se rechazan con `expired`, asi que no puede solapar propuestas nuevas.

## Criterios de aceptacion

- Tras la pasada del cron, una aceptada cuyo horario termino aparece
  "Completada" en la agenda del asistente, cuenta como "Realizada" en el
  dashboard y matchea el filtro "Completadas" del admin.
- Una aceptada futura no se toca; una pending vencida tampoco.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: funcion + cron.
- [x] Dashboard y agenda tratan `completed` como realizada/historial.
- [ ] Prueba manual: reunion aceptada con termino pasado -> correr la funcion
      -> verificar agenda, dashboard y filtro admin.

## Riesgos / futuro

- pg_cron corre en la zona del cluster (UTC) pero la condicion es por
  instante (`ends_at < now()`), no por hora de pared: sin efecto de zona.
- Cuando exista `meeting_feedback` (Etapa 3), `completed` es el trigger
  natural para pedirlo.
