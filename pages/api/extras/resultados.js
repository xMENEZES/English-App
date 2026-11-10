import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, meusAlunos } from '../../../lib/authz'
import { ultimoPorExercicio } from '../../../lib/extras'
import { linksTemporarios } from '../../../lib/armazenamento'

// Visao do PROFESSOR: respostas dos alunos nas suas listas.
//  ?alunoId=<uuid>  -> desempenho de um aluno por lista
//  ?pendentes=1     -> respostas livres aguardando correcao
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })

  const { data: listas } = await supabaseAdmin.from('listas_extras').select('id, titulo, unidade').eq('teacher_id', teacher.id)
  const ids = (listas || []).map(l => l.id)
  const listaPor = Object.fromEntries((listas || []).map(l => [l.id, l]))
  if (!ids.length) return res.status(200).json({ listas: [], pendentes: [] })

  if (req.query.alunoId) {
    if (!isUuid(req.query.alunoId)) return res.status(400).json({ error: 'Aluno inválido' })
    const { users, error } = await meusAlunos(teacher)
    if (error) return res.status(400).json({ error: error.message })
    if (!users.some(u => u.id === req.query.alunoId)) return res.status(403).json({ error: 'Este aluno não pertence a você' })
    const { data: rs } = await supabaseAdmin.from('resultados_extras')
      .select('id, exercicio_id, lista_id, enunciado, resposta, resposta_certa, correta, status, avaliacao, comentario, audio_path, created_at')
      .eq('user_id', req.query.alunoId).in('lista_id', ids).order('created_at', { ascending: false })
    const ultimos = Object.values(ultimoPorExercicio(rs))
    const links = await linksTemporarios('audios', ultimos.map(r => r.audio_path))
    ultimos.forEach(r => { r.audioUrl = links[r.audio_path] || null; delete r.audio_path })
    const porLista = {}
    for (const r of ultimos) (porLista[r.lista_id] ||= []).push(r)
    const saida = Object.entries(porLista).map(([lid, itens]) => ({
      id: lid, titulo: listaPor[lid].titulo, unidade: listaPor[lid].unidade,
      acertos: itens.filter(i => i.status === 'corrigido' && i.correta).length,
      pendentes: itens.filter(i => i.status === 'pendente').length,
      respondidas: itens.length,
      itens: itens.sort((a, b) => a.created_at.localeCompare(b.created_at))
    })).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    return res.status(200).json({ listas: saida })
  }

  if (req.query.pendentes) {
    const { data: rs } = await supabaseAdmin.from('resultados_extras')
      .select('id, lista_id, user_id, enunciado, resposta, audio_path, created_at').in('lista_id', ids).eq('status', 'pendente').order('created_at')
    const { users } = await meusAlunos(teacher)
    const alunos = users || []
    const ids2 = alunos.map(a => a.id)
    const { data: perfis } = ids2.length ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', ids2) : { data: [] }
    const nome = {}
    for (const a of alunos) nome[a.id] = (perfis || []).find(p => p.id === a.id)?.full_name?.trim() || a.email
    const links = await linksTemporarios('audios', (rs || []).map(r => r.audio_path))
    return res.status(200).json({
      pendentes: (rs || []).filter(r => nome[r.user_id]).map(r => ({
        id: r.id, aluno: nome[r.user_id], lista: listaPor[r.lista_id]?.titulo, enunciado: r.enunciado, resposta: r.resposta,
        audioUrl: links[r.audio_path] || null, created_at: r.created_at
      }))
    })
  }
  res.status(400).json({ error: 'Informe alunoId ou pendentes' })
}
