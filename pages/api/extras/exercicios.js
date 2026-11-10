import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid } from '../../../lib/authz'
import { LIM, validarExercicio, listaDoProfessor } from '../../../lib/extras'
import { apagarAudiosDe } from '../../../lib/armazenamento'

// Exercicio pertence a uma lista do professor? Retorna { ex, lista } ou null.
async function exercicioDoProfessor(id, teacher) {
  if (!isUuid(id)) return null
  const { data: ex } = await supabaseAdmin.from('exercicios_extras').select('*').eq('id', id).maybeSingle()
  if (!ex) return null
  const lista = await listaDoProfessor(ex.lista_id, teacher)
  return lista ? { ex, lista } : null
}

export default async function handler(req, res) {
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  if (req.method === 'GET') {
    const lista = await listaDoProfessor(req.query.listaId, teacher)
    if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })
    const { data, error } = await supabaseAdmin.from('exercicios_extras').select('*').eq('lista_id', lista.id).order('ordem').order('created_at')
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ exercicios: data || [] })
  }

  if (req.method === 'POST') {
    const lista = await listaDoProfessor(req.body?.listaId, teacher)
    if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })
    const v = validarExercicio(req.body)
    if (v.erro) return res.status(400).json({ error: v.erro })
    const { data: existentes } = await supabaseAdmin.from('exercicios_extras').select('ordem').eq('lista_id', lista.id)
    if ((existentes || []).length >= LIM.exerciciosPorLista) return res.status(400).json({ error: `Limite de ${LIM.exerciciosPorLista} exercícios por lista` })
    const ordem = Math.max(0, ...(existentes || []).map(e => e.ordem)) + 1
    const { data, error } = await supabaseAdmin.from('exercicios_extras').insert({ lista_id: lista.id, ordem, ...v.valor }).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ exercicio: data })
  }

  if (req.method === 'PATCH') {
    const dono = await exercicioDoProfessor(req.body?.id, teacher)
    if (!dono) return res.status(404).json({ error: 'Exercício não encontrado' })
    const v = validarExercicio(req.body)
    if (v.erro) return res.status(400).json({ error: v.erro })
    const { error } = await supabaseAdmin.from('exercicios_extras').update(v.valor).eq('id', dono.ex.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const dono = await exercicioDoProfessor(req.body?.id, teacher)
    if (!dono) return res.status(404).json({ error: 'Exercício não encontrado' })
    await apagarAudiosDe({ exercicio_id: dono.ex.id })
    const { error } = await supabaseAdmin.from('exercicios_extras').delete().eq('id', dono.ex.id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
