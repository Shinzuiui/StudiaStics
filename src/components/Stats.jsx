import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate, formatMinutes } from '../utils'
import GoalSetting from './GoalSetting'
import StreakDisplay from './StreakDisplay'
import Heatmap from './Heatmap'
import Charts from './Charts'

export default function Stats({ userId, refreshKey }) {
  const [sessions, setSessions] = useState([])
  const [ramos, setRamos] = useState([])
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [goalRefreshKey, setGoalRefreshKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [refreshKey, goalRefreshKey])

  async function loadData() {
    setLoading(true)

    const yearAgo = new Date()
    yearAgo.setDate(yearAgo.getDate() - 365)
    const yearAgoStr = getLocalDate(yearAgo)

    // Fetch sessions, ramos, and active goal in parallel.
    // The metas query may fail if the table hasn't been created yet — that's OK.
    const [sessionsRes, ramosRes, goalRes] = await Promise.all([
      supabase
        .from('sesiones')
        .select('id, fecha, duracion_minutos, metodo, ramo_id, ramos ( nombre, color )')
        .gte('fecha', yearAgoStr)
        .order('fecha', { ascending: false }),
      supabase.from('ramos').select('*').order('nombre'),
      supabase
        .from('metas')
        .select('meta_minutos, fecha_inicio')
        .lte('fecha_inicio', getLocalDate())
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (sessionsRes.data) setSessions(sessionsRes.data)
    if (ramosRes.data) setRamos(ramosRes.data)
    if (goalRes.data) setGoal(goalRes.data)

    setLoading(false)
  }

  // ---------- Derived data ----------

  // Daily totals: Map<'YYYY-MM-DD', totalMinutes>
  const dailyData = new Map()
  sessions.forEach((s) => {
    const current = dailyData.get(s.fecha) || 0
    dailyData.set(s.fecha, current + s.duracion_minutos)
  })

  const goalMinutes = goal?.meta_minutos || null
  const streak = calculateStreak(dailyData, goalMinutes)

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duracion_minutos, 0)
  const totalDays = dailyData.size
  const avgPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0

  // ---------- Render ----------

  if (loading) return <p>Cargando estadísticas…</p>

  return (
    <div className="stats-dashboard">
      {/* Summary cards */}
      <div className="stats-summary">
        <div className="stat-card">
          <span className="stat-value">{formatMinutes(totalMinutes)}</span>
          <span className="stat-label">Total estudiado</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalDays}</span>
          <span className="stat-label">Días activos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatMinutes(avgPerDay)}</span>
          <span className="stat-label">Promedio / día</span>
        </div>
      </div>

      <GoalSetting userId={userId} currentGoal={goal} onGoalChanged={() => setGoalRefreshKey((k) => k + 1)} />

      <StreakDisplay streak={streak} goalMinutes={goalMinutes} />

      <Heatmap dailyData={dailyData} goalMinutes={goalMinutes} />

      <Charts sessions={sessions} ramos={ramos} goalMinutes={goalMinutes} />
    </div>
  )
}

// ---------- Helpers ----------

/**
 * Count consecutive days (from today backwards) where the user met the daily goal.
 * If today's total hasn't reached the goal yet, counting starts from yesterday
 * so the streak doesn't "break" during the day.
 */
function calculateStreak(dailyData, goalMinutes) {
  if (!goalMinutes) return 0

  let streak = 0
  const d = new Date()

  // If today already meets the goal, include it; otherwise start from yesterday
  const todayStr = getLocalDate(d)
  const todayMinutes = dailyData.get(todayStr) || 0
  if (todayMinutes < goalMinutes) {
    d.setDate(d.getDate() - 1)
  }

  for (let safety = 0; safety < 400; safety++) {
    const dateStr = getLocalDate(d)
    const minutes = dailyData.get(dateStr) || 0
    if (minutes >= goalMinutes) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
