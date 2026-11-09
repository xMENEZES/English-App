import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, listAllUsers, alunosDoProfessor } from '../../../lib/authz'

// Define o conjunto COMPLETO de alunos de uma turma (adiciona e remove conforme a lista).
export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const { turmaId, alunoIds } = req.body || {}
  if (!isUuid(turmaId) || !Array.isArray(alunoIds) || alunoIds.length > 500 || !alunoIds.every(isUuid))
    return res.status(400).json({ error: 'Dados inválidos' })

  const { data: turma } = await supabaseAdmin.from('turmas').select('id, teacher_id').eq('id', turmaId).maybeSingle()
  if (!turma || turma.teacher_id !== teacher.id) return res.status(404).json({ error: 'Turma não encontrada' })

  // Só alunos convidados por este professor podem entrar na turma
  const { users, error: le } = await listAllUsers()
  if (le) return res.status(400).json({ error: le.message })
  const meus = new Set(alunosDoProfessor(users, teacher).map(u => u.id))
  const desejados = [...new Set(alunoIds)]
  if (!desejados.every(id => meus.has(id))) return res.status(403).json({ error: 'Há alunos que não pertencem a você' })

  const { data: atuais, error: ae } = await supabaseAdmin.from('turma_alunos').select('aluno_id').eq('turma_id', turmaId)
  if (ae) return res.status(400).json({ error: ae.message })
  const atualSet = new Set((atuais || []).map(a => a.aluno_id))
  const aAdicionar = desejados.filter(id => !atualSet.has(id))
  const aRemover = [...atualSet].filter(id => !desejados.includes(id))

  if (aAdicionar.length) {
    const { error } = await supabaseAdmin.from('turma_alunos').insert(aAdicionar.map(id => ({ turma_id: turmaId, aluno_id: id })))
    if (error) return res.status(400).json({ error: error.message })
  }
  if (aRemover.length) {
    const { error } = await supabaseAdmin.from('turma_alunos').delete().eq('turma_id', turmaId).in('aluno_id', aRemover)
    if (error) return res.status(400).json({ error: error.message })
  }
  res.status(200).json({ ok: true, alunoIds: desejados })
}
