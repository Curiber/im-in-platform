# 32. Notificaciones de networking por email

## Estado

`implementado — Epic 49`

Primer tramo de la brecha #4 del
[12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
(§C.4, "sin re-engagement no hay networking activo") y cierre del riesgo
anotado en el [27-attendee-meetings.md](27-attendee-meetings.md): una
propuesta de reunion podia pasar inadvertida si el asistente no reabria la web.

## Problema

Solo existia un email de networking (conexion aceptada). Una solicitud de
conexion o una propuesta de reunion no avisaban a nadie: el receptor dependia
del badge de la web, que solo ve si vuelve a entrar.

## Objetivos

- Avisar por email los tres momentos que requieren accion o confirman valor:
  1. **Solicitud de conexion recibida** (al receptor).
  2. **Reunion propuesta** (al receptor, con horario/lugar/mensaje).
  3. **Reunion aceptada** (al proponente, con horario/lugar).
- El aviso lleva a **"Mis eventos" (`/mi`)**: el destinatario entra con su
  email (OTP, spec 31) y responde desde ahi.

## No objetivos

- Notificar rechazos/cancelaciones (ruido sin accion pendiente).
- Digest, push e in-app (necesitan la app / mas volumen; spec 12 §C.4).
- Preferencias de notificacion por asistente (cuando haya demanda real).

## Decisiones

- **Landing `/mi`, nunca el token**: el token del destinatario no es
  recuperable (solo se guarda su hash) y no debe viajar en mas correos.
  Gracias al spec 31, `/mi` autentica por OTP y entra al networking sin token.
- **Los triggers viven en los servicios** (`connection-service.
  createConnectionRequest`, `meeting-service.proposeMeeting` /
  `respondMeeting`), no en las actions: la web y la API v1 notifican igual sin
  duplicar nada.
- **Best-effort estricto**: cada envio va en try/catch tras confirmar la
  escritura; un fallo del proveedor jamas afecta la solicitud/reunion (mismo
  criterio que el email de conexion aceptada).
- Senders en `lib/email.ts` con el patron existente (Resend, texto plano,
  `{ sent, error }`); el horario usa `formatDateTimeRange` (zona canonica de
  la app, spec del Epic 39).

## Criterios de aceptacion

- Crear una solicitud de conexion envia email al receptor con el nombre del
  solicitante y el link a `/mi`.
- Proponer una reunion envia email al receptor con horario, lugar ("Por
  definir" si no hay) y mensaje; aceptarla envia email al proponente.
- Rechazar o cancelar no envia nada.
- Si Resend falla o no esta configurado, las acciones funcionan igual.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Senders `sendConnectionRequestEmail`, `sendMeetingProposedEmail`,
      `sendMeetingAcceptedEmail`.
- [x] Triggers en connection-service y meeting-service (best-effort).
- [ ] Prueba manual con Resend configurado: los 3 correos llegan con el
      contenido correcto.

## Riesgos / futuro

- Volumen: en un evento activo esto multiplica correos transaccionales;
  Resend los tolera, pero si molesta se agrupan en digest (spec 12 §C.4).
- Los senders comparten mucho boilerplate; a la proxima plantilla conviene
  extraer un helper comun de envio.
