import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher } from '../../../lib/authz'
import { LIM, limparTextoResposta } from '../../../lib/extras'

// O PROFESSOR corrige uma resposta livre: "adequada" ou "precisa melhorar" + comentario.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const id = Number(req.body?.resultadoId)
  const { avaliacao } = req.body || {}
  const comentario = limparTextoResposta(req.body?.comentario)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Resposta inválida' })
  if (!['adequada', 'melhorar'].includes(avaliacao)) return res.status(400).json({ error: 'Escolha "adequada" ou "precisa melhorar"' })
  if (comentario.length > LIM.comentario) return res.status(400).json({ error: `Comentário muito longo (máximo ${LIM.comentario} caracteres)` })

  const { data: r } = await supabaseAdmin.from('resultados_extras').select('id, lista_id, status').eq('id', id).maybeSingle()
  if (!r) return res.status(404).json({ error: 'Resposta não encontrada' })
  const { data: lista } = await supabaseAdmin.from('listas_extras').select('teacher_id').eq('id', r.lista_id).maybeSingle()
  if (!lista || lista.teacher_id !== teacher.id) return res.status(403).json({ error: 'Esta resposta não é de uma lista sua' })

  const { error } = await supabaseAdmin.from('resultados_extras').update({
    status: 'corrigido',
    correta: avaliacao === 'adequada',
    avaliacao,
    comentario: comentario || null,
    corrigido_em: new Date().toISOString()
  }).eq('id', id)
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ ok: true })
}
