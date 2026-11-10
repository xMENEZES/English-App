-- =====================================================================
-- 008 - Consulta rapida dos alunos de um professor (desempenho)
-- Aditiva e segura: o codigo funciona mesmo sem esta migracao (usa o metodo antigo),
-- mas fica bem mais rapido depois dela. Somente o servidor (service_role) pode chamar.
-- =====================================================================

create or replace function public.alunos_do_professor(tid uuid)
returns table (id uuid, email text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select u.id, u.email::text, u.created_at
  from auth.users u
  where u.raw_app_meta_data->>'invited_by' = tid::text
    and coalesce(u.raw_app_meta_data->>'role', '') <> 'teacher'
$$;

revoke all on function public.alunos_do_professor(uuid) from public, anon, authenticated;
grant execute on function public.alunos_do_professor(uuid) to service_role;

-- Conferencia: deve listar 1 funcao
select proname from pg_proc where proname = 'alunos_do_professor';
