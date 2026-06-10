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

- [x] Crear perfil publico por inscripcion.
- [x] Crear intereses base.
- [x] Permitir completar perfil breve.
- [x] Crear directorio privado por evento.
- [x] Agregar busqueda y filtros.
- [x] Restringir directorio a inscritos.

## Epic 6: Check-in

- [x] Crear lector QR en admin.
- [x] Crear endpoint server-side para validar token.
- [x] Registrar check-in.
- [x] Manejar QR ya usado, invalido o cancelado.

## Epic 7: Conexiones

- [x] Crear `connection_requests`.
- [x] Crear accion "Conectar".
- [x] Crear bandeja de solicitudes recibidas.
- [x] Aceptar/rechazar.
- [x] Compartir datos autorizados tras aceptacion.

## Epic 8: Dashboard y exportacion

- [x] Mostrar inscritos totales.
- [x] Mostrar acreditados.
- [x] Mostrar no show.
- [x] Mostrar perfiles publicos.
- [x] Mostrar solicitudes enviadas y aceptadas.
- [x] Exportar CSV.

## Epic 9: V1.5 evaluable

- [ ] Match simple por interseccion de intereses.
- [ ] Email transaccional de conexion aceptada.
- [ ] Agenda simple.
- [ ] Login con LinkedIn OIDC.
- [ ] Dashboard con intereses frecuentes y perfiles mas vistos.

## Epic 10: Perfil persistente

- [ ] Crear migracion `attendee_profiles`.
- [ ] Habilitar extension `citext` para email case-insensitive.
- [ ] Agregar `profile_id` a `event_registrations`.
- [ ] Crear upsert de perfil por email normalizado.
- [ ] Reutilizar perfil al registrar el mismo email en otro evento.
- [ ] Mantener snapshots por evento.
- [ ] Actualizar directorio para leer foto/headline desde perfil.

## Epic 11: Foto de perfil

- [ ] Crear bucket Supabase Storage `profile-photos`.
- [ ] Crear upload server-side con validacion de token.
- [ ] Validar tipo y peso de imagen.
- [ ] Guardar `avatar_url`.
- [ ] Mostrar foto en directorio, detalle y confirmacion.

## Epic 12: Edicion de perfil

- [ ] Crear ruta de perfil del asistente.
- [ ] Editar descripcion, cargo, empresa, telefono, LinkedIn e intereses.
- [ ] Configurar visibilidad de datos.
- [ ] Sincronizar snapshots del registro actual cuando corresponda.

## Epic 13: Tarjeta virtual

- [ ] Crear ruta publica `/p/[profileSlug]`.
- [ ] Renderizar tarjeta vertical responsive.
- [ ] Generar QR para conectar por I'M IN.
- [ ] Agregar copiar link.
- [ ] Evaluar descarga PNG como V1.1.

## Epic 14: Brand foundation

- [ ] Elegir logo final.
- [ ] Agregar assets de marca.
- [ ] Crear tokens CSS azul/navy/celeste/turquesa/verde agua.
- [ ] Actualizar favicon.

## Epic 15: Rediseno publico

- [ ] Redisenar home publica.
- [ ] Redisenar pagina publica de evento.
- [ ] Redisenar registro y confirmacion.
- [ ] Incorporar visuales de networking y plataforma.

## Epic 16: Rediseno networking

- [ ] Redisenar directorio.
- [ ] Redisenar perfil de asistente.
- [ ] Redisenar conexiones.
- [ ] Integrar tarjeta virtual.

## Epic 17: Admin polish

- [ ] Redisenar listado/detalle de eventos.
- [ ] Redisenar dashboard.
- [ ] Redisenar check-in para uso en puerta.

## Primera vertical recomendada

Construir primero:

1. Auth admin.
2. Crear evento.
3. Publicar link.
4. Inscripcion publica.
5. QR visible.
6. Check-in admin.

Esa vertical valida operacion real antes de invertir en networking avanzado.
