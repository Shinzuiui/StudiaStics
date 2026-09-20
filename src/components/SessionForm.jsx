import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate } from '../utils'
import { useToast } from './Toast'
import { unlockAudio, requestNotificationPermission } from '../notifications'

const COLORS = ['#7EB6FF', '#C4A1E0', '#34C759', '#FF9F43', '#E5484D', '#3A6EA5', '#8B5CF6', '#EC4899']

export default function SessionForm({ 
  userId, onSaved, 
  timerSeconds, setTimerSeconds, timerRunning, setTimerRunning,
  currentRamoId, setCurrentRamoId, currentRamoName, setCurrentRamoName,
  pomoPhase, setPomoPhase, pomoRunning, setPomoRunning, pomoConfig, setPomoConfig, pomoSecondsLeft, setPomoSecondsLeft 
}) {
  const [ramos, setRamos] = useState([])
  const [ramoId, setRamoId] = useState(currentRamoId || '')
  const [newRamo, setNewRamo] = useState('')
  const [mode, setMode] = useState('timer') // 'timer' | 'pomodoro' | 'manual'
  const [manualMinutes, setManualMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  // Sincronizar ramoId si cambia desde afuera (ej: al recuperar sesión previa)
  useEffect(() => {
    if (currentRamoId && currentRamoId !== ramoId) {
      setRamoId(currentRamoId)
    }
  }, [currentRamoId])

  // Pomodoro Helpers
  const pomoMaxSeconds = pomoPhase === 'study' ? pomoConfig.study * 60 : pomoConfig.break * 60
  const pomoProgress = pomoMaxSeconds > 0 ? ((pomoMaxSeconds - pomoSecondsLeft) / pomoMaxSeconds) * 100 : 0
  const strokeDasharray = 283 // 2 * pi * r (approx for r=45)
  const strokeDashoffset = strokeDasharray - (strokeDasharray * pomoProgress) / 100

  const handleStartTimer = () => {
    unlockAudio()
    setTimerRunning(true)
  }

  const handleStartPomo = () => {
    unlockAudio()
    requestNotificationPermission()
    setPomoRunning(true)
  }

  useEffect(() => {
    loadRamos()
  }, [])

  async function loadRamos() {
    const { data, error } = await supabase.from('ramos').select('*').order('nombre')
    if (error) {
      toast.error('No se pudieron cargar tus ramos: ' + error.message)
    } else if (data) {
      setRamos(data)
      if (data.length) {
        const found = currentRamoId ? data.find(r => r.id === currentRamoId) : null
        const active = found || data[0]
        setRamoId(active.id)
        setCurrentRamoId?.(active.id)
        setCurrentRamoName?.(active.nombre)
      }
    }
  }

  async function addRamo(e) {
    e.preventDefault()
    if (!newRamo.trim()) return

    const color = COLORS[ramos.length % COLORS.length]
    const { data, error } = await supabase
      .from('ramos')
      .insert({ nombre: newRamo.trim(), color, user_id: userId })
      .select()
      .single()
    if (error) {
      toast.error('No se pudo agregar el ramo: ' + error.message)
    } else if (data) {
      setRamos((prev) => [...prev, data])
      setRamoId(data.id)
      setCurrentRamoId?.(data.id)
      setCurrentRamoName?.(data.nombre)
      setNewRamo('')
    }
  }

  async function deleteRamo() {
    if (!ramoId) return
    const ramo = ramos.find((r) => r.id === ramoId)
    if (!ramo) return

    // Count associated sessions
    const { count } = await supabase
      .from('sesiones')
      .select('*', { count: 'exact', head: true })
      .eq('ramo_id', ramoId)

    const msg =
      count > 0
        ? `¿Eliminar "${ramo.nombre}" y sus ${count} sesiones? No se puede deshacer.`
        : `¿Eliminar "${ramo.nombre}"? No se puede deshacer.`

    if (!window.confirm(msg)) return

    // Delete associated sessions first (foreign key constraint)
    if (count > 0) {
      const { error: sessErr } = await supabase.from('sesiones').delete().eq('ramo_id', ramoId)
      if (sessErr) {
        toast.error('Error al eliminar sesiones: ' + sessErr.message)
        return
      }
    }

    // Then delete the ramo
    const { error: ramoErr } = await supabase.from('ramos').delete().eq('id', ramoId)
    if (ramoErr) {
      toast.error('Error al eliminar ramo: ' + ramoErr.message)
    } else {
      const updated = ramos.filter((r) => r.id !== ramoId)
      setRamos(updated)
      setRamoId(updated.length ? updated[0].id : '')
      toast.success(`"${ramo.nombre}" eliminado.`)
      onSaved?.()
    }
  }

  function formatTime(total) {
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  async function saveSession(durationMinutes, metodo) {
    if (!ramoId) {
      toast.warn('Primero agrega o elige un ramo.')
      return
    }
    if (!durationMinutes || durationMinutes <= 0) {
      toast.warn('La duración debe ser mayor a 0.')
      return
    }
    setSaving(true)

    const durationRounded = Math.max(1, Math.round(durationMinutes))
    // Validar método para la base de datos (solo admite 'timer' o 'manual')
    const dbMetodo = metodo === 'pomodoro' ? 'timer' : metodo;

    const { error } = await supabase.from('sesiones').insert({
      ramo_id: ramoId,
      user_id: userId,
      fecha: getLocalDate(),
      duracion_minutos: durationRounded,
      metodo: dbMetodo,
    })
    setSaving(false)
    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Sesión guardada.')
      setManualMinutes('')
      onSaved?.()

      if (metodo === 'timer') {
        setTimerSeconds(0)
        setTimerRunning(false)
        if (userId) {
          localStorage.removeItem(`studiastics_active_timer_${userId}`)
        }
      } else if (metodo === 'pomodoro') {
        // Al guardar el estudio del pomodoro, pasar a descanso automáticamente
        setPomoPhase('break')
        setPomoSecondsLeft(pomoConfig.break * 60)
      }
    }
  }

  function handleSkipBreak() {
    setPomoPhase('study')
    setPomoSecondsLeft(pomoConfig.study * 60)
  }

  function handleResetPomo() {
    setPomoRunning(false)
    setPomoPhase('study')
    setPomoSecondsLeft(pomoConfig.study * 60)

  }

  function handleSavePomodoro() {
    const totalSeconds = pomoConfig.study * 60
    const studiedSeconds = totalSeconds - pomoSecondsLeft
    // Si no ha pasado ni 1 minuto pero quieren guardar, se guarda mínimo 1 minuto.
    const durationMinutes = Math.max(1, Math.round(studiedSeconds / 60))
    saveSession(durationMinutes, 'pomodoro')
  }

  const isPomoStarted = pomoSecondsLeft < pomoMaxSeconds;

  return (
    <div className="card">
      <div className="mode-switch">
        <button className={mode === 'timer' ? 'active' : ''} onClick={() => setMode('timer')}>
          Libre
        </button>
        <button className={mode === 'pomodoro' ? 'active' : ''} onClick={() => setMode('pomodoro')}>
          Pomodoro
        </button>
        <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
          Manual
        </button>
      </div>

      <div className="ramo-selector">
        <label className="field">
          Ramo
          <select
            value={ramoId}
            onChange={(e) => {
              const newId = e.target.value
              setRamoId(newId)
              setCurrentRamoId?.(newId)
              const selected = ramos.find((r) => r.id === newId)
              if (selected) setCurrentRamoName?.(selected.nombre)
            }}
          >
            {ramos.length === 0 && <option value="">Sin ramos todavía</option>}
            {ramos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        {ramoId && (
          <button
            className="delete-ramo-btn"
            onClick={deleteRamo}
            title="Eliminar ramo seleccionado"
            aria-label="Eliminar ramo"
          >
            ✕
          </button>
        )}
      </div>

      <form className="add-ramo" onSubmit={addRamo}>
        <input
          type="text"
          placeholder="Nuevo ramo (ej: Interfaces Gráficas)"
          value={newRamo}
          onChange={(e) => setNewRamo(e.target.value)}
        />
        <button type="submit">Agregar</button>
      </form>

      {mode === 'timer' && (
        <div className="timer-block">
          <div className="timer-display">{formatTime(timerSeconds)}</div>
          <div className="timer-actions">
            {!timerRunning ? (
              <button onClick={handleStartTimer}>Iniciar</button>
            ) : (
              <button onClick={() => setTimerRunning(false)}>Pausar</button>
            )}
            <button
              disabled={saving || timerSeconds === 0}
              onClick={() => saveSession(timerSeconds / 60, 'timer')}
            >
              Guardar sesión
            </button>
          </div>
        </div>
      )}

      {mode === 'pomodoro' && (
        <div className="timer-block pomo-block">
          <div className="pomo-config">
            <label className="field">
              Estudio (min)
              <input type="number" value={pomoConfig.study} min="1" step="1" disabled={pomoRunning || isPomoStarted} onChange={(e) => {
                let val = parseInt(e.target.value, 10)
                if (isNaN(val) || val < 1) val = 1
                setPomoConfig(c => ({...c, study: val}))
                if (pomoPhase === 'study' && !pomoRunning) setPomoSecondsLeft(val * 60)
              }} />
            </label>
            <label className="field">
              Descanso (min)
              <input type="number" value={pomoConfig.break} min="1" step="1" disabled={pomoRunning || isPomoStarted} onChange={(e) => {
                let val = parseInt(e.target.value, 10)
                if (isNaN(val) || val < 1) val = 1
                setPomoConfig(c => ({...c, break: val}))
                if (pomoPhase === 'break' && !pomoRunning) setPomoSecondsLeft(val * 60)
              }} />
            </label>
          </div>

          <div className="pomo-progress-wrapper">
            <svg className="pomo-ring-svg" viewBox="0 0 100 100">
              <circle className="pomo-ring-bg" cx="50" cy="50" r="45"></circle>
              <circle className="pomo-ring-progress" cx="50" cy="50" r="45" style={{ strokeDasharray, strokeDashoffset, stroke: pomoPhase === 'study' ? 'var(--accent-blue)' : 'var(--success)' }}></circle>
            </svg>
            <div className={`timer-display ${pomoPhase}`}>{formatTime(pomoSecondsLeft)}</div>
          </div>
          
          <div className="pomo-linear-bar">
            <div style={{ width: `${pomoProgress}%`, background: pomoPhase === 'study' ? 'var(--accent-blue)' : 'var(--success)' }}></div>
          </div>
          
          <div className="pomo-status">
            {pomoPhase === 'study' ? 'Fase: Estudio 🧠' : 'Fase: Descanso ☕'}
          </div>

          <div className="timer-actions">
            {pomoSecondsLeft > 0 ? (
              !pomoRunning ? (
                <button onClick={handleStartPomo}>Iniciar</button>
              ) : (
                <button onClick={() => setPomoRunning(false)}>Pausar</button>
              )
            ) : null}

            {isPomoStarted && !pomoRunning && pomoSecondsLeft > 0 && (
               <button onClick={handleResetPomo} className="goal-cancel-btn">Reiniciar</button>
            )}

            {pomoPhase === 'study' ? (
              <button
                disabled={saving || !isPomoStarted}
                onClick={handleSavePomodoro}
                title="Puedes guardar en cualquier momento el tiempo que lleves estudiado"
              >
                Guardar Pomodoro
              </button>
            ) : (
              <button onClick={handleSkipBreak} className="primary-btn">
                Volver a Estudiar
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="manual-block">
          <label className="field">
            Minutos estudiados
            <input
              type="number"
              min="1"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
            />
          </label>
          <button
            disabled={saving}
            onClick={() => saveSession(Number(manualMinutes), 'manual')}
          >
            Guardar sesión
          </button>
        </div>
      )}


    </div>
  )
}
