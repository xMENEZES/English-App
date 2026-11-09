import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Head from 'next/head'

export default function Confirmar() {
  const [sessao, setSessao] = useState(null)
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const tentativas = [200, 600, 1200, 2000]
    let idx = 0
    const verificar = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setSessao(session); setVerificando(false) }
        else if (idx < tentativas.length) { setTimeout(verificar, tentativas[idx++]) }
        else { setVerificando(false) }
      })
    }
    verificar()
  }, [])

  // Redefinicao de senha = usuario ja tem password_set true
  const isReset = !!sessao?.user?.user_metadata?.password_set

  const definirSenha = async (e) => {
    e.preventDefault()
    setErro('')
    if (!isReset && !nome.trim()) { setErro('Informe seu nome.'); return }
    if (!isReset && !sobrenome.trim()) { setErro('Informe seu sobrenome.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    setSalvando(true)

    // 1. Atualizar senha e marcar password_set
    const { error: pwErr } = await supabase.auth.updateUser({
      password: senha,
      data: { password_set: true }
    })
    if (pwErr) { setErro('Erro ao salvar senha: ' + pwErr.message); setSalvando(false); return }

    // 2. Salvar perfil com nome (apenas no primeiro cadastro)
    if (!isReset) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: sessao.user.id,
        full_name: nome.trim() + ' ' + sobrenome.trim()
      })
      if (profileErr) console.warn('Perfil:', profileErr.message)
    }

    router.push('/exercicios')
  }

  if (verificando) return (
    <div style={s.loading}>Verificando convite...</div>
  )

  if (!sessao) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚠️</div>
        <h2 style={s.titulo}>Link inválido</h2>
        <p style={{color:'#666',fontSize:'.9rem',lineHeight:1.5}}>
          Este link de convite é inválido ou já foi utilizado.
          Solicite um novo convite ao administrador.
        </p>
      </div>
    </div>
  )

  return (
    <>
      <Head><title>English Step By Step - {isReset ? 'Redefinir Senha' : 'Cadastro'}</title></Head>
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>🎓</div>
          <h1 style={s.titulo}>English Step By Step</h1>
          <p style={s.sub}>{isReset ? 'Digite sua nova senha' : 'Complete seu cadastro para começar'}</p>
          <form onSubmit={definirSenha}>
            {!isReset && (
              <div style={s.row}>
                <div style={{...s.campo, flex:1}}>
                  <label style={s.label}>Nome</label>
                  <input type="text" value={nome} onChange={e=>setNome(e.target.value)}
                    placeholder="Seu nome" required style={s.input} />
                </div>
                <div style={{...s.campo, flex:1, marginLeft:'10px'}}>
                  <label style={s.label}>Sobrenome</label>
                  <input type="text" value={sobrenome} onChange={e=>setSobrenome(e.target.value)}
                    placeholder="Seu sobrenome" required style={s.input} />
                </div>
              </div>
            )}
            <div style={s.campo}>
              <label style={s.label}>{isReset ? 'Nova senha' : 'Senha'}</label>
              <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres" required style={s.input} />
            </div>
            <div style={s.campo}>
              <label style={s.label}>Confirmar senha</label>
              <input type="password" value={confirmar} onChange={e=>setConfirmar(e.target.value)}
                placeholder="Repita a senha" required style={s.input} />
            </div>
            {erro && <div style={s.erro}>{erro}</div>}
            <button type="submit" disabled={salvando} style={s.btn}>
              {salvando ? 'Salvando...' : isReset ? 'Salvar nova senha' : 'Criar conta e entrar'}
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
  card: {background:'#fff',borderRadius:'16px',padding:'40px 36px',maxWidth:'480px',width:'100%',boxShadow:'0 4px 24px rgba(0,0,0,.12)',textAlign:'center'},
  logo: {fontSize:'3rem',marginBottom:'10px'},
  titulo: {fontSize:'1.5rem',color:'#0d2157',fontWeight:800,marginBottom:'4px'},
  sub: {color:'#666',fontSize:'.9rem',marginBottom:'28px'},
  row: {display:'flex',marginBottom:'0'},
  campo: {textAlign:'left',marginBottom:'16px'},
  label: {display:'block',fontSize:'.85rem',fontWeight:600,color:'#333',marginBottom:'6px'},
  input: {width:'100%',border:'2px solid #e0e0e0',borderRadius:'9px',padding:'10px 14px',fontSize:'1rem',outline:'none',fontFamily:'inherit',boxSizing:'border-box'},
  erro: {background:'#ffebee',color:'#c62828',borderRadius:'8px',padding:'10px 14px',fontSize:'.88rem',marginBottom:'14px',borderLeft:'4px solid #c62828'},
  btn: {width:'100%',background:'#1565c0',color:'#fff',border:'none',borderRadius:'9px',padding:'12px',fontSize:'1rem',fontWeight:700,cursor:'pointer',marginTop:'4px'},
}
