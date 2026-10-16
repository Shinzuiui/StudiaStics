import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { getLocalDate, formatMinutes } from '../utils'

function useThemeColors() {
  const [colors, setColors] = useState({
    text: '#1A1A2E',
    border: '#E8EAF0',
    accentBlue: '#7EB6FF',
    accentMauve: '#C4A1E0',
    bg: '#FFFFFF'
  })

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement
      const computed = getComputedStyle(root)
      setColors({
        text: computed.getPropertyValue('--text').trim() || '#1A1A2E',
        border: computed.getPropertyValue('--border').trim() || '#E8EAF0',
        accentBlue: computed.getPropertyValue('--accent-blue').trim() || '#7EB6FF',
        accentMauve: computed.getPropertyValue('--accent-mauve').trim() || '#C4A1E0',
        bg: computed.getPropertyValue('--bg').trim() || '#FFFFFF'
      })
    }

    updateColors()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateColors()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return colors
}

export default function Charts({ sessions }) {
  const theme = useThemeColors()
  const [piePeriod, setPiePeriod] = useState('30') // '7' | '30' | 'all'

  const dataPorDia = useMemo(() => {
    if (!sessions || sessions.length === 0) return []
    const byDate = sessions.reduce((acc, s) => {
      acc[s.fecha] = (acc[s.fecha] || 0) + s.duracion_minutos
      return acc
    }, {})

    // Sort dates
    const sortedDates = Object.keys(byDate).sort()
    
    // Take last 7 days
    const last7 = sortedDates.slice(-7)
    
    return last7.map(date => {
      const parts = date.split('-')
      const shortDate = `${parts[2]}/${parts[1]}`
      return {
        fechaStr: shortDate,
        fullDate: date,
        minutos: byDate[date]
      }
    })
  }, [sessions])

  // Distribución de tiempo por ramo (gráfico de torta), filtrada por período
  const dataPorRamo = useMemo(() => {
    if (!sessions || sessions.length === 0) return []
    let cutoff = null
    if (piePeriod !== 'all') {
      const d = new Date()
      d.setDate(d.getDate() - (Number(piePeriod) - 1))
      cutoff = getLocalDate(d)
    }
    const map = new Map()
    sessions.forEach((s) => {
      if (cutoff && s.fecha < cutoff) return
      const key = s.ramo_id || 'sin-ramo'
      const prev = map.get(key) || {
        name: s.ramos?.nombre || 'Sin ramo',
        color: s.ramos?.color || '#999',
        value: 0,
      }
      prev.value += s.duracion_minutos
      map.set(key, prev)
    })
    return [...map.values()].sort((a, b) => b.value - a.value)
  }, [sessions, piePeriod])

  const pieTotal = dataPorRamo.reduce((sum, r) => sum + r.value, 0)

  // Minutos totales por día de la semana
  const dataPorDiaSemana = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0] // index = getDay()
    const daysSeen = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()]
    ;(sessions || []).forEach((s) => {
      const [y, m, d] = s.fecha.split('-').map(Number)
      const dow = new Date(y, m - 1, d).getDay()
      totals[dow] += s.duracion_minutos
      daysSeen[dow].add(s.fecha)
    })
    // Orden Lunes → Domingo
    return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
      dia: WEEKDAYS[dow],
      minutos: totals[dow],
      promedio: daysSeen[dow].size ? Math.round(totals[dow] / daysSeen[dow].size) : 0,
    }))
  }, [sessions])

  // Datos destacados
  const insights = useMemo(() => {
    if (!sessions || sessions.length === 0) return null
    const totalMin = sessions.reduce((sum, s) => sum + s.duracion_minutos, 0)
    const avgSession = Math.round(totalMin / sessions.length)

    const byDate = {}
    sessions.forEach((s) => { byDate[s.fecha] = (byDate[s.fecha] || 0) + s.duracion_minutos })
    let bestDate = null
    let bestMin = 0
    Object.entries(byDate).forEach(([fecha, min]) => {
      if (min > bestMin) { bestMin = min; bestDate = fecha }
    })

    const longest = sessions.reduce((max, s) => Math.max(max, s.duracion_minutos), 0)
    const bestWeekday = [...dataPorDiaSemana].sort((a, b) => b.minutos - a.minutos)[0]

    return {
      count: sessions.length,
      avgSession,
      bestDate,
      bestMin,
      longest,
      bestWeekday: bestWeekday?.minutos > 0 ? bestWeekday.dia : '—',
    }
  }, [sessions, dataPorDiaSemana])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{payload[0].payload.fullDate}</p>
          <p>
            <span className="chart-tooltip-dot" style={{ backgroundColor: theme.accentBlue }}></span>
            {payload[0].value} minutos estudiados
          </p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      const pct = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{item.name}</p>
          <p>
            <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }}></span>
            {formatMinutes(item.value)} · {pct}%
          </p>
        </div>
      )
    }
    return null
  }

  const WeekdayTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">{item.dia}</p>
          <p>
            <span className="chart-tooltip-dot" style={{ backgroundColor: theme.accentMauve }}></span>
            {formatMinutes(item.minutos)} en total
          </p>
          <p className="chart-tooltip-total">Promedio: {formatMinutes(item.promedio)} por día activo</p>
        </div>
      )
    }
    return null
  }

  if (dataPorDia.length === 0) {
    return <p className="empty">Registra sesiones en diferentes días para ver tus gráficos.</p>
  }

  return (
    <div className="charts-section">
      {insights && (
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-icon">📚</span>
            <span className="insight-value">{insights.count}</span>
            <span className="insight-label">Sesiones totales</span>
          </div>
          <div className="insight-card">
            <span className="insight-icon">⏳</span>
            <span className="insight-value">{formatMinutes(insights.avgSession)}</span>
            <span className="insight-label">Duración promedio</span>
          </div>
          <div className="insight-card">
            <span className="insight-icon">🏆</span>
            <span className="insight-value">{formatMinutes(insights.bestMin)}</span>
            <span className="insight-label">Récord en un día</span>
            {insights.bestDate && <span className="insight-sub">{formatShortDate(insights.bestDate)}</span>}
          </div>
          <div className="insight-card">
            <span className="insight-icon">🔥</span>
            <span className="insight-value">{formatMinutes(insights.longest)}</span>
            <span className="insight-label">Sesión más larga</span>
          </div>
          <div className="insight-card">
            <span className="insight-icon">📅</span>
            <span className="insight-value">{insights.bestWeekday}</span>
            <span className="insight-label">Tu día más fuerte</span>
          </div>
        </div>
      )}

      <div className="chart-card">
        <div className="chart-card-header">
          <h3>Distribución por ramo</h3>
          <div className="period-switch" role="group" aria-label="Período del gráfico">
            {[['7', '7 días'], ['30', '30 días'], ['all', 'Todo']].map(([val, label]) => (
              <button
                key={val}
                id={`pie-period-${val}`}
                type="button"
                className={piePeriod === val ? 'active' : ''}
                onClick={() => setPiePeriod(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {dataPorRamo.length === 0 ? (
          <p className="empty" style={{ padding: '40px 0' }}>Sin sesiones en este período.</p>
        ) : (
          <div className="pie-layout">
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPorRamo}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={dataPorRamo.length > 1 ? 3 : 0}
                    stroke="none"
                    animationDuration={700}
                  >
                    {dataPorRamo.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-center">
                <span className="pie-center-value">{formatMinutes(pieTotal)}</span>
                <span className="pie-center-label">total</span>
              </div>
            </div>

            <ul className="pie-legend">
              {dataPorRamo.map((r) => {
                const pct = pieTotal > 0 ? Math.round((r.value / pieTotal) * 100) : 0
                return (
                  <li key={r.name}>
                    <span className="dot" style={{ background: r.color }} />
                    <span className="pie-legend-name">{r.name}</span>
                    <span className="pie-legend-time">{formatMinutes(r.value)}</span>
                    <span className="pie-legend-pct">{pct}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="chart-card">
        <h3>Minutos de estudio (últimos 7 días activos)</h3>
        <div className="chart-wrapper" style={{ height: 250, marginTop: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis 
                dataKey="fechaStr" 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dx={-10} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="minutos" fill={theme.accentBlue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>¿Qué día de la semana estudias más?</h3>
        <div className="chart-wrapper" style={{ height: 250, marginTop: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataPorDiaSemana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis
                dataKey="dia"
                tick={{ fill: theme.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: theme.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip content={<WeekdayTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="minutos" fill={theme.accentMauve} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Tendencia de estudio</h3>
        <div className="chart-wrapper" style={{ height: 250, marginTop: '24px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
              <XAxis 
                dataKey="fechaStr" 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tick={{ fill: theme.text, fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                dx={-10} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="minutos" 
                stroke={theme.accentBlue} 
                strokeWidth={3} 
                dot={{ r: 4, fill: theme.bg, stroke: theme.accentBlue, strokeWidth: 2 }} 
                activeDot={{ r: 6, fill: theme.accentBlue, stroke: theme.bg }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatShortDate(fecha) {
  const [, m, d] = fecha.split('-')
  return `${d}/${m}`
}
