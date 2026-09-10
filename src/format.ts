/** Formata segundos decorridos em "m:ss" (ex: 0:05, 1:23, 12:07). */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/** Nome default do arquivo exportado: "RecordingAwesome-YYYY-MM-DD_HH-MM-SS.<ext>". */
export function exportFilename(ext: string, date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`
  return `RecordingAwesome-${stamp}.${ext}`
}

/** Relógio do editor em "m:ss.d" (décimos, truncados). Ex: 0:05.2, 1:23.9. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds * 10)) // décimos
  const mins = Math.floor(total / 600)
  const rest = total - mins * 600
  const secs = Math.floor(rest / 10)
  const tenths = rest % 10
  return `${mins}:${String(secs).padStart(2, '0')}.${tenths}`
}
