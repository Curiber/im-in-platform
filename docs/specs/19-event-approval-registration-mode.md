# 19. Modo de inscripcion con aprobacion

## Estado

`implementado — Epic 32, Fase 2.1 (segunda mitad)`

Cierra el item 2.1 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
la primera mitad (categorias configurables) se hizo en el spec 18; esta es la
**segunda mitad: modo aprobacion para eventos cerrados**.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§F.3 ("aprobacion manual de inscripciones") y el cambio a `events` previsto en §M
(`registration_mode` open/approval).

## Problema

Toda inscripcion verificada por email quedaba activa de inmediato. Un evento
curado (cerrado, por invitacion, con filtro) necesita que el organizador
apruebe quien entra antes de emitir la credencial.

## Objetivos

- Que el organizador marque un evento como **inscripcion con aprobacion**.
- Que una inscripcion verificada en ese evento quede **a la espera** y el
  organizador la **apruebe** (emite credencial) o **rechace** (libera cupo).
- Que mientras espera, la persona no acceda a networking ni tenga QR valido.

## No objetivos

- Notificar por email la aprobacion/rechazo (se hara con el feature de
  comunicaciones, item 2.2). Por ahora la persona ve el estado al volver a abrir
  su mismo enlace; la pantalla "en revision" se lo dice explicitamente y no
  promete ningun correo.
- Un estado `rejected` distinto de `cancelled`: el rechazo reusa `cancelled`
  (libera cupo, excluido en todas las superficies). Si mas adelante se necesita
  distinguirlos en reportes, se agrega entonces.
- Sobre-inscripcion (recibir mas solicitudes que el cupo y curar): el cupo
  cuenta tambien las inscripciones pendientes, sin overbooking. Ver Decisiones.

## Decisiones

### Modelo de datos

- `events.registration_mode` enum `open` (default) | `approval`. Ortogonal a
  `event_type` (open/closed).
- Nuevo estado `registration_status = 'pending_approval'`.

### Ciclo de vida

```
register -> pending_verification --(verifica email)-->
    open:     registered
    approval: pending_approval --(organizador)--> registered (aprueba)
                                               -> cancelled  (rechaza, libera cupo)
```

- La transicion la decide la ruta `/verify` segun `registration_mode`.
- Aprobar/rechazar son server actions (`approveRegistration`/`rejectRegistration`)
  con guard `eq('status','pending_approval')` para no pisar decisiones
  concurrentes ni reactivar inscripciones ya resueltas.
- **Cambio de modo (RPC atomica)**: `updateEvent` ya no escribe
  `registration_mode` directo; lo hace la RPC `set_event_registration_mode`
  (`security definer`, valida rol con `auth.uid()`, lock `for update` del
  evento). Al pasar a `open` promueve cualquier `pending_approval` del evento a
  `registered` en la MISMA transaccion: en modo abierto no hay cola ni quien
  apruebe, asi que dejar solicitudes pendientes las bloquearia y ocultaria;
  promoverlas es coherente con "abierto" (ya verificaron email). Hacerlo en dos
  escrituras dejaba estado parcial y promovia con service_role (bypass de RLS);
  la RPC elimina ambos. Idempotente.

### Capacidad

La RPC `register_attendee` **no cambia**: cuenta `status <> 'cancelled'`, asi que
`pending_approval` reserva cupo y el rechazo (-> cancelled) lo libera. Decision:
las solicitudes se topan en el cupo (sin overbooking), preservando la garantia
atomica existente. La curacion con sobre-inscripcion queda como mejora futura.

### Gating por estado

- `verifyRegistrationAccess` (perfil, directorio, conexiones) solo habilita
  `registered`/`checked_in`. `pending_approval` y `pending_verification` quedan
  fuera del networking. Esto ademas cierra una fuga previa: un
  `pending_verification` con opt-in podia aparecer en el directorio.
- El directorio filtra `status in (registered, checked_in)` (antes
  `<> cancelled`).
- `/registered` muestra a `pending_approval` un panel "en revision" sin QR.
- Check-in rechaza `pending_approval`/`pending_verification` con mensaje claro
  (ademas de que solo actualiza `where status = 'registered'`).
- El dashboard cuenta como "Inscritos" solo las activas (antes contaba todo lo
  no cancelado, inflando con no-verificadas).

### UI de administracion

- Selector "Modo de inscripcion" en crear y editar evento.
- En el detalle del evento, seccion "Solicitudes por aprobar" (solo si el evento
  es `approval`) con aprobar/rechazar por solicitud y contador.

## Criterios de aceptacion

- Un evento `open` se comporta igual que antes (verifica -> registered).
- Un evento `approval`: verificar deja la inscripcion en revision (sin QR);
  aprobar emite credencial; rechazar libera cupo.
- Una inscripcion pendiente no aparece en directorio ni puede hacer check-in.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migraciones: `pending_approval` + `events.registration_mode`.
- [x] `/verify`: estado destino segun modo.
- [x] Gating: `verifyRegistrationAccess`, directorios, `/registered`, check-in,
      dashboard.
- [x] Acciones approve/reject + cola en el detalle del evento.
- [x] Selector de modo en crear/editar evento.
- [ ] Prueba manual: evento approval -> registrar -> verificar -> aprobar y
      rechazar; confirmar QR, directorio y cupo.

## Riesgos

- El rechazo reusa `cancelled`: una persona rechazada que reabre su link ve
  "inscripcion no disponible" igual que una cancelada, y no puede re-inscribirse
  (unique `(event_id, email)`). Aceptable para v1; revisar con el feature de
  comunicaciones.
