import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getUsuario, podeEnviarFoto } from '../../../lib/chat'

const BUCKET = 'avatars'
const MAX_BYTES = 200 * 1024

export const config = { api: { bodyParser: { sizeLimit: '400kb' } } }

// POST: enviar/trocar a foto (JPEG ja reduzido no navegador). DELETE: remover a foto.
export default async function handler(req, res) {
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  const { data: atual } = await supabaseAdmin.from('perfis_usuario').select('foto_path').eq('user_id', user.id).maybeSingle()

  if (req.method === 'POST') {
    if (!(await podeEnviarFoto(user)))
      return res.status(403).json({ error: 'A foto será liberada quando o professor registrar o consentimento do responsável.' })

    const bruto = String(req.body?.imagem || '')
    const b64 = bruto.replace(/^data:image\/jpeg;base64,/, '')
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return res.status(400).json({ error: 'Imagem inválida' })
    const buf = Buffer.from(b64, 'base64')
    if (buf.length === 0 || buf.length > MAX_BYTES) return res.status(400).json({ error: 'A imagem deve ter no máximo 200 KB' })
    // Assinatura de um arquivo JPEG
    if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return res.status(400).json({ error: 'Envie uma imagem JPEG' })

    const path = `${user.id}/${Date.now()}.jpg`
    const { error: ue } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: 'image/jpeg', upsert: false })
    if (ue) return res.status(400).json({ error: ue.message })
    const { error } = await supabaseAdmin.from('perfis_usuario').upsert({
      user_id: user.id, foto_path: path, foto_atualizada_em: new Date().toISOString(), updated_at: new Date().toISOString()
    })
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([path])
      return res.status(400).json({ error: error.message })
    }
    if (atual?.foto_path) await supabaseAdmin.storage.from(BUCKET).remove([atual.foto_path])
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (atual?.foto_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([atual.foto_path])
      await supabaseAdmin.from('perfis_usuario').update({ foto_path: null, foto_atualizada_em: null, updated_at: new Date().toISOString() }).eq('user_id', user.id)
    }
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
