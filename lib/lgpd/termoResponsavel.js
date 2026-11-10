import { CONTROLADOR as C, VERSOES } from './config'

// Termo de Consentimento do Responsavel (minuta para impressao e assinatura).
// Ao alterar, aumente VERSOES.consentimento em config.js.
export const TERMO_RESPONSAVEL = {
  titulo: 'Termo de Consentimento do Responsável',
  versao: VERSOES.consentimento,
  aviso: 'Para alunos menores de 18 anos. Leia com atenção, preencha, assine e entregue ao professor. Pontos marcados como [REVISAR] aguardam conferência jurídica.',
  secoes: [
    {
      t: '1. Quem trata os dados',
      p: [
        `O controlador dos dados pessoais é ${C.nome}, ${C.tipo}, de ${C.cidade}/${C.uf}, responsável pelo ${C.servico}. Contato e encarregado: ${C.email}.`
      ]
    },
    {
      t: '2. O que este termo autoriza',
      p: [
        'Ao assinar, o responsável legal autoriza o tratamento dos dados pessoais do aluno menor de idade, identificado abaixo, para as finalidades específicas a seguir, no melhor interesse da criança ou do adolescente:'
      ],
      l: [
        'criar e manter a conta do aluno e acompanhar o seu aprendizado (cadastro, exercícios, respostas, acertos e progresso);',
        'permitir que o aluno converse por mensagens de texto com o professor e com a turma (chat individual e de turma);',
        'permitir que o aluno, se quiser, informe nome de exibição, idade e foto, que ficam visíveis somente para ele e para o professor (a foto não é vista pelos colegas);',
        'permitir que o aluno responda a exercícios elaborados pelo professor, inclusive com textos livres, e receba correção e comentários.'
      ]
    },
    {
      t: '3. Dados tratados, compartilhamento e guarda',
      l: [
        'Dados: e-mail, nome, nome de exibição, idade e foto (opcionais), respostas e progresso, mensagens do chat, turma e registro deste consentimento.',
        'Compartilhamento: somente com o professor e, no chat da turma, com os colegas (apenas nome de exibição e mensagens), e com os prestadores de tecnologia necessários ao funcionamento (Supabase e Vercel). Não há venda de dados nem publicidade.',
        'Guarda: os dados são mantidos enquanto a conta estiver ativa e apagados quando o acesso for removido. As mensagens são apagadas automaticamente após 12 meses.',
        'Os detalhes estão na Política de Privacidade, disponível no sistema e no endereço /privacidade.'
      ]
    },
    {
      t: '4. Direitos do responsável',
      p: [
        `O responsável pode, a qualquer momento, pedir acesso, correção ou exclusão dos dados do aluno e retirar este consentimento, sem custo, pelo e-mail ${C.email} ou pelo professor. A retirada não afeta o que foi feito antes dela, mas o chat e a foto do aluno serão bloqueados e os dados poderão ser eliminados.`
      ]
    },
    {
      t: '5. Novos recursos',
      p: [
        'Recursos novos que tratem dados de forma diferente (por exemplo, gravação de áudio ou vídeo) serão informados antes e dependerão de novo consentimento específico.'
      ]
    }
  ]
}

export const VERSAO_TERMO_RESPONSAVEL = VERSOES.consentimento
