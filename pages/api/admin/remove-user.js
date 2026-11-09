import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, isTeacher } from '../../../lib/authz'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const { userId } = req.body || {}
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId inválido' })
  if (userId === teacher.id) return res.status(400).json({ error: 'Não é possível remover a própria conta' })

  // Só pode remover aluno que ele mesmo convidou
  const { data: alvo, error: ge } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (ge || !alvo?.user) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (isTeacher(alvo.user) || alvo.user.app_metadata?.invited_by !== teacher.id)
    return res.status(403).json({ error: 'Este usuário não pertence a você' })

  await supabaseAdmin.from('profiles').delete().eq('id', userId)
  await supabaseAdmin.from('exercise_results').delete().eq('user_id', userId)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ ok: true })
}
