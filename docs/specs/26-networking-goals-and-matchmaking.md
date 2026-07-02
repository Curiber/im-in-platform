# 26. Objetivos de networking y matchmaking score v1

## Estado

`implementado — Epic 43, Fase 4.1`

Implementa el item 4.1 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
objetivos de networking en registro/perfil + matchmaking score v1 con
explicacion del match.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§B.1 ("el matchmaking es por intencion, no solo por afinidad") y §N.3-4
(`networking_goals`, score compuesto con explicacion en UI).

## Problema

Los "Sugeridos para ti" del directorio ordenaban solo por interseccion de
intereses. El match fuerte cruza *que busca* uno con *que ofrece* el otro
(vender/comprar, contratar/buscar trabajo, invertir/levantar capital). Sin
objetivos en el perfil no hay señal de intencion que cruzar.

## Objetivos

- Capturar **que busca** y **que ofrece** cada asistente en el registro y en
  su perfil (opcional, hasta 3 por faceta).
- Catalogo de objetivos **configurable por evento** (mismo mecanismo que
  areas/intereses del spec 18), con fallback a defaults de plataforma.
- Subir el matchmaking a un **score compuesto** donde la intencion pesa mas
  que la afinidad, con **explicacion del match** en la UI.

## No objetivos

- Porcentaje de match o narrativa "IA": el spec 15 lo prohibe hasta tener un
  motor real. Se muestran razones concretas y verificables.
- Feedback loop de pesos (aceptaciones/rechazos recalibran): Etapa 3, spec 12.
- Goals en CSV export / reporte post-evento (futuro).

## Decisiones

### Modelo de datos

- Columnas `goals_seeking text[]` y `goals_offering text[]` (default `{}`) en
  `event_registrations` (snapshot por evento) y `attendee_profiles` (perfil
  persistente), igual que `interests`.
- **Un solo catalogo** de objetivos para ambas facetas: kind nuevo `goal` en
  `event_profile_options` (enum `profile_option_kind`). Que "Inversion"
  signifique lo mismo al buscar y al ofrecer es lo que permite cruzar
  A.busca ∩ B.ofrece. Defaults en `DEFAULT_GOALS` (`profile-options.ts`).
- `register_attendee` acepta `p_goals_seeking`/`p_goals_offering` con default
  `'{}'` (tolera la ventana de deploy con codigo que llama con 12 args). El
  cuerpo parte de la version del Epic 37 (chequeo de suspension incluido).

### Captura

- Registro y perfil muestran dos grupos de chips ("¿Que buscas?" / "¿Que
  ofreces?"), opcionales, max 3 por faceta. Validacion **server-side** contra
  el catalogo efectivo del evento (los Server Actions son invocables directo).
- El guardado de perfil persiste en `attendee_profiles` y en el snapshot de
  `event_registrations` (mismo patron que interests).
- Al verificar el email, `upsertAttendeeProfileFromRegistration` copia los
  goals del snapshot al perfil global (el perfil sigue diferido hasta
  verificar, spec 11).

### Score v1 (`src/lib/matchmaking.ts`, puro y testeado)

`scoreMatch(viewer, candidate) -> { score, reasons }`:

| Señal | Peso |
| --- | --- |
| Cada label en `viewer.busca ∩ candidate.ofrece` | +3 |
| Cada label en `viewer.ofrece ∩ candidate.busca` | +3 |
| Cada interes en comun | +1 |
| Misma area/industria | +1 |

- La intencion pesa 3x la afinidad (spec 12 §B.1). Empates: orden alfabetico.
- `reasons` es una lista tipada (`offers_what_you_seek`, `seeks_what_you_offer`,
  `shared_interests`, `same_industry`) que `formatMatchReason` traduce a texto
  visible: "Ofrece lo que buscas: Inversion", "Busca lo que ofreces: Clientes",
  "N intereses en comun", "Misma area: X".

### Superficies

- **Directorio**: "Sugeridos para ti" rankea por score (top 4, score > 0) y
  muestra las razones como chips. Las tarjetas de la grilla muestran badge
  "Match" cuando hay cruce de intencion (si no, el contador de intereses).
- **Detalle de perfil**: bloque "Por que conectar" (razones contra el viewer)
  + secciones "Busca" / "Ofrece" del perfil visitado.
- **Admin**: tercer grupo "Objetivos de networking" en la seccion de opciones
  del evento, con el mismo CRUD generico por `kind` (personalizar/agregar/
  quitar/restaurar).

## Criterios de aceptacion

- Registro y perfil permiten elegir objetivos del catalogo efectivo; el
  server rechaza etiquetas fuera del catalogo.
- Con A buscando lo que B ofrece, B aparece primero en los sugeridos de A con
  la razon correcta; sin datos en comun no hay sugeridos.
- No se muestra ningun porcentaje ni "IA".
- El organizador personaliza el catalogo de objetivos por evento.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion: kind `goal`, columnas en registrations/profiles, RPC.
- [x] `DEFAULT_GOALS` + `goals` en `getEventProfileOptions`.
- [x] Registro: chips + validacion + RPC args.
- [x] Perfil: chips + validacion + persistencia doble.
- [x] Verify: copiar goals al perfil global.
- [x] `scoreMatch` + `formatMatchReason` + tests.
- [x] Directorio: sugeridos por score con razones + badge.
- [x] Detalle: "Por que conectar" + Busca/Ofrece.
- [x] Admin: grupo de objetivos en opciones del evento.
- [ ] Prueba manual: registro cruzado de dos asistentes y verificacion de
      sugeridos/razones.

## Riesgos / futuro

- Igual que el catalogo de intereses: quitar un objetivo del catalogo no
  reescribe perfiles ya guardados (snapshot); solo gobierna nuevas selecciones.
- Los pesos 3/1/1 son un punto de partida razonado, no calibrado: el feedback
  loop (Etapa 3) los ajustara con datos reales.
