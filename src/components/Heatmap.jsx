import { getLocalDate } from '../utils'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function Heatmap({ dailyData, goalMinutes }) {
  const { cells, monthLabels, totalWeeks } = buildHeatmapData(dailyData, goalMinutes)

  return (
    <div className="heatmap-section">
      <h3>Actividad</h3>
      <div className="heatmap-outer">
        <div className="heatmap-ylabels">
          {/* Sun=0, show labels only for Mon, Wed, Fri */}
          <span></span>
          <span>Lun</span>
          <span></span>
          <span>Mié</span>
          <span></span>
          <span>Vie</span>
          <span></span>
        </div>
        <div className="heatmap-scroll">
          <div className="heatmap-inner">
            <div className="heatmap-months" style={{ '--weeks': totalWeeks }}>
              {monthLabels.map((m, i) => (
                <span key={i} style={{ left: m.week * 13 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="heatmap-grid">
              {cells.map((cell) => (
                <div
                  key={cell.date}
                  className={`hm-cell level-${cell.level}${cell.metGoal ? ' goal-met' : ''}`}
                  title={`${cell.date}: ${cell.minutes} min${cell.metGoal ? '  ✓ Meta cumplida' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`hm-cell level-${l}`} />
        ))}
        <span>Más</span>
      </div>
    </div>
  )
}

function buildHeatmapData(dailyData, goalMinutes) {
  const today = new Date()

  // Go back ~52 weeks and align to the previous Sunday
  const start = new Date(today)
  start.setDate(start.getDate() - 52 * 7)
  const startDow = start.getDay()
  if (startDow !== 0) start.setDate(start.getDate() - startDow)

  const cells = []
  const monthLabels = []
  let weekIndex = 0
  let lastMonth = -1

  const d = new Date(start)
  while (d <= today) {
    const dateStr = getLocalDate(d)
    const dow = d.getDay()
    const month = d.getMonth()

    // New week starts on Sunday
    if (dow === 0 && cells.length > 0) weekIndex++

    // Track month transitions on Sundays
    if (dow === 0 && month !== lastMonth) {
      monthLabels.push({ week: weekIndex, label: MONTH_LABELS[month] })
      lastMonth = month
    }

    const minutes = dailyData.get(dateStr) || 0
    cells.push({
      date: dateStr,
      minutes,
      level: getIntensityLevel(minutes),
      metGoal: goalMinutes ? minutes >= goalMinutes : false,
    })

    d.setDate(d.getDate() + 1)
  }

  return { cells, monthLabels, totalWeeks: weekIndex + 1 }
}

function getIntensityLevel(minutes) {
  if (minutes === 0) return 0
  if (minutes <= 30) return 1
  if (minutes <= 60) return 2
  if (minutes <= 120) return 3
  return 4
}
