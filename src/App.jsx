import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SessionForm from './components/SessionForm'
import History from './components/History'
import Stats from './components/Stats'
import ThemeToggle from './components/ThemeToggle'
import DesignToggle from './components/DesignToggle'
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
    <div className="app-container">
      <aside className="app-nav">
        <div className="nav-header">
          <h1 className="logo">StudiaStics</h1>
          <div className="header-actions">
            <DesignToggle />
            <ThemeToggle />
            <button className="logout" onClick={() => supabase.auth.signOut()} title="Cerrar sesión">
              <span className="logout-icon">🚪</span>
            </button>
          </div>
        </div>

        <nav className="tabs">
          <button
            className={activeTab === 'registrar' ? 'active' : ''}
            onClick={() => setActiveTab('registrar')}
          >
            <span className="tab-icon">⏱️</span>
            <span className="tab-label">Registrar</span>
            {timerRunning && <span className="timer-dot">●</span>}
          </button>
          <button
            className={activeTab === 'historial' ? 'active' : ''}
            onClick={() => setActiveTab('historial')}
          >
            <span className="tab-icon">📅</span>
            <span className="tab-label">Historial</span>
          </button>
          <button
            className={activeTab === 'estadisticas' ? 'active' : ''}
            onClick={() => setActiveTab('estadisticas')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Estadísticas</span>
          </button>
        </nav>
      </aside>

      <main className="app-main">
        <div className="main-content">
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
        </div>
      </main>
    </div>
  )
}

export default App
