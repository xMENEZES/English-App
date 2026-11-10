import { CONTROLADOR as C, VERSOES } from './config'

// Termos de Uso (minuta). Ao alterar, aumente VERSOES.termos em config.js.
export const TERMOS = {
  titulo: 'Termos de Uso',
  versao: VERSOES.termos,
  aviso: 'Versão 2.0: inclui regras para gravação de voz em exercícios. Pontos marcados como [REVISAR] aguardam conferência jurídica.',
  secoes: [
    {
      t: '1. Aceitação',
      p: [
        `Ao usar o ${C.servico}, você declara que leu e concorda com estes Termos e com a Política de Privacidade. Se o aluno for menor de 18 anos, o uso depende do consentimento do responsável, registrado pelo professor.`
      ]
    },
    {
      t: '2. O serviço',
      p: [
        'O sistema oferece exercícios de inglês organizados em unidades, exercícios elaborados pelo professor (inclusive com resposta gravada em áudio), acompanhamento do progresso, mensagens com o professor e a turma e um perfil pessoal.'
      ]
    },
    {
      t: '3. Cadastro e conta',
      l: [
        'O acesso começa por um convite enviado pelo professor ao seu e-mail.',
        'A conta é pessoal e intransferível. Não compartilhe a sua senha. Use uma senha forte (mínimo de 8 caracteres, com número e símbolo).',
        'Você é responsável pelo que for feito com a sua conta. Se suspeitar de uso indevido, avise o professor e troque a senha.'
      ]
    },
    {
      t: '4. Regras de convivência',
      p: ['Ao usar o sistema, você se compromete a:'],
      l: [
        'tratar o professor e os colegas com respeito;',
        'não publicar conteúdo ofensivo, discriminatório, ilegal ou que exponha dados de outras pessoas;',
        'não tentar acessar dados de outras pessoas, burlar limites do sistema ou prejudicar o seu funcionamento;',
        'não usar o chat para fins que não sejam o estudo e a comunicação sobre o curso;',
        'na gravação de voz, gravar apenas a sua própria voz e o que o exercício pede, sem deixar outras pessoas, conversas privadas ou informações pessoais no áudio. A gravação é ouvida somente por você e pelo professor e é apagada em até 12 meses. O aluno menor de 18 anos só grava depois que o responsável assinar o termo na versão que inclui a gravação de voz.'
      ]
    },
    {
      t: '5. Mensagens e moderação',
      p: [
        'As mensagens ficam guardadas por 12 meses e são visíveis ao professor e aos participantes da conversa. O professor pode apagar mensagens de forma definitiva. Links enviados no chat aparecem como texto e não são clicáveis, para a segurança de todos.',
        'O professor poderá suspender o acesso de quem descumprir estas regras.'
      ]
    },
    {
      t: '6. Conteúdo',
      p: [
        'Os exercícios e materiais do sistema pertencem ao seu autor e são oferecidos apenas para o estudo pessoal do aluno. Não é permitido copiar, vender ou redistribuir o conteúdo.',
        'O que você escreve (respostas e mensagens) continua sendo seu, mas você autoriza que seja exibido ao professor e, no chat da turma, aos colegas, para o funcionamento do serviço.'
      ]
    },
    {
      t: '7. Disponibilidade',
      p: [
        'Trabalhamos para manter o sistema disponível, mas não garantimos funcionamento ininterrupto. Pode haver manutenção, instabilidade ou mudanças de recursos. Avisaremos sobre mudanças que afetem os seus dados.'
      ]
    },
    {
      t: '8. Encerramento do acesso',
      p: [
        'O acesso pode ser encerrado a seu pedido, ao fim do curso ou em caso de descumprimento destes Termos. Ao remover o acesso, os dados do aluno são apagados, conforme a Política de Privacidade.'
      ]
    },
    {
      t: '9. Responsabilidade',
      p: [
        'O sistema é uma ferramenta de apoio ao estudo. Dentro dos limites da lei, o controlador não responde por danos decorrentes de uso indevido da conta pelo próprio usuário, de indisponibilidade temporária ou de eventos fora do seu controle [REVISAR].'
      ]
    },
    {
      t: '10. Alterações',
      p: [
        'Estes Termos podem ser atualizados. Quando houver mudança relevante, será solicitado um novo aceite para continuar usando o sistema.'
      ]
    },
    {
      t: '11. Lei e foro',
      p: [
        `Estes Termos seguem as leis do Brasil. Fica eleito o foro da comarca de ${C.cidade}/${C.uf} [REVISAR], ressalvado o direito do consumidor de propor ação no foro do seu domicílio, quando aplicável.`,
        `Dúvidas: ${C.email}.`
      ]
    }
  ]
}
