import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ThemeToggle from './ThemeToggle'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setErrorMsg('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setErrorMsg(error.message)
      else setMessage('¡Cuenta creada! Ya puedes iniciar sesión.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErrorMsg(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-floating-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <h1>StudiaStics</h1>
        <p className="auth-subtitle">Registra y visualiza tu progreso</p>
        
        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Correo electrónico"
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
          />
          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        {errorMsg && <p className="error" style={{marginTop: '16px'}}>{errorMsg}</p>}
        {message && <p className="message" style={{marginTop: '16px'}}>{message}</p>}

        <p style={{ marginTop: '24px', fontSize: '0.9rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
              setErrorMsg('')
            }}
          >
            {isSignUp ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </p>
      </div>
    </div>
  )
}
