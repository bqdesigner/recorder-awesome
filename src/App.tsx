import { useEffect, useRef, useState } from 'react'
import { startRecording, type Recording, type RecordingSession } from './engine'
import TopBar from './components/TopBar'
import Footer from './components/Footer'
import Editor from './components/Editor'
import { formatElapsed } from './format'
import './App.css'

type Status = 'idle' | 'recording' | 'recorded'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
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

  const recording = status === 'recording'

  return (
    <div className="app">
      <TopBar />

      <main className="landing">
        <div className="hero">
          <h1 className="hero__title">Recorder Awesome</h1>
          <p className="hero__sub">
            Grave, edite e compartilhe no seu projeto.
          </p>

          <div className={`hero__record${recording ? ' is-recording' : ''}`}>
            <button
              type="button"
              className={`rec-btn${recording ? ' is-recording' : ''}`}
              onClick={recording ? finishRecording : handleStart}
            >
              <span className="rec-btn__dot" aria-hidden />
              {recording ? 'Parar gravação' : 'Gravar tela'}
            </button>
            {recording && (
              <p className="hero__timer" role="timer" aria-label="Tempo de gravação">
                <span className="hero__timer-label">Gravando</span>
                {formatElapsed(elapsed)}
              </p>
            )}
          </div>
        </div>

        {!recording && (
          <ol className="steps">
            <li className="step">
              <span className="step__num">1</span>
              <div>
                <strong>Grave</strong>
                <p>Escolha tela, janela ou aba. Nada pra instalar.</p>
              </div>
            </li>
            <li className="step">
              <span className="step__num">2</span>
              <div>
                <strong>Formate</strong>
                <p>Corte, moldura de celular ou notebook e fundo na sua cor.</p>
              </div>
            </li>
            <li className="step">
              <span className="step__num">3</span>
              <div>
                <strong>Exporte</strong>
                <p>GIF pra chat e docs, MP4 pra vídeo. Tudo fica no seu dispositivo.</p>
              </div>
            </li>
          </ol>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
