/**
 * Utilidades para notificaciones del sistema y sonidos de alerta.
 * Diseñado para funcionar en Desktop (Windows/Mac) y Mobile (Android/iOS PWA).
 * 
 * Sonido: Síntesis nativa con Web Audio API (no requiere archivos externos,
 * pero soporta /alarm.mp3 en public/ si el usuario decide agregarlo).
 * Notificaciones: Web Notifications API + Service Worker para móviles.
 */

// ==========================================
// 1. GESTIÓN DE AUDIO (Web Audio API)
// ==========================================

let audioCtx = null

export function getAudioContext() {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Desbloquea el AudioContext ante una interacción del usuario (click en 'Iniciar', etc.)
 * para que el navegador permita reproducir sonido más tarde aunque la pestaña esté en segundo plano.
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  } catch (e) {
    // Ignorar si el navegador aún restringe
  }
}

/**
 * Genera un toque de campana armónica con decaimiento natural
 */
function playBellTone(ctx, freq, startTime, duration = 0.9, gainValue = 0.25) {
  // Oscilador fundamental (onda senoidal cálida)
  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(freq, startTime)

  // Armónico superior para brillo y claridad (tipo campana/xilófono)
  const osc2 = ctx.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(freq * 2, startTime)

  // Ganancia con envolvente AD (ataque percusivo y decaimiento exponencial)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.015) // Ataque percusivo rápido
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration) // Decaimiento suave

  const overtoneGain = ctx.createGain()
  overtoneGain.gain.setValueAtTime(0, startTime)
  overtoneGain.gain.linearRampToValueAtTime(gainValue * 0.35, startTime + 0.01)
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.7)

  osc1.connect(gain)
  osc2.connect(overtoneGain)
  gain.connect(ctx.destination)
  overtoneGain.connect(ctx.destination)

  osc1.start(startTime)
  osc2.start(startTime)
  osc1.stop(startTime + duration + 0.05)
  osc2.stop(startTime + duration + 0.05)
}

/**
 * Reproduce un sonido de alarma melódica durante ~3.5 segundos.
 * Diseñado para avisar con claridad que terminó el Pomodoro
 * sin ser estridente ni molesto.
 */
export function playChime() {
  // 1. Intentar reproducir archivo local si existe (/alarm.mp3)
  try {
    const testAudio = new Audio('/alarm.mp3')
    const playPromise = testAudio.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Si el archivo existe y se reproduce, usamos el archivo
          return
        })
        .catch(() => {
          // Si falla o no existe, fallback a Web Audio API sintetizado
          playSynthesizedChime()
        })
      return
    }
  } catch (_) {
    // Si da error la creación de Audio, usar sintetizador
  }

  playSynthesizedChime()
}

function playSynthesizedChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Secuencia de 3 acordes resonantes que dura ~3.4 segundos:
    // Toque 1 (t = 0.0s): Do5 (523 Hz) + Sol5 (784 Hz)
    playBellTone(ctx, 523.25, now + 0.0, 0.9, 0.28)
    playBellTone(ctx, 783.99, now + 0.05, 0.85, 0.22)

    // Toque 2 (t = 1.1s): Mi5 (659 Hz) + Si5 (988 Hz)
    playBellTone(ctx, 659.25, now + 1.1, 0.9, 0.28)
    playBellTone(ctx, 987.77, now + 1.15, 0.85, 0.22)

    // Toque 3 (t = 2.2s): Sol5 (784 Hz) + Do6 (1046.5 Hz) resonante
    playBellTone(ctx, 783.99, now + 2.2, 1.2, 0.3)
    playBellTone(ctx, 1046.5, now + 2.25, 1.3, 0.25)
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de fin de pomodoro:', e)
  }
}

/**
 * Reproduce un tono suave descendente de descanso (~1.8 segundos).
 */
export function playBreakEndChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Dos notas suaves: Sol5 -> Do5
    playBellTone(ctx, 783.99, now + 0.0, 0.8, 0.22)
    playBellTone(ctx, 523.25, now + 0.8, 1.1, 0.24)
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de fin de descanso:', e)
  }
}

// ==========================================
// 2. NOTIFICACIONES DEL SISTEMA (Windows / Celu)
// ==========================================

/**
 * Solicita permiso de notificaciones del sistema al usuario.
 * Debe ser invocado dentro de una interacción de usuario (ej: click en 'Iniciar').
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (e) {
    return Notification.permission
  }
}

/**
 * Envía una notificación nativa del sistema operativo (Windows / Android / etc.)
 * Funciona en segundo plano o con la pestaña minimizada.
 */
export async function sendSystemNotification(title, body, icon = '/icon.svg') {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const options = {
    body,
    icon,
    badge: icon,
    tag: 'studiastics-pomodoro',
    renotify: true,
    requireInteraction: false,
    vibrate: [250, 100, 250, 100, 250], // Patrón de vibración para celulares
  }

  // En Android / Chrome móvil, 'new Notification()' está prohibido fuera de ServiceWorker
  // Por lo tanto, intentamos primero a través del Service Worker si está disponible
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options)
        return
      }
    }
  } catch (swErr) {
    // Si falla el Service Worker, probamos el constructor nativo de escritorio
  }

  try {
    const notification = new Notification(title, options)
    setTimeout(() => {
      try {
        notification.close()
      } catch (_) {}
    }, 9000)

    notification.onclick = () => {
      window.focus()
      try {
        notification.close()
      } catch (_) {}
    }
  } catch (e) {
    console.warn('No se pudo emitir la notificación del sistema:', e)
  }
}
