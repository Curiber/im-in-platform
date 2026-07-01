# 20. Comunicaciones del evento

## Estado

`implementado — Epic 33, Fase 2.2`

Implementa el item 2.2 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
email a inscritos (confirmados/acreditados) + recordatorio pre-evento.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§F.5 ("envio de email a inscritos ... con plantillas simples, recordatorio
pre-evento").

## Problema

El organizador no tenia forma de escribirles a los inscritos: solo existian
emails transaccionales (verificacion, conexion aceptada). Para operar un evento
real hace falta poder mandar un recordatorio o un aviso a la audiencia.

## Objetivos

- Redactar y enviar un email (asunto + cuerpo) a los inscritos de un evento.
- Elegir audiencia: todos los activos / confirmados (sin acreditar) /
  acreditados.
- Plantilla de recordatorio pre-evento de un clic (prellenado, editable).
- Historial de envios por evento.

## No objetivos

- Programar envios (scheduling/cron): el envio es manual. El recordatorio es una
  plantilla que el organizador revisa y envia, no un job automatico.
- Una fila por destinatario (`communication_deliveries`) ni tracking de
  aperturas: v1 guarda solo `recipient_count`. La entrega es best-effort.
- Editor enriquecido (HTML/markdown): el cuerpo es texto plano.

## Decisiones

### Modelo de datos (outbox durable)

- `event_communications` (event_id, audience, subject, body, `recipients`
  (snapshot jsonb), recipient_count, `accepted_count`, `status`, `attempts`,
  `claimed_at`, `last_error`, idempotency_key, sent_by, created_at). `audience`
  enum `all_active|confirmed|checked_in`; `status` enum
  `pending|sending|sent|failed`. `unique (idempotency_key)`.
- La tabla es un **outbox**: la accion solo registra la comunicacion como
  `pending`; el envio lo hace un procesador que reclama filas de forma atomica.
- **Snapshot de destinatarios**: al encolar se guarda la lista `[{email,name}]`
  en orden estable (por email). El despacho envia contra ese snapshot, no
  recomputa la audiencia; asi altas/bajas o reintentos no cambian el set ni el
  orden, y los lotes (con idempotency-key por indice) quedan alineados entre
  reintentos.
- `accepted_count` cuenta los correos que el proveedor **acepto**, no entrega
  confirmada (eso requeriria webhooks de Resend; futuro). La UI dice "aceptados".
- RLS: miembros de la organizacion leen; owner/admin/event_admin insertan. El
  estado/conteo lo actualiza el procesador via service_role.

### Durabilidad (outbox + claim atomico)

- Un crash entre el registro y el envio NO pierde el correo: la fila queda
  `pending`/`sending` y se retoma.
- `claim_communications(limit, stale, max)` (RPC `security definer`) reclama
  atomicamente con `for update skip locked` las filas `pending`, las `sending`
  vencidas (intento previo muerto) **con intentos < max** y las `failed` con
  intentos < max, marcandolas `sending`. El tope de intentos aplica tambien a
  las `sending` vencidas: sin eso, un job que muere siempre a mitad se
  reclamaria indefinidamente y, tras expirar la TTL de idempotencia del
  proveedor, duplicaria. Al agotar intentos la fila deja de reclamarse.
- Dos disparadores del mismo procesador:
  - **Inmediato**: `after()` de la accion procesa unas pocas (baja latencia).
  - **Respaldo**: cron cada 5 min -> `GET /api/communications/dispatch`
    (protegido por `CRON_SECRET`; cerrado con 503 si no esta configurado)
    procesa lo pendiente/atascado.
- Al terminar, la fila se marca `sent` (todos los lotes ok) o `failed`
  (reintentable). Persistir el estado se reintenta; si aun asi falla, la fila
  queda `sending` y el cron la retoma como stale (sin doble envio por la
  idempotency-key).

### Idempotencia

- El composer genera una `idempotency_key` (uuid) por redaccion. Un doble
  submit/reintento reusa la misma clave: el insert choca contra el `unique` y la
  accion responde `duplicate` sin crear una segunda fila ni reenviar. El boton
  ademas se deshabilita mientras se envia.
- Hacia el proveedor, cada correo lleva una idempotency-key estable por
  `(comunicacion, destinatario)`, de modo que un reintento del envio no duplica
  correos en Resend.

### Audiencias

Mapean a estados de inscripcion **activos** (nunca a pending/cancelled):

| Audiencia | Estados |
| --- | --- |
| `all_active` | registered + checked_in |
| `confirmed` | registered |
| `checked_in` | checked_in |

`recipient_count` es el tamaño de la audiencia al momento del envio.

### Envio

- La server action valida rol, calcula la audiencia y **registra** la
  comunicacion (lectura/insercion bajo RLS con la sesion del usuario, sin
  service_role).
- El email se manda con el **batch API** de Resend (1 request por lote de hasta
  100, en vez de N requests simultaneos), con **reintentos y backoff** por lote
  ante errores transitorios. Cada uno recibe su propio correo; no se comparten
  emails entre asistentes. Sin proveedor configurado, la fila queda `failed`
  (se reintenta si luego se configura).
- **No se reporta "entregado a N" de antemano**: la respuesta dice "en cola,
  enviando a N". `delivered_count` y `status` se persisten cuando termina el
  envio y se muestran en el historial (`entregados X/N` + estado). Si el envio
  falla, no se afirma una entrega que no ocurrio.
- Si la consulta de audiencia falla (RLS/DB), la accion **aborta** con error en
  vez de tratarla como vacia y registrar un envio falso.

### UI

- Pagina `/admin/events/[eventId]/communications` (link desde el detalle del
  evento): redactor (audiencia, asunto, mensaje), boton "Usar plantilla de
  recordatorio" (prellena con nombre/fecha/lugar) e historial.

## Criterios de aceptacion

- El organizador envia un correo a la audiencia elegida; queda en el historial
  con su conteo y autor.
- La plantilla de recordatorio prellena asunto y cuerpo con los datos del
  evento.
- Sin proveedor de email, la accion no rompe: registra el envio y loguea que no
  se entrego.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion `event_communications` + RLS.
- [x] `sendEventBroadcastEmails` (envio individual en lotes, best-effort).
- [x] Action `sendEventCommunication` (audiencia + registro + envio en `after`).
- [x] Pagina con redactor, plantilla de recordatorio e historial; link desde el
      detalle del evento.
- [ ] Prueba manual: enviar a cada audiencia y verificar conteo, historial y
      recepcion (con proveedor configurado).

## Operacion

- En produccion, definir `CRON_SECRET` y habilitar el cron
  (`vercel.json` -> `/api/communications/dispatch`, cada 5 min) para la entrega
  durable. Sin el cron, el envio depende solo del intento inmediato (`after`) y
  una comunicacion que quede `pending`/`failed` no se reintenta sola.

## Riesgos / futuro

- El estado es por comunicacion, no por destinatario (`communication_deliveries`):
  se sabe si todos los lotes salieron, pero no que direccion individual rebota.
  Aceptable para v1; se agrega cuando haya volumen real.
- Programar recordatorios (p.ej. 24h antes) requiere scheduling adicional; queda
  para una iteracion posterior. La plantilla de recordatorio es manual.
