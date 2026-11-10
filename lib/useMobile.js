import { useEffect, useState } from 'react'

// true quando a tela e estreita (celular). Atualiza ao girar/redimensionar.
export default function useMobile(max = 719) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const q = window.matchMedia(`(max-width:${max}px)`)
    const f = () => setMobile(q.matches)
    f()
    q.addEventListener('change', f)
    return () => q.removeEventListener('change', f)
  }, [max])
  return mobile
}
