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

### Modelo de datos

- `event_communications` (event_id, audience, subject, body, recipient_count,
  delivered_count, idempotency_key, sent_by, created_at). `audience` enum
  `all_active|confirmed|checked_in`. `unique (idempotency_key)`.
- RLS: miembros de la organizacion leen; owner/admin/event_admin insertan. El
  conteo de entregados lo actualiza el envio en background via service_role.

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
- El email se manda **individualmente a cada destinatario** (cada uno recibe su
  propio correo; no se comparten emails entre asistentes), en lotes de 20, y
  **despues de responder** (`after`) para no bloquear ni depender del tamaño de
  la lista. Best-effort: un fallo individual no aborta el resto; sin proveedor
  configurado, la comunicacion se registra pero no se entrega (mismo patron del
  resto del proyecto).
- **No se reporta "entregado a N" de antemano**: la respuesta dice "en cola,
  enviando a N". `delivered_count` se persiste cuando termina el envio y se
  muestra en el historial (`entregados X/N`). Si el envio falla o no hay
  proveedor, queda en 0, sin afirmar una entrega que no ocurrio.
- Si la consulta de destinatarios falla (RLS/DB), la accion **aborta** con error
  en vez de tratarlo como audiencia vacia y registrar un envio falso.

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

## Riesgos / futuro

- Sin `communication_deliveries` no hay reintentos ni estado por destinatario:
  si el proveedor falla a mitad, no se sabe a quien no llego. Aceptable para v1;
  se agrega cuando haya volumen real.
- Programar recordatorios (p.ej. 24h antes) requiere scheduling (pg_cron /
  Scheduled Functions); queda para una iteracion posterior.
