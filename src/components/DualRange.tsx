import { useRef } from 'react'
import { timeToPct } from '../timeline'
import './DualRange.css'

interface Props {
  min: number
  max: number
  step?: number
  start: number
  end: number
  onStart: (v: number) => void
  onEnd: (v: number) => void
  /** Posição do playhead (s) a marcar; null = oculto. */
  current?: number | null
  /** Clique/arrasto em qualquer ponto da timeline. */
  onSeek?: (t: number) => void
  /** Início do scrub (pointer down na timeline). */
  onScrubStart?: () => void
  /** Fim do scrub (release). */
  onScrubEnd?: () => void
}

/** Timeline com dois controles (início/fim) e scrub livre. */
function DualRange({
  min,
  max,
  step = 0.1,
  start,
  end,
  onStart,
  onEnd,
  current,
  onSeek,
  onScrubStart,
  onScrubEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const scrubbing = useRef(false)
  const span = max - min || 1
  const startPct = ((start - min) / span) * 100
  const endPct = ((end - min) / span) * 100

  function timeAt(e: React.PointerEvent) {
    const r = ref.current!.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    return min + f * span
  }
  function onPointerDown(e: React.PointerEvent) {
    // clique sobre um thumb (input) é tratado nativamente
    if (!onSeek || (e.target as HTMLElement).tagName === 'INPUT') return
    scrubbing.current = true
    ref.current!.setPointerCapture(e.pointerId)
    onScrubStart?.()
    onSeek(timeAt(e))
  }
  function onPointerMove(e: React.PointerEvent) {
    if (scrubbing.current && onSeek) onSeek(timeAt(e))
  }
  function onPointerUp() {
    if (!scrubbing.current) return
    scrubbing.current = false
    onScrubEnd?.()
  }

  return (
    <div
      ref={ref}
      className="dual"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="dual-track" />
      <div
        className="dual-fill"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
      {current != null && (
        <div
          className="dual-playhead"
          style={{ left: `${timeToPct(current, min, max)}%` }}
        />
      )}
      <input
        type="range"
        className="dual-thumb"
        min={min}
        max={max}
        step={step}
        value={start}
        onChange={(e) => onStart(Math.min(+e.target.value, end - step))}
      />
      <input
        type="range"
        className="dual-thumb"
        min={min}
        max={max}
        step={step}
        value={end}
        onChange={(e) => onEnd(Math.max(+e.target.value, start + step))}
      />
    </div>
  )
}

export default DualRange
