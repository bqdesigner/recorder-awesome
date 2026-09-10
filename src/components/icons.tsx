import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function PlayIcon() {
  return (
    <svg {...base} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg {...base} fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function ScissorsIcon() {
  return (
    <svg {...base}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg {...base}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg {...base}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function DownloadIcon() {
  return (
    <svg {...base}>
      <path d="M12 3v12" />
      <polyline points="7 10 12 15 17 10" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function RefreshIcon() {
  return (
    <svg {...base}>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <polyline points="3 21 3 16 8 16" />
    </svg>
  )
}

export function MegaphoneIcon() {
  return (
    <svg {...base}>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </svg>
  )
}

/** Marca do produto: mesmo arquivo do favicon em /public. */
export function LogoMark() {
  return <img src="/favicon.svg" width="28" height="28" alt="" aria-hidden />
}

/** Miniatura de cada moldura na grade de opções. Ids batem com `FRAMES`. */
export function FrameIcon({ id }: { id: string }) {
  const p: SVGProps<SVGSVGElement> = {
    width: 36,
    height: 28,
    viewBox: '0 0 36 28',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    'aria-hidden': true,
  }
  switch (id) {
    case 'border-black':
      return (
        <svg {...p}>
          <rect x="4" y="4" width="28" height="20" rx="3" fill="#000" stroke="#555" strokeWidth="1" />
          <rect x="8" y="8" width="20" height="12" rx="1.5" fill="currentColor" stroke="none" opacity="0.7" />
        </svg>
      )
    case 'border-white':
      return (
        <svg {...p}>
          <rect x="4" y="4" width="28" height="20" rx="3" fill="#fff" stroke="none" />
          <rect x="8" y="8" width="20" height="12" rx="1.5" fill="#1c1c20" stroke="none" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...p}>
          <rect x="12" y="1.5" width="12" height="25" rx="3.5" />
          <rect x="14.5" y="4.5" width="7" height="19" rx="1" fill="currentColor" stroke="none" opacity="0.7" />
        </svg>
      )
    case 'laptop':
      return (
        <svg {...p}>
          <rect x="6" y="3" width="24" height="16" rx="2" />
          <rect x="9" y="6" width="18" height="10" rx="1" fill="currentColor" stroke="none" opacity="0.7" />
          <path d="M2 22h32a2 2 0 0 1-2 3H4a2 2 0 0 1-2-3z" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <rect x="6" y="4" width="24" height="20" rx="2" strokeDasharray="3 3" />
          <line x1="10" y1="20" x2="26" y2="8" />
        </svg>
      )
  }
}
