import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, meusAlunos } from '../../../lib/authz'
import { VERSOES } from '../../../lib/lgpd/config'

// Classifica o aluno para liberar o chat:
//  - adulto: { alunoId, menor: false }
//  - menor:  { alunoId, menor: true, consentimento: true }  (consentimento do responsavel registrado)
//  - menor sem consentimento: { alunoId, menor: true, consentimento: false } (continua bloqueado)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const { alunoId, menor, consentimento } = req.body || {}
  if (!isUuid(alunoId) || typeof menor !== 'boolean') return res.status(400).json({ error: 'Dados inválidos' })

  const { users, error: le } = await meusAlunos(teacher)
  if (le) return res.status(400).json({ error: le.message })
  if (!users.some(u => u.id === alunoId))
    return res.status(403).json({ error: 'Este aluno não pertence a você' })

  const registrar = menor && consentimento === true
  const limpa = (v) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
  const respNome = limpa(req.body?.responsavelNome)
  const respVinculo = limpa(req.body?.responsavelVinculo)
  if (registrar) {
    if (respNome.length < 2 || respNome.length > 120) return res.status(400).json({ error: 'Informe o nome completo do responsável' })
    if (respVinculo.length < 2 || respVinculo.length > 40) return res.status(400).json({ error: 'Informe o vínculo com o aluno (mãe, pai, tutor...)' })
    if (req.body?.termoRecebido !== true) return res.status(400).json({ error: 'Confirme que recebeu o termo assinado' })
  }
  const { error } = await supabaseAdmin.from('classificacao_aluno').upsert({
    aluno_id: alunoId,
    teacher_id: teacher.id,
    menor_idade: menor,
    consentimento_em: registrar ? new Date().toISOString() : null,
    consentimento_por: registrar ? teacher.id : null,
    responsavel_nome: registrar ? respNome : null,
    responsavel_vinculo: registrar ? respVinculo : null,
    forma_coleta: registrar ? 'termo_assinado' : null,
    versao_termo: registrar ? VERSOES.consentimento : null,
    updated_at: new Date().toISOString()
  })
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ ok: true })
}
