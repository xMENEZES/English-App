import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isUuid } from '../../../lib/authz'
import { getUsuario, podeGravarAudio } from '../../../lib/chat'
import { listasVisiveisAoAluno, MAX_AUDIO_SEG } from '../../../lib/extras'
import { lerCorpo, detectarAudio, removerArquivos } from '../../../lib/armazenamento'

// O arquivo chega como corpo binario (nao JSON); por isso o parser padrao fica desligado.
export const config = { api: { bodyParser: false } }

const MAX_BYTES = 1024 * 1024   // 1 MB (60 s em 32 kbps ocupam cerca de 250 KB)

// POST /api/extras/audio?exercicioId=<uuid>&duracao=<segundos>  (corpo = audio)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const exercicioId = String(req.query.exercicioId || '')
  const duracao = Math.round(Number(req.query.duracao))
  if (!isUuid(exercicioId)) return res.status(400).json({ error: 'Exercício inválido' })
  if (!Number.isFinite(duracao) || duracao < 1 || duracao > MAX_AUDIO_SEG + 5) return res.status(400).json({ error: `O áudio deve ter de 1 a ${MAX_AUDIO_SEG} segundos` })

  // Consentimento: adulto, ou menor com o termo v2.0 (inclui gravacao de voz)
  if (!(await podeGravarAudio(user)))
    return res.status(403).json({ error: 'A gravação de voz será liberada quando o professor registrar o consentimento do responsável para áudio.' })

  const { data: ex } = await supabaseAdmin.from('exercicios_extras').select('id, lista_id, tipo, enunciado, resposta').eq('id', exercicioId).maybeSingle()
  if (!ex || ex.tipo !== 'audio') return res.status(404).json({ error: 'Exercício de áudio não encontrado' })
  const visiveis = await listasVisiveisAoAluno(user)
  if (!visiveis.some(l => l.id === ex.lista_id)) return res.status(403).json({ error: 'Você não tem acesso a este exercício' })

  // Limite de frequencia: 10 envios de audio em 10 minutos
  const { count } = await supabaseAdmin.from('resultados_extras').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).not('audio_path', 'is', null).gt('created_at', new Date(Date.now() - 600_000).toISOString())
  if ((count || 0) >= 10) return res.status(429).json({ error: 'Muitos envios de áudio em pouco tempo. Aguarde alguns minutos.' })

  let buf
  try { buf = await lerCorpo(req, MAX_BYTES) } catch (e) { return res.status(413).json({ error: 'O áudio é grande demais (máximo 1 MB)' }) }
  const formato = detectarAudio(buf)
  if (!formato) return res.status(400).json({ error: 'Formato de áudio não suportado' })

  const caminho = `${user.id}/${Date.now()}.${formato.ext}`
  const { error: ue } = await supabaseAdmin.storage.from('audios').upload(caminho, buf, { contentType: formato.mime, upsert: false })
  if (ue) return res.status(400).json({ error: ue.message })

  // Guarda apenas o ultimo audio de cada exercicio: apaga o(s) anterior(es) (minimizacao de dados)
  const { data: antigos } = await supabaseAdmin.from('resultados_extras').select('id, audio_path')
    .eq('user_id', user.id).eq('exercicio_id', ex.id).not('audio_path', 'is', null)

  const { error } = await supabaseAdmin.from('resultados_extras').insert({
    exercicio_id: ex.id, lista_id: ex.lista_id, user_id: user.id, enunciado: ex.enunciado,
    resposta: null, correta: null, status: 'pendente', audio_path: caminho, audio_mime: formato.mime, audio_duracao: duracao
  })
  if (error) { await removerArquivos('audios', [caminho]); return res.status(400).json({ error: error.message }) }

  if (antigos?.length) {
    await removerArquivos('audios', antigos.map(a => a.audio_path))
    await supabaseAdmin.from('resultados_extras').update({ audio_path: null, audio_mime: null }).in('id', antigos.map(a => a.id))
  }
  res.status(200).json({ status: 'pendente' })
}
