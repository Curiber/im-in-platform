# 31. Identidad de asistente: OTP + reclamo de perfil

## Estado

`implementado — Epic 48, Fase 5.2`

Implementa el item 5.2 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
auth de asistente (Supabase Auth OTP) + reclamo de perfil por email. Cierra la
Fase 5 (habilitadores de app) y abre la Etapa 2 del spec 12 (identidad).

## Problema

La identidad del asistente era un token por link/QR: sin cuenta no hay
multi-evento ("¿donde quedo mi link?"), ni push, ni base para la app nativa.
La brecha #1 del spec 12 (§C.1).

## Objetivos

- El asistente inicia sesion con su email (OTP/magic link de Supabase Auth,
  misma maquinaria del admin) y ve **todas sus inscripciones** en un lugar.
- **Reclamo por email**: su cuenta queda enlazada al perfil persistente y a
  las inscripciones hechas con ese email, pasadas y futuras.
- **Puente de sesion**: entrar al networking de un evento desde "Mis eventos"
  sin buscar el link del correo.

## No objetivos

- Reemplazar el token: el link/QR sigue siendo la via principal (asistentes
  sin cuenta) y la credencial de la API v1. Convivencia, no migracion.
- OTP de 6 digitos en pantalla (la app nativa lo usara via
  `signInWithOtp` + `verifyOtp`); el web usa magic link.
- Notificaciones push (necesitan la app, Fase 6).

## Decisiones

### Reclamo (`claim_attendee_identity`, migracion `20260707120000`)

RPC `security definer` ejecutable por `authenticated`:

- El email sale **del JWT de la sesion** (verificado por el OTP), jamas de un
  parametro: nadie reclama un email ajeno.
- Enlaza `user_id` en `attendee_profiles` y `event_registrations` **solo
  donde `user_id is null`**: si otro usuario ya reclamo (email reasignado),
  no se roba.
- Idempotente; se re-ejecuta en cada carga de `/mi`, asi las inscripciones
  posteriores a la creacion de la cuenta tambien quedan enlazadas.

### Superficies

- **`/mi/login`**: login OTP del asistente (magic link con
  `next=/mi` en el callback existente). Linkea al login admin y viceversa.
- **`/mi`**: "Mis eventos" — sesion requerida (redirect a `/mi/login`),
  reclamo idempotente y grilla de inscripciones (estado, fecha, lugar) con
  entrada directa al networking. Eventos borrados o de organizaciones
  suspendidas no se muestran. Sign-out con `next=/mi/login`.

### Redireccion segura (`safeRedirectPath`)

El `next` de `/auth/sign-out` y `/auth/callback` no se valida por prefijo de
string: `/%5Cevil.com`, `/\evil.com` o `//evil.com` pasan un `startsWith("/")`
pero el parser WHATWG los resuelve a otro origen (open redirect). El helper
resuelve el `next` contra el origen de la peticion, exige que el origen
resultante coincida y devuelve solo la ruta (pathname + query), descartando
cualquier host colado. Testeado con los vectores de evasion.

### Puente de sesion en `verifyRegistrationAccess`

- **Con token**: igual que siempre (link/QR).
- **Sin token**: se acepta la sesion del asistente cuando
  `registration.user_id === auth.uid()`. Un token presente pero invalido
  **nunca** cae a sesion.
- `verifyRegistrationToken` (API v1) queda solo-token: la API no tiene
  cookies.
- Las actions del asistente aceptan token vacio (la auth la resuelve
  `verifyRegistrationAccess`); los links internos propagan `token=` vacio con
  normalidad.
- La credencial QR (`/e/[slug]/registered`) sigue siendo solo-token: el token
  en claro no es recuperable (solo su hash) y el QR lo contiene. "Mis
  eventos" lo indica ("tu credencial sigue en el link de tu email").

## Criterios de aceptacion

- Inscribirse con un email, verificarlo, luego crear cuenta con ese email en
  `/mi/login`: la inscripcion aparece en `/mi` y "Networking" entra al
  directorio sin token en la URL.
- Reclamar no toca perfiles/inscripciones ya reclamados por otro usuario.
- Con sesion pero sin ser dueño de la inscripcion (registrationId ajeno sin
  token), las superficies devuelven 404.
- La API v1 sigue funcionando solo con Bearer token.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion `claim_attendee_identity`.
- [x] `/mi/login` + action OTP; `/mi` con reclamo + grilla; sign-out con
      `next` seguro.
- [x] Puente de sesion en `verifyRegistrationAccess` (+ token opcional en
      schemas de actions).
- [ ] Prueba manual: flujo completo inscripcion -> verificacion -> cuenta ->
      /mi -> networking sin token; intento de acceso a inscripcion ajena.

## Riesgos / futuro

- El acceso por sesion depende del reclamo: una inscripcion no verificada no
  aparece activa (correcto: el email no se probo).
- La app nativa (Fase 6) usara `signInWithOtp` con codigo + el mismo claim, y
  la API v1 sumara el access token de Supabase como esquema de auth.
- Cuando el token migre a cookie (Epic 26), este puente ya cubre la mayor
  parte del camino.
