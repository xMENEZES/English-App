import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'
import AppShell from '../components/AppShell'
import Avatar from '../components/Avatar'
import useMobile from '../lib/useMobile'

const LIMIT = 30

export default function ControleAcessos() {
  const [sessao, setSessao] = useState(null)
  const [dados, setDados] = useState({ students: [], total: LIMIT, used: 0, available: LIMIT })
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msgModal, setMsgModal] = useState('')
  const [msgGlobal, setMsgGlobal] = useState({ tipo: '', texto: '' })
  const [confirmacao, setConfirmacao] = useState(null) // { userId, nome, acao }
  const router = useRouter()
  const mobile = useMobile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      if (session.user.app_metadata?.role !== 'teacher') { router.push('/exercicios'); return }
      setSessao(session)
      carregarAlunos(session)
    })
  }, [])

  const headers = async (session) => {
    const s = session || sessao
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }

  const carregarAlunos = async (session, silencioso = false) => {
    if (!silencioso) setCarregando(true)
    const h = await headers(session)
    const r = await fetch('/api/admin/list-users', { headers: h })
    const d = await r.json()
    if (r.ok) setDados(d)
    setCarregando(false)
  }

  const enviarConvite = async (e) => {
    e.preventDefault()
    setMsgModal('')
    setEnviando(true)
    const h = await headers()
    const r = await fetch('/api/admin/invite', { method: 'POST', headers: h, body: JSON.stringify({ email: emailConvite }) })
    const d = await r.json()
    setEnviando(false)
    if (r.ok) {
      setMsgModal('✅ Convite enviado com sucesso!')
      setEmailConvite('')
      setTimeout(() => { setModalAberto(false); setMsgModal(''); carregarAlunos(null, true) }, 1800)
    } else {
      setMsgModal('❌ ' + d.error)
    }
  }

  const removerAcesso = async () => {
    if (!confirmacao) return
    const h = await headers()
    const r = await fetch('/api/admin/remove-user', { method: 'POST', headers: h, body: JSON.stringify({ userId: confirmacao.userId }) })
    const d = await r.json()
    setConfirmacao(null)
    if (r.ok) {
      setMsgGlobal({ tipo: 'ok', texto: `Acesso de ${confirmacao.nome || confirmacao.email} removido.` })
      carregarAlunos(null, true)
    } else {
      setMsgGlobal({ tipo: 'err', texto: d.error })
    }
    setTimeout(() => setMsgGlobal({ tipo: '', texto: '' }), 4000)
  }

  const OPCOES_CHAT = [
    { v: 'nao_classificado', t: 'Não classificado (chat bloqueado)' },
    { v: 'adulto', t: 'Adulto' },
    { v: 'menor_consentido', t: 'Menor — consentimento do responsável registrado' },
    { v: 'menor_sem_consentimento', t: 'Menor — sem consentimento (chat bloqueado)' }
  ]

  const classificarAluno = async (aluno, valor) => {
    if (valor === 'nao_classificado') return
    const nome = aluno.full_name || aluno.email
    if (valor === 'menor_consentido' &&
        !window.confirm(`Confirma que você recebeu o termo de consentimento do responsável de ${nome}? Isso libera o chat para este aluno menor.`)) return
    const h = await headers()
    const body = { alunoId: aluno.id, menor: valor !== 'adulto', consentimento: valor === 'menor_consentido' }
    const r = await fetch('/api/admin/classificar', { method: 'POST', headers: h, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({}))
    if (r.ok) {
      // Atualiza so a linha do aluno, sem recarregar a tela inteira
      setDados(d => ({ ...d, students: d.students.map(x => x.id === aluno.id ? { ...x, chat: valor } : x) }))
      setMsgGlobal({ tipo: 'ok', texto: `Classificação de ${nome} atualizada.` })
    } else {
      setMsgGlobal({ tipo: 'err', texto: d.error || 'Erro ao classificar' })
    }
    setTimeout(() => setMsgGlobal({ tipo: '', texto: '' }), 4000)
  }

  const redefinirSenha = async (email, nome) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: (process.env.NEXT_PUBLIC_SITE_URL || 'https://english-step-by-step.vercel.app') + '/auth/redefinir'
    })
    if (error) {
      setMsgGlobal({ tipo: 'err', texto: 'Erro ao enviar: ' + error.message })
    } else {
      setMsgGlobal({ tipo: 'ok', texto: `Email de redefinição enviado para ${nome || email}.` })
    }
    setTimeout(() => setMsgGlobal({ tipo: '', texto: '' }), 4000)
  }

  const sair = async () => { await supabase.auth.signOut(); router.push('/') }

  if (carregando) return <div style={s.loading}>Carregando...</div>

  return (
    <AppShell titulo="🔑 Controle de Acessos">
      <Head><title>English Step By Step - Controle de Acessos</title></Head>

      {/* Header */}

      <div style={s.page}>

        {/* Mensagem global */}
        {msgGlobal.texto && (
          <div style={{...s.msg, ...(msgGlobal.tipo==='ok' ? s.msgOk : s.msgErr)}}>
            {msgGlobal.texto}
          </div>
        )}

        {/* Contador de slots */}
        <div style={s.slots}>
          <div style={s.slotCard}>
            <div style={{...s.slotNum, color:'#0d2157'}}>{dados.total}</div>
            <div style={s.slotLabel}>Total de Acessos</div>
          </div>
          <div style={s.slotDiv} />
          <div style={s.slotCard}>
            <div style={{...s.slotNum, color: dados.used >= dados.total ? '#c62828' : '#1565c0'}}>{dados.used}</div>
            <div style={s.slotLabel}>Em Uso</div>
          </div>
          <div style={s.slotDiv} />
          <div style={s.slotCard}>
            <div style={{...s.slotNum, color: dados.available === 0 ? '#c62828' : '#0d47a1'}}>{dados.available}</div>
            <div style={s.slotLabel}>Vagos</div>
          </div>
        </div>

        {/* Barra de ações */}
        <div style={s.actionBar}>
          <h2 style={s.secTitulo}>Alunos Cadastrados</h2>
          <button onClick={() => { setModalAberto(true); setMsgModal(''); setEmailConvite('') }}
            disabled={dados.available === 0}
            style={{...s.btnPrimario, opacity: dados.available===0 ? 0.5 : 1, cursor: dados.available===0 ? 'not-allowed' : 'pointer'}}>
            + Cadastrar Aluno
          </button>
        </div>

        {/* Tabela de alunos */}
        <div style={s.card}>
          {dados.students.length === 0 ? (
            <p style={{color:'#888',textAlign:'center',padding:'24px',fontSize:'.9rem'}}>
              Nenhum aluno cadastrado ainda. Clique em "Cadastrar Aluno" para enviar o primeiro convite.
            </p>
          ) : (
            mobile ? (
              <div style={{display:'flex',flexDirection:'column'}}>
                {dados.students.map(a => (
                  <div key={a.id} style={{padding:'14px 16px',borderBottom:'1px solid #eee'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                      <Avatar foto={a.fotoUrl} nome={a.full_name || a.email} tamanho={44} />
                      <div style={{minWidth:0,overflowWrap:'anywhere'}}>
                        <div style={{fontWeight:700,color:'#0d2157'}}>{a.full_name || <span style={{color:'#aaa',fontStyle:'italic',fontWeight:400}}>Cadastro pendente</span>}</div>
                        <div style={{fontSize:'.82rem',color:'#777'}}>{a.email}</div>
                      </div>
                    </div>
                    <select value={a.chat || 'nao_classificado'} onChange={e => classificarAluno(a, e.target.value)}
                      style={{...s.selectChat, maxWidth:'100%', width:'100%', fontSize:'1rem', padding:'9px 10px', marginBottom:'10px', borderColor: (a.chat === 'adulto' || a.chat === 'menor_consentido') ? '#2e7d32' : '#ef9a9a'}}>
                      {OPCOES_CHAT.map(o => <option key={o.v} value={o.v} disabled={o.v === 'nao_classificado'}>{o.t}</option>)}
                    </select>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <button onClick={() => redefinirSenha(a.email, a.full_name)} style={s.btnReset}>🔑 Redefinir Senha</button>
                      <button onClick={() => setConfirmacao({ userId: a.id, nome: a.full_name, email: a.email })} style={s.btnRemover}>🗑 Remover Acesso</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div style={{overflowX:'auto'}}>
              <table style={s.table}>
                <thead>
                  <tr style={{background:'#0d2157',color:'#fff'}}>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>E-mail</th>
                    <th style={s.th}>Chat</th>
                    <th style={{...s.th,textAlign:'center'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.students.map((a, i) => (
                    <tr key={a.id} style={{background: i%2===0?'#fff':'#e8f4fd'}}>
                      <td style={s.td}>
                        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                          <Avatar foto={a.fotoUrl} nome={a.full_name || a.email} tamanho={32} />
                          {a.full_name
                            ? <b>{a.full_name}</b>
                            : <span style={{color:'#aaa',fontStyle:'italic'}}>Cadastro pendente</span>}
                        </div>
                      </td>
                      <td style={s.td}>{a.email}</td>
                      <td style={s.td}>
                        <select value={a.chat || 'nao_classificado'} onChange={e => classificarAluno(a, e.target.value)}
                          style={{...s.selectChat, borderColor: (a.chat === 'adulto' || a.chat === 'menor_consentido') ? '#2e7d32' : '#ef9a9a'}}>
                          {OPCOES_CHAT.map(o => <option key={o.v} value={o.v} disabled={o.v === 'nao_classificado'}>{o.t}</option>)}
                        </select>
                      </td>
                      <td style={{...s.td,textAlign:'center'}}>
                        <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
                          <button onClick={() => redefinirSenha(a.email, a.full_name)} style={s.btnReset}>
                            🔑 Redefinir Senha
                          </button>
                          <button onClick={() => setConfirmacao({ userId: a.id, nome: a.full_name, email: a.email })}
                            style={s.btnRemover}>
                            🗑 Remover Acesso
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          )}
        </div>
      </div>

      {/* Modal: Cadastrar Aluno */}
      {modalAberto && (
        <div style={s.overlay} onClick={e => { if(e.target===e.currentTarget) setModalAberto(false) }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={{fontWeight:700,fontSize:'1.05rem'}}>Cadastrar Aluno</span>
              <button onClick={() => setModalAberto(false)} style={s.btnFechar}>✕</button>
            </div>
            <div style={{padding:'22px'}}>
              <p style={{color:'#555',fontSize:'.88rem',marginBottom:'16px'}}>
                O aluno receberá um e-mail para definir seu nome e senha de acesso.
              </p>
              <form onSubmit={enviarConvite}>
                <div style={{marginBottom:'14px'}}>
                  <label style={s.label}>E-mail do aluno</label>
                  <input type="email" value={emailConvite} onChange={e=>setEmailConvite(e.target.value)}
                    placeholder="email@exemplo.com" required
                    style={{...s.input, width:'100%'}} />
                </div>
                {msgModal && (
                  <div style={{...s.msg, ...(msgModal.startsWith('✅') ? s.msgOk : s.msgErr), marginBottom:'12px'}}>
                    {msgModal}
                  </div>
                )}
                <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                  <button type="button" onClick={() => setModalAberto(false)} style={s.btnCancelar}>Cancelar</button>
                  <button type="submit" disabled={enviando} style={s.btnPrimario}>
                    {enviando ? 'Enviando...' : 'Enviar Convite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de remoção */}
      {confirmacao && (
        <div style={s.overlay}>
          <div style={{...s.modal, maxWidth:'380px'}}>
            <div style={s.modalHeader}>
              <span style={{fontWeight:700,fontSize:'1.05rem',color:'#c62828'}}>⚠️ Confirmar Remoção</span>
              <button onClick={() => setConfirmacao(null)} style={s.btnFechar}>✕</button>
            </div>
            <div style={{padding:'22px'}}>
              <p style={{color:'#555',fontSize:'.92rem',lineHeight:1.6,marginBottom:'18px'}}>
                Tem certeza que deseja remover o acesso de <b>{confirmacao.nome || confirmacao.email}</b>?
                <br/><span style={{color:'#c62828',fontSize:'.85rem'}}>Esta ação libera a vaga mas remove todos os dados do aluno.</span>
              </p>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button onClick={() => setConfirmacao(null)} style={s.btnCancelar}>Cancelar</button>
                <button onClick={removerAcesso} style={{...s.btnRemover, padding:'9px 20px'}}>Confirmar Remoção</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

const s = {
  loading: {display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'Segoe UI,sans-serif',color:'#0d2157'},
  header: {background:'linear-gradient(135deg,#0d2157,#1565c0)',color:'#fff',padding:'13px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.2)'},
  page: {maxWidth:'900px',margin:'0 auto',padding:'22px'},
  card: {background:'#fff',borderRadius:'14px',padding:'4px 0',boxShadow:'0 2px 8px rgba(0,0,0,.08)',overflow:'hidden'},
  slots: {background:'#fff',borderRadius:'14px',padding:'20px',marginBottom:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.08)',display:'flex',alignItems:'center',justifyContent:'space-around'},
  slotCard: {textAlign:'center',flex:1},
  slotNum: {fontSize:'2.4rem',fontWeight:800,lineHeight:1},
  slotLabel: {fontSize:'.82rem',color:'#888',marginTop:'4px'},
  slotDiv: {width:'1px',background:'#e0e0e0',height:'50px'},
  actionBar: {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'},
  secTitulo: {fontSize:'1.05rem',fontWeight:700,color:'#0d2157'},
  table: {width:'100%',borderCollapse:'collapse',fontSize:'.88rem'},
  th: {padding:'11px 14px',textAlign:'left',fontWeight:600,fontSize:'.85rem'},
  td: {padding:'11px 14px',color:'#444',verticalAlign:'middle'},
  msg: {padding:'11px 16px',borderRadius:'9px',fontSize:'.9rem',marginBottom:'16px'},
  msgOk: {background:'#e3f2fd',color:'#0d2157',borderLeft:'4px solid #0d47a1'},
  msgErr: {background:'#ffebee',color:'#c62828',borderLeft:'4px solid #c62828'},
  btnPrimario: {background:'#1565c0',color:'#fff',border:'none',borderRadius:'9px',padding:'9px 20px',cursor:'pointer',fontSize:'.88rem',fontWeight:700},
  btnSec: {background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.5)',color:'#fff',padding:'5px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'.8rem'},
  selectChat: {border:'2px solid #e0e0e0',borderRadius:'8px',padding:'6px 8px',fontSize:'.82rem',background:'#fff',maxWidth:'230px'},
  btnReset: {background:'#e3f2fd',color:'#1565c0',border:'1px solid #90caf9',borderRadius:'7px',padding:'6px 12px',cursor:'pointer',fontSize:'.82rem',fontWeight:600,whiteSpace:'nowrap'},
  btnRemover: {background:'#ffebee',color:'#c62828',border:'1px solid #ef9a9a',borderRadius:'7px',padding:'6px 12px',cursor:'pointer',fontSize:'.82rem',fontWeight:600,whiteSpace:'nowrap'},
  btnCancelar: {background:'#f5f5f5',color:'#555',border:'1px solid #ddd',borderRadius:'8px',padding:'9px 18px',cursor:'pointer',fontSize:'.88rem'},
  overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'16px'},
  modal: {background:'#fff',borderRadius:'16px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 32px rgba(0,0,0,.2)'},
  modalHeader: {display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 22px',borderBottom:'1px solid #f0f0f0'},
  btnFechar: {background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#888',padding:'2px 6px'},
  label: {display:'block',fontSize:'.85rem',fontWeight:600,color:'#333',marginBottom:'6px'},
  input: {border:'2px solid #e0e0e0',borderRadius:'9px',padding:'10px 14px',fontSize:'1rem',outline:'none',fontFamily:'inherit',boxSizing:'border-box'},
}
