import { supabaseAdmin } from './supabaseAdmin'
import { isTeacher } from './authz'

export const MAX_TEXTO = 2000

// Aluno esta liberado para o chat? (adulto, ou menor com consentimento registrado)
export async function alunoLiberado(alunoId) {
  const { data } = await supabaseAdmin
    .from('classificacao_aluno').select('menor_idade, consentimento_em').eq('aluno_id', alunoId).maybeSingle()
  if (!data) return false
  return data.menor_idade === false || !!data.consentimento_em
}

// Valida o token Bearer e devolve o usuario (professor ou aluno) ou null.
export async function getUsuario(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Pode este usuario participar (ler/escrever) desta conversa?
export async function podeParticipar(user, conversa) {
  if (!conversa) return false
  if (isTeacher(user)) return conversa.teacher_id === user.id
  if (!(await alunoLiberado(user.id))) return false
  if (conversa.tipo === 'individual') return conversa.aluno_id === user.id
  const { data } = await supabaseAdmin
    .from('turma_alunos').select('aluno_id').eq('turma_id', conversa.turma_id).eq('aluno_id', user.id).maybeSingle()
  return !!data
}

// Cria (se nao existir) a conversa individual professor-aluno.
export async function garantirIndividual(teacherId, alunoId) {
  const { data: ex } = await supabaseAdmin.from('conversas').select('*')
    .eq('tipo', 'individual').eq('teacher_id', teacherId).eq('aluno_id', alunoId).maybeSingle()
  if (ex) return ex
  const { data, error } = await supabaseAdmin.from('conversas')
    .insert({ tipo: 'individual', teacher_id: teacherId, aluno_id: alunoId }).select('*').single()
  if (!error) return data
  // corrida: outra requisicao criou primeiro
  const { data: again } = await supabaseAdmin.from('conversas').select('*')
    .eq('tipo', 'individual').eq('teacher_id', teacherId).eq('aluno_id', alunoId).maybeSingle()
  return again
}

// Cria (se nao existir) a conversa da turma.
export async function garantirTurma(teacherId, turmaId) {
  const { data: ex } = await supabaseAdmin.from('conversas').select('*').eq('tipo', 'turma').eq('turma_id', turmaId).maybeSingle()
  if (ex) return ex
  const { data, error } = await supabaseAdmin.from('conversas')
    .insert({ tipo: 'turma', teacher_id: teacherId, turma_id: turmaId }).select('*').single()
  if (!error) return data
  const { data: again } = await supabaseAdmin.from('conversas').select('*').eq('tipo', 'turma').eq('turma_id', turmaId).maybeSingle()
  return again
}

// Foto de perfil: professor sempre; aluno so se liberado (adulto, ou menor com consentimento registrado).
export async function podeEnviarFoto(user) {
  if (isTeacher(user)) return true
  return alunoLiberado(user.id)
}

// Gravacao de audio (voz): adulto classificado, ou menor com consentimento do responsavel
// registrado na versao 2.0 ou superior do termo (a que inclui a gravacao de voz).
export async function podeGravarAudio(user) {
  if (isTeacher(user)) return false
  const { data } = await supabaseAdmin
    .from('classificacao_aluno').select('menor_idade, consentimento_em, versao_termo').eq('aluno_id', user.id).maybeSingle()
  if (!data) return false
  if (data.menor_idade === false) return true
  const major = parseInt(String(data.versao_termo || '0').split('.')[0], 10)
  return !!data.consentimento_em && major >= 2
}
