-- Lookup directo de un usuario de auth por email, para reemplazar el escaneo
-- paginado de `auth.admin.listUsers` (hasta 20 paginas de 1000) que hacia
-- `findAuthUserByEmail` en el codigo (spec 11, Epic 27).
--
-- Vive en `public` para ser invocable via PostgREST (`supabase.rpc(...)`), pero
-- se revoca su ejecucion a anon/authenticated y solo se concede al service_role
-- (que usa el cliente admin del servidor). Asi no expone un oraculo de emails.

create or replace function public.find_user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(target_email))
  order by created_at asc
  limit 1;
$$;

revoke execute on function public.find_user_id_by_email(text)
  from public, anon, authenticated;

grant execute on function public.find_user_id_by_email(text) to service_role;
