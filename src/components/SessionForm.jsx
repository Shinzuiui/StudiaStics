import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const COLORS = ['#2F6F4F', '#C9A227', '#3A6EA5', '#A5443A', '#6E4A9E']

export default function SessionForm({ userId, onSaved }) {
  const [ramos, setRamos] = useState([])
  const [ramoId, setRamoId] = useState('')
  const [newRamo, setNewRamo] = useState('')
  const [mode, setMode] = useState('timer') // 'timer' | 'manual'
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [manualMinutes, setManualMinutes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    loadRamos()
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  async function loadRamos() {
    const { data, error } = await supabase.from('ramos').select('*').order('nombre')
    if (!error && data) {
      setRamos(data)
      if (data.length && !ramoId) setRamoId(data[0].id)
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
    if (!error && data) {
      setRamos((prev) => [...prev, data])
      setRamoId(data.id)
      setNewRamo('')
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
    const { error } = await supabase.from('sesiones').insert({
      ramo_id: ramoId,
      user_id: userId,
      fecha: new Date().toISOString().slice(0, 10),
      duracion_minutos: Math.round(durationMinutes),
      metodo,
    })
    setSaving(false)
    if (error) {
      setMessage('Error al guardar: ' + error.message)
    } else {
      setMessage('Sesión guardada.')
      setSeconds(0)
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
          <div className="timer-display">{formatTime(seconds)}</div>
          <div className="timer-actions">
            {!running ? (
              <button onClick={() => setRunning(true)}>Iniciar</button>
            ) : (
              <button onClick={() => setRunning(false)}>Pausar</button>
            )}
            <button
              disabled={saving || seconds === 0}
              onClick={() => saveSession(seconds / 60, 'timer')}
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
