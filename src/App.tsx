import { useRef, useState } from 'react'
import {
  startRecording,
  webmToGif,
  type Recording,
  type RecordingSession,
} from './engine'
import './App.css'

type Status = 'idle' | 'recording' | 'recorded' | 'exporting'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const sessionRef = useRef<RecordingSession | null>(null)
  const recordingRef = useRef<Recording | null>(null)

  async function handleStart() {
    try {
      sessionRef.current = await startRecording()
      setStatus('recording')
      // se o usuário parar pelo browser, a track encerra: refletimos na UI
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

  async function handleExportGif() {
    const rec = recordingRef.current
    if (!rec) return
    setStatus('exporting')
    setProgress(0)
    const gif = await webmToGif(rec.blob, rec.duration, {
      onProgress: setProgress,
    })
    download(gif, 'gravacao.gif')
    setStatus('recorded')
  }

  function handleReset() {
    if (recordingRef.current) {
      const ok = window.confirm(
        'Isso descarta a gravação atual. Quer continuar?',
      )
      if (!ok) return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    sessionRef.current = null
    recordingRef.current = null
    setPreviewUrl('')
    setStatus('idle')
  }

  return (
    <main className="app">
      <h1>screen-recorder</h1>

      {status === 'idle' && (
        <button onClick={handleStart}>Gravar tela</button>
      )}

      {status === 'recording' && (
        <button onClick={finishRecording}>Parar gravação</button>
      )}

      {(status === 'recorded' || status === 'exporting') && previewUrl && (
        <div className="result">
          <video src={previewUrl} controls className="preview" />
          <div className="actions">
            <button onClick={handleExportGif} disabled={status === 'exporting'}>
              {status === 'exporting'
                ? `Exportando… ${Math.round(progress * 100)}%`
                : 'Exportar GIF'}
            </button>
            <button onClick={handleReset} disabled={status === 'exporting'}>
              Nova gravação
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default App
