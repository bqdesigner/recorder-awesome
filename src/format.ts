/** Formata segundos decorridos em "m:ss" (ex: 0:05, 1:23, 12:07). */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
