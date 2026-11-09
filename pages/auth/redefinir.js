import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Head from 'next/head'
import { validarSenha, REGRA_SENHA } from '../../lib/senha'

export default function Redefinir() {
  const [sessao, setSessao] = useState(null)
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const { code } = router.query

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data?.session) { setSessao(data.session); setVerificando(false) }
        else { setErro('Link inválido ou expirado.'); setVerificando(false) }
      })
    } else {
      // Fallback: verificar sessao existente (hash flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setSessao(session); setVerificando(false) }
        else { setVerificando(false) }
      })
    }
  }, [router.isReady, router.query])

  const salvar = async (e) => {
    e.preventDefault()
    setErro('')
    if (!validarSenha(senha)) { setErro(REGRA_SENHA); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) { setErro('Erro ao salvar: ' + error.message); setSalvando(false) }
    else router.push('/exercicios')
  }

  if (verificando) return <div style={s.loading}>Verificando link...</div>

  if (!sessao) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚠️</div>
        <h2 style={s.titulo}>Link inválido</h2>
        <p style={{color:'#666',fontSize:'.9rem',lineHeight:1.5}}>
          {erro || 'Este link de redefinição é inválido ou expirou. Solicite um novo.'}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <Head><title>English Step By Step - Redefinir Senha</title></Head>
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>🔒</div>
          <h1 style={s.titulo}>English Step By Step</h1>
          <p style={s.sub}>Digite sua nova senha</p>
          <form onSubmit={salvar}>
            <div style={s.campo}>
              <label style={s.label}>Nova senha</label>
              <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
                placeholder="Mín. 8 caracteres, 1 número e 1 símbolo" required style={s.input} />
            </div>
            <div style={s.campo}>
              <label style={s.label}>Confirmar senha</label>
              <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)}
                placeholder="Repita a senha" required style={s.input} />
            </div>
            {erro && <div style={s.erro}>{erro}</div>}
            <button type="submit" disabled={salvando} style={s.btn}>
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

const s = {
  loading: {display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'Segoe UI,sans-serif',color:'#0d2157'},
  page: {minHeight:'100vh',background:'#f0f4f8',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'},
  card: {background:'#fff',borderRadius:'16px',padding:'40px 36px',maxWidth:'400px',width:'100%',boxShadow:'0 4px 24px rgba(0,0,0,.12)',textAlign:'center'},
  logo: {fontSize:'3rem',marginBottom:'10px'},
  titulo: {fontSize:'1.5rem',color:'#0d2157',fontWeight:800,marginBottom:'4px'},
  sub: {color:'#666',fontSize:'.9rem',marginBottom:'28px'},
  campo: {textAlign:'left',marginBottom:'16px'},
  label: {display:'block',fontSize:'.85rem',fontWeight:600,color:'#333',marginBottom:'6px'},
  input: {width:'100%',border:'2px solid #e0e0e0',borderRadius:'9px',padding:'10px 14px',fontSize:'1rem',outline:'none',fontFamily:'inherit'},
  erro: {background:'#ffebee',color:'#c62828',borderRadius:'8px',padding:'10px 14px',fontSize:'.88rem',marginBottom:'14px',borderLeft:'4px solid #c62828'},
  btn: {width:'100%',background:'#1565c0',color:'#fff',border:'none',borderRadius:'9px',padding:'12px',fontSize:'1rem',fontWeight:700,cursor:'pointer',marginTop:'4px'},
}
