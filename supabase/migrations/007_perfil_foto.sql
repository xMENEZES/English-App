-- =====================================================================
-- 007 - Perfil do usuario (nome de exibicao, idade, foto)
-- Aditiva: so cria tabela e bucket novos; pode rodar antes do deploy.
-- Acesso SOMENTE pelo servidor (rotas /api/perfil, com service_role).
-- =====================================================================

create table if not exists public.perfis_usuario (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  nome_exibicao      text check (nome_exibicao is null or char_length(btrim(nome_exibicao)) between 1 and 40),
  idade              int  check (idade is null or idade between 3 and 120),
  foto_path          text,
  foto_atualizada_em timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.perfis_usuario enable row level security;
revoke all on public.perfis_usuario from authenticated, anon;

-- Bucket PRIVADO para as fotos (servidas por link temporario)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Limite de 256 KB e somente JPEG (se a versao do Storage suportar as colunas)
do $$
begin
  update storage.buckets
     set file_size_limit = 262144, allowed_mime_types = array['image/jpeg']
   where id = 'avatars';
exception when others then
  raise notice 'Nao foi possivel definir limites do bucket (%): o servidor tambem valida tamanho e tipo.', sqlerrm;
end $$;

-- Conferencia
select id, public from storage.buckets where id = 'avatars';
select tablename, rowsecurity from pg_tables where tablename = 'perfis_usuario';
