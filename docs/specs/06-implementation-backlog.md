# 06. Implementation Backlog

## Epic 1: Proyecto base

- [x] Crear app Next.js con TypeScript y Tailwind.
- [x] Agregar dependencias iniciales de Supabase.
- [x] Crear helpers lazy para Supabase browser/server.
- [x] Crear `.env.example`.
- [ ] Configurar proyecto Supabase real.
- [ ] Configurar proyecto Vercel real.
- [ ] Crear repositorio remoto GitHub.

## Epic 2: Auth y roles

- [x] Implementar login con email/magic link o password.
- [x] Crear callback de auth.
- [x] Crear tabla `organizations`.
- [x] Crear tabla `organization_users`.
- [x] Proteger rutas admin.
- [x] Crear seed de organizacion/admin piloto.

## Epic 3: Eventos

- [x] Crear tablas `events` e indices.
- [x] Crear formulario admin de evento.
- [x] Crear listado admin de eventos.
- [x] Editar evento.
- [x] Implementar estados `draft`, `published`, `closed`.
- [x] Generar slug y link publico.

## Epic 4: Inscripcion

- [x] Crear pagina publica de evento.
- [x] Crear formulario de inscripcion.
- [x] Validar cupos.
- [x] Evitar duplicados por email/evento.
- [x] Guardar consentimiento.
- [x] Generar token QR.
- [x] Mostrar confirmacion y QR.
- [x] Enviar confirmacion por email.

## Epic 5: Perfil y directorio

- [ ] Crear `attendee_profiles`.
- [ ] Crear intereses base.
- [ ] Permitir completar perfil breve.
- [ ] Crear directorio privado por evento.
- [ ] Agregar busqueda y filtros.
- [ ] Restringir directorio a inscritos.

## Epic 6: Check-in

- [ ] Crear lector QR en admin.
- [ ] Crear endpoint server-side para validar token.
- [ ] Registrar check-in.
- [ ] Manejar QR ya usado, invalido o cancelado.

## Epic 7: Conexiones

- [ ] Crear `connection_requests`.
- [ ] Crear accion "Conectar".
- [ ] Crear bandeja de solicitudes recibidas.
- [ ] Aceptar/rechazar.
- [ ] Compartir datos autorizados tras aceptacion.

## Epic 8: Dashboard y exportacion

- [ ] Mostrar inscritos totales.
- [ ] Mostrar acreditados.
- [ ] Mostrar no show.
- [ ] Mostrar perfiles publicos.
- [ ] Mostrar solicitudes enviadas y aceptadas.
- [ ] Exportar CSV.

## Epic 9: V1.5 evaluable

- [ ] Match simple por interseccion de intereses.
- [ ] Email transaccional de conexion aceptada.
- [ ] Agenda simple.
- [ ] Login con LinkedIn OIDC.
- [ ] Dashboard con intereses frecuentes y perfiles mas vistos.

## Primera vertical recomendada

Construir primero:

1. Auth admin.
2. Crear evento.
3. Publicar link.
4. Inscripcion publica.
5. QR visible.
6. Check-in admin.

Esa vertical valida operacion real antes de invertir en networking avanzado.
