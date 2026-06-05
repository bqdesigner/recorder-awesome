import { useEffect, useRef, useState } from 'react'
import { startRecording, type Recording, type RecordingSession } from './engine'
import Editor from './components/Editor'
import './App.css'

type Status = 'idle' | 'recording' | 'recorded'

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const sessionRef = useRef<RecordingSession | null>(null)
  const recordingRef = useRef<Recording | null>(null)

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

      {status === 'idle' && <button onClick={handleStart}>Gravar tela</button>}

      {status === 'recording' && (
        <button onClick={finishRecording}>Parar gravação</button>
      )}

      {status === 'recorded' && recordingRef.current && (
        <Editor
          blob={recordingRef.current.blob}
          duration={recordingRef.current.duration}
          previewUrl={previewUrl}
          onReset={handleReset}
        />
      )}
    </main>
  )
}

export default App
