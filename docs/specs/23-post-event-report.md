# 23. Reporte post-evento

## Estado

`implementado — Epic 36, Fase 2.5`

Implementa el item 2.5 del
[17-development-process-and-epic-prioritization.md](17-development-process-and-epic-prioritization.md):
reportes post-evento, ademas del CSV de inscritos ya existente.

Fuente: [12-product-evolution-gap-analysis-and-roadmap.md](12-product-evolution-gap-analysis-and-roadmap.md)
§F.7 ("ademas del CSV, resumen post-evento descargable").

## Problema

El unico entregable post-evento era el CSV crudo de inscritos (`/export`). El
organizador necesita un **resumen** presentable (para compartir con
stakeholders/sponsors) con asistencia y networking, no una tabla de filas.

## Objetivos

- Un **resumen post-evento** con asistencia, networking, reuniones y rankings.
- **Descargable**: como PDF (imprimir la pagina) y como CSV agregado.

## No objetivos

- Generacion de PDF en el servidor (sin dependencias nuevas): la descarga PDF es
  imprimir-a-PDF del navegador.
- Reportes comparativos entre eventos (el spec 17 los deja fuera hasta validar
  con eventos reales).
- Branding por evento en el reporte (V2).

## Decisiones

- **Capa de agregacion compartida** `getEventReport(supabase, eventId)`
  (`src/lib/event-report.ts`): reutiliza las fuentes del dashboard
  (inscripciones, conexiones, reuniones) y la RPC `event_profile_view_stats`.
  La usan la pagina y la descarga CSV, sin duplicar el calculo. Solo lectura,
  bajo la sesion del usuario (RLS).
- **Pagina** `/admin/events/[eventId]/report`: documento imprimible (layout
  standalone, controles `print:hidden`, secciones Asistencia / Networking /
  Reuniones + rankings). "Imprimir / Guardar PDF" (`window.print`).
- **Descarga CSV** `/admin/events/[eventId]/report/download`: resumen agregado
  (`seccion, metrica, valor`), complemento del CSV crudo de inscritos.
- Consistencia con el dashboard: "activas" = `registered` + `checked_in`; las
  tasas se calculan igual.

## Criterios de aceptacion

- El reporte muestra asistencia, networking, reuniones y rankings del evento.
- Se puede guardar como PDF (imprimir) y descargar el resumen CSV.
- `npm run lint`, `npm run build` y `npm test` pasan.

## Tareas

- [x] `getEventReport` (agregacion compartida).
- [x] Pagina de reporte imprimible + boton de impresion.
- [x] Descarga de resumen CSV.
- [x] Link desde el detalle del evento.
- [ ] Prueba manual: revisar el reporte y ambas descargas con datos reales.

## Integridad y presentacion

- `getEventReport` **falla explicitamente** si cualquier query o la RPC devuelve
  error, en vez de degradarse en ceros: el reporte (PDF/CSV) nunca presenta datos
  falsos como validos. `PGRST116` (evento inexistente) sigue siendo `notFound`.
- Las fechas del reporte se formatean con `timeZone: America/Santiago` fijo: sin
  eso el runtime (Vercel) formatea en UTC y muestra horas incorrectas. El modelo
  no tiene tz por evento; la plataforma asume Chile (locale es-CL en toda la app).

## Riesgos / futuro

- El resumen no incluye graficos; si se piden, se agregan como SVG imprimible.
- La zona horaria fija (`America/Santiago`) asume eventos en Chile; cuando haya
  eventos en otras zonas, agregar `time_zone` por evento y usarlo en todo el
  formateo de fechas de la app (no solo el reporte).
- Reportes comparativos y branding por evento quedan para despues del hito de
  evento real.
