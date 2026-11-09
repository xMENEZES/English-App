-- =====================================================================
-- 001 - Papel de professor em app_metadata (somente servidor altera)
-- Rodar no Supabase: SQL Editor. Execute ANTES do deploy desta branch em produção.
-- =====================================================================

-- PASSO 0 (diagnóstico, só leitura): veja quem hoje tem role=teacher em user_metadata.
-- Qualquer aluno que apareça aqui e NÃO seja professor de verdade se autopromoveu.
select id, email, raw_user_meta_data->>'role' as role_user_meta,
       raw_app_meta_data->>'role' as role_app_meta
from auth.users
where raw_user_meta_data->>'role' is not null;

-- PASSO 1: defina o(s) e-mail(s) dos professores REAIS e rode o bloco.
-- (Não promovemos por user_metadata, justamente porque ele é falsificável.)
do $$
declare
  professores text[] := array['EMAIL_DO_PROFESSOR@exemplo.com'];  -- << EDITE AQUI
  prof_id uuid;
begin
  -- Promove os professores reais, preservando slot_limit se existir
  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
         || jsonb_strip_nulls(jsonb_build_object(
              'role', 'teacher',
              'slot_limit', u.raw_user_meta_data->'slot_limit'))
   where lower(u.email) = any (select lower(x) from unnest(professores) x);

  -- Com UM único professor: vincula os alunos já existentes a ele.
  if (select count(*) from auth.users where raw_app_meta_data->>'role' = 'teacher') = 1 then
    select id into prof_id from auth.users where raw_app_meta_data->>'role' = 'teacher';
    update auth.users u
       set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('role', 'student', 'invited_by', prof_id)
     where u.id <> prof_id
       and coalesce(u.raw_app_meta_data->>'role', '') <> 'teacher';
  else
    raise notice 'Há % professores: vincule os alunos manualmente (app_metadata.invited_by).',
      (select count(*) from auth.users where raw_app_meta_data->>'role' = 'teacher');
  end if;

  -- Remove o campo forjável de user_metadata de todos
  update auth.users
     set raw_user_meta_data = raw_user_meta_data - 'role' - 'slot_limit'
   where raw_user_meta_data ? 'role' or raw_user_meta_data ? 'slot_limit';
end $$;

-- PASSO 2 (conferência):
select email, raw_app_meta_data->>'role' as role, raw_app_meta_data->>'invited_by' as invited_by
from auth.users order by role, email;

-- PASSO 3 (IMPORTANTE - RLS): liste as policies atuais. Se alguma usar
-- auth.jwt() -> 'user_metadata' ->> 'role', troque por 'app_metadata', senão o
-- painel do professor (correção) deixa de funcionar.
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies where tablename in ('profiles', 'exercise_results');

-- Observação: quem já está logado precisa SAIR e ENTRAR de novo para o token
-- receber o novo app_metadata.
