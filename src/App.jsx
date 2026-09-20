import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import SessionForm from './components/SessionForm'
import History from './components/History'
import Stats from './components/Stats'
import ThemeToggle from './components/ThemeToggle'
import DesignToggle from './components/DesignToggle'
import { useToast } from './components/Toast'
import { sendSystemNotification, playChime, playBreakEndChime } from './notifications'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [activeTab, setActiveTab] = useState('registrar') // 'registrar' | 'historial' | 'estadisticas'
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()

  // Timer global state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  // Pomodoro global state
  const [pomoPhase, setPomoPhase] = useState('study') // 'study' | 'break'
  const [pomoRunning, setPomoRunning] = useState(false)
  const [pomoConfig, setPomoConfig] = useState({ study: 25, break: 5 })
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(25 * 60)
  const pomoWasRunningRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Rastrear si el pomodoro estuvo corriendo para evitar disparos en falso al resetear
  useEffect(() => {
    if (pomoRunning) {
      pomoWasRunningRef.current = true
    }
  }, [pomoRunning])

  useEffect(() => {
    let interval = null
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else if (pomoRunning) {
      interval = setInterval(() => {
        setPomoSecondsLeft((prev) => {
          if (prev <= 1) {
            setPomoRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, pomoRunning])

  // Disparo global de alarma sonora + notificación de sistema + toast cuando el pomodoro llega a 0
  useEffect(() => {
    if (pomoWasRunningRef.current && pomoSecondsLeft === 0 && !pomoRunning) {
      pomoWasRunningRef.current = false
      if (pomoPhase === 'study') {
        playChime()
        toast.success('¡Pomodoro completado! Guarda tu sesión para iniciar el descanso.')
        sendSystemNotification(
          '🧠 ¡Pomodoro completado!',
          `${pomoConfig.study} minutos de estudio terminados. ¡Guarda tu sesión!`
        )
      } else {
        playBreakEndChime()
        toast.info('¡Descanso terminado! Volvamos al estudio.')
        sendSystemNotification(
          '☕ ¡Descanso terminado!',
          'Es hora de volver al estudio.'
        )
      }
    }
  }, [pomoSecondsLeft, pomoRunning, pomoPhase, pomoConfig, toast])

  // Actualizar el título de la pestaña para ver el tiempo desde fuera (otra pestaña o ventana)
  useEffect(() => {
    if (pomoRunning) {
      const mins = Math.floor(pomoSecondsLeft / 60)
      const secs = pomoSecondsLeft % 60
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      const icon = pomoPhase === 'study' ? '🧠' : '☕'
      document.title = `(${timeStr}) ${icon} StudiaStics`
    } else if (timerRunning) {
      const mins = Math.floor(timerSeconds / 60)
      const secs = timerSeconds % 60
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      document.title = `(${timeStr}) ⏱️ StudiaStics`
    } else if (pomoSecondsLeft === 0 && pomoWasRunningRef.current) {
      document.title = '🔔 ¡Tiempo terminado! - StudiaStics'
    } else {
      document.title = 'StudiaStics'
    }
  }, [pomoRunning, pomoSecondsLeft, pomoPhase, timerRunning, timerSeconds])

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
              pomoPhase={pomoPhase}
              setPomoPhase={setPomoPhase}
              pomoRunning={pomoRunning}
              setPomoRunning={setPomoRunning}
              pomoConfig={pomoConfig}
              setPomoConfig={setPomoConfig}
              pomoSecondsLeft={pomoSecondsLeft}
              setPomoSecondsLeft={setPomoSecondsLeft}
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
