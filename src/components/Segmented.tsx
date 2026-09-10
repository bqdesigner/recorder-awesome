import type { ReactNode } from 'react'

export interface SegOption<T> {
  value: T
  label: ReactNode
  title?: string
}

interface Props<T> {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  disabled?: boolean
  /** `lg` = cartões altos (usado no seletor de formato). */
  size?: 'md' | 'lg'
}

/** Controle segmentado (radio group) para poucas opções mutuamente exclusivas. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
  size = 'md',
}: Props<T>) {
  return (
    <div className={`seg seg--${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            className={`seg__item${active ? ' is-active' : ''}`}
            disabled={disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default Segmented
