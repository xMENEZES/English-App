# Registro das Operações de Tratamento de Dados Pessoais (ROPA)

**Controlador:** Gabriel Menezes, pessoa física — Niterói/RJ — gabrielprojects97@gmail.com
**CPF do controlador:** [PREENCHER — uso interno]
**Encarregado:** o próprio controlador (mesmo contato)
**Sistema:** English Step By Step (https://english-step-by-step.vercel.app)
**Titulares:** alunos (inclusive menores de idade) e o professor
**Última atualização:** 10/11/2026

## Operações de tratamento

| # | Operação | Dados | Titulares | Finalidade | Base legal | Compartilhamento | Retenção |
|---|---|---|---|---|---|---|---|
| 1 | Conta e login | e-mail, senha (hash), data de criação | alunos, professor | Acesso seguro | Execução de contrato — art. 7º, V | Supabase (operador) | Enquanto a conta existir |
| 2 | Cadastro | nome completo | alunos, professor | Identificar o aluno | Art. 7º, V | Supabase | Enquanto a conta existir |
| 3 | Perfil | nome de exibição, idade, foto (opcionais) | alunos, professor | Personalização | Consentimento — art. 7º, I; menores: art. 14, §1º | Supabase (banco e Storage privado) | Até troca/remoção ou fim da conta |
| 4 | Exercícios das unidades | unidade, pergunta, resposta, acerto, data | alunos | Corrigir e acompanhar o progresso | Art. 7º, V | Supabase; professor | Enquanto a conta existir |
| 5 | Exercícios do professor | respostas (inclusive texto livre), correção e comentários | alunos | Corrigir e dar retorno | Art. 7º, V | Supabase; professor | Enquanto a conta existir |
| 6 | Chat | texto, autor, data, marcação de leitura própria | alunos, professor | Comunicação | Consentimento — art. 7º, I; menores: art. 14, §1º | Supabase; professor; colegas (turma) | 12 meses (limpeza automática) |
| 7 | Turmas e vínculo | turma, professor, classificação adulto/menor | alunos | Organização e controle de acesso | Art. 7º, V e II (art. 14) | Supabase; professor | Enquanto a conta existir |
| 8 | Consentimento do responsável | nome e vínculo do responsável, data, forma, versão do termo; termo assinado em papel | responsáveis de menores | Comprovar o consentimento | Art. 7º, II e VI | Supabase (metadados); papel com o controlador | Metadados no sistema: enquanto o aluno tiver acesso (apagados ao remover). Termo em papel: prazo para defesa de direitos (sugestão: 5 anos) **[REVISAR]** |
| 9 | Aceite dos Termos/Política | versão, data | alunos, professor | Comprovar o aceite | Art. 7º, VI | Supabase | Enquanto a conta existir |
| 10 | Solicitações do titular | tipo, descrição, resposta, datas | alunos | Atender direitos (art. 18) | Art. 7º, II | Supabase; professor | Enquanto a conta existir |
| 11 | Registros técnicos | IP, navegador, horários | todos | Segurança e funcionamento | Legítimo interesse — art. 7º, IX **[REVISAR]** | Vercel, Supabase | Conforme os provedores |

## Operadores (suboperadores do controlador)
| Operador | Serviço | Local | Observação |
|---|---|---|---|
| Supabase | Banco de dados, autenticação, e-mail de convite/redefinição, Storage de fotos | Região São Paulo (sa-east-1); empresa nos EUA | Verificar o DPA do provedor **[REVISAR]** |
| Vercel | Hospedagem do site e funções | Funções em São Paulo (gru1); CDN global; empresa nos EUA | Verificar o DPA do provedor **[REVISAR]** |

## Transferência internacional (art. 33)
Os operadores são empresas dos EUA. Verificar o mecanismo (cláusulas contratuais padrão ou equivalente) e registrar aqui a conclusão: [PREENCHER].

## Medidas de segurança (resumo)
HTTPS e cabeçalhos de segurança; senhas com hash (Supabase Auth); autorização por papel no servidor e no banco (RLS); fotos em bucket privado com link temporário; correção de exercícios no servidor; limite de frequência de mensagens; remoção de dados ao excluir o aluno; política de senha forte; repositório sem segredos (chaves só em variáveis de ambiente).

## Funcionalidades NÃO ativas (exigem nova avaliação antes de ligar)
Resposta por áudio; videochamada; transcrição automática de voz.
