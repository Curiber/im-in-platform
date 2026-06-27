# 11. Security, Privacy and Data Integrity Hardening

## Estado

`draft ready for implementation`

Este spec consolida los hallazgos de una revision tecnica completa del codigo,
las migraciones y las policies RLS al 2026-06-12. Prioriza brechas de
privacidad y autorizacion que contradicen reglas ya definidas en
[04-privacy-linkedin.md](04-privacy-linkedin.md) y
[07-persistent-attendee-profiles-and-virtual-cards.md](07-persistent-attendee-profiles-and-virtual-cards.md),
mas deudas de integridad de datos y de verificacion automatizada.

## Problema

El MVP funciona end-to-end y `npm run lint` / `npm run build` pasan, pero la
revision detecto brechas concretas:

### P1. Tarjeta publica expone email y telefono sin consentimiento (critico)

Spec 07 dice: "No exponer email/telefono sin consentimiento o conexion
aceptada" y define el estado "Perfil privado: tarjeta no publica". Hoy:

- `src/app/p/[profileSlug]/page.tsx` renderiza email y telefono con el
  service role client, sin ninguna condicion.
- Todo perfil recibe `profile_slug` al crearse en
  `upsertAttendeeProfileFromRegistration`, por lo que toda persona inscrita
  tiene una tarjeta publica con sus datos de contacto, aunque haya rechazado
  networking y directorio.
- No existe consentimiento `public_card` ni flag de visibilidad por campo.

### P2. No hay verificacion de propiedad del email (critico)

El registro publico no exige probar control del email:

- Cualquiera puede inscribirse con el email de un tercero y recibe en pantalla
  (redirect inmediato) el `registrationId + token`, que es la credencial QR y
  el acceso a directorio, conexiones y edicion de perfil.
- `upsertAttendeeProfileFromRegistration` sobrescribe el perfil persistente
  global de ese email (nombre, cargo, empresa, telefono, intereses) sin probar
  identidad. Un atacante puede corromper o suplantar el perfil de otra persona
  y dejar su tarjeta publica con datos falsos.
- El mensaje "Ya existe una inscripcion para este email" permite enumerar
  emails inscritos a un evento publicado.

### P3. RLS no respalda las reglas de roles de la app (alto)

La anon key es publica por diseno (`NEXT_PUBLIC_*`), asi que cualquier usuario
autenticado puede llamar PostgREST directo, sin pasar por las server actions:

- La policy de update de `public.events` permite `owner`, `admin` y
  `event_admin` sobre cualquier columna. Las reglas "solo owner/admin elimina"
  y "solo owner restaura" (spec 10) viven solo en `deleteEvent` y
  `restoreEvent`; un `event_admin` puede setear `deleted_at`, `delete_reason`,
  `deleted_by` o `status` directo contra la API de Supabase.
- No hay separacion entre cambiar campos operativos y cambiar columnas de
  auditoria de borrado.

### P4. Integridad de inscripciones y check-in (alto)

- Capacidad con race condition: `registerForEvent` hace count y luego insert
  sin atomicidad; inscripciones concurrentes pueden exceder `capacity`.
- Check-in no idempotente bajo concurrencia: dos scanners simultaneos pasan la
  validacion de estado y ambos updates ganan; el update no condiciona
  `status = 'registered'`.
- `registerForEvent` construye la URL del email de confirmacion con el header
  `origin` del request. Un request manipulado genera un email legitimo de
  I'm IN con link a un dominio atacante (host header injection). `APP_URL`
  debe ser la fuente de verdad.
- No se valida que el evento no haya terminado (`ends_at`) al inscribir.

### P5. Manejo del token de asistente (medio)

El token QR es una credencial de larga vida y viaja en query string por todas
las paginas de asistente (`?registrationId=...&token=...`):

- Queda en historial del navegador, logs de servidor/proxy y puede filtrarse
  por header `Referer` al abrir links externos (LinkedIn en perfiles).
- No hay `Referrer-Policy` configurada ni rotacion/revocacion del token.

### P6. Exportacion CSV inyectable (medio)

`escapeCsv` en `src/app/admin/events/[eventId]/export/route.ts` escapa comas y
comillas pero no neutraliza formulas. Un asistente que se inscribe con nombre
o empresa `=HYPERLINK(...)` o `+cmd|...` ejecuta formula injection cuando el
organizador abre el CSV en Excel/Sheets.

### P7. Configuracion de entorno incompleta (medio)

- `EMAIL_PROVIDER_API_KEY` y `EMAIL_FROM` no estan en `src/lib/env.ts`; si
  faltan, los emails se omiten en silencio (`{ sent: false }` se descarta).
- `APP_URL` es opcional con fallback `http://localhost:3000` en produccion:
  tarjetas publicas, QR e invitaciones de owner generarian links a localhost
  sin error visible.

### P8. Cero pruebas automatizadas (alto, transversal)

No existe runner de tests, ni script `test`, ni cobertura de las reglas mas
sensibles (verificacion de token, capacidad, roles, privacidad de tarjeta).
Las "pruebas manuales" de los specs no protegen contra regresiones.

### P9. Creacion de organizacion no atomica (medio)

`createOrganization` en `src/app/admin/actions.ts` ejecuta tres pasos sin
transaccion: invita/busca al owner en Auth, inserta la organizacion y luego
inserta el membership. Fallas intermedias dejan estados huerfanos:

- Si falla el insert de membership, queda una organizacion sin ningun owner;
  como las policies de select exigen membresia, nadie del cliente puede verla
  y solo el platform admin puede detectarla.
- Si falla el insert de organizacion despues de invitar, queda un usuario
  invitado en Auth sin relacion con ninguna organizacion.

La inscripcion publica (`registerForEvent`) tiene una version menor del mismo
patron: si fallan los inserts de `consents` despues de crear la inscripcion,
no hay compensacion ni registro del error.

### P10. Deudas menores

- `findAuthUserByEmail` pagina hasta 20.000 usuarios para resolver un email;
  no escala y es O(n) por invitacion de owner.
- Fotos antiguas quedan huerfanas en el bucket publico al re-subir avatar, y
  siguen publicas aunque el perfil se vuelva privado.
- Server actions de admin lanzan `throw new Error(...)` para errores de
  validacion: el usuario ve la pagina de error de Next en vez de feedback
  inline (el flujo de registro publico ya usa `useActionState`; el admin no).
- `networkingOptIn` y `publicProfileEnabled` se derivan del mismo checkbox en
  el registro, pero se registran como consentimientos distintos en `consents`.
- Comparacion de hash de token con `!==`; usar `crypto.timingSafeEqual` es
  barato y elimina la discusion.

## Objetivos

- Cumplir las reglas de privacidad ya escritas en specs 04 y 07: email y
  telefono nunca publicos sin consentimiento explicito.
- Exigir prueba de control del email antes de entregar credenciales QR o
  mutar el perfil persistente.
- Que RLS haga cumplir en la base los mismos roles que la app declara.
- Eliminar las race conditions de capacidad y check-in.
- Neutralizar host header injection y CSV injection.
- Validar el 100% de las variables de entorno requeridas al boot.
- Crear la base minima de pruebas automatizadas para reglas de negocio
  sensibles.

## No objetivos

- No implementar login de asistentes con password/OAuth (sigue el modelo de
  token por registro; spec 07 define la evolucion).
- No agregar rate limiting global ni captcha en esta fase (se documenta como
  riesgo aceptado).
- No migrar el bucket de fotos a privado con signed URLs (queda como upgrade
  futuro, ya anotado en spec 07).
- No redisenar UI.

## Reglas y decisiones

### Tarjeta publica opt-in

- Nuevo campo `attendee_profiles.card_visibility` enum
  `('private', 'public_limited', 'public_full')`, default `private`.
- `private`: `/p/[profileSlug]` responde 404 o estado "perfil privado".
- `public_limited`: nombre, headline, cargo, empresa, intereses, LinkedIn si
  el usuario lo completo. Sin email ni telefono.
- `public_full`: agrega email/telefono solo si el usuario activo cada campo.
- Nuevo `consent_type` `public_card` registrado al activar visibilidad.
- La edicion de perfil (`/e/[slug]/profile`) expone el control de visibilidad.

### Verificacion de email

- La inscripcion crea el registro en estado `pending_verification` y envia el
  link de confirmacion (con el token) solo por email. La pantalla de exito no
  muestra QR ni token.
- El registro pasa a `registered` al abrir el link verificado.
- Si el email ya tiene perfil persistente, los snapshots del evento se crean
  igual, pero el update del perfil global solo se aplica tras verificacion.
- Mensaje de duplicado neutro: "Si el email es valido, recibiras la
  confirmacion" para cortar la enumeracion.

### RLS alineada con roles

- Reemplazar la policy unica de update de `events` por:
  - update operativo (`owner`, `admin`, `event_admin`) que excluye columnas
    `deleted_at`, `deleted_by`, `delete_reason` via trigger de guardia o
    funcion `security definer`;
  - soft delete solo `owner`/`admin`;
  - restore solo `owner`.
- Implementar soft delete/restore como funciones RPC `security definer`
  (`app_private.soft_delete_event`, `app_private.restore_event`) y que las
  server actions las invoquen; las policies de update dejan de permitir tocar
  columnas de auditoria.

### Integridad transaccional

- Capacidad: funcion RPC `register_attendee` que valida capacidad e inserta
  en una transaccion (lock por `event_id` con `select ... for update` sobre el
  evento o constraint via trigger).
- Check-in: el update agrega `.eq("status", "registered")` y trata 0 filas
  afectadas como "ya acreditado".
- URLs salientes (emails, tarjetas, QR): siempre desde `APP_URL` validada;
  el header `origin` deja de usarse.

### Endurecimiento de salida

- CSV: prefijar `'` a valores que comiencen con `=`, `+`, `-`, `@`, tab o CR.
- Agregar header global `Referrer-Policy: strict-origin-when-cross-origin` (o
  `no-referrer` en rutas con token) en `next.config.ts`.

### Entorno y pruebas

- `src/lib/env.ts` valida tambien `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` y
  hace `APP_URL` requerida cuando `NODE_ENV === 'production'`.
- Incorporar Vitest con script `npm run test` y cubrir como minimo:
  `registration-token`, `verifyRegistrationAccess` (mock de Supabase),
  `escapeCsv`/formula injection, reglas de visibilidad de tarjeta y el
  parseo de payload de check-in.

## Criterios de aceptacion

- Un perfil recien creado no es accesible en `/p/[profileSlug]` hasta que el
  usuario activa visibilidad, y nunca muestra email/telefono sin opt-in por
  campo.
- Inscribirse con un email ajeno no entrega QR ni token en pantalla y no
  modifica el perfil persistente existente.
- Un `event_admin` autenticado contra la API de Supabase no puede soft
  delete, restaurar ni alterar columnas de auditoria de `events`.
- Dos inscripciones concurrentes al ultimo cupo no exceden `capacity`
  (verificable con test de integracion o script de carga local).
- Dos check-ins simultaneos del mismo QR producen un solo `checked_in_at`.
- El link del email de confirmacion usa `APP_URL` aunque el request traiga un
  header `origin` falsificado.
- Un CSV exportado con nombre `=1+1` abre en Excel como texto, no formula.
- El boot en produccion falla con mensaje claro si falta `APP_URL`,
  `EMAIL_PROVIDER_API_KEY` o `EMAIL_FROM`.
- Crear una organizacion nunca deja una organizacion sin owner, aunque falle
  un paso intermedio.
- `npm run test`, `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 22: Privacidad de tarjeta publica (P1)

- [ ] Migracion: `card_visibility` + flags por campo en `attendee_profiles`.
- [ ] Migracion: nuevo `consent_type` `public_card`.
- [ ] `/p/[profileSlug]`: respetar visibilidad y estado privado.
- [ ] Edicion de perfil: control de visibilidad y registro de consentimiento.
- [ ] Backfill: perfiles existentes quedan `private`.
- [ ] Tests de reglas de visibilidad.

### Epic 23: Verificacion de email en registro (P2)

- [ ] Migracion: estado `pending_verification` en `registration_status`.
- [ ] Action de registro: no exponer token en pantalla; enviar solo por email.
- [ ] Ruta de verificacion que activa el registro y sincroniza el perfil.
- [ ] Diferir update del perfil persistente hasta verificacion.
- [ ] Mensaje neutro para emails duplicados.
- [ ] Definir expiracion/limpieza de registros nunca verificados.

### Epic 24: RLS alineada con roles (P3)

- [x] Migracion: RPCs `security definer` para soft delete y restore
      (`public.soft_delete_event`, `public.restore_event`).
- [x] Migracion: trigger de guardia sobre columnas de auditoria de `events`
      (`app_private.guard_event_audit_columns` + flag transaccional).
- [x] Ajustar `deleteEvent`/`restoreEvent` para usar las RPCs.
- [x] Prueba manual documentada (ejecutar tras aplicar la migracion): ver abajo.

#### Prueba manual (event_admin via PostgREST)

Con un usuario `event_admin` autenticado (su JWT/anon key), contra PostgREST
directo:

1. `update events set deleted_at = now() where id = '<evento>'` -> debe fallar
   con el error del trigger de guardia.
1b. `insert into events (..., deleted_at) values (..., now())` -> debe fallar:
   un evento no puede nacer con columnas de auditoria de borrado.
2. `rpc/soft_delete_event` con ese evento -> debe fallar con "No tienes
   permisos para eliminar este evento." (rol insuficiente).
3. `rpc/restore_event` sobre un evento eliminado -> debe fallar (solo owner).

Con `owner`/`admin`: `rpc/soft_delete_event` con motivo valido (>= 5 chars)
elimina; `rpc/restore_event` solo funciona como `owner`.

Caso FK: borrar de Auth a un usuario que figura en `events.deleted_by` debe
funcionar (el cascade `on delete set null` pone `deleted_by = NULL` y el trigger
permite esa transicion porque el usuario ya no existe).

### Epic 25: Integridad de inscripcion y check-in (P4)

- [x] RPC transaccional de inscripcion con control de capacidad
      (`register_attendee`, lock `for update` sobre el evento + insert de
      inscripcion y consentimientos en una transaccion).
- [x] Guard de estado en update de check-in (ya presente: el update condiciona
      `status = 'registered'` y 0 filas se trata como "ya acreditado").
- [x] Reemplazar header `origin` por `APP_URL` en emails (ya presente:
      `registerForEvent` usa `getAppUrl()`).
- [x] Rechazar inscripcion si el evento ya termino (la RPC rechaza con `ended`
      cuando `ends_at < now()`).

### Epic 26: Endurecimiento de salida y token (P5, P6)

- [ ] Escape anti formula injection en export CSV + test.
- [ ] `Referrer-Policy` global en `next.config.ts`.
- [ ] Evaluar mover `registrationId+token` a cookie de sesion de asistente
      (decision documentada; si se pospone, registrar riesgo aceptado).
- [ ] Comparacion de hashes con `timingSafeEqual`.

### Epic 27: Entorno, observabilidad y base de tests (P7, P8, P10)

- [x] Completar schema de `src/lib/env.ts` (email vars, `APP_URL` en prod).
- [x] Instalar Vitest + script `test` + primeros tests unitarios (csv,
      visibilidad de tarjeta, token de registro, `getAppUrl`).
- [x] Borrar foto anterior del bucket al subir una nueva (perfil y portada de
      evento; borra solo el objeto previo, concurrency-safe).
- [x] Migrar actions admin de `throw` a estado de formulario inline
      (organizacion/equipo + eventos + creacion de organizacion).
- [x] Reemplazar `findAuthUserByEmail` paginado por lookup directo (RPC
      `find_user_id_by_email` security definer; compara `email` exacto para usar
      el indice nativo de `auth.users`, sin alterar la tabla gestionada).

### Epic 28: Creacion atomica de organizaciones (P9)

- [x] RPC `security definer` que inserta organizacion + membership owner en
      una transaccion (`create_organization_with_owner`); `createOrganization`
      la invoca tras resolver el user.
- [x] Compensacion si la invitacion de Auth queda huerfana (se borra el usuario
      recien invitado cuando la RPC falla).
- [x] Listado de organizaciones sin owner visible para platform admin como
      red de seguridad (fila marca "Sin owner -- revisar" en rojo).
- [ ] Inserts de `consents` dentro de la misma RPC de inscripcion del Epic 25
      o, al menos, log del error en vez de descartar el resultado.

## Riesgos

- La verificacion de email agrega friccion al registro en evento presencial;
  mitigar con reenvio rapido y copy claro. Si producto la rechaza, debe
  quedar como riesgo aceptado explicito, porque P1/P2 dependen de ella.
- Cambiar policies de `events` puede romper flujos admin existentes; requiere
  prueba manual completa de crear/editar/publicar/cerrar/borrar/restaurar.
- El backfill a `private` oculta tarjetas que hoy se comparten; comunicar el
  cambio a los perfiles activos.
- Sin rate limiting sigue siendo posible spam de inscripciones y solicitudes
  de conexion; riesgo aceptado para esta fase, revisar antes de eventos
  grandes.
