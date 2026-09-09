import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function History({ userId, refreshKey }) {
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    if (error) {
      setError(error.message)
    } else if (data) {
      setSesiones(data)
    }
    setLoading(false)
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
        return (
          <div key={fecha} className="day-block">
            <div className="day-header">
              <span>{fecha}</span>
              <span>{Math.floor(totalMin / 60)}h {totalMin % 60}m</span>
            </div>
            <ul>
              {items.map((s) => (
                <li key={s.id}>
                  <span className="dot" style={{ background: s.ramos?.color || '#999' }} />
                  <span className="ramo-name">{s.ramos?.nombre || 'Sin ramo'}</span>
                  <span className="duracion">{s.duracion_minutos} min</span>
                  <span className="metodo">{s.metodo}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
