import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate } from '../utils'

const COLORS = ['#7EB6FF', '#C4A1E0', '#34C759', '#FF9F43', '#E5484D', '#3A6EA5', '#8B5CF6', '#EC4899']

export default function SessionForm({ userId, onSaved, timerSeconds, setTimerSeconds, timerRunning, setTimerRunning }) {
  const [ramos, setRamos] = useState([])
  const [ramoId, setRamoId] = useState('')
  const [newRamo, setNewRamo] = useState('')
  const [mode, setMode] = useState('timer') // 'timer' | 'manual'
  const [manualMinutes, setManualMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadRamos()
  }, [])

  async function loadRamos() {
    const { data, error } = await supabase.from('ramos').select('*').order('nombre')
    if (error) {
      setMessage('No se pudieron cargar tus ramos: ' + error.message)
    } else if (data) {
      setRamos(data)
      if (data.length && !ramoId) setRamoId(data[0].id)
    }
  }

  async function addRamo(e) {
    e.preventDefault()
    if (!newRamo.trim()) return
    setMessage(null)
    const color = COLORS[ramos.length % COLORS.length]
    const { data, error } = await supabase
      .from('ramos')
      .insert({ nombre: newRamo.trim(), color, user_id: userId })
      .select()
      .single()
    if (error) {
      setMessage('No se pudo agregar el ramo: ' + error.message)
    } else if (data) {
      setRamos((prev) => [...prev, data])
      setRamoId(data.id)
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
    setMessage(null)

    // Delete associated sessions first (foreign key constraint)
    if (count > 0) {
      const { error: sessErr } = await supabase.from('sesiones').delete().eq('ramo_id', ramoId)
      if (sessErr) {
        setMessage('Error al eliminar sesiones: ' + sessErr.message)
        return
      }
    }

    // Then delete the ramo
    const { error: ramoErr } = await supabase.from('ramos').delete().eq('id', ramoId)
    if (ramoErr) {
      setMessage('Error al eliminar ramo: ' + ramoErr.message)
    } else {
      const updated = ramos.filter((r) => r.id !== ramoId)
      setRamos(updated)
      setRamoId(updated.length ? updated[0].id : '')
      setMessage(`"${ramo.nombre}" eliminado.`)
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
      setMessage('Primero agrega o elige un ramo.')
      return
    }
    if (!durationMinutes || durationMinutes <= 0) {
      setMessage('La duración debe ser mayor a 0.')
      return
    }
    setSaving(true)
    setMessage(null)
    const durationRounded = Math.max(1, Math.round(durationMinutes))
    const { error } = await supabase.from('sesiones').insert({
      ramo_id: ramoId,
      user_id: userId,
      fecha: getLocalDate(),
      duracion_minutos: durationRounded,
      metodo,
    })
    setSaving(false)
    if (error) {
      setMessage('Error al guardar: ' + error.message)
    } else {
      setMessage('Sesión guardada.')
      setTimerSeconds(0)
      setTimerRunning(false)
      setManualMinutes('')
      onSaved?.()
    }
  }

  return (
    <div className="card">
      <div className="mode-switch">
        <button className={mode === 'timer' ? 'active' : ''} onClick={() => setMode('timer')}>
          Cronómetro
        </button>
        <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>
          Manual
        </button>
      </div>

      <div className="ramo-selector">
        <label className="field">
          Ramo
          <select value={ramoId} onChange={(e) => setRamoId(e.target.value)}>
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

      {mode === 'timer' ? (
        <div className="timer-block">
          <div className="timer-display">{formatTime(timerSeconds)}</div>
          <div className="timer-actions">
            {!timerRunning ? (
              <button onClick={() => setTimerRunning(true)}>Iniciar</button>
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
      ) : (
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

      {message && <p className="message">{message}</p>}
    </div>
  )
}
