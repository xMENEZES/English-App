import { CONTROLADOR as C, VERSOES } from './config'

// Politica de Privacidade (minuta). Ao alterar, aumente VERSOES.privacidade em config.js.
export const POLITICA = {
  titulo: 'Política de Privacidade',
  versao: VERSOES.privacidade,
  aviso: 'Este texto foi escrito em linguagem simples para que alunos e responsáveis entendam como os dados são tratados. Pontos marcados como [REVISAR] aguardam conferência jurídica.',
  secoes: [
    {
      t: '1. Quem somos',
      p: [
        `O ${C.servico} é uma plataforma de exercícios de inglês, com acompanhamento de um professor, mensagens e exercícios próprios do professor.`,
        `O controlador dos dados pessoais (quem decide como eles são tratados) é ${C.nome}, ${C.tipo}, de ${C.cidade}/${C.uf}. Para qualquer assunto sobre privacidade, e também como encarregado pelo tratamento de dados, fale com: ${C.email}.`
      ]
    },
    {
      t: '2. Quais dados tratamos e para quê',
      tabela: {
        cab: ['Dados', 'Para quê', 'Base legal (LGPD)'],
        linhas: [
          ['E-mail e senha de acesso (a senha é guardada de forma criptografada)', 'Criar e proteger a sua conta e permitir o login', 'Execução do serviço contratado (art. 7º, V)'],
          ['Nome informado no cadastro', 'Identificar o aluno para o professor', 'Execução do serviço (art. 7º, V)'],
          ['Nome de exibição, idade e foto (opcionais)', 'Personalizar o perfil e identificar o aluno', 'Consentimento (art. 7º, I). Para menores, consentimento do responsável (art. 14, §1º)'],
          ['Respostas aos exercícios, acertos, progresso e datas', 'Corrigir, mostrar o progresso e permitir o acompanhamento pelo professor', 'Execução do serviço (art. 7º, V)'],
          ['Respostas aos exercícios do professor (inclusive textos livres) e os comentários de correção', 'Permitir que o professor corrija e dê retorno', 'Execução do serviço (art. 7º, V)'],
          ['Mensagens do chat (individual e da turma): texto, autor e data', 'Tirar dúvidas e trocar mensagens com o professor e a turma', 'Consentimento (art. 7º, I); para menores, do responsável (art. 14, §1º)'],
          ['Turma, vínculo com o professor e classificação (adulto ou menor)', 'Organizar o acesso e liberar o chat e a foto somente quando permitido', 'Execução do serviço (art. 7º, V) e cumprimento do art. 14 da LGPD (art. 7º, II)'],
          ['Registro do consentimento do responsável (nome, vínculo, data, forma e versão do termo)', 'Comprovar que o consentimento foi dado', 'Cumprimento de obrigação legal e exercício regular de direitos (art. 7º, II e VI)'],
          ['Aceite dos Termos e desta Política (versão e data)', 'Comprovar o aceite', 'Exercício regular de direitos (art. 7º, VI)'],
          ['Dados técnicos de acesso (como endereço IP e tipo de navegador), tratados pelos provedores de hospedagem', 'Segurança, prevenção de abusos e funcionamento do serviço', 'Legítimo interesse (art. 7º, IX) [REVISAR]']
        ]
      }
    },
    {
      t: '3. Crianças e adolescentes',
      p: [
        'Podem usar o serviço pessoas de qualquer idade, inclusive crianças e adolescentes. Tratamos os dados deles sempre no seu melhor interesse (art. 14 da LGPD).',
        'Para alunos menores de 18 anos, exigimos o consentimento específico e em destaque de pelo menos um dos pais ou do responsável legal. O professor registra esse consentimento no sistema a partir de um termo assinado.'
      ],
      l: [
        'Enquanto o consentimento não estiver registrado, o aluno menor não usa o chat nem envia foto.',
        'Pedimos apenas os dados necessários para a atividade. Nome de exibição, idade e foto são opcionais.',
        'A foto de um aluno é vista somente por ele e pelo professor, nunca pelos colegas.',
        'O responsável pode, a qualquer momento, pedir acesso, correção ou exclusão dos dados do aluno, ou retirar o consentimento (veja a seção 8).'
      ]
    },
    {
      t: '4. Quem pode ver os seus dados',
      l: [
        'O professor vê os dados dos seus alunos: cadastro, progresso, respostas, foto, idade, as conversas das quais participa e o desempenho nos exercícios do professor.',
        'Os colegas de turma veem apenas o seu nome de exibição e as mensagens que você escrever no chat da turma. Eles não veem foto, idade, e-mail nem respostas.',
        'Os provedores de tecnologia (seção 5) tratam os dados somente para fazer o serviço funcionar, em nome do controlador.',
        'Não vendemos dados, não fazemos publicidade e não usamos ferramentas de análise de comportamento (analytics). Só compartilhamos dados com autoridades quando a lei exigir.'
      ]
    },
    {
      t: '5. Prestadores de serviço (operadores) e transferência internacional',
      tabela: {
        cab: ['Prestador', 'O que faz', 'Onde'],
        linhas: [
          ['Supabase', 'Banco de dados, autenticação (login), envio dos e-mails de convite e de redefinição de senha e armazenamento das fotos', 'Servidores em São Paulo (Brasil); a empresa é dos Estados Unidos'],
          ['Vercel', 'Hospedagem do site e das funções do servidor', 'Funções em São Paulo; a rede de distribuição de conteúdo pode processar dados em outros países; a empresa é dos Estados Unidos']
        ]
      },
      p: [
        'Como esses prestadores são empresas estrangeiras, pode haver transferência internacional de dados (art. 33 da LGPD). Ela ocorre com base nas garantias contratuais oferecidas por eles [REVISAR].'
      ]
    },
    {
      t: '6. Por quanto tempo guardamos os dados',
      tabela: {
        cab: ['Dado', 'Prazo'],
        linhas: [
          ['Conta, perfil, progresso e respostas aos exercícios', 'Enquanto a conta estiver ativa. Quando o acesso é removido, esses dados são apagados'],
          ['Mensagens do chat', 'Apagadas automaticamente após 12 meses (o professor também pode apagar mensagens a qualquer momento)'],
          ['Foto de perfil', 'Até você trocá-la ou removê-la, ou até o acesso ser removido'],
          ['Registro do consentimento do responsável e aceite dos termos', 'Pelo período em que o tratamento durar e pelo prazo necessário para comprovar o cumprimento da lei [REVISAR prazo]'],
          ['Solicitações feitas por você sobre os seus dados', 'Enquanto a conta estiver ativa'],
          ['Registros técnicos dos provedores (segurança)', 'Conforme a política de cada provedor']
        ]
      }
    },
    {
      t: '7. Armazenamento no seu navegador',
      p: [
        'Usamos apenas o que é necessário ao funcionamento: a sessão de login, o progresso das unidades e uma cópia temporária do seu perfil para o menu abrir mais rápido. Não usamos cookies de publicidade nem de rastreamento. Por isso não há faixa de consentimento de cookies.'
      ]
    },
    {
      t: '8. Seus direitos',
      p: ['Pela LGPD (art. 18), você, ou o responsável pelo aluno menor, pode pedir a qualquer momento:'],
      l: [
        'confirmação de que tratamos dados e acesso a eles (você pode baixar uma cópia na tela Meus Dados);',
        'correção de dados incompletos, errados ou desatualizados;',
        'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;',
        'eliminação dos dados tratados com base no consentimento, e retirada do consentimento;',
        'informação sobre com quem os dados são compartilhados;',
        'revisão de decisões e oposição a tratamentos que descumpram a lei.'
      ]
    },
    {
      t: '9. Como exercer os seus direitos',
      p: [
        `Use a tela Meus Dados, dentro do sistema, ou escreva para ${C.email}. Respondemos em até 15 dias. Para alunos menores, o pedido deve ser feito pelo responsável legal. Também é possível reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`
      ]
    },
    {
      t: '10. Segurança',
      l: [
        'Conexão protegida (HTTPS) e senhas guardadas de forma criptografada.',
        'Cada pessoa só acessa o que é seu: o controle é feito no servidor e no banco de dados, e não apenas na tela.',
        'Fotos ficam em área privada e são exibidas por links temporários.',
        'Limites de uso e validações para evitar abusos, como mensagens em excesso.',
        'Em caso de incidente de segurança que possa causar risco ou dano relevante, comunicaremos os titulares afetados e a ANPD, conforme a lei.'
      ],
      p: ['Nenhum sistema é totalmente imune a falhas, mas trabalhamos para reduzir esse risco continuamente.']
    },
    {
      t: '11. Alterações desta Política',
      p: [
        'Podemos atualizar esta Política. Cada versão tem um número. Quando houver mudança relevante, você será avisado e precisará aceitar a nova versão para continuar usando o sistema. Novos recursos que tratem dados de forma diferente (por exemplo, gravação de áudio ou vídeo) dependerão de nova informação e, para menores, de novo consentimento do responsável.'
      ]
    },
    {
      t: '12. Contato',
      p: [`${C.nome} · ${C.cidade}/${C.uf} · ${C.email}`]
    }
  ]
}
