-- =====================================================================
-- 005 - Chat (individual e por turma) + classificacao de aluno (menor/adulto)
-- Aditiva: so cria tabelas/funcoes novas; pode rodar antes do deploy.
-- Requer a migracao 004 (turmas).
-- =====================================================================

-- 1) Classificacao do aluno (controla a liberacao do chat)
--    Sem linha = ainda nao classificado = chat BLOQUEADO.
--    Adulto: menor_idade = false. Menor: menor_idade = true E consentimento_em preenchido.
create table if not exists public.classificacao_aluno (
  aluno_id          uuid primary key references auth.users(id) on delete cascade,
  teacher_id        uuid not null references auth.users(id) on delete cascade,
  menor_idade       boolean not null,
  consentimento_em  timestamptz,
  consentimento_por uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now(),
  check (menor_idade = false or consentimento_em is null or consentimento_por is not null)
);
alter table public.classificacao_aluno enable row level security;
revoke insert, update, delete on public.classificacao_aluno from authenticated, anon;

-- 2) Conversas
create table if not exists public.conversas (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('individual', 'turma')),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  aluno_id   uuid references auth.users(id) on delete cascade,
  turma_id   uuid references public.turmas(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (tipo = 'individual' and aluno_id is not null and turma_id is null) or
    (tipo = 'turma'      and turma_id is not null and aluno_id is null)
  )
);
create unique index if not exists conversas_individual_uq on public.conversas (teacher_id, aluno_id) where tipo = 'individual';
create unique index if not exists conversas_turma_uq on public.conversas (turma_id) where tipo = 'turma';

-- 3) Mensagens (somente texto, ate 2000 caracteres)
create table if not exists public.mensagens (
  id          bigint generated always as identity primary key,
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor_id    uuid not null references auth.users(id) on delete cascade,
  texto       text not null check (char_length(texto) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists mensagens_conversa_idx on public.mensagens (conversa_id, created_at);
create index if not exists mensagens_data_idx on public.mensagens (created_at);

-- 4) Ate quando cada pessoa leu (so para o contador PROPRIO de nao lidas; ninguem ve o dos outros)
create table if not exists public.conversa_leitura (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  lida_ate    timestamptz not null default now(),
  primary key (conversa_id, user_id)
);

alter table public.conversas        enable row level security;
alter table public.mensagens        enable row level security;
alter table public.conversa_leitura enable row level security;

-- 5) Funcoes de acesso (SECURITY DEFINER para nao recursar em RLS)
create or replace function public.aluno_liberado(uid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classificacao_aluno c
    where c.aluno_id = uid
      and (c.menor_idade = false or c.consentimento_em is not null)
  )
$$;

create or replace function public.acesso_conversa(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversas c
    where c.id = cid
      and (
        c.teacher_id = auth.uid()
        or (c.tipo = 'individual' and c.aluno_id = auth.uid() and public.aluno_liberado(auth.uid()))
        or (c.tipo = 'turma' and public.aluno_liberado(auth.uid()) and exists (
              select 1 from public.turma_alunos m where m.turma_id = c.turma_id and m.aluno_id = auth.uid()))
      )
  )
$$;

revoke all on function public.aluno_liberado(uuid) from public, anon;
revoke all on function public.acesso_conversa(uuid) from public, anon;
grant execute on function public.aluno_liberado(uuid) to authenticated;
grant execute on function public.acesso_conversa(uuid) to authenticated;

-- 6) Politicas
create policy "Ver minha classificacao ou dos meus alunos" on public.classificacao_aluno
  for select using (aluno_id = auth.uid() or teacher_id = auth.uid());

create policy "Ver conversas que participo" on public.conversas
  for select using (public.acesso_conversa(id));

create policy "Ler mensagens das minhas conversas" on public.mensagens
  for select using (public.acesso_conversa(conversa_id));

create policy "Ver minha leitura" on public.conversa_leitura
  for select using (user_id = auth.uid());
create policy "Registrar minha leitura" on public.conversa_leitura
  for insert with check (user_id = auth.uid() and public.acesso_conversa(conversa_id));
create policy "Atualizar minha leitura" on public.conversa_leitura
  for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.acesso_conversa(conversa_id));

-- Mensagens e conversas: escrita somente pelo servidor (rotas /api/chat, com service_role)
revoke insert, update, delete on public.conversas from authenticated, anon;
revoke insert, update, delete on public.mensagens from authenticated, anon;
revoke delete on public.conversa_leitura from authenticated, anon;

-- 7) Tempo real: publica novas mensagens (as policies de SELECT filtram quem recebe)
do $$
begin
  alter publication supabase_realtime add table public.mensagens;
exception when duplicate_object then
  raise notice 'mensagens ja esta na publicacao realtime';
end $$;

-- 8) Retencao: apaga mensagens com mais de 12 meses, todo dia as 03:00 (pg_cron)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'limpar_mensagens_12_meses',
    '0 3 * * *',
    $job$ delete from public.mensagens where created_at < now() - interval '12 months' $job$
  );
exception when others then
  raise notice 'pg_cron indisponivel (%). Habilite em Database > Extensions e rode de novo este bloco.', sqlerrm;
end $$;

-- Conferencia
select tablename, policyname, cmd from pg_policies
where tablename in ('classificacao_aluno', 'conversas', 'mensagens', 'conversa_leitura') order by 1, 2;

-- Para conferir a limpeza automatica, rode separadamente (se o pg_cron estiver ativo):
--   select jobname, schedule from cron.job where jobname = 'limpar_mensagens_12_meses';
