import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="auth-card">
        <h2>Revisa tu correo</h2>
        <p>Te mandamos un link a <strong>{email}</strong> para entrar. Ábrelo desde este mismo dispositivo.</p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>Registro de estudio</h1>
      <p>Ingresa tu correo y te mandamos un link para entrar, sin contraseña.</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Enviar link</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
