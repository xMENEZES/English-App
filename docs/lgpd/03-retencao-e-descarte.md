# Política de Retenção e Descarte de Dados

**Controlador:** Gabriel Menezes — gabrielprojects97@gmail.com · **Data:** 10/11/2026
> Minuta. Prazos marcados **[REVISAR]** devem ser confirmados com o jurídico.

## Prazos

| Dado | Prazo de guarda | Como é descartado |
|---|---|---|
| Conta, cadastro, perfil, progresso, respostas (unidades e exercícios do professor) | Enquanto a conta estiver ativa | Ao **Remover Acesso** (Controle de Acessos): o sistema apaga perfil, respostas, mensagens, turmas e a foto |
| Mensagens do chat | **12 meses** | Limpeza automática diária (pg_cron, às 00h de Brasília); o professor também apaga manualmente |
| Foto de perfil | Até troca ou remoção, ou fim da conta | Remoção do arquivo no armazenamento privado |
| Registro do consentimento do responsável (metadados no sistema) | Enquanto o aluno tiver acesso | Apagado automaticamente ao Remover Acesso |
| Termo de consentimento **assinado em papel** | Prazo para defesa de direitos (sugestão: 5 anos) **[REVISAR]** | Destruição segura (picotar) ou exclusão da digitalização |
| Aceite dos Termos/Política | Enquanto a conta existir | Removido com a conta |
| Solicitações do titular | Enquanto a conta existir | Removidas com a conta |
| Registros técnicos dos provedores | Conforme Supabase/Vercel | Automático no provedor |

## Procedimento de exclusão
1. Pedido recebido (Meus Dados ou e-mail) → registrar a data.
2. Para **exclusão de aluno**: Controle de Acessos → Remover Acesso. Conferir que o aluno sumiu da lista.
3. Guardar apenas o que a lei exigir (por exemplo, registro de que o pedido foi atendido) por prazo mínimo **[REVISAR]**.
4. Responder ao titular/responsável confirmando a exclusão.

## Revisões periódicas
- A cada 6 meses: conferir se a limpeza automática de mensagens está ativa (`select jobname, schedule from cron.job;`).
- A cada ano: rever prazos e este documento.
