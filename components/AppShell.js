import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import Avatar from './Avatar'

const ITENS_ALUNO = [
  { href: '/exercicios', icone: '📚', nome: 'Exercícios' },
  { href: '/mensagens', icone: '💬', nome: 'Mensagens' },
  { href: '/perfil', icone: '👤', nome: 'Perfil' }
]
const ITENS_PROFESSOR = [
  { href: '/exercicios', icone: '📚', nome: 'Exercícios' },
  { href: '/meus-exercicios', icone: '📝', nome: 'Meus Exercícios' },
  { href: '/turmas', icone: '🏫', nome: 'Turmas' },
  { href: '/correcao', icone: '👥', nome: 'Painel de Alunos' },
  { href: '/controle-acessos', icone: '🔑', nome: 'Controle de Acessos' },
  { href: '/mensagens', icone: '💬', nome: 'Mensagens' },
  { href: '/perfil', icone: '👤', nome: 'Perfil' }
]

const CACHE = 'perfil_cache_v1'
const TTL = 30 * 60 * 1000   // o link da foto vale 1 h; renovamos antes

function lerCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE) || 'null')
    return c && Date.now() - c.t < TTL ? c.d : null
  } catch (e) { return null }
}
function gravarCache(d) { try { sessionStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), d })) } catch (e) { /* ok */ } }

// Moldura das telas internas: barra lateral recolhivel + barra de titulo.
export default function AppShell({ titulo, children }) {
  const router = useRouter()
  const [aberta, setAberta] = useState(false)
  const [professor, setProfessor] = useState(false)
  const [perfil, setPerfil] = useState(null)
  const botaoRef = useRef(null)

  const carregarPerfil = async (forcar) => {
    if (!forcar) { const c = lerCache(); if (c) { setPerfil(c); return } }
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return
    try {
      const r = await fetch('/api/perfil', { headers: { Authorization: `Bearer ${token}` } })
      if (r.ok) { const d = await r.json(); gravarCache(d); setPerfil(d) }
    } catch (e) { /* sem perfil: mostra so o e-mail */ }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setProfessor(session.user.app_metadata?.role === 'teacher')
    })
    carregarPerfil(false)
    const aoAtualizar = () => carregarPerfil(true)
    window.addEventListener('perfil-atualizado', aoAtualizar)
    return () => window.removeEventListener('perfil-atualizado', aoAtualizar)
  }, [])

  // Fecha ao navegar e com a tecla Esc
  useEffect(() => {
    const fechar = () => setAberta(false)
    const tecla = (e) => { if (e.key === 'Escape') setAberta(false) }
    router.events.on('routeChangeStart', fechar)
    window.addEventListener('keydown', tecla)
    return () => { router.events.off('routeChangeStart', fechar); window.removeEventListener('keydown', tecla) }
  }, [])

  const sair = async () => {
    try { sessionStorage.removeItem(CACHE) } catch (e) { /* ok */ }
    await supabase.auth.signOut()
    router.push('/')
  }

  const itens = professor ? ITENS_PROFESSOR : ITENS_ALUNO
  const nome = perfil?.nomeExibicao || perfil?.nomeCadastro || (perfil?.email ? perfil.email.split('@')[0] : '')
  const ativo = (href) => router.pathname === href

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <button className="sh-burger" onClick={() => setAberta(true)} aria-label="Abrir menu" ref={botaoRef}>☰</button>
      <div className={'sh-backdrop' + (aberta ? ' show' : '')} onClick={() => setAberta(false)} />

      <aside className={'sh-side' + (aberta ? ' open' : '')} aria-label="Menu principal">
        <button className="sh-item sh-toggle" onClick={() => setAberta(a => !a)} aria-expanded={aberta}
          aria-label={aberta ? 'Recolher menu' : 'Expandir menu'} title={aberta ? 'Recolher menu' : 'Menu'}>
          <span className="sh-ic">{aberta ? '✕' : '☰'}</span><span className="sh-tx">English Step By Step</span>
        </button>

        <Link href="/perfil" className="sh-perfil" title="Meu perfil">
          <Avatar foto={perfil?.fotoUrl} nome={nome} tamanho={36} />
          <span className="sh-tx sh-nomes">
            <b>{nome || 'Meu perfil'}</b>
            <small>{perfil?.papel === 'professor' ? 'Professor' : perfil?.papel === 'aluno' ? 'Aluno' : ''}</small>
          </span>
        </Link>

        <nav className="sh-nav">
          {itens.map(i => (
            <Link key={i.href} href={i.href} className={'sh-item' + (ativo(i.href) ? ' ativo' : '')}
              aria-current={ativo(i.href) ? 'page' : undefined} title={i.nome}>
              <span className="sh-ic">{i.icone}</span><span className="sh-tx">{i.nome}</span>
            </Link>
          ))}
        </nav>

        <button className="sh-item sh-sair" onClick={sair} title="Sair">
          <span className="sh-ic">🚪</span><span className="sh-tx">Sair</span>
        </button>
      </aside>

      <div className="sh-main">
        <header className="sh-top"><span>{titulo}</span></header>
        <main className="sh-content">{children}</main>
      </div>
    </>
  )
}

const CSS = `
  .sh-side{position:fixed;top:0;left:0;bottom:0;width:56px;background:#0d2157;color:#fff;z-index:300;display:flex;flex-direction:column;overflow:hidden;transition:width .22s ease,transform .22s ease;box-shadow:2px 0 10px rgba(0,0,0,.18)}
  .sh-side.open{width:260px}
  .sh-main{margin-left:56px;min-height:100vh;min-height:100dvh}
  .sh-top{position:sticky;top:0;z-index:100;height:52px;background:linear-gradient(135deg,#0d2157,#1565c0);color:#fff;display:flex;align-items:center;padding:0 18px;font-weight:700;font-size:1rem;box-shadow:0 2px 8px rgba(0,0,0,.2)}
  .sh-burger{display:none}
  .sh-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:250}
  .sh-backdrop.show{display:block}
  .sh-item{display:flex;align-items:center;gap:14px;height:48px;padding:0 12px;width:100%;color:#fff;text-decoration:none;background:none;border:none;cursor:pointer;font:inherit;font-size:.95rem;white-space:nowrap;text-align:left;flex-shrink:0}
  .sh-item:hover{background:rgba(255,255,255,.12)}
  .sh-item:focus-visible,.sh-perfil:focus-visible{outline:2px solid #f9a825;outline-offset:-2px}
  .sh-item .sh-ic{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;background:rgba(255,255,255,.92);border-radius:9px;box-shadow:0 1px 3px rgba(0,0,0,.25)}
  .sh-item.ativo .sh-ic{background:#fff;box-shadow:0 0 0 2px #f9a825}
  .sh-toggle .sh-ic{background:none;box-shadow:none;font-size:1.3rem}
  .sh-item.ativo{background:rgba(255,255,255,.2);box-shadow:inset 4px 0 0 #f9a825;font-weight:700}
  .sh-tx{opacity:0;transition:opacity .15s ease;pointer-events:none}
  .sh-side.open .sh-tx{opacity:1;pointer-events:auto}
  .sh-toggle{font-weight:700;border-bottom:1px solid rgba(255,255,255,.15)}
  .sh-perfil{display:flex;align-items:center;gap:12px;padding:12px 10px;color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.15);flex-shrink:0;white-space:nowrap}
  .sh-perfil:hover{background:rgba(255,255,255,.08)}
  .sh-nomes{display:flex;flex-direction:column;min-width:0;overflow:hidden}
  .sh-nomes b{overflow:hidden;text-overflow:ellipsis;font-size:.95rem}
  .sh-nomes small{opacity:.75;font-size:.75rem}
  .sh-nav{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 0}
  .sh-sair{border-top:1px solid rgba(255,255,255,.15)}
  .sh-content{min-width:0}
  @media(max-width:719px){
    .sh-side{width:270px;transform:translateX(-100%);box-shadow:none}
    .sh-side.open{width:270px;transform:translateX(0);box-shadow:2px 0 18px rgba(0,0,0,.4)}
    .sh-main{margin-left:0}
    .sh-top{padding-left:64px}
    .sh-burger{display:flex;align-items:center;justify-content:center;position:fixed;top:6px;left:8px;z-index:200;width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.5);background:rgba(13,33,87,.55);color:#fff;font-size:1.25rem;cursor:pointer}
  }
  @media(prefers-reduced-motion:reduce){.sh-side,.sh-tx{transition:none}}
`
