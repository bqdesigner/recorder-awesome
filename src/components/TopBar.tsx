import type { ReactNode } from 'react'
import FeedbackLink from './FeedbackLink'
import { LogoMark } from './icons'

/** Barra superior: marca à esquerda, ações da tela + feedback à direita. */
function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark />
        <span className="brand__name">Recorder Awesome</span>
      </div>
      <div className="topbar__actions">
        {children}
        <FeedbackLink />
      </div>
    </header>
  )
}

export default TopBar
