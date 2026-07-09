-- Descubrimiento de eventos en /app/explorar (spec 37).
--
-- Opt-in del organizador: por defecto un evento publicado sigue siendo accesible
-- SOLO por link (comportamiento actual). Marcar `discoverable` lo lista en el
-- explorador de I'm IN para asistentes con cuenta. Respeta eventos privados o
-- corporativos, que no quieren aparecer en un directorio publico de eventos.

alter table public.events
  add column discoverable boolean not null default false;

-- Indice parcial para el listado de "Explorar": eventos publicados, abiertos y
-- descubribles, ordenados por fecha.
create index events_discoverable_idx
  on public.events (starts_at)
  where discoverable and status = 'published' and event_type = 'open';
