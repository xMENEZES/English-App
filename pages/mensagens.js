import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'
import AppShell from '../components/AppShell'

const MAX = 2000

const hora = (iso) => {
  const d = new Date(iso)
  const hoje = new Date()
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === hoje.toDateString() ? hm : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hm}`
}

export default function Mensagens() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState({ papel: 'aluno', bloqueado: false, conversas: [], nomes: {}, pendentes: [], euId: null })
  const [abertaId, setAbertaId] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [mobile, setMobile] = useState(false)
  const abertaRef = useRef(null)
  const dadosRef = useRef(dados)
  const fimRef = useRef(null)

  abertaRef.current = abertaId
  dadosRef.current = dados
  const conversa = dados.conversas.find(c => c.id === abertaId) || null
  const professor = dados.papel === 'professor'

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

  const carregarConversas = async () => {
    const { ok, d } = await api('/api/chat/conversas')
    if (ok) setDados(d)
    return ok ? d : null
  }

  // Marca como lida ate a ultima mensagem carregada (usa o horario do servidor)
  const marcarLida = async (conversaId, lidaAte) => {
    const uid = dadosRef.current.euId
    if (!uid) return
    await supabase.from('conversa_leitura').upsert(
      { conversa_id: conversaId, user_id: uid, lida_ate: lidaAte || new Date().toISOString() },
      { onConflict: 'conversa_id,user_id' }
    )
    setDados(d => ({ ...d, conversas: d.conversas.map(c => c.id === conversaId ? { ...c, naoLidas: 0 } : c) }))
  }

  const abrir = async (id) => {
    setAbertaId(id)
    setErro('')
    setCarregandoMsgs(true)
    setMensagens([])
    const { data, error } = await supabase.from('mensagens')
      .select('id, conversa_id, autor_id, texto, created_at')
      .eq('conversa_id', id).order('created_at', { ascending: false }).limit(100)
    if (abertaRef.current !== id) return
    if (error) setErro('Não foi possível carregar as mensagens.')
    const lista = (data || []).reverse()
    setMensagens(lista)
    setCarregandoMsgs(false)
    if (lista.length) marcarLida(id, lista[lista.length - 1].created_at)
  }

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 720)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let canal = null
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      if (!session.user.user_metadata?.password_set) { router.push('/auth/confirmar'); return }
      const d = await carregarConversas()
      setCarregando(false)
      if (!d) return

      // Tempo real: as policies de RLS filtram o que cada pessoa pode receber
      canal = supabase.channel('mensagens-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => {
          const m = p.new
          const atual = dadosRef.current
          if (!atual.conversas.some(c => c.id === m.conversa_id)) { carregarConversas(); return }
          if (m.conversa_id === abertaRef.current) {
            setMensagens(ms => ms.some(x => x.id === m.id) ? ms : [...ms, m])
            marcarLida(m.conversa_id, m.created_at)
          } else {
            setDados(x => ({
              ...x,
              conversas: x.conversas.map(c => c.id === m.conversa_id
                ? { ...c, ultima: { texto: m.texto, created_at: m.created_at, autor_id: m.autor_id }, naoLidas: c.naoLidas + (m.autor_id === x.euId ? 0 : 1) }
                : c)
            }))
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensagens' }, (p) => {
          const id = p.old?.id
          if (id) setMensagens(ms => ms.filter(x => x.id !== id))
        })
        .subscribe()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => { if (!session) router.push('/') })
    return () => { subscription.unsubscribe(); if (canal) supabase.removeChannel(canal) }
  }, [])

  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }) }, [mensagens, abertaId])

  const enviar = async (e) => {
    e?.preventDefault()
    const t = texto.trim()
    if (!t || enviando || !abertaId) return
    setEnviando(true)
    setErro('')
    const { ok, d } = await api('/api/chat/enviar', { method: 'POST', body: { conversaId: abertaId, texto: t } })
    setEnviando(false)
    if (!ok) { setErro(d.error || 'Erro ao enviar'); return }
    setTexto('')
    setMensagens(ms => ms.some(x => x.id === d.mensagem.id) ? ms : [...ms, d.mensagem])
    setDados(x => ({ ...x, conversas: x.conversas.map(c => c.id === abertaId ? { ...c, ultima: { texto: d.mensagem.texto, created_at: d.mensagem.created_at, autor_id: d.mensagem.autor_id } } : c) }))
  }

  const apagar = async (m) => {
    if (!window.confirm('Apagar esta mensagem para todos? Esta ação é definitiva.')) return
    const { ok, d } = await api('/api/chat/mensagem', { method: 'DELETE', body: { id: m.id } })
    if (!ok) { setErro(d.error || 'Erro ao apagar'); return }
    setMensagens(ms => ms.filter(x => x.id !== m.id))
  }

  const sair = async () => { await supabase.auth.signOut(); router.push('/') }

  if (carregando) return <div style={s.loading}>Carregando...</div>

  const mostrarLista = !mobile || !abertaId
  const mostrarConversa = !mobile || !!abertaId

  return (
    <AppShell titulo="💬 Mensagens">
      <Head><title>English Step By Step - Mensagens</title></Head>

      {dados.bloqueado ? (
        <div style={s.page}>
          <div style={s.aviso}>
            🔒 Seu acesso ao chat ainda não foi liberado. Fale com o seu professor.
          </div>
        </div>
      ) : (
        <div style={s.layout}>
          {mostrarLista && (
            <div style={{ ...s.lista, ...(mobile ? { width: '100%' } : {}) }}>
              {dados.conversas.length === 0 && <p style={s.vazio}>Nenhuma conversa ainda.</p>}
              {dados.conversas.map(c => (
                <button key={c.id} onClick={() => abrir(c.id)}
                  style={{ ...s.convBtn, ...(c.id === abertaId ? s.convBtnAtiva : {}) }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{c.tipo === 'turma' ? '👥 ' : '👤 '}{c.titulo}</span>
                    {c.naoLidas > 0 && <span style={s.badge}>{c.naoLidas > 99 ? '99+' : c.naoLidas}</span>}
                  </span>
                  <span style={s.previa}>
                    {c.ultima ? `${c.ultima.autor_id === dados.euId ? 'Você: ' : ''}${c.ultima.texto}` : 'Sem mensagens'}
                  </span>
                </button>
              ))}
              {professor && dados.pendentes?.length > 0 && (
                <div style={s.pendentes}>
                  <b>🔒 Chat não liberado</b>
                  <div style={{ marginTop: '4px' }}>
                    {dados.pendentes.map(p => p.nome).join(', ')}
                  </div>
                  <button onClick={() => router.push('/controle-acessos')} style={s.linkBtn}>
                    Classificar em Controle de Acessos
                  </button>
                </div>
              )}
            </div>
          )}

          {mostrarConversa && (
            <div style={s.painel}>
              {!conversa ? (
                <div style={s.vazioCentro}>Selecione uma conversa para ver as mensagens.</div>
              ) : (
                <>
                  <div style={s.painelTopo}>
                    {mobile && <button onClick={() => setAbertaId(null)} style={s.voltar}>←</button>}
                    <b style={{ overflowWrap: 'anywhere' }}>{conversa.tipo === 'turma' ? '👥 ' : '👤 '}{conversa.titulo}</b>
                  </div>
                  <div style={s.msgs}>
                    {carregandoMsgs && <p style={s.vazio}>Carregando...</p>}
                    {!carregandoMsgs && mensagens.length === 0 && <p style={s.vazio}>Nenhuma mensagem ainda. Escreva a primeira!</p>}
                    {mensagens.map(m => {
                      const meu = m.autor_id === dados.euId
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: meu ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                          <div style={{ ...s.balao, ...(meu ? s.balaoMeu : s.balaoOutro) }}>
                            {!meu && <div style={s.autor}>{dados.nomes[m.autor_id] || 'Aluno'}</div>}
                            {/* Texto puro: o React escapa o conteudo e links nao ficam clicaveis */}
                            <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.texto}</div>
                            <div style={s.horaLinha}>
                              <span>{hora(m.created_at)}</span>
                              {professor && <button onClick={() => apagar(m)} title="Apagar mensagem" style={s.lixo}>🗑</button>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={fimRef} />
                  </div>
                  {erro && <div style={s.erro}>{erro}</div>}
                  <form onSubmit={enviar} style={s.form}>
                    <textarea value={texto} onChange={e => setTexto(e.target.value.slice(0, MAX))} rows={2}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                      placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter quebra a linha)" style={s.textarea} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <button type="submit" disabled={enviando || !texto.trim()}
                        style={{ ...s.btnEnviar, opacity: (enviando || !texto.trim()) ? .5 : 1 }}>
                        {enviando ? '...' : 'Enviar'}
                      </button>
                      <span style={{ fontSize: '.7rem', color: texto.length > MAX - 100 ? '#c62828' : '#999' }}>{texto.length}/{MAX}</span>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

const s = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Segoe UI,sans-serif', color: '#0d2157' },
  header: { background: 'linear-gradient(135deg,#0d2157,#1565c0)', color: '#fff', padding: '13px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.2)' },
  btnSec: { background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.5)', color: '#fff', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '.8rem' },
  page: { maxWidth: '700px', margin: '0 auto', padding: '22px' },
  aviso: { background: '#fff8e1', color: '#6d4c00', borderLeft: '4px solid #f9a825', borderRadius: '10px', padding: '16px 18px', fontSize: '.95rem' },
  layout: { display: 'flex', maxWidth: '1100px', margin: '0 auto', height: 'calc(100dvh - 52px)', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
  lista: { width: '320px', flexShrink: 0, borderRight: '1px solid #eee', overflowY: 'auto', padding: '10px', background: '#fafcff', boxSizing: 'border-box' },
  convBtn: { display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', textAlign: 'left', padding: '10px 12px', border: '2px solid transparent', borderRadius: '10px', cursor: 'pointer', background: 'transparent', fontSize: '.9rem', color: '#222', marginBottom: '4px' },
  convBtnAtiva: { background: '#e3f2fd', borderColor: '#1565c0' },
  previa: { fontSize: '.78rem', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { background: '#c62828', color: '#fff', borderRadius: '20px', padding: '1px 8px', fontSize: '.72rem', fontWeight: 700, flexShrink: 0 },
  pendentes: { marginTop: '14px', background: '#fff8e1', color: '#6d4c00', borderRadius: '10px', padding: '10px 12px', fontSize: '.8rem' },
  linkBtn: { background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', textDecoration: 'underline', fontSize: '.8rem', padding: 0, marginTop: '6px' },
  painel: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  painelTopo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #eee', color: '#0d2157' },
  voltar: { background: '#e3f2fd', border: 'none', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontSize: '1.1rem', color: '#1565c0' },
  msgs: { flex: 1, overflowY: 'auto', padding: '14px 16px', background: '#f5f8fc' },
  balao: { maxWidth: '78%', borderRadius: '14px', padding: '8px 12px', fontSize: '.92rem', lineHeight: 1.4 },
  balaoMeu: { background: '#1565c0', color: '#fff', borderBottomRightRadius: '4px' },
  balaoOutro: { background: '#fff', color: '#222', border: '1px solid #e3e8ef', borderBottomLeftRadius: '4px' },
  autor: { fontSize: '.74rem', fontWeight: 700, color: '#1565c0', marginBottom: '2px' },
  horaLinha: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', fontSize: '.68rem', opacity: .7, marginTop: '3px' },
  lixo: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', padding: 0 },
  erro: { background: '#ffebee', color: '#c62828', padding: '8px 16px', fontSize: '.85rem' },
  form: { display: 'flex', gap: '10px', padding: '10px 14px', borderTop: '1px solid #eee', background: '#fff', alignItems: 'flex-end' },
  textarea: { flex: 1, border: '2px solid #e0e0e0', borderRadius: '10px', padding: '9px 12px', fontSize: '1rem', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' },
  btnEnviar: { background: '#1565c0', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '.9rem' },
  vazio: { color: '#888', fontSize: '.88rem', textAlign: 'center', padding: '14px' },
  vazioCentro: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '.95rem', padding: '20px', textAlign: 'center' },
}
