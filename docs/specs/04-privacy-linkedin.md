# 04. Privacy And LinkedIn

## Privacidad desde el diseno

El producto maneja datos personales y datos profesionales. El MVP debe separar
claramente:

- Datos necesarios para inscripcion.
- Datos visibles para networking.
- Datos de contacto compartidos solo tras aceptacion mutua.
- Datos operativos para el organizador.

## Consentimientos minimos

1. Inscripcion al evento.
2. Tratamiento de datos por el organizador.
3. Perfil publico dentro del directorio del evento.
4. Recepcion de solicitudes de conexion.
5. Compartir datos de contacto tras conexion aceptada.

Cada consentimiento debe guardar:

- Tipo.
- Version del texto.
- Fecha y hora.
- Evento asociado.
- Usuario asociado.

## RUT

No se recomienda pedir RUT en el MVP. Para evitar perfiles duplicados y validar
identidad, usar:

- Email unico por evento.
- Supabase Auth.
- Login social opcional.
- Dominio institucional para eventos cerrados, si aplica.

Si un cliente exige RUT, debe ser:

- Campo privado.
- No visible en directorio.
- No usado como identificador publico.
- Justificado por necesidad operacional o legal.

## Login con LinkedIn

LinkedIn es viable como login social, especialmente para reducir friccion y
prefill profesional basico. No debe ser bloqueo del MVP porque:

- Requiere configurar una app en LinkedIn Developer Portal.
- Los datos disponibles son limitados.
- No reemplaza el perfil editable de I'm IN.

### Alcance realista

Con Sign In with LinkedIn usando OpenID Connect se puede obtener identidad
profesional basica del usuario autenticado, principalmente:

- Nombre.
- Headline o descripcion profesional basica, segun respuesta disponible.
- Foto.
- Email principal.

No debe asumirse acceso libre a:

- Experiencia laboral completa.
- Educacion completa.
- Contactos.
- Red profesional.
- Skills detalladas.
- Datos de otros usuarios.

### Recomendacion

Para MVP:

- Implementar primero email/password o magic link con Supabase Auth.
- Preparar el modelo para `linkedin_url` y metadatos externos.
- Evaluar LinkedIn OIDC como mejora despues de validar inscripcion y networking.

Para V1.5:

- Agregar "Continuar con LinkedIn".
- Usar datos de LinkedIn solo como sugerencia editable.
- Pedir confirmacion antes de publicar datos en el directorio.
