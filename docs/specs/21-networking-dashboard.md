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
  `profile_views`): el dashboard solo agrega la capa de agregacion. Sin nuevas
  tablas ni migraciones.
- **Activos** = `registered` + `checked_in` (base de las tasas), consistente con
  el resto del admin.
- Metricas nuevas:
  - Opt-in networking = `networking_opt_in` / activos (con hint de perfiles
    publicos).
  - Conexiones aceptadas + tasa = aceptadas / total de solicitudes.
  - Perfiles vistos = filas de `profile_views`; visitantes unicos = distinct
    `viewer_registration_id` (hint).
- **Polling**: componente cliente `AutoRefresh` que llama `router.refresh()`
  cada 15s, togglable, con hora de ultima actualizacion. La pagina sigue siendo
  server component `force-dynamic`, asi que el refresh re-consulta.

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

- Visitantes unicos se calcula trayendo los `viewer_registration_id` y
  deduplicando en memoria; para volumenes muy altos conviene un count distinct
  en DB (RPC). Aceptable para eventos medianos.
- El polling cada 15s multiplica las consultas del dashboard; si crece el costo,
  subir el intervalo o pasar a Realtime.
