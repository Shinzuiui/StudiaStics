import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts'
import { getLocalDate } from '../utils'

export default function Charts({ sessions, ramos, goalMinutes }) {
  const barData = buildBarData(sessions, ramos)
  const lineData = buildLineData(sessions)

  return (
    <div className="charts-section">
      {/* Stacked bar chart — last 14 days, by ramo */}
      <div className="chart-card">
        <h3>Últimos 14 días</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DAD4C4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#7A7368' }}
                axisLine={{ stroke: '#DAD4C4' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#7A7368' }}
                axisLine={false}
                tickLine={false}
                unit="m"
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }} iconSize={10} />
              {goalMinutes && (
                <ReferenceLine
                  y={goalMinutes}
                  stroke="#C9A227"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: 'Meta', fill: '#C9A227', fontSize: 11, position: 'right' }}
                />
              )}
              {ramos.map((r) => (
                <Bar key={r.id} dataKey={r.id} stackId="stack" fill={r.color} name={r.nombre} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly trend line — last 26 weeks */}
      <div className="chart-card">
        <h3>Tendencia semanal</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DAD4C4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#7A7368' }}
                axisLine={{ stroke: '#DAD4C4' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#7A7368' }}
                axisLine={false}
                tickLine={false}
                unit="m"
              />
              <Tooltip content={<CustomLineTooltip />} />
              {goalMinutes && (
                <ReferenceLine
                  y={goalMinutes}
                  stroke="#C9A227"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="avgMinutes"
                stroke="#2F6F4F"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2F6F4F' }}
                activeDot={{ r: 5, fill: '#2F6F4F' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ---------- Custom tooltips ---------- */

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value > 0)
  if (items.length === 0) return null
  const total = items.reduce((sum, p) => sum + p.value, 0)
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {items.map((p, i) => (
        <p key={i}>
          <span className="chart-tooltip-dot" style={{ background: p.fill }} />
          {p.name}: {p.value} min
        </p>
      ))}
      {items.length > 1 && <p className="chart-tooltip-total">Total: {total} min</p>}
    </div>
  )
}

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">Sem. {label}</p>
      <p>Promedio: {payload[0].value} min/día</p>
    </div>
  )
}

/* ---------- Data builders ---------- */

function buildBarData(sessions, ramos) {
  const today = new Date()
  const days = []

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = getLocalDate(d)
    const entry = { date: dateStr, label: `${d.getDate()}/${d.getMonth() + 1}` }

    // Initialise each ramo key to 0
    ramos.forEach((r) => {
      entry[r.id] = 0
    })

    // Accumulate minutes per ramo
    sessions
      .filter((s) => s.fecha === dateStr)
      .forEach((s) => {
        if (s.ramo_id && entry[s.ramo_id] !== undefined) {
          entry[s.ramo_id] += s.duracion_minutos
        }
      })

    days.push(entry)
  }

  return days
}

function buildLineData(sessions) {
  const today = new Date()
  const weeks = []

  for (let w = 25; w >= 0; w--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const weekStartStr = getLocalDate(weekStart)
    const weekEndStr = getLocalDate(weekEnd)

    const weekSessions = sessions.filter((s) => s.fecha >= weekStartStr && s.fecha <= weekEndStr)
    const totalMin = weekSessions.reduce((sum, s) => sum + s.duracion_minutos, 0)
    const avgMin = Math.round(totalMin / 7)

    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
    weeks.push({ label, avgMinutes: avgMin })
  }

  return weeks
}
