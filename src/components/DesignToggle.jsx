import { useEffect, useState } from 'react'

export default function DesignToggle() {
  const [glass, setGlass] = useState(() => {
    const stored = localStorage.getItem('studiastics-design')
    if (stored) return stored === 'glass'
    return false // Default to minimal initially, or true if we want glass by default
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-design', glass ? 'glass' : 'minimal')
    localStorage.setItem('studiastics-design', glass ? 'glass' : 'minimal')
  }, [glass])

  return (
    <button
      className="theme-toggle design-toggle"
      onClick={() => setGlass((g) => !g)}
      aria-label={glass ? 'Cambiar a diseño Minimalista' : 'Cambiar a diseño Glassmorfismo'}
      title={glass ? 'Diseño Minimalista' : 'Diseño Glassmorfismo'}
    >
      {glass ? '✨' : '🔮'}
    </button>
  )
}
