import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Avatar from '../components/Avatar'
import Head from 'next/head'

const LADO = 256

// Reduz e recorta a foto (quadrada, 256 px, JPEG) no navegador antes de enviar.
function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(arquivo.type)) { reject(new Error('Escolha um arquivo de imagem.')); return }
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const sx = (img.width - lado) / 2, sy = (img.height - lado) / 2
      const c = document.createElement('canvas')
      c.width = LADO; c.height = LADO
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, LADO, LADO)
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO)
      URL.revokeObjectURL(url)
      let q = 0.85, dados = c.toDataURL('image/jpeg', q)
      while (dados.length > 250000 && q > 0.4) { q -= 0.1; dados = c.toDataURL('image/jpeg', q) }
      resolve(dados)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler esta imagem.')) }
    img.src = url
  })
}

export default function Perfil() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [perfil, setPerfil] = useState(null)
  const [nome, setNome] = useState('')
  const [idade, setIdade] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const arquivoRef = useRef(null)

  const avisar = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg({ tipo: '', texto: '' }), 5000) }

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
    const { ok, d } = await api('/api/perfil')
    if (ok) { setPerfil(d); setNome(d.nomeExibicao || ''); setIdade(d.idade ?? '') }
    setCarregando(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      if (!session.user.user_metadata?.password_set) { router.push('/auth/confirmar'); return }
      carregar()
    })
  }, [])

  const avisarShell = () => window.dispatchEvent(new Event('perfil-atualizado'))

  const salvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    const { ok, d } = await api('/api/perfil', { method: 'PUT', body: { nomeExibicao: nome, idade: idade === '' ? null : Number(idade) } })
    setSalvando(false)
    if (!ok) { avisar('err', d.error || 'Erro ao salvar'); return }
    avisar('ok', 'Perfil salvo!')
    avisarShell()
    carregar()
  }

  const escolherFoto = async (e) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setEnviandoFoto(true)
    try {
      const imagem = await prepararFoto(arquivo)
      const { ok, d } = await api('/api/perfil/foto', { method: 'POST', body: { imagem } })
      if (!ok) { avisar('err', d.error || 'Erro ao enviar a foto'); return }
      avisar('ok', 'Foto atualizada!')
      avisarShell()
      await carregar()
    } catch (err) {
      avisar('err', err.message || 'Erro ao processar a foto')
    } finally {
      setEnviandoFoto(false)
    }
  }

  const removerFoto = async () => {
    if (!window.confirm('Remover a sua foto?')) return
    setEnviandoFoto(true)
    const { ok, d } = await api('/api/perfil/foto', { method: 'DELETE' })
    setEnviandoFoto(false)
    if (!ok) { avisar('err', d.error || 'Erro ao remover'); return }
    avisar('ok', 'Foto removida.')
    avisarShell()
    carregar()
  }

  const nomeMostrado = nome || perfil?.nomeCadastro || perfil?.email || ''

  return (
    <>
      <Head><title>English Step By Step - Perfil</title></Head>
      <div style={s.page}>
        {msg.texto && <div style={{ ...s.msg, ...(msg.tipo === 'ok' ? s.msgOk : s.msgErr) }}>{msg.texto}</div>}
        {carregando ? <p style={{ color: '#888' }}>Carregando...</p> : (
          <div style={s.card}>
            <div style={s.fotoBloco}>
              <Avatar foto={perfil?.fotoUrl} nome={nomeMostrado} tamanho={112} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                <input ref={arquivoRef} type="file" accept="image/*" onChange={escolherFoto} style={{ display: 'none' }} />
                <button type="button" onClick={() => arquivoRef.current?.click()} disabled={enviandoFoto || !perfil?.podeFoto}
                  style={{ ...s.btnPrimario, opacity: (enviandoFoto || !perfil?.podeFoto) ? .5 : 1 }}>
                  {enviandoFoto ? 'Enviando...' : perfil?.fotoUrl ? 'Trocar foto' : 'Escolher foto'}
                </button>
                {perfil?.fotoUrl && <button type="button" onClick={removerFoto} disabled={enviandoFoto} style={s.btnRemover}>Remover foto</button>}
              </div>
            </div>
            {!perfil?.podeFoto && (
              <div style={s.aviso}>
                🔒 O envio de foto será liberado quando o seu professor registrar o consentimento do responsável.
              </div>
            )}
            <p style={s.privacidade}>Sua foto aparece para você e para o seu professor. Os colegas não a veem.</p>

            <form onSubmit={salvar}>
              <label style={s.label}>Nome de exibição</label>
              <input value={nome} onChange={e => setNome(e.target.value)} maxLength={40} placeholder="Como você quer ser chamado(a)" style={s.input} />
              <div style={s.dica}>É o nome que aparece no menu e nas conversas com os colegas.</div>

              <label style={{ ...s.label, marginTop: '16px' }}>Idade (opcional)</label>
              <input type="number" inputMode="numeric" min={3} max={120} value={idade} onChange={e => setIdade(e.target.value)}
                style={{ ...s.input, maxWidth: '140px' }} />

              <div style={s.leitura}>
                <div><span style={s.rotulo}>Nome no cadastro</span><br />{perfil?.nomeCadastro || <i style={{ color: '#aaa' }}>não informado</i>}</div>
                <div><span style={s.rotulo}>E-mail</span><br /><span style={{ overflowWrap: 'anywhere' }}>{perfil?.email}</span></div>
              </div>

              <button type="submit" disabled={salvando} style={{ ...s.btnPrimario, marginTop: '18px', opacity: salvando ? .5 : 1 }}>
                {salvando ? 'Salvando...' : 'Salvar perfil'}
              </button>
              <p style={{ marginTop: '16px', fontSize: '.8rem', color: '#777' }}>
                <a href="/privacidade" style={{ color: '#1565c0' }}>Política de Privacidade</a>{' · '}
                <a href="/termos" style={{ color: '#1565c0' }}>Termos de Uso</a>{' · '}
                <a href="/meus-dados" style={{ color: '#1565c0' }}>Meus Dados</a>
              </p>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

const s = {
  page: { maxWidth: '620px', margin: '0 auto', padding: '22px 16px' },
  card: { background: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,.08)' },
  fotoBloco: { display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' },
  aviso: { background: '#fff8e1', color: '#6d4c00', borderLeft: '4px solid #f9a825', borderRadius: '8px', padding: '10px 14px', fontSize: '.88rem', marginBottom: '10px' },
  privacidade: { color: '#777', fontSize: '.82rem', marginBottom: '20px' },
  label: { display: 'block', fontSize: '.88rem', fontWeight: 600, color: '#333', marginBottom: '6px' },
  input: { width: '100%', border: '2px solid #e0e0e0', borderRadius: '9px', padding: '10px 14px', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  dica: { fontSize: '.78rem', color: '#888', marginTop: '4px' },
  leitura: { display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '20px', padding: '12px 14px', background: '#f5f8fc', borderRadius: '10px', fontSize: '.9rem' },
  rotulo: { fontSize: '.74rem', color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' },
  msg: { padding: '11px 16px', borderRadius: '9px', fontSize: '.9rem', marginBottom: '16px' },
  msgOk: { background: '#e3f2fd', color: '#0d2157', borderLeft: '4px solid #0d47a1' },
  msgErr: { background: '#ffebee', color: '#c62828', borderLeft: '4px solid #c62828' },
  btnPrimario: { background: '#1565c0', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', cursor: 'pointer', fontSize: '.92rem', fontWeight: 700 },
  btnRemover: { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', borderRadius: '9px', padding: '8px 16px', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 },
}

Perfil.shellTitle = '👤 Meu Perfil'
