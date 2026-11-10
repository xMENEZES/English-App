# Estrutura de LGPD — English Step By Step

> **Importante:** estes documentos são **minutas** preparadas para organizar o tratamento de dados do sistema. Não são parecer jurídico. Como o sistema trata dados de **menores de idade** (foto, idade, mensagens), recomenda-se **revisão por advogado ou especialista em LGPD** antes de considerá-los definitivos. Os pontos que mais pedem conferência estão marcados como **[REVISAR]**.

**Controlador e encarregado:** Gabriel Menezes (pessoa física) — Niterói/RJ — gabrielprojects97@gmail.com

## O que existe

| Onde | Documento | Para quê |
|---|---|---|
| Sistema (`/privacidade`) | Política de Privacidade | Informar titulares e responsáveis (arts. 6º, 9º e 14 da LGPD) |
| Sistema (`/termos`) | Termos de Uso | Regras de uso, conduta e moderação |
| Sistema (`/termo-responsavel`) | Termo de Consentimento do Responsável | Para **imprimir e assinar**; base do art. 14, §1º, para alunos menores |
| Sistema (`/aceite`) | Aceite versionado | Registra qual versão dos Termos/Política cada pessoa aceitou e quando |
| Sistema (`/meus-dados`) | Direitos do titular | Baixar os próprios dados e fazer solicitações (art. 18) |
| Sistema (Controle de Acessos) | Registro do consentimento | Nome e vínculo do responsável, data, forma e versão do termo |
| `docs/lgpd/01-ropa.md` | Registro das Operações de Tratamento | Inventário exigido pelo art. 37 |
| `docs/lgpd/02-ripd.md` | Relatório de Impacto simplificado | Avaliação de riscos (dados de menores e imagem) |
| `docs/lgpd/03-retencao-e-descarte.md` | Política de Retenção e Descarte | Prazos e como apagar |
| `docs/lgpd/04-incidentes.md` | Plano de Resposta a Incidentes | O que fazer em caso de vazamento (art. 48) |
| `docs/lgpd/05-direitos-do-titular.md` | Procedimento de Direitos do Titular | Como atender pedidos dentro do prazo |

## Versões
As versões ficam em `lib/lgpd/config.js`. Ao mudar o texto de um documento, **aumente a versão**: todos os usuários precisarão aceitar de novo no próximo acesso. O termo do responsável tem versão própria; o sistema registra qual versão cada responsável assinou.

## Fluxo para alunos menores
1. O professor imprime o termo em `/termo-responsavel`, o responsável preenche e assina.
2. O professor **guarda o papel** (ele é a prova do consentimento).
3. No Controle de Acessos, o professor escolhe "Menor — consentimento do responsável registrado" para o aluno e informa nome e vínculo do responsável.
4. Só então o chat e a foto do aluno são liberados. Sem registro, ficam bloqueados.
5. Se o responsável retirar o consentimento: mudar a classificação para "Menor — sem consentimento" (bloqueia chat e foto) e, se pedido, remover o acesso (apaga os dados).

## Pendências e decisões para você
- [ ] Revisão jurídica das minutas (principalmente as marcações **[REVISAR]**).
- [ ] Decidir se consta o **CPF** do controlador no ROPA interno (não é exibido nas páginas públicas).
- [ ] Guardar os termos assinados em local seguro (papel ou digitalização protegida) pelo prazo definido em `03-retencao-e-descarte.md`.
- [ ] Antes de ativar **gravação de áudio** ou **videochamada**: atualizar a Política, criar nova versão do termo (v2) e pedir novo consentimento dos responsáveis.
- [ ] Conferir se os contratos/termos dos operadores (Supabase e Vercel) cobrem a transferência internacional (art. 33) **[REVISAR]**.
- [ ] Avaliar com o jurídico a necessidade de nomear formalmente o encarregado e se o controlador se enquadra como agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022) **[REVISAR]**.
