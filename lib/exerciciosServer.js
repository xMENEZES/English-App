import fs from 'fs'
import path from 'path'
import vm from 'vm'

// Carrega o gabarito (public/exercises.js) NO SERVIDOR para corrigir as respostas.
// Assim o navegador nao decide se a resposta esta certa (is_correct era forjavel).
let cache = null

function carregar() {
  if (cache) return cache
  const codigo = fs.readFileSync(path.join(process.cwd(), 'public', 'exercises.js'), 'utf8')
  const el = () => ({ classList: { add() {}, remove() {}, toggle() {} }, style: {}, innerHTML: '', textContent: '' })
  const ctx = {
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { getElementById: el, querySelectorAll: () => [] },
    setTimeout() {},
    console
  }
  vm.createContext(ctx)
  try { vm.runInContext(codigo, ctx, { timeout: 2000 }) } catch (e) { /* trechos de DOM podem falhar; UNITS e answerMatch ja foram definidos */ }
  if (!ctx.UNITS || typeof ctx.answerMatch !== 'function') throw new Error('Gabarito indisponivel')
  cache = { UNITS: ctx.UNITS, answerMatch: ctx.answerMatch }
  return cache
}

// Devolve { question, correct, isCorrect } ou null se unidade/questao invalida.
export function corrigir(unitId, questionIdx, userAnswer) {
  const { UNITS, answerMatch } = carregar()
  const ex = UNITS[unitId]?.exercises?.[questionIdx]
  if (!ex) return null
  const resposta = String(userAnswer ?? '').slice(0, 500)
  const isCorrect = ex.type === 'mc' ? resposta === ex.ans : answerMatch(resposta, ex.ans)
  return { question: ex.q, correct: ex.ans, isCorrect, userAnswer: resposta }
}
