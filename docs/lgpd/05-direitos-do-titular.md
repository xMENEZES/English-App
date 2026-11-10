# Procedimento de Atendimento aos Direitos do Titular

**Controlador/encarregado:** Gabriel Menezes — gabrielprojects97@gmail.com · **Data:** 10/11/2026
> Minuta. Prazo adotado: **15 dias** para resposta completa (art. 19, II, da LGPD); confirmação de que há tratamento pode ser imediata.

## Como o pedido chega
1. Tela **Meus Dados** (aluno): o pedido aparece para o professor em "Solicitações dos alunos".
2. E-mail para gabrielprojects97@gmail.com (aluno, responsável ou ex-aluno).
3. Pessoalmente com o professor: registrar o pedido na tela Meus Dados em nome do titular ou anotar por escrito.

**Menores:** o pedido deve vir do **responsável legal**. Conferir a identidade (nome e vínculo já registrados no consentimento; em caso de dúvida, pedir documento).

## Como atender cada direito (art. 18)

| Direito | O que fazer | Onde |
|---|---|---|
| Confirmação e acesso | Orientar a usar **Baixar meus dados** (cópia em JSON) ou gerar e enviar | Meus Dados |
| Correção | Nome de exibição/idade: o próprio usuário edita no Perfil. Nome do cadastro: corrigir no banco (tabela `profiles`) a pedido | Perfil / Supabase |
| Anonimização, bloqueio ou eliminação | Remover Acesso (apaga tudo do aluno) | Controle de Acessos |
| Eliminação de dados tratados com consentimento / retirada do consentimento | Mudar a classificação para "Menor — sem consentimento" (bloqueia chat e foto), remover a foto, e apagar conforme pedido | Controle de Acessos / Perfil |
| Informação sobre compartilhamento | Responder com a lista de operadores da Política de Privacidade (Supabase, Vercel) | Política de Privacidade |
| Oposição / revisão | Analisar caso a caso e responder por escrito | E-mail |

## Fluxo
1. **Receber** e registrar a data (a tela Meus Dados já guarda a data).
2. **Verificar a identidade** do titular ou do responsável.
3. **Atender** conforme a tabela acima.
4. **Responder** por escrito (campo "Resposta" ao marcar como atendida, ou e-mail), dentro de 15 dias.
5. **Arquivar** o registro do atendimento (sem guardar dados desnecessários).

## Pedidos negados
Se o pedido não puder ser atendido (por exemplo, dado que a lei obriga a manter), explicar o motivo por escrito e informar que o titular pode reclamar à ANPD.
