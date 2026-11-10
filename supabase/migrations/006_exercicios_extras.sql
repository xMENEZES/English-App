-- =====================================================================
-- 006 - Exercicios proprios do professor (listas, destinatarios, resultados)
-- Aditiva: so cria tabelas novas; pode rodar antes do deploy.
-- Requer 004 (turmas). Acesso SOMENTE pelo servidor (rotas /api/extras, service_role).
-- =====================================================================

create table if not exists public.listas_extras (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  titulo     text not null check (char_length(btrim(titulo)) between 1 and 80),
  unidade    int check (unidade between 1 and 30),          -- null = fora das unidades
  publicada  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists listas_extras_teacher_idx on public.listas_extras (teacher_id);

create table if not exists public.listas_extras_destinatarios (
  id       bigint generated always as identity primary key,
  lista_id uuid not null references public.listas_extras(id) on delete cascade,
  tipo     text not null check (tipo in ('aluno', 'turma')),
  aluno_id uuid references auth.users(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete cascade,
  check (
    (tipo = 'aluno' and aluno_id is not null and turma_id is null) or
    (tipo = 'turma' and turma_id is not null and aluno_id is null)
  )
);
create unique index if not exists dest_aluno_uq on public.listas_extras_destinatarios (lista_id, aluno_id) where tipo = 'aluno';
create unique index if not exists dest_turma_uq on public.listas_extras_destinatarios (lista_id, turma_id) where tipo = 'turma';
create index if not exists dest_aluno_idx on public.listas_extras_destinatarios (aluno_id);
create index if not exists dest_turma_idx on public.listas_extras_destinatarios (turma_id);

create table if not exists public.exercicios_extras (
  id           uuid primary key default gen_random_uuid(),
  lista_id     uuid not null references public.listas_extras(id) on delete cascade,
  ordem        int not null default 0,
  -- 'audio' ja e permitido aqui para a proxima etapa (resposta por audio)
  tipo         text not null check (tipo in ('mc', 'fill', 'translate', 'livre', 'audio')),
  enunciado    text not null check (char_length(btrim(enunciado)) between 1 and 600),
  opcoes       jsonb,          -- mc: lista de textos
  resposta     text,           -- mc/fill/translate: resposta certa
  alternativas jsonb,          -- fill/translate: outras respostas aceitas
  created_at   timestamptz not null default now()
);
create index if not exists exercicios_extras_lista_idx on public.exercicios_extras (lista_id, ordem);

create table if not exists public.resultados_extras (
  id             bigint generated always as identity primary key,
  exercicio_id   uuid not null references public.exercicios_extras(id) on delete cascade,
  lista_id       uuid not null references public.listas_extras(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  enunciado      text not null,
  resposta       text,
  resposta_certa text,
  correta        boolean,                                   -- null enquanto pendente
  status         text not null default 'corrigido' check (status in ('corrigido', 'pendente')),
  avaliacao      text check (avaliacao in ('adequada', 'melhorar')),
  comentario     text check (char_length(comentario) <= 1000),
  corrigido_em   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists resultados_extras_user_idx on public.resultados_extras (user_id, lista_id, created_at desc);
create index if not exists resultados_extras_pend_idx on public.resultados_extras (lista_id) where status = 'pendente';

-- RLS ligada e SEM politicas + sem privilegios = ninguem acessa direto pelo navegador
alter table public.listas_extras               enable row level security;
alter table public.listas_extras_destinatarios enable row level security;
alter table public.exercicios_extras           enable row level security;
alter table public.resultados_extras           enable row level security;
revoke all on public.listas_extras               from authenticated, anon;
revoke all on public.listas_extras_destinatarios from authenticated, anon;
revoke all on public.exercicios_extras           from authenticated, anon;
revoke all on public.resultados_extras           from authenticated, anon;

-- Conferencia
select tablename, rowsecurity from pg_tables
where tablename in ('listas_extras', 'listas_extras_destinatarios', 'exercicios_extras', 'resultados_extras') order by 1;
