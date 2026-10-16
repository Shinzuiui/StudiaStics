import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import { formatMinutes } from '../utils'

export default function History({ userId, refreshKey }) {
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    loadSesiones()
  }, [refreshKey])

  async function loadSesiones() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('sesiones')
      .select('id, fecha, duracion_minutos, metodo, ramos ( nombre, color )')
      .order('fecha', { ascending: false })
      .limit(200)
    if (error) {
      setError(error.message)
    } else if (data) {
      setSesiones(data)
    }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta sesión? No se puede deshacer.')) return
    
    setDeletingId(id)
    const { error } = await supabase.from('sesiones').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
    } else {
      setSesiones((prev) => prev.filter((s) => s.id !== id))
    }
  }

  if (loading) return <p>Cargando historial…</p>
  if (error) {
    return (
      <div className="empty">
        <p>No se pudo cargar el historial: {error}</p>
        <button onClick={loadSesiones}>Reintentar</button>
      </div>
    )
  }
  if (sesiones.length === 0) return <p className="empty">Todavía no registras ninguna sesión.</p>

  const byDate = sesiones.reduce((acc, s) => {
    acc[s.fecha] = acc[s.fecha] || []
    acc[s.fecha].push(s)
    return acc
  }, {})

  return (
    <div className="history">

      {Object.entries(byDate).map(([fecha, items]) => {
        const totalMin = items.reduce((sum, s) => sum + s.duracion_minutos, 0)

        // Total acumulado por ramo en este día (ej: mañana + tarde del mismo ramo)
        const porRamo = Object.values(
          items.reduce((acc, s) => {
            const key = s.ramos?.nombre || 'Sin ramo'
            acc[key] = acc[key] || { nombre: key, color: s.ramos?.color || '#999', minutos: 0, count: 0 }
            acc[key].minutos += s.duracion_minutos
            acc[key].count += 1
            return acc
          }, {})
        ).sort((a, b) => b.minutos - a.minutos)

        return (
          <div key={fecha} className="day-block">
            <div className="day-header">
              <span>{fecha}</span>
              <span>{Math.floor(totalMin / 60)}h {totalMin % 60}m</span>
            </div>
            <div className="day-ramo-totals">
              {porRamo.map((r) => (
                <span key={r.nombre} className="day-ramo-chip" style={{ '--chip-color': r.color }}>
                  <span className="dot" style={{ background: r.color }} />
                  {r.nombre}
                  <strong>{formatMinutes(r.minutos)}</strong>
                  {r.count > 1 && <span className="day-ramo-count">×{r.count}</span>}
                </span>
              ))}
            </div>
            <ul>
              {items.map((s) => (
                <li key={s.id}>
                  <span className="dot" style={{ background: s.ramos?.color || '#999' }} />
                  <span className="ramo-name">{s.ramos?.nombre || 'Sin ramo'}</span>
                  <span className="duracion">{s.duracion_minutos} min</span>
                  <span className="metodo">{s.metodo}</span>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    aria-label="Eliminar sesión"
                  >
                    {deletingId === s.id ? '…' : '✕'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}