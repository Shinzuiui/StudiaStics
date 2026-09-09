import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SessionForm from './components/SessionForm'
import History from './components/History'
import Stats from './components/Stats'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('registrar') // 'registrar' | 'historial' | 'estadisticas'
  const [refreshKey, setRefreshKey] = useState(0)

  // Timer global state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else if (!timerRunning && timerSeconds !== 0) {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [timerRunning, timerSeconds])

  if (!session) {
    return <Auth />
  }

  const userId = session.user.id

  const handleSaved = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="app">
      <header>
        <h1 className="logo">StudiaStics</h1>
        <div className="header-actions">
          <ThemeToggle />
          <button className="logout" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'registrar' ? 'active' : ''}
          onClick={() => setActiveTab('registrar')}
        >
          Registrar {timerRunning && <span className="timer-dot">●</span>}
        </button>
        <button
          className={activeTab === 'historial' ? 'active' : ''}
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
        <button
          className={activeTab === 'estadisticas' ? 'active' : ''}
          onClick={() => setActiveTab('estadisticas')}
        >
          Estadísticas
        </button>
      </nav>

      <main>
        {activeTab === 'registrar' && (
          <SessionForm
            userId={userId}
            onSaved={handleSaved}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
          />
        )}
        {activeTab === 'historial' && (
          <History userId={userId} refreshKey={refreshKey} />
        )}
        {activeTab === 'estadisticas' && (
          <Stats userId={userId} refreshKey={refreshKey} />
        )}
      </main>
    </div>
  )
}

export default App
