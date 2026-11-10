import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, meusAlunos, limiteDeVagas } from '../../../lib/authz'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const slotLimit = limiteDeVagas(teacher)
  // As 3 consultas sao independentes: rodam juntas para reduzir o tempo de resposta
  const [{ users, error }, { data: profiles }, { data: classif }] = await Promise.all([
    meusAlunos(teacher),
    supabaseAdmin.from('profiles').select('id, full_name').eq('role', 'student'),
    supabaseAdmin.from('classificacao_aluno').select('aluno_id, menor_idade, consentimento_em').eq('teacher_id', teacher.id)
  ])
  if (error) return res.status(400).json({ error: error.message })

  const nameMap = {}
  ;(profiles || []).forEach(p => { nameMap[p.id] = p.full_name })

  const classPor = {}
  ;(classif || []).forEach(c => { classPor[c.aluno_id] = c })
  const statusChat = (id) => {
    const c = classPor[id]
    if (!c) return 'nao_classificado'
    if (!c.menor_idade) return 'adulto'
    return c.consentimento_em ? 'menor_consentido' : 'menor_sem_consentimento'
  }

  const alunosLista = users
  const { data: perfisUsr } = alunosLista.length
    ? await supabaseAdmin.from('perfis_usuario').select('user_id, nome_exibicao, idade, foto_path').in('user_id', alunosLista.map(a => a.id))
    : { data: [] }
  const perfilUsr = Object.fromEntries((perfisUsr || []).map(p => [p.user_id, p]))
  const comFoto = (perfisUsr || []).filter(p => p.foto_path)
  const fotoUrl = {}
  if (comFoto.length) {
    const { data: assinadas } = await supabaseAdmin.storage.from('avatars').createSignedUrls(comFoto.map(p => p.foto_path), 3600)
    ;(assinadas || []).forEach((a, i) => { if (a?.signedUrl) fotoUrl[comFoto[i].user_id] = a.signedUrl })
  }

  const students = alunosLista
    .map(u => ({
      id: u.id, email: u.email, full_name: nameMap[u.id] || null, created_at: u.created_at, chat: statusChat(u.id),
      nomeExibicao: perfilUsr[u.id]?.nome_exibicao || null, idade: perfilUsr[u.id]?.idade ?? null, fotoUrl: fotoUrl[u.id] || null
    }))
    .sort((a, b) => (a.full_name || 'zzz').localeCompare(b.full_name || 'zzz'))

  res.status(200).json({ students, total: slotLimit, used: students.length, available: slotLimit - students.length })
}
