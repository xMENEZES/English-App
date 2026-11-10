import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { UNIDADES } from '../lib/unidades'
import Head from 'next/head'

const TIPOS = [
  { v: 'mc', t: 'Múltipla escolha' },
  { v: 'fill', t: 'Completar a lacuna' },
  { v: 'translate', t: 'Tradução' },
  { v: 'livre', t: 'Resposta livre (você corrige)' },
  { v: 'audio', t: 'Resposta em áudio (o aluno grava a voz)' }
]
const ROTULO = { mc: 'Múltipla escolha', fill: 'Completar', translate: 'Tradução', livre: 'Livre', audio: 'Áudio' }
const FORM_VAZIO = { id: null, tipo: 'mc', enunciado: '', opcoes: ['', '', '', ''], correta: 0, resposta: '', alternativas: '' }

export default function MeusExercicios() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState('listas')
  const [listas, setListas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [pendentesQtd, setPendentesQtd] = useState(0)
  const [selId, setSelId] = useState(null)
  const [dados, setDados] = useState({ titulo: '', unidade: '', publicada: false, alunoIds: [], turmaIds: [] })
  const [exercicios, setExercicios] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [pendentes, setPendentes] = useState([])
  const [correcoes, setCorrecoes] = useState({})
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  const sel = listas.find(l => l.id === selId) || null
  const avisar = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: '', texto: '' }), 4500) }

  const api = async (url, opts = {}) => {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    const r = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, d }
  }

  const carregar = async () => {
    const [l, t, a] = await Promise.all([api('/api/extras/listas'), api('/api/turmas'), api('/api/admin/list-users')])
    if (l.ok) { setListas(l.d.listas || []); setPendentesQtd(l.d.pendentes || 0) }
    if (t.ok) setTurmas(t.d.turmas || [])
    if (a.ok) {
      const ls = (a.d.students || []).map(s => ({ ...s, nome: s.full_name || s.email }))
      ls.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR', { sensitivity: 'base' }))
      setAlunos(ls)
    }
    setCarregando(false)
  }

  const carregarPendentes = async () => {
    const { ok, d } = await api('/api/extras/resultados?pendentes=1')
    if (ok) setPendentes(d.pendentes || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      if (session.user.app_metadata?.role !== 'teacher') { router.push('/exercicios'); return }
      carregar()
    })
  }, [])

  useEffect(() => { if (aba === 'pendentes') carregarPendentes() }, [aba])

  const abrirLista = async (l) => {
    setSelId(l.id)
    setDados({ titulo: l.titulo, unidade: l.unidade ?? '', publicada: l.publicada, alunoIds: l.alunoIds, turmaIds: l.turmaIds })
    setForm(FORM_VAZIO)
    setExercicios([])
    const { ok, d } = await api(`/api/extras/exercicios?listaId=${l.id}`)
    if (ok) setExercicios(d.exercicios || [])
  }

  const criarLista = async (e) => {
    e.preventDefault()
    if (!novoTitulo.trim()) return
    const { ok, d } = await api('/api/extras/listas', { method: 'POST', body: { titulo: novoTitulo, unidade: null } })
    if (!ok) { avisar('err', d.error || 'Erro ao criar a lista'); return }
    setNovoTitulo('')
    setSelId(null)
    await carregar()
    avisar('ok', `Lista "${d.lista.titulo}" criada! Clique nela para adicionar exercícios.`)
  }

  const salvarLista = async () => {
    if (!sel) return
    setSalvando(true)
    const r1 = await api('/api/extras/listas', { method: 'PATCH', body: {
      id: sel.id, titulo: dados.titulo, unidade: dados.unidade === '' ? null : Number(dados.unidade), publicada: dados.publicada } })
    if (!r1.ok) { setSalvando(false); avisar('err', r1.d.error || 'Erro ao salvar'); return }
    const r2 = await api('/api/extras/destinatarios', { method: 'PUT', body: { listaId: sel.id, alunoIds: dados.alunoIds, turmaIds: dados.turmaIds } })
    setSalvando(false)
    if (!r2.ok) { avisar('err', r2.d.error || 'Erro ao salvar destinatários'); return }
    await carregar()
    avisar('ok', 'Lista salva.')
  }

  const excluirLista = async () => {
    if (!sel || !window.confirm(`Excluir a lista "${sel.titulo}" e todos os exercícios e respostas dela? Esta ação é definitiva.`)) return
    const { ok, d } = await api('/api/extras/listas', { method: 'DELETE', body: { id: sel.id } })
    if (!ok) { avisar('err', d.error || 'Erro ao excluir'); return }
    setSelId(null)
    await carregar()
    avisar('ok', 'Lista excluída.')
  }

  const alternar = (campo, id) => setDados(d => ({ ...d, [campo]: d[campo].includes(id) ? d[campo].filter(x => x !== id) : [...d[campo], id] }))

  const editarExercicio = (ex) => {
    setForm({
      id: ex.id, tipo: ex.tipo, enunciado: ex.enunciado,
      opcoes: ex.tipo === 'mc' ? [...ex.opcoes, '', '', '', '', '', ''].slice(0, Math.max(4, ex.opcoes.length)) : ['', '', '', ''],
      correta: ex.tipo === 'mc' ? Math.max(0, ex.opcoes.indexOf(ex.resposta)) : 0,
      resposta: ex.tipo === 'mc' ? '' : (ex.resposta || ''),
      alternativas: (ex.alternativas || []).join('\n')
    })
  }

  const salvarExercicio = async (e) => {
    e.preventDefault()
    if (!sel) return
    const body = { tipo: form.tipo, enunciado: form.enunciado }
    if (form.tipo === 'mc') {
      const opcoes = form.opcoes.map(o => o.trim()).filter(Boolean)
      body.opcoes = opcoes
      body.resposta = (form.opcoes[form.correta] || '').trim()
    } else if (form.tipo === 'audio') {
      body.resposta = form.resposta   // frase de referência (opcional; só o professor vê)
    } else if (form.tipo !== 'livre') {
      body.resposta = form.resposta
      body.alternativas = form.alternativas.split('\n').map(a => a.trim()).filter(Boolean)
    }
    const r = form.id
      ? await api('/api/extras/exercicios', { method: 'PATCH', body: { ...body, id: form.id } })
      : await api('/api/extras/exercicios', { method: 'POST', body: { ...body, listaId: sel.id } })
    if (!r.ok) { avisar('err', r.d.error || 'Erro ao salvar o exercício'); return }
    setForm(FORM_VAZIO)
    const l = await api(`/api/extras/exercicios?listaId=${sel.id}`)
    if (l.ok) setExercicios(l.d.exercicios || [])
    await carregar()
    avisar('ok', form.id ? 'Exercício atualizado.' : 'Exercício adicionado.')
  }

  const excluirExercicio = async (ex) => {
    if (!window.confirm('Excluir este exercício e as respostas dos alunos nele?')) return
    const { ok, d } = await api('/api/extras/exercicios', { method: 'DELETE', body: { id: ex.id } })
    if (!ok) { avisar('err', d.error || 'Erro ao excluir'); return }
    setExercicios(xs => xs.filter(x => x.id !== ex.id))
    if (form.id === ex.id) setForm(FORM_VAZIO)
    await carregar()
  }

  const corrigir = async (p, avaliacao) => {
    const { ok, d } = await api('/api/extras/corrigir', { method: 'POST', body: { resultadoId: p.id, avaliacao, comentario: correcoes[p.id] || '' } })
    if (!ok) { avisar('err', d.error || 'Erro ao corrigir'); return }
    setPendentes(ps => ps.filter(x => x.id !== p.id))
    setPendentesQtd(n => Math.max(0, n - 1))
    avisar('ok', 'Correção enviada ao aluno.')
  }

  const sair = async () => { await supabase.auth.signOut(); router.push('/') }

  if (carregando) return <div style={s.loading}>Carregando...</div>

  return (
    <>
      <Head><title>English Step By Step - Meus Exercícios</title></Head>

      <div style={s.page}>
        {msg.texto && <div style={{ ...s.msg, ...(msg.tipo === 'ok' ? s.msgOk : s.msgErr) }}>{msg.texto}</div>}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setAba('listas')} style={{ ...s.aba, ...(aba === 'listas' ? s.abaAtiva : {}) }}>Listas de exercícios</button>
          <button onClick={() => setAba('pendentes')} style={{ ...s.aba, ...(aba === 'pendentes' ? s.abaAtiva : {}) }}>
            Pendentes de correção{pendentesQtd > 0 && <span style={s.badge}>{pendentesQtd}</span>}
          </button>
        </div>

        {aba === 'pendentes' ? (
          <div style={s.card}>
            <h2 style={s.titulo}>Respostas aguardando a sua correção</h2>
            {pendentes.length === 0 && <p style={s.vazio}>Nenhuma resposta pendente. 🎉</p>}
            {pendentes.map(p => (
              <div key={p.id} style={s.pendente}>
                <div style={{ fontSize: '.78rem', color: '#777' }}>{p.aluno} · {p.lista} · {new Date(p.created_at).toLocaleString('pt-BR')}</div>
                <div style={{ fontWeight: 600, margin: '6px 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.enunciado}</div>
                {p.audioUrl
                  ? <audio controls preload="none" src={p.audioUrl} style={{ width: '100%' }} />
                  : p.resposta
                    ? <div style={s.respAluno}>{p.resposta}</div>
                    : <div style={s.respAluno}>(gravação de voz indisponível)</div>}
                <textarea value={correcoes[p.id] || ''} onChange={e => setCorrecoes(c => ({ ...c, [p.id]: e.target.value.slice(0, 1000) }))}
                  placeholder="Comentário para o aluno (opcional)" rows={2} style={{ ...s.input, width: '100%', margin: '10px 0', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => corrigir(p, 'adequada')} style={s.btnOk}>✅ Adequada</button>
                  <button onClick={() => corrigir(p, 'melhorar')} style={s.btnMelhorar}>🔁 Precisa melhorar</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.grid}>
            {/* Listas */}
            <div style={s.card}>
              <h2 style={s.titulo}>Minhas listas</h2>
              <form onSubmit={criarLista} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} maxLength={80} placeholder="Título da nova lista"
                  style={{ ...s.input, flex: 1, minWidth: 0 }} />
                <button type="submit" style={s.btnPrimario}>Criar</button>
              </form>
              {listas.length === 0 && <p style={s.vazio}>Nenhuma lista ainda. Crie a primeira acima.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {listas.map(l => (
                  <button key={l.id} onClick={() => abrirLista(l)} style={{ ...s.listaBtn, ...(l.id === selId ? s.listaBtnAtiva : {}) }}>
                    <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{l.titulo}</span>
                    <span style={{ fontSize: '.76rem', color: '#666' }}>
                      {l.unidade ? `Módulo da Unidade ${l.unidade}` : 'Outros exercícios'} · {l.totalExercicios} exerc.
                      {' · '}<b style={{ color: l.publicada ? '#2e7d32' : '#c62828' }}>{l.publicada ? 'Publicada' : 'Rascunho'}</b>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div style={s.card}>
              {!sel ? <p style={s.vazio}>Clique em uma lista para editar os dados, os destinatários e os exercícios.</p> : (
                <>
                  <h2 style={s.titulo}>Dados da lista</h2>
                  <label style={s.label}>Título (aparece para o aluno)</label>
                  <input value={dados.titulo} onChange={e => setDados(d => ({ ...d, titulo: e.target.value }))} maxLength={80}
                    style={{ ...s.input, width: '100%', marginBottom: '12px' }} />

                  <label style={s.label}>Módulo em que a lista aparece para o aluno</label>
                  <select value={dados.unidade} onChange={e => setDados(d => ({ ...d, unidade: e.target.value }))}
                    style={{ ...s.input, width: '100%', marginBottom: '12px', background: '#fff' }}>
                    <option value="">Outros exercícios (sem unidade)</option>
                    {UNIDADES.map((u, i) => <option key={i} value={i + 1}>Módulo da Unidade {i + 1}: {u}</option>)}
                  </select>

                  <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={dados.publicada} onChange={e => setDados(d => ({ ...d, publicada: e.target.checked }))}
                      style={{ width: '18px', height: '18px' }} />
                    Publicada (os destinatários só veem quando estiver marcada)
                  </label>

                  <label style={{ ...s.label, marginTop: '12px' }}>Quem vê esta lista</label>
                  {turmas.length > 0 && <>
                    <div style={s.sub}>Turmas</div>
                    <div style={s.caixa}>
                      {turmas.map(t => (
                        <label key={t.id} style={s.linha}>
                          <input type="checkbox" checked={dados.turmaIds.includes(t.id)} onChange={() => alternar('turmaIds', t.id)} style={s.chk} />
                          🏫 {t.nome} <span style={{ color: '#888', fontSize: '.78rem' }}>({t.alunoIds.length})</span>
                        </label>
                      ))}
                    </div>
                  </>}
                  <div style={s.sub}>Alunos</div>
                  <div style={{ ...s.caixa, maxHeight: '180px' }}>
                    {alunos.length === 0 && <p style={s.vazio}>Você ainda não tem alunos.</p>}
                    {alunos.map(a => (
                      <label key={a.id} style={s.linha}>
                        <input type="checkbox" checked={dados.alunoIds.includes(a.id)} onChange={() => alternar('alunoIds', a.id)} style={s.chk} />
                        <span style={{ overflowWrap: 'anywhere' }}>{a.nome}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap', margin: '14px 0 22px' }}>
                    <button onClick={excluirLista} style={s.btnRemover}>Excluir lista</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelId(null)} style={s.btnFechar}>Fechar</button>
                      <button onClick={salvarLista} disabled={salvando} style={{ ...s.btnPrimario, opacity: salvando ? .5 : 1 }}>
                        {salvando ? 'Salvando...' : 'Salvar lista'}
                      </button>
                    </div>
                  </div>

                  <h2 style={s.titulo}>Exercícios da lista ({exercicios.length})</h2>
                  {exercicios.map((ex, i) => (
                    <div key={ex.id} style={s.exItem}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.74rem', color: '#1565c0', fontWeight: 700 }}>{i + 1}. {ROTULO[ex.tipo]}</div>
                        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.9rem' }}>{ex.enunciado}</div>
                        {ex.tipo === 'mc' && <div style={s.det}>Alternativas: {ex.opcoes.join(' | ')} — certa: <b>{ex.resposta}</b></div>}
                        {(ex.tipo === 'fill' || ex.tipo === 'translate') && <div style={s.det}>Resposta: <b>{ex.resposta}</b>{ex.alternativas?.length ? ` (também aceita: ${ex.alternativas.join(' | ')})` : ''}</div>}
                        {ex.tipo === 'livre' && <div style={s.det}>Resposta livre — corrigida por você</div>}
                        {ex.tipo === 'audio' && <div style={s.det}>Resposta em áudio — você ouve e corrige{ex.resposta ? ` (referência: ${ex.resposta})` : ''}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={() => editarExercicio(ex)} style={s.btnMini}>Editar</button>
                        <button onClick={() => excluirExercicio(ex)} style={{ ...s.btnMini, color: '#c62828', borderColor: '#ef9a9a' }}>Excluir</button>
                      </div>
                    </div>
                  ))}

                  <form onSubmit={salvarExercicio} style={s.formEx}>
                    <div style={{ fontWeight: 700, color: '#0d2157', marginBottom: '10px' }}>{form.id ? 'Editar exercício' : 'Novo exercício'}</div>
                    <label style={s.label}>Tipo</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      style={{ ...s.input, width: '100%', marginBottom: '10px', background: '#fff' }}>
                      {TIPOS.map(t => <option key={t.v} value={t.v}>{t.t}</option>)}
                    </select>

                    <label style={s.label}>Enunciado</label>
                    <textarea value={form.enunciado} onChange={e => setForm(f => ({ ...f, enunciado: e.target.value.slice(0, 600) }))} rows={3}
                      placeholder={form.tipo === 'fill' ? "Ex.: Complete: 'I ___ coffee.' (Eu bebo café.)" : form.tipo === 'translate' ? 'Ex.: Traduza para o inglês: "Eu como pão."' : form.tipo === 'livre' ? 'Ex.: Escreva 3 frases sobre a sua rotina.' : 'Ex.: Qual é a tradução de "milk"?'}
                      style={{ ...s.input, width: '100%', marginBottom: '10px', resize: 'vertical' }} required />

                    {form.tipo === 'mc' && (
                      <>
                        <label style={s.label}>Alternativas (marque a correta)</label>
                        {form.opcoes.map((o, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <input type="radio" name="correta" checked={form.correta === i} onChange={() => setForm(f => ({ ...f, correta: i }))} style={s.chk} />
                            <input value={o} onChange={e => setForm(f => { const op = [...f.opcoes]; op[i] = e.target.value; return { ...f, opcoes: op } })}
                              maxLength={150} placeholder={`Alternativa ${i + 1}`} style={{ ...s.input, flex: 1, minWidth: 0 }} />
                          </div>
                        ))}
                        {form.opcoes.length < 6 && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, opcoes: [...f.opcoes, ''] }))} style={s.btnMini}>+ alternativa</button>
                        )}
                      </>
                    )}

                    {(form.tipo === 'fill' || form.tipo === 'translate') && (
                      <>
                        <label style={s.label}>Resposta correta</label>
                        <input value={form.resposta} onChange={e => setForm(f => ({ ...f, resposta: e.target.value }))} maxLength={300}
                          style={{ ...s.input, width: '100%', marginBottom: '10px' }} required />
                        <label style={s.label}>Outras respostas aceitas (uma por linha, opcional)</label>
                        <textarea value={form.alternativas} onChange={e => setForm(f => ({ ...f, alternativas: e.target.value }))} rows={2}
                          style={{ ...s.input, width: '100%', resize: 'vertical' }} />
                        <div style={s.dica}>A correção ignora maiúsculas e a pontuação final.</div>
                      </>
                    )}

                    {form.tipo === 'livre' && <div style={s.dica}>O aluno escreve um texto livre. Você corrige em "Pendentes de correção".</div>}

                    {form.tipo === 'audio' && (
                      <>
                        <label style={s.label}>Frase de referência (opcional; só você vê)</label>
                        <input value={form.resposta} onChange={e => setForm(f => ({ ...f, resposta: e.target.value }))} maxLength={300}
                          placeholder="Ex.: I usually wake up at seven." style={{ ...s.input, width: '100%' }} />
                        <div style={s.dica}>O aluno grava até 60 segundos de voz. Você ouve em "Pendentes de correção" e marca adequada ou precisa melhorar. Só alunos liberados (adulto, ou menor com o termo v2.0 assinado) conseguem gravar.</div>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button type="submit" style={s.btnPrimario}>{form.id ? 'Salvar exercício' : 'Adicionar exercício'}</button>
                      {form.id && <button type="button" onClick={() => setForm(FORM_VAZIO)} style={s.btnFechar}>Cancelar edição</button>}
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const s = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontFamily: 'Segoe UI,sans-serif', color: '#0d2157' },
  header: { background: 'linear-gradient(135deg,#0d2157,#1565c0)', color: '#fff', padding: '13px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.2)' },
  page: { maxWidth: '1100px', margin: '0 auto', padding: '22px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '18px', alignItems: 'start' },
  card: { background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
  titulo: { fontSize: '1.05rem', fontWeight: 700, color: '#0d2157', marginBottom: '14px' },
  vazio: { color: '#888', fontSize: '.9rem' },
  label: { display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#333', marginBottom: '6px' },
  sub: { fontSize: '.78rem', color: '#777', margin: '8px 0 4px', fontWeight: 600 },
  input: { border: '2px solid #e0e0e0', borderRadius: '9px', padding: '9px 12px', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  caixa: { maxHeight: '140px', overflowY: 'auto', border: '2px solid #f0f0f0', borderRadius: '10px', padding: '6px' },
  linha: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', cursor: 'pointer', fontSize: '.9rem' },
  chk: { width: '18px', height: '18px', flexShrink: 0 },
  listaBtn: { display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', textAlign: 'left', padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', background: '#fff', color: '#222' },
  listaBtnAtiva: { borderColor: '#1565c0', background: '#e3f2fd' },
  exItem: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #e8eef5', borderRadius: '10px', marginBottom: '8px', background: '#fafcff' },
  det: { fontSize: '.78rem', color: '#555', marginTop: '3px', overflowWrap: 'anywhere' },
  formEx: { marginTop: '16px', padding: '14px', border: '2px dashed #bbdefb', borderRadius: '12px' },
  dica: { fontSize: '.78rem', color: '#777', marginTop: '6px' },
  aba: { padding: '9px 18px', border: '2px solid #e0e0e0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600, color: '#444' },
  abaAtiva: { borderColor: '#1565c0', background: '#e3f2fd', color: '#0d2157' },
  badge: { background: '#c62828', color: '#fff', borderRadius: '20px', padding: '1px 8px', fontSize: '.72rem', fontWeight: 700, marginLeft: '8px' },
  pendente: { border: '1px solid #e0e7ef', borderRadius: '12px', padding: '14px', marginBottom: '12px', background: '#fafcff' },
  respAluno: { background: '#fff', border: '1px solid #e3e8ef', borderRadius: '8px', padding: '10px 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.93rem' },
  msg: { padding: '11px 16px', borderRadius: '9px', fontSize: '.9rem', marginBottom: '16px' },
  msgOk: { background: '#e3f2fd', color: '#0d2157', borderLeft: '4px solid #0d47a1' },
  msgErr: { background: '#ffebee', color: '#c62828', borderLeft: '4px solid #c62828' },
  btnPrimario: { background: '#1565c0', color: '#fff', border: 'none', borderRadius: '9px', padding: '9px 20px', cursor: 'pointer', fontSize: '.88rem', fontWeight: 700 },
  btnSec: { background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.5)', color: '#fff', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '.8rem' },
  btnRemover: { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '9px', padding: '9px 16px', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600 },
  btnFechar: { background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: '9px', padding: '9px 16px', cursor: 'pointer', fontSize: '.88rem' },
  btnMini: { background: '#fff', color: '#1565c0', border: '1px solid #90caf9', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 },
  btnOk: { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: '9px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '.88rem' },
  btnMelhorar: { background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', borderRadius: '9px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '.88rem' },
}

MeusExercicios.shellTitle = '📝 Meus Exercícios'
