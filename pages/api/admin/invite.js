import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, listAllUsers, alunosDoProfessor, limiteDeVagas } from '../../../lib/authz'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://english-step-by-step.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email inválido' })

  const slotLimit = limiteDeVagas(teacher)
  const { users, error: le } = await listAllUsers()
  if (le) return res.status(400).json({ error: le.message })
  if (alunosDoProfessor(users, teacher).length >= slotLimit)
    return res.status(400).json({ error: `Limite de ${slotLimit} acessos atingido.` })

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirmar`
  })
  if (error) return res.status(400).json({ error: error.message })

  // Vincula o aluno ao professor e fixa o papel (app_metadata: só o servidor altera)
  const { error: ue } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: 'student', invited_by: teacher.id }
  })
  if (ue) return res.status(400).json({ error: ue.message })
  res.status(200).json({ ok: true })
}
