# 12. Product Evolution: Gap Analysis, Benchmark y Roadmap

## Estado

`draft for product validation`

Auditoria de brecha al 2026-06-12 entre el producto actual de I'm IN, lo que
debe tener una plataforma competitiva de networking para eventos, y los
estandares de mercado que instala un benchmark tipo Brella. No es un plan de
reescritura: es un plan de evolucion incremental sobre el codigo existente.

Regla: el benchmark se usa para entender problemas y expectativas del mercado,
no para copiar diseno, textos, nombres de funcionalidades ni flujos exactos.

---

## A. Diagnostico del producto actual

### Que existe hoy (verificado en codigo)

| Area | Estado |
| --- | --- |
| Organizaciones y roles | Completo: `platform_admin` global, `owner/admin/event_admin` por org, RLS por rol |
| Eventos | Completo: CRUD, publicar/cerrar, soft delete con auditoria, agenda de bloques |
| Pagina publica de evento | Completo: `/e/[slug]` con agenda, responsive |
| Inscripcion publica | Completo: formulario + 5 consentimientos granulares + email de confirmacion (Resend) |
| Credencial QR | Completo: token aleatorio hasheado (SHA-256), payload JSON propio |
| Check-in | Completo: scanner/pegado de QR en admin, idempotente tras commit `313b616` |
| Directorio por evento | Completo: filtros por texto/area/interes, solo perfiles opt-in |
| Matches sugeridos | Basico: top 3 por interseccion de intereses |
| Conexiones 1:1 | Completo: solicitar/aceptar/rechazar + email al aceptar, unicidad reciproca en DB |
| Perfil persistente | Completo: `attendee_profiles` por email citext, snapshots por evento, foto, headline, LinkedIn |
| Tarjeta virtual publica | Completo: `/p/[slug]` con QR, PNG download, visibilidad `private/public_limited/public_full` y opt-in por campo (commit `9ffc173`) |
| Dashboard organizador | Basico: metricas de inscritos/acreditados, export CSV (con escape anti formula injection) |
| Vistas de perfil | Tabla `profile_views` registrada, sin UI de analitica |

### Que esta bien resuelto

- Disciplina spec-driven: 11 specs vivos que documentan decisiones y deuda.
- Seguridad de datos por capas: RLS bien pensada (helpers `security definer`,
  policies por rol), QR hasheado, consentimientos versionados en DB.
- Privacidad reciente: tarjeta publica opt-in con visibilidad por campo.
- Stack moderno y coherente: Next.js 16 + React 19 + Tailwind 4 + Supabase +
  Zod; `lint` y `build` pasan limpios.
- Modelo perfil persistente + snapshot por evento: decision correcta que
  Brella tambien valida (identidad reutilizable entre eventos).

### Que esta incompleto o es deuda tecnica

Documentado en [11-security-privacy-and-data-integrity-hardening.md](11-security-privacy-and-data-integrity-hardening.md);
pendientes los epics 23, 24, 25, 27 y 28:

1. Sin verificacion de email: cualquiera se inscribe con email ajeno y recibe
   la credencial en pantalla (critico antes de eventos reales).
2. RLS no respalda roles de soft delete/restore (un `event_admin` puede
   borrar via PostgREST directo).
3. Race condition de capacidad en inscripcion.
4. Creacion de organizacion no atomica.
5. Cero tests automatizados.
6. Token de asistente viaja en query strings (sin sesion de asistente).
7. Sin gestion de miembros de organizacion ni layout admin compartido
   (epics 29-30 del spec 10).
8. Sin rate limiting en endpoints publicos.

### Mantener / Refactorizar / Eliminar

- Mantener: modelo de datos actual completo, RLS, brand system (spec 08),
  flujo QR/check-in, directorio, tarjeta virtual.
- Refactorizar: logica de negocio atrapada en server actions (bloquea
  mobile), acceso de asistente por token-en-URL (migrar a sesion), headers
  admin duplicados (layout compartido).
- Eliminar/simplificar: nada estructural. `findAuthUserByEmail` paginado es
  el unico codigo a reemplazar de raiz.

### Preparacion para mobile + admin web

- Supabase es mobile-friendly (supabase-js corre en React Native/Expo) y la
  RLS ya protege lecturas. Eso juega a favor.
- El bloqueo real: toda la logica de escritura vive en **server actions de
  Next**, que solo el frontend web puede invocar. Una app mobile no puede
  consumirlas. Se necesita una capa API (route handlers `/api/v1` o RPCs de
  Postgres) antes de cualquier app nativa.
- Segundo bloqueo: los asistentes no tienen cuenta (modelo token por
  registro). Sin identidad autenticada no hay app mobile con sesion, push,
  multi-evento ni comunidad post-evento.

---

## B. Que aprender del benchmark sin copiar

Lo que un lider tipo Brella instala como expectativa de mercado:

1. **El matchmaking es por intencion, no solo por afinidad.** No basta
   "compartimos 3 intereses": el match fuerte cruza *que busca* uno con *que
   ofrece* el otro (vender/comprar, contratar/buscar trabajo, invertir/
   levantar capital). Aprendizaje: agregar objetivos de networking al perfil
   y usarlos en el score. Sin copiar: su narrativa "AI-powered" ni sus modos
   de onboarding.
2. **La reunion 1:1 agendada es la unidad de valor, no la conexion.** El
   intercambio de contacto es el piso; la reunion con horario y lugar es lo
   que el organizador puede medir y vender. Aprendizaje: slots de
   disponibilidad + puntos de encuentro + estado de reunion.
3. **El organizador controla el networking.** Configura categorias,
   intenciones, reglas de acceso y ve oferta/demanda en tiempo real.
   Aprendizaje: las categorias de intereses/objetivos deben ser configurables
   por evento, no hardcodeadas en `profile-options.ts`.
4. **El sponsor es un usuario de primera clase** con perfil, leads y ROI
   medible. Aprendizaje: el modelo de datos debe prever sponsors; la UI puede
   esperar. Sin copiar: booths virtuales ni su modelo de prospecting.
5. **Mobile y web en paridad**, app nativa para el asistente durante el
   evento, web para todo lo demas. Aprendizaje: el asistente es mobile-first;
   el admin es web-first.
6. **Analitica como argumento de venta**: engagement y networking, no solo
   asistencia. Aprendizaje: `profile_views`, conexiones y reuniones ya
   generan los datos; falta la capa de visualizacion y reporte.
7. **Branding por evento** (colores, logo) como feature tier alto.

Riesgo de copiar a evitar: paridad de features con un enterprise SaaS con
anos de desarrollo. I'm IN no compite por checklist: compite por simplicidad,
velocidad de implementacion y foco en eventos medianos/LATAM (seccion M).

---

## C. Brechas principales

Ordenadas por impacto en competitividad:

| # | Brecha | Hoy | Severidad |
| --- | --- | --- | --- |
| 1 | Identidad de asistente (login/cuenta) | Token por link, sin sesion | Estructural: bloquea mobile, push, multi-evento, comunidad |
| 2 | Reuniones 1:1 con horario y lugar | Solo intercambio de contacto | Alta: es la unidad de valor del mercado |
| 3 | Objetivos de networking + matchmaking real | Interseccion de intereses | Alta: el match por intencion es el estandar |
| 4 | Notificaciones (in-app, push, email digest) | 2 emails transaccionales | Alta: sin re-engagement no hay networking activo |
| 5 | Chat/mensajeria post-conexion | No existe | Media: el email al aceptar es un sustituto debil |
| 6 | Categorias configurables por evento | Listas hardcodeadas | Media: cada vertical necesita sus opciones |
| 7 | Analitica y reportes para organizador | Dashboard basico + CSV | Media: los datos existen, falta la capa |
| 8 | Sponsors | No existe | Media: clave para monetizar, no para validar |
| 9 | Branding por evento | Brand I'm IN unico | Baja-media |
| 10 | API consumible por mobile | Server actions only | Estructural (habilitador de 1) |
| 11 | Seguridad pendiente (spec 11) | Epics 23-25, 27-28 abiertos | Bloqueante para eventos reales |

---

## D. Recomendaciones de adaptacion

### Cambios rapidos de alto impacto (semanas, sin nueva arquitectura)

1. Cerrar spec 11: verificacion de email (Epic 23), RLS de roles (24),
   capacidad atomica (25), tests base (27), org atomica (28).
2. Layout admin compartido + gestion de miembros (epics 29-30, spec 10).
3. Mover `interests`/`industries` a tablas configurables por evento con
   fallback a defaults de plataforma.
4. Agregar `networking_goals` al perfil y al registro (busco/ofrezco).
5. Subir el matchmaking de "top 3 por intereses" a score compuesto
   (seccion 11 de este spec) — es un cambio de query, no de arquitectura.
6. Dashboard organizador: agregar conexiones solicitadas/aceptadas, perfiles
   mas vistos y tasa de opt-in networking (los datos ya estan en DB).

### Mejoras de UX/UI

Seccion I.

### Mejoras de arquitectura

Seccion J. Resumen: extraer logica de server actions a servicios, crear capa
API v1, migrar asistentes a Supabase Auth (OTP por email), jobs para emails.

### Nuevas funcionalidades criticas (construir)

- Cuenta de asistente con OTP/magic link + reclamo de perfil existente por
  email verificado (la evolucion ya prevista en spec 07).
- Reuniones 1:1: disponibilidad, solicitud con propuesta de horario, puntos
  de encuentro definidos por el organizador, agenda personal del asistente.
- Notificaciones: centro in-app simple (tabla + realtime) y push en mobile.

### Pueden esperar (V2)

- Chat realtime (empezar con mensajes asincronos en la solicitud/conexion).
- Sponsors con perfil y captura de leads.
- Branding por evento (logo + color primario primero).
- Reportes exportables avanzados y comparativas entre eventos.

### No construir todavia

- Matchmaking con IA/embeddings (sin volumen de datos es marketing, no
  producto).
- Booths virtuales, streaming, ticketing/pagos, marketplace de integraciones,
  apps de sponsor dedicadas, white-label completo multi-tenant.

---

## E. App mobile para usuarios

### Decision recomendada

**No transformar el web actual en app; construir una app Expo/React Native
nueva y delgada contra el backend existente, en Etapa 2.** Razones:

- El stack es TypeScript + React: Expo reutiliza lenguaje, modelos, cliente
  Supabase y design tokens. Flutter obligaria a duplicar todo en Dart.
- Mientras tanto, el web responsive actual ya cubre el evento en vivo
  (QR, directorio, conexiones funcionan bien en mobile). Convertirlo en PWA
  instalable (manifest + service worker) es el puente de bajo costo en
  Etapa 1.

### Prerequisitos tecnicos (bloqueantes)

1. Auth de asistente (Supabase Auth OTP) — sin esto no hay sesion mobile.
2. Capa API: RPCs de Postgres con RLS o route handlers `/api/v1` para todas
   las mutaciones que hoy son server actions (inscripcion, conexion, perfil,
   reunion).
3. Push: Expo Notifications + tabla `notification_devices`.

### Que se reutiliza y que se redisena

- Sirven como base conceptual: directorio con filtros, detalle de perfil,
  tarjeta con QR, flujo de conexion, agenda del evento.
- Se redisenan mobile-first: navegacion (tab bar: Hoy / Personas / Agenda /
  Conexiones / Perfil), onboarding (3 pasos al entrar al primer evento),
  check-in (QR fullscreen con brillo alto).

### Alcance funcional de la app (en orden)

MVP mobile: login OTP, seleccion/ingreso a evento por codigo o link, perfil
profesional + intereses + objetivos, recomendados, busqueda, solicitud de
conexion y de reunion, agenda personal (bloques del evento + reuniones), QR
de acceso, notificaciones push, contactos guardados.

V2 mobile: chat, feedback post-reunion, mapa/puntos de encuentro, modo
offline del QR.

Quedan solo en web: todo el admin, exports, configuracion de organizacion.

---

## F. Administrador web

El admin existe y la base es correcta (eventos, check-in, dashboard, export,
organizaciones). Evolucion propuesta, en orden:

1. **Estructura**: layout compartido con navegacion persistente y logout
   (Epic 30), breadcrumbs por evento.
2. **Equipo**: gestion de miembros y roles (Epic 29).
3. **Configuracion de networking por evento**: categorias de intereses,
   objetivos disponibles, networking on/off (ya existe), aprobacion manual de
   inscripciones para eventos `closed`.
4. **Reuniones**: definicion de puntos de encuentro (mesas, salas), vista de
   reuniones solicitadas/aceptadas/rechazadas del evento, capacidad por
   punto.
5. **Comunicaciones**: envio de email a inscritos (confirmados, acreditados,
   con plantillas simples), recordatorio pre-evento.
6. **Metricas en tiempo real**: dashboard con Supabase Realtime o polling
   suave (acreditados, conexiones, reuniones del dia).
7. **Reportes**: ademas del CSV, resumen post-evento descargable.
8. **Branding por evento**: logo + color primario aplicados a `/e/[slug]`,
   emails y tarjetas (V2).

---

## G. Administrador mobile o responsive

**No construir app admin nativa ahora.** Evaluacion:

- El caso de uso real durante el evento es acotado: acreditar, ver avance,
  resolver incidencias puntuales. El check-in actual ya funciona en mobile
  (camara + pegado de payload).
- Recomendacion: **"modo evento en vivo" responsive** dentro del admin web
  (V1): pantalla unica optimizada para telefono con check-in, contador de
  acreditados en vivo, reuniones del dia y un boton de aviso rapido a
  asistentes. Es CSS + una ruta, no una app.
- App admin nativa: V2+, solo si los organizadores la piden con datos de uso.

| Capacidad | Donde | Cuando |
| --- | --- | --- |
| Check-in QR | Admin web responsive (ya existe) | Hoy |
| Metricas rapidas | Modo evento en vivo | V1 |
| Reuniones del dia | Modo evento en vivo | V1 |
| Avisos a asistentes | Modo evento en vivo | V1 |
| Incidencias / cambios de agenda | Admin web normal | Hoy |
| App nativa admin | — | V2 si hay demanda |

---

## H. MVP de evolucion

### Clasificacion del producto actual

- **Mantener**: modelo de datos, RLS, QR/check-in, directorio, tarjeta
  virtual con visibilidad, consentimientos, brand system, specs.
- **Mejorar**: matchmaking (score compuesto), dashboard (metricas de
  networking), registro (objetivos de networking), pagina publica de evento.
- **Refactorizar**: server actions → servicios + API, token-en-URL → sesion
  de asistente, headers admin → layout, listas hardcodeadas → configurables.
- **Construir**: auth de asistente, reuniones 1:1, notificaciones,
  comunicaciones del organizador, gestion de miembros.
- **Postergar**: chat realtime, sponsors, branding por evento, app mobile
  (hasta cerrar prerequisitos), reportes avanzados.
- **Eliminar**: nada; reemplazar `findAuthUserByEmail` paginado.

### MVP demostrable en eventos reales (objetivo Etapa 1)

Criterio: un evento de 100-300 personas opera completo y seguro, y el demo
muestra networking con intencion, no solo un listado.

1. Spec 11 cerrado (seguridad y verificacion de email).
2. Epics 29-30 (equipo + layout admin).
3. Objetivos de networking en perfil/registro + matchmaking score v1.
4. Reuniones 1:1 version simple: proponer franja + punto de encuentro,
   aceptar/rechazar, agenda personal del asistente.
5. Dashboard con metricas de networking.
6. PWA instalable del flujo asistente.

---

## I. UX/UI recomendado

El brand system (spec 08) es solido y distinto del benchmark (paleta navy/
cyan propia, tono humano en es-CL). Mantenerlo. Mejoras:

- **Navegacion asistente**: hoy las vistas de evento (directorio, conexiones,
  perfil) navegan por links con token. Unificar en un shell con tabs
  persistentes (Personas / Agenda / Conexiones / Mi perfil) y sesion, para
  que el asistente nunca "pierda" su acceso.
- **Onboarding**: tras verificar email, 3 pasos maximo: quien eres (prellenado
  si hay perfil), que buscas (objetivos), que te interesa (chips). Mostrar de
  inmediato 3 personas recomendadas como recompensa.
- **Experiencia de match**: explicar el porque ("3 intereses en comun · tu
  buscas X, el ofrece X"). Ya se muestran intereses compartidos; agregar la
  linea de objetivos al implementarlos. CTA directo: conectar o proponer
  reunion.
- **Agenda**: vista unica del dia que mezcla bloques del evento y reuniones
  propias, con estado claro (pendiente/confirmada) y lugar.
- **Estados vacios**: cada vista clave con mensaje + accion (directorio sin
  matches → "ajusta tus intereses"; conexiones vacias → "explora el
  directorio"). Hoy el directorio ya lo hace; replicar en conexiones y
  agenda.
- **Microcopy**: mantener tono directo es-CL; en privacidad, decir siempre
  que se comparte y cuando (el formulario de registro ya lo hace bien — es
  un diferenciador, conservarlo).
- **Admin**: jerarquia tablas-primero, acciones destructivas en zona de
  peligro (ya existe), estados de formulario inline en vez de paginas de
  error (Epic 27).
- **Diferenciacion visual**: humano y calido (fotos grandes, iniciales con
  color, lenguaje de primera persona) frente al look corporativo tipico del
  sector. No adoptar dashboards densos ni dark-enterprise.

---

## J. Arquitectura tecnica incremental

### Lo que esta bien

Next.js 16 App Router + Supabase (Auth/DB/Storage) + Resend + Zod + RLS por
rol. Para el tamano actual, correcto y barato de operar. Vercel + Supabase
escalan el MVP sin DevOps.

### Lo que limita el crecimiento

1. **Logica en server actions**: invocables solo desde el web Next. Bloquea
   mobile y cualquier integracion.
2. **Asistentes sin identidad**: el token-por-link impide sesion, push,
   multi-evento y comunidad.
3. **Uso amplio de service role**: muchas rutas publicas usan
   `createSupabaseAdminClient`; cada una es superficie de error humano. Con
   auth de asistente, gran parte puede volver a RLS.
4. **Sin jobs**: emails se envian inline en el request; un blast de
   comunicaciones lo haria insostenible.
5. **Sin observabilidad ni rate limiting**: errores se silencian con catch
   vacios; endpoints publicos sin proteccion de abuso.

### Plan incremental (sin reescritura)

1. **Servicios**: extraer logica de actions a `src/lib/services/*` puros
   (registracion, conexiones, reuniones). Las actions quedan como adaptadores
   web. Costo bajo, habilita tests y API.
2. **API v1**: route handlers `/api/v1/*` que llaman los mismos servicios,
   autenticados con JWT de Supabase. Alternativa valida: RPCs de Postgres
   `security definer` consumidas directo por supabase-js (menos codigo, mas
   SQL). Decidir por dominio: lecturas via PostgREST+RLS, mutaciones
   complejas via RPC.
3. **Auth de asistente**: Supabase Auth con OTP por email. Al verificar,
   `attendee_profiles.user_id` se enlaza (columna ya existe) y los tokens QR
   quedan solo para acreditacion, no como credencial de navegacion.
4. **Notificaciones**: tabla `notifications` + Supabase Realtime para in-app;
   Expo push en mobile; digest por email via job.
5. **Jobs**: Supabase Edge Functions + `pg_cron` (o Vercel Cron) para
   emails masivos, recordatorios y limpieza de registros no verificados.
6. **Chat (V2)**: tabla `messages` + Realtime channels por conexion aceptada.
   No adoptar servicio externo hasta validar uso.
7. **Metricas**: tabla `analytics_events` append-only + vistas materializadas
   para dashboard; evitar herramientas externas hasta Etapa 3.
8. **Operacion**: Sentry (errores), rate limiting en proxy para rutas
   publicas (Upstash o contador en Postgres), logs estructurados en
   servicios.

---

## K. Modelo de datos sugerido

### Tablas actuales que se mantienen tal cual

`organizations`, `organization_users`, `events`, `event_agenda_items`,
`event_registrations`, `consents`, `connection_requests`,
`attendee_profiles`, `profile_views`.

### Cambios a tablas existentes

- `event_registrations.status`: agregar `pending_verification` (Epic 23).
- `attendee_profiles.user_id`: pasa de opcional a ancla de identidad cuando
  exista auth de asistente; unique parcial `where user_id is not null`.
- `events`: agregar `brand_logo_url`, `brand_primary_color` (V2), y
  `registration_mode` (`open/approval`) para eventos cerrados.

### Tablas nuevas por etapa

Etapa 1 (networking con intencion + reuniones):

- `networking_goals` (catalogo: id, slug, label, kind `seek/offer`).
- `profile_networking_goals` (profile_id, goal_id) y snapshot
  `registration_networking_goals` por evento.
- `event_interest_options` y `event_goal_options`: catalogo configurable por
  evento con fallback a defaults de plataforma.
- `meeting_locations` (event_id, name, capacity, notes).
- `meetings` (event_id, requester_registration_id, receiver_registration_id,
  status `pending/accepted/declined/cancelled/completed`, starts_at, ends_at,
  location_id, message, responded_at). Reusa el patron de
  `connection_requests` (unicidad, RLS, not_self).
- `availability_slots` (registration_id, starts_at, ends_at) — version
  simple: franjas que el asistente marca como disponible.

Etapa 2 (engagement):

- `notifications` (recipient_profile_id, type, payload jsonb, read_at).
- `notification_devices` (profile_id, expo_token, platform).
- `communications` (event_id, audience, subject, body, sent_at, sent_by) +
  `communication_deliveries`.
- `messages` (connection_request_id o meeting_id, sender_registration_id,
  body, created_at) — chat asincrono primero.

Etapa 3 (monetizacion y analitica):

- `sponsors` (event_id, name, tier, logo_url, description, website_url).
- `sponsor_members` (sponsor_id, profile_id, role).
- `sponsor_leads` (sponsor_id, registration_id, source `scan/meeting/visit`,
  consented boolean, created_at) — siempre con consentimiento explicito.
- `analytics_events` (event_id, registration_id null, kind, payload jsonb,
  created_at) append-only.
- `meeting_feedback` (meeting_id, registration_id, rating, comment).

### Notas de escalabilidad

- Los `count exact` del dashboard escalan mal sobre miles de filas: pasar a
  vistas materializadas o contadores cuando haya eventos grandes.
- `findAuthUserByEmail` paginado: reemplazar por lookup directo (Epic 28).
- Indices existentes estan bien orientados; agregar indice por
  `(event_id, starts_at)` en `meetings` y por `recipient + read_at` en
  `notifications` al crearlas.
- No hace falta `admin_users/roles/permissions` nuevos: `organization_users`
  + `platform_role` ya cubren el modelo hasta que exista un rol mas fino
  (p. ej. `staff` solo-check-in, que es un valor mas del enum).

---

## L. Roadmap por etapas

### Etapa 1 — Adaptacion del producto actual (4-6 semanas de dev efectivo)

Objetivo: version segura, presentable y con networking de intencion.

- Funcionalidades: spec 11 completo; epics 29-30; objetivos de networking;
  matchmaking score v1; reuniones 1:1 simples + puntos de encuentro; agenda
  personal; dashboard de networking; PWA; catalogo configurable por evento.
- Dependencias: ninguna externa nueva (todo sobre Supabase/Next actuales).
- Riesgos: friccion de verificacion de email en registro presencial
  (mitigar con OTP rapido y reenvio); scope creep en reuniones (mantener
  version franja+lugar, sin calendario complejo).
- Impacto: producto operable en eventos reales y demo competitivo.

### Etapa 2 — App mobile + admin solido (8-12 semanas)

Objetivo: operar eventos reales con asistentes en mobile.

- Funcionalidades: auth de asistente OTP + reclamo de perfil; capa API v1 /
  RPCs; app Expo (alcance seccion E); push; centro de notificaciones;
  comunicaciones del organizador; modo evento en vivo responsive; chat
  asincrono en conexiones.
- Dependencias: Expo + EAS (builds/stores), Supabase Auth OTP, decision
  API REST vs RPC, cuentas de stores.
- Riesgos: migracion del acceso por token a sesion sin romper links ya
  enviados (mantener compatibilidad un ciclo); costo de mantener web + app
  (mitigado por monorepo TS y servicios compartidos); revision de stores.
- Impacto: paridad con la expectativa minima del mercado (asistente mobile,
  organizador web).

### Etapa 3 — Matchmaking avanzado, sponsors y analitica (continuo)

Objetivo: competir como SaaS serio.

- Funcionalidades: score de match con feedback loop (aceptaciones/rechazos y
  `meeting_feedback` recalibran pesos); sponsors con perfil y leads
  consentidos; analitica comparativa entre eventos; reportes post-evento;
  branding por evento; chat realtime; comunidad entre eventos (directorio
  persistente opt-in por organizacion).
- Dependencias: volumen de datos real de Etapas 1-2; modelo comercial
  definido (pricing por evento vs suscripcion).
- Riesgos: construir features de sponsor sin sponsors reales (validar con 2-3
  organizadores antes); deriva hacia clon enterprise.
- Impacto: monetizacion y retencion de organizadores.

---

## M. Riesgos

1. **Operar eventos reales sin cerrar spec 11**: el riesgo mayor es
   reputacional (suplantacion, sobreventa de cupos). Etapa 1 no es opcional.
2. **Trampa de paridad con el benchmark**: perseguir el checklist de un
   enterprise SaaS dispersa al equipo. La defensa es el posicionamiento:
   eventos medianos y comunidades LATAM, implementacion en horas (no
   semanas), asistente sin friccion, espanol nativo, precio accesible,
   networking que sobrevive al evento. Brella no compite bien en ninguno de
   esos ejes.
3. **Migracion de identidad**: pasar de token-links a cuentas puede romper
   flujos en produccion; requiere periodo de compatibilidad y comunicacion.
4. **Capacidad de equipo**: el roadmap asume foco; cada etapa debe cerrarse
   antes de abrir la siguiente.
5. **Deliverability de email en LATAM**: OTP y confirmaciones dependen de
   Resend; configurar dominio propio (SPF/DKIM) antes de eventos grandes.
6. **Sin tests, cada refactor es ruleta**: el Epic 27 (Vitest) debe entrar
   antes de extraer servicios.

---

## N. Proximos pasos concretos de desarrollo

En orden de ejecucion:

1. Cerrar spec 11: Epic 23 (verificacion email), 24 (RLS roles), 25
   (capacidad/check-in), 27 (env + Vitest), 28 (org atomica).
2. Epics 29-30 del spec 10: layout admin + gestion de miembros.
3. Migracion + spec corto: `networking_goals`, `event_interest_options`,
   `event_goal_options`; integrarlos a registro, perfil y directorio.
4. Matchmaking v1: funcion de score (seccion D.5) en el directorio, con
   explicacion del match en UI.
5. Spec + implementacion de reuniones 1:1 simples (`meetings`,
   `meeting_locations`, agenda personal).
6. Dashboard de networking (conexiones, reuniones, perfiles vistos) +
   modo evento en vivo responsive.
7. PWA: manifest + service worker para el flujo de asistente.
8. Refactor a servicios (`src/lib/services/*`) con tests — prerequisito de
   API v1.
9. Spec de identidad de asistente (Supabase Auth OTP + reclamo de perfil) —
   abre Etapa 2.
10. Kickoff app Expo contra API v1.

Cada item nuevo (3, 5, 9) debe entrar con su propio spec en `docs/specs/`
siguiendo el ciclo del repo: spec → tareas → implementacion → verificacion.
