# 29. Capa de servicios del asistente

## Estado

`implementado — Epic 46, Fase 5.0`

Implementa el item 5.0 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
extraer la logica de las server actions a `src/lib/services/*` (con tests).
Es el prerequisito de la API v1 (Fase 5.1): la logica que hoy solo puede
invocar el web Next pasa a una capa que tambien consumiran los route handlers.

## Problema

Toda la logica del asistente (inscripcion, verificacion, perfil, directorio,
conexiones, reuniones) vivia dentro de server actions y route handlers de
Next: imposible de invocar desde una API para mobile y dificil de testear
(mezclada con FormData, redirect y revalidatePath).

## Objetivos

- Servicios en `src/lib/services/*` con el cliente Supabase **inyectado**
  (patron ya usado por `getEventProfileOptions`), sin dependencias de Next.
- Las decisiones de negocio quedan **puras y testeadas**; el pegamento de DB
  queda delgado.
- Las actions/pages conservan exactamente el mismo comportamiento: parseo de
  formulario, autenticacion del token y navegacion; la regla vive una sola vez.

## No objetivos

- Cambiar comportamiento, rutas o UI (refactor sin features).
- Extraer la logica del admin (la API v1 es para el asistente; el admin sigue
  siendo web-only por ahora).
- API v1 propiamente tal (Fase 5.1, spec siguiente).

## Decisiones

### Servicios (`src/lib/services/`)

| Servicio | Extraido de | Expone |
| --- | --- | --- |
| `registration-service` | `register/actions.ts` | `registerAttendee` (fast-fail de evento/suspension, validacion de catalogo, token unico + RPC idempotente con reintentos) |
| `verification-service` | `verify/route.ts` | `verifyRegistration` + decision pura `evaluateVerificationEligibility` |
| `profile-service` | `profile/actions.ts` | `updateAttendeeProfile` (catalogo + persistencia doble perfil/snapshot + consent) |
| `directory-service` | paginas de directorio | `listDirectoryProfiles`, filtros y ranking **puros** (`filterDirectoryProfiles`, `rankSuggestedMatches`), `recordProfileView` |
| `connection-service` | `connections/actions.ts` y pagina | `createConnectionRequest`, `respondToConnectionRequest` (+ email al aceptar), `listConnections`, `loadRegistrationContacts` |
| `meeting-service` | `meetings/actions.ts` y paginas | `proposeMeeting`/`respondMeeting`/`cancelMeeting` (RPCs spec 27), `listMeetings`, `getMeetingProposalOptions`, `countPendingMeetings` |

### Puro y testeado

- `rpc-retry.ts`: politica de reintentos de RPCs idempotentes (ambiguo = status
  0 o 5xx se reintenta con el mismo request_id; 4xx es definitivo). Antes vivia
  inline en la action de registro.
- `validateProfileSelections` (en `profile-options.ts`): validacion de
  area/intereses/objetivos contra el catalogo efectivo, compartida por
  registro, perfil y API v1.
- `evaluateVerificationEligibility`: idempotencia primero, luego estado,
  termino del evento y TTL de 24h del link.
- Filtros y ranking del directorio.

### Lo que NO entra al servicio

- `after()` (envio de email de verificacion post-respuesta) y
  `redirect`/`revalidatePath`: primitivas de Next, quedan en la action. El
  servicio devuelve lo necesario (token en claro, nombre/fecha del evento)
  para que el caller arme el email.
- El parseo de FormData/zod: cada superficie (web form, API JSON) parsea lo
  suyo y llama al servicio con tipos limpios.

## Criterios de aceptacion

- Ningun cambio de comportamiento observable en registro, verificacion,
  perfil, directorio, conexiones ni reuniones.
- Las actions no contienen queries ni reglas: solo parseo, auth de token y
  navegacion.
- `npm run lint`, `npm run build` y `npm test` pasan (20 tests nuevos).

## Tareas

- [x] `rpc-retry` + tests.
- [x] `validateProfileSelections` + tests.
- [x] Servicios de registro, verificacion (+ tests de elegibilidad), perfil,
      directorio (+ tests de filtro/ranking), conexiones y reuniones.
- [x] Actions/route/paginas delgadas consumiendo los servicios.
- [ ] Prueba manual de regresion: registro -> verificacion -> perfil ->
      directorio -> conexion -> reunion.

## Riesgos / futuro

- Los servicios aun asumen el cliente admin (service_role) porque la
  autenticacion es por token de inscripcion validado antes. Cuando exista auth
  de asistente (5.2), el mismo contrato acepta un cliente con sesion + RLS.
- `listConnections`/`listMeetings` hacen 2-3 queries; si la API mobile lo
  vuelve costoso, se agregan por RPC como `event_profile_view_stats`.
