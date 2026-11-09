-- =====================================================================
-- 002 - Policies de leitura do professor passam a usar app_metadata
-- (user_metadata é editável pelo usuário e não pode ser usado em RLS)
-- =====================================================================
drop policy if exists "Professor ve todos os perfis" on public.profiles;
drop policy if exists "Professor ve todas as respostas" on public.exercise_results;

create policy "Professor ve todos os perfis" on public.profiles
  for select using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher');

create policy "Professor ve todas as respostas" on public.exercise_results
  for select using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher');

-- Conferência:
select tablename, policyname, qual from pg_policies
where tablename in ('profiles','exercise_results') and policyname like 'Professor%';
