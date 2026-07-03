# 35. Metricas de reuniones en el dashboard

## Estado

`implementado — Epic 52`

Complementa el [21-networking-dashboard.md](21-networking-dashboard.md)
(anterior a las reuniones del asistente) con la señal que le faltaba: la
reunion 1:1 es la unidad de valor medible del networking (spec 12 §B.2).

## Problema

El dashboard en vivo mostraba conexiones, opt-in y vistas de perfil, pero
nada de reuniones: el organizador no podia ver el pulso de la funcionalidad
que mejor demuestra el valor del evento. (El reporte post-evento del spec 23
si las incluye; el hueco era el dashboard con polling.)

## Objetivos

- Seccion "Reuniones 1:1" en el dashboard, actualizada por el mismo polling:
  propuestas, aceptadas (+tasa), proximas y realizadas.
- Ranking "Puntos de encuentro mas usados" (aceptadas por ubicacion): señal
  operativa para redistribuir capacidad durante el evento.

## No objetivos

- Cambiar el reporte post-evento (ya cubre reuniones, spec 23).
- Transicion automatica a `completed` (sigue siendo cosmetica): "realizadas"
  se deriva de aceptadas cuyo `ends_at` ya paso.
- Serie temporal de reuniones (tarjetas + ranking, como el resto).

## Decisiones

- Mismas fuentes y patron del spec 21: query directa de `meetings`
  (`status, starts_at, ends_at, location_id`) + `meeting_locations` para
  nombres, con el cliente de sesion (las policies de lectura para miembros ya
  existen, spec 22). Acotada por evento; si algun evento la hace pesada, se
  agrega por RPC como `event_profile_view_stats`.
- Definiciones:
  - **Propuestas** = todas las filas (cualquier estado).
  - **Aceptadas** + tasa = aceptadas / propuestas.
  - **Proximas** = aceptadas con `starts_at` futuro.
  - **Realizadas** = aceptadas con `ends_at` pasado (aprox. honesta mientras
    `completed` no se setee; la tarjeta lo explica en su hint).
- Ubicaciones: aceptadas sin punto cuentan como "Por definir"; un punto
  borrado (no deberia: se archivan) cae en "Punto eliminado".

## Criterios de aceptacion

- Con reuniones en distintos estados, las 4 tarjetas y el ranking cuadran con
  la vista admin de reuniones (spec 22).
- Sin reuniones, la seccion muestra ceros y el ranking "Sin datos todavia".
- El auto-refresh existente actualiza tambien esta seccion.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Queries de meetings/locations en el dashboard.
- [x] Seccion "Reuniones 1:1" + ranking de puntos de encuentro.
- [ ] Prueba manual con reuniones reales en varios estados.

## Riesgos / futuro

- Cuando exista la transicion automatica a `completed` (cron), "realizadas"
  pasa a leer ese estado sin cambiar la UI.
