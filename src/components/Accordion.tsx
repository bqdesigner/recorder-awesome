import type { ReactNode } from 'react'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`chevron${open ? ' chevron--open' : ''}`}
      width="12"
      height="6"
      viewBox="0 0 12 6"
      fill="none"
      aria-hidden
    >
      <path d="M1 1l5 4 5-4" stroke="#191819" strokeWidth="1.5" />
    </svg>
  )
}

interface Props {
  title: string
  open: boolean
  onToggle: () => void
  children?: ReactNode
}

/** Seção sanfona do painel: cabeçalho clicável + corpo colapsável. */
function Accordion({ title, open, onToggle, children }: Props) {
  return (
    <div className={`accordion${open ? ' is-open' : ''}`}>
      <button type="button" className="accordion__header" onClick={onToggle}>
        <span className="accordion__title">{title}</span>
        <Chevron open={open} />
      </button>
      {open && children}
    </div>
  )
}

export default Accordion
