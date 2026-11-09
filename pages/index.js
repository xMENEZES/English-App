import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'
import CampoSenha from '../components/CampoSenha'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return

    const { code } = router.query

    if (code) {
      // Convite via PKCE: troca o code e vai para exercicios
      // Reset de senha vai direto para /auth/redefinir (configurado no email template)
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        if (data?.session) router.push('/exercicios')
      })
      return
    }

    // Verifica sessao existente (hash legado tambem e capturado pelo getSession)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/exercicios')
    })
  }, [router.isReady, router.query])

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos. Verifique seus dados.')
      setCarregando(false)
    } else {
      router.push('/exercicios')
    }
  }

  return (
    <>
      <Head><title>English Step By Step - Login</title></Head>
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>🎓</div>
          <h1 style={s.titulo}>English Step By Step</h1>
          <p style={s.sub}>Exercícios Interativos</p>
          <form onSubmit={entrar}>
            <div style={s.campo}>
              <label style={s.label}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={s.input}
              />
            </div>
            <div style={s.campo}>
              <label style={s.label}>Senha</label>
              <CampoSenha value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" style={s.input} autoComplete="current-password" />
            </div>
            {erro && <div style={s.erro}>{erro}</div>}
            <button type="submit" disabled={carregando} style={s.btn}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p style={s.rodape}>Não tem acesso? Entre em contato com o professor.</p>
        </div>
      </div>
    </>
  )
}

const s = {
  page: { minHeight:'100vh', background:'#f0f4f8', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
  card: { background:'#fff', borderRadius:'16px', padding:'40px 36px', maxWidth:'400px', width:'100%', boxShadow:'0 4px 24px rgba(0,0,0,.12)', textAlign:'center' },
  logo: { fontSize:'3rem', marginBottom:'10px' },
  titulo: { fontSize:'1.5rem', color:'#0d2157', fontWeight:800, marginBottom:'4px' },
  sub: { color:'#666', fontSize:'.9rem', marginBottom:'28px' },
  campo: { textAlign:'left', marginBottom:'16px' },
  label: { display:'block', fontSize:'.85rem', fontWeight:600, color:'#333', marginBottom:'6px' },
  input: { width:'100%', border:'2px solid #e0e0e0', borderRadius:'9px', padding:'10px 14px', fontSize:'1rem', outline:'none', transition:'border .2s', fontFamily:'inherit' },
  erro: { background:'#ffebee', color:'#c62828', borderRadius:'8px', padding:'10px 14px', fontSize:'.88rem', marginBottom:'14px', borderLeft:'4px solid #c62828' },
  btn: { width:'100%', background:'#1565c0', color:'#fff', border:'none', borderRadius:'9px', padding:'12px', fontSize:'1rem', fontWeight:700, cursor:'pointer', marginTop:'4px' },
  rodape: { marginTop:'22px', fontSize:'.78rem', color:'#aaa' },
}
