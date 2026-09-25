import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { getLocalDate } from './utils'
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
  const [currentRamoId, setCurrentRamoId] = useState('')
  const [currentRamoName, setCurrentRamoName] = useState('')
  const [recoveredSession, setRecoveredSession] = useState(null)

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

  // Detección de sesión interrumpida al cargar la aplicación (por pantallazo azul, corte de luz o cierre)
  useEffect(() => {
    if (!session?.user?.id) return
    const key = `studiastics_active_timer_${session.user.id}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Detectar si hay al menos 5 segundos acumulados pendientes de guardar
        if (parsed && typeof parsed.seconds === 'number' && parsed.seconds >= 5) {
          setRecoveredSession(parsed)
        }
      }
    } catch (e) {
      console.warn('Error al leer respaldo de sesión previa:', e)
    }
  }, [session])

  // Rastrear si el usuario empezó a correr el timer en la sesión actual para no borrar nada al cargar
  const timerStartedRef = useRef(false)

  // Auto-respaldo continuo en localStorage mientras el cronómetro corre
  useEffect(() => {
    if (!session?.user?.id) return
    const key = `studiastics_active_timer_${session.user.id}`

    if (timerSeconds > 0) {
      timerStartedRef.current = true
      localStorage.setItem(key, JSON.stringify({
        seconds: timerSeconds,
        ramoId: currentRamoId,
        ramoNombre: currentRamoName,
        timestamp: Date.now(),
      }))
    } else if (timerStartedRef.current && timerSeconds === 0 && !timerRunning) {
      // El temporizador estuvo activo en esta sesión y fue reiniciado/guardado
      timerStartedRef.current = false
      localStorage.removeItem(key)
    }
  }, [timerSeconds, timerRunning, currentRamoId, currentRamoName, session])

  // Referencias para que beforeunload siempre tenga el valor actual sin recrear el listener cada segundo
  const timerRunningRef = useRef(timerRunning)
  const pomoRunningRef = useRef(pomoRunning)
  const timerSecondsRef = useRef(timerSeconds)
  const currentRamoIdRef = useRef(currentRamoId)
  const currentRamoNameRef = useRef(currentRamoName)
  const sessionRef = useRef(session)

  useEffect(() => { timerRunningRef.current = timerRunning }, [timerRunning])
  useEffect(() => { pomoRunningRef.current = pomoRunning }, [pomoRunning])
  useEffect(() => { timerSecondsRef.current = timerSeconds }, [timerSeconds])
  useEffect(() => { currentRamoIdRef.current = currentRamoId }, [currentRamoId])
  useEffect(() => { currentRamoNameRef.current = currentRamoName }, [currentRamoName])
  useEffect(() => { sessionRef.current = session }, [session])

  // Advertencia antes de cerrar o recargar si el tiempo está corriendo, y sincronización a localStorage
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isRunning = timerRunningRef.current || pomoRunningRef.current
      const seconds = timerSecondsRef.current
      const currentSession = sessionRef.current

      // Guardar el tiempo actual en localStorage antes de que la pestaña se cierre
      if (currentSession?.user?.id && seconds > 0) {
        const key = `studiastics_active_timer_${currentSession.user.id}`
        localStorage.setItem(key, JSON.stringify({
          seconds: seconds,
          ramoId: currentRamoIdRef.current,
          ramoNombre: currentRamoNameRef.current,
          timestamp: Date.now(),
        }))
      }

      // Si el tiempo está en play (libre o pomodoro), mostrar la advertencia nativa del navegador
      if (isRunning) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  if (!session) {
    return <Auth />
  }

  const userId = session.user.id

  const handleSaved = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Guardar la sesión recuperada directamente en Supabase
  const handleSaveRecoveredSession = async () => {
    if (!recoveredSession || !userId) return
    const durationMinutes = Math.max(1, Math.round(recoveredSession.seconds / 60))
    let targetRamoId = recoveredSession.ramoId

    if (!targetRamoId) {
      const { data } = await supabase.from('ramos').select('id').eq('user_id', userId).limit(1)
      if (data && data.length > 0) targetRamoId = data[0].id
    }

    const { error } = await supabase.from('sesiones').insert({
      ramo_id: targetRamoId,
      user_id: userId,
      fecha: getLocalDate(),
      duracion_minutos: durationMinutes,
      metodo: 'timer',
    })

    if (error) {
      toast.error('Error al guardar sesión recuperada: ' + error.message)
    } else {
      toast.success(`¡Sesión de ${durationMinutes} min recuperada y guardada con éxito!`)
      localStorage.removeItem(`studiastics_active_timer_${userId}`)
      setRecoveredSession(null)
      setRefreshKey((prev) => prev + 1)
    }
  }

  // Cargar el tiempo recuperado en el cronómetro para continuar estudiando
  const handleResumeRecoveredSession = () => {
    if (!recoveredSession) return
    setTimerSeconds(recoveredSession.seconds)
    if (recoveredSession.ramoId) {
      setCurrentRamoId(recoveredSession.ramoId)
      if (recoveredSession.ramoNombre) setCurrentRamoName(recoveredSession.ramoNombre)
    }
    setActiveTab('registrar')
    const timeLabel = recoveredSession.seconds >= 60
      ? `${Math.max(1, Math.round(recoveredSession.seconds / 60))} min`
      : `${recoveredSession.seconds} seg`
    toast.info(`Tiempo de ${timeLabel} cargado en el cronómetro. ¡Puedes continuar estudiando!`)
    setRecoveredSession(null)
  }

  // Descartar la sesión recuperada
  const handleDismissRecoveredSession = () => {
    if (userId) {
      localStorage.removeItem(`studiastics_active_timer_${userId}`)
    }
    setRecoveredSession(null)
    toast.info('Sesión anterior descartada.')
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
          {recoveredSession && (
            <div className="recovered-session-banner">
              <div className="recovered-session-content">
                <span className="recovered-icon">🛡️</span>
                <div className="recovered-text">
                  <strong>Sesión de estudio recuperada</strong>
                  <span>
                    Detectamos <strong>{recoveredSession.seconds >= 60 ? `${Math.max(1, Math.round(recoveredSession.seconds / 60))} min` : `${recoveredSession.seconds} seg`}</strong> pendientes de{' '}
                    <strong>{recoveredSession.ramoNombre || 'estudio'}</strong> que no se alcanzaron a guardar por cierre o reinicio.
                  </span>
                </div>
              </div>
              <div className="recovered-actions">
                <button className="btn-recover-save" onClick={handleSaveRecoveredSession}>
                  💾 Guardar
                </button>
                <button className="btn-recover-resume" onClick={handleResumeRecoveredSession}>
                  ⏱️ Continuar
                </button>
                <button
                  className="btn-recover-dismiss"
                  onClick={handleDismissRecoveredSession}
                  title="Descartar sesión"
                  aria-label="Descartar sesión"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {activeTab === 'registrar' && (
            <SessionForm
              userId={userId}
              onSaved={handleSaved}
              timerSeconds={timerSeconds}
              setTimerSeconds={setTimerSeconds}
              timerRunning={timerRunning}
              setTimerRunning={setTimerRunning}
              currentRamoId={currentRamoId}
              setCurrentRamoId={setCurrentRamoId}
              currentRamoName={currentRamoName}
              setCurrentRamoName={setCurrentRamoName}
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
