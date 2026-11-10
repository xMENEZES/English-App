-- =====================================================================
-- 010 - Resposta por audio e guarda do termo assinado (digitalizacao)
-- Aditiva; pode rodar antes do deploy. Acesso SOMENTE pelo servidor (service_role).
-- Requer 005 (classificacao_aluno), 006 (resultados_extras) e 009.
-- =====================================================================

-- 1) Resultados com audio
alter table public.resultados_extras
  add column if not exists audio_path    text,
  add column if not exists audio_mime    text,
  add column if not exists audio_duracao int check (audio_duracao is null or audio_duracao between 1 and 120);

create index if not exists resultados_extras_audio_idx on public.resultados_extras (created_at) where audio_path is not null;

-- 2) Termo assinado digitalizado (opcional), guardado no bucket privado
alter table public.classificacao_aluno
  add column if not exists termo_arquivo_path text;

-- 3) Buckets PRIVADOS (servidos por link temporario)
insert into storage.buckets (id, name, public) values ('audios', 'audios', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('termos-assinados', 'termos-assinados', false) on conflict (id) do nothing;

do $$
begin
  update storage.buckets set file_size_limit = 1048576,
         allowed_mime_types = array['audio/webm', 'audio/ogg', 'audio/mp4']
   where id = 'audios';
  update storage.buckets set file_size_limit = 5242880,
         allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
   where id = 'termos-assinados';
exception when others then
  raise notice 'Nao foi possivel definir limites dos buckets (%): o servidor tambem valida tamanho e tipo.', sqlerrm;
end $$;

-- Conferencia
select id, public from storage.buckets where id in ('audios', 'termos-assinados') order by 1;
select column_name from information_schema.columns
where table_name in ('resultados_extras', 'classificacao_aluno')
  and column_name in ('audio_path', 'audio_mime', 'audio_duracao', 'termo_arquivo_path') order by 1;
