# 07. Persistent Attendee Profiles, Photos and Virtual Cards

## Estado

`draft ready for implementation`

Este spec corrige una brecha del MVP actual: los datos del asistente se guardan
principalmente como snapshots en `event_registrations`. Eso permite operar un
evento, pero no crea un perfil reutilizable entre eventos ni una identidad clara
para networking.

## Problema

Un asistente debe poder crear una sola vez su perfil profesional, reutilizarlo en
eventos futuros, subir una foto reconocible y generar una tarjeta virtual para
compartir sus datos o conectar por I'M IN.

Hoy:

- `event_registrations` guarda `full_name_snapshot`, `phone_snapshot`,
  `company_snapshot`, `role_snapshot`, `industry_snapshot` e `interests`.
- El campo `user_id` existe, pero el flujo publico actual no obliga al asistente
  a autenticarse.
- No existe tabla real `attendee_profiles` aplicada por migracion.
- No existe upload de foto.
- No existe tarjeta virtual exportable/compartible.

## Objetivos

- Crear perfil persistente del asistente.
- Asociar cada inscripcion a un perfil persistente.
- Mantener snapshots por evento para conservar historico.
- Permitir foto de perfil.
- Permitir descripcion breve y LinkedIn.
- Generar tarjeta de presentacion virtual responsive.
- Incluir QR de conexion por la app/web.
- Mantener control de privacidad y consentimiento.

## No objetivos

- No construir chat en tiempo real.
- No construir editor grafico complejo de tarjetas.
- No generar PDF avanzado en esta fase.
- No depender de login con LinkedIn para lanzar esta epica.
- No exponer email/telefono sin consentimiento o conexion aceptada.

## Decision de identidad

### MVP inmediato

El perfil persistente se identifica por email normalizado.

- `attendee_profiles.email` es unico.
- Si el asistente ya existe, el registro de un nuevo evento reutiliza y actualiza
  su perfil base.
- `event_registrations.profile_id` referencia `attendee_profiles.id`.
- `event_registrations` mantiene snapshots para el evento.

### Evolucion recomendada

Cuando se habilite login de asistentes:

- `attendee_profiles.user_id` se asocia a `auth.users.id`.
- El email sigue existiendo como dato de contacto.
- Se permite reclamar/unificar perfiles existentes por email verificado.

Esta decision evita bloquear el MVP por autenticacion de asistentes, pero deja
un camino limpio hacia login real.

## Modelo de datos propuesto

### attendee_profiles

- Enable Postgres extension `citext` if it is not already enabled.
- `id uuid primary key`
- `user_id uuid null references auth.users(id)`
- `email citext not null unique`
- `full_name text not null`
- `headline text null`
- `description text null`
- `phone text null`
- `role text null`
- `company text null`
- `industry text null`
- `linkedin_url text null`
- `avatar_url text null`
- `interests text[] not null default '{}'`
- `profile_slug text unique`
- `created_at timestamptz`
- `updated_at timestamptz`

### event_registrations changes

- Add `profile_id uuid references public.attendee_profiles(id)`.
- Keep snapshot fields.
- On registration:
  - upsert profile by normalized email;
  - copy current profile fields into registration snapshots;
  - link `event_registrations.profile_id`.

### Storage

Bucket: `profile-photos`

Recommended MVP setting:

- Public bucket only for cropped, consented profile photos.
- Max size: 5 MB.
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Store path as `profiles/{profile_id}/{timestamp}.{ext}`.
- Validate content type server-side.

Future privacy upgrade:

- Private bucket with signed image URLs for event-only visibility.

### virtual_business_cards

MVP can avoid a separate table and render cards from `attendee_profiles`.

Add table only if we need versioned/custom cards:

- `id uuid primary key`
- `profile_id uuid references attendee_profiles(id)`
- `theme text`
- `public_slug text unique`
- `qr_payload text`
- `created_at timestamptz`
- `updated_at timestamptz`

## QR de tarjeta

El QR debe conectar a una URL propia de I'M IN, no a un vCard plano.

MVP QR target:

`/p/{profile_slug}?source=card`

Desde esa pagina:

- Si el visitante esta inscrito en el mismo evento, puede solicitar conexion.
- Si no esta inscrito, ve perfil publico limitado y CTA para crear perfil.
- Si el perfil no permite visibilidad publica, se muestra estado privado.

Version posterior:

- QR contextual por evento: `/e/{slug}/directory/{profileId}`.
- QR universal de contacto: `/p/{profile_slug}`.

## Tarjeta virtual

Inspiracion visual: tarjeta vertical con foto protagonista, bloque superior de
marca, datos de contacto con iconos, QR central y mensaje corto.

Campos MVP:

- Foto.
- Nombre.
- Descripcion corta o headline.
- Cargo.
- Empresa.
- Telefono.
- Email.
- LinkedIn.
- QR para conectar.

Estados:

- Sin foto: avatar con iniciales.
- Sin LinkedIn: ocultar fila.
- Sin telefono publico: ocultar fila.
- Perfil privado: tarjeta no publica; solo visible desde token de registro.

Acciones:

- Ver tarjeta.
- Copiar link.
- Descargar imagen PNG.
- Compartir link.

La descarga PNG puede implementarse en V1.1 con `html-to-image` o endpoint
server-side de imagen. El MVP inicial puede entregar link compartible.

## Privacidad

- `email` y `phone` no se muestran en directorio publico de evento salvo:
  - el propio usuario;
  - organizadores autorizados;
  - conexion aceptada;
  - tarjeta configurada explicitamente como publica.
- LinkedIn puede mostrarse si el usuario lo completo y acepto compartirlo.
- La foto se muestra en directorio solo si `public_profile_enabled = true`.
- El usuario debe aceptar consentimiento de:
  - tratamiento de datos;
  - aparecer en directorio;
  - recibir solicitudes;
  - compartir datos al aceptar conexion;
  - mostrar tarjeta publica, si aplica.

## Flujos

### Registro con perfil persistente

1. Usuario abre link de evento.
2. Completa nombre, email, cargo, empresa, intereses y privacidad.
3. Sistema busca `attendee_profiles.email`.
4. Si existe, prellena datos editables.
5. Si no existe, crea perfil.
6. Crea `event_registrations` con snapshots y `profile_id`.
7. Muestra QR de acceso y acceso a completar tarjeta.

### Edicion de perfil

1. Usuario entra desde confirmacion o directorio con `registrationId + token`.
2. Edita perfil base.
3. Decide que campos compartir.
4. Cambios actualizan `attendee_profiles`.
5. Snapshots de registros futuros usan el perfil actualizado.
6. Registro actual puede sincronizar snapshots si el usuario confirma.

### Upload de foto

1. Usuario selecciona archivo.
2. Cliente valida peso y tipo.
3. Server action valida token de registro.
4. Se sube a Supabase Storage.
5. Se guarda `avatar_url` en perfil.
6. Directorio y tarjeta muestran la nueva foto.

### Tarjeta virtual

1. Usuario abre `/profile/card` o CTA desde confirmacion.
2. Sistema renderiza tarjeta con datos permitidos.
3. QR apunta a perfil publico o conexion contextual.
4. Usuario copia link o descarga imagen.

## Criterios de aceptacion

- Al registrarse, se crea o actualiza un registro en `attendee_profiles`.
- `event_registrations.profile_id` queda poblado.
- Si el mismo email se inscribe a otro evento, reutiliza el mismo perfil.
- El directorio usa foto y headline cuando existen.
- La foto se valida por tipo/peso y se guarda en Supabase Storage.
- La tarjeta virtual se puede abrir desde la confirmacion.
- El QR de la tarjeta abre una URL valida de I'M IN.
- Email y telefono respetan reglas de privacidad.
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 10: Perfil persistente

- [x] Crear migracion `attendee_profiles`.
- [x] Habilitar extension `citext` para email case-insensitive.
- [x] Agregar `profile_id` a `event_registrations`.
- [x] Crear indices por `email`, `profile_slug` y `user_id`.
- [x] Crear helper `upsertAttendeeProfileFromRegistration`.
- [x] Actualizar registro publico para crear/reusar perfil.
- [x] Poblar snapshots desde perfil.
- [x] Actualizar directorio para leer `avatar_url`, `headline` y `profile_id`.
- [x] Agregar prueba manual: mismo email en dos eventos reutiliza perfil.

#### Prueba manual: perfil reutilizado entre eventos

1. Aplicar la migracion `20260610120000_create_attendee_profiles.sql`.
2. Crear y publicar dos eventos A y B.
3. Inscribirse en A con `persona@test.com`.
4. Verificar en `attendee_profiles` que existe un perfil con ese email y
   que la inscripcion de A tiene `profile_id` poblado.
5. Inscribirse en B con `Persona@Test.com` (case distinto) y otro cargo.
6. Verificar que no se creo un segundo perfil, que la inscripcion de B usa
   el mismo `profile_id` y que el perfil quedo con el cargo nuevo.
7. Verificar que los snapshots de A no cambiaron.

### Epic 11: Foto de perfil

- [ ] Crear bucket `profile-photos` y documentar configuracion.
- [ ] Crear server action para subir foto con token de registro.
- [ ] Validar MIME type y tamano maximo.
- [ ] Guardar `avatar_url` en `attendee_profiles`.
- [ ] Mostrar foto en directorio, perfil detalle y tarjeta.
- [ ] Agregar fallback con iniciales.

### Epic 12: Edicion de perfil

- [ ] Crear ruta `/e/[slug]/profile`.
- [ ] Permitir editar descripcion, cargo, empresa, telefono, LinkedIn e intereses.
- [ ] Permitir activar/desactivar campos visibles.
- [ ] Agregar CTA desde confirmacion y directorio.
- [ ] Sincronizar snapshots del registro actual cuando corresponda.

### Epic 13: Tarjeta virtual

- [ ] Crear ruta `/p/[profileSlug]`.
- [ ] Crear ruta privada/contextual de tarjeta desde registro.
- [ ] Renderizar tarjeta responsive vertical.
- [ ] Generar QR con `qrcode`.
- [ ] Agregar acciones "Copiar link" y "Compartir".
- [ ] Agregar descarga PNG en V1.1.
- [ ] Verificar mobile y desktop.

## Riesgos

- Identidad por email puede crear duplicados si una persona usa varios correos.
- Storage publico requiere consentimiento claro.
- LinkedIn login futuro debe incluir estrategia de merge de perfiles.
- Descargar imagen PNG puede agregar complejidad visual; no bloquear MVP.
