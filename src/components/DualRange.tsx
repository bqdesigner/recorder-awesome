import './DualRange.css'

interface Props {
  min: number
  max: number
  step?: number
  start: number
  end: number
  onStart: (v: number) => void
  onEnd: (v: number) => void
}

/** Timeline com dois controles (início/fim) sobre o mesmo trilho. */
function DualRange({ min, max, step = 0.1, start, end, onStart, onEnd }: Props) {
  const span = max - min || 1
  const startPct = ((start - min) / span) * 100
  const endPct = ((end - min) / span) * 100

  return (
    <div className="dual">
      <div className="dual-track" />
      <div
        className="dual-fill"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
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
