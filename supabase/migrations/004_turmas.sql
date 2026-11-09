-- =====================================================================
-- 004 - Turmas (aditiva: so cria tabelas/funcoes novas; pode rodar antes do deploy)
-- =====================================================================

create table if not exists public.turmas (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  nome       text not null check (char_length(btrim(nome)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (teacher_id, nome)
);

create table if not exists public.turma_alunos (
  turma_id uuid not null references public.turmas(id) on delete cascade,
  aluno_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (turma_id, aluno_id)
);
create index if not exists turma_alunos_aluno_idx on public.turma_alunos (aluno_id);

alter table public.turmas       enable row level security;
alter table public.turma_alunos enable row level security;

-- Funcoes SECURITY DEFINER evitam recursao de RLS entre as duas tabelas
create or replace function public.sou_professor_da_turma(tid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.turmas t where t.id = tid and t.teacher_id = auth.uid()) $$;

create or replace function public.sou_membro_da_turma(tid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.turma_alunos m where m.turma_id = tid and m.aluno_id = auth.uid()) $$;

revoke all on function public.sou_professor_da_turma(uuid) from public, anon;
revoke all on function public.sou_membro_da_turma(uuid) from public, anon;
grant execute on function public.sou_professor_da_turma(uuid) to authenticated;
grant execute on function public.sou_membro_da_turma(uuid) to authenticated;

-- Leitura: professor ve suas turmas; aluno ve as turmas em que esta
create policy "Ver turmas proprias ou onde sou membro" on public.turmas
  for select using (teacher_id = auth.uid() or public.sou_membro_da_turma(id));

create policy "Ver membros da propria turma" on public.turma_alunos
  for select using (aluno_id = auth.uid() or public.sou_professor_da_turma(turma_id));

-- Escrita: somente pelo servidor (rotas /api/turmas, com service_role)
revoke insert, update, delete on public.turmas from authenticated, anon;
revoke insert, update, delete on public.turma_alunos from authenticated, anon;

-- Conferencia
select tablename, policyname, cmd from pg_policies
where tablename in ('turmas', 'turma_alunos') order by 1, 2;
