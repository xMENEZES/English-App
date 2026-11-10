import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import { VERSOES, CONTROLADOR } from '../lib/lgpd/config'

// Tela exibida quando o usuario ainda nao aceitou a versao vigente dos Termos e da Politica.
export default function Aceite() {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)
  const [marcado, setMarcado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const token = async () => (await supabase.auth.getSession()).data?.session?.access_token

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      const t = session.access_token
      const r = await fetch('/api/aceite', { headers: { Authorization: `Bearer ${t}` } })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.aceito) { router.replace('/exercicios'); return }
      setPronto(true)
    })
  }, [])

  const aceitar = async () => {
    setErro('')
    setSalvando(true)
    const r = await fetch('/api/aceite', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ aceito: true })
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { setSalvando(false); setErro(d.error || 'Não foi possível registrar o aceite'); return }
    try { sessionStorage.removeItem('perfil_cache_v1') } catch (e) { /* ok */ }
    window.dispatchEvent(new Event('perfil-atualizado'))
    router.replace('/exercicios')
  }

  const sair = async () => { try { sessionStorage.removeItem('perfil_cache_v1') } catch (e) { /* ok */ } await supabase.auth.signOut(); router.push('/') }

  if (!pronto) return <div style={s.loading}>Carregando...</div>

  return (
    <>
      <Head><title>English Step By Step - Termos e Privacidade</title></Head>
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ fontSize: '2.4rem' }}>🛡️</div>
          <h1 style={s.titulo}>Antes de continuar</h1>
          <p style={s.p}>Para usar o {CONTROLADOR.servico}, leia e aceite os documentos abaixo (versões {VERSOES.termos} e {VERSOES.privacidade}).</p>
          <ul style={s.lista}>
            <li><a href="/termos" target="_blank" rel="noopener noreferrer" style={s.link}>Termos de Uso</a></li>
            <li><a href="/privacidade" target="_blank" rel="noopener noreferrer" style={s.link}>Política de Privacidade</a></li>
          </ul>
          <p style={s.resumo}>
            Em resumo: guardamos o seu cadastro, o seu progresso e as suas mensagens apenas para o curso funcionar. Só o professor vê os seus dados, e os colegas veem somente o seu nome de exibição no chat da turma.
            Você pode pedir uma cópia, correção ou exclusão dos seus dados a qualquer momento na tela Meus Dados.
          </p>
          <label style={s.check}>
            <input type="checkbox" checked={marcado} onChange={e => setMarcado(e.target.checked)} style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span>
          </label>
          {erro && <div style={s.erro}>{erro}</div>}
          <button onClick={aceitar} disabled={!marcado || salvando} style={{ ...s.btn, opacity: (!marcado || salvando) ? .5 : 1 }}>
            {salvando ? 'Registrando...' : 'Aceitar e continuar'}
          </button>
          <button onClick={sair} style={s.sair}>Não aceito (sair)</button>
        </div>
      </div>
    </>
  )
}

const s = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Segoe UI,sans-serif', color: '#0d2157' },
  page: { minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Segoe UI,sans-serif' },
  card: { background: '#fff', borderRadius: '16px', padding: '32px 28px', maxWidth: '520px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.12)', textAlign: 'center' },
  titulo: { fontSize: '1.5rem', color: '#0d2157', margin: '6px 0 10px' },
  p: { color: '#444', fontSize: '.95rem', lineHeight: 1.6 },
  lista: { listStyle: 'none', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' },
  link: { color: '#1565c0', fontWeight: 700, fontSize: '1rem' },
  resumo: { background: '#f5f8fc', borderRadius: '10px', padding: '12px 14px', fontSize: '.86rem', color: '#555', textAlign: 'left', lineHeight: 1.55, marginBottom: '16px' },
  check: { display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', fontSize: '.95rem', cursor: 'pointer', marginBottom: '16px' },
  erro: { background: '#ffebee', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '.88rem', marginBottom: '12px' },
  btn: { width: '100%', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' },
  sair: { marginTop: '10px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '.85rem', textDecoration: 'underline' },
}
