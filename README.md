# English Step By Step

Plataforma de exercícios de inglês para alunos de um professor. O professor convida os alunos por e-mail, acompanha as respostas de cada um e controla os acessos.

- **Alunos:** 30 unidades com 600 exercícios (múltipla escolha, completar e tradução); o progresso fica salvo por usuário.
- **Professor:** Painel de Alunos (respostas por unidade) e Controle de Acessos (convidar, remover, redefinir senha, limite de vagas).

## Stack
Next.js 14 (Pages Router) · React 18 · Supabase (Auth + Postgres com RLS) · Vercel.

## Como rodar localmente
```bash
npm install
cp .env.local.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

### Variáveis de ambiente
| Variável | Onde usa | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor | chave pública (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | nunca expor nem versionar; configure também no ambiente *Preview* da Vercel |
| `NEXT_PUBLIC_SITE_URL` | convites e redefinição | URL pública do site |

## Banco de dados (Supabase)
Tabelas: `profiles` (id, full_name, role) e `exercise_results`. As migrações em `supabase/migrations/` devem ser rodadas **em ordem** no SQL Editor:

1. `001_papel_app_metadata.sql` – coloca o papel de professor em `app_metadata` (edite o e-mail do professor antes de rodar).
2. `002_rls_app_metadata.sql` – policies do professor passam a usar `app_metadata`.
3. `003_isolamento_e_travas.sql` – professor vê só os seus alunos, `profiles` sem escrita de `role`, resultados gravados só pelo servidor. Rode **depois** do deploy do código correspondente.

## Segurança (resumo)
- O papel `teacher` fica em `app_metadata` (só o servidor altera). `user_metadata` é editável pelo usuário e **nunca** deve ser usado para autorização, nem em RLS.
- Cada aluno é vinculado ao professor que o convidou (`app_metadata.invited_by`); as rotas `/api/admin/*` só operam sobre os próprios alunos.
- As respostas são corrigidas no servidor (`/api/exercicios/resultado`) contra o gabarito `public/exercises.js`; o navegador não grava `is_correct`.
- Senha: mínimo de 8 caracteres, com número e caractere especial (configure a mesma regra em Supabase → Authentication).
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options etc.) em `next.config.js`.

## Fluxo de trabalho
Todo ajuste é feito em branch (`fix/...`, `feature/...`, `chore/...`), testado no deploy de preview da Vercel e só então integrado à `main`. A `main` publica em produção. Não faça commit direto na `main`.

## Estrutura
```
pages/            telas (login, exercícios, correção, controle de acessos, auth) e rotas /api
components/       componentes reutilizáveis (campo de senha)
lib/              clientes Supabase, autorização, correção de exercícios, regra de senha
public/exercises.js   conteúdo e motor dos exercícios
supabase/migrations/  SQL do banco
```
