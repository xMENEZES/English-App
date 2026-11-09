import { supabaseAdmin } from './supabaseAdmin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v)

// O papel fica em app_metadata, que SÓ pode ser alterado pelo servidor (service_role).
// user_metadata é editável pelo próprio usuário e nunca deve ser usado para autorização.
export const isTeacher = (user) => user?.app_metadata?.role === 'teacher'

// Valida o token Bearer e devolve o professor autenticado (ou null).
export async function getTeacher(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !isTeacher(data?.user)) return null
  return data.user
}

// Percorre todas as páginas de usuários (a API limita o tamanho de cada página).
export async function listAllUsers() {
  const all = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return { users: all, error }
    all.push(...data.users)
    if (data.users.length < 1000) break
  }
  return { users: all, error: null }
}

// Alunos que pertencem a um professor (convidados por ele).
export const alunosDoProfessor = (users, teacher) =>
  users.filter(u => !isTeacher(u) && u.app_metadata?.invited_by === teacher.id)

export const limiteDeVagas = (teacher) => Number(teacher.app_metadata?.slot_limit) || 30
