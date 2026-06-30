# 18. Opciones de perfil configurables por evento

## Estado

`implementado — Epic 31, Fase 2.1 (parcial)`

Cubre la primera mitad del item 2.1 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
**categorias de intereses/areas configurables por evento**. La otra mitad de
2.1 (modo aprobacion para eventos cerrados) queda pendiente.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§B.3 y §F.3 ("el organizador controla el networking"; las categorias deben ser
configurables por evento, no hardcodeadas en `profile-options.ts`).

## Problema

Las areas/industrias e intereses que el asistente podia elegir vivian
hardcodeados en `src/lib/profile-options.ts`, identicos para todos los eventos.
Cada vertical (feria tech, gremio medico, incubadora) necesita su propio
vocabulario.

## Objetivos

- Que el organizador pueda definir, por evento, las opciones de **area/industria**
  e **intereses** que verá el asistente en el registro y en su perfil.
- Mantener el comportamiento actual para eventos sin configurar: si un evento no
  personaliza un catalogo, se usan los defaults de plataforma.

## No objetivos

- Objetivos de networking (busco/ofrezco): es otra feature (Fase 4.1), aunque el
  spec 12 los menciona junto a este item.
- Reordenar opciones por drag and drop (el orden es por insercion).
- Modo aprobacion de inscripciones (segunda mitad de 2.1).

## Decisiones

### Modelo de datos

- Tabla `event_profile_options` (`event_id`, `kind` enum `industry|interest`,
  `label`, `position`). `unique(event_id, kind, label)`.
- **Resolucion con fallback**: si un evento tiene filas para un `kind`, esas son
  las opciones efectivas; si no tiene ninguna, se cae a los defaults de
  plataforma (`DEFAULT_INDUSTRIES` / `DEFAULT_INTERESTS` en codigo). Helper puro
  `resolveEffectiveOptions(custom, defaults)` (testeado) + resolver
  `getEventProfileOptions(client, eventId)`.
- RLS: lectura para miembros de la organizacion; escritura para
  owner/admin/event_admin. Las superficies publicas (registro, perfil) leen via
  `service_role`, que ignora RLS.

### Consumo

- El catalogo seleccionable solo se consume en dos formularios: registro
  (`register/page.tsx` → `RegistrationForm`) y perfil (`profile/page.tsx`). El
  directorio, export y tarjeta publica consumen los **valores guardados** en los
  perfiles, no el catalogo, asi que no cambian.
- **Validacion server-side** (no solo UI): tanto el registro (`register/actions.ts`)
  como el guardado de perfil (`profile/actions.ts`) validan el area y los
  intereses enviados contra el catalogo efectivo del evento antes de persistir.
  Los Server Actions son invocables directo, asi que no se confia en el form.
- El resolver `getEventProfileOptions` falla explicitamente ante un error de la
  consulta (permisos/migracion/disponibilidad) en vez de degradarse en silencio
  a los defaults, que mostraria el vocabulario equivocado.

### UI de administracion

- En la pagina de edicion del evento, seccion "Opciones de networking" con dos
  grupos (areas, intereses). Por grupo:
  - Sin personalizar: muestra los defaults y un boton **Personalizar** que los
    siembra como filas editables (`customizeEventProfileOptions`).
  - Personalizado: chips con quitar (`removeEventProfileOption`), campo para
    **Agregar** (`addEventProfileOption`) y **Restaurar opciones por defecto**
    (`resetEventProfileOptions`, borra las filas → vuelve a los defaults).

## Criterios de aceptacion

- Un evento sin opciones propias muestra exactamente los defaults de plataforma
  en registro y perfil (sin cambios respecto a antes).
- Personalizar siembra los defaults; agregar/quitar refleja en registro y perfil.
- Restaurar deja el evento usando defaults nuevamente.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion `event_profile_options` + enum + RLS.
- [x] Helper de resolucion con fallback + test.
- [x] Resolver `getEventProfileOptions` y consumo en registro/perfil.
- [x] Validacion de intereses por catalogo de evento en `profile/actions.ts`.
- [x] Acciones admin (customize/add/remove/reset) + UI en edicion de evento.
- [ ] Prueba manual: personalizar, registrar con opciones nuevas, restaurar.

## Riesgos

- Cambiar el catalogo de un evento no reescribe perfiles ya guardados: un perfil
  con un interes que luego se quita del catalogo conserva su valor (snapshot).
  Es el comportamiento esperado; el catalogo solo gobierna nuevas selecciones.
