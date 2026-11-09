import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, listAllUsers, alunosDoProfessor, limiteDeVagas } from '../../../lib/authz'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const slotLimit = limiteDeVagas(teacher)
  const { users, error } = await listAllUsers()
  if (error) return res.status(400).json({ error: error.message })

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').eq('role', 'student')
  const nameMap = {}
  if (profiles) profiles.forEach(p => { nameMap[p.id] = p.full_name })

  const students = alunosDoProfessor(users, teacher)
    .map(u => ({ id: u.id, email: u.email, full_name: nameMap[u.id] || null, created_at: u.created_at }))
    .sort((a, b) => (a.full_name || 'zzz').localeCompare(b.full_name || 'zzz'))

  res.status(200).json({ students, total: slotLimit, used: students.length, available: slotLimit - students.length })
}
