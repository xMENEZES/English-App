import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'
import Script from 'next/script'

export default function Exercicios() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // getUser() valida o token no servidor: se o professor removeu o aluno, a sessao
    // local (getSession) ainda parece valida ate expirar, entao confirmamos aqui.
    const validarUsuario = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        await supabase.auth.signOut()
        router.push('/')
      }
    }
    const aoVoltarAoFoco = () => { if (document.visibilityState === 'visible') validarUsuario() }
    document.addEventListener('visibilitychange', aoVoltarAoFoco)
    const timer = setInterval(validarUsuario, 120000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      const { error: ue } = await supabase.auth.getUser()
      if (ue) { await supabase.auth.signOut(); router.push('/'); return }
      // Se o usuario ainda nao definiu sua propria senha, redireciona para confirmar
      if (!session.user.user_metadata?.password_set) {
        router.push('/auth/confirmar')
        return
      }
      // Expor cliente e userId para exercises.js salvar respostas
      if (typeof window !== 'undefined') {
        window.__sbClient = supabase
        window.__sbUserId = session.user.id
      }

      // Reconstruir badges do localStorage a partir do banco de dados
      supabase
        .from('exercise_results')
        .select('unit_id, question_idx, is_correct, answered_at')
        .eq('user_id', session.user.id)
        .order('answered_at', { ascending: false })
        .then(({ data }) => {
          if (!data || data.length === 0) return
          // Para cada unidade, pegar a resposta mais recente por questão
          const unidades = {}
          data.forEach(r => {
            if (!unidades[r.unit_id]) unidades[r.unit_id] = {}
            if (!unidades[r.unit_id][r.question_idx]) {
              unidades[r.unit_id][r.question_idx] = r.is_correct
            }
          })
          // Salvar badge ou progresso no localStorage com base na conclusao
          Object.entries(unidades).forEach(([uid, questoes]) => {
            const total = Object.keys(questoes).length
            const acertos = Object.values(questoes).filter(Boolean).length
            if (total >= 20) {
              // Unidade concluida: salvar como badge
              localStorage.setItem('wz_badge_' + uid, JSON.stringify({ s: acertos, t: total }))
              localStorage.removeItem('wz_prog_' + uid)
            } else if (total > 0) {
              // Unidade em andamento: salvar como progresso
              localStorage.setItem('wz_prog_' + uid, JSON.stringify({ curIdx: total, curScore: acertos }))
              localStorage.removeItem('wz_badge_' + uid)
            }
          })
        })

      setSessao(session)
      setCarregando(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.push('/')
    })
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', aoVoltarAoFoco)
      clearInterval(timer)
    }
  }, [])

  // Sempre que a pagina renderizar, restaurar badges e progresso do localStorage
  useEffect(() => {
    if (!carregando && sessao) {
      const t = setTimeout(() => {
        if (typeof window !== 'undefined' && typeof window.refreshBadges === 'function') {
          window.refreshBadges()
        }
      }, 400)
      return () => clearTimeout(t)
    }
  }, [carregando, sessao])

  const sair = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (carregando) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#f0f4f8',fontFamily:'Segoe UI,sans-serif',color:'#0d2157',fontSize:'1.1rem'}}>
      Carregando...
    </div>
  )

  return (
    <>
      <Head><title>English Step By Step - Exercicios</title></Head>
      <style dangerouslySetInnerHTML={{__html: EXERCISES_CSS}} />
      <div style={{background:'#0a1845',color:'#fff',padding:'7px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'.75rem',flexWrap:'wrap',gap:'4px'}}>
        <span>Logado como: <strong>{sessao.user.email}</strong></span>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {sessao.user.app_metadata?.role === 'teacher' && (<>
            <button onClick={() => router.push('/correcao')}
              style={{background:'rgba(255,255,255,.25)',border:'1px solid rgba(255,255,255,.7)',color:'#fff',padding:'4px 14px',borderRadius:'20px',cursor:'pointer',fontSize:'.8rem',fontWeight:600}}>
              👥 Painel de Alunos
            </button>
            <button onClick={() => router.push('/controle-acessos')}
              style={{background:'rgba(255,255,255,.25)',border:'1px solid rgba(255,255,255,.7)',color:'#fff',padding:'4px 14px',borderRadius:'20px',cursor:'pointer',fontSize:'.8rem',fontWeight:600}}>
              🔑 Controle de Acessos
            </button>
          </>)}
          <button onClick={sair} style={{background:'rgba(255,255,255,.18)',border:'1px solid rgba(255,255,255,.5)',color:'#fff',padding:'4px 14px',borderRadius:'20px',cursor:'pointer',fontSize:'.8rem'}}>Sair</button>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{__html: EXERCISES_BODY}} />
      <Script src="/exercises.js" strategy="afterInteractive" />
    </>
  )
}

const EXERCISES_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f0f4f8;min-height:100vh;overflow-x:hidden}
  .app-header{background:linear-gradient(135deg,#0d2157,#1565c0);color:#fff;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 3px 10px rgba(0,0,0,.25);position:sticky;top:0;z-index:100}
  .app-header h1{font-size:1.25rem;letter-spacing:.5px}
  .back-btn{background:rgba(255,255,255,.2);border:2px solid #fff;color:#fff;padding:7px 18px;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600;transition:.2s;display:none}
  .back-btn:hover{background:#fff;color:#0d2157}
  .screen{display:none;padding:22px;max-width:820px;margin:0 auto}
  .screen.active{display:block}
  .home-hero{text-align:center;padding:28px 0 18px}
  .home-hero h2{font-size:1.9rem;color:#0d2157;margin-bottom:6px}
  .home-hero p{color:#666;font-size:.95rem}
  .units-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-top:18px}
  .unit-card{background:#fff;border-radius:14px;padding:20px 18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.09);transition:.3s;border-left:5px solid #f9a825;text-align:center}
  .unit-card:hover{transform:translateY(-4px);box-shadow:0 8px 22px rgba(0,0,0,.14)}
  .unit-num{font-size:2.2rem;color:#1565c0;font-weight:800;line-height:1}
  .unit-title{font-size:1rem;font-weight:700;color:#222;margin:6px 0 3px}
  .unit-desc{font-size:.78rem;color:#888}
  .unit-badge{margin-top:9px;font-size:.78rem;font-weight:700;color:#1565c0}
  .unit-hdr{background:linear-gradient(135deg,#0d2157,#1565c0);color:#fff;padding:18px 20px;border-radius:14px;margin-bottom:18px}
  .unit-hdr h2{font-size:1.45rem;margin-bottom:4px}
  .unit-hdr p{opacity:.85;font-size:.88rem}
  .prog-wrap{background:#ddd;border-radius:10px;height:8px;margin-bottom:6px}
  .prog-bar{background:linear-gradient(90deg,#1565c0,#64b5f6);height:100%;border-radius:10px;transition:width .4s}
  .prog-label{text-align:right;font-size:.78rem;color:#777;margin-bottom:16px}
  .ex-card{background:#fff;border-radius:14px;padding:22px;margin-bottom:18px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .ex-type-tag{display:inline-block;padding:3px 12px;border-radius:20px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px}
  .tag-mc{background:#e3f2fd;color:#0d2157}
  .tag-fill{background:#e3f2fd;color:#1565c0}
  .tag-translate{background:#fce4ec;color:#880e4f}
  .ex-question{font-size:1.05rem;font-weight:600;color:#1a1a1a;margin-bottom:16px;line-height:1.65}
  .opts-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .opt-btn{padding:11px 14px;border:2px solid #e0e0e0;border-radius:9px;cursor:pointer;background:#fff;font-size:.92rem;text-align:left;transition:.18s;color:#333}
  .opt-btn:hover:not(:disabled){border-color:#1565c0;background:#f1f8f1}
  .opt-btn.selected{border-color:#1565c0;background:#e3f2fd}
  .opt-btn.correct{border-color:#0d47a1!important;background:#e3f2fd!important;color:#0d2157!important;font-weight:700}
  .opt-btn.wrong{border-color:#c62828!important;background:#ffebee!important;color:#b71c1c!important;font-weight:700}
  .fill-input{border:2px solid #e0e0e0;border-radius:9px;padding:10px 14px;font-size:.98rem;width:100%;outline:none;transition:.2s;margin-bottom:14px}
  .fill-input:focus{border-color:#1565c0}
  .fill-input.correct{border-color:#0d47a1;background:#e3f2fd;color:#0d2157}
  .fill-input.wrong{border-color:#c62828;background:#ffebee;color:#b71c1c}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:4px}
  .check-btn{background:#1565c0;color:#fff;border:none;padding:10px 24px;border-radius:9px;cursor:pointer;font-size:.92rem;font-weight:700;transition:.2s}
  .check-btn:hover:not(:disabled){background:#0d2157}
  .check-btn:disabled{background:#bdbdbd;cursor:not-allowed}
  .next-btn{background:#1565c0;color:#fff;border:none;padding:10px 24px;border-radius:9px;cursor:pointer;font-size:.92rem;font-weight:700;transition:.2s;display:none}
  .next-btn:hover{background:#0d47a1}
  .next-btn.show{display:inline-block}
  .feedback{padding:11px 15px;border-radius:9px;font-size:.93rem;margin-top:12px;display:none;line-height:1.5}
  .feedback.show{display:block}
  .feedback.ok{background:#e3f2fd;color:#0d2157;border-left:4px solid #0d47a1}
  .feedback.err{background:#ffebee;color:#b71c1c;border-left:4px solid #c62828}
  .score-card{background:#fff;border-radius:14px;padding:30px 22px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.09);margin-bottom:20px;display:none}
  .score-card.show{display:block}
  .score-ring{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.9rem;font-weight:800;color:#fff;margin:0 auto 16px;box-shadow:0 4px 14px rgba(0,0,0,.18)}
  .score-msg{font-size:1.2rem;font-weight:700;color:#222;margin-bottom:6px}
  .score-sub{color:#666;font-size:.92rem}
  .retry-btn{background:#ef6c00;color:#fff;border:none;padding:11px 26px;border-radius:9px;cursor:pointer;font-size:.95rem;font-weight:700;margin-top:16px;transition:.2s}
  .retry-btn:hover{background:#e65100}
  .home-btn2{background:#1565c0;color:#fff;border:none;padding:11px 26px;border-radius:9px;cursor:pointer;font-size:.95rem;font-weight:700;margin-top:16px;margin-left:10px;transition:.2s}
  .home-btn2:hover{background:#0d2157}
  .vocab-section{background:#e8f4fd;border-radius:12px;padding:16px 18px;margin-bottom:20px;border:1px solid #90caf9}
  .vocab-section h3{font-size:.9rem;text-transform:uppercase;letter-spacing:.5px;color:#1565c0;margin-bottom:10px}
  .vocab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:5px}
  .vocab-item{font-size:.82rem;color:#444;padding:3px 0}
  .vocab-item strong{color:#0d2157}
  @media(max-width:520px){.opts-grid{grid-template-columns:1fr}.units-grid{grid-template-columns:1fr 1fr}.app-header h1{font-size:1rem}.screen{padding:14px}.unit-card{padding:14px 10px}}@media(max-width:360px){.units-grid{grid-template-columns:1fr}}
`

const EXERCISES_BODY = `
<div class="app-header">
  <h1>&#127891; English Step By Step</h1>
  <button class="back-btn" id="backBtn" onclick="goHome()">&#8592; Menu</button>
</div>
<div class="screen active" id="homeScreen">
  <div class="home-hero">
    <h2>English Step By Step</h2>
    <p>Baseado no livro <strong>English Step By Step</strong> &mdash; Selecione uma unidade para comecar</p>
  </div>
  <div class="units-grid">
    <div class="unit-card" onclick="openUnit(1)"><div class="unit-num">1</div><div class="unit-title">I drink / I eat</div><div class="unit-desc">Alimentos, bebidas e verbos basicos</div><div class="unit-badge" id="badge1">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(2)"><div class="unit-num">2</div><div class="unit-title">I speak / I study</div><div class="unit-desc">Idiomas, familia e negativa</div><div class="unit-badge" id="badge2">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(3)"><div class="unit-num">3</div><div class="unit-title">I work / I play</div><div class="unit-desc">Trabalho, esportes e horarios</div><div class="unit-badge" id="badge3">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(4)"><div class="unit-num">4</div><div class="unit-title">I like / I sleep</div><div class="unit-desc">Gostar, dormir, artigos a/an</div><div class="unit-badge" id="badge4">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(5)"><div class="unit-num">5</div><div class="unit-title">I want / I go</div><div class="unit-desc">Desejos, destinos e perguntas</div><div class="unit-badge" id="badge5">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(6)"><div class="unit-num">6</div><div class="unit-title">I have / I understand</div><div class="unit-desc">Posse, obrigacao e where</div><div class="unit-badge" id="badge6">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(7)"><div class="unit-num">7</div><div class="unit-title">I need / I prefer</div><div class="unit-desc">Necessidade, preferencia e comidas</div><div class="unit-badge" id="badge7">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(8)"><div class="unit-num">8</div><div class="unit-title">I buy / I sell</div><div class="unit-desc">Comprar, vender e roupas</div><div class="unit-badge" id="badge8">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(9)"><div class="unit-num">9</div><div class="unit-title">I help / I know</div><div class="unit-desc">Ajudar, saber e familia</div><div class="unit-badge" id="badge9">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(10)"><div class="unit-num">10</div><div class="unit-title">I read / I write</div><div class="unit-desc">Ler, escrever e comunicacao</div><div class="unit-badge" id="badge10">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(11)"><div class="unit-num">11</div><div class="unit-title">I open / I close</div><div class="unit-desc">Abrir, fechar e comodos</div><div class="unit-badge" id="badge11">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(12)"><div class="unit-num">12</div><div class="unit-title">I live / I start</div><div class="unit-desc">Morar, comecar e frutas</div><div class="unit-badge" id="badge12">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(13)"><div class="unit-num">13</div><div class="unit-title">I come / I stay</div><div class="unit-desc">Vir, ficar e paises</div><div class="unit-badge" id="badge13">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(14)"><div class="unit-num">14</div><div class="unit-title">I cook / I visit</div><div class="unit-desc">Cozinhar, visitar e cidade</div><div class="unit-badge" id="badge14">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(15)"><div class="unit-num">15</div><div class="unit-title">I do / I make</div><div class="unit-desc">Fazer e escola</div><div class="unit-badge" id="badge15">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(16)"><div class="unit-num">16</div><div class="unit-title">I finish / I try</div><div class="unit-desc">Terminar, tentar e horas</div><div class="unit-badge" id="badge16">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(17)"><div class="unit-num">17</div><div class="unit-title">He / She (presente)</div><div class="unit-desc">Terceira pessoa singular</div><div class="unit-badge" id="badge17">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(18)"><div class="unit-num">18</div><div class="unit-title">He / She (mais verbos)</div><div class="unit-desc">Mais verbos he/she</div><div class="unit-badge" id="badge18">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(19)"><div class="unit-num">19</div><div class="unit-title">We / They</div><div class="unit-desc">Plural no presente</div><div class="unit-badge" id="badge19">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(20)"><div class="unit-num">20</div><div class="unit-title">Passado regular</div><div class="unit-desc">Trabalhei, estudei, viajei</div><div class="unit-badge" id="badge20">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(21)"><div class="unit-num">21</div><div class="unit-title">Passado irregular I</div><div class="unit-desc">Went, took, knew, drove</div><div class="unit-badge" id="badge21">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(22)"><div class="unit-num">22</div><div class="unit-title">Passado irregular II</div><div class="unit-desc">Read, wrote, said, did</div><div class="unit-badge" id="badge22">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(23)"><div class="unit-num">23</div><div class="unit-title">Can (poder)</div><div class="unit-desc">Habilidades e permissao</div><div class="unit-badge" id="badge23">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(24)"><div class="unit-num">24</div><div class="unit-title">Would (condicional)</div><div class="unit-desc">Gostaria e preferiria</div><div class="unit-badge" id="badge24">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(25)"><div class="unit-num">25</div><div class="unit-title">Passado III</div><div class="unit-desc">Had, spoke, paid, made</div><div class="unit-badge" id="badge25">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(26)"><div class="unit-num">26</div><div class="unit-title">Passado IV</div><div class="unit-desc">Lived, washed, arrived</div><div class="unit-badge" id="badge26">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(27)"><div class="unit-num">27</div><div class="unit-title">Passado V</div><div class="unit-desc">Preferred, cooked, sold</div><div class="unit-badge" id="badge27">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(28)"><div class="unit-num">28</div><div class="unit-title">Revisao de tempos</div><div class="unit-desc">Presente, passado e can</div><div class="unit-badge" id="badge28">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(29)"><div class="unit-num">29</div><div class="unit-title">Perguntas com did</div><div class="unit-desc">Did you go? What did you?</div><div class="unit-badge" id="badge29">Nao iniciado</div></div>
    <div class="unit-card" onclick="openUnit(30)"><div class="unit-num">30</div><div class="unit-title">Revisao geral W2</div><div class="unit-desc">Revisao completa do nivel</div><div class="unit-badge" id="badge30">Nao iniciado</div></div>
  </div>
</div>
<div id="unitContainer"></div>
`

