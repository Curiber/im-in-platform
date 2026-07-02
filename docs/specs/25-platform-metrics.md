# 25. Metricas globales de plataforma

## Estado

`implementado — Epic 38, Fase 3.1`

Implementa el item 3.1 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md)
y cierra la **Fase 3** (admin de plataforma).

## Problema

El platform admin no tenia vision agregada: cuantas organizaciones (y cuantas
suspendidas), cuantos eventos, inscripciones, conexiones y reuniones mueve la
plataforma. La RLS es por organizacion, asi que no puede consultarlo directo.

## Objetivos

- Panel de metricas globales en el hub del platform admin
  (`/admin/organizations`).

## No objetivos

- Series de tiempo / graficos / comparativas (post-validacion, spec 17 §6).
- Polling: es una vista de gestion, no de operacion en vivo.

## Decisiones

- RPC `platform_stats()` (`security definer`, `stable`): counts agregados de
  organizaciones (total/activas/suspendidas), eventos (total/publicados),
  inscripciones activas y acreditadas (mismo criterio `registered+checked_in`
  que dashboard/reporte), conexiones (total/aceptadas) y reuniones. Valida
  **platform admin desde el JWT** (`app_private.is_platform_admin`, igual que
  suspend/reactivate); devuelve una sola fila, sin exponer datos por fila.
- Se invoca con la sesion del usuario (el JWT es la credencial), no con
  service_role.
- UI: banda de 5 tarjetas con hints sobre el listado de organizaciones.

## Criterios de aceptacion

- El platform admin ve las metricas; un usuario normal no (la RPC rechaza en
  DB, no solo en UI).
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] Migracion `platform_stats()`.
- [x] Banda de metricas en `/admin/organizations`.
- [ ] Prueba manual: verificar counts contra datos reales.

## Riesgos / futuro

- Los counts son full-scan por tabla; con volumen real, materializar o cachear.
  Para el tamaño actual de la plataforma es irrelevante.
