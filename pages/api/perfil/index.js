import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { isTeacher } from '../../../lib/authz'
import { getUsuario, podeEnviarFoto } from '../../../lib/chat'
import { VERSOES } from '../../../lib/lgpd/config'

const BUCKET = 'avatars'

export async function urlDaFoto(path) {
  if (!path) return null
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl || null
}

// GET: meu perfil. PUT: salvar nome de exibicao e idade.
export default async function handler(req, res) {
  const user = await getUsuario(req)
  if (!user) return res.status(401).json({ error: 'Sessão inválida' })

  if (req.method === 'GET') {
    const [{ data: p }, { data: cad }, podeFoto, aceite] = await Promise.all([
      supabaseAdmin.from('perfis_usuario').select('nome_exibicao, idade, foto_path').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      podeEnviarFoto(user),
      supabaseAdmin.from('aceites_termos').select('id').eq('user_id', user.id)
        .eq('versao_termos', VERSOES.termos).eq('versao_privacidade', VERSOES.privacidade).maybeSingle()
    ])
    return res.status(200).json({
      papel: isTeacher(user) ? 'professor' : 'aluno',
      email: user.email,
      nomeCadastro: cad?.full_name || null,
      nomeExibicao: p?.nome_exibicao || null,
      idade: p?.idade ?? null,
      fotoUrl: await urlDaFoto(p?.foto_path),
      podeFoto,
      // Se a tabela de aceites ainda nao existir (migracao 009 pendente), nao trava o acesso
      aceiteOk: aceite.error ? true : !!aceite.data
    })
  }

  if (req.method === 'PUT') {
    const nome = String(req.body?.nomeExibicao ?? '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
    if (nome.length > 40) return res.status(400).json({ error: 'O nome deve ter no máximo 40 caracteres' })
    let idade = req.body?.idade
    if (idade === '' || idade === undefined || idade === null) idade = null
    else {
      idade = Number(idade)
      if (!Number.isInteger(idade) || idade < 3 || idade > 120) return res.status(400).json({ error: 'Idade inválida' })
    }
    const { error } = await supabaseAdmin.from('perfis_usuario').upsert({
      user_id: user.id, nome_exibicao: nome || null, idade, updated_at: new Date().toISOString()
    })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
