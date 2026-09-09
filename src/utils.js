/**
 * Utility helpers shared across components.
 */

/** Returns today's date (or a given Date) as 'YYYY-MM-DD' in the user's local timezone. */
export function getLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Formats a number of minutes into a readable string like '2h 15m' or '45m'. */
export function formatMinutes(min) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
