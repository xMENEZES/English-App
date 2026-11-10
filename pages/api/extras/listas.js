import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher } from '../../../lib/authz'
import { LIM, validarTitulo, validarUnidade, listaDoProfessor } from '../../../lib/extras'
import { apagarAudiosDe } from '../../../lib/armazenamento'

// CRUD das listas de exercicios do professor.
export default async function handler(req, res) {
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  if (req.method === 'GET') {
    const { data: listas, error } = await supabaseAdmin.from('listas_extras')
      .select('id, titulo, unidade, publicada, created_at').eq('teacher_id', teacher.id).order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    const ids = (listas || []).map(l => l.id)
    const [{ data: exs }, { data: dest }, { data: pend }] = ids.length ? await Promise.all([
      supabaseAdmin.from('exercicios_extras').select('lista_id').in('lista_id', ids),
      supabaseAdmin.from('listas_extras_destinatarios').select('lista_id, tipo, aluno_id, turma_id').in('lista_id', ids),
      supabaseAdmin.from('resultados_extras').select('id').in('lista_id', ids).eq('status', 'pendente')
    ]) : [{ data: [] }, { data: [] }, { data: [] }]
    const total = {}, alunos = {}, turmas = {}
    for (const e of exs || []) total[e.lista_id] = (total[e.lista_id] || 0) + 1
    for (const d of dest || []) {
      const alvo = d.tipo === 'aluno' ? alunos : turmas
      ;(alvo[d.lista_id] ||= []).push(d.tipo === 'aluno' ? d.aluno_id : d.turma_id)
    }
    return res.status(200).json({
      pendentes: (pend || []).length,
      listas: (listas || []).map(l => ({ ...l, totalExercicios: total[l.id] || 0, alunoIds: alunos[l.id] || [], turmaIds: turmas[l.id] || [] }))
    })
  }

  if (req.method === 'POST') {
    const titulo = validarTitulo(req.body?.titulo)
    const unidade = validarUnidade(req.body?.unidade)
    if (!titulo) return res.status(400).json({ error: 'O título deve ter de 1 a 80 caracteres' })
    if (unidade === undefined) return res.status(400).json({ error: 'Unidade inválida' })
    const { count } = await supabaseAdmin.from('listas_extras').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id)
    if ((count || 0) >= LIM.listas) return res.status(400).json({ error: `Limite de ${LIM.listas} listas atingido` })
    const { data, error } = await supabaseAdmin.from('listas_extras')
      .insert({ teacher_id: teacher.id, titulo, unidade }).select('id, titulo, unidade, publicada, created_at').single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ lista: { ...data, totalExercicios: 0, alunoIds: [], turmaIds: [] } })
  }

  if (req.method === 'PATCH') {
    const lista = await listaDoProfessor(req.body?.id, teacher)
    if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })
    const mudancas = {}
    if ('titulo' in req.body) {
      const t = validarTitulo(req.body.titulo)
      if (!t) return res.status(400).json({ error: 'O título deve ter de 1 a 80 caracteres' })
      mudancas.titulo = t
    }
    if ('unidade' in req.body) {
      const u = validarUnidade(req.body.unidade)
      if (u === undefined) return res.status(400).json({ error: 'Unidade inválida' })
      mudancas.unidade = u
    }
    if ('publicada' in req.body) {
      if (typeof req.body.publicada !== 'boolean') return res.status(400).json({ error: 'Valor inválido' })
      mudancas.publicada = req.body.publicada
    }
    if (!Object.keys(mudancas).length) return res.status(400).json({ error: 'Nada para alterar' })
    const { error } = await supabaseAdmin.from('listas_extras').update(mudancas).eq('id', lista.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const lista = await listaDoProfessor(req.body?.id, teacher)
    if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })
    await apagarAudiosDe({ lista_id: lista.id })
    const { error } = await supabaseAdmin.from('listas_extras').delete().eq('id', lista.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
