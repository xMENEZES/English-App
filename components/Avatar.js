import { useEffect, useState } from 'react'

const cores = ['#1565c0', '#00838f', '#6a1b9a', '#ad1457', '#ef6c00', '#2e7d32', '#4527a0', '#c62828']

// Foto redonda; sem foto (ou se falhar), mostra as iniciais sobre uma cor fixa por nome.
export default function Avatar({ foto, nome, tamanho = 36, style }) {
  const [erro, setErro] = useState(false)
  useEffect(() => { setErro(false) }, [foto])

  const base = { width: tamanho, height: tamanho, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }
  const limpo = String(nome || '?').trim()
  if (foto && !erro) {
    return <img src={foto} alt="" width={tamanho} height={tamanho} loading="lazy" referrerPolicy="no-referrer"
      onError={() => setErro(true)} style={{ ...base, objectFit: 'cover', background: '#e3f2fd' }} />
  }
  let h = 0
  for (const c of limpo) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const iniciais = limpo.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  return (
    <span aria-hidden="true" style={{ ...base, background: cores[h % cores.length], color: '#fff', fontWeight: 700, fontSize: Math.round(tamanho * 0.4) }}>
      {iniciais}
    </span>
  )
}
