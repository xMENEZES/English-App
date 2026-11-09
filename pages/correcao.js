import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Head from 'next/head'

export default function Correcao() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [alunos, setAlunos] = useState([])
  const [alunoSel, setAlunoSel] = useState(null)
  const [resultados, setResultados] = useState([])
  const [unitSel, setUnitSel] = useState(1)
  const [loadingAluno, setLoadingAluno] = useState(false)
  const router = useRouter()

  const UNIDADES = [
    'I drink/eat','I speak/study','I work/play','I like/sleep','I want/go','I have/understand','I need/prefer',
    'I buy/sell','I help/know','I read/write','I open/close','I live/start','I come/stay','I cook/visit',
    'I do/make','I finish/try','He/She (presente)','He/She (mais verbos)','We/They',
    'Passado regular','Passado irregular I','Passado irregular II','Can (poder)','Would (condicional)',
    'Passado III','Passado IV','Passado V','Revisao de tempos','Perguntas com did','Revisao geral W2'
  ]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      const role = session.user.app_metadata?.role
      if (role !== 'teacher') { router.push('/exercicios'); return }
      setSessao(session)
      carregarAlunos()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.push('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Lista vem da API (fonte de verdade: usuarios vinculados a este professor),
  // assim aluno sem linha em profiles tambem aparece (usa o e-mail como nome).
  const carregarAlunos = async () => {
    const { data: sess } = await supabase.auth.getSession()
    const token = sess?.session?.access_token
    const r = await fetch('/api/admin/list-users', { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) {
      const d = await r.json()
      const lista = (d.students || []).map(a => ({ ...a, full_name: a.full_name || a.email }))
      lista.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' }))
      setAlunos(lista)
    }
    setCarregando(false)
  }

  const selecionarAluno = async (aluno) => {
    setAlunoSel(aluno)
    setLoadingAluno(true)
    const { data, error } = await supabase
      .from('exercise_results')
      .select('*')
      .eq('user_id', aluno.id)
      .order('unit_id')
      .order('question_idx')
      .order('answered_at', { ascending: false })
    if (error) {
      console.error('[WE] Erro ao buscar resultados:', error.message, error.code, error.details)
    } else {
      // Manter apenas a resposta mais recente por questão
      const seen = {}
      const dedup = []
      for (const r of (data || [])) {
        const key = r.unit_id + '_' + r.question_idx
        if (!seen[key]) { seen[key] = true; dedup.push(r) }
      }
      setResultados(dedup)
    }
    setLoadingAluno(false)
  }

  const sair = async () => { await supabase.auth.signOut(); router.push('/') }

  const getUnitResults = (uid) => resultados.filter(r => r.unit_id === uid)
  const totalAcertos = (rs) => rs.filter(r => r.is_correct).length

  const statGeral = () => {
    const total = resultados.length
    const acertos = resultados.filter(r => r.is_correct).length
    return { total, acertos, pct: total ? Math.round(acertos/total*100) : 0 }
  }

  if (carregando) return <div style={s.loading}>Carregando...</div>

  return (
    <>
      <Head><title>English Step By Step - Painel de Alunos</title></Head>
      <div style={s.header}>
        <span style={{fontWeight:700,fontSize:'1rem'}}>👥 Painel de Alunos</span>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          <button onClick={() => router.push('/turmas')} style={s.btnSecundario}>🏫 Turmas</button>
          <button onClick={() => router.push('/mensagens')} style={s.btnSecundario}>💬 Mensagens</button>
          <button onClick={() => router.push('/controle-acessos')} style={s.btnSecundario}>🔑 Controle de Acessos</button>
          <button onClick={() => router.push('/exercicios')} style={s.btnSecundario}>Ver Exercícios</button>
          <button onClick={sair} style={s.btnSair}>Sair</button>
        </div>
      </div>

      <div style={s.page}>
        {/* Seletor de aluno */}
        <div style={s.card}>
          <h2 style={s.secTitulo}>Selecionar Aluno</h2>
          {alunos.length === 0 ? (
            <p style={{color:'#888',fontSize:'.9rem'}}>Nenhum aluno cadastrado ainda.</p>
          ) : (
            <div style={s.alunosGrid}>
              {alunos.map(a => (
                <button key={a.id} onClick={() => selecionarAluno(a)}
                  style={{...s.alunoBtn, ...(alunoSel?.id===a.id ? s.alunoBtnAtivo : {})}}>
                  <span style={s.alunoIco}>👤</span>
                  <span style={s.alunoTextos}>
                    <span style={{fontWeight:alunoSel?.id===a.id?700:600}}>{a.full_name}</span>
                    {a.full_name !== a.email && <span style={s.alunoEmail}>{a.email}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resultados */}
        {alunoSel && (
          <div style={s.card}>
            {loadingAluno ? (
              <p style={{color:'#888',textAlign:'center',padding:'20px'}}>Carregando respostas...</p>
            ) : (
              <>
                {/* Cabeçalho do aluno */}
                <div style={s.alunoHeader}>
                  <div>
                    <h2 style={{...s.secTitulo,marginBottom:2}}>{alunoSel.full_name}</h2>
                    {resultados.length > 0 && (() => {
                      const g = statGeral()
                      return <p style={{color:'#555',fontSize:'.88rem'}}>
                        Total geral: <b style={{color:g.pct>=60?'#0d2157':'#c62828'}}>{g.acertos}/{g.total} ({g.pct}%)</b>
                      </p>
                    })()}
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <p style={{color:'#888',fontSize:'.9rem',padding:'12px 0'}}>
                    Este aluno ainda não respondeu nenhum exercício.
                  </p>
                ) : (
                  <>
                    {/* Abas de unidade */}
                    <div style={s.tabs}>
                      {UNIDADES.map((nome, i) => {
                        const uid = i + 1
                        const rs = getUnitResults(uid)
                        return (
                          <button key={uid} onClick={() => setUnitSel(uid)}
                            style={{...s.tab, ...(unitSel===uid?s.tabAtiva:{})}}>
                            <span>U{uid}</span>
                            {rs.length > 0 && (
                              <span style={{...s.tabBadge,
                                background: totalAcertos(rs)/rs.length>=0.6?'#e3f2fd':'#ffebee',
                                color: totalAcertos(rs)/rs.length>=0.6?'#0d2157':'#c62828'}}>
                                {totalAcertos(rs)}/{rs.length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Tabela de respostas */}
                    {(() => {
                      const rs = getUnitResults(unitSel)
                      if (rs.length === 0) return (
                        <p style={{color:'#888',fontSize:'.9rem',padding:'16px 0'}}>
                          Nenhuma resposta nesta unidade ainda.
                        </p>
                      )
                      return (
                        <div style={{overflowX:'auto'}}>
                          <div style={s.statBar}>
                            <span>Unidade {unitSel}: {UNIDADES[unitSel-1]}</span>
                            <span style={{fontWeight:700,color:totalAcertos(rs)/rs.length>=0.6?'#0d2157':'#c62828'}}>
                              {totalAcertos(rs)}/{rs.length} corretas ({Math.round(totalAcertos(rs)/rs.length*100)}%)
                            </span>
                          </div>
                          <table style={s.table}>
                            <thead>
                              <tr style={{background:'#0d2157',color:'#fff'}}>
                                <th style={s.th}>#</th>
                                <th style={s.th}>Pergunta</th>
                                <th style={s.th}>Resposta do Aluno</th>
                                <th style={s.th}>Resposta Correta</th>
                                <th style={{...s.th,textAlign:'center'}}>Resultado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rs.sort((a,b)=>a.question_idx-b.question_idx).map((r,i) => (
                                <tr key={r.id} style={{background:i%2===0?'#fff':'#e8f4fd'}}>
                                  <td style={s.td}>{r.question_idx+1}</td>
                                  <td style={{...s.td,maxWidth:'220px',wordBreak:'break-word'}}>{r.question}</td>
                                  <td style={{...s.td,color:r.is_correct?'#0d2157':'#c62828',fontWeight:600}}>
                                    {r.user_answer}
                                  </td>
                                  <td style={s.td}>{r.correct_answer}</td>
                                  <td style={{...s.td,textAlign:'center',fontSize:'1.2rem'}}>
                                    {r.is_correct ? '✅' : '❌'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const s = {
  loading: {display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'Segoe UI,sans-serif',color:'#0d2157'},
  header: {background:'linear-gradient(135deg,#0d2157,#1565c0)',color:'#fff',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.2)',flexWrap:'wrap',gap:'6px'},
  page: {maxWidth:'900px',margin:'0 auto',padding:'16px',overflowX:'hidden'},
  card: {background:'#fff',borderRadius:'14px',padding:'22px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.08)'},
  secTitulo: {fontSize:'1.1rem',fontWeight:700,color:'#0d2157',marginBottom:'14px'},
  alunosGrid: {display:'flex',flexDirection:'column',gap:'8px'},
  alunoBtn: {display:'flex',alignItems:'center',gap:'12px',width:'100%',textAlign:'left',padding:'10px 16px',border:'2px solid #e0e0e0',borderRadius:'10px',cursor:'pointer',background:'#fff',fontSize:'.92rem',color:'#333',transition:'.2s'},
  alunoBtnAtivo: {borderColor:'#1565c0',background:'#e3f2fd',color:'#0d2157'},
  alunoIco: {fontSize:'1.2rem'},
  alunoTextos: {display:'flex',flexDirection:'column',minWidth:0,overflowWrap:'anywhere'},
  alunoEmail: {fontSize:'.78rem',color:'#888',fontWeight:400},
  alunoHeader: {display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'},
  tabs: {display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'},
  tab: {padding:'6px 10px',border:'2px solid #e0e0e0',borderRadius:'8px',cursor:'pointer',background:'#fff',fontSize:'.82rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'4px',transition:'.2s',minWidth:'44px'},
  tabAtiva: {borderColor:'#1565c0',background:'#e3f2fd',fontWeight:700,color:'#0d2157'},
  tabBadge: {padding:'2px 7px',borderRadius:'20px',fontSize:'.75rem',fontWeight:700},
  statBar: {display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'#f5f5f5',borderRadius:'8px',marginBottom:'10px',fontSize:'.88rem',color:'#555'},
  table: {width:'100%',borderCollapse:'collapse',fontSize:'.88rem'},
  th: {padding:'10px 12px',textAlign:'left',fontWeight:600,fontSize:'.85rem'},
  td: {padding:'9px 12px',color:'#444',verticalAlign:'top'},
  btnSecundario: {background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.6)',color:'#fff',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'.78rem',fontWeight:600,whiteSpace:'nowrap'},
  btnSair: {background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.6)',color:'#fff',padding:'6px 12px',borderRadius:'8px',cursor:'pointer',fontSize:'.78rem',fontWeight:600,whiteSpace:'nowrap'},
}
