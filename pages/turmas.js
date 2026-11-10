import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'
import AppShell from '../components/AppShell'
import Avatar from '../components/Avatar'

export default function Turmas() {
  const [carregando, setCarregando] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [selId, setSelId] = useState(null)
  const [marcados, setMarcados] = useState([])
  const [nomeEdit, setNomeEdit] = useState('')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const router = useRouter()

  const sel = turmas.find(t => t.id === selId) || null

  const avisar = (tipo, texto) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg({ tipo: '', texto: '' }), 4000)
  }

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
    const [a, t] = await Promise.all([api('/api/admin/list-users'), api('/api/turmas')])
    if (a.ok) {
      const lista = (a.d.students || []).map(s => ({ ...s, nome: s.full_name || s.email }))
      lista.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR', { sensitivity: 'base' }))
      setAlunos(lista)
    }
    if (t.ok) setTurmas(t.d.turmas || [])
    setCarregando(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      if (session.user.app_metadata?.role !== 'teacher') { router.push('/exercicios'); return }
      carregar()
    })
  }, [])

  const abrirTurma = (t) => {
    setSelId(t.id)
    setMarcados(t.alunoIds)
    setNomeEdit(t.nome)
    setBusca('')
  }

  const criar = async (e) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    const { ok, d } = await api('/api/turmas', { method: 'POST', body: { nome: novoNome } })
    if (!ok) { avisar('err', d.error || 'Erro ao criar turma'); return }
    setTurmas(ts => [...ts, d.turma].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    setNovoNome('')
    setSelId(null)
    avisar('ok', `Turma "${d.turma.nome}" criada com sucesso! Clique nela para adicionar alunos.`)
  }

  const salvar = async () => {
    if (!sel) return
    setSalvando(true)
    if (nomeEdit.trim() && nomeEdit.trim() !== sel.nome) {
      const r = await api('/api/turmas', { method: 'PATCH', body: { id: sel.id, nome: nomeEdit } })
      if (!r.ok) { setSalvando(false); avisar('err', r.d.error || 'Erro ao renomear'); return }
    }
    const { ok, d } = await api('/api/turmas/membros', { method: 'PUT', body: { turmaId: sel.id, alunoIds: marcados } })
    setSalvando(false)
    if (!ok) { avisar('err', d.error || 'Erro ao salvar alunos'); return }
    setSelId(null)
    await carregar()
    avisar('ok', `Turma "${nomeEdit.trim() || sel.nome}" salva com sucesso!`)
  }

  const excluir = async () => {
    if (!sel) return
    if (!window.confirm(`Excluir a turma "${sel.nome}"? Os alunos continuam cadastrados; só a turma é removida.`)) return
    const { ok, d } = await api('/api/turmas', { method: 'DELETE', body: { id: sel.id } })
    if (!ok) { avisar('err', d.error || 'Erro ao excluir'); return }
    setSelId(null)
    await carregar()
    avisar('ok', 'Turma excluída.')
  }

  const alternar = (id) => setMarcados(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id])
  const visiveis = alunos.filter(a => (a.nome + ' ' + a.email).toLowerCase().includes(busca.toLowerCase()))
  const alterado = sel && (nomeEdit.trim() !== sel.nome ||
    marcados.length !== sel.alunoIds.length || marcados.some(id => !sel.alunoIds.includes(id)))

  const sair = async () => { await supabase.auth.signOut(); router.push('/') }

  if (carregando) return <div style={s.loading}>Carregando...</div>

  return (
    <AppShell titulo="🏫 Turmas">
      <Head><title>English Step By Step - Turmas</title></Head>

      <div style={s.page}>
        {msg.texto && (
          <div style={{ ...s.msg, ...(msg.tipo === 'ok' ? s.msgOk : s.msgErr) }}>{msg.texto}</div>
        )}

        <div style={s.grid}>
          {/* Lista de turmas */}
          <div style={s.card}>
            <h2 style={s.titulo}>Minhas turmas</h2>
            <form onSubmit={criar} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input value={novoNome} onChange={e => setNovoNome(e.target.value)} maxLength={80}
                placeholder="Nome da nova turma" style={{ ...s.input, flex: 1, minWidth: 0 }} />
              <button type="submit" style={s.btnPrimario}>Criar</button>
            </form>
            {turmas.length === 0 ? (
              <p style={s.vazio}>Nenhuma turma ainda. Crie a primeira acima.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {turmas.map(t => (
                  <button key={t.id} onClick={() => abrirTurma(t)}
                    style={{ ...s.turmaBtn, ...(t.id === selId ? s.turmaBtnAtiva : {}) }}>
                    <span style={{ fontWeight: 600 }}>{t.nome}</span>
                    <span style={s.badge}>{t.alunoIds.length} {t.alunoIds.length === 1 ? 'aluno' : 'alunos'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editor da turma */}
          <div style={s.card}>
            {!sel ? (
              <p style={s.vazio}>Clique em uma turma para visualizar e editar seus alunos.</p>
            ) : (
              <>
                <h2 style={s.titulo}>Editar turma</h2>
                <label style={s.label}>Nome da turma</label>
                <input value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} maxLength={80}
                  style={{ ...s.input, width: '100%', marginBottom: '16px' }} />

                <label style={s.label}>Alunos da turma ({marcados.length} de {alunos.length})</label>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..."
                  style={{ ...s.input, width: '100%', marginBottom: '10px' }} />
                <div style={s.listaAlunos}>
                  {alunos.length === 0 && <p style={s.vazio}>Você ainda não tem alunos. Convide alunos em Controle de Acessos.</p>}
                  {visiveis.map(a => (
                    <label key={a.id} style={s.alunoLinha}>
                      <input type="checkbox" checked={marcados.includes(a.id)} onChange={() => alternar(a.id)}
                        style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                      <Avatar foto={a.fotoUrl} nome={a.nome} tamanho={30} />
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflowWrap: 'anywhere' }}>
                        <span style={{ fontWeight: 600 }}>{a.nome}</span>
                        {a.nome !== a.email && <span style={{ fontSize: '.78rem', color: '#888' }}>{a.email}</span>}
                      </span>
                    </label>
                  ))}
                  {alunos.length > 0 && visiveis.length === 0 && <p style={s.vazio}>Nenhum aluno encontrado.</p>}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button onClick={excluir} style={s.btnRemover}>Excluir turma</button>
                  <button onClick={() => setSelId(null)} style={s.btnFechar}>Fechar</button>
                  <button onClick={salvar} disabled={salvando || !alterado}
                    style={{ ...s.btnPrimario, opacity: (salvando || !alterado) ? .5 : 1 }}>
                    {salvando ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

const s = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Segoe UI,sans-serif', color: '#0d2157' },
  header: { background: 'linear-gradient(135deg,#0d2157,#1565c0)', color: '#fff', padding: '13px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.2)' },
  page: { maxWidth: '1000px', margin: '0 auto', padding: '22px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '18px', alignItems: 'start' },
  card: { background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
  titulo: { fontSize: '1.05rem', fontWeight: 700, color: '#0d2157', marginBottom: '14px' },
  vazio: { color: '#888', fontSize: '.9rem' },
  label: { display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#333', marginBottom: '6px' },
  input: { border: '2px solid #e0e0e0', borderRadius: '9px', padding: '10px 14px', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  turmaBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 16px', border: '2px solid #e0e0e0', borderRadius: '10px', cursor: 'pointer', background: '#fff', fontSize: '.92rem', color: '#333' },
  turmaBtnAtiva: { borderColor: '#1565c0', background: '#e3f2fd', color: '#0d2157' },
  badge: { background: '#e3f2fd', color: '#1565c0', borderRadius: '20px', padding: '2px 10px', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' },
  listaAlunos: { maxHeight: '340px', overflowY: 'auto', border: '2px solid #f0f0f0', borderRadius: '10px', padding: '6px' },
  alunoLinha: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer' },
  msg: { padding: '11px 16px', borderRadius: '9px', fontSize: '.9rem', marginBottom: '16px' },
  msgOk: { background: '#e3f2fd', color: '#0d2157', borderLeft: '4px solid #0d47a1' },
  msgErr: { background: '#ffebee', color: '#c62828', borderLeft: '4px solid #c62828' },
  btnPrimario: { background: '#1565c0', color: '#fff', border: 'none', borderRadius: '9px', padding: '9px 20px', cursor: 'pointer', fontSize: '.88rem', fontWeight: 700 },
  btnSec: { background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.5)', color: '#fff', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '.8rem' },
  btnFechar: { background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: '9px', padding: '9px 16px', cursor: 'pointer', fontSize: '.88rem' },
  btnRemover: { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '9px', padding: '9px 16px', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600 },
}
