-- =====================================================================
-- 003 - Isolamento por professor + travas em profiles + resultados so via servidor
-- ORDEM: rode DEPOIS do deploy do codigo novo em producao
-- (o codigo antigo ainda grava resultados direto do navegador e envia 'role' no perfil).
-- =====================================================================

-- 1) Funcao que diz se um usuario e aluno do professor logado.
--    SECURITY DEFINER porque o papel authenticated nao le auth.users.
create or replace function public.is_my_student(uid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = uid
      and u.raw_app_meta_data->>'invited_by' = auth.uid()::text
  )
$$;
revoke all on function public.is_my_student(uuid) from public, anon;
grant execute on function public.is_my_student(uuid) to authenticated;

-- 2) Professor ve SOMENTE os alunos que convidou
drop policy if exists "Professor ve todos os perfis" on public.profiles;
drop policy if exists "Professor ve todas as respostas" on public.exercise_results;

create policy "Professor ve perfis dos seus alunos" on public.profiles
  for select using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher'
    and public.is_my_student(id)
  );

create policy "Professor ve respostas dos seus alunos" on public.exercise_results
  for select using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher'
    and public.is_my_student(user_id)
  );

-- 3) Resultados passam a ser gravados SOMENTE pelo servidor (/api/exercicios/resultado),
--    que corrige a resposta. Remove a gravacao direta pelo navegador.
drop policy if exists "Aluno salva proprias respostas" on public.exercise_results;
revoke insert, update, delete on public.exercise_results from authenticated, anon;

-- 4) profiles: o proprio usuario so pode gravar id e full_name (nunca role)
alter table public.profiles alter column role set default 'student';
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, full_name) on public.profiles to authenticated;
grant update (id, full_name) on public.profiles to authenticated;

-- 5) Normaliza perfis ja adulterados (role de quem nao e professor volta a 'student')
update public.profiles p set role = 'student'
where not exists (
  select 1 from auth.users u
  where u.id = p.id and u.raw_app_meta_data->>'role' = 'teacher'
);

-- Conferencia
select tablename, policyname, cmd from pg_policies
where tablename in ('profiles','exercise_results') order by tablename, policyname;
