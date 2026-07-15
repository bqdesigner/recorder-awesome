import { useEffect, useRef, useState } from 'react'
import { startRecording, type Recording, type RecordingSession } from './engine'
import Accordion from './components/Accordion'
import Footer from './components/Footer'
import FeedbackLink from './components/FeedbackLink'
import Editor from './components/Editor'
import { formatElapsed } from './format'
import './App.css'

type Status = 'idle' | 'recording' | 'recorded'
type Section = 'format' | 'export'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
  const [open, setOpen] = useState<Section | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const sessionRef = useRef<RecordingSession | null>(null)
  const recordingRef = useRef<Recording | null>(null)

  // cronômetro de gravação: conta segundos a partir do clique em "Gravar tela"
  useEffect(() => {
    if (status !== 'recording') return
    const startedAt = performance.now()
    const id = setInterval(() => {
      setElapsed((performance.now() - startedAt) / 1000)
    }, 250)
    return () => clearInterval(id)
  }, [status])

  // avisa antes de sair/atualizar se há gravação ou captura em andamento
  useEffect(() => {
    if (status === 'idle') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  async function handleStart() {
    try {
      sessionRef.current = await startRecording()
      setElapsed(0)
      setStatus('recording')
      sessionRef.current.stream
        .getVideoTracks()[0]
        ?.addEventListener('ended', () => finishRecording())
    } catch {
      // usuário cancelou o seletor de tela
    }
  }

  async function finishRecording() {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null // evita dupla finalização (clique + 'ended')
    const rec = await session.stop()
    recordingRef.current = rec
    setPreviewUrl(URL.createObjectURL(rec.blob))
    setStatus('recorded')
  }

  function handleReset() {
    if (recordingRef.current) {
      const ok = window.confirm('Isso descarta a gravação atual. Quer continuar?')
      if (!ok) return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    sessionRef.current = null
    recordingRef.current = null
    setPreviewUrl('')
    setOpen(null)
    setStatus('idle')
  }

  if (status === 'recorded' && recordingRef.current) {
    return (
      <Editor
        blob={recordingRef.current.blob}
        duration={recordingRef.current.duration}
        previewUrl={previewUrl}
        onReset={handleReset}
      />
    )
  }

  // estado vazio / gravando: hero à esquerda, accordions desabilitados à direita
  const toggle = (s: Section) => setOpen((cur) => (cur === s ? null : s))
  const recording = status === 'recording'

  return (
    <div className="app">
      <section className="recorder">
        <FeedbackLink />
        <div className="hero">
          <div className="hero__heading">
            <h1 className="hero__title">Recorder Awesome</h1>
            <p className="hero__sub">
              Grave sua tela - deixe ela incrível - compartilhe no seu projeto
            </p>
          </div>
          <div className="hero__record">
            <button
              type="button"
              className="btn btn--solid btn--hero"
              onClick={recording ? finishRecording : handleStart}
            >
              {recording && <span className="live-dot" aria-hidden />}
              {recording ? 'Parar gravação' : 'Gravar tela'}
            </button>
            {recording && (
              <p className="hero__timer" role="timer" aria-label="Tempo de gravação">
                {formatElapsed(elapsed)}
              </p>
            )}
          </div>
        </div>
        <Footer />
      </section>

      <aside className="panel">
        <div className="panel__content">
          <Accordion
            title="Formatar"
            open={open === 'format'}
            onToggle={() => toggle('format')}
          >
            <div className="section-body">
              <div className="field field--check" aria-disabled>
                <input type="checkbox" disabled />
                <span>Adicionar respiro</span>
              </div>
              <div className="field field--select" aria-disabled>
                <span>Nenhuma</span>
                <Chevron />
              </div>
              <div className="segment is-disabled">
                <span className="segment__item segment__item--active">Fit</span>
                <span className="segment__item">Fill</span>
              </div>
              <div className="field" aria-disabled>
                <span>
                  Cor de fundo <span className="muted">– Transparente</span>
                </span>
                <span className="swatch swatch--checker" />
              </div>
            </div>
          </Accordion>

          <Accordion
            title="Exportar"
            open={open === 'export'}
            onToggle={() => toggle('export')}
          >
            <div className="section-body">
              <div className="segment is-disabled">
                <span className="segment__item segment__item--active">GIF</span>
                <span className="segment__item">MP4</span>
              </div>
              <div className="row">
                <div className="field" aria-disabled>
                  <span>1x</span>
                  <Chevron />
                </div>
                <div className="field" aria-disabled>
                  <span>15 FPS</span>
                  <Chevron />
                </div>
                <div className="field field--res" aria-disabled>
                  <span>Resolução</span>
                  <Chevron />
                </div>
              </div>
            </div>
          </Accordion>
        </div>
      </aside>
    </div>
  )
}

function Chevron() {
  return (
    <svg width="12" height="6" viewBox="0 0 12 6" fill="none" aria-hidden>
      <path d="M1 1l5 4 5-4" stroke="#191819" strokeWidth="1.5" />
    </svg>
  )
}

export default App
