import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { getLocalDate } from '../utils'

export default function GoalSetting({ userId, currentGoal, onGoalChanged, todayMinutes = 0 }) {
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

  async function handleDelete() {
    if (!window.confirm('¿Seguro que quieres borrar tu meta diaria actual?')) return
    setSaving(true)
    setError(null)
    // Borramos todas las metas del usuario para reiniciar por completo
    const { error: err } = await supabase.from('metas').delete().eq('user_id', userId)
    setSaving(false)
    if (err) {
      setError('No se pudo eliminar la meta: ' + err.message)
    } else {
      setEditing(false)
      onGoalChanged?.()
    }
  }

  if (!editing) {
    const progressPercent = currentGoal ? (todayMinutes / currentGoal.meta_minutos) * 100 : 0;

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
        
        {currentGoal && (
          <div className="goal-progress-container" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span>{todayMinutes} min estudiados hoy</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="goal-progress-bar" style={{ height: '10px', background: 'var(--bg)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${Math.min(progressPercent, 100)}%`, 
                  background: progressPercent >= 100 ? 'var(--gold)' : 'linear-gradient(90deg, var(--accent-blue), var(--accent-mauve))',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease',
                  borderRadius: '5px'
                }} 
              />
            </div>
          </div>
        )}
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
          {currentGoal && (
            <button className="goal-cancel-btn" style={{ color: 'var(--error)' }} onClick={handleDelete} disabled={saving}>
              Eliminar
            </button>
          )}
          <button className="goal-cancel-btn" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
