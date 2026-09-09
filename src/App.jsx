import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SessionForm from './components/SessionForm'
import History from './components/History'
import Stats from './components/Stats'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('registrar')
  const [refreshKey, setRefreshKey] = useState(0)

  // Timer state lifted here so it persists when switching tabs
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Keep the timer ticking even when SessionForm is unmounted
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerRunning])

  if (!session) return <Auth />

  return (
    <div className="app">
      <header>
        <h1>StudiaStics</h1>
        <button className="logout" onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'registrar' ? 'active' : ''} onClick={() => setTab('registrar')}>
          Registrar{timerRunning && tab !== 'registrar' && <span className="timer-dot">●</span>}
        </button>
        <button className={tab === 'historial' ? 'active' : ''} onClick={() => setTab('historial')}>
          Historial
        </button>
        <button className={tab === 'estadisticas' ? 'active' : ''} onClick={() => setTab('estadisticas')}>
          Estadísticas
        </button>
      </nav>

      <main>
        {tab === 'registrar' ? (
          <SessionForm
            userId={session.user.id}
            onSaved={() => setRefreshKey((k) => k + 1)}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
          />
        ) : tab === 'historial' ? (
          <History userId={session.user.id} refreshKey={refreshKey} />
        ) : (
          <Stats userId={session.user.id} refreshKey={refreshKey} />
        )}
      </main>
    </div>
  )
}
