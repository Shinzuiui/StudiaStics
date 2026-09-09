import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate } from '../utils'

export default function GoalSetting({ userId, currentGoal, onGoalChanged }) {
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState(currentGoal?.meta_minutos || 60)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!minutes || minutes <= 0) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('metas').insert({
      user_id: userId,
      meta_minutos: Number(minutes),
      fecha_inicio: getLocalDate(),
    })
    setSaving(false)
    if (err) {
      setError('No se pudo guardar la meta: ' + err.message)
    } else {
      setEditing(false)
      onGoalChanged?.()
    }
  }

  if (!editing) {
    return (
      <div className="goal-section">
        <div className="goal-current">
          <span className="goal-icon">🎯</span>
          {currentGoal ? (
            <span>
              Meta diaria: <strong>{currentGoal.meta_minutos} min</strong>
            </span>
          ) : (
            <span className="goal-placeholder">Sin meta diaria configurada</span>
          )}
          <button className="goal-edit-btn" onClick={() => setEditing(true)}>
            {currentGoal ? 'Cambiar' : 'Configurar meta'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="goal-section">
      <div className="goal-form">
        <label className="field">
          Meta diaria (minutos)
          <input
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            autoFocus
          />
        </label>
        <div className="goal-form-actions">
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="goal-cancel-btn" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
