import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isTeacher, listAllUsers, alunosDoProfessor } from '../../../lib/authz'
import { getUsuario, alunoLiberado, garantirIndividual, garantirTurma } from '../../../lib/chat'

const nomeDe = (p, fallback) => p?.full_name?.trim() || fallback

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  let convs = []        // { conv, titulo }
  let nomes = {}        // id -> nome exibido nas mensagens
  let pendentes = []    // (professor) alunos ainda sem chat liberado

  if (isTeacher(user)) {
    const { users, error } = await listAllUsers()
    if (error) return res.status(400).json({ error: error.message })
    const alunos = alunosDoProfessor(users, user)
    const ids = alunos.map(a => a.id)
    const { data: perfis } = ids.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', ids)
      : { data: [] }
    const perfilPor = Object.fromEntries((perfis || []).map(p => [p.id, p]))
    const nomeAluno = Object.fromEntries(alunos.map(a => [a.id, nomeDe(perfilPor[a.id], a.email)]))
    nomes = { ...nomeAluno, [user.id]: 'Professor' }

    const liberados = await Promise.all(alunos.map(a => alunoLiberado(a.id)))
    for (let i = 0; i < alunos.length; i++) {
      if (!liberados[i]) { pendentes.push({ id: alunos[i].id, nome: nomeAluno[alunos[i].id] }); continue }
      const conv = await garantirIndividual(user.id, alunos[i].id)
      if (conv) convs.push({ conv, titulo: nomeAluno[alunos[i].id] })
    }
    const { data: turmas } = await supabaseAdmin.from('turmas').select('id, nome').eq('teacher_id', user.id).order('nome')
    for (const t of turmas || []) {
      const conv = await garantirTurma(user.id, t.id)
      if (conv) convs.push({ conv, titulo: `Turma: ${t.nome}` })
    }
  } else {
    if (!(await alunoLiberado(user.id))) return res.status(200).json({ papel: 'aluno', bloqueado: true, conversas: [], nomes: {}, euId: user.id })
    const teacherId = user.app_metadata?.invited_by
    if (!teacherId) return res.status(200).json({ papel: 'aluno', bloqueado: false, conversas: [], nomes: {}, euId: user.id })

    nomes[teacherId] = 'Professor'
    const conv = await garantirIndividual(teacherId, user.id)
    if (conv) convs.push({ conv, titulo: 'Professor' })

    const { data: minhas } = await supabaseAdmin.from('turma_alunos').select('turma_id').eq('aluno_id', user.id)
    const turmaIds = (minhas || []).map(m => m.turma_id)
    if (turmaIds.length) {
      const { data: turmas } = await supabaseAdmin.from('turmas').select('id, nome, teacher_id').in('id', turmaIds).eq('teacher_id', teacherId).order('nome')
      for (const t of turmas || []) {
        const c = await garantirTurma(teacherId, t.id)
        if (c) convs.push({ conv: c, titulo: `Turma: ${t.nome}` })
      }
      // Colegas da turma: so o NOME (nunca e-mail) aparece nas mensagens
      const { data: colegas } = await supabaseAdmin.from('turma_alunos').select('aluno_id').in('turma_id', turmaIds)
      const colegaIds = [...new Set((colegas || []).map(c => c.aluno_id))]
      const { data: perfis } = colegaIds.length
        ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', colegaIds)
        : { data: [] }
      const perfilPor = Object.fromEntries((perfis || []).map(p => [p.id, p]))
      for (const id of colegaIds) nomes[id] = nomeDe(perfilPor[id], 'Aluno')
    }
  }

  // Ultima mensagem e nao lidas de cada conversa
  const convIds = convs.map(c => c.conv.id)
  const { data: leituras } = convIds.length
    ? await supabaseAdmin.from('conversa_leitura').select('conversa_id, lida_ate').eq('user_id', user.id).in('conversa_id', convIds)
    : { data: [] }
  const lidaPor = Object.fromEntries((leituras || []).map(l => [l.conversa_id, l.lida_ate]))

  const conversas = await Promise.all(convs.map(async ({ conv, titulo }) => {
    const { data: ult } = await supabaseAdmin.from('mensagens')
      .select('texto, created_at, autor_id').eq('conversa_id', conv.id).order('created_at', { ascending: false }).limit(1)
    const { count } = await supabaseAdmin.from('mensagens')
      .select('id', { count: 'exact', head: true })
      .eq('conversa_id', conv.id).neq('autor_id', user.id).gt('created_at', lidaPor[conv.id] || '1970-01-01T00:00:00Z')
    return { id: conv.id, tipo: conv.tipo, titulo, ultima: ult?.[0] || null, naoLidas: count || 0 }
  }))

  conversas.sort((a, b) => {
    const da = a.ultima?.created_at || '', db = b.ultima?.created_at || ''
    return db.localeCompare(da) || a.titulo.localeCompare(b.titulo, 'pt-BR')
  })

  res.status(200).json({ papel: isTeacher(user) ? 'professor' : 'aluno', bloqueado: false, conversas, nomes, pendentes, euId: user.id })
}
