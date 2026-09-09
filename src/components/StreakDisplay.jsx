export default function StreakDisplay({ streak, goalMinutes }) {
  if (!goalMinutes) return null

  const level = getLevel(streak)

  return (
    <div className={`streak-banner ${level.cls}`}>
      <div className="streak-flame">{level.icon}</div>
      <div className="streak-info">
        <span className="streak-count">{streak}</span>
        <span className="streak-label">
          {streak === 1 ? 'día de racha' : 'días de racha'}
        </span>
      </div>
      {streak >= 3 && (
        <div className="streak-badge">
          <span className="streak-badge-label">{level.name}</span>
        </div>
      )}
    </div>
  )
}

function getLevel(days) {
  if (days >= 21) return { name: 'Oro', icon: '🥇', cls: 'streak-gold' }
  if (days >= 7) return { name: 'Plata', icon: '🥈', cls: 'streak-silver' }
  if (days >= 3) return { name: 'Bronce', icon: '🥉', cls: 'streak-bronze' }
  return { name: '', icon: '🔥', cls: 'streak-none' }
}
