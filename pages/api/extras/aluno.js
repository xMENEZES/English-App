import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isUuid } from '../../../lib/authz'
import { getUsuario } from '../../../lib/chat'
import { listasVisiveisAoAluno, ultimoPorExercicio } from '../../../lib/extras'

// Visao do ALUNO: listas que ele pode ver (com progresso) e, por lista, os exercicios SEM as respostas certas.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const visiveis = await listasVisiveisAoAluno(user)

  // Detalhe de uma lista
  if (req.query.listaId) {
    if (!isUuid(req.query.listaId)) return res.status(400).json({ error: 'Lista inválida' })
    const lista = visiveis.find(l => l.id === req.query.listaId)
    if (!lista) return res.status(404).json({ error: 'Lista não encontrada' })
    const [{ data: exs }, { data: rs }] = await Promise.all([
      supabaseAdmin.from('exercicios_extras').select('id, tipo, enunciado, opcoes').eq('lista_id', lista.id).order('ordem').order('created_at'),
      supabaseAdmin.from('resultados_extras').select('exercicio_id, resposta, resposta_certa, correta, status, avaliacao, comentario, created_at')
        .eq('lista_id', lista.id).eq('user_id', user.id).order('created_at', { ascending: false })
    ])
    const ultimos = ultimoPorExercicio(rs)
    const resultados = {}
    for (const [id, r] of Object.entries(ultimos)) {
      resultados[id] = { resposta: r.resposta, respostaCerta: r.resposta_certa, correta: r.correta, status: r.status, avaliacao: r.avaliacao, comentario: r.comentario }
    }
    return res.status(200).json({
      lista: { id: lista.id, titulo: lista.titulo, unidade: lista.unidade },
      exercicios: exs || [],
      resultados
    })
  }

  // Resumo de todas as listas com progresso
  if (!visiveis.length) return res.status(200).json({ listas: [] })
  const ids = visiveis.map(l => l.id)
  const [{ data: exs }, { data: rs }] = await Promise.all([
    supabaseAdmin.from('exercicios_extras').select('id, lista_id').in('lista_id', ids),
    supabaseAdmin.from('resultados_extras').select('exercicio_id, lista_id, correta, status, created_at')
      .eq('user_id', user.id).in('lista_id', ids).order('created_at', { ascending: false })
  ])
  const total = {}
  for (const e of exs || []) total[e.lista_id] = (total[e.lista_id] || 0) + 1
  const ultimos = ultimoPorExercicio(rs)
  const prog = {}
  for (const r of Object.values(ultimos)) {
    const p = (prog[r.lista_id] ||= { respondidas: 0, acertos: 0, pendentes: 0 })
    p.respondidas++
    if (r.status === 'pendente') p.pendentes++
    else if (r.correta) p.acertos++
  }
  const listas = visiveis
    .filter(l => (total[l.id] || 0) > 0)
    .map(l => ({ id: l.id, titulo: l.titulo, unidade: l.unidade, total: total[l.id] || 0, ...(prog[l.id] || { respondidas: 0, acertos: 0, pendentes: 0 }) }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  res.status(200).json({ listas })
}
