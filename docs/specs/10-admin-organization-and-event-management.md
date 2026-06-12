# 10. Admin Organization and Event Management

## Estado

`draft ready for implementation`

Este spec agrega dos capacidades administrativas necesarias para clientes que
usan la plataforma:

1. Owner/admin puede editar el nombre de la empresa u organizacion.
2. Owner/admin puede eliminar eventos que ya no deben estar visibles u
   operativos.

## Problema

Hoy el administrador puede crear eventos y operar el MVP, pero no tiene control
suficiente sobre datos basicos de su organizacion ni sobre limpieza del listado
de eventos. Esto genera friccion operativa cuando:

- La empresa cambia de nombre.
- Se creo un evento de prueba.
- Se duplico un evento.
- Un evento fue cancelado.
- Un evento no debe seguir visible para admins ni asistentes.

## Objetivos

- Permitir editar nombre de organizacion desde el admin.
- Permitir eliminar eventos desde el admin con permisos correctos.
- Evitar borrado accidental de datos historicos.
- Ocultar eventos eliminados de listados, links publicos, directorio y
  dashboard operativo.
- Mantener auditoria minima: quien elimino, cuando y por que.

## No objetivos

- No implementar gestion completa de billing/empresa.
- No eliminar fisicamente datos historicos por defecto.
- No crear multi-organizacion avanzada.
- No permitir que `event_admin` elimine eventos sin permiso superior.

## Platform admin

La creacion de organizaciones no debe ser autoservicio. Para el MVP, solo los
administradores internos de la plataforma pueden crear organizaciones cliente y
asignar el owner inicial.

Identificacion MVP:

- `auth.users.raw_app_meta_data.platform_role = "platform_admin"`

Flujo:

1. Platform admin entra a `/admin/organizations`.
2. Crea la organizacion.
3. Ingresa email del owner inicial.
4. Si el usuario ya existe en Supabase Auth, se reutiliza.
5. Si no existe, se envia invitacion de Supabase Auth.
6. Se crea `organization_users` con rol `owner`.

Usuarios sin `platform_role = "platform_admin"` no pueden acceder a la ruta ni
ejecutar la action de creacion.

## Roles y permisos

### Editar organizacion

Permitido para:

- `owner`
- `admin`

No permitido para:

- `event_admin`

Campos editables MVP:

- `name`
- `website_url`
- `logo_url` en epica posterior de branding

### Eliminar eventos

Permitido para:

- `owner`
- `admin`

No permitido para:

- `event_admin`, salvo que producto lo habilite explicitamente despues.

Razon:

Eliminar un evento puede ocultar inscripciones, reportes, conexiones y check-ins.
Debe quedar restringido a roles con responsabilidad de organizacion.

## Decision: soft delete por defecto

La accion visible puede llamarse "Eliminar", pero internamente debe ser soft
delete.

Agregar a `events`:

- `deleted_at timestamptz null`
- `deleted_by uuid null references auth.users(id)`
- `delete_reason text null`

Reglas:

- Evento eliminado no aparece en listados normales.
- Evento eliminado no tiene pagina publica.
- Evento eliminado no permite registro.
- Evento eliminado no permite check-in.
- Evento eliminado no aparece en directorio de asistentes.
- Dashboard/exportacion pueden quedar accesibles solo desde vista de eventos
  eliminados, si se implementa.

Hard delete:

- Permitido solo para eventos `draft` sin inscripciones, o por proceso interno
  controlado.
- No debe ser la accion estandar del admin.

## Flujos

### Editar nombre de empresa

1. Owner/admin entra a `/admin`.
2. Abre configuracion de organizacion.
3. Edita nombre.
4. Guarda.
5. El nuevo nombre aparece en admin, eventos publicos y emails futuros.

### Eliminar evento

1. Owner/admin entra al detalle del evento.
2. Click en "Eliminar evento".
3. Se muestra confirmacion con impacto:
   - se ocultara de listados;
   - se cerrara registro;
   - no se borraran datos historicos.
4. Admin ingresa motivo obligatorio.
5. Sistema guarda `deleted_at`, `deleted_by`, `delete_reason`.
6. Redirige a `/admin/events`.
7. Evento desaparece del listado normal.

### Ver eventos eliminados

MVP puede omitir vista de recuperacion. V1.1 recomendado:

1. Filtro `Eliminados`.
2. Mostrar nombre, fecha, quien elimino y motivo.
3. Permitir restaurar solo a `owner`.

## Cambios de datos

### organizations

Ya existe `name`; se requiere action/UI para editarlo.

Campos futuros:

- `updated_at` si no existe.
- `updated_by uuid null references auth.users(id)` opcional.

### events

Agregar:

- `deleted_at`
- `deleted_by`
- `delete_reason`

Indices:

- Indice parcial para listados activos:
  - `(organization_id, status, starts_at) where deleted_at is null`
- Indice para auditoria:
  - `(organization_id, deleted_at) where deleted_at is not null`

## Reglas de consulta

Todas las consultas operativas de eventos deben filtrar:

`deleted_at is null`

Aplicar en:

- `/admin/events`
- `/admin/events/[eventId]`
- `/admin/events/[eventId]/edit`
- `/admin/events/[eventId]/check-in`
- `/admin/events/[eventId]/dashboard`
- `/admin/events/[eventId]/export`
- `/e/[slug]`
- `/e/[slug]/register`
- server actions de registro y check-in

## RLS esperada

- `owner/admin` pueden actualizar `organizations.name`.
- `owner/admin` pueden soft-delete eventos de su organizacion.
- `event_admin` puede seguir editando eventos si ya estaba permitido, pero no
  soft-delete.
- Lectura publica de eventos debe excluir `deleted_at is not null`.

## UI requerida

### Configuracion de organizacion

Ruta propuesta:

- `/admin/settings`

Controles:

- Nombre de empresa.
- Sitio web.
- Logo en epica de branding.

### Detalle de evento

Agregar zona de peligro:

- Boton `Eliminar evento`.
- Modal/pagina de confirmacion.
- Campo obligatorio `Motivo`.
- Texto claro: "Los datos historicos se conservaran."

## Criterios de aceptacion

- Owner/admin puede editar nombre de organizacion.
- Event admin no puede editar nombre de organizacion.
- Owner/admin puede eliminar un evento con motivo obligatorio.
- Event admin no ve o no puede ejecutar eliminar evento.
- Evento eliminado no aparece en listado normal.
- Link publico de evento eliminado devuelve 404.
- Registro/check-in de evento eliminado no se puede ejecutar.
- Datos historicos no se borran de DB.
- `deleted_at`, `deleted_by` y `delete_reason` quedan guardados.
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 18: Organization settings

- [x] Crear ruta `/admin/settings`.
- [x] Crear formulario para editar `organizations.name`.
- [x] Crear server action `updateOrganizationSettings`.
- [x] Validar rol `owner/admin`.
- [x] Mostrar error si usuario no tiene permisos.
- [x] Actualizar admin header/listados para usar nombre editado.

### Epic 19: Event deletion

- [x] Crear migracion para `events.deleted_at`, `deleted_by`,
  `delete_reason`.
- [x] Agregar indices para eventos activos/eliminados.
- [x] Crear helper de permisos `canManageOrganization`.
- [x] Crear server action `deleteEvent`.
- [x] Validar rol `owner/admin`.
- [x] Requerir motivo de eliminacion.
- [x] Ocultar eventos eliminados de listados activos.
- [x] Bloquear pagina publica, registro, check-in, dashboard y export si
  `deleted_at` no es null.
- [x] Agregar UI de zona de peligro en detalle de evento.
- [x] Verificar que inscripciones/conexiones permanecen en DB.

### Epic 20: Deleted event recovery, V1.1

- [x] Agregar filtro `Eliminados` en listado admin.
- [x] Crear vista de detalle read-only para evento eliminado.
- [x] Crear action `restoreEvent` solo para owner.
- [ ] Registrar `restored_at` y `restored_by` si se implementa auditoria. Pendiente: V1.1 restaura limpiando los campos de eliminacion sin auditoria adicional.

### Epic 21: Platform admin organizations

- [x] Agregar logout visible en pantallas principales del admin.
- [x] Remover creacion autoservicio de organizaciones desde `/admin`.
- [x] Crear helper `isPlatformAdmin`.
- [x] Crear `/admin/organizations`.
- [x] Crear server action de alta de organizacion protegida por platform admin.
- [x] Invitar o reutilizar usuario owner por email.
- [x] Crear membership owner inicial.

### Epic 29: Gestion de usuarios de organizacion, V1.1

Brecha detectada en revision 2026-06-12: la plataforma solo permite crear la
organizacion con un owner inicial. No existe UI ni actions para administrar
miembros despues, aunque las policies RLS de `organization_users` ya permiten
a owner/admin insertar y actualizar miembros, y a owner removerlos.

- [ ] Listar miembros y roles en `/admin/settings` (owner/admin).
- [ ] Invitar o agregar miembro por email con rol `admin` o `event_admin`.
- [ ] Cambiar rol de un miembro (owner/admin; solo owner puede crear owners).
- [ ] Remover miembro (solo owner; impedir remover al ultimo owner).
- [ ] Transferir ownership con confirmacion explicita.
- [ ] Reusar invitacion de Supabase Auth para emails sin cuenta.

### Epic 30: Navegacion admin consistente

Brecha detectada en revision 2026-06-12: el logout existe en `/admin`,
`/admin/events`, `/admin/settings` y `/admin/organizations`, pero no en
detalle de evento, nuevo evento, edicion, dashboard ni check-in, porque cada
pagina construye su propio header.

- [ ] Crear `src/app/admin/layout.tsx` con header compartido: nombre de
      organizacion, navegacion principal y `SignOutButton`.
- [ ] Eliminar headers duplicados por pagina y dejar solo el titulo local.
- [ ] Verificar logout accesible desde todas las rutas `/admin/*`.

## Orden recomendado

Implementar antes del rediseno visual:

1. Organization settings.
2. Event deletion.
3. Perfil persistente.
4. Foto/tarjeta.
5. Rediseno.

Razon: permisos y administracion basica son cimientos operativos; conviene
cerrarlos antes de invertir en UI final.
