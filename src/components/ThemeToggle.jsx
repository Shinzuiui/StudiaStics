import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('studiastics-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const isDark = dark
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    // Force color-scheme to override mobile OS dark mode forcing
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    // Update the meta theme-color for the mobile status bar
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#0f172a' : '#ffffff')
    }
    localStorage.setItem('studiastics-theme', isDark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={dark ? 'Tema claro' : 'Tema oscuro'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
