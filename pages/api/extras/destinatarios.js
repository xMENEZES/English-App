import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, listAllUsers, alunosDoProfessor } from '../../../lib/authz'
import { listaDoProfessor } from '../../../lib/extras'

// Define o conjunto COMPLETO de destinatarios (alunos e turmas) de uma lista.
export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const { listaId, alunoIds, turmaIds } = req.body || {}
  const okArr = (a) => Array.isArray(a) && a.length <= 500 && a.every(isUuid)
  if (!okArr(alunoIds) || !okArr(turmaIds)) return res.status(400).json({ error: 'Dados inválidos' })
  const lista = await listaDoProfessor(listaId, teacher)
  if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })

  const alunos = [...new Set(alunoIds)]
  const turmas = [...new Set(turmaIds)]

  // So alunos e turmas do proprio professor
  const [{ users, error: le }, { data: minhasTurmas }] = await Promise.all([
    listAllUsers(),
    supabaseAdmin.from('turmas').select('id').eq('teacher_id', teacher.id)
  ])
  if (le) return res.status(400).json({ error: le.message })
  const meusAlunos = new Set(alunosDoProfessor(users, teacher).map(u => u.id))
  const minhasT = new Set((minhasTurmas || []).map(t => t.id))
  if (!alunos.every(id => meusAlunos.has(id)) || !turmas.every(id => minhasT.has(id)))
    return res.status(403).json({ error: 'Há alunos ou turmas que não pertencem a você' })

  const { error: de } = await supabaseAdmin.from('listas_extras_destinatarios').delete().eq('lista_id', lista.id)
  if (de) return res.status(400).json({ error: de.message })
  const linhas = [
    ...alunos.map(id => ({ lista_id: lista.id, tipo: 'aluno', aluno_id: id })),
    ...turmas.map(id => ({ lista_id: lista.id, tipo: 'turma', turma_id: id }))
  ]
  if (linhas.length) {
    const { error } = await supabaseAdmin.from('listas_extras_destinatarios').insert(linhas)
    if (error) return res.status(400).json({ error: error.message })
  }
  res.status(200).json({ ok: true })
}
