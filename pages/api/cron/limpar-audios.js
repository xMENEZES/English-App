import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { removerArquivos } from '../../../lib/armazenamento'

// Tarefa diaria (Vercel Cron): apaga gravacoes de voz com mais de 12 meses (arquivo + referencia).
// So executa com o segredo CRON_SECRET configurado na Vercel; a Vercel o envia como "Authorization: Bearer ...".
export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || segredo.length < 16) return res.status(503).json({ error: 'CRON_SECRET não configurado' })
  if (req.headers.authorization !== `Bearer ${segredo}`) return res.status(401).json({ error: 'Não autorizado' })

  const limite = new Date(); limite.setMonth(limite.getMonth() - 12)
  let apagados = 0
  for (let rodada = 0; rodada < 10; rodada++) {
    const { data } = await supabaseAdmin.from('resultados_extras').select('id, audio_path')
      .not('audio_path', 'is', null).lt('created_at', limite.toISOString()).limit(200)
    if (!data?.length) break
    await removerArquivos('audios', data.map(r => r.audio_path))
    await supabaseAdmin.from('resultados_extras').update({ audio_path: null, audio_mime: null }).in('id', data.map(r => r.id))
    apagados += data.length
  }
  res.status(200).json({ ok: true, apagados })
}
