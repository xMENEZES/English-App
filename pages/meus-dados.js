import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { CONTROLADOR } from '../lib/lgpd/config'

const TIPOS = [
  { v: 'acesso', t: 'Quero saber quais dados vocês têm sobre mim' },
  { v: 'correcao', t: 'Quero corrigir algum dado' },
  { v: 'exclusao', t: 'Quero excluir os meus dados / a minha conta' },
  { v: 'outro', t: 'Outro assunto de privacidade' }
]
const ROTULO = { acesso: 'Acesso', correcao: 'Correção', exclusao: 'Exclusão', outro: 'Outro' }

export default function MeusDados() {
  const router = useRouter()
  const [papel, setPapel] = useState(null)
  const [solicitacoes, setSolicitacoes] = useState([])
  const [tipo, setTipo] = useState('acesso')
  const [descricao, setDescricao] = useState('')
  const [respostas, setRespostas] = useState({})
  const [baixando, setBaixando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })

  const avisar = (t, texto) => { setMsg({ tipo: t, texto }); setTimeout(() => setMsg({ tipo: '', texto: '' }), 5000) }
  const token = async () => (await supabase.auth.getSession()).data?.session?.access_token

  const carregar = async () => {
    const r = await fetch('/api/solicitacoes', { headers: { Authorization: `Bearer ${await token()}` } })
    const d = await r.json().catch(() => ({}))
    if (r.ok) setSolicitacoes(d.solicitacoes || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setPapel(session.user.app_metadata?.role === 'teacher' ? 'professor' : 'aluno')
      carregar()
    })
  }, [])

  const baixar = async () => {
    setBaixando(true)
    try {
      const r = await fetch('/api/meus-dados', { headers: { Authorization: `Bearer ${await token()}` } })
      if (!r.ok) { avisar('err', 'Não foi possível gerar a cópia dos dados.'); return }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'meus-dados.json'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      avisar('ok', 'Cópia dos seus dados baixada.')
    } finally { setBaixando(false) }
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!descricao.trim()) return
    setEnviando(true)
    const r = await fetch('/api/solicitacoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ tipo, descricao })
    })
    const d = await r.json().catch(() => ({}))
    setEnviando(false)
    if (!r.ok) { avisar('err', d.error || 'Erro ao enviar a solicitação'); return }
    setDescricao('')
    avisar('ok', 'Solicitação enviada! Você receberá a resposta aqui, em até 15 dias.')
    carregar()
  }

  const atender = async (s) => {
    const r = await fetch('/api/solicitacoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: s.id, resposta: respostas[s.id] || '' })
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { avisar('err', d.error || 'Erro ao atender'); return }
    avisar('ok', 'Solicitação marcada como atendida.')
    carregar()
  }

  const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR')
  const abertas = solicitacoes.filter(x => x.status === 'aberta')

  return (
    <>
      <Head><title>English Step By Step - Meus Dados</title></Head>
      <div style={s.page}>
        {msg.texto && <div style={{ ...s.msg, ...(msg.tipo === 'ok' ? s.msgOk : s.msgErr) }}>{msg.texto}</div>}

        <div style={s.card}>
          <h2 style={s.titulo}>Seus dados e seus direitos</h2>
          <p style={s.p}>
            Você pode baixar uma cópia de todos os dados que guardamos sobre você, ler como eles são tratados e pedir correção ou exclusão.
            {papel === 'aluno' && ' Se você é menor de idade, os pedidos devem ser feitos pelo seu responsável.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button onClick={baixar} disabled={baixando} style={{ ...s.btn, opacity: baixando ? .5 : 1 }}>
              {baixando ? 'Gerando...' : '⬇️ Baixar meus dados'}
            </button>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={s.btnLink}>Política de Privacidade</a>
            <a href="/termos" target="_blank" rel="noopener noreferrer" style={s.btnLink}>Termos de Uso</a>
          </div>
          <p style={s.contato}>Encarregado pelo tratamento de dados: {CONTROLADOR.nome} · {CONTROLADOR.email}</p>
        </div>

        {papel === 'aluno' && (
          <div style={s.card}>
            <h2 style={s.titulo}>Fazer uma solicitação</h2>
            <form onSubmit={enviar}>
              <label style={s.label}>O que você precisa?</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...s.input, background: '#fff', marginBottom: '12px' }}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.t}</option>)}
              </select>
              <label style={s.label}>Detalhes</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value.slice(0, 1000))} rows={4} required
                placeholder="Explique o seu pedido" style={{ ...s.input, resize: 'vertical' }} />
              <div style={{ textAlign: 'right', fontSize: '.72rem', color: '#999' }}>{descricao.length}/1000</div>
              <button type="submit" disabled={enviando || !descricao.trim()} style={{ ...s.btn, marginTop: '8px', opacity: (enviando || !descricao.trim()) ? .5 : 1 }}>
                {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </form>
          </div>
        )}

        <div style={s.card}>
          <h2 style={s.titulo}>{papel === 'professor' ? `Solicitações dos alunos${abertas.length ? ` (${abertas.length} em aberto)` : ''}` : 'Minhas solicitações'}</h2>
          {solicitacoes.length === 0 && <p style={s.vazio}>Nenhuma solicitação.</p>}
          {solicitacoes.map(x => (
            <div key={x.id} style={s.item}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '.82rem', color: '#666' }}>
                <span><b style={{ color: '#0d2157' }}>{ROTULO[x.tipo]}</b>{x.aluno ? ` · ${x.aluno}` : ''} · {dataBR(x.created_at)}</span>
                <b style={{ color: x.status === 'aberta' ? '#e65100' : '#2e7d32' }}>{x.status === 'aberta' ? 'Em aberto' : `Atendida em ${dataBR(x.atendida_em)}`}</b>
              </div>
              <div style={s.texto}>{x.descricao}</div>
              {x.resposta && <div style={s.resposta}><b>Resposta:</b> {x.resposta}</div>}
              {papel === 'professor' && x.status === 'aberta' && (
                <div style={{ marginTop: '10px' }}>
                  <textarea value={respostas[x.id] || ''} onChange={e => setRespostas(r => ({ ...r, [x.id]: e.target.value.slice(0, 1000) }))}
                    rows={2} placeholder="Resposta ao titular (opcional)" style={{ ...s.input, resize: 'vertical', marginBottom: '8px' }} />
                  <button onClick={() => atender(x)} style={s.btn}>Marcar como atendida</button>
                  {x.tipo === 'exclusao' && <div style={s.dica}>Para excluir os dados, use "Remover Acesso" em Controle de Acessos (apaga perfil, respostas, mensagens e foto).</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

MeusDados.shellTitle = '🛡️ Meus Dados'

const s = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '22px 16px' },
  card: { background: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: '16px' },
  titulo: { fontSize: '1.05rem', fontWeight: 700, color: '#0d2157', marginBottom: '10px' },
  p: { color: '#444', fontSize: '.92rem', lineHeight: 1.6 },
  contato: { marginTop: '14px', fontSize: '.8rem', color: '#777', overflowWrap: 'anywhere' },
  label: { display: 'block', fontSize: '.85rem', fontWeight: 600, color: '#333', marginBottom: '6px' },
  input: { width: '100%', border: '2px solid #e0e0e0', borderRadius: '9px', padding: '10px 12px', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  btn: { background: '#1565c0', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 18px', cursor: 'pointer', fontSize: '.9rem', fontWeight: 700 },
  btnLink: { background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', borderRadius: '9px', padding: '10px 16px', fontSize: '.88rem', fontWeight: 600, textDecoration: 'none' },
  vazio: { color: '#888', fontSize: '.9rem' },
  item: { border: '1px solid #e0e7ef', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px', background: '#fafcff' },
  texto: { marginTop: '6px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '.92rem' },
  resposta: { marginTop: '8px', background: '#e8f5e9', borderRadius: '8px', padding: '8px 12px', fontSize: '.88rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  dica: { fontSize: '.78rem', color: '#777', marginTop: '6px' },
  msg: { padding: '11px 16px', borderRadius: '9px', fontSize: '.9rem', marginBottom: '16px' },
  msgOk: { background: '#e3f2fd', color: '#0d2157', borderLeft: '4px solid #0d47a1' },
  msgErr: { background: '#ffebee', color: '#c62828', borderLeft: '4px solid #c62828' },
}
