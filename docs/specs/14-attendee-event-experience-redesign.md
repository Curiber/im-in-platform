# 14. Attendee Event Experience Redesign

## Estado

`draft ready for implementation`

Extiende el sistema visual elevado (specs 08 y 13) a la experiencia del
asistente en el evento: pagina publica del evento, inscripcion y confirmacion
con QR. Incluye soporte de **foto de portada por evento** (la sube el
organizador) con una portada por defecto como respaldo.

## Problema

Tras rediseñar la landing y `/demo`, el resto del recorrido del asistente
seguia con el estilo basico (`rounded-lg`, tipografia comprimida, sin
profundidad ni imagenes). El primer contacto real del asistente —la pagina del
evento y la inscripcion— no estaba a la altura de la landing, rompiendo la
coherencia y la percepcion de producto.

## Objetivos

- Rediseñar `/e/[slug]` (pagina del evento), `/e/[slug]/register`
  (inscripcion) y `/e/[slug]/registered` (confirmacion + QR) con el sistema
  elevado: jerarquia tipografica, aire, profundidad, radios grandes, chips y
  micro-interacciones.
- Hero del evento **image-forward**: foto de portada con overlay navy.
- Permitir **foto de portada por evento**, subida por el organizador; si no
  hay, usar una **portada por defecto**.
- Inscripcion: intereses como chips seleccionables y **nota de privacidad
  destacada** (diferenciador de confianza).

## No objetivos

- No rediseñar el resto del admin (solo se agrega el control de portada a la
  edicion de evento).
- No rediseñar directorio, perfil, conexiones ni tarjeta publica (fase
  siguiente del networking).
- No cambiar la logica de inscripcion, token ni check-in.

## Decisiones

### Foto de portada por evento

- Nueva columna `events.cover_image_url text` (validacion `^https?://`).
- Bucket de Storage `event-covers` (publico, JPG/PNG/WebP, max 5 MB), mismo
  patron que `profile-photos`.
- Server action `uploadEventCover` (auth de organizador + rol owner/admin/
  event_admin), valida tipo/peso, sube a `events/{eventId}/{ts}.{ext}` y
  guarda la URL publica. `removeEventCover` la limpia.
- Control de portada agregado a la pagina de edicion de evento.
- Fallback: constante `DEFAULT_EVENT_COVER` (stock con licencia) cuando el
  evento no tiene portada propia. Reemplazable por asset propio.
- El render del cover usa `<img>` (URLs arbitrarias de Storage/stock), sin
  pasar por el optimizador de Next.

### Pagina del evento `/e/[slug]`

- Hero con foto de portada + overlay; org como eyebrow, titulo grande, CTA
  Inscribirme (o estado "Inscripciones cerradas").
- Tarjeta de detalles glass (fecha, lugar, cupos) flotando en el hero.
- Agenda como timeline con borde de acento y hover-lift.
- Bloque "Que incluye" con iconos.

### Inscripcion `/e/[slug]/register`

- Formulario elevado: inputs `rounded-xl` con focus ring, layout en grilla.
- Intereses como **chips seleccionables** (checkbox + estilo peer-checked).
- Opt-in de networking y consentimiento de datos en recuadros claros; la nota
  "tu email y telefono solo se comparten al aceptar una conexion" se muestra
  destacada con icono.
- Sidebar con organizador, fecha, lugar y miniatura de portada.

### Confirmacion `/e/[slug]/registered`

- Layout elevado: credencial con QR destacada, datos del evento, foto de
  perfil y accesos (editar perfil, directorio, tarjeta). El payload manual
  para check-in se mantiene pero en un bloque secundario.

## Criterios de aceptacion

- `/e/[slug]`, `/e/[slug]/register` y `/e/[slug]/registered` usan el sistema
  elevado y son responsive.
- Un evento sin portada muestra la portada por defecto; con portada subida,
  muestra la del organizador.
- El organizador puede subir y quitar la portada desde la edicion del evento,
  con validacion de tipo/peso y permisos por rol.
- La inscripcion muestra intereses como chips y la nota de privacidad
  destacada; el flujo de inscripcion sigue funcionando igual.
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 34: Foto de portada de evento

- [ ] Migracion `events.cover_image_url`.
- [ ] Migracion bucket `event-covers`.
- [ ] Server actions `uploadEventCover` / `removeEventCover`.
- [ ] Control de portada en la edicion de evento.
- [ ] Constante `DEFAULT_EVENT_COVER` y helper de resolucion.

### Epic 35: Rediseño de la experiencia del asistente

- [ ] Rediseñar `/e/[slug]` (hero con portada, detalles, agenda timeline).
- [ ] Rediseñar `/e/[slug]/register` + formulario (chips, privacidad).
- [ ] Rediseñar `/e/[slug]/registered` (credencial + QR).

### Epic 36: Verificacion

- [ ] `npm run lint` y `npm run build` pasan.
- [ ] Prueba manual del flujo evento -> inscripcion -> confirmacion.
- [ ] Revisar responsive en mobile y desktop.

## Riesgos

- La portada por defecto es stock con licencia (placeholder); reemplazar por
  asset propio antes de publicar.
- Subir portadas sin limpieza deja archivos huerfanos en el bucket al
  reemplazar (mismo patron que fotos de perfil; optimizar a futuro).
