import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="auth-card">
      <h1>Registro de estudio</h1>

      <div className="mode-switch">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Iniciar sesión
        </button>
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
          Registrarme
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
