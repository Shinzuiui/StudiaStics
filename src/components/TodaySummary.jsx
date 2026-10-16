import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate, formatMinutes } from '../utils'

/**
 * Resumen del día: tiempo total acumulado hoy y desglose por ramo.
 * Suma todas las sesiones guardadas hoy (mañana, tarde, noche...) y además
 * muestra en vivo el tiempo que está corriendo y aún no se guarda.
 */
export default function TodaySummary({ userId, refreshKey, liveSeconds = 0, liveRamoId = '', liveRamoName = '' }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('sesiones')
        .select('id, duracion_minutos, ramo_id, ramos ( nombre, color )')
        .eq('fecha', getLocalDate())
      if (!cancelled) {
        if (!error && data) setSessions(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, refreshKey])

  const liveMinutes = Math.floor(liveSeconds / 60)

  const { rows, savedTotal } = useMemo(() => {
    const map = new Map()
    sessions.forEach((s) => {
      const key = s.ramo_id || 'sin-ramo'
      const prev = map.get(key) || {
        id: key,
        nombre: s.ramos?.nombre || 'Sin ramo',
        color: s.ramos?.color || '#999',
        minutos: 0,
        sesiones: 0,
        live: 0,
      }
      prev.minutos += s.duracion_minutos
      prev.sesiones += 1
      map.set(key, prev)
    })

    const saved = sessions.reduce((sum, s) => sum + s.duracion_minutos, 0)

    // Agregar el tiempo en curso (aún no guardado) al ramo activo
    if (liveSeconds > 0 && liveRamoId) {
      const prev = map.get(liveRamoId) || {
        id: liveRamoId,
        nombre: liveRamoName || 'Ramo actual',
        color: 'var(--accent-blue)',
        minutos: 0,
        sesiones: 0,
        live: 0,
      }
      prev.live = liveMinutes
      map.set(liveRamoId, prev)
    }

    const list = [...map.values()].sort((a, b) => (b.minutos + b.live) - (a.minutos + a.live))
    return { rows: list, savedTotal: saved }
  }, [sessions, liveSeconds, liveMinutes, liveRamoId, liveRamoName])

  const total = savedTotal + (liveSeconds > 0 ? liveMinutes : 0)
  const maxRow = Math.max(1, ...rows.map((r) => r.minutos + r.live))
  const sessionCount = sessions.length

  if (loading) return null

  return (
    <section className="card today-summary" aria-labelledby="today-summary-title">
      <div className="today-header">
        <div>
          <h2 id="today-summary-title" className="today-title">📆 Hoy</h2>
          <span className="today-subtitle">
            {sessionCount} {sessionCount === 1 ? 'sesión guardada' : 'sesiones guardadas'}
            {liveSeconds > 0 && ' · 1 en curso'}
          </span>
        </div>
        <div className="today-total">
          <span className="today-total-value">{formatMinutes(total)}</span>
          <span className="today-total-label">acumulado</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="today-empty">Aún no estudias hoy. ¡Dale play al cronómetro! 🚀</p>
      ) : (
        <ul className="today-list">
          {rows.map((r) => {
            const rowTotal = r.minutos + r.live
            const savedPct = (r.minutos / maxRow) * 100
            const livePct = (r.live / maxRow) * 100
            return (
              <li key={r.id} className="today-row">
                <div className="today-row-top">
                  <span className="dot" style={{ background: r.color }} />
                  <span className="today-row-name">{r.nombre}</span>
                  {r.live > 0 || (liveSeconds > 0 && r.id === liveRamoId) ? (
                    <span className="today-live-pill">● en curso</span>
                  ) : null}
                  <span className="today-row-time">{formatMinutes(rowTotal)}</span>
                </div>
                <div className="today-bar">
                  <div className="today-bar-saved" style={{ width: `${savedPct}%`, background: r.color }} />
                  {r.live > 0 && (
                    <div className="today-bar-live" style={{ width: `${livePct}%`, background: r.color }} />
                  )}
                </div>
                {r.sesiones > 1 && (
                  <span className="today-row-meta">{r.sesiones} sesiones</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
