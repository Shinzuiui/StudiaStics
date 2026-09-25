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
    setGoal(goalRes.data || null) // Si es null, reinicia la meta en la UI

    setLoading(false)
  }

  // ---------- Derived data ----------

  // Rest days configuration (0 = Domingo, 1 = Lunes, ..., 6 = Sábado). Default: [0, 6] (Fin de semana)
  const [restDays, setRestDays] = useState(() => {
    if (!userId) return [0, 6]
    const saved = localStorage.getItem(`studiastics-rest-days-${userId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        console.error('Error parsing rest days', e)
      }
    }
    return [0, 6]
  })

  function handleUpdateRestDays(newRestDays) {
    setRestDays(newRestDays)
    if (userId) {
      localStorage.setItem(`studiastics-rest-days-${userId}`, JSON.stringify(newRestDays))
    }
  }

  // Mínimo de minutos para que un día cuente para la racha (independiente de la meta diaria)
  const [streakMinMinutes, setStreakMinMinutes] = useState(() => {
    if (!userId) return 40
    const saved = localStorage.getItem(`studiastics-streak-min-${userId}`)
    if (saved) {
      const val = parseInt(saved, 10)
      if (!isNaN(val) && val > 0) return val
    }
    return 40
  })

  function handleUpdateStreakMin(newMin) {
    const val = Math.max(1, Math.round(newMin))
    setStreakMinMinutes(val)
    if (userId) {
      localStorage.setItem(`studiastics-streak-min-${userId}`, String(val))
    }
  }

  // Daily totals: Map<'YYYY-MM-DD', totalMinutes>
  const dailyData = new Map()
  sessions.forEach((s) => {
    const current = dailyData.get(s.fecha) || 0
    dailyData.set(s.fecha, current + s.duracion_minutos)
  })

  const goalMinutes = goal?.meta_minutos || null
  const { streak, isRestDayToday, studiedToday } = calculateStreak(dailyData, goalMinutes, restDays, streakMinMinutes)

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

      <GoalSetting 
        userId={userId} 
        currentGoal={goal} 
        onGoalChanged={() => setGoalRefreshKey((k) => k + 1)} 
        todayMinutes={dailyData.get(getLocalDate()) || 0}
      />

      <StreakDisplay 
        streak={streak} 
        goalMinutes={goalMinutes} 
        restDays={restDays}
        onUpdateRestDays={handleUpdateRestDays}
        streakMinMinutes={streakMinMinutes}
        onUpdateStreakMin={handleUpdateStreakMin}
        isRestDayToday={isRestDayToday}
        studiedToday={studiedToday}
      />

      <Heatmap dailyData={dailyData} goalMinutes={goalMinutes} />

      <Charts sessions={sessions} ramos={ramos} goalMinutes={goalMinutes} />
    </div>
  )
}

// ---------- Helpers ----------

/**
 * Count consecutive days where the user studied at least `streakMinMinutes`.
 * - The streak minimum is INDEPENDENT from the daily goal.
 * - Days configured as rest days are excused (do not break the streak if not studied).
 * - If the user studies on a rest day and meets the minimum, it counts towards the streak.
 * - If today hasn't reached the minimum yet, today is not penalized (streak doesn't break).
 */
function calculateStreak(dailyData, goalMinutes, restDays = [0, 6], streakMinMinutes = 40) {
  if (!goalMinutes) return { streak: 0, isRestDayToday: false, studiedToday: false }

  const minRequired = streakMinMinutes || 40
  const restDaysSet = new Set(restDays)
  const d = new Date()
  const todayStr = getLocalDate(d)
  const todayMinutes = dailyData.get(todayStr) || 0
  const todayDayOfWeek = d.getDay()
  const isRestDayToday = restDaysSet.has(todayDayOfWeek)
  const studiedToday = todayMinutes >= minRequired

  let streak = 0

  // If user reached the minimum today, it immediately counts for the streak
  if (studiedToday) {
    streak++
  }

  // Walk backwards starting from yesterday
  d.setDate(d.getDate() - 1)

  for (let safety = 0; safety < 400; safety++) {
    const dateStr = getLocalDate(d)
    const dayOfWeek = d.getDay()
    const minutes = dailyData.get(dateStr) || 0
    const isRest = restDaysSet.has(dayOfWeek)

    if (minutes >= minRequired) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (isRest) {
      // It was a rest day and they didn't study: excused! Does not break streak.
      d.setDate(d.getDate() - 1)
    } else {
      // Required study day and minimum was not met: streak breaks here
      break
    }
  }

  return { streak, isRestDayToday, studiedToday }
}
