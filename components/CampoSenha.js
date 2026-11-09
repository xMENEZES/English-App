import { useState } from 'react'

// Campo de senha com botao "mostrar/ocultar" para o usuario conferir o que digitou.
export default function CampoSenha({ style, ...props }) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        {...props}
        type={visivel ? 'text' : 'password'}
        autoComplete={props.autoComplete || 'off'}
        required
        style={{ ...style, paddingRight: '46px' }}
      />
      <button
        type="button"
        onClick={() => setVisivel(v => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem', lineHeight: 1, padding: '6px', color: '#555' }}
      >
        {visivel ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
