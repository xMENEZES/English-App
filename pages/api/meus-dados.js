import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { isTeacher } from '../../lib/authz'
import { getUsuario } from '../../lib/chat'
import { linksTemporarios } from '../../lib/armazenamento'

// Exportacao dos dados pessoais do proprio usuario (direito de acesso, art. 18 da LGPD).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const LIM = 5000
  const [cad, perfil, classif, unidades, extras, msgs, aceites, solic] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabaseAdmin.from('perfis_usuario').select('nome_exibicao, idade, foto_path, foto_atualizada_em, updated_at').eq('user_id', user.id).maybeSingle(),
    supabaseAdmin.from('classificacao_aluno').select('menor_idade, consentimento_em, responsavel_nome, responsavel_vinculo, forma_coleta, versao_termo, updated_at').eq('aluno_id', user.id).maybeSingle(),
    supabaseAdmin.from('exercise_results').select('unit_id, question_idx, question, user_answer, correct_answer, is_correct, answered_at').eq('user_id', user.id).order('answered_at').limit(LIM),
    supabaseAdmin.from('resultados_extras').select('lista_id, enunciado, resposta, resposta_certa, correta, status, avaliacao, comentario, audio_path, audio_duracao, created_at, corrigido_em').eq('user_id', user.id).order('created_at').limit(LIM),
    supabaseAdmin.from('mensagens').select('conversa_id, texto, created_at').eq('autor_id', user.id).order('created_at').limit(LIM),
    supabaseAdmin.from('aceites_termos').select('versao_termos, versao_privacidade, aceito_em').eq('user_id', user.id).order('aceito_em'),
    supabaseAdmin.from('solicitacoes_titular').select('tipo, descricao, status, resposta, created_at, atendida_em').eq('user_id', user.id).order('created_at')
  ])

  const linksAudio = await linksTemporarios('audios', (extras.data || []).map(r => r.audio_path))
  const exerciciosProfessor = (extras.data || []).map(({ audio_path, ...r }) => ({
    ...r, gravacao_de_voz_link_temporario_1h: audio_path ? (linksAudio[audio_path] || null) : null
  }))

  const dados = {
    gerado_em: new Date().toISOString(),
    aviso: 'Cópia dos seus dados pessoais no English Step By Step. Para correção ou exclusão, use a tela Meus Dados.',
    conta: { email: user.email, criada_em: user.created_at, papel: isTeacher(user) ? 'professor' : 'aluno' },
    cadastro: { nome: cad.data?.full_name || null },
    perfil: perfil.data ? {
      nome_exibicao: perfil.data.nome_exibicao, idade: perfil.data.idade,
      tem_foto: !!perfil.data.foto_path, foto_atualizada_em: perfil.data.foto_atualizada_em
    } : null,
    classificacao_e_consentimento: classif.data || null,
    exercicios_das_unidades: unidades.data || [],
    exercicios_do_professor: exerciciosProfessor,
    mensagens_enviadas: msgs.data || [],
    aceites_dos_termos: aceites.data || [],
    solicitacoes: solic.data || []
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="meus-dados.json"')
  res.status(200).send(JSON.stringify(dados, null, 2))
}
