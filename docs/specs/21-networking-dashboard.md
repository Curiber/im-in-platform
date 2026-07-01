# 21. Dashboard de networking

## Estado

`implementado — Epic 34, Fase 2.3`

Implementa el item 2.3 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
dashboard de networking (conexiones, perfiles vistos, opt-in) + tiempo
real/polling.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§F.6 ("metricas en tiempo real ... polling suave").

## Problema

El dashboard existente mezclaba inscripcion y networking en una sola grilla y
era estatico (una sola carga). Durante el evento, el organizador necesita ver el
pulso del networking (opt-in, conexiones, alcance de perfiles) y que se
actualice solo, sin recargar.

## Objetivos

- Separar las metricas en **Asistencia** y **Networking**.
- Agregar las tasas que faltaban: **opt-in** (sobre activos), **aceptacion** de
  conexiones (sobre solicitudes) y **alcance** de perfiles (vistas +
  visitantes unicos).
- **Polling suave** togglable: refresca los datos en intervalo sin recargar.

## No objetivos

- Supabase Realtime: se usa polling (`router.refresh()`) por simplicidad, como
  permite el spec. Realtime queda para cuando haya demanda.
- Graficos de series de tiempo: por ahora son tarjetas + rankings.

## Decisiones

- Los datos ya existen en DB (`event_registrations`, `connection_requests`,
  `profile_views`): el dashboard solo agrega la capa de agregacion.
- `profile_views` crece sin limite (una fila por vista), asi que NO se baja
  entera: una RPC `event_profile_view_stats` (`security definer`, valida
  membresia) hace `count`, `count distinct` de visitantes y el ranking top-8 en
  la DB, devolviendo un resultado pequeño y constante. Indice
  `(event_id, viewer_registration_id)` para el distinct.
- **Activos** = `registered` + `checked_in` (base de las tasas), consistente con
  el resto del admin.
- Metricas nuevas:
  - Opt-in networking = `networking_opt_in` / activos (con hint de perfiles
    publicos).
  - Conexiones aceptadas + tasa = aceptadas / total de solicitudes.
  - Perfiles vistos = filas de `profile_views`; visitantes unicos = distinct
    `viewer_registration_id` (hint).
- **Polling**: componente cliente `AutoRefresh` que refresca cada 15s,
  togglable. Usa `useTransition`: `router.refresh()` va dentro de la transicion,
  cuyo `isPending` sigue verdadero hasta que el re-render con datos frescos
  COMPLETA. Asi la hora de "Actualizado" marca el fin (no el inicio) y un
  intervalo no arranca un refresco si el anterior sigue en curso (sin solapes).
  La pagina sigue siendo server component `force-dynamic`.

## Criterios de aceptacion

- El dashboard muestra secciones Asistencia y Networking con las tasas.
- Con auto-actualizar activo, las metricas se refrescan solas; se puede pausar.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Componente `AutoRefresh` (polling togglable).
- [x] Metricas de networking: opt-in, aceptacion, vistas, visitantes unicos.
- [x] Reorganizar el dashboard en secciones + hints.
- [ ] Prueba manual: generar conexiones/vistas y ver el refresh en vivo.

## Riesgos / futuro

- `event_registrations` y `connection_requests` aun se traen enteras (acotadas
  por cupo y por asistentes); si algun evento las hace pesadas, se agregan por
  RPC como `profile_views`.
- El polling cada 15s multiplica las consultas del dashboard; si crece el costo,
  subir el intervalo o pasar a Realtime.
