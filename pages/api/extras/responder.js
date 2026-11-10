import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isUuid } from '../../../lib/authz'
import { getUsuario } from '../../../lib/chat'
import { conferirResposta } from '../../../lib/exerciciosServer'
import { LIM, TIPOS_AUTO, listasVisiveisAoAluno, limparTextoResposta } from '../../../lib/extras'

// O ALUNO responde um exercicio. A correcao automatica acontece aqui, no servidor.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const { exercicioId } = req.body || {}
  if (!isUuid(exercicioId)) return res.status(400).json({ error: 'Exercício inválido' })

  const { data: ex } = await supabaseAdmin.from('exercicios_extras').select('*').eq('id', exercicioId).maybeSingle()
  if (!ex) return res.status(404).json({ error: 'Exercício não encontrado' })
  const visiveis = await listasVisiveisAoAluno(user)
  if (!visiveis.some(l => l.id === ex.lista_id)) return res.status(403).json({ error: 'Você não tem acesso a este exercício' })

  const resposta = limparTextoResposta(req.body?.resposta)
  if (!resposta) return res.status(400).json({ error: 'Escreva uma resposta' })
  const limite = ex.tipo === 'livre' ? LIM.livre : LIM.resposta
  if (resposta.length > limite) return res.status(400).json({ error: `Resposta muito longa (máximo ${limite} caracteres)` })

  // Limite de frequencia: 30 respostas por minuto
  const { count } = await supabaseAdmin.from('resultados_extras').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gt('created_at', new Date(Date.now() - 60_000).toISOString())
  if ((count || 0) >= 30) return res.status(429).json({ error: 'Muitas respostas em pouco tempo. Aguarde um instante.' })

  const base = { exercicio_id: ex.id, lista_id: ex.lista_id, user_id: user.id, enunciado: ex.enunciado, resposta }

  if (ex.tipo === 'livre') {
    const { error } = await supabaseAdmin.from('resultados_extras').insert({ ...base, correta: null, status: 'pendente' })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ status: 'pendente' })
  }
  if (!TIPOS_AUTO.includes(ex.tipo)) return res.status(400).json({ error: 'Este tipo de exercício ainda não é suportado' })

  let correta
  if (ex.tipo === 'mc') {
    correta = resposta === ex.resposta
  } else {
    const aceitas = [ex.resposta, ...(Array.isArray(ex.alternativas) ? ex.alternativas : [])]
    correta = aceitas.some(a => conferirResposta(resposta, a))
  }
  const { error } = await supabaseAdmin.from('resultados_extras')
    .insert({ ...base, resposta_certa: ex.resposta, correta, status: 'corrigido' })
  if (error) return res.status(400).json({ error: error.message })
  res.status(200).json({ status: 'corrigido', correta, respostaCerta: ex.resposta })
}
