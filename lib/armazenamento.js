import { supabaseAdmin } from './supabaseAdmin'

// Le o corpo binario da requisicao com limite de tamanho (para rotas com bodyParser desligado).
export function lerCorpo(req, max) {
  return new Promise((resolve, reject) => {
    const partes = []
    let total = 0
    req.on('data', (c) => {
      total += c.length
      if (total > max) { reject(new Error('Arquivo grande demais')); req.destroy(); return }
      partes.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(partes)))
    req.on('error', reject)
  })
}

// Detecta o formato real do audio pelos primeiros bytes (nao confia no que o navegador diz).
export function detectarAudio(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { mime: 'audio/webm', ext: 'webm' }
  if (buf.slice(0, 4).toString('latin1') === 'OggS') return { mime: 'audio/ogg', ext: 'ogg' }
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a' }
  return null
}

// Detecta PDF, JPEG ou PNG (termo assinado digitalizado).
export function detectarDocumento(buf) {
  if (!buf || buf.length < 8) return null
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf[0] === 0x89 && buf.slice(1, 4).toString('latin1') === 'PNG') return { mime: 'image/png', ext: 'png' }
  return null
}

export async function removerArquivos(bucket, caminhos) {
  const lista = [...new Set((caminhos || []).filter(Boolean))]
  if (!lista.length) return
  await supabaseAdmin.storage.from(bucket).remove(lista)
}

export async function linkTemporario(bucket, caminho, segundos = 3600) {
  if (!caminho) return null
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(caminho, segundos)
  return data?.signedUrl || null
}

// Links temporarios para varios caminhos de uma vez: devolve { caminho: url }.
export async function linksTemporarios(bucket, caminhos, segundos = 3600) {
  const lista = [...new Set((caminhos || []).filter(Boolean))]
  if (!lista.length) return {}
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls(lista, segundos)
  const mapa = {}
  for (const d of data || []) if (d?.signedUrl && d.path) mapa[d.path] = d.signedUrl
  return mapa
}

// Remove os audios de resultados (por filtro) e limpa a referencia no banco.
export async function apagarAudiosDe(filtro) {
  let q = supabaseAdmin.from('resultados_extras').select('id, audio_path').not('audio_path', 'is', null)
  for (const [col, val] of Object.entries(filtro)) q = q.eq(col, val)
  const { data } = await q
  await removerArquivos('audios', (data || []).map(r => r.audio_path))
}
