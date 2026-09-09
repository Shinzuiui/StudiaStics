import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {missingEnv ? (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2>Falta configuración</h2>
        <p>
          No encuentro <code>VITE_SUPABASE_URL</code> y/o <code>VITE_SUPABASE_ANON_KEY</code>.
          Revisa tu archivo <code>.env</code> local, o las variables de entorno del proyecto en Vercel.
        </p>
      </div>
    ) : (
      <App />
    )}
  </React.StrictMode>,
)
