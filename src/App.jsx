import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SessionForm from './components/SessionForm'
import History from './components/History'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('registrar')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />

  return (
    <div className="app">
      <header>
        <h1>Registro de estudio</h1>
        <button className="logout" onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'registrar' ? 'active' : ''} onClick={() => setTab('registrar')}>
          Registrar
        </button>
        <button className={tab === 'historial' ? 'active' : ''} onClick={() => setTab('historial')}>
          Historial
        </button>
      </nav>

      <main>
        {tab === 'registrar' ? (
          <SessionForm userId={session.user.id} onSaved={() => setRefreshKey((k) => k + 1)} />
        ) : (
          <History userId={session.user.id} refreshKey={refreshKey} />
        )}
      </main>
    </div>
  )
}
