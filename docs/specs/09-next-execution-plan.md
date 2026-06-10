# 09. Next Execution Plan

## Diagnostico actual

El MVP ya cubre:

- Admin de eventos.
- Link publico.
- Registro.
- QR de acceso.
- Check-in.
- Directorio.
- Solicitudes de conexion.
- Dashboard/exportacion basica.

Brechas principales:

1. Perfil persistente: hoy los datos viven como snapshots por inscripcion.
2. Foto: no hay upload ni render de avatar real.
3. Tarjeta virtual: no existe perfil compartible ni QR de conexion publico.
4. Diseno: hay base funcional, pero falta identidad visual propia.
5. Administracion de organizacion: falta editar nombre de empresa.
6. Eliminacion de eventos: falta soft delete con auditoria.
7. Login de asistentes: aun no esta definido como requisito inmediato.

## Recomendacion de prioridad

### Paso 1: Organization settings y event deletion

Debe ir primero porque son controles operativos basicos para clientes reales.

Resultado esperado:

- Owner/admin puede editar nombre de empresa.
- Owner/admin puede eliminar eventos con motivo.
- Los eventos eliminados se ocultan sin perder historico.

### Paso 2: Perfil persistente

Debe ir antes de foto, tarjeta, directorio mejorado, LinkedIn y match porque
todos dependen de una entidad estable de persona.

Resultado esperado:

- `attendee_profiles` existe en DB.
- Cada `event_registration` tiene `profile_id`.
- El mismo email reutiliza perfil entre eventos.

### Paso 3: Foto de perfil

Debe ir segundo porque mejora reconocimiento real en eventos y alimenta la
tarjeta.

Resultado esperado:

- Upload a Supabase Storage.
- Foto visible en directorio, detalle y tarjeta.

### Paso 4: Edicion de perfil

Permite que el asistente complete datos despues del registro.

Resultado esperado:

- Ruta privada con token de registro.
- Campos: descripcion, cargo, empresa, telefono, LinkedIn, intereses y foto.

### Paso 5: Tarjeta virtual

Debe apoyarse en perfil persistente y foto.

Resultado esperado:

- Ruta compartible.
- QR para conectar.
- Datos visibles segun privacidad.
- Copiar link.

### Paso 6: Rediseno visual

Debe hacerse cuando las piezas reales existan, para que el rediseno no sea solo
cosmetico.

Resultado esperado:

- Logo integrado.
- Paleta azul/turquesa/verde agua.
- Home publica y flujos principales redisenados.

## Branching sugerido

- `epic/10-persistent-attendee-profiles`
- `epic/11-profile-photo-upload`
- `epic/12-profile-editing`
- `epic/13-virtual-business-card`
- `epic/14-brand-foundation`
- `epic/15-public-redesign`
- `epic/16-networking-redesign`
- `epic/17-admin-polish`
- `epic/18-organization-settings`
- `epic/19-event-deletion`
- `epic/20-deleted-event-recovery`

## Commit strategy

Un commit por tarea verificable:

- `feat: add attendee profiles table`
- `feat: link registrations to profiles`
- `feat: add profile photo upload`
- `feat: render attendee avatars`
- `feat: add virtual business card page`
- `style: add im in brand tokens`
- `style: redesign public event page`
- `feat: add organization settings`
- `feat: add soft delete for events`

## Definition of done por epica

- Spec actualizado si cambia una decision.
- Migraciones creadas si cambia DB.
- RLS revisada si hay tablas nuevas.
- UI responsive.
- Estados vacios/error cubiertos.
- `npm run lint`.
- `npm run build`.
- Prueba manual documentada.
- Merge a `main`.
- Push a GitHub.

## Preguntas que producto debe cerrar

### Perfil

- El email sera identidad suficiente para MVP?
- El usuario debe poder editar su perfil sin login usando link/token?
- Queremos permitir perfiles publicos fuera de eventos?

### Foto

- Fotos publicas para cualquier persona con link o solo dentro del evento?
- Habra moderacion de imagenes?

### Tarjeta

- La tarjeta comparte telefono/email siempre o solo si el usuario lo activa?
- El QR debe conectar directo dentro de un evento o abrir perfil universal?
- Necesitamos descarga PNG en MVP o basta link compartible?

### Rediseno

- Cual logo final se aprueba?
- Se usara marca I'M IN sola o co-branding con organizadores?
- La home sera orientada a asistentes, organizadores o ambos?

### Administracion

- Event admin debe poder eliminar eventos o solo owner/admin?
- Queremos recuperar eventos eliminados en V1.1?
- El motivo de eliminacion debe ser visible en reportes internos?

## Plan de implementacion inmediato

### Sprint A: Administracion base

1. Crear `/admin/settings`.
2. Crear action para editar nombre de organizacion.
3. Agregar soft delete a eventos.
4. Crear action para eliminar evento con motivo.
5. Filtrar eventos eliminados en rutas operativas.
6. Verificar que datos historicos siguen en DB.

### Sprint B: Perfil persistente

1. Crear migracion `attendee_profiles`.
2. Agregar `profile_id` a `event_registrations`.
3. Crear helper de upsert por email.
4. Actualizar registro publico.
5. Actualizar directorio y detalle.
6. Verificar dos eventos con mismo email.

### Sprint C: Foto + edicion

1. Crear bucket `profile-photos`.
2. Crear formulario de edicion.
3. Crear upload server-side.
4. Mostrar foto en directorio.
5. Agregar fallback con iniciales.

### Sprint D: Tarjeta virtual

1. Crear slug publico de perfil.
2. Crear `/p/[profileSlug]`.
3. Renderizar tarjeta.
4. Generar QR.
5. Agregar copiar link.

### Sprint E: Rediseno

1. Integrar logo final.
2. Crear tokens visuales.
3. Redisenar tarjeta y perfiles.
4. Redisenar paginas publicas.
5. Redisenar directorio/conexiones.
6. Pulir admin.

## Decision recomendada

Implementar primero `epic/18-organization-settings` y
`epic/19-event-deletion`.

Son cambios pequenos, de alto valor operativo y despejan administracion basica
antes de entrar a perfil/foto/tarjeta.
