import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getTeacher, isUuid, meusAlunos } from '../../../lib/authz'
import { lerCorpo, detectarDocumento, removerArquivos, linkTemporario } from '../../../lib/armazenamento'

// Termo de consentimento assinado, digitalizado (PDF, JPG ou PNG), em bucket privado. So o professor dono acessa.
//  POST   ?alunoId=<uuid>  (corpo = arquivo)   -> anexa/substitui
//  GET    ?alunoId=<uuid>                       -> link temporario para ver
//  DELETE ?alunoId=<uuid>                       -> remove
export const config = { api: { bodyParser: false } }
const MAX_BYTES = 5 * 1024 * 1024

export default async function handler(req, res) {
  const teacher = await getTeacher(req)
  if (!teacher) return res.status(403).json({ error: 'Acesso negado' })
  const alunoId = String(req.query.alunoId || '')
  if (!isUuid(alunoId)) return res.status(400).json({ error: 'Aluno inválido' })

  const { users, error: le } = await meusAlunos(teacher)
  if (le) return res.status(400).json({ error: le.message })
  if (!users.some(u => u.id === alunoId)) return res.status(403).json({ error: 'Este aluno não pertence a você' })

  const { data: cls } = await supabaseAdmin.from('classificacao_aluno')
    .select('menor_idade, consentimento_em, termo_arquivo_path').eq('aluno_id', alunoId).maybeSingle()

  if (req.method === 'GET') {
    if (!cls?.termo_arquivo_path) return res.status(404).json({ error: 'Nenhum termo anexado' })
    return res.status(200).json({ url: await linkTemporario('termos-assinados', cls.termo_arquivo_path, 300) })
  }

  if (req.method === 'POST') {
    if (!cls?.menor_idade || !cls.consentimento_em) return res.status(400).json({ error: 'Registre primeiro o consentimento do responsável' })
    let buf
    try { buf = await lerCorpo(req, MAX_BYTES) } catch (e) { return res.status(413).json({ error: 'Arquivo grande demais (máximo 5 MB)' }) }
    const doc = detectarDocumento(buf)
    if (!doc) return res.status(400).json({ error: 'Envie um PDF, JPG ou PNG' })
    const caminho = `${alunoId}/${Date.now()}.${doc.ext}`
    const { error: ue } = await supabaseAdmin.storage.from('termos-assinados').upload(caminho, buf, { contentType: doc.mime, upsert: false })
    if (ue) return res.status(400).json({ error: ue.message })
    const { error } = await supabaseAdmin.from('classificacao_aluno').update({ termo_arquivo_path: caminho }).eq('aluno_id', alunoId)
    if (error) { await removerArquivos('termos-assinados', [caminho]); return res.status(400).json({ error: error.message }) }
    if (cls.termo_arquivo_path) await removerArquivos('termos-assinados', [cls.termo_arquivo_path])
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    if (cls?.termo_arquivo_path) {
      await removerArquivos('termos-assinados', [cls.termo_arquivo_path])
      await supabaseAdmin.from('classificacao_aluno').update({ termo_arquivo_path: null }).eq('aluno_id', alunoId)
    }
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
