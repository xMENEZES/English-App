# Relatório de Impacto à Proteção de Dados Pessoais (RIPD) — versão simplificada

**Controlador:** Gabriel Menezes — Niterói/RJ — gabrielprojects97@gmail.com
**Data:** 10/11/2026 · **Revisão sugerida:** a cada nova funcionalidade e, no mínimo, uma vez por ano
> Minuta. Pontos **[REVISAR]** aguardam conferência jurídica.

## 1. Por que este relatório
O sistema trata dados de **crianças e adolescentes** (foto, idade, mensagens, desempenho). Isso eleva o risco e justifica avaliar os impactos (art. 38 da LGPD).

## 2. Descrição do tratamento
Plataforma de exercícios de inglês com professor, turmas e chat. Ver o ROPA (`01-ropa.md`) para o inventário completo.

## 3. Necessidade e proporcionalidade
| Dado | Necessário? | Medida de minimização |
|---|---|---|
| E-mail, nome, progresso, respostas | Sim, para o serviço | — |
| Nome de exibição, idade, foto | Não, opcionais | Podem ficar em branco; foto só com consentimento; foto vista só por aluno e professor |
| Mensagens | Sim, para a comunicação do curso | Retenção de 12 meses; professor pode apagar; links não clicáveis; sem anexos |
| Gravação de voz (até 60 s) | Não, é opcional por exercício | Só com consentimento (menores: termo v2.0); sem transcrição nem identificação; ouvida só por aluno e professor; 12 meses; regravar apaga a anterior |
| IP e navegador | Parcialmente | Tratados apenas pelos provedores, sem uso para perfilamento |

## 4. Riscos identificados e medidas

| Risco | Probabilidade | Impacto | Medida existente | Risco residual |
|---|---|---|---|---|
| Acesso indevido a dados de alunos por outro usuário | Baixa | Alto | Papel do professor em `app_metadata`; RLS e verificação no servidor; teste de acesso entre contas | Baixo |
| Vazamento de foto de menor | Baixa | Alto | Bucket privado, link temporário, foto restrita ao aluno e ao professor, apagada ao remover o aluno | Baixo |
| Contato inadequado de terceiros com menores | Baixa | Alto | Só entram usuários convidados pelo professor; alunos conversam somente com o professor e a turma (nunca em privado entre si); professor modera | Baixo |
| Mensagens ofensivas entre alunos (bullying) | Média | Médio | Moderação (apagar mensagens), Termos de Uso, suspensão de acesso | Médio |
| Uso de dados de menor sem consentimento | Baixa | Alto | Chat e foto bloqueados até o consentimento ser registrado | Baixo |
| Vazamento ou uso indevido de gravação de voz de menor | Baixa | Alto | Bucket privado, link temporário (1 h), acesso restrito ao aluno e ao professor, retenção de 12 meses com limpeza diária, apagada ao remover o aluno/exercício, bloqueio sem consentimento v2.0 | Baixo |
| Gravação captar terceiros ou informações pessoais no ambiente | Média | Médio | Orientação nos Termos e na tela de gravação; o aluno ouve antes de enviar; limite de 60 s; professor pode apagar o exercício | Médio |
| Cópia digitalizada do termo (contém documento do responsável) exposta | Baixa | Alto | Anexo opcional; bucket privado; só o professor acessa; link de 5 minutos; apagada se o consentimento for retirado | Baixo |
| Perda de dados | Baixa | Médio | Backups e alta disponibilidade do provedor (verificar plano) **[REVISAR]** | Médio |
| Transferência internacional sem garantias | Média | Médio | Servidores no Brasil; operadores com termos de tratamento **[REVISAR]** | Médio |
| Pedidos de titulares não atendidos | Média | Médio | Tela Meus Dados; procedimento com prazo de 15 dias | Baixo |
| Credenciais fracas ou compartilhadas | Média | Médio | Senha forte obrigatória; orientação nos Termos | Médio |

## 5. Conclusão
Com as medidas listadas, o risco residual é considerado **aceitável** para as funcionalidades atuais, **desde que** o consentimento dos responsáveis seja registrado antes de liberar chat e foto de menores, e que os termos assinados sejam guardados com segurança. A gravação de voz (versão 2.0) está incluída nesta avaliação. **Videochamada, gravação de vídeo e transcrição ou identificação por voz exigem novo RIPD antes de serem ativadas.**

## 6. Aprovação
Responsável: Gabriel Menezes — Data: ____/____/______ — Assinatura: __________________
