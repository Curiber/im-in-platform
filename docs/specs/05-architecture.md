# 05. Architecture

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS.
- Backend: Server Actions y Route Handlers de Next.js.
- Auth: Supabase Auth.
- Database: Supabase Postgres.
- Storage: Supabase Storage para logos y fotos.
- Email: Resend u otro proveedor transaccional.
- Hosting: Vercel.
- Repo: GitHub.

## Ambientes

- Local: `.env.local`, Supabase local o proyecto dev.
- Preview: Vercel Preview conectado a branch/PR.
- Production: Vercel Production conectado a `main`.

## Rutas esperadas

### Publicas

- `/e/[slug]`: pagina publica de evento.
- `/e/[slug]/register`: inscripcion.
- `/auth/callback`: callback OAuth/Supabase.

### Asistente autenticado

- `/app/events`: eventos donde estoy inscrito.
- `/app/events/[eventId]`: home del evento.
- `/app/events/[eventId]/directory`: directorio.
- `/app/events/[eventId]/connections`: solicitudes.
- `/app/profile`: perfil base.

### Admin

- `/admin/events`: lista de eventos.
- `/admin/events/new`: crear evento.
- `/admin/events/[eventId]`: administrar evento.
- `/admin/events/[eventId]/registrations`: inscritos.
- `/admin/events/[eventId]/check-in`: acreditacion QR.
- `/admin/events/[eventId]/dashboard`: metricas.

## Seguridad

- No exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- En Next.js, solo variables `NEXT_PUBLIC_*` pueden llegar al browser.
- RLS activa en tablas expuestas.
- Revalidar permisos en Server Actions y Route Handlers.
- No depender solo de middleware/proxy para autorizacion.
- Generar QR con token aleatorio y guardar solo hash del token.

## Estrategia de QR

- `qr_token`: valor aleatorio mostrado al usuario dentro del QR.
- `qr_token_hash`: hash persistido en base de datos.
- El escaneo envia token a un Route Handler server-side.
- El server hashea y compara.
- Si coincide y el registro pertenece al evento, marca check-in.

## Emails

Eventos minimos:

- Confirmacion de inscripcion.
- Recordatorio opcional.
- Conexion aceptada.

Los emails no deben bloquear la inscripcion. Si falla el envio, guardar el
evento para reintento o mostrar confirmacion igualmente.

## Observabilidad inicial

- Logs de errores server-side.
- Eventos simples: inscripcion creada, check-in registrado, solicitud enviada,
  solicitud aceptada.
- Dashboard MVP puede calcular metricas desde tablas base antes de crear
  agregados.
