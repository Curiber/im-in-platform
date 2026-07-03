# 30. API v1 del asistente

## Estado

`implementado — Epic 47, Fase 5.1`

Implementa el item 5.1 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
capa API (`/api/v1/*`) consumible por mobile, construida sobre los servicios
del [29-attendee-services-layer.md](29-attendee-services-layer.md).

## Problema

Toda la logica del asistente solo era invocable desde el web Next (server
actions). La app nativa (Fase 6) necesita una API HTTP con las mismas reglas.

## Objetivos

- Route handlers `/api/v1/*` que cubren el MVP de la app: mi inscripcion y
  perfil, directorio con sugeridos, conexiones y reuniones.
- **Cero duplicacion de reglas**: cada endpoint parsea JSON, autentica y llama
  al mismo servicio que usa la web.
- Contrato estable: envelope `{ data }` / `{ error: { code, message } }`,
  camelCase, status HTTP correctos.

## No objetivos

- Registro por API: la inscripcion nace en la web publica del evento (con
  verificacion de email); la app consume credenciales ya emitidas.
- Auth por sesion OTP (Fase 5.2): esta version usa las credenciales del
  flujo actual. El esquema de auth se ampliara sin romper este.
- Rate limiting y API keys de terceros (cuando haya consumidores externos).

## Decisiones

### Autenticacion

`Authorization: Bearer <registrationId>:<token>` — las mismas credenciales del
link/QR del asistente. `verifyRegistrationToken` (variante sin slug de
`verifyRegistrationAccess`, misma funcion de reglas: token con
`timingSafeEqual`, evento no borrado, organizacion no suspendida, inscripcion
activa). El separador `:` es seguro: el id es UUID y el token base64url.

401 uniforme ante cualquier credencial invalida (sin filtrar el motivo).

### Endpoints

| Metodo y ruta | Que hace | Servicio |
| --- | --- | --- |
| `GET /api/v1/me` | Inscripcion del portador + perfil persistente | — |
| `PATCH /api/v1/me/profile` | Actualiza perfil (catalogo + doble persistencia) | `profile-service` |
| `GET /api/v1/directory` | Perfiles visibles con filtros `q/industry/interest` + sugeridos con razones | `directory-service` |
| `GET /api/v1/directory/{id}` | Detalle + match + estado de conexion; registra la vista | `directory-service` |
| `GET /api/v1/connections` | Recibidas y enviadas con contacto | `connection-service` |
| `POST /api/v1/connections` | Crea solicitud (idempotente si ya existe) | `connection-service` |
| `POST /api/v1/connections/{id}/respond` | Acepta/rechaza (solo receiver) | `connection-service` |
| `GET /api/v1/meetings` | Agenda del portador con contraparte y lugar | `meeting-service` |
| `POST /api/v1/meetings` | Propone reunion (RPC bajo lock, spec 27) | `meeting-service` |
| `GET /api/v1/meetings/options` | Franjas futuras + puntos de encuentro | `meeting-service` |
| `POST /api/v1/meetings/{id}/respond` | Acepta/rechaza (revalida bajo lock) | `meeting-service` |
| `POST /api/v1/meetings/{id}/cancel` | Cancela pendiente/aceptada | `meeting-service` |

El QR de acreditacion no necesita endpoint: la app ya posee
`registrationId + token` (el payload del QR).

### Privacidad

- El **email de un contacto solo viaja en conexiones aceptadas** (momento en
  que ambos consintieron compartir contacto), igual que la web. El mapper
  `toContactDto` lo omite en cualquier otro caso.
- Los endpoints de networking exigen `networking_enabled` (403); `me`,
  `connections` y `meetings` funcionan aunque el organizador apague el
  networking (los datos ya existentes del portador siguen siendo suyos).

### Codigos de error

`unauthorized` 401, `networking_disabled` 403, `invalid_request` 400,
`invalid_selection` 422, `not_found` 404, `conflict`/`expired`/`unavailable`
409, `internal` 500. Los `result_status` de las RPCs de reuniones se mapean a
estos codigos.

## Criterios de aceptacion

- Con un `registrationId:token` valido, `GET /me`, `/directory`,
  `/connections` y `/meetings` devuelven `{ data }` coherente con lo que
  muestra la web; con token invalido, 401 uniforme.
- `POST /meetings` y `/respond` devuelven 409 con `conflict`/`expired` en los
  mismos casos en que la web muestra esos avisos.
- Ningun email de contacto aparece en respuestas sin conexion aceptada.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] `verifyRegistrationToken` (auth sin slug, mismas reglas).
- [x] Helpers de envelope/errores/DTOs (`src/lib/api/v1.ts`).
- [x] Endpoints de me/perfil, directorio, conexiones y reuniones.
- [ ] Prueba manual con curl/Postman contra un evento real.

## Riesgos / futuro

- Versionado: cambios incompatibles abren `/api/v2`; v1 queda congelada
  cuando la app este publicada.
- Cuando exista la sesion OTP (5.2), `authenticateApiRequest` aceptara ademas
  un access token de Supabase Auth, resolviendo las inscripciones del usuario.
- Sin rate limiting: mitigado porque toda mutacion pasa por RPCs bajo lock e
  idempotentes; agregarlo antes de publicar la app en tiendas.
