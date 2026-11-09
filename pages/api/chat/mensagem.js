import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher } from '../../../lib/authz'

// Somente o professor dono da conversa apaga mensagens (exclusao definitiva).
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const id = Number(req.body?.id)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Mensagem inválida' })

  const { data: msg } = await supabaseAdmin.from('mensagens').select('id, conversa_id').eq('id', id).maybeSingle()
  if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' })
  const { data: conv } = await supabaseAdmin.from('conversas').select('teacher_id').eq('id', msg.conversa_id).maybeSingle()
  if (!conv || conv.teacher_id !== teacher.id) return res.status(403).json({ error: 'Esta conversa não é sua' })

  const { error } = await supabaseAdmin.from('mensagens').delete().eq('id', id)
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ ok: true })
}
