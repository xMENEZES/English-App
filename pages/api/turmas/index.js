import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid } from '../../../lib/authz'

const MAX_TURMAS = 100
const limpaNome = (n) => String(n ?? '').trim().replace(/\s+/g, ' ')
const erroNome = (error) =>
  error.code === '23505' ? { status: 409, msg: 'Já existe uma turma com esse nome' } : { status: 400, msg: error.message }

// Confere que a turma existe e pertence ao professor.
async function turmaDoProfessor(id, teacher) {
  if (!isUuid(id)) return null
  const { data } = await supabaseAdmin.from('turmas').select('id, teacher_id').eq('id', id).maybeSingle()
  return data && data.teacher_id === teacher.id ? data : null
}

export default async function handler(req, res) {
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  if (req.method === 'GET') {
    const { data: turmas, error } = await supabaseAdmin
      .from('turmas').select('id, nome, created_at').eq('teacher_id', teacher.id).order('nome')
    if (error) return res.status(400).json({ error: error.message })
    const ids = (turmas || []).map(t => t.id)
    const { data: membros } = ids.length
      ? await supabaseAdmin.from('turma_alunos').select('turma_id, aluno_id').in('turma_id', ids)
      : { data: [] }
    const porTurma = {}
    for (const m of membros || []) {
      if (!porTurma[m.turma_id]) porTurma[m.turma_id] = []
      porTurma[m.turma_id].push(m.aluno_id)
    }
    return res.status(200).json({ turmas: (turmas || []).map(t => ({ ...t, alunoIds: porTurma[t.id] || [] })) })
  }

  if (req.method === 'POST') {
    const nome = limpaNome(req.body?.nome)
    if (!nome || nome.length > 80) return res.status(400).json({ error: 'Nome da turma deve ter de 1 a 80 caracteres' })
    const { count } = await supabaseAdmin.from('turmas').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id)
    if ((count || 0) >= MAX_TURMAS) return res.status(400).json({ error: `Limite de ${MAX_TURMAS} turmas atingido` })
    const { data, error } = await supabaseAdmin.from('turmas').insert({ teacher_id: teacher.id, nome }).select('id, nome').single()
    if (error) { const e = erroNome(error); return res.status(e.status).json({ error: e.msg }) }
    return res.status(200).json({ turma: { ...data, alunoIds: [] } })
  }

  if (req.method === 'PATCH') {
    const nome = limpaNome(req.body?.nome)
    if (!nome || nome.length > 80) return res.status(400).json({ error: 'Nome da turma deve ter de 1 a 80 caracteres' })
    if (!(await turmaDoProfessor(req.body?.id, teacher))) return res.status(404).json({ error: 'Turma não encontrada' })
    const { error } = await supabaseAdmin.from('turmas').update({ nome }).eq('id', req.body.id)
    if (error) { const e = erroNome(error); return res.status(e.status).json({ error: e.msg }) }
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (!(await turmaDoProfessor(req.body?.id, teacher))) return res.status(404).json({ error: 'Turma não encontrada' })
    const { error } = await supabaseAdmin.from('turmas').delete().eq('id', req.body.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
