import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, meusAlunos } from '../../../lib/authz'

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
  const { error } = await supabaseAdmin.from('classificacao_aluno').upsert({
    aluno_id: alunoId,
    teacher_id: teacher.id,
    menor_idade: menor,
    consentimento_em: registrar ? new Date().toISOString() : null,
    consentimento_por: registrar ? teacher.id : null,
    updated_at: new Date().toISOString()
  })
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ ok: true })
}
