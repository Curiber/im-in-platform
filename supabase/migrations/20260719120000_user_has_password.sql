-- Deteccion fiable de "la cuenta tiene contrasena" (review PR55/PR56).
--
-- Antes se infería de las identidades del usuario: si existia una del provider
-- `email`, se asumia que habia contrasena. Es incorrecto: Supabase usa el mismo
-- provider `email` para el registro con contrasena Y para magic link / OTP. Un
-- usuario que solo entro por magic link tiene identidad `email` pero
-- `encrypted_password` nulo; con la heuristica vieja se le exigia una contrasena
-- actual inexistente y nunca podia establecer una.
--
-- La unica fuente veraz es auth.users.encrypted_password, que el rol
-- `authenticated` no puede leer. Se expone como un booleano por RPC SECURITY
-- DEFINER, con scope estricto a auth.uid().

create or replace function public.current_user_has_password()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and encrypted_password is not null
      and encrypted_password <> ''
  );
$$;

revoke all on function public.current_user_has_password() from public, anon;

grant execute on function public.current_user_has_password() to authenticated;
