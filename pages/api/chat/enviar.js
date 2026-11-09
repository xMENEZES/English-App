import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isUuid, isTeacher } from '../../../lib/authz'
import { getUsuario, podeParticipar, alunoLiberado, MAX_TEXTO } from '../../../lib/chat'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const { conversaId } = req.body || {}
  // Normaliza quebras de linha e remove caracteres de controle (exceto \n e \t)
  const texto = String(req.body?.texto ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
  if (!isUuid(conversaId)) return res.status(400).json({ error: 'Conversa inválida' })
  if (!texto) return res.status(400).json({ error: 'Escreva uma mensagem' })
  if (texto.length > MAX_TEXTO) return res.status(400).json({ error: `Mensagem muito longa (máximo ${MAX_TEXTO} caracteres)` })

  const { data: conversa } = await supabaseAdmin.from('conversas').select('*').eq('id', conversaId).maybeSingle()
  if (!(await podeParticipar(user, conversa))) return res.status(403).json({ error: 'Sem acesso a esta conversa' })

  // Professor nao escreve no individual de aluno ainda nao liberado (menor sem consentimento)
  if (isTeacher(user) && conversa.tipo === 'individual' && !(await alunoLiberado(conversa.aluno_id)))
    return res.status(403).json({ error: 'Chat deste aluno ainda não liberado' })

  // Limite de frequencia: no maximo 5 mensagens em 10 s e 40 em 5 min por pessoa
  const desde = (ms) => new Date(Date.now() - ms).toISOString()
  const [r10, r5m] = await Promise.all([
    supabaseAdmin.from('mensagens').select('id', { count: 'exact', head: true }).eq('autor_id', user.id).gt('created_at', desde(10_000)),
    supabaseAdmin.from('mensagens').select('id', { count: 'exact', head: true }).eq('autor_id', user.id).gt('created_at', desde(300_000))
  ])
  if ((r10.count || 0) >= 5 || (r5m.count || 0) >= 40) return res.status(429).json({ error: 'Você está enviando mensagens rápido demais. Aguarde um instante.' })

  const { data, error } = await supabaseAdmin.from('mensagens')
    .insert({ conversa_id: conversaId, autor_id: user.id, texto }).select('id, conversa_id, autor_id, texto, created_at').single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ mensagem: data })
}
