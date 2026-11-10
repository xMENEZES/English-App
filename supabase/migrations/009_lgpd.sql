-- =====================================================================
-- 009 - LGPD: aceite versionado, consentimento detalhado do responsavel e
--       solicitacoes do titular. Aditiva; pode rodar antes do deploy.
-- Acesso SOMENTE pelo servidor (service_role), exceto o que ja existe em 005.
-- =====================================================================

-- 1) Aceite dos Termos de Uso e da Politica de Privacidade (por versao)
create table if not exists public.aceites_termos (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  versao_termos      text not null,
  versao_privacidade text not null,
  aceito_em          timestamptz not null default now(),
  unique (user_id, versao_termos, versao_privacidade)
);
create index if not exists aceites_termos_user_idx on public.aceites_termos (user_id, aceito_em desc);

-- 2) Registro completo do consentimento do responsavel (alunos menores)
alter table public.classificacao_aluno
  add column if not exists responsavel_nome    text check (responsavel_nome is null or char_length(responsavel_nome) between 2 and 120),
  add column if not exists responsavel_vinculo text check (responsavel_vinculo is null or char_length(responsavel_vinculo) between 2 and 40),
  add column if not exists forma_coleta        text check (forma_coleta is null or forma_coleta in ('termo_assinado')),
  add column if not exists versao_termo        text;

-- 3) Solicitacoes dos titulares (art. 18 da LGPD)
create table if not exists public.solicitacoes_titular (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  teacher_id  uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('acesso', 'correcao', 'exclusao', 'outro')),
  descricao   text not null check (char_length(btrim(descricao)) between 1 and 1000),
  status      text not null default 'aberta' check (status in ('aberta', 'atendida')),
  resposta    text check (resposta is null or char_length(resposta) <= 1000),
  created_at  timestamptz not null default now(),
  atendida_em timestamptz
);
create index if not exists solicitacoes_teacher_idx on public.solicitacoes_titular (teacher_id, status, created_at desc);
create index if not exists solicitacoes_user_idx on public.solicitacoes_titular (user_id, created_at desc);

alter table public.aceites_termos       enable row level security;
alter table public.solicitacoes_titular enable row level security;
revoke all on public.aceites_termos       from authenticated, anon;
revoke all on public.solicitacoes_titular from authenticated, anon;

-- Conferencia
select tablename, rowsecurity from pg_tables where tablename in ('aceites_termos', 'solicitacoes_titular') order by 1;
select column_name from information_schema.columns
where table_name = 'classificacao_aluno' and column_name in ('responsavel_nome', 'responsavel_vinculo', 'forma_coleta', 'versao_termo') order by 1;
