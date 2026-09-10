import { useEffect, useRef, useState } from 'react'
import './ColorPicker.css'

interface Props {
  /** Cor atual em hex (#rrggbb). */
  value: string
  onChange: (hex: string) => void
  /** Estado/opção de transparência (só quando faz sentido, ex: fundo). */
  transparent?: boolean
  onTransparent?: () => void
  /** Desabilita o gatilho (não abre o popover). */
  disabled?: boolean
}

/** Amostra de cor + hex visível; popover com opção transparente, hex manual e seletor nativo. */
function ColorPicker({ value, onChange, transparent, onTransparent, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value.replace('#', ''))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function commit(raw: string) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHex(clean)
    if (clean.length === 6) onChange('#' + clean.toLowerCase())
    else if (clean.length === 3)
      onChange('#' + clean.split('').map((c) => c + c).join('').toLowerCase())
  }

  return (
    <div className="cp" ref={ref}>
      <button
        type="button"
        className="cp__trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() =>
          setOpen((o) => {
            if (!o) setHex(value.replace('#', ''))
            return !o
          })
        }
      >
        <span
          className={`swatch${transparent ? ' swatch--checker' : ''}`}
          style={transparent ? undefined : { background: value }}
        />
        <span className="cp__value">{transparent ? 'Transparente' : value.toUpperCase()}</span>
      </button>
      {open && (
        <div className="cp__pop" role="dialog" aria-label="Escolher cor">
          {onTransparent && (
            <button
              type="button"
              className={`cp__opt${transparent ? ' is-active' : ''}`}
              onClick={() => {
                onTransparent()
                setOpen(false)
              }}
            >
              <span className="swatch swatch--checker" />
              Transparente
            </button>
          )}
          <label className="cp__hex">
            <span className="cp__hash">#</span>
            <input
              value={hex}
              onChange={(e) => commit(e.target.value)}
              maxLength={6}
              spellCheck={false}
              placeholder="000000"
              inputMode="text"
              aria-label="Cor em hexadecimal"
            />
          </label>
          <input
            type="color"
            className="cp__visual"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setHex(e.target.value.replace('#', ''))
            }}
            aria-label="Seletor visual"
          />
        </div>
      )}
    </div>
  )
}

export default ColorPicker
