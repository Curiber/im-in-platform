# 15. Networking Surfaces Redesign

## Estado

`draft ready for implementation`

Extiende el sistema visual elevado (specs 08, 13, 14) al nucleo de networking:
directorio, detalle de perfil, conexiones y tarjeta publica.

## Problema

Tras rediseñar landing, demo y la experiencia del asistente en el evento, las
superficies de networking seguian con el estilo basico. Ademas, el encabezado
del directorio mostraba texto claro sobre fondo claro, con bajo contraste.

## Objetivos

- Aplicar el sistema elevado a directorio, detalle de perfil, conexiones y
  tarjeta publica.
- Encabezado del directorio inmersivo con la **foto de portada del evento +
  overlay navy**, para legibilidad y coherencia con la pagina del evento.
- Navegacion por pestañas en el directorio (Personas / Conexiones / Mi
  tarjeta / Mi perfil).

## No objetivos

- No construir el motor de matchmaking por IA ni el porcentaje de afinidad
  real (es trabajo de Etapa 1, ver spec 12). En el producto real no se
  muestra un % inventado.
- No rediseñar la edicion de perfil ni el admin en esta fase.

## Decisiones

### Honestidad del matchmaking

El landing (marketing) muestra "match por IA" y porcentajes como vision. En el
directorio real, que ven asistentes, **no se inventa un porcentaje ni IA**: los
sugeridos se calculan por **intereses en comun reales** (logica ya existente) y
se etiquetan como tal ("N intereses en comun", "Sugeridos para ti"). El lugar
queda listo para enchufar el % cuando exista el motor de IA.

### Navegacion persistente (shell)

Las vistas de networking comparten un encabezado de navegacion
(`NetworkingNav`) con la portada del evento y pestañas Personas / Conexiones /
Mi tarjeta / Mi perfil. La pestaña de la vista actual se marca en blanco; las
demas navegan dentro del mismo shell en vez de saltar a pantallas con headers
distintos. Se usa en directorio, conexiones y "Mi perfil"; "Mi tarjeta" abre
la tarjeta publica en otra pestaña.

### Directorio `/e/[slug]/directory`

- Encabezado inmersivo: portada del evento (`resolveEventCover`) + overlay
  navy + titulo + conteo + navegacion por pestañas.
- Bloque "Sugeridos para ti" (top 4 por intereses en comun).
- Buscador y filtros refinados; tarjetas de asistente con avatar, chips de
  intereses (resaltando los compartidos), badge de intereses en comun y
  hover-lift.
- Para exponer la portada se agrega `cover_image_url` al `events` de
  `verifyRegistrationAccess`.

### Detalle, conexiones y tarjeta

- Detalle de perfil: hero con gradiente de marca, tarjetas e intereses
  elevados, CTA de conexion refinado.
- Conexiones: paneles y tarjetas elevados, badges de estado, avatares con
  anillo.
- Tarjeta publica `/p/[profileSlug]`: elevacion ligera (radios mayores,
  hover) respetando su diseño y reglas de visibilidad de contacto.

## Criterios de aceptacion

- Las 4 superficies usan el sistema elevado y son responsive.
- El encabezado del directorio muestra la portada del evento con texto blanco
  legible.
- No se muestra ningun porcentaje de match ni "IA" inventado en el producto.
- Las reglas de visibilidad de la tarjeta y de contacto se mantienen.
- `npm run lint` y `npm run build` pasan.

## Tareas

### Epic 37: Directorio

- [ ] Encabezado inmersivo con portada + pestañas.
- [ ] Sugeridos por intereses en comun + tarjetas elevadas.
- [ ] `cover_image_url` en `verifyRegistrationAccess`.

### Epic 38: Detalle, conexiones y tarjeta

- [ ] Detalle de perfil elevado.
- [ ] Conexiones elevadas.
- [ ] Tarjeta publica pulida.

### Epic 39: Verificacion

- [ ] `npm run lint` y `npm run build` pasan.
- [ ] Prueba manual del recorrido directorio -> perfil -> conexion.

## Riesgos

- Depende de `events.cover_image_url` (spec 14). Esta rama parte de
  `epic/33-attendee-event-redesign` para heredar la columna; debe mergearse
  despues de esa.
- Mostrar "IA/%" en el producto antes de construir el motor seria engañoso;
  por eso se posterga al motor real.
