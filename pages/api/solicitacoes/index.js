import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isTeacher, meusAlunos } from '../../../lib/authz'
import { getUsuario } from '../../../lib/chat'

const TIPOS = ['acesso', 'correcao', 'exclusao', 'outro']
const limpa = (v) => String(v ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()

// Solicitacoes dos titulares (art. 18 da LGPD).
//  Aluno: GET (as suas) e POST (criar).  Professor (controlador): GET (as dos seus alunos) e PATCH (responder/atender).
export default async function handler(req, res) {
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })
  const professor = isTeacher(user)

  if (req.method === 'GET') {
    if (!professor) {
      const { data, error } = await supabaseAdmin.from('solicitacoes_titular')
        .select('id, tipo, descricao, status, resposta, created_at, atendida_em').eq('user_id', user.id).order('created_at', { ascending: false })
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ solicitacoes: data || [] })
    }
    const { data, error } = await supabaseAdmin.from('solicitacoes_titular')
      .select('id, user_id, tipo, descricao, status, resposta, created_at, atendida_em').eq('teacher_id', user.id)
      .order('status').order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    const ids = [...new Set((data || []).map(s => s.user_id))]
    const [{ data: perfis }, { users }] = ids.length
      ? await Promise.all([supabaseAdmin.from('profiles').select('id, full_name').in('id', ids), meusAlunos(user)])
      : [{ data: [] }, { users: [] }]
    const nome = {}
    for (const u of users || []) nome[u.id] = (perfis || []).find(p => p.id === u.id)?.full_name?.trim() || u.email
    return res.status(200).json({ solicitacoes: (data || []).map(s => ({ ...s, aluno: nome[s.user_id] || 'Aluno removido' })) })
  }

  if (req.method === 'POST') {
    if (professor) return res.status(400).json({ error: 'Professores devem escrever diretamente ao encarregado' })
    const teacherId = user.app_metadata?.invited_by
    if (!teacherId) return res.status(400).json({ error: 'Seu cadastro não está vinculado a um professor' })
    const tipo = req.body?.tipo
    const descricao = limpa(req.body?.descricao)
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de solicitação inválido' })
    if (!descricao || descricao.length > 1000) return res.status(400).json({ error: 'Descreva o pedido (até 1000 caracteres)' })
    const { count } = await supabaseAdmin.from('solicitacoes_titular').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'aberta')
    if ((count || 0) >= 5) return res.status(429).json({ error: 'Você já tem 5 solicitações em aberto. Aguarde o atendimento.' })
    const { error } = await supabaseAdmin.from('solicitacoes_titular').insert({ user_id: user.id, teacher_id: teacherId, tipo, descricao })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'PATCH') {
    if (!professor) return res.status(403).json({ error: 'Acesso negado' })
    const id = Number(req.body?.id)
    const resposta = limpa(req.body?.resposta)
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Solicitação inválida' })
    if (resposta.length > 1000) return res.status(400).json({ error: 'Resposta muito longa (máximo 1000 caracteres)' })
    const { data: s } = await supabaseAdmin.from('solicitacoes_titular').select('id, teacher_id').eq('id', id).maybeSingle()
    if (!s || s.teacher_id !== user.id) return res.status(404).json({ error: 'Solicitação não encontrada' })
    const { error } = await supabaseAdmin.from('solicitacoes_titular')
      .update({ status: 'atendida', resposta: resposta || null, atendida_em: new Date().toISOString() }).eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
