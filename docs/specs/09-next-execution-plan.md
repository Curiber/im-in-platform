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
5. Login de asistentes: aun no esta definido como requisito inmediato.

## Recomendacion de prioridad

### Paso 1: Perfil persistente

Debe ir primero porque foto, tarjeta, directorio mejorado, LinkedIn y match
dependen de una entidad estable de persona.

Resultado esperado:

- `attendee_profiles` existe en DB.
- Cada `event_registration` tiene `profile_id`.
- El mismo email reutiliza perfil entre eventos.

### Paso 2: Foto de perfil

Debe ir segundo porque mejora reconocimiento real en eventos y alimenta la
tarjeta.

Resultado esperado:

- Upload a Supabase Storage.
- Foto visible en directorio, detalle y tarjeta.

### Paso 3: Edicion de perfil

Permite que el asistente complete datos despues del registro.

Resultado esperado:

- Ruta privada con token de registro.
- Campos: descripcion, cargo, empresa, telefono, LinkedIn, intereses y foto.

### Paso 4: Tarjeta virtual

Debe apoyarse en perfil persistente y foto.

Resultado esperado:

- Ruta compartible.
- QR para conectar.
- Datos visibles segun privacidad.
- Copiar link.

### Paso 5: Rediseno visual

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

## Commit strategy

Un commit por tarea verificable:

- `feat: add attendee profiles table`
- `feat: link registrations to profiles`
- `feat: add profile photo upload`
- `feat: render attendee avatars`
- `feat: add virtual business card page`
- `style: add im in brand tokens`
- `style: redesign public event page`

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

## Plan de implementacion inmediato

### Sprint A: Perfil persistente

1. Crear migracion `attendee_profiles`.
2. Agregar `profile_id` a `event_registrations`.
3. Crear helper de upsert por email.
4. Actualizar registro publico.
5. Actualizar directorio y detalle.
6. Verificar dos eventos con mismo email.

### Sprint B: Foto + edicion

1. Crear bucket `profile-photos`.
2. Crear formulario de edicion.
3. Crear upload server-side.
4. Mostrar foto en directorio.
5. Agregar fallback con iniciales.

### Sprint C: Tarjeta virtual

1. Crear slug publico de perfil.
2. Crear `/p/[profileSlug]`.
3. Renderizar tarjeta.
4. Generar QR.
5. Agregar copiar link.

### Sprint D: Rediseno

1. Integrar logo final.
2. Crear tokens visuales.
3. Redisenar tarjeta y perfiles.
4. Redisenar paginas publicas.
5. Redisenar directorio/conexiones.
6. Pulir admin.

## Decision recomendada

Implementar primero `epic/10-persistent-attendee-profiles`.

Sin perfil persistente, cualquier trabajo de foto, tarjeta, match o LinkedIn va
a quedar pegado a inscripciones individuales y despues sera mas caro migrarlo.
