import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { getUsuario } from '../../lib/chat'
import { VERSOES } from '../../lib/lgpd/config'

// GET: o usuario ja aceitou as versoes vigentes? POST: registra o aceite das versoes vigentes.
export default async function handler(req, res) {
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('aceites_termos').select('aceito_em')
      .eq('user_id', user.id).eq('versao_termos', VERSOES.termos).eq('versao_privacidade', VERSOES.privacidade).maybeSingle()
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ aceito: !!data, aceitoEm: data?.aceito_em || null, versoes: VERSOES })
  }

  if (req.method === 'POST') {
    if (req.body?.aceito !== true) return res.status(400).json({ error: 'É necessário aceitar para continuar' })
    const { error } = await supabaseAdmin.from('aceites_termos').upsert(
      { user_id: user.id, versao_termos: VERSOES.termos, versao_privacidade: VERSOES.privacidade },
      { onConflict: 'user_id,versao_termos,versao_privacidade', ignoreDuplicates: true }
    )
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
