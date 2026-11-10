import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isTeacher, listAllUsers, alunosDoProfessor } from '../../../lib/authz'
import { getUsuario } from '../../../lib/chat'

const nomeDe = (p, fallback) => p?.full_name?.trim() || fallback
const liberadoRow = (c) => !!c && (c.menor_idade === false || !!c.consentimento_em)

// Cria em lote as conversas que faltam (1 consulta) e devolve todas.
async function criarFaltantes(existentes, desejadas, chave, buscar) {
  const tem = new Set(existentes.map(chave))
  const faltam = desejadas.filter(d => !tem.has(chave(d)))
  if (!faltam.length) return existentes
  const { data, error } = await supabaseAdmin.from('conversas').insert(faltam).select('*')
  if (!error) return [...existentes, ...(data || [])]
  return await buscar() // corrida com outra requisicao: relê tudo
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  let convs = []        // { conv, titulo }
  let nomes = {}        // id -> nome exibido nas mensagens
  let pendentes = []    // (professor) alunos ainda sem chat liberado

  if (isTeacher(user)) {
    const [{ users, error }, { data: turmas }, { data: classif }] = await Promise.all([
      listAllUsers(),
      supabaseAdmin.from('turmas').select('id, nome').eq('teacher_id', user.id).order('nome'),
      supabaseAdmin.from('classificacao_aluno').select('aluno_id, menor_idade, consentimento_em').eq('teacher_id', user.id)
    ])
    if (error) return res.status(400).json({ error: error.message })
    const alunos = alunosDoProfessor(users, user)
    const ids = alunos.map(a => a.id)
    const classPor = Object.fromEntries((classif || []).map(c => [c.aluno_id, c]))

    const lerConversas = async () => (await supabaseAdmin.from('conversas').select('*').eq('teacher_id', user.id)).data || []
    const [existentes, { data: perfis }] = await Promise.all([
      lerConversas(),
      ids.length ? supabaseAdmin.from('profiles').select('id, full_name').in('id', ids) : Promise.resolve({ data: [] })
    ])
    const perfilPor = Object.fromEntries((perfis || []).map(p => [p.id, p]))
    const nomeAluno = Object.fromEntries(alunos.map(a => [a.id, nomeDe(perfilPor[a.id], a.email)]))
    nomes = { ...nomeAluno, [user.id]: 'Professor' }

    const liberados = alunos.filter(a => liberadoRow(classPor[a.id]))
    pendentes = alunos.filter(a => !liberadoRow(classPor[a.id])).map(a => ({ id: a.id, nome: nomeAluno[a.id] }))

    const desejadas = [
      ...liberados.map(a => ({ tipo: 'individual', teacher_id: user.id, aluno_id: a.id })),
      ...(turmas || []).map(t => ({ tipo: 'turma', teacher_id: user.id, turma_id: t.id }))
    ]
    const chave = (c) => c.tipo === 'individual' ? `i:${c.aluno_id}` : `t:${c.turma_id}`
    const todas = await criarFaltantes(existentes, desejadas, chave, lerConversas)
    const porChave = Object.fromEntries(todas.map(c => [chave(c), c]))

    for (const a of liberados) { const c = porChave[`i:${a.id}`]; if (c) convs.push({ conv: c, titulo: nomeAluno[a.id] }) }
    for (const t of turmas || []) { const c = porChave[`t:${t.id}`]; if (c) convs.push({ conv: c, titulo: `Turma: ${t.nome}` }) }
  } else {
    const [{ data: minha }, { data: minhas }] = await Promise.all([
      supabaseAdmin.from('classificacao_aluno').select('menor_idade, consentimento_em').eq('aluno_id', user.id).maybeSingle(),
      supabaseAdmin.from('turma_alunos').select('turma_id').eq('aluno_id', user.id)
    ])
    if (!liberadoRow(minha)) return res.status(200).json({ papel: 'aluno', bloqueado: true, conversas: [], nomes: {}, euId: user.id })
    const teacherId = user.app_metadata?.invited_by
    if (!teacherId) return res.status(200).json({ papel: 'aluno', bloqueado: false, conversas: [], nomes: {}, euId: user.id })

    const turmaIds = (minhas || []).map(m => m.turma_id)
    const [{ data: turmas }, { data: colegas }] = turmaIds.length
      ? await Promise.all([
          supabaseAdmin.from('turmas').select('id, nome').in('id', turmaIds).eq('teacher_id', teacherId).order('nome'),
          supabaseAdmin.from('turma_alunos').select('aluno_id').in('turma_id', turmaIds)
        ])
      : [{ data: [] }, { data: [] }]
    const colegaIds = [...new Set((colegas || []).map(c => c.aluno_id))]

    const lerConversas = async () => {
      const [a, b] = await Promise.all([
        supabaseAdmin.from('conversas').select('*').eq('tipo', 'individual').eq('teacher_id', teacherId).eq('aluno_id', user.id),
        (turmas || []).length
          ? supabaseAdmin.from('conversas').select('*').eq('tipo', 'turma').in('turma_id', turmas.map(t => t.id))
          : Promise.resolve({ data: [] })
      ])
      return [...(a.data || []), ...(b.data || [])]
    }
    const idsNome = [...new Set([...colegaIds, teacherId])]
    const [existentes, { data: perfis }, { data: exib }] = await Promise.all([
      lerConversas(),
      colegaIds.length ? supabaseAdmin.from('profiles').select('id, full_name').in('id', colegaIds) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('perfis_usuario').select('user_id, nome_exibicao').in('user_id', idsNome)
    ])
    const perfilPor = Object.fromEntries((perfis || []).map(p => [p.id, p]))
    const exibPor = Object.fromEntries((exib || []).map(p => [p.user_id, p.nome_exibicao]))
    nomes[teacherId] = exibPor[teacherId] || 'Professor'
    // Colegas da turma: so o NOME de exibicao (ou o nome cadastrado), nunca e-mail
    for (const id of colegaIds) nomes[id] = exibPor[id] || nomeDe(perfilPor[id], 'Aluno')

    const desejadas = [
      { tipo: 'individual', teacher_id: teacherId, aluno_id: user.id },
      ...(turmas || []).map(t => ({ tipo: 'turma', teacher_id: teacherId, turma_id: t.id }))
    ]
    const chave = (c) => c.tipo === 'individual' ? 'i' : `t:${c.turma_id}`
    const todas = await criarFaltantes(existentes, desejadas, chave, lerConversas)
    const porChave = Object.fromEntries(todas.map(c => [chave(c), c]))

    if (porChave.i) convs.push({ conv: porChave.i, titulo: 'Professor' })
    for (const t of turmas || []) { const c = porChave[`t:${t.id}`]; if (c) convs.push({ conv: c, titulo: `Turma: ${t.nome}` }) }
  }

  // Ultima mensagem e nao lidas de cada conversa (consultas em paralelo)
  const convIds = convs.map(c => c.conv.id)
  const [{ data: leituras }, ultimas] = convIds.length
    ? await Promise.all([
        supabaseAdmin.from('conversa_leitura').select('conversa_id, lida_ate').eq('user_id', user.id).in('conversa_id', convIds),
        Promise.all(convs.map(({ conv }) =>
          supabaseAdmin.from('mensagens').select('texto, created_at, autor_id')
            .eq('conversa_id', conv.id).order('created_at', { ascending: false }).limit(1)))
      ])
    : [{ data: [] }, []]
  const lidaPor = Object.fromEntries((leituras || []).map(l => [l.conversa_id, l.lida_ate]))

  const contagens = await Promise.all(convs.map(({ conv }) =>
    supabaseAdmin.from('mensagens').select('id', { count: 'exact', head: true })
      .eq('conversa_id', conv.id).neq('autor_id', user.id).gt('created_at', lidaPor[conv.id] || '1970-01-01T00:00:00Z')))

  const conversas = convs.map(({ conv, titulo }, i) => ({
    id: conv.id, tipo: conv.tipo, titulo,
    ultima: ultimas[i]?.data?.[0] || null,
    naoLidas: contagens[i]?.count || 0
  }))

  conversas.sort((a, b) => {
    const da = a.ultima?.created_at || '', db = b.ultima?.created_at || ''
    return db.localeCompare(da) || a.titulo.localeCompare(b.titulo, 'pt-BR')
  })

  res.status(200).json({ papel: isTeacher(user) ? 'professor' : 'aluno', bloqueado: false, conversas, nomes, pendentes, euId: user.id })
}
