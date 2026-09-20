import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ThemeToggle from './ThemeToggle'
import DesignToggle from './DesignToggle'
import { useToast } from './Toast'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const toast = useToast()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)


    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) toast.error(error.message)
      else toast.success('¡Cuenta creada! Ya puedes iniciar sesión.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast.error(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-floating-toggle">
        <DesignToggle />
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
            }}
          >
            {isSignUp ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </p>
      </div>
    </div>
  )
}
