# 24. Gestion y suspension de organizaciones (platform admin)

## Estado

`implementado — Epic 37, Fase 3.0`

Implementa el item 3.0 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
listado y gestion de todas las organizaciones (ver, suspender/reactivar).
Crear organizacion + asignar owner ya existia (spec 10, Epic 21).

## Problema

El platform admin podia crear organizaciones pero no gestionarlas: no habia
forma de suspender un cliente (impago, incumplimiento, solicitud) sin borrar
datos. El listado tampoco mostraba estado ni volumen de eventos.

## Objetivos

- Listado completo: nombre, tipo, owners, #eventos, fecha, **estado**.
- **Suspender** (con motivo obligatorio) y **reactivar**. Reversible, sin borrar
  datos.

## Semantica de suspension

Una organizacion suspendida queda **congelada**:

- **Publico bloqueado**: la pagina publica de sus eventos y la inscripcion
  devuelven not-found / no disponible.
- **Panel admin en solo lectura**: sus miembros pueden ver todo, pero ninguna
  escritura pasa (eventos, agenda, equipo, opciones, ubicaciones, check-in,
  aprobaciones, comunicaciones). Banner permanente en el shell.
- **Networking congelado**: `verifyRegistrationAccess` rechaza, asi que perfil,
  directorio y conexiones de sus eventos quedan inaccesibles.
- La credencial ya emitida (QR) sigue visible (es personal), pero el check-in
  esta bloqueado, asi que no opera.

## Decisiones (enforcement en 3 capas)

1. **`app_private.has_organization_role` exige organizacion no suspendida.**
   Punto unico: todas las policies de escritura role-gated y las RPCs que
   validan rol (soft delete/restore, modo de inscripcion, comunicaciones)
   quedan bloqueadas sin tocarlas una a una. `is_organization_member` no
   cambia: los miembros siguen leyendo su panel.
2. **RPCs publicas** (`register_attendee`, `activate_verified_registration`,
   `transfer_organization_ownership`) toman `SELECT ... FOR SHARE` sobre la fila
   de `organizations` y leen `suspended_at` bajo ese lock. Como
   `suspend_organization` hace `UPDATE organizations` (lock exclusivo de fila),
   FOR SHARE serializa: se cierra la carrera de "validar activa, se suspende en
   paralelo, escribir igual" (antes lockeaban filas distintas: evento vs org).
   Las inscripciones concurrentes no se estorban (FOR SHARE es compatible entre
   si); solo un suspend (raro) contiende.
3. **Outbox de comunicaciones**: `claim_communications` excluye las filas de
   organizaciones suspendidas, asi un correo `pending`/`failed` encolado antes de
   suspender no se despacha (ni por cron ni por el `after` inmediato). Ademas, el
   worker **re-chequea la suspension justo antes de despachar cada fila** (el
   claim pudo ser hace rato y la org suspenderse entre el claim y el turno de la
   fila, ya que el lote se procesa en serie): si esta suspendida, restaura la
   fila a `pending` via `release_communication_claim` (deshaciendo el intento) y
   no envia. Al reactivar vuelve a ser reclamable.
4. **Helpers de actions con service_role** (`authorizeEventManager` x2,
   `requireOrgManager`, check-in): validan suspension en codigo, porque el
   service_role ignora RLS.

- `suspend_organization(id, reason)` / `reactivate_organization(id)`: RPCs
  `security definer` que validan **platform admin desde el JWT**
  (`app_metadata.platform_role`, firmada por Supabase — el usuario no puede
  editarla; helper `app_private.is_platform_admin()`). Motivo obligatorio,
  auditoria (`suspended_at/by/reason`).
- UI en `/admin/organizations`: badge de estado, #eventos, motivo visible,
  suspender (con motivo) / reactivar.

## Criterios de aceptacion

- Suspender bloquea publico + escrituras del panel + networking; reactivar
  restaura todo.
- Solo platform admins pueden suspender/reactivar (validado en DB, no solo UI).
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: columnas de suspension, `is_platform_admin`,
      `has_organization_role` con suspension, RPCs suspend/reactivate,
      `register_attendee` + `activate_verified_registration` +
      `transfer_organization_ownership` con chequeo.
- [x] Gating en helpers de actions (events, meetings, equipo, check-in) y
      `verifyRegistrationAccess`; paginas publicas not-found.
- [x] Banner de suspension en AdminShell.
- [x] UI de listado con estado, #eventos y suspender/reactivar.
- [ ] Prueba manual: suspender -> verificar publico/panel/networking ->
      reactivar.

## Riesgos / futuro

- La suspension congela pero no notifica: avisar por email al owner queda para
  el feature de comunicaciones de plataforma.
- No hay "archivado" definitivo de organizaciones (distinto de suspension);
  si un caso real lo pide, se agrega como estado aparte.
