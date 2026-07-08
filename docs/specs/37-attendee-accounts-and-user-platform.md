# 37. Cuentas de asistente y plataforma de usuario

Estado: `en implementacion`. Decide la evolucion de I'm IN de "software para
operar eventos" a "red donde los asistentes descubren eventos y mantienen
conexiones", con la cuenta del usuario como identidad principal.

Construye sobre el spec 31 (identidad de asistente: OTP + reclamo por email,
`claim_attendee_identity`, puente de sesion al networking) y lo extiende con lo
que el spec 31 declaraba fuera de alcance: login con contrasena, Google y
LinkedIn; superficie `/app` (superset de `/mi`, que queda como redirect); y
registro que exige cuenta. Reusa `claim_attendee_identity` en vez de duplicarlo.

## Contexto y problema

Hoy el asistente no tiene cuenta:

- Se inscribe con email y su unico acceso es un token que viaja en la URL
  (`registrationId` + `token`), arrastrado por todas las superficies de
  networking (`accessQuery`).
- Su perfil (`attendee_profiles`) persiste en la base indexado por email y se
  reutiliza entre eventos, pero el asistente no puede verlo como propio,
  recuperarlo ni editarlo fuera del contexto de un evento.
- Si pierde el link, pierde el acceso. No hay "mis eventos", ni historial, ni
  forma de volver a entrar despues del evento.
- Las superficies de asistente consultan la base con service role (sin RLS),
  porque no existe sesion de asistente.

Decision de producto: I'm IN es tambien una red. El asistente debe poder crear
una cuenta, descubrir eventos, conservar su perfil, sus conexiones y sus
reuniones entre eventos, y volver cuando quiera.

## Decision de identidad

- `auth.users.id` (UUID) es la identidad canonica del usuario.
- Las inscripciones dejan de ser la identidad: pasan a ser una relacion entre
  un usuario y un evento.
- Todo el dominio referencia `user_id`; el email y el token de inscripcion
  dejan de funcionar como identidad.

### Portabilidad (por que Supabase Auth no bloquea una migracion futura)

- La base de Supabase es Postgres estandar. Una migracion futura a AWS RDS u
  otro Postgres gestionado es una migracion Postgres -> Postgres (dump o
  replicacion logica), independiente de esta decision.
- Supabase Auth almacena los usuarios en el mismo Postgres (schema `auth`),
  con hashes de contrasena bcrypt exportables. Cambiar de proveedor de auth
  (Cognito, Auth0, propio) es posible exportando usuarios y conservando el
  `user_id` canonico.
- El proyecto ya depende de Supabase Auth para admins, RLS y Storage; usarlo
  para asistentes no agrega un acoplamiento nuevo.
- Regla de diseno que garantiza la portabilidad: ninguna tabla de dominio
  guarda semantica del proveedor; solo `user_id`. El acceso a Supabase queda
  encapsulado en `src/lib/supabase/*` como hasta ahora.

## Metodos de acceso

- Email y contrasena.
- Continuar con Google.
- Continuar con LinkedIn (OIDC, provider ya semi-integrado en `/login`).
- Magic link / OTP como alternativa sin contrasena y como recuperacion.

Reglas:

- Supabase enlaza automaticamente identidades con el mismo email verificado.
- Si un login social usa un email distinto al de la cuenta, se requiere un
  flujo explicito de vinculacion (identity linking) para evitar cuentas
  duplicadas. Superficie: "Cuentas conectadas" en configuracion.
- Proteccion de contrasenas filtradas (leaked password protection) y rate
  limiting habilitados en Supabase Auth.

## Modelo de datos

- `attendee_profiles.user_id uuid unique references auth.users`: el perfil
  global pasa a pertenecer a la cuenta. El email se conserva para reclamo de
  datos historicos.
- `event_registrations.user_id uuid references auth.users` +
  `unique (event_id, user_id)`: una inscripcion por usuario por evento. Los
  snapshots por evento (`*_snapshot`) se mantienen: capturan el perfil al
  momento de inscribirse.
- Conexiones y reuniones siguen colgando de las inscripciones (contexto del
  evento), pero ahora resolubles a usuarios para la vista global "mis
  conexiones".
- `events.discoverable boolean not null default false`: opt-in del organizador
  para aparecer en "Explorar eventos". No cambia el acceso por link.
- Se elimina el estado `pending_verification` y su maquinaria: la verificacion
  de email ocurre a nivel de cuenta, no por inscripcion.

### Reclamo de datos historicos

Al crear cuenta y verificar el email, se enlazan a la cuenta el
`attendee_profiles` y las `event_registrations` existentes con ese email
(`user_id` retroactivo). Nada se pierde ni se duplica.

## Flujo de registro a eventos (modelo progresivo)

1. `/e/[slug]` sigue siendo publico (landing del evento).
2. "Inscribirme" exige sesion: login o creacion de cuenta inline (con retorno
   al evento despues de autenticarse).
3. El formulario se precarga desde el perfil global; el usuario ajusta y
   confirma (consentimiento y networking opt-in siguen siendo por evento).
4. La inscripcion nace activa (`registered`) o `pending_approval` segun el
   modo del evento. Ya no hay paso de verificacion por email.
5. La credencial QR se emite igual que hoy.
6. En eventos posteriores: sesion + confirmar datos. Sin re-escribir el
   perfil.

## Superficie del usuario: `/app`

Shell propio del asistente autenticado, analogo al `/admin` del organizador.

### Funcionalidades del usuario

Cuenta y perfil global:

- Crear cuenta / iniciar sesion (contrasena, Google, LinkedIn) y recuperar
  acceso.
- Editar el perfil global una sola vez para todos los eventos: foto, cargo,
  empresa, industria, frase, hasta 5 intereses, goals (busco/ofrezco),
  LinkedIn.
- Tarjeta virtual publica (`/p/[slug]`) con visibilidad configurable (se
  conserva tal cual).
- Configuracion: cuentas conectadas, contrasena, privacidad.

Eventos:

- Explorar eventos publicos: solo aparecen eventos publicados cuyo organizador
  activo el flag "listado en I'm IN" (`discoverable`). Por defecto los eventos
  siguen siendo accesibles solo por link, como hoy; listarse es opt-in del
  organizador (respeta eventos privados/corporativos).
- Ver la pagina publica de cualquier evento publicado e inscribirse con el
  formulario precargado desde su perfil.
- Mis eventos: proximos y pasados, cada uno con su credencial QR siempre
  recuperable.
- Cancelar su propia inscripcion desde "Mis eventos": libera el cupo y lo
  retira del directorio (hoy `cancelled` solo lo maneja el organizador).

Networking dentro de un evento (requiere inscripcion activa + networking
habilitado en el evento):

- Disponible desde la inscripcion (no se espera al dia del evento): el valor
  de agendar reuniones y conectar es mayor antes del evento.
- Directorio con busqueda, filtros y sugeridos (matchmaking).
- Ver perfiles de otros asistentes y solicitar conexion; aceptar / rechazar
  solicitudes recibidas.
- Reuniones 1:1 en los slots del evento.

Red persistente (transversal a eventos):

- Mis conexiones: todas las conexiones aceptadas de todos sus eventos. La
  conexion es permanente y muestra el **perfil vivo** de la otra persona
  (actualizado si cambia de empresa o cargo) mas los datos de contacto
  compartidos al aceptar. Los snapshots por evento se conservan solo como
  registro del contexto en que se conocieron.
- Mis reuniones: historial completo.

### Matriz de visibilidad

| Estado del usuario | Que ve |
|---|---|
| Visitante sin cuenta | Landing, paginas publicas de eventos, tarjetas virtuales publicas. |
| Con cuenta, sin inscripcion al evento X | Lo anterior + su `/app` (perfil, sus eventos, sus conexiones). NO ve el directorio ni los asistentes del evento X. |
| Inscrito `pending_approval` | Su credencial en estado "en revision". Sin networking aun. |
| Inscrito `registered` / `checked_in` | Directorio, perfiles, conexiones y reuniones de ese evento. |
| Sin networking opt-in | No aparece en el directorio ni puede verlo (reciproco, como hoy). |

Nunca ve: email/telefono de otro asistente sin conexion aceptada, asistentes
de eventos donde no esta inscrito, ninguna superficie de organizador.

Regla de privacidad clave: tener cuenta NO da acceso a asistentes de otros
eventos. El directorio y los datos privados de un evento siguen restringidos a
inscripciones activas de ese evento con networking habilitado.

## Que se elimina y que se conserva

Se elimina:

- El token de navegacion en URL y `verifyRegistrationAccess` por token: las
  superficies de asistente (`/e/[slug]/directory|connections|meetings|profile`)
  pasan a resolver al usuario por sesion.
- La ruta `/e/[slug]/verify`, el TTL de 24h, el cron de limpieza de
  `pending_verification` y la RPC `activate_verified_registration` (o su
  reduccion al caso `pending_approval`).

Se conserva:

- El QR de credencial y el check-in por token: es un mecanismo de
  acreditacion presencial, no de identidad ni de navegacion. No cambia.
- El modo de aprobacion, cupos, opciones de perfil por evento, comunicaciones,
  reportes: todo el dominio de operacion de eventos queda igual.

Transicion: si hay eventos en vuelo con links antiguos, un shim temporal
redirige el link con token al login y, tras autenticarse con el email de la
inscripcion, aterriza en la misma pagina.

## Seguridad y RLS

- Las superficies de asistente dejan el service role y pasan a la sesion del
  usuario con politicas RLS: un usuario lee el directorio de un evento solo si
  tiene inscripcion activa (`registered`/`checked_in`) en ese evento y el
  evento tiene networking habilitado.
- Perfil global: solo el dueno (`user_id = auth.uid()`) puede editarlo.
- Conexiones/reuniones: solo las partes involucradas.
- Suspension de organizacion y soft-delete de eventos siguen congelando las
  superficies, ahora via RLS.

## Criterios de aceptacion

- Un usuario puede crear cuenta con email+contrasena, Google o LinkedIn, y
  entrar despues por cualquiera de esos metodos sin duplicar cuenta.
- Inscribirse a un evento requiere sesion; la inscripcion queda ligada a
  `user_id` y precargada desde el perfil global.
- Un usuario con cuenta ve en `/app` sus eventos, perfil, conexiones y
  reuniones de todos sus eventos.
- Perder un email o link no implica perder acceso: se recupera iniciando
  sesion.
- Un usuario NO puede ver el directorio de un evento donde no esta inscrito.
- Las inscripciones y perfiles historicos (por email) quedan enlazados a la
  cuenta al verificar ese email.
- El check-in con QR funciona exactamente igual que hoy.
- Ninguna superficie de asistente usa service role para leer datos del propio
  usuario.
- Un evento solo aparece en "Explorar" si su organizador activo el flag
  `discoverable`; los demas siguen siendo accesibles solo por link.
- "Mis conexiones" muestra el perfil vivo de cada conexion aceptada, de
  cualquier evento, junto a los datos compartidos.
- El usuario puede cancelar su inscripcion desde "Mis eventos"; el cupo se
  libera y desaparece del directorio del evento.

## Fases de implementacion

1. **Identidad**: providers en Supabase (password, Google, LinkedIn),
   `user_id` en `attendee_profiles` y `event_registrations`, reclamo por email
   verificado, identity linking.
2. **Registro con sesion**: nuevo flujo de inscripcion, eliminacion de
   `pending_verification`/`verify`/cron, shim de links antiguos.
3. **Shell `/app`**: mis eventos, mi perfil, mis conexiones, mis reuniones,
   configuracion.
4. **RLS**: mover superficies de asistente de service role a sesion + RLS.
5. **Descubrimiento**: explorar eventos publicos.
6. Recien despues: app Expo sobre este mismo modelo de identidad.

## Fuera de alcance

- App movil Expo (depende de este spec, no lo integra).
- Chat entre usuarios, notificaciones push, feed social.
- Multi-tenancy avanzado de organizaciones.

## Relacion con otros specs

- Evoluciona el spec 07 (perfiles persistentes y tarjetas virtuales): el
  perfil deja de ser "persistente por email" y pasa a ser "propiedad de la
  cuenta".
- Sustituye el modelo de acceso de los specs 14/15 (superficies del asistente
  via token).
- El spec 28 (PWA) se re-apunta a `/app` como superficie instalable.
