import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { corrigir } from '../../../lib/exerciciosServer'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Sem token' })
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return res.status(401).json({ error: 'Sessao invalida' })

  const unitId = Number(req.body?.unitId)
  const questionIdx = Number(req.body?.questionIdx)
  if (!Number.isInteger(unitId) || !Number.isInteger(questionIdx)) return res.status(400).json({ error: 'Dados invalidos' })

  const r = corrigir(unitId, questionIdx, req.body?.userAnswer)
  if (!r) return res.status(400).json({ error: 'Exercicio inexistente' })

  const { error: ie } = await supabaseAdmin.from('exercise_results').insert({
    user_id: data.user.id,
    unit_id: unitId,
    question_idx: questionIdx,
    question: r.question,
    user_answer: r.userAnswer,
    correct_answer: r.correct,
    is_correct: r.isCorrect
  })
  if (ie) return res.status(400).json({ error: ie.message })
  res.status(200).json({ ok: true })
}
