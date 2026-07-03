# 34. Programacion de comunicaciones

## Estado

`implementado — Epic 51`

Cierra el pendiente del [20-event-communications.md](20-event-communications.md)
("programar recordatorios requiere scheduling adicional"): el recordatorio
pre-evento ya no depende de que el organizador este frente al computador a la
hora correcta.

## Problema

El envio era solo manual. Un recordatorio "manana a las 9:00" obligaba al
organizador a entrar a esa hora exacta; el caso de uso real es dejarlo
programado al configurar el evento.

## Objetivos

- Programar una comunicacion para una fecha/hora futura (opcional; vacio =
  enviar ahora, igual que antes).
- Poder **cancelarla** mientras no venza.
- **Audiencia fresca al enviar**: los inscritos de ultima hora tambien
  reciben el recordatorio.

## No objetivos

- Recurrencia o multiples recordatorios automaticos por evento.
- Editar una programada (se cancela y se crea otra).
- Precision de minutos: la latencia de entrega es <= el periodo del cron
  (5 min), suficiente para un recordatorio.

## Decisiones

El outbox del spec 20 ya tiene lo dificil (claim atomico, reintentos,
idempotencia, cron): programar es **una columna `scheduled_at` que el claim
ignora hasta que vence** (migracion `20260708120000`).

- `enqueue_event_communication` acepta `p_scheduled_at` (null = inmediato).
  Una fecha pasada se clampa a inmediato (defensa; la action ya la rechaza con
  mensaje). Un envio inmediato sin audiencia sigue siendo `empty`; uno
  programado con audiencia vacia SI se acepta (puede crecer antes de vencer).
- `claim_communications` agrega `scheduled_at is null or <= now()` y, para una
  programada en su **primer** claim (`attempts = 1`), **recomputa el snapshot
  de destinatarios** (helper compartido `communication_audience_snapshot`).
  Desde ese primer claim el snapshot queda fijo: los reintentos conservan
  set/orden y las idempotency-keys por indice siguen alineadas (propiedad del
  spec 20 intacta).
- `cancel_scheduled_communication` (security definer, valida rol de manager):
  solo `pending` con `scheduled_at` futuro pasa a `cancelled` (valor nuevo del
  enum). Una en vuelo o vencida responde `not_found` — el claim toma FOR
  UPDATE, asi que la carrera cancelar-vs-despachar se resuelve limpiamente.
- La action **omite el despacho inmediato** (`after`) al programar: no hay
  nada que procesar; el cron la toma al vencer. Consecuencia operativa: el
  scheduling REQUIERE el cron configurado (`CRON_SECRET` + vercel.json, que ya
  existe cada 5 min).
- La hora se captura como pared local y se interpreta en la zona canonica
  (`parseDateTimeLocal`, Epic 39), rechazando horas inexistentes por DST.
- UI: campo "Programar envio (opcional)" en el redactor (el boton cambia a
  "Programar comunicacion"); en el historial, chip "Programada: {fecha}" +
  boton "Cancelar envio" mientras no venza.

## Criterios de aceptacion

- Programar deja la fila `pending` con `scheduled_at`; el cron no la toma
  hasta vencer y al vencer se envia con la audiencia recalculada.
- Cancelar antes del vencimiento la deja `cancelled` y no se envia; intentar
  cancelar una vencida/en vuelo muestra el aviso correspondiente.
- El envio inmediato se comporta exactamente igual que antes.
- Fechas pasadas o inexistentes (DST) se rechazan con mensaje claro.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: `scheduled_at`, enum `cancelled`, helper de snapshot,
      enqueue/claim/cancel.
- [x] Action con `parseDateTimeLocal` + accion de cancelar.
- [x] UI: campo de programacion + chip y cancelar en el historial.
- [ ] Prueba manual: programar a 10 min, ver el chip, cancelar una; dejar otra
      y verificar que el cron la envia con un inscrito agregado despues de
      programar.

## Riesgos / futuro

- Si el cron no esta configurado, una programada queda `pending` para siempre
  (documentado en Operacion del spec 20; el historial la muestra
  "Programada", lo que hace visible el sintoma).
- El conteo mostrado al programar es el de ese momento; el real se fija al
  enviar (la UI lo explica).
