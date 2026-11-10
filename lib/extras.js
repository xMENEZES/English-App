import { supabaseAdmin } from './supabaseAdmin'
import { isUuid } from './authz'

export const LIM = { listas: 50, exerciciosPorLista: 100, enunciado: 600, opcao: 150, resposta: 300, livre: 2000, comentario: 1000 }
export const TIPOS_AUTO = ['mc', 'fill', 'translate']
export const TIPOS = ['mc', 'fill', 'translate', 'livre']   // 'audio' entra na proxima etapa

const txt = (v) => String(v ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()

export const validarTitulo = (v) => {
  const t = txt(v).replace(/\s+/g, ' ')
  return t && t.length <= 80 ? t : null
}

// unidade: null (fora das unidades) ou inteiro 1..30. Retorna undefined se invalida.
export const validarUnidade = (v) => {
  if (v === null || v === '' || v === undefined) return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 30 ? n : undefined
}

// Valida e normaliza os dados de um exercicio. Retorna { erro } ou { valor }.
export function validarExercicio(b) {
  const tipo = b?.tipo
  if (!TIPOS.includes(tipo)) return { erro: 'Tipo de exercício inválido' }
  const enunciado = txt(b?.enunciado)
  if (!enunciado || enunciado.length > LIM.enunciado) return { erro: `O enunciado deve ter de 1 a ${LIM.enunciado} caracteres` }
  const valor = { tipo, enunciado, opcoes: null, resposta: null, alternativas: null }

  if (tipo === 'mc') {
    const opcoes = Array.isArray(b?.opcoes) ? b.opcoes.map(txt).filter(Boolean) : []
    if (opcoes.length < 2 || opcoes.length > 6) return { erro: 'Informe de 2 a 6 alternativas' }
    if (opcoes.some(o => o.length > LIM.opcao)) return { erro: `Cada alternativa deve ter até ${LIM.opcao} caracteres` }
    if (new Set(opcoes.map(o => o.toLowerCase())).size !== opcoes.length) return { erro: 'Há alternativas repetidas' }
    const resposta = txt(b?.resposta)
    if (!opcoes.includes(resposta)) return { erro: 'Marque qual alternativa é a correta' }
    valor.opcoes = opcoes
    valor.resposta = resposta
  } else if (tipo === 'fill' || tipo === 'translate') {
    const resposta = txt(b?.resposta)
    if (!resposta || resposta.length > LIM.resposta) return { erro: `A resposta correta deve ter de 1 a ${LIM.resposta} caracteres` }
    const alt = Array.isArray(b?.alternativas) ? b.alternativas.map(txt).filter(Boolean) : []
    if (alt.length > 10 || alt.some(a => a.length > LIM.resposta)) return { erro: 'Respostas alternativas inválidas (máximo 10)' }
    valor.resposta = resposta
    valor.alternativas = alt
  }
  return { valor }
}

export const limparTextoResposta = txt

// Lista pertence ao professor? Retorna a lista ou null.
export async function listaDoProfessor(id, teacher) {
  if (!isUuid(id)) return null
  const { data } = await supabaseAdmin.from('listas_extras').select('*').eq('id', id).maybeSingle()
  return data && data.teacher_id === teacher.id ? data : null
}

// Listas publicadas que este aluno pode ver (destinatario direto ou via turma).
export async function listasVisiveisAoAluno(user) {
  const teacherId = user.app_metadata?.invited_by
  if (!teacherId) return []
  const [{ data: listas }, { data: minhasTurmas }] = await Promise.all([
    supabaseAdmin.from('listas_extras').select('*').eq('teacher_id', teacherId).eq('publicada', true),
    supabaseAdmin.from('turma_alunos').select('turma_id').eq('aluno_id', user.id)
  ])
  if (!listas?.length) return []
  const turmaIds = new Set((minhasTurmas || []).map(t => t.turma_id))
  const { data: dest } = await supabaseAdmin.from('listas_extras_destinatarios')
    .select('lista_id, tipo, aluno_id, turma_id').in('lista_id', listas.map(l => l.id))
  const ok = new Set()
  for (const d of dest || []) {
    if ((d.tipo === 'aluno' && d.aluno_id === user.id) || (d.tipo === 'turma' && turmaIds.has(d.turma_id))) ok.add(d.lista_id)
  }
  return listas.filter(l => ok.has(l.id))
}

// Ultimo resultado de cada exercicio (para um conjunto de resultados ordenados do mais novo ao mais antigo).
export function ultimoPorExercicio(rows) {
  const m = {}
  for (const r of rows || []) if (!m[r.exercicio_id]) m[r.exercicio_id] = r
  return m
}
