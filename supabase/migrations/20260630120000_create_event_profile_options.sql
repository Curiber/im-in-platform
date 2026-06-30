-- Fase 2.1 (spec 12 §F.3, Epic 31): catalogo de opciones de perfil configurable
-- por evento.
--
-- Hasta ahora las areas/industrias e intereses que el asistente podia elegir
-- vivian hardcodeados en `src/lib/profile-options.ts`, iguales para todos los
-- eventos. Cada vertical (una feria tech, un gremio medico, una incubadora)
-- necesita su propio vocabulario.
--
-- Esta tabla guarda las opciones personalizadas por evento. La resolucion es:
-- si un evento tiene filas para un `kind`, esas son las opciones efectivas; si
-- no tiene ninguna, se cae a los defaults de plataforma (en codigo). Asi un
-- evento sin configurar sigue funcionando exactamente igual que antes.

create type public.profile_option_kind as enum ('industry', 'interest');

create table public.event_profile_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind public.profile_option_kind not null,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint event_profile_options_label_not_blank check (length(trim(label)) > 0),
  -- Sin etiquetas duplicadas dentro del mismo evento/kind.
  unique (event_id, kind, label)
);

create index event_profile_options_event_kind_idx
  on public.event_profile_options (event_id, kind, position);

-- Privilegios de tabla explicitos (no depender de los privilegios automaticos
-- de Supabase, que pueden estar desactivados). RLS sigue gobernando el acceso
-- fila a fila para `authenticated`; `service_role` los ignora y es quien usan
-- las server actions (escrituras) y las paginas publicas (lecturas).
grant select, insert, update, delete
  on table public.event_profile_options to authenticated;
grant select, insert, update, delete
  on table public.event_profile_options to service_role;

alter table public.event_profile_options enable row level security;

-- Lectura: cualquier miembro de la organizacion dueña del evento. Las
-- superficies publicas (registro, perfil) leen via service_role, que ignora RLS;
-- esta policy es para lecturas autenticadas del admin como defensa en
-- profundidad.
create policy "org members read event profile options"
on public.event_profile_options
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_profile_options.event_id
      and app_private.is_organization_member(e.organization_id, auth.uid())
  )
);

-- Escritura: owner/admin/event_admin de la organizacion dueña del evento. Las
-- server actions validan el rol y escriben via service_role; esta policy alinea
-- la regla a nivel de fila por si se escribe con la sesion del usuario.
create policy "org managers manage event profile options"
on public.event_profile_options
for all
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_profile_options.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.id = event_profile_options.event_id
      and app_private.has_organization_role(
        e.organization_id,
        auth.uid(),
        array['owner', 'admin', 'event_admin']::public.organization_role[]
      )
  )
);
