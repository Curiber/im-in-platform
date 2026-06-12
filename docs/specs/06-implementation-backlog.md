# 06. Implementation Backlog

## Epic 1: Proyecto base

- [x] Crear app Next.js con TypeScript y Tailwind.
- [x] Agregar dependencias iniciales de Supabase.
- [x] Crear helpers lazy para Supabase browser/server.
- [x] Crear `.env.example`.
- [x] Configurar proyecto Supabase real.
- [ ] Configurar proyecto Vercel real.
- [x] Crear repositorio remoto GitHub.

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

- [x] Match simple por interseccion de intereses.
- [x] Email transaccional de conexion aceptada.
- [x] Agenda simple.
- [x] Login con LinkedIn OIDC. Requiere habilitar el provider
  `linkedin_oidc` en Supabase Auth con client id/secret de LinkedIn.
- [x] Dashboard con intereses frecuentes y perfiles mas vistos.

## Epic 10: Perfil persistente

- [x] Crear migracion `attendee_profiles`.
- [x] Habilitar extension `citext` para email case-insensitive.
- [x] Agregar `profile_id` a `event_registrations`.
- [x] Crear upsert de perfil por email normalizado.
- [x] Reutilizar perfil al registrar el mismo email en otro evento.
- [x] Mantener snapshots por evento.
- [x] Actualizar directorio para leer foto/headline desde perfil.

## Epic 11: Foto de perfil

- [x] Crear bucket Supabase Storage `profile-photos`.
- [x] Crear upload server-side con validacion de token.
- [x] Validar tipo y peso de imagen.
- [x] Guardar `avatar_url`.
- [x] Mostrar foto en directorio, detalle y confirmacion.

## Epic 12: Edicion de perfil

- [x] Crear ruta de perfil del asistente.
- [x] Editar descripcion, cargo, empresa, telefono, LinkedIn e intereses.
- [x] Configurar visibilidad de datos.
- [x] Sincronizar snapshots del registro actual cuando corresponda.

## Epic 13: Tarjeta virtual

- [x] Crear ruta publica `/p/[profileSlug]`.
- [x] Renderizar tarjeta vertical responsive.
- [x] Generar QR para conectar por I'M IN.
- [x] Agregar copiar link.
- [x] Evaluar descarga PNG como V1.1. Implementada con endpoint server-side
  `/p/[profileSlug]/card` usando `ImageResponse`.

## Epic 14: Brand foundation

- [x] Elegir logo final.
- [x] Agregar assets de marca.
- [x] Crear tokens CSS azul/navy/celeste/turquesa/verde agua.
- [x] Actualizar favicon.

## Epic 15: Rediseno publico

- [x] Redisenar home publica.
- [x] Redisenar pagina publica de evento.
- [x] Redisenar registro y confirmacion.
- [x] Incorporar visuales de networking y plataforma.

## Epic 16: Rediseno networking

- [x] Redisenar directorio.
- [x] Redisenar perfil de asistente.
- [x] Redisenar conexiones.
- [x] Integrar tarjeta virtual.

## Epic 17: Admin polish

- [x] Redisenar listado/detalle de eventos.
- [x] Redisenar dashboard.
- [x] Redisenar check-in para uso en puerta.

## Epic 18: Organization settings

- [x] Crear ruta `/admin/settings`.
- [x] Crear formulario para editar nombre de empresa.
- [x] Crear server action `updateOrganizationSettings`.
- [x] Validar permisos `owner/admin`.
- [x] Bloquear edicion para `event_admin`.

## Epic 19: Event deletion

- [x] Agregar soft delete a `events`.
- [x] Guardar `deleted_at`, `deleted_by` y `delete_reason`.
- [x] Crear server action `deleteEvent`.
- [x] Validar permisos `owner/admin`.
- [x] Requerir motivo de eliminacion.
- [x] Ocultar eventos eliminados de listados activos.
- [x] Bloquear pagina publica, registro, check-in, dashboard y export.

## Epic 20: Deleted event recovery, V1.1

- [x] Agregar filtro de eventos eliminados.
- [x] Agregar vista read-only de evento eliminado.
- [x] Permitir restaurar solo a owner.

## Epic 21: Platform admin organizations

- [x] Agregar logout visible en pantallas principales del admin.
- [x] Bloquear creacion autoservicio de organizaciones.
- [x] Crear ruta `/admin/organizations` para platform admins.
- [x] Crear organizaciones desde platform admin.
- [x] Invitar o reutilizar usuario owner por email.
- [x] Asignar owner inicial en `organization_users`.
- [x] Ocultar gestion de organizaciones a usuarios no platform admin.

## Primera vertical recomendada

Construir primero:

1. Auth admin.
2. Crear evento.
3. Publicar link.
4. Inscripcion publica.
5. QR visible.
6. Check-in admin.

Esa vertical valida operacion real antes de invertir en networking avanzado.
