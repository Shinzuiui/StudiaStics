import { useState, useEffect, useCallback, createContext, useContext } from 'react'

// ---------- Context ----------
const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

// ---------- Provider ----------
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    info: (msg, ms) => addToast(msg, 'info', ms),
    success: (msg, ms) => addToast(msg, 'success', ms),
    error: (msg, ms) => addToast(msg, 'error', ms ?? 6000),
    warn: (msg, ms) => addToast(msg, 'warn', ms),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ---------- Single toast ----------
function ToastItem({ toast, onClose }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
    }, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration])

  // After exit animation completes, remove from DOM
  function handleAnimationEnd() {
    if (exiting) onClose()
  }

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }

  return (
    <div
      className={`toast-item toast-${toast.type} ${exiting ? 'toast-exit' : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => setExiting(true)} aria-label="Cerrar">
        ✕
      </button>
    </div>
  )
}
