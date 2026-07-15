/** Posição (0–100%) de um tempo na timeline, limitada às bordas. */
export function timeToPct(t: number, min: number, max: number): number {
  const span = max - min || 1
  return Math.max(0, Math.min(100, ((t - min) / span) * 100))
}
