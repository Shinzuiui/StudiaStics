import { useState } from 'react'
import { useToast } from './Toast'

const DAYS = [
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
  { id: 0, name: 'Domingo', short: 'Dom' },
]

export default function StreakDisplay({
  streak,
  goalMinutes,
  restDays = [0, 6],
  onUpdateRestDays,
  isRestDayToday = false,
  studiedToday = false,
}) {
  if (!goalMinutes) return null

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRestDays, setSelectedRestDays] = useState(restDays)
  const toast = useToast()

  const level = getLevel(streak)

  function openModal() {
    setSelectedRestDays(restDays || [0, 6])
    setIsModalOpen(true)
  }

  function toggleDay(dayId) {
    if (selectedRestDays.includes(dayId)) {
      // Switch from rest to study
      setSelectedRestDays(selectedRestDays.filter((id) => id !== dayId))
    } else {
      // Switch from study to rest: Ensure at least 1 study day remains
      if (selectedRestDays.length >= 6) {
        toast.warn('Debes tener al menos 1 día de estudio en la semana.')
        return
      }
      setSelectedRestDays([...selectedRestDays, dayId])
    }
  }

  function handleSave() {
    onUpdateRestDays?.(selectedRestDays)
    setIsModalOpen(false)
  }

  const studyDaysCount = 7 - selectedRestDays.length
  const restDaysCount = selectedRestDays.length

  return (
    <>
      <div className={`streak-banner ${level.cls}`}>
        <div className="streak-flame">{level.icon}</div>
        <div className="streak-info">
          <div className="streak-count-group">
            <span className="streak-count">{streak}</span>
            <span className="streak-label">
              {streak === 1 ? 'día de racha' : 'días de racha'}
            </span>
          </div>

          <div className="streak-badges-row">
            {streak >= 3 && (
              <div className="streak-badge">
                <span className="streak-badge-label">{level.name}</span>
              </div>
            )}

            {isRestDayToday && (
              <div className={`streak-status-pill ${studiedToday ? 'studied' : 'resting'}`}>
                {studiedToday ? '⭐ ¡Estudiaste en tu descanso!' : '🏖️ Hoy es día de descanso'}
              </div>
            )}
          </div>
        </div>

        <button
          className="streak-config-btn"
          onClick={openModal}
          title="Configurar días de estudio y descanso"
        >
          <span className="streak-config-icon">⚙️</span>
          <span className="streak-config-text">Horario</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="streak-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="streak-modal" onClick={(e) => e.stopPropagation()}>
            <div className="streak-modal-header">
              <h3>📅 Horario de Estudio y Descanso</h3>
              <button
                className="streak-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="streak-modal-desc">
              Selecciona tus <strong>días de descanso</strong>. En esos días tu racha no se
              perderá si decides descansar. Si estudias, ¡se sumará a tu racha y a todas tus estadísticas!
            </p>

            <div className="streak-modal-presets">
              <span className="streak-presets-label">Accesos rápidos:</span>
              <div className="streak-presets-buttons">
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setSelectedRestDays([0, 6])}
                >
                  Lun a Vie (Finde libre)
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setSelectedRestDays([0])}
                >
                  Lun a Sáb (Solo Dom libre)
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => setSelectedRestDays([])}
                >
                  Sin descansos (7 días)
                </button>
              </div>
            </div>

            <div className="streak-days-grid">
              {DAYS.map((day) => {
                const isRest = selectedRestDays.includes(day.id)
                return (
                  <button
                    key={day.id}
                    type="button"
                    className={`streak-day-card ${isRest ? 'is-rest' : 'is-study'}`}
                    onClick={() => toggleDay(day.id)}
                  >
                    <span className="day-name">{day.name}</span>
                    <span className="day-short">{day.short}</span>
                    <span className="day-tag">{isRest ? '🏖️ Descanso' : '📖 Estudio'}</span>
                  </button>
                )
              })}
            </div>

            <div className="streak-modal-summary">
              <span>
                <strong>{studyDaysCount}</strong> {studyDaysCount === 1 ? 'día' : 'días'} de estudio
              </span>
              <span>•</span>
              <span>
                <strong>{restDaysCount}</strong> {restDaysCount === 1 ? 'día' : 'días'} de descanso
              </span>
            </div>

            <div className="streak-modal-actions">
              <button type="button" className="btn-save-streak" onClick={handleSave}>
                Guardar cambios
              </button>
              <button
                type="button"
                className="btn-cancel-streak"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getLevel(days) {
  if (days >= 21) return { name: 'Oro', icon: '🥇', cls: 'streak-gold' }
  if (days >= 7) return { name: 'Plata', icon: '🥈', cls: 'streak-silver' }
  if (days >= 3) return { name: 'Bronce', icon: '🥉', cls: 'streak-bronze' }
  return { name: '', icon: '🔥', cls: 'streak-none' }
}
